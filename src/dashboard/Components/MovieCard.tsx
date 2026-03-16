'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ExpandableButton } from './ExpandableButton';
import { addToMyList, removeFromMyList, isInMyList, MovieItem } from '../../utils/myListUtils';

interface MovieProps {
    id?: string | number;
    title: string;
    image: string;
    rating: number;
    year: number;
    category: string;
    duration?: string;
    description?: string;
    onClick?: () => void;
    rank?: number;
    [key: string]: any;
}

export const MovieCard = ({ id, title, image, rating, year, category, duration, description, onClick, rank, ...rest }: MovieProps) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [isInList, setIsInList] = useState(false);

    useEffect(() => {
        const checkListStatus = async () => {
            if (id) {
                const inList = await isInMyList(id);
                setIsInList(inList);
            }
        };

        checkListStatus();

        const handleListUpdate = async () => {
            if (id) {
                const inList = await isInMyList(id);
                setIsInList(inList);
            }
        };

        window.addEventListener('my-list-updated', handleListUpdate);
        return () => window.removeEventListener('my-list-updated', handleListUpdate);
    }, [id]);

    const handleLikeClick = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsLiked(!isLiked);
    };

    const handleListClick = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!id) return;

        if (isInList) {
            const success = await removeFromMyList(id);
            if (success) setIsInList(false);
        } else {
            const success = await addToMyList({
                id,
                title,
                image,
                rating,
                year,
                category,
                duration,
                description,
                ...rest
            } as MovieItem);
            if (success) setIsInList(true);
        }
    };

    const handleDetailsClick = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (onClick) onClick();
    };

    return (
        <motion.div
            className="relative h-[180px] w-[120px] sm:w-auto sm:h-[260px] md:h-[300px] lg:h-[320px] aspect-[2/3] flex-shrink-0 overflow-hidden rounded-lg sm:rounded-xl bg-gray-900 shadow-lg cursor-pointer group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.05, zIndex: 10 }}
            transition={{ duration: 0.3 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
        >
            <div className="relative h-full w-full">
                {/* Image */}
                <img
                    src={image}
                    alt={title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Rank Badge - Stylized Number */}
                {rank && (
                    <div className="absolute -bottom-4 -left-2 z-20 pointer-events-none">
                        <div className="relative">
                            {/* Shadow/3D Depth Layer */}
                            <span
                                className="absolute top-1 left-1 text-[5rem] sm:text-[8rem] font-black tracking-tighter text-black/50 select-none leading-none"
                            >
                                {rank}
                            </span>
                            {/* Main Number Layer */}
                            <span
                                className="relative block text-[5rem] sm:text-[8rem] font-black tracking-tighter select-none leading-none"
                                style={{
                                    color: 'rgba(50, 50, 50, 0.4)', // Semi-transparent gray fill
                                    WebkitTextStroke: '2px white',   // White border
                                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)' // Subtle shadow
                                }}
                            >
                                {rank}
                            </span>
                        </div>
                    </div>
                )}

                {/* Gradient Overlay (Visible only on hover) */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                />

                {/* Buttons Overlay (Bottom Center) - Hidden on mobile */}
                <div className="hidden sm:flex absolute inset-x-0 bottom-6 items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 20 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="flex items-center gap-2 scale-75"
                    >
                        {/* Details Button */}
                        <ExpandableButton
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                                </svg>
                            }
                            label="Détails"
                            onClick={handleDetailsClick}
                            height="40px"
                        />

                        {/* Add to List Button */}
                        <ExpandableButton
                            icon={isInList ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="transition-transform duration-300">
                                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300">
                                    <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
                                </svg>
                            )}
                            label={isInList ? "Retirer" : "Ma Liste"}
                            onClick={handleListClick}
                            rotateIcon={!isInList}
                            activeColor={isInList ? "bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/30" : undefined}
                            height="40px"
                        />

                        {/* Like Button */}
                        <ExpandableButton
                            icon={isLiked ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
                            )}
                            label={isLiked ? "Aimé" : "J'aime"}
                            onClick={handleLikeClick}
                            shakeOnClick={true}
                            activeIconColor={isLiked ? "text-red-500" : undefined}
                            height="40px"
                        />
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};
