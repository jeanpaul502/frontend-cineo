import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

// Utility function defined locally since external file is missing
const cleanChannelName = (name: string) => {
    if (!name) return '';
    // Remove extension and replace underscores/hyphens with spaces
    return name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
};

interface Channel {
    id: string | number;
    name: string;
    logo?: string;
    url: string;
    playlistId?: string | number;
}

export const HeroTV = () => {
    const router = useRouter();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Placeholder for featured channels until backend logic is implemented
        setChannels([]);
        setLoading(false);
    }, []);

    if (loading) {
        return (
            <div className="relative w-full group/tv">
                <div className="w-full overflow-x-auto scrollbar-hide py-2 sm:py-3 md:py-4">
                    <div className="flex items-center justify-start gap-3 sm:gap-4 md:gap-6 lg:gap-10 pl-3 sm:pl-4 md:pl-16 lg:pl-24 min-w-max pr-3 sm:pr-4 md:pr-16 lg:pr-24">
                        {[...Array(11)].map((_, i) => (
                            <div key={i} className="flex flex-col items-center gap-2">
                                <div className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 rounded-full bg-white/5 animate-pulse" />
                                <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (channels.length === 0) return null;

    return (
        <div className="relative w-full group/tv">
            <div
                className="w-full overflow-x-auto scrollbar-hide py-2 sm:py-3 md:py-4"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                <div className="flex items-center justify-start gap-3 sm:gap-4 md:gap-6 lg:gap-10 pl-3 sm:pl-4 md:pl-16 lg:pl-24 min-w-max pr-3 sm:pr-4 md:pr-16 lg:pr-24">
                    {channels.map((channel, idx) => (
                        <motion.div
                            key={`${channel.id}-${idx}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * idx, duration: 0.5 }}
                            onClick={() => router.push(`/watch/tv?url=${encodeURIComponent(channel.url)}&name=${encodeURIComponent(channel.name)}&logo=${encodeURIComponent(channel.logo || '')}&playlistId=${channel.playlistId}`)}
                            className="flex flex-col items-center gap-1 sm:gap-2 group cursor-pointer"
                        >
                            {/* Circle with Logo */}
                            <div className="relative h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 rounded-full bg-black/40 backdrop-blur-md border border-gray-600 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:border-white group-hover:bg-white/10 shadow-lg overflow-hidden">
                                {channel.logo ? (
                                    <img
                                        src={channel.logo}
                                        alt={channel.name}
                                        className="h-[60%] w-[60%] object-contain drop-shadow-md"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                        }}
                                    />
                                ) : null}

                                {/* Fallback Text if no logo or error */}
                                <span className={`${channel.logo ? 'hidden' : ''} font-bold text-xs sm:text-sm md:text-base text-gray-300 px-1 text-center truncate w-full`}>
                                    {channel.name?.substring(0, 3)}
                                </span>

                                {/* Active/Hover Glow */}
                                <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity bg-white blur-md pointer-events-none" />
                            </div>

                            {/* Channel Name */}
                            <span className="hidden md:block text-[10px] sm:text-xs md:text-sm font-medium text-gray-400 group-hover:text-white transition-colors text-center w-20 sm:w-24 truncate">
                                {cleanChannelName(channel.name || '')}
                            </span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};
