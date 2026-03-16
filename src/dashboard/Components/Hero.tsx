'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { HeroTV } from './HeroTV';
import { ExpandableButton } from './ExpandableButton';
// import { API_BASE_URL } from '../../utils/config';
import { addToMyList, removeFromMyList, isInMyList, MovieItem } from '../../utils/myListUtils';
import { moviesService } from '../../services/movies.service';

interface HeroProps {
    onDetailsClick?: (movie: any) => void;
    userCountry?: string;
    onPlay?: (movie: any) => void;
    top10Movies?: any[];
}

export const Hero = ({ onDetailsClick, userCountry = 'France', onPlay, top10Movies = [] }: HeroProps) => {
    const [heroMovies, setHeroMovies] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isInList, setIsInList] = useState(false);
    const [likedList, setLikedList] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchMovies = async () => {
            try {
                const movies = await moviesService.getAllMovies();
                const heroes = movies.filter((m: any) => m.isHero && m.status === 'active');
                setHeroMovies(heroes);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMovies();
    }, []);

    useEffect(() => {
        if (heroMovies.length === 0) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % heroMovies.length);
        }, 8000);
        return () => clearInterval(interval);
    }, [heroMovies]);

    useEffect(() => {
        const checkListStatus = async () => {
            const currentMovie = heroMovies[currentIndex];
            if (currentMovie?.id) {
                const status = await isInMyList(currentMovie.id);
                setIsInList(status);
            } else {
                setIsInList(false);
            }
        };

        checkListStatus();

        const handleListUpdate = () => {
            checkListStatus();
        };

        window.addEventListener('my-list-updated', handleListUpdate);
        return () => window.removeEventListener('my-list-updated', handleListUpdate);
    }, [currentIndex, heroMovies]);

    // Helpers
    const formatDuration = (minutes: number) => {
        if (!minutes) return '';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    const formatVotes = (count: number) => {
        if (!count) return '0';
        if (count >= 1000000) return (count / 1000000).toFixed(1).replace('.0', '') + 'M';
        if (count >= 1000) return (count / 1000).toFixed(2).replace('.00', '') + 'K';
        return count.toString();
    };

    const renderStars = (voteAverage: number) => {
        // Logic: 
        // 1.x -> 1 star
        // 2.x -> 2 stars
        // ...
        // 5.x -> 5 stars
        // >= 6.x -> 5 stars
        const score = voteAverage || 0;
        const starCount = Math.min(Math.floor(score), 5);

        return [1, 2, 3, 4, 5].map((star) => (
            <div key={star} className="relative">
                {/* Empty Star Background */}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-600/40">
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                </svg>

                {/* Filled Star Overlay */}
                {star <= starCount && (
                    <div className="absolute inset-0 overflow-hidden w-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400">
                            <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}
            </div>
        ));
    };

    const getRank = (movieId: any) => {
        if (!top10Movies || top10Movies.length === 0) return 0;
        return top10Movies.findIndex((m: any) => m.id === movieId) + 1;
    };

    if (isLoading) {
        return (
            <div className="h-[91vh] w-full flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <span className="text-gray-400 text-sm font-medium animate-pulse">Chargement...</span>
            </div>
        );
    }

    if (heroMovies.length === 0) {
        return (
            <div className="relative h-[91vh] w-full bg-black flex items-center justify-center">
                <div className="text-white text-2xl font-bold opacity-50">Aucun film trouvé</div>
            </div>
        );
    }

    const movie = heroMovies[currentIndex];

    // --- Button Handlers ---
    const handleMyListToggle = async () => {
        if (!movie) return;

        if (isInList) {
            const success = await removeFromMyList(movie.id);
            if (success) setIsInList(false);
        } else {
            const success = await addToMyList({
                id: movie.id,
                title: movie.title,
                image: movie.coverImage || movie.poster,
                rating: movie.score,
                year: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 0,
                category: Array.isArray(movie.genres) ? movie.genres[0] : (movie.genres || 'Inconnu'),
                duration: movie.duration || '',
                description: movie.description,
                ...movie
            } as MovieItem);
            if (success) setIsInList(true);
        }
    };
    const showCheck = isInList;

    const handleLikeToggle = () => {
        setLikedList(prev => {
            if (prev.includes(movie.id)) {
                return prev.filter(id => id !== movie.id);
            } else {
                return [...prev, movie.id];
            }
        });
    };
    const isLiked = likedList.includes(movie.id);

    return (
        <div className="relative h-[70vh] sm:h-[80vh] md:h-[91vh] w-full bg-black">
            {/* Background Carousel - Render all images to prevent reloading/flickering */}
            <div className="absolute inset-0 overflow-hidden">
                {heroMovies.map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: index === currentIndex ? 1 : 0,
                            zIndex: index === currentIndex ? 1 : 0
                        }}
                        transition={{ duration: 1.2, ease: "easeInOut" }}
                        className="absolute inset-0"
                    >
                        <div
                            className="absolute inset-0 bg-cover"
                            style={{
                                backgroundImage: `url('${item.coverImage || item.poster}')`,
                                backgroundPosition: 'center 35%'
                            }}
                        />
                    </motion.div>
                ))}

                {/* Static Gradients - Desktop only */}
                <div className="hidden md:block absolute inset-0 z-10 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
                <div className="hidden md:block absolute inset-y-0 left-0 z-10 w-full md:w-3/4 bg-gradient-to-r from-gray-900 via-gray-900/60 to-transparent" />

                {/* Mobile gradient - Bottom only for HeroTV section */}
                <div className="md:hidden absolute bottom-0 left-0 right-0 h-80 z-10 bg-gradient-to-t from-black via-black/70 to-transparent" />
            </div>

            {/* Content Container */}
            <div className="relative z-20 flex h-full flex-col justify-center px-4 sm:px-6 md:px-16 lg:px-24">
                <div className="max-w-2xl w-full">

                    {/* MOBILE: Logo centré + 2 boutons uniquement */}
                    <div className="md:hidden flex flex-col items-center justify-end h-full pb-8">
                        {heroMovies.map((item, index) => {
                            const isCurrent = index === currentIndex;
                            return (
                                <motion.div
                                    key={`mobile-${item.id}`}
                                    initial={{ opacity: 0 }}
                                    animate={{
                                        opacity: isCurrent ? 1 : 0,
                                        zIndex: isCurrent ? 10 : 0
                                    }}
                                    transition={{ duration: 1.2, ease: "easeInOut" }}
                                    className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-6"
                                    style={{ pointerEvents: isCurrent ? 'auto' : 'none' }}
                                >
                                    {/* Logo centré */}
                                    <div className="w-full max-w-[200px] mb-4">
                                        {item.titleLogo || item.logoPath ? (
                                            <img
                                                src={item.titleLogo || item.logoPath}
                                                alt={item.title}
                                                className="w-full h-auto object-contain drop-shadow-2xl"
                                            />
                                        ) : (
                                            <h1 className="text-3xl font-black text-white drop-shadow-lg text-center">{item.title}</h1>
                                        )}
                                    </div>

                                    {/* 3 Boutons alignés sur mobile */}
                                    <div className="flex items-center justify-center gap-2 w-full max-w-sm px-4">
                                        {/* Bouton Lecture */}
                                        <button
                                            onClick={() => onPlay?.(item)}
                                            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-3 text-sm font-bold text-white transition-all hover:bg-blue-500 active:scale-95 cursor-pointer shadow-lg shadow-blue-500/20 min-h-[44px]"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                                            </svg>
                                            <span>Lecture</span>
                                        </button>

                                        {/* Bouton Ma Liste */}
                                        <button
                                            onClick={handleMyListToggle}
                                            className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-semibold transition-all active:scale-95 cursor-pointer backdrop-blur-md min-h-[44px]
                                                ${showCheck
                                                    ? "bg-green-600/20 border-green-500 text-green-400"
                                                    : "border-gray-400/30 bg-white/10 text-white"
                                                }
                                            `}
                                        >
                                            {showCheck ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
                                                </svg>
                                            )}
                                            <span>Ma liste</span>
                                        </button>


                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* DESKTOP: Version complète */}
                    <div className="hidden md:block">
                        {/* FIXED HEIGHT TEXT CONTAINER */}
                        <div className="relative h-[400px] w-full mb-6">
                            {heroMovies.map((item, index) => {
                                const isCurrent = index === currentIndex;

                                return (
                                    <motion.div
                                        key={`text-${item.id}`}
                                        initial={{ opacity: 0 }}
                                        animate={{
                                            opacity: isCurrent ? 1 : 0,
                                            zIndex: isCurrent ? 10 : 0
                                        }}
                                        transition={{ duration: 1.2, ease: "easeInOut" }}
                                        className="absolute bottom-0 left-0 right-0 space-y-4"
                                        style={{ pointerEvents: isCurrent ? 'auto' : 'none' }}
                                    >
                                        <div className="w-full max-w-[280px] lg:max-w-[350px] mb-2">
                                            {item.titleLogo || item.logoPath ? (
                                                <img
                                                    src={item.titleLogo || item.logoPath}
                                                    alt={item.title}
                                                    className="w-full h-auto object-contain drop-shadow-2xl"
                                                />
                                            ) : (
                                                <h1 className="text-4xl font-black text-white drop-shadow-lg">{item.title}</h1>
                                            )}
                                        </div>

                                        {/* Top 10 Badge - Use calculated rank */}
                                        {getRank(item.id) > 0 && (
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col items-center justify-center w-9 h-9 bg-[#E50914] rounded-[2px] shadow-sm">
                                                    <span className="text-[0.55rem] font-black text-white leading-none tracking-tighter">TOP</span>
                                                    <span className="text-[1.1rem] font-black text-white leading-none -mt-0.5">10</span>
                                                </div>
                                                <span className="text-lg md:text-xl font-bold text-white tracking-wide drop-shadow-md">
                                                    N° {getRank(item.id)} en {userCountry} aujourd'hui
                                                </span>
                                            </div>
                                        )}

                                        {/* Metadata Row */}
                                        <div className="flex items-center gap-1 text-sm font-bold text-gray-300">
                                            <span className="flex items-center gap-2 text-green-400 font-bold mr-2">
                                                {item.score ? Math.round(item.score * 10) : (item.voteAverage ? Math.round(item.voteAverage * 10) : 0)}% Recommandé
                                            </span>
                                            
                                            <span className="flex items-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> {item.releaseDate ? new Date(item.releaseDate).getFullYear() : ''}
                                            </span>

                                            <span className="text-gray-400">,</span>

                                            <span className="flex items-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg> {typeof item.duration === 'string' ? item.duration : formatDuration(item.duration)}
                                            </span>

                                            <span className="flex items-center gap-2 text-white ml-2">
                                                {Array.isArray(item.genres) ? item.genres.slice(0, 3).join(', ') : (typeof item.genres === 'string' ? item.genres.split(',').slice(0, 3).join(', ') : '')}
                                            </span>

                                        </div>

                                        {/* Description */}
                                        <div className="max-h-[80px] overflow-hidden">
                                            <p className="text-base text-gray-300 md:text-lg leading-relaxed line-clamp-3 font-light tracking-wide shadow-black drop-shadow-md">
                                                {item.description || item.overview}
                                            </p>
                                        </div>

                                        {/* Social Proof */}
                                        <div className="flex items-center gap-4 pt-2">
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
                                                    <Icon icon="simple-icons:warnerbros" width={24} className="text-white " />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center text-amber-400 space-x-1">
                                                    {renderStars(item.score || item.voteAverage || 0)}
                                                </div>
                                                <div className="text-sm font-medium text-gray-300 flex items-center gap-1">
                                                    <span className="text-white font-bold">
                                                        {(item.score || item.voteAverage) ? (item.score || item.voteAverage).toFixed(1) : '0.0'} Score
                                                    </span>
                                                    <span className="text-gray-400">, {formatVotes(item.voteCount)} </span>
                                                    <Icon icon="solar:users-group-rounded-bold" width={14} className="text-gray-400" />
                                                    <span className="text-gray-400"> Évaluations</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Desktop Buttons */}
                        <div className="flex flex-wrap gap-4 relative z-20 mt-10">
                            <button
                                onClick={() => onPlay?.(movie)}
                                className="group flex items-center gap-2 rounded-lg bg-blue-600 px-10 py-3 text-[15px] font-bold text-white transition-all hover:bg-blue-500 hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-blue-500/20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="group-hover:scale-110 transition-transform">
                                    <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                                </svg>
                                <span>Lecture</span>
                            </button>

                            <button
                                onClick={handleMyListToggle}
                                className={`group flex items-center gap-2 rounded-lg border px-6 py-3 text-sm font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md
                                    ${showCheck
                                        ? "bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/30"
                                        : "border-gray-400/30 bg-white/10 text-white hover:bg-white/20 hover:border-gray-400"
                                    }
                                `}
                            >
                                {showCheck ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="transition-transform duration-300">
                                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:rotate-90">
                                        <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
                                    </svg>
                                )}
                                <span>{showCheck ? "Retirer de ma liste" : "Ajouter à ma liste"}</span>
                            </button>

                            <ExpandableButton
                                icon={isLiked ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17a15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
                                )}
                                label={isLiked ? "Aimé" : "J'aime"}
                                onClick={handleLikeToggle}
                                shakeOnClick={true}
                                activeIconColor={isLiked ? "text-red-500" : undefined}
                            />



                            <ExpandableButton
                                icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>}
                                label="Détails"
                                onClick={() => {
                                    const rank = getRank(heroMovies[currentIndex].id);
                                    onDetailsClick?.({ ...movie, rank: rank > 0 ? rank : undefined });
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Carousel Indicators - Repositioned Above HeroTV */}
            {heroMovies.length > 1 && (
                <div className="absolute bottom-24 sm:bottom-26 md:bottom-28 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2 z-30">
                    {heroMovies.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 cursor-pointer ${idx === currentIndex ? 'w-6 sm:w-8 bg-white' : 'w-1 sm:w-1.5 bg-white/40 hover:bg-white/60'
                                }`}
                        />
                    ))}
                </div>
            )}

            {/* Age Rating Badge - Fixed Right Edge, Animating Text */}
            <div className="absolute right-0 bottom-32 sm:bottom-36 md:bottom-40 z-30 hidden md:flex items-center bg-black/50 backdrop-blur-md border-l-4 border-red-600 py-2 pl-4 pr-6 rounded-l-xl shadow-2xl">
                {/* Removed 'Age' label text */}
                <AnimatePresence mode="wait">
                    <motion.span
                        key={currentIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="text-white text-2xl font-black"
                    >
                        {movie ? (movie.ageRating === 'TP' ? 'Tout public' : movie.ageRating) || '12+' : ''}
                    </motion.span>
                </AnimatePresence>
            </div>

            <div className="absolute -bottom-12 sm:-bottom-16 md:-bottom-20 left-0 w-full z-30">
                <HeroTV />
            </div>


        </div>
    );
};
