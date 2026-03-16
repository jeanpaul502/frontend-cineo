'use client';

import React, { useState, useEffect } from 'react';
import { moviesService } from '../services/movies.service';
import { socketService } from '../services/socket.service';
import { Navbar } from './Components/Navbar';
import { MovieGridCard } from './Components/MovieGridCard';
import { MovieDetails } from './Components/MovieDetails';
import { AnimatePresence, motion } from 'framer-motion';
import { Film } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

export const Movies = () => {
    const router = useRouter();
    const [selectedMovie, setSelectedMovie] = useState<any>(null);
    const [movies, setMovies] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [userCountry, setUserCountry] = useState<string>('France');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchMovies = async () => {
        try {
            const data = await moviesService.getAllMovies();
            setMovies(data.filter(m => m.status === 'active'));
        } catch (error) {
            console.error("Failed to fetch movies", error);
        } finally {
            setLoading(false);
        }
    };

    const searchParams = useSearchParams();
    const movieParam = searchParams.get('movie');

    useEffect(() => {
        setLoading(true);
        fetchMovies();

        const handleMovieCreated = (newMovie: any) => {
            console.log('New movie created, refreshing...', newMovie);
            fetchMovies();
        };

        socketService.connect();
        socketService.on('movieCreated', handleMovieCreated);

        return () => {
            socketService.off('movieCreated', handleMovieCreated);
        };
    }, []);

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

    const mappedMovies = movies.map(mapMovieToCard);
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
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
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
                        onClose={() => setSelectedMovie(null)}
                        userCountry={userCountry}
                        onPlay={() => handlePlayMovie(selectedMovie)}
                        allMovies={movies}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
