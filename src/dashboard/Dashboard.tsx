'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Hero } from './Components/Hero';
import { ContentRow } from './Components/ContentRow';
import { Navbar } from './Components/Navbar';
import { MovieDetails } from './Components/MovieDetails';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { moviesService, Movie } from '../services/movies.service';
import { socketService } from '../services/socket.service';
import { cacheService, CACHE_KEYS } from '../services/cache.service';
import { LoadingScreen } from './Components/LoadingScreen';

export default function Dashboard() {
    const router = useRouter();
    const [selectedMovie, setSelectedMovie] = useState<any>(null);
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [userCountry, setUserCountry] = useState<string>('France');
    const searchParams = useSearchParams();
    const movieParam = searchParams.get('movie');
    const [sportIndex, setSportIndex] = useState(0);
    const sportImages = [
        "/footbal.jpg",
        "/Is-NBA-League-Pass-Worth-It-1024x576.png",
        "/5-WCH.webp"
    ];

    const formatDuration = (duration?: string | number) => {
        if (typeof duration === 'number') {
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;

            if (hours <= 0) {
                return `${minutes}m`;
            }

            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        }

        return duration;
    };

    useEffect(() => {
        // Pays en cache pour éviter un appel ipapi à chaque visite
        const cachedCountry = cacheService.get<string>(CACHE_KEYS.USER_COUNTRY);
        if (cachedCountry) {
            setUserCountry(cachedCountry);
            return;
        }
        const fetchCountry = async () => {
            try {
                const response = await fetch('https://ipapi.co/json/');
                const data = await response.json();
                if (data.country_name) {
                    setUserCountry(data.country_name);
                    cacheService.set(CACHE_KEYS.USER_COUNTRY, data.country_name);
                }
            } catch (error) {
                // Silencieux — pas critique
            }
        };
        fetchCountry();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setSportIndex((prev) => (prev + 1) % sportImages.length);
        }, 30000); // 30 seconds interval
        return () => clearInterval(interval);
    }, []);

    // Preload sport images to prevent flickering
    useEffect(() => {
        sportImages.forEach((src) => {
            const img = new Image();
            img.src = src;
        });
    }, []);

    // Fetch movies depuis le cache puis l'API en arrière-plan
    const fetchMovies = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await moviesService.getAllMovies((freshMovies) => {
                // Callback appelé quand les données fraîches arrivent (background refresh)
                setMovies(freshMovies);
            });
            setMovies(data);
        } catch (error) {
            console.error("Failed to fetch movies", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Charger le cache instantanément
        const cached = cacheService.get<Movie[]>(CACHE_KEYS.MOVIES);
        if (cached && cached.length > 0) {
            setMovies(cached);
            setLoading(false);
            // Refresh en arrière-plan (silencieux)
            fetchMovies(true);
        } else {
            // Pas de cache : chargement normal
            fetchMovies(false);
        }

        // WebSocket — met à jour cache + état React en temps réel
        const handleMovieCreated = (newMovie: Movie) => {
            moviesService.applyWebSocketUpdate('created', newMovie);
            setMovies(prev => {
                if (prev.find(m => m.id === newMovie.id)) return prev;
                return [newMovie, ...prev];
            });
        };

        const handleMovieUpdated = (updatedMovie: Movie) => {
            moviesService.applyWebSocketUpdate('updated', updatedMovie);
            setMovies(prev => prev.map(m => m.id === updatedMovie.id ? updatedMovie : m));
        };

        const handleMovieDeleted = (data: { id: string }) => {
            moviesService.applyWebSocketUpdate('deleted', { id: data.id } as any);
            setMovies(prev => prev.filter(m => m.id !== data.id));
        };

        socketService.connect();
        socketService.on('movieCreated', handleMovieCreated);
        socketService.on('movieUpdated', handleMovieUpdated);
        socketService.on('movieDeleted', handleMovieDeleted);

        return () => {
            socketService.off('movieCreated', handleMovieCreated);
            socketService.off('movieUpdated', handleMovieUpdated);
            socketService.off('movieDeleted', handleMovieDeleted);
        };
    }, []);

    // Open Movie Details from URL search parameter or global event (instant)
    useEffect(() => {
        // Handle URL param
        if (movieParam && movies.length > 0) {
            const movieObj = movies.find(m => m.id === movieParam || String(m.id) === movieParam);
            if (movieObj) {
                const mapped = {
                    ...movieObj,
                    id: movieObj.id,
                    title: movieObj.title,
                    image: movieObj.poster,
                    rating: movieObj.score,
                    year: movieObj.releaseDate ? new Date(movieObj.releaseDate).getFullYear() : 2024,
                    category: Array.isArray(movieObj.genres) ? movieObj.genres.join(', ') : (movieObj.genres || 'Inconnu'),
                    duration: formatDuration(movieObj.duration)
                };
                setSelectedMovie(mapped);
            }
        }

        // Handle Instant Event
        const handleOpenMovie = (e: Event) => {
            const customEvent = e as CustomEvent;
            const movieObj = customEvent.detail;
            if (movieObj) {
                const mapped = {
                    ...movieObj,
                    id: movieObj.id,
                    title: movieObj.title,
                    image: movieObj.poster,
                    rating: movieObj.score,
                    year: movieObj.releaseDate ? new Date(movieObj.releaseDate).getFullYear() : 2024,
                    category: Array.isArray(movieObj.genres) ? movieObj.genres.join(', ') : (movieObj.genres || 'Inconnu'),
                    duration: formatDuration(movieObj.duration)
                };
                setSelectedMovie(mapped);
                // Dynamically update URL without full Next.js traversal to avoid Suspense flashes
                window.history.pushState({}, '', `?movie=${movieObj.id}`);
            }
        };

        window.addEventListener('open-movie-details', handleOpenMovie);
        return () => window.removeEventListener('open-movie-details', handleOpenMovie);
    }, [movieParam, movies]);

    // --- Filtering Logic with Mutual Exclusivity (Memoized) ---
    const {
        trendingMovies,
        top10France,
        actionMovies,
        horrorMovies,
        familyMovies,
        scifiAdventureMovies,
        comedyMovies,
        onSelectMovie
    } = React.useMemo(() => {
        if (!movies.length) return {
            trendingMovies: [], top10France: [], actionMovies: [],
            horrorMovies: [], familyMovies: [], scifiAdventureMovies: [], comedyMovies: [],
            onSelectMovie: (m: any) => setSelectedMovie(m)
        };

        const mapMovieToCardInternal = (movie: Movie) => ({
            ...movie,
            id: movie.id,
            title: movie.title,
            image: movie.poster,
            rating: movie.score,
            year: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 2024,
            category: Array.isArray(movie.genres) ? movie.genres.join(', ') : (movie.genres || 'Inconnu'),
            duration: formatDuration(movie.duration)
        });

        // Map all active movies first and sort by newest (createdAt) descending
        const allMappedMovies = movies
            .filter(m => m.status === 'active')
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .map(mapMovieToCardInternal);

        const onSelectMovie = (movie: any) => {
            setSelectedMovie(movie);
        };

        // Filter by Section
        const trendingMovies = allMappedMovies.filter(m => m.section === 'Tendances').slice(0, 10);
        
        // Top 10: Explicit section OR isTop10 flag (STRICTLY 10)
        const top10France = allMappedMovies
            .filter(m => m.section === 'Top 10' || m.isTop10)
            .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
            .slice(0, 10)
            .map((m, index) => ({ ...m, rank: index + 1 }));

        const actionMovies = allMappedMovies.filter(m => m.section === 'Action').slice(0, 10);
        const horrorMovies = allMappedMovies.filter(m => m.section === 'Horreur').slice(0, 10);
        const familyMovies = allMappedMovies.filter(m => m.section === 'Animé').slice(0, 10);
        const scifiAdventureMovies = allMappedMovies.filter(m => m.section === 'Fantastique' || m.section === 'Aventure').slice(0, 10);
        const comedyMovies = allMappedMovies.filter(m => m.section === 'Comédie').slice(0, 10);

        return {
            trendingMovies,
            top10France,
            actionMovies,
            horrorMovies,
            familyMovies,
            scifiAdventureMovies,
            comedyMovies,
            onSelectMovie
        };
    }, [movies]);

    const handlePlayMovie = (movie: any) => {
        if (movie && movie.id) {
            router.push(`/watch/${movie.id}`);
        }
    };

    if (loading) {
        return <LoadingScreen message="Chargement de votre expérience..." />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white pb-20">
            <Navbar />
            <Hero
                onDetailsClick={(movie) => setSelectedMovie(movie)}
                userCountry={userCountry}
                onPlay={(movie) => handlePlayMovie(movie)}
                top10Movies={top10France}
                allMovies={movies}
            />

            <div className="relative z-20 pt-16 sm:pt-20 md:pt-24 lg:pt-32 pb-16 sm:pb-20 bg-gradient-to-b from-gray-900 to-black space-y-0">
                {/* Dual Banner Section (Donation & Sport) */}
                <div className="w-full px-3 sm:px-4 pb-8 sm:pb-10">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">

                        {/* Main Premium Banner (Large) - 3 columns (60%) */}
                        <div className="lg:col-span-3 relative rounded-2xl sm:rounded-3xl overflow-hidden bg-[#08090e] border border-white/10 shadow-2xl group min-h-[160px] sm:min-h-[200px] md:min-h-[240px]">
                            {/* Dynamic Background */}
                            <div className="absolute inset-0 overflow-hidden">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-[#08090e] to-[#08090e]" />
                            </div>

                            {/* Content */}
                            <div className="relative z-10 p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col justify-center h-full max-w-lg">

                                <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white mb-2 sm:mb-3 tracking-tight">
                                    Une expérience de streaming <span className="text-blue-400">sans aucune limite</span>
                                </h3>

                                <p className="text-xs sm:text-sm md:text-base text-gray-400 mb-3 sm:mb-4 md:mb-6 leading-relaxed max-w-sm">
                                    Accès illimité aux films, séries, animés et chaînes TV en direct. Qualité 4K HDR sans compromis.
                                </p>

                                <div className="flex flex-wrap items-center gap-4">
                                    <button
                                        className="group cursor-pointer px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-[#e53965] hover:bg-[#d62f58] text-white font-bold rounded-lg sm:rounded-xl transition-all hover:scale-105 shadow-lg shadow-[#e53965]/20 flex items-center gap-2 text-xs sm:text-sm md:text-base min-h-[44px]"
                                    >
                                        <span>Faire un don</span>
                                        <Icon icon="solar:hand-heart-bold" className="w-6 h-6 -rotate-12 transition-transform group-hover:scale-110" />
                                    </button>
                                </div>
                            </div>

                            {/* Visual on the right - Extended with Fade & Blur */}
                            <div className="absolute right-0 top-0 bottom-0 w-2/3 hidden md:block overflow-hidden rounded-r-3xl">
                                <div className="relative w-full h-full">
                                    <img
                                        src="/images/onboarding.jpg"
                                        alt="Films & Séries"
                                        className="w-full h-full object-cover object-center"
                                    />

                                    {/* Complex Gradient Mask & Blur Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#08090e] via-[#08090e]/80 to-transparent" />
                                    <div className="absolute inset-y-0 left-0 w-1/3 backdrop-blur-[2px]" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#08090e]/50 to-transparent" />
                                </div>
                            </div>
                        </div>

                        {/* Secondary Banner (Sport Images) - 2 columns (40%) */}
                        <div className="lg:col-span-2 relative rounded-2xl sm:rounded-3xl overflow-hidden bg-[#08090e] border border-white/10 shadow-2xl group min-h-[160px] sm:min-h-[200px] md:min-h-[240px]">
                            <AnimatePresence mode='wait'>
                                <motion.img
                                    key={sportIndex}
                                    src={sportImages[sportIndex]}
                                    alt="Sports Live"
                                    initial={{ opacity: 0, scale: 1.05 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 3.0, ease: "easeInOut" }}
                                    className="absolute inset-0 w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700"
                                />
                            </AnimatePresence>

                            {/* Gradients - Enhanced Depth Effect */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#08090e] via-[#08090e]/60 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#08090e] via-[#08090e]/50 to-transparent" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-[#08090e] via-transparent to-transparent opacity-80" />

                            {/* Content Inside Image - Bottom Position */}
                            <div className="absolute bottom-0 left-0 p-4 sm:p-6 md:p-8 w-full z-20">
                                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white italic tracking-tighter uppercase leading-none mb-2 drop-shadow-2xl">
                                    Vivez le meilleur <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                                        Du Sport
                                    </span>
                                </h3>
                                <p className="text-gray-300 text-xs sm:text-sm md:text-sm max-w-md line-clamp-2 leading-relaxed opacity-90">
                                    Ligue 1, Champions League, NBA, UFC... Ne ratez plus aucun événement majeur.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
                {/* 1. Tendances (High Rating) */}
                {trendingMovies.length > 0 && (
                    <div className="mb-0">
                        <h2 className="text-sm sm:text-lg font-bold text-white px-4 mb-0">Tendances</h2>
                        <ContentRow title="Tendances" data={trendingMovies} onMovieSelect={onSelectMovie} />
                    </div>
                )}

                {/* 2. Top 10 des films */}
                {top10France.length > 0 && (
                    <div className="mb-0">
                        <div className="flex items-center gap-3 px-4 mb-2">
                            <div className="flex flex-col items-center justify-center w-8 h-8 bg-[#E50914] rounded-[2px] shadow-sm">
                                <span className="text-[0.5rem] font-black text-white leading-none tracking-tighter">TOP</span>
                                <span className="text-[1.0rem] font-black text-white leading-none -mt-0.5">10</span>
                            </div>
                            <span className="text-sm sm:text-xl font-bold text-white tracking-wide drop-shadow-md">
                                Top 10 des films en {userCountry} aujourd'hui
                            </span>
                        </div>
                        <ContentRow title={`Top 10 ${userCountry}`} data={top10France} onMovieSelect={onSelectMovie} showRank={true} />
                    </div>
                )}

                {/* 3. Films d'action */}
                {actionMovies.length > 0 && (
                    <div className="mb-0">
                        <h2 className="text-sm sm:text-lg font-bold text-white px-4 mb-0">Action</h2>
                        <ContentRow title="Action" data={actionMovies} onMovieSelect={onSelectMovie} />
                    </div>
                )}



                {/* 5. Films d'horreur */}
                {horrorMovies.length > 0 && (
                    <div className="mb-0">
                        <h2 className="text-sm sm:text-lg font-bold text-white px-4 mb-0">Horreur</h2>
                        <ContentRow title="Horreur" data={horrorMovies} onMovieSelect={onSelectMovie} />
                    </div>
                )}

                {/* 6. Animation (Ex-Enfants et familles) */}
                {familyMovies.length > 0 && (
                    <div className="mb-0">
                        <h2 className="text-sm sm:text-lg font-bold text-white px-4 mb-0">Animation</h2>
                        <ContentRow title="Animation" data={familyMovies} onMovieSelect={onSelectMovie} />
                    </div>
                )}

                {/* 7. Aventure/Fantastique */}
                {scifiAdventureMovies.length > 0 && (
                    <div className="mb-0">
                        <h2 className="text-sm sm:text-lg font-bold text-white px-4 mb-0">Fantastique & Aventure</h2>
                        <ContentRow title="Aventure" data={scifiAdventureMovies} onMovieSelect={onSelectMovie} />
                    </div>
                )}

                {/* 8. Comédie (Last Position) */}
                {comedyMovies.length > 0 && (
                    <div className="mb-0">
                        <h2 className="text-sm sm:text-lg font-bold text-white px-4 mb-0">Comédie</h2>
                        <ContentRow title="Comédie" data={comedyMovies} onMovieSelect={onSelectMovie} />
                    </div>
                )}


            </div>

            <AnimatePresence>
                {selectedMovie && (
                    <MovieDetails
                        movie={selectedMovie}
                        onClose={() => {
                            setSelectedMovie(null);
                            // Clear parameter from URL cleanly without layout disruption
                            const url = new URL(window.location.href);
                            url.searchParams.delete('movie');
                            window.history.replaceState({}, '', url.pathname + url.search);
                        }}
                        userCountry={userCountry}
                        onPlay={(movie) => handlePlayMovie(movie)}
                        allMovies={movies.filter(m => m.status === 'active')}
                        top10Movies={top10France}
                    />
                )}
            </AnimatePresence>

            {/* Loading Overlay for Details */}
            {detailsLoading && (
                <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-white text-sm font-medium animate-pulse">Chargement des détails...</p>
                </div>
            )}
        </div>
    );
}
