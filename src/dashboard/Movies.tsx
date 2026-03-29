'use client';

import React, { useState, useEffect } from 'react';
import { moviesService, Movie } from '../services/movies.service';
import { socketService } from '../services/socket.service';
import { cacheService, CACHE_KEYS } from '../services/cache.service';
import { Navbar } from './Components/Navbar';
import { MovieGridCard } from './Components/MovieGridCard';
import { MovieDetails } from './Components/MovieDetails';
import { AnimatePresence, motion } from 'framer-motion';
import { Film } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LoadingScreen } from './Components/LoadingScreen';
import { Icon } from '@iconify/react';

export const Movies = () => {
    const router = useRouter();
    const [selectedMovie, setSelectedMovie] = useState<any>(null);
    const [movies, setMovies] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [userCountry, setUserCountry] = useState<string>('France');

    const searchParams = useSearchParams();
    const movieParam = searchParams.get('movie');
    const searchQuery = searchParams.get('q') || '';

    const fetchMovies = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await moviesService.getAllMovies((freshMovies) => {
                setMovies(freshMovies.filter(m => m.status === 'active'));
            });
            setMovies(data.filter(m => m.status === 'active'));
        } catch (error) {
            console.error("Failed to fetch movies", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Affichage instantané depuis le cache
        const cached = cacheService.get<Movie[]>(CACHE_KEYS.MOVIES);
        if (cached && cached.length > 0) {
            setMovies(cached.filter(m => m.status === 'active'));
            setLoading(false);
            fetchMovies(true); // Refresh silencieux
        } else {
            fetchMovies(false);
        }

        const handleMovieCreated = (newMovie: Movie) => {
            moviesService.applyWebSocketUpdate('created', newMovie);
            if (newMovie.status === 'active') {
                setMovies(prev => {
                    if (prev.find(m => m.id === newMovie.id)) return prev;
                    return [newMovie, ...prev];
                });
            }
        };

        const handleMovieUpdated = (updatedMovie: Movie) => {
            moviesService.applyWebSocketUpdate('updated', updatedMovie);
            setMovies(prev => {
                if (updatedMovie.status === 'active') {
                    const exists = prev.find(m => m.id === updatedMovie.id);
                    return exists ? prev.map(m => m.id === updatedMovie.id ? updatedMovie : m) : [updatedMovie, ...prev];
                }
                return prev.filter(m => m.id !== updatedMovie.id);
            });
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

    // movieParam mapping is handled in Navbar now correctly? Well, movieParam here still opens the movie if we click it directly from somewhere else. 
    // Actually, movieParam should still be parsed here if someone directly links to /dashboard/movies?movie=...
    // Let's keep it just in case.
    useEffect(() => {
        if (movieParam && movies.length > 0) {
            const movie = movies.find(m => m.id === movieParam || String(m.id) === movieParam);
            if (movie) {
                const mapped = mapMovieToCard(movie);
                setSelectedMovie(mapped);
            }
        }
    }, [movieParam, movies]);

    const handlePlayMovie = (movie: any) => {
        if (movie && (movie.id || movie._id)) {
            router.push(`/watch/${movie.id || movie._id}`);
        }
    };

    const mapMovieToCard = (movie: any) => ({
        ...movie,
        id: movie.id,
        title: movie.title,
        image: movie.poster || movie.coverImage || movie.image || movie.posterPath,
        rating: movie.score || movie.voteAverage || 0,
        year: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : (movie.year || 2024),
        category: Array.isArray(movie.genres) ? movie.genres.join(', ') : (movie.genres || 'Inconnu'),
        duration: movie.duration
    });

    const mappedMovies = [...movies]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .map(mapMovieToCard);

    const top10Movies = React.useMemo(() => {
        return mappedMovies
            .filter(m => m.section === 'Top 10' || m.isTop10)
            .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
            .slice(0, 10);
    }, [mappedMovies]);

    const filteredMovies = mappedMovies.filter(m => {
        const matchesSearch = searchQuery ? m.title.toLowerCase().includes(searchQuery.toLowerCase()) : true;
        return matchesSearch;
    });

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black bg-fixed text-white pb-20">
            <Navbar />

            <div className="pt-24 px-4 sm:px-8 pb-20">
                {/* Content Grid */}
                {loading ? (
                    <LoadingScreen message="Chargement de la bibliothèque..." />
                ) : filteredMovies.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-2 sm:gap-4 md:gap-6">
                        {filteredMovies.map((movie) => (
                            <MovieGridCard
                                key={movie.id}
                                {...movie}
                                onClick={() => setSelectedMovie(movie)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="relative flex flex-col items-center justify-center min-h-[70vh] text-center z-10">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6 }}
                            className="max-w-2xl mx-auto flex flex-col items-center"
                        >
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm border border-white/10 shadow-xl">
                                <Film className="w-9 h-9 text-white/80 opacity-80" />
                            </div>

                            <h2 className="text-xl md:text-2xl font-bold mb-4 text-white tracking-wide">
                                Aucun film trouvé
                            </h2>

                            <p className="text-lg text-gray-400 leading-relaxed max-w-xl mx-auto font-light mb-8">
                                Il semble qu'il n'y ait aucun film disponible pour le moment.
                            </p>

                            <div className="pt-2">
                                <span className="inline-block h-px w-24 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></span>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {selectedMovie && (
                    <MovieDetails
                        movie={selectedMovie}
                        onClose={() => {
                            setSelectedMovie(null);
                            if (movieParam) {
                                router.replace('/dashboard/movies');
                            }
                        }}
                        userCountry={userCountry}
                        onPlay={(movie) => handlePlayMovie(movie)}
                        allMovies={movies}
                        top10Movies={top10Movies}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
