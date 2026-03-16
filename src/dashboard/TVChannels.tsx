'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from './Components/Navbar';
import { ChevronDown, Search, Tv } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { channelsService, Playlist as ServicePlaylist, Channel as ServiceChannel } from '../services/channels.service';

interface Playlist {
    id: string;
    countryName: string;
    countryCode: string;
    isActive: boolean;
    channels: ServiceChannel[];
}

export const TVChannels = () => {
    const router = useRouter();
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
    const [channels, setChannels] = useState<ServiceChannel[]>([]);
    const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(true);
    const [isLoadingChannels, setIsLoadingChannels] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadPlaylists();
    }, []);

    useEffect(() => {
        if (selectedPlaylist) {
            setChannels(selectedPlaylist.channels || []);
        } else {
            setChannels([]);
        }
    }, [selectedPlaylist]);

    const loadPlaylists = async () => {
        try {
            setIsLoadingPlaylists(true);
            const data = await channelsService.getAllPlaylists();
            
            // Map service playlists to component playlists
            const mappedPlaylists: Playlist[] = data
                .filter(p => p.status === 'active')
                .map(p => ({
                    id: p.id,
                    countryName: p.country || p.name, // Fallback to name if country is missing
                    countryCode: p.countryCode || 'XX',
                    isActive: p.status === 'active',
                    channels: p.channels || []
                }));

            setPlaylists(mappedPlaylists);
            
            // Select first playlist by default if available
            if (mappedPlaylists.length > 0) {
                setSelectedPlaylist(mappedPlaylists[0]);
            }
        } catch (error) {
            console.error('Failed to load playlists:', error);
        } finally {
            setIsLoadingPlaylists(false);
        }
    };

    // Filter channels
    const filteredChannels = channels.filter(channel =>
        channel.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black bg-fixed text-white pb-20">
            <Navbar />

            <div className="pt-20 sm:pt-24 px-3 sm:px-4 md:px-16 lg:px-24 pb-16 sm:pb-20">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-end items-center gap-4 sm:gap-6 mb-6 sm:mb-8 border-b border-white/10 pb-4 sm:pb-6">
                    {/* Playlist Selector & Search */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full md:w-auto">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Rechercher une chaîne..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full sm:w-64 h-12 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        {/* Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="w-full sm:w-64 h-12 flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 hover:bg-white/10 transition-all"
                            >
                                {selectedPlaylist ? (
                                    <div className="flex items-center gap-3">
                                        {selectedPlaylist.countryCode && selectedPlaylist.countryCode !== 'XX' && (
                                            <img 
                                                src={`https://flagcdn.com/w40/${selectedPlaylist.countryCode.toLowerCase()}.png`}
                                                alt={selectedPlaylist.countryName}
                                                className="w-6 h-auto rounded-sm object-cover shadow-sm"
                                            />
                                        )}
                                        <span className="font-medium truncate">{selectedPlaylist.countryName}</span>
                                    </div>
                                ) : (
                                    <span className="text-gray-400">Sélectionner un pays</span>
                                )}
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute top-full right-0 mt-2 w-full bg-[#111827] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
                                    {playlists.map((playlist) => (
                                        <button
                                            key={playlist.id}
                                            onClick={() => {
                                                setSelectedPlaylist(playlist);
                                                setIsDropdownOpen(false);
                                                setSearchQuery('');
                                            }}
                                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${selectedPlaylist?.id === playlist.id ? 'bg-blue-500/10 text-blue-400' : ''}`}
                                        >
                                            {playlist.countryCode && playlist.countryCode !== 'XX' && (
                                                <img 
                                                    src={`https://flagcdn.com/w40/${playlist.countryCode.toLowerCase()}.png`}
                                                    alt={playlist.countryName}
                                                    className="w-6 h-auto rounded-sm object-cover shadow-sm"
                                                />
                                            )}
                                            <span className="font-medium truncate text-left">{playlist.countryName}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                {isLoadingPlaylists ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                ) : filteredChannels.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
                        {filteredChannels.map((channel) => (
                            <motion.div
                                key={channel.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => router.push(`/watch/tv?url=${encodeURIComponent(channel.url)}&name=${encodeURIComponent(channel.name)}&logo=${encodeURIComponent(channel.logo || '')}&playlistId=${selectedPlaylist?.id}`)}
                                className="group relative bg-white/5 border border-white/5 rounded-lg sm:rounded-xl overflow-hidden aspect-video hover:border-blue-500/50 transition-all cursor-pointer hover:shadow-lg hover:shadow-blue-500/10"
                                title={channel.name} // Native tooltip for accessibility
                            >
                                <div className="absolute inset-0 p-2 sm:p-3 md:p-4 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                    {channel.logo ? (
                                        <img
                                            src={channel.logo}
                                            alt={channel.name}
                                            className="max-w-full max-h-full object-contain drop-shadow-lg"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    ) : null}
                                </div>
                            </motion.div>
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
                                <Tv className="w-9 h-9 text-white/80 opacity-80" />
                            </div>

                            <h2 className="text-xl md:text-2xl font-bold mb-4 text-white tracking-wide">
                                {selectedPlaylist ? "Aucune chaîne trouvée" : "Chaînes TV"}
                            </h2>

                            <p className="text-lg text-gray-400 leading-relaxed max-w-xl mx-auto font-light mb-8">
                                {selectedPlaylist
                                    ? "Il semble qu'il n'y ait aucune chaîne disponible pour cette playlist actuellement."
                                    : "Veuillez sélectionner un pays dans le menu ci-dessus pour accéder à la liste des chaînes de télévision en direct."}
                            </p>

                            <div className="pt-2">
                                <span className="inline-block h-px w-24 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></span>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
};
