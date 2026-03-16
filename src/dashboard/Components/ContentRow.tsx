'use client';

import React, { useRef, useState, useEffect } from 'react';
import { MovieCard } from './MovieCard';
import { Icon } from '@iconify/react';

interface ContentRowProps {
    title: string;
    data: Array<{
        id: string | number;
        title: string;
        image: string;
        rating: number;
        year: number;
        category: string;
        duration?: string;
    }>;
    onMovieSelect?: (movie: any) => void;
    showRank?: boolean;
}

export const ContentRow = ({ title, data, onMovieSelect, showRank }: ContentRowProps) => {
    const rowRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);

    const handleScroll = () => {
        if (rowRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
            // Show left arrow only after scrolling past the first few cards (e.g., > 300px)
            setShowLeftArrow(scrollLeft > 300);
            // Show right arrow if not at the very end
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    useEffect(() => {
        handleScroll(); // Initial check
        window.addEventListener('resize', handleScroll);
        return () => window.removeEventListener('resize', handleScroll);
    }, [data]);

    const scroll = (direction: 'left' | 'right') => {
        if (rowRef.current) {
            const { scrollLeft, clientWidth } = rowRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2;
            rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    return (
        <div className="pb-4 sm:pb-6 relative group/row">
            {/* Left Scroll Button - Floating Circle - Hidden on mobile */}
            <button
                type="button"
                onClick={() => scroll('left')}
                className={`hidden sm:flex absolute left-4 top-[120px] sm:top-[140px] md:top-[164px] -translate-y-1/2 z-50 h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white shadow-lg cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 hover:bg-white hover:text-black hover:border-white ${showLeftArrow ? 'opacity-0 group-hover/row:opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
            >
                <Icon icon="solar:alt-arrow-left-linear" width={28} />
            </button>

            <div
                ref={rowRef}
                onScroll={handleScroll}
                className="flex gap-2 sm:gap-4 md:gap-6 overflow-x-auto pl-3 sm:pl-4 scroll-pl-3 sm:scroll-pl-4 pt-3 sm:pt-4 pb-6 sm:pb-8 scrollbar-hide pr-3 sm:pr-4 snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {data.map((movie, index) => (
                    <div key={movie.id} className="snap-start shrink-0">
                        <MovieCard
                            {...movie}
                            rank={showRank ? index + 1 : undefined}
                            onClick={() => onMovieSelect && onMovieSelect({ ...movie, rank: showRank ? index + 1 : undefined })}
                        />
                    </div>
                ))}
            </div>

            {/* Right Scroll Button - Floating Circle - Hidden on mobile */}
            <button
                type="button"
                onClick={() => scroll('right')}
                className={`hidden sm:flex absolute right-4 top-[120px] sm:top-[140px] md:top-[164px] -translate-y-1/2 z-50 h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white shadow-lg cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 hover:bg-white hover:text-black hover:border-white ${showRightArrow ? 'opacity-0 group-hover/row:opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
            >
                <Icon icon="solar:alt-arrow-right-linear" width={28} />
            </button>
        </div>
    );
};
