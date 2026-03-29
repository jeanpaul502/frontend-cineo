import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

import { channelsService } from '../../services/channels.service';

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
        const fetchHeroChannels = async () => {
            try {
                const playlists = await channelsService.getAllPlaylists();
                // Prendre la première playlist active, ou sinon, la toute première playlist disponible.
                const firstActivePlaylist = playlists.find(p => p.status === 'active') || playlists[0];
                
                if (firstActivePlaylist && firstActivePlaylist.channels && firstActivePlaylist.channels.length > 0) {
                    // Limiter à 12 chaînes comme demandé pour l'alignement
                    const activeChannels = firstActivePlaylist.channels.slice(0, 12);
                    
                    const formatted = activeChannels.map(c => ({
                        id: c.id,
                        name: c.name,
                        logo: c.logo,
                        url: c.url,
                        playlistId: firstActivePlaylist.id
                    }));
                    setChannels(formatted);
                } else {
                    console.log("HeroTV: aucune chaîne ou playlist trouvée", firstActivePlaylist);
                    setChannels([]);
                }
            } catch (error) {
                console.error("Failed to fetch hero TV channels", error);
                setChannels([]);
            } finally {
                setLoading(false);
            }
        };

        fetchHeroChannels();
    }, []);

    if (loading) {
        return (
            <div className="relative w-full group/tv">
                <div className="w-full overflow-x-auto scrollbar-hide py-2 sm:py-3 md:py-4 px-4 sm:px-6 md:px-16 lg:px-24">
                    <div className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4 lg:gap-5 w-full min-w-max lg:min-w-0">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="flex flex-col items-center gap-2">
                                <div className="h-10 w-10 sm:h-14 sm:w-14 md:h-[76px] md:w-[76px] lg:h-[90px] lg:w-[90px] rounded-full bg-white/5 animate-pulse" />
                                <div className="h-2 w-12 sm:h-3 sm:w-16 bg-white/5 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (channels.length === 0) {
        // Au lieu de masquer complètement, on affiche la zone avec un message pour comprendre si le backend répond vide.
        return (
            <div className="relative w-full py-4 text-center">
                <p className="text-gray-500 text-sm">Aucune chaîne trouvée dans la première playlist.</p>
            </div>
        );
    }

    return (
        <div className="relative w-full group/tv">
            <div
                className="w-full overflow-x-auto scrollbar-hide py-2 sm:py-3 md:py-4 px-4 sm:px-6 md:px-16 lg:px-24"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                <div className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4 lg:gap-5 w-full min-w-max lg:min-w-0">
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
                            <div className="relative h-10 w-10 sm:h-14 sm:w-14 md:h-[76px] md:w-[76px] lg:h-[90px] lg:w-[90px] rounded-full bg-black/40 backdrop-blur-md border border-gray-600 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:border-white group-hover:bg-white/10 shadow-lg overflow-hidden shrink-0">
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
                                <span className={`${channel.logo ? 'hidden' : ''} font-bold text-[10px] sm:text-xs md:text-sm text-gray-300 px-1 text-center truncate w-full`}>
                                    {channel.name?.substring(0, 3)}
                                </span>

                                {/* Active/Hover Glow */}
                                <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity bg-white blur-md pointer-events-none" />
                            </div>

                            {/* Channel Name */}
                            <span className="hidden md:block text-[10px] sm:text-xs font-medium text-gray-400 group-hover:text-white transition-colors text-center w-16 sm:w-20 md:w-[70px] lg:w-[84px] truncate">
                                {cleanChannelName(channel.name || '')}
                            </span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};
