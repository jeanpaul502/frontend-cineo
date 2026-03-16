'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { ExpandableButton } from './ExpandableButton';
import { addToMyList, removeFromMyList, isInMyList, MovieItem } from '../../utils/myListUtils';

interface MovieDetailsProps {
    movie: any;
    onClose: () => void;
    onPlay?: (movie: any) => void;
    userCountry?: string;
    allMovies?: any[];
    top10Movies?: any[];
}

export const MovieDetails = ({ movie, onClose, onPlay, userCountry = 'France', top10Movies = [] }: MovieDetailsProps) => {
    const [isLiked, setIsLiked] = useState(false);
    const [isInList, setIsInList] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (!movie) return;

        const checkListStatus = async () => {
            if (movie?.id) {
                const status = await isInMyList(movie.id);
                setIsInList(status);
            }
        };

        checkListStatus();

        const handleListUpdate = () => {
            checkListStatus();
        };

        window.addEventListener('my-list-updated', handleListUpdate);
        return () => window.removeEventListener('my-list-updated', handleListUpdate);
    }, [movie]);

    if (!movie) return null;

    const handleMyListToggle = async () => {
        if (!movie) return;

        if (isInList) {
            const success = await removeFromMyList(movie.id);
            if (success) setIsInList(false);
        } else {
            const success = await addToMyList({
                id: movie.id,
                title: movie.title,
                image: movie.coverImage || movie.poster || movie.image,
                rating: movie.score || movie.rating,
                year: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : (movie.year || 0),
                category: Array.isArray(movie.genres) ? movie.genres[0] : (movie.category || movie.genre || 'Inconnu'),
                duration: movie.duration || '',
                description: movie.description,
                ...movie
            } as MovieItem);
            if (success) setIsInList(true);
        }
    };

    const handleLikeToggle = () => {
        setIsLiked(!isLiked);
    };

    const formatVotes = (count: number) => {
        if (!count) return '0';
        if (count >= 1000000) return (count / 1000000).toFixed(1).replace('.0', '') + 'M';
        if (count >= 1000) return (count / 1000).toFixed(2).replace('.00', '') + 'K';
        return count.toString();
    };

    const getRank = (movieId: string) => {
        if (!top10Movies || top10Movies.length === 0) return 0;
        const index = top10Movies.findIndex(m => m.id === movieId);
        return index !== -1 ? index + 1 : 0;
    };

    // Safe access to properties that might be missing in some movie objects (like from Hero)
    // Rating used for "Recommandé" calculation and star display logic
    // We want rating to be 0-10 scale for Recommandé (rating * 10 = %)
    // And for stars: Math.min(Math.floor(rating), 5)
    const rawScore = movie.score || movie.rating || movie.voteAverage || 9.0;
    const rating = rawScore; // Keep raw score (0-10)
    const category = movie.category || movie.genre || "Film";

    const castList = (Array.isArray(movie.cast) && movie.cast.length > 0)
        ? movie.cast.slice(0, 5).map((c: any) => ({
            name: c.name,
            img: c.image || (c.profile_path ? `https://image.tmdb.org/t/p/w200${c.profile_path}` : null)
        }))
        : [];

    // Calculate remaining actors count for the +N display
    const remainingCastCount = (Array.isArray(movie.cast) && movie.cast.length > 5) 
        ? movie.cast.length - 4 
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 50, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 50, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full max-w-5xl overflow-hidden rounded-3xl bg-gray-900 shadow-2xl border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute right-6 top-6 z-30 rounded-full bg-black/60 p-2 text-white backdrop-blur-md transition-colors hover:bg-white/20"
                >
                    <Icon icon="solar:close-circle-linear" width={28} />
                </button>

                <div className="relative h-[500px] w-full">
                    <img
                        src={movie.coverImage || movie.poster || movie.image}
                        alt={movie.title}
                        className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />

                    <div className="absolute bottom-0 left-0 w-full p-10">
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="w-full max-w-[280px] mb-6"
                        >
                            {movie.titleLogo || movie.logo ? (
                                <img
                                    src={movie.titleLogo || movie.logo}
                                    alt={movie.title}
                                    className="w-full h-auto object-contain drop-shadow-2xl"
                                />
                            ) : (
                                <h2 className="text-4xl font-black text-white drop-shadow-xl">{movie.title}</h2>
                            )}
                        </motion.div>

                        {/* Top 10 Badge */}
                        {getRank(movie.id) > 0 && (
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.25 }}
                                className="flex items-center gap-3 mb-6"
                            >
                                <div className="flex flex-col items-center justify-center w-9 h-9 bg-[#E50914] rounded-[2px] shadow-sm">
                                    <span className="text-[0.55rem] font-black text-white leading-none tracking-tighter">TOP</span>
                                    <span className="text-[1.1rem] font-black text-white leading-none -mt-0.5">10</span>
                                </div>
                                <span className="text-lg font-bold text-white tracking-wide drop-shadow-md">
                                    N° {getRank(movie.id)} en {userCountry} aujourd'hui
                                </span>
                            </motion.div>
                        )}

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="flex items-center gap-3 mb-4"
                        >
                            <button 
                                onClick={() => onPlay && onPlay(movie)}
                                className="group flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-500 hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-blue-500/20 h-[40px]"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="group-hover:scale-110 transition-transform">
                                    <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                                </svg>
                                <span>Lecture</span>
                            </button>

                            <ExpandableButton
                                icon={isInList ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg>
                                )}
                                label={isInList ? "Retirer de ma liste" : "Ma liste"}
                                onClick={handleMyListToggle}
                                activeColor={isInList ? "bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/30" : undefined}
                                alwaysExpanded={true}
                                height="40px"
                            />

                            <ExpandableButton
                                icon={isLiked ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
                                )}
                                label={isLiked ? "Aimé" : "J'aime"}
                                onClick={handleLikeToggle}
                                shakeOnClick={true}
                                activeIconColor={isLiked ? "text-red-500" : undefined}
                                height="40px"
                            />

                            <ExpandableButton
                                icon={<Icon icon="solar:download-minimalistic-linear" width={20} height={20} />}
                                label="Télécharger"
                                onClick={() => {}}
                                shakeOnClick={true}
                                height="40px"
                            />
                        </motion.div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 p-10 pt-0 -mt-6 relative z-10">
                    <div className="md:col-span-2 space-y-6">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-1 text-xs font-medium mb-3 text-gray-300">
                                <span className="flex items-center gap-1.5 text-green-400 font-bold mr-2">
                                    {Math.round(rating * 10)}% Recommandé
                                </span>
                                <span className="flex items-center text-gray-400 font-medium">
                                    {(movie.ageRating === 'TP' ? 'Tout public' : movie.ageRating) || '13+'}
                                </span>
                                <span className="text-gray-400">,</span>
                                <span className="flex items-center gap-1">
                                    <Icon icon="solar:calendar-linear" width={14} /> 
                                    {movie.year || (movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : '')}
                                </span>
                                <span className="text-gray-400">,</span>
                                <span className="flex items-center gap-1">
                                    <Icon icon="solar:clock-circle-linear" width={14} />
                                    {movie.duration || '1h 55m'}
                                </span>
                            </div>

                            {/* Stars Rating */}
                            <div className="flex items-center gap-4">
                                <div className="flex -space-x-3">
                                    <div className="h-11 w-11 rounded-full bg-black flex items-center justify-center overflow-hidden shadow-sm border-2 border-gray-900 z-30">
                                        <Icon icon="logos:netflix-icon" width={24} />
                                    </div>
                                    <div className="h-11 w-11 rounded-full bg-blue-900 flex items-center justify-center overflow-hidden shadow-sm border-2 border-gray-900 z-20">
                                        <Icon icon="simple-icons:paramountplus" width={20} className="text-white" />
                                    </div>
                                    <div className="h-11 w-11 rounded-full bg-blue-500 flex items-center justify-center overflow-hidden shadow-sm border-2 border-gray-900 z-10">
                                        <Icon icon="simple-icons:prime" width={24} className="text-white ml-1" />
                                    </div>
                                    <div className="h-11 w-11 rounded-full bg-black flex items-center justify-center overflow-hidden shadow-sm border-2 border-gray-900 z-0">
                                        <Icon icon="simple-icons:hulu" width={24} className="text-[#1ce783] ml-1" />
                                    </div>
                                    <div className="h-11 w-11 rounded-full bg-blue-800 flex items-center justify-center overflow-hidden shadow-sm border-2 border-gray-900 -z-10">
                                        <Icon icon="simple-icons:warnerbros" width={24} className="text-white" />
                                    </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <svg 
                                            key={star} 
                                            xmlns="http://www.w3.org/2000/svg" 
                                            width="16" 
                                            height="16" 
                                            viewBox="0 0 24 24" 
                                            fill="currentColor"
                                            className={star <= Math.min(Math.floor(rating), 5) ? "text-amber-400" : "text-gray-600/40"}
                                        >
                                            <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                                        </svg>
                                    ))}
                                </div>
                                <div className="text-xs font-medium text-gray-300 flex items-center">
                                    <span className="text-white font-bold">{rating.toFixed(1)} Score</span>
                                    <span className="mx-1">,</span>

                                    <span>{formatVotes(movie.voteCount || 1200)}</span>
                                    <Icon icon="solar:users-group-rounded-bold" width={14} className="text-gray-400 mx-1" />
                                    <span>Evaluations</span>
                                </div>
                            </div>
                        </div>

                        <p className="text-gray-200 text-base leading-relaxed font-medium">
                            {(() => {
                                const desc = movie.description || "In a dystopian future, society has crumbled, and the only law is survival. When a mysterious signal is detected from the wasteland, a lone warrior must embark on a perilous journey to uncover the truth that could save humanity or doom it forever.";
                                const isLong = desc.length > 150;
                                return (
                                    <>
                                        {isExpanded || !isLong ? desc : desc.slice(0, 150) + '...'}
                                        {isLong && (
                                            <button 
                                                onClick={() => setIsExpanded(!isExpanded)} 
                                                className="text-white font-bold ml-1 hover:underline focus:outline-none"
                                            >
                                                {isExpanded ? 'Voir moins' : 'Voir plus'}
                                            </button>
                                        )}
                                    </>
                                );
                            })()}
                        </p>
                    </div>

                    <div className="md:col-span-1 space-y-6 text-sm">
                        <div className="space-y-3">
                            <span className="block text-gray-500 font-medium">Cast</span>
                            <div className="flex items-center -space-x-3">
                                {movie.cast ? (
                                    /* Try parsing if it's a JSON string (from backend) */
                                    (() => {
                                        try {
                                            const castData = typeof movie.cast === 'string' ? JSON.parse(movie.cast) : movie.cast;
                                            // Handle both array of objects or simple array
                                            const castArray = Array.isArray(castData) ? castData : [];

                                            if (castArray.length === 0) return <span className="text-gray-400">Aucun casting disponible</span>;

                                            const visibleCast = castArray.slice(0, 7);
                                            const remainingCount = Math.max(0, castArray.length - 7);

                                            return (
                                                <>
                                                    {visibleCast.map((actor: any, i: number) => {
                                                        // Handle TMDB structure vs simple structure
                                                        // Prioritize 'image' (backend mapped) -> 'profile_path' (raw TMDB) -> fallback
                                                        const imgUrl = actor.image 
                                                            ? actor.image 
                                                            : (actor.profile_path 
                                                                ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                                                                : (actor.profilePath || actor.img || 'https://via.placeholder.com/100?text=Actor'));
                                                        
                                                        const name = actor.name || actor.original_name || 'Inconnu';
                                                        const isLast = i === visibleCast.length - 1;

                                                        return (
                                                            <div key={i} className="group relative">
                                                                <div className="h-14 w-14 rounded-full border-2 border-gray-900 overflow-hidden shadow-sm bg-gray-800 cursor-pointer transition-transform hover:scale-110 hover:z-10 relative">
                                                                    <img
                                                                        src={imgUrl}
                                                                        alt={name}
                                                                        className="h-full w-full object-cover"
                                                                        onError={(e) => {
                                                                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100?text=Actor';
                                                                        }}
                                                                    />
                                                                </div>

                                                                {/* Remaining Count Badge */}
                                                                {isLast && remainingCount > 0 && (
                                                                    <div className="absolute -bottom-1 -right-1 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-gray-700 ring-4 ring-gray-900">
                                                                        <span className="text-[10px] font-bold text-white">+{remainingCount}</span>
                                                                    </div>
                                                                )}

                                                                {/* Tooltip */}
                                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                                                    {name}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                </>
                                            );
                                        } catch (e) {
                                            console.error("Cast parsing error", e);
                                            return <span className="text-gray-400">Erreur chargement casting</span>;
                                        }
                                    })()
                                ) : (
                                    <span className="text-gray-400">Aucun casting disponible</span>
                                )}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="block text-gray-500 font-medium">Genres</span>
                            <span className="block text-white text-base">
                                {Array.isArray(movie.genres) ? movie.genres.join(', ') : (category || 'Film')}
                            </span>
                        </div>
                        <div className="space-y-1">
                            <span className="block text-gray-500 font-medium">Director</span>
                            <span className="block text-white text-base">{movie.director || 'Unknown Director'}</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};
