'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from './Components/Navbar';
import { MovieGridCard } from './Components/MovieGridCard';
import { MovieDetails } from './Components/MovieDetails';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark } from 'lucide-react';
import { getMyList } from '../utils/myListUtils';

export const MyList = () => {
    const [movies, setMovies] = useState<any[]>([]);
    const [selectedMovie, setSelectedMovie] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchList = async () => {
            const list = await getMyList();
            setMovies(list);
            setIsLoading(false);
        };

        fetchList();

        const handleUpdate = () => {
            fetchList();
        };

        window.addEventListener('my-list-updated', handleUpdate);
        return () => window.removeEventListener('my-list-updated', handleUpdate);
    }, []);

    const handlePlayMovie = (movie: any) => {
        // Placeholder
        console.log("Play", movie);
        setSelectedMovie(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black bg-fixed text-white pb-20">
            <Navbar />
            <div className="pt-24 px-4 md:px-16 lg:px-24 pb-20">
                <div className="flex flex-col md:flex-row justify-end items-center gap-6 mb-8 border-b border-white/10 pb-6">
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-4 md:gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="aspect-[2/3] bg-white/5 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : movies.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-4 md:gap-6">
                        {movies.map((movie) => (
                            <MovieGridCard
                                key={movie.id}
                                {...movie}
                                image={movie.posterPath || movie.backdropPath || movie.image}
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
                                <Bookmark className="w-9 h-9 text-white/80 opacity-80" />
                            </div>

                            <h2 className="text-xl md:text-2xl font-bold mb-4 text-white tracking-wide">
                                Votre liste est vide
                            </h2>

                            <p className="text-lg text-gray-400 leading-relaxed max-w-xl mx-auto font-light mb-8">
                                Ajoutez des films et des séries à votre liste pour les retrouver facilement ici.
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
                        userCountry="France"
                        onPlay={() => handlePlayMovie(selectedMovie)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
