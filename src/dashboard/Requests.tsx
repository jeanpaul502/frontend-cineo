'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './Components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { showSuccessToast, showErrorToast } from '../lib/toast';
import { moviesService, TmdbSearchResult, Movie } from '../services/movies.service';
import { useRouter } from 'next/navigation';
import {
    Film,
    Tv,
    Search,
    Send,
    CheckCircle,
    Mail,
    AlertCircle,
    Loader2,
    Play,
    X
} from 'lucide-react';
import { Icon } from '@iconify/react';

// Utility function to debounce search requests
function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

type RequestType = 'movie' | 'series' | 'tv_channel';
type NotificationMethod = 'whatsapp' | 'telegram' | 'email' | '';

export const Requests = () => {
    const router = useRouter();
    const [requestType, setRequestType] = useState<RequestType>('movie');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<TmdbSearchResult[]>([]);
    const [selectedItem, setSelectedItem] = useState<TmdbSearchResult | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [availabilityStatus, setAvailabilityStatus] = useState<'checking' | 'available' | 'unavailable' | null>(null);
    const [existingMovies, setExistingMovies] = useState<Movie[]>([]);
    const [notificationMethod, setNotificationMethod] = useState<NotificationMethod>('');
    const [contactInfo, setContactInfo] = useState('');
    const [contactError, setContactError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [foundMovie, setFoundMovie] = useState<Movie | null>(null);

    // Refs for search
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const requestTypes = [
        { id: 'movie' as RequestType, label: 'Films', icon: Film, color: 'blue' },
        { id: 'series' as RequestType, label: 'Séries', icon: Tv, color: 'purple' },
        { id: 'tv_channel' as RequestType, label: 'Chaînes TV', icon: Icon, iconName: 'solar:tv-bold', color: 'red' }
    ];

    const notificationMethods = [
        { id: 'whatsapp' as NotificationMethod, label: 'WhatsApp', icon: Icon, iconName: 'logos:whatsapp-icon', placeholder: '+33 6 12 34 56 78' },
        { id: 'email' as NotificationMethod, label: 'Email', icon: Mail, placeholder: 'votre@email.com' },
        { id: 'telegram' as NotificationMethod, label: 'Telegram', icon: Icon, iconName: 'logos:telegram', placeholder: '@votre_username' }
    ];

    // Fetch existing movies for availability check
    useEffect(() => {
        const fetchMovies = async () => {
            try {
                const movies = await moviesService.getAllMovies();
                setExistingMovies(movies);
            } catch (error) {
                console.error('Error fetching existing movies:', error);
            }
        };
        fetchMovies();
    }, []);

    // Validation des informations de contact
    const validateContactInfo = (method: NotificationMethod, value: string): string | null => {
        const v = value.trim();
        if (!method) return null;

        if (!v) {
            return 'Veuillez saisir vos informations de contact.';
        }

        if (method === 'whatsapp') {
            const sanitized = v.replace(/[\s()-]/g, '');
            if (!sanitized.startsWith('+')) {
                return 'Entrez l’indicatif (+XXX) suivi exactement de 9 chiffres.';
            }
            if (!/^\+[1-9]\d{0,2}\d{9}$/.test(sanitized)) {
                return 'Numéro WhatsApp invalide.';
            }
            return null;
        }

        if (method === 'email') {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
                return 'Adresse email invalide.';
            }
            return null;
        }

        return null;
    };

    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim() || requestType === 'tv_channel') {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            // Map requestType to TMDB type (movie or series)
            const type = requestType === 'series' ? 'series' : 'movie';
            const results = await moviesService.searchTmdb(query, type);
            // Afficher tous les éléments (jusqu'à la limite maximale retournée par l'API, souvent 100 ou plus)
            setSearchResults(results.slice(0, 100));
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, [requestType]);

    // Debounced search effect
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (searchQuery && requestType !== 'tv_channel' && !selectedItem) {
            searchTimeoutRef.current = setTimeout(() => {
                handleSearch(searchQuery);
            }, 500);
        } else if (!searchQuery) {
            setSearchResults([]);
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, requestType, handleSearch, selectedItem]);

    const handleTypeSelect = (type: RequestType) => {
        setRequestType(type);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedItem(null);
        setAvailabilityStatus(null);
        setFoundMovie(null);
        setNotificationMethod('');
        setContactInfo('');
    };

    const handleSelectItem = (item: TmdbSearchResult) => {
        setSelectedItem(item);
        setSearchQuery(item.title);
        setSearchResults([]);
        checkAvailability(item);
    };

    const checkAvailability = (item: TmdbSearchResult) => {
        setAvailabilityStatus('checking');
        const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Check availability logic
        const found = existingMovies.find(m => normalize(m.title) === normalize(item.title));

        setTimeout(() => {
            if (found) {
                setAvailabilityStatus('available');
                setFoundMovie(found);
            } else {
                setAvailabilityStatus('unavailable');
                setFoundMovie(null);
            }
        }, 500);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        setSelectedItem(null);
        setAvailabilityStatus(null);
        setFoundMovie(null);
    };

    const handleSubmit = async () => {
        if (!notificationMethod || !contactInfo) {
            showErrorToast('Veuillez remplir les informations de contact');
            return;
        }

        const error = validateContactInfo(notificationMethod, contactInfo);
        if (error) {
            setContactError(error);
            return;
        }

        setLoading(true);
        try {
            const requestData = {
                type: requestType,
                title: selectedItem ? selectedItem.title : searchQuery,
                tmdbId: selectedItem?.id,
                poster: selectedItem?.poster || undefined,
                overview: selectedItem?.overview || undefined,
                releaseDate: selectedItem?.releaseDate || undefined,
                notificationMethod,
                contactInfo
            };

            await moviesService.createRequest(requestData);

            setShowSuccessMessage(true);
            showSuccessToast('Votre demande a été envoyée avec succès !');

            // Reset form
            setSearchQuery('');
            setSelectedItem(null);
            setContactInfo('');
            setNotificationMethod('');
            setAvailabilityStatus(null);
            setFoundMovie(null);
        } catch (error) {
            console.error('Error submitting request:', error);
            showErrorToast('Une erreur est survenue lors de l\'envoi');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white font-sans relative overflow-hidden flex flex-col pb-20">

            <Navbar />

            <div className="flex-1 container mx-auto max-w-7xl px-4 md:px-8 mt-32 relative z-10 flex flex-col pb-12">

                {/* Header Title Section completely centered at the top */}
                <div className="mb-10 text-center w-full">
                    <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Faites vos demandes</h2>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 w-full">

                    {/* Left Sidebar: Content Type Selection */}
                    <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-6">

                        {/* Banner Section */}
                        <div className="bg-gradient-to-br from-blue-900/40 via-purple-900/20 to-[#08090e] border border-blue-500/30 rounded-3xl p-6 relative overflow-hidden shadow-lg shadow-blue-900/20">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                            <div className="absolute -bottom-10 -right-6 opacity-[0.07] pointer-events-none transform -rotate-12 scale-150">
                                <Film size={140} className="text-white" />
                            </div>
                            <p className="text-sm font-medium text-gray-200 relative z-10 leading-relaxed shadow-sm">
                                Ne trouvez-vous pas votre contenu ? Cherchez-le et nous l'ajouterons sous <span className="text-blue-400 font-extrabold">24h</span>.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-gray-400 mb-4 px-2 uppercase tracking-wider text-xs">Type de contenu</h3>
                            <div className="flex flex-col gap-3">
                                {requestTypes.map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => handleTypeSelect(type.id)}
                                        className={`flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-300 text-left group relative overflow-hidden ${requestType === type.id
                                            ? 'bg-gradient-to-r from-blue-600/20 to-blue-900/20 border border-blue-500/50 shadow-md shadow-blue-900/20'
                                            : 'bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10'
                                            }`}
                                    >
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${requestType === type.id ? 'bg-blue-500 text-white shadow-md' : 'bg-white/10 text-gray-400 group-hover:bg-white/20 group-hover:text-white'
                                            }`}>
                                            {type.id === 'tv_channel' ? (
                                                <Icon icon="solar:tv-bold" className="w-5 h-5" />
                                            ) : (
                                                <div className="w-5 h-5 flex items-center justify-center">
                                                    {React.createElement(type.icon as React.ComponentType<any>, { className: "w-5 h-5" })}
                                                </div>
                                            )}
                                        </div>
                                        <span className={`text-base font-semibold transition-colors ${requestType === type.id ? 'text-white' : 'text-gray-400 group-hover:text-white'
                                            }`}>
                                            {type.label}
                                        </span>
                                        {requestType === type.id && (
                                            <motion.div
                                                layoutId="activeIndicator"
                                                className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 flex gap-8 flex-col xl:flex-row min-w-0">

                        {/* Middle Content: Search/Result/Notification */}
                        <div className="flex-1 flex flex-col min-w-0">

                            {/* Top: Search Bar */}
                            <div className="mb-6 relative z-50 w-full">
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Search className="h-5 w-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            if (requestType === 'tv_channel') {
                                                setSelectedItem(null);
                                            } else {
                                                setSelectedItem(null);
                                            }
                                        }}
                                        className="block w-full pl-12 pr-12 py-3 bg-[#08090e] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm shadow-xl"
                                        placeholder={requestType === 'tv_channel' ? 'Nom de la chaîne (ex: TF1, Canal+...)' : `Rechercher un ${requestType === 'movie' ? 'film' : 'série'} à ajouter...`}
                                    />
                                    {isSearching && (
                                        <div className="absolute inset-y-0 right-12 flex items-center">
                                            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                                        </div>
                                    )}

                                    {/* Clear Search Button */}
                                    {(searchQuery || selectedItem) && (
                                        <button
                                            onClick={handleClearSearch}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white transition-all duration-200 flex items-center justify-center cursor-pointer group/clear"
                                            title="Effacer la recherche"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}

                                    {/* Search Suggestions Dropdown */}
                                    <AnimatePresence>
                                        {searchResults.length > 0 && !selectedItem && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                                className="absolute w-full mt-2 bg-[#08090e] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[400px] overflow-y-auto overscroll-contain z-50 
                                                [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-blue-500/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-blue-500/60 transition-colors scroll-smooth will-change-scroll"
                                            >
                                                {searchResults.map((result) => (
                                                    <div
                                                        key={result.id}
                                                        onClick={() => handleSelectItem(result)}
                                                        className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-0 group"
                                                    >
                                                        {result.poster ? (
                                                            <img src={result.poster} alt={result.title} loading="lazy" className="w-10 h-14 object-cover rounded-lg shadow-sm group-hover:scale-105 transition-transform" />
                                                        ) : (
                                                            <div className="w-10 h-14 bg-white/10 rounded-lg flex items-center justify-center text-gray-500">
                                                                <Film size={16} />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <h4 className="font-bold text-white text-base transition-colors">{result.title}</h4>
                                                            <p className="text-xs text-gray-400">
                                                                {result.releaseDate ? new Date(result.releaseDate).getFullYear() : 'Année inconnue'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Center: Results / Selected Item Display */}
                            <div className="flex-1 min-h-[150px] mb-6">
                                <AnimatePresence mode="wait">
                                    {(selectedItem || (requestType === 'tv_channel' && searchQuery)) ? (
                                        <motion.div
                                            key="result"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm"
                                        >
                                            {/* Background decorative icon */}
                                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none transform translate-x-1/4 -translate-y-1/4">
                                                {requestType === 'movie' ? <Film size={200} /> : requestType === 'series' ? <Tv size={200} /> : <Icon icon="solar:tv-bold" width={200} />}
                                            </div>

                                            <div className="flex flex-col md:flex-row gap-6 relative z-10">
                                                {selectedItem?.poster && (
                                                    <div className="flex-shrink-0 mx-auto md:mx-0">
                                                        <img
                                                            src={selectedItem.poster}
                                                            alt={selectedItem.title}
                                                            className="w-32 h-48 object-cover rounded-xl shadow-2xl ring-1 ring-white/10"
                                                        />
                                                    </div>
                                                )}
                                                <div className="flex-1 text-center md:text-left flex flex-col h-full">
                                                    <h3 className="text-base font-bold text-white mb-2 leading-tight">
                                                        {selectedItem ? selectedItem.title : searchQuery}
                                                    </h3>
                                                    {selectedItem && (
                                                        <>
                                                            <div className="flex flex-col gap-2 mb-4">
                                                                {/* Top Row: Date, Age, Duration, Score */}
                                                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-medium text-gray-300">
                                                                    <span className="flex items-center gap-1.5 font-semibold text-white">
                                                                        <Icon icon="solar:calendar-linear" className="w-4 h-4 text-gray-500" />
                                                                        {selectedItem.releaseDate ? new Date(selectedItem.releaseDate).getFullYear() : 'N/A'}
                                                                    </span>
                                                                    {foundMovie?.ageRating && (
                                                                        <span className="flex items-center gap-1.5 font-bold text-gray-400">
                                                                            {foundMovie.ageRating}
                                                                        </span>
                                                                    )}
                                                                    <span className="flex items-center gap-1.5">
                                                                        <Icon icon="solar:clock-circle-linear" className="w-4 h-4 text-gray-500" />
                                                                        {foundMovie?.duration ? foundMovie.duration : '1h 45m'}
                                                                    </span>
                                                                    <span className="flex items-center gap-1 text-yellow-500 font-bold">
                                                                        <Icon icon="solar:star-bold" className="w-3.5 h-3.5" />
                                                                        {(foundMovie?.score || (selectedItem as any)?.voteAverage || 8.5).toFixed(1)} Score
                                                                    </span>
                                                                </div>

                                                                {/* Bottom Row: Genre */}
                                                                <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs font-medium text-gray-400">
                                                                    <Icon icon="solar:tag-horizontal-linear" className="w-4 h-4 text-gray-500" />
                                                                    {foundMovie?.genres && foundMovie.genres.length > 0
                                                                        ? foundMovie.genres.join(', ')
                                                                        : (requestType === 'series' ? 'Série Télévisée' : 'Film Cinéma')}
                                                                </div>
                                                            </div>
                                                            <p className="text-gray-400 mb-4 leading-relaxed text-sm line-clamp-2 lg:line-clamp-3">
                                                                {selectedItem.overview || "Aucune description détaillée n'est disponible pour ce titre."}
                                                            </p>
                                                        </>
                                                    )}

                                                    {/* Availability Status & Right Button Container */}
                                                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/5">
                                                        {availabilityStatus && (
                                                            <motion.div
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${availabilityStatus === 'available'
                                                                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                                                    : availabilityStatus === 'unavailable'
                                                                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                                                        : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                                                                    }`}
                                                            >
                                                                {availabilityStatus === 'checking' ? (
                                                                    <>
                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                        <span className="font-medium text-xs">Vérification...</span>
                                                                    </>
                                                                ) : availabilityStatus === 'available' ? (
                                                                    <>
                                                                        <CheckCircle className="w-4 h-4" />
                                                                        <span className="font-medium text-xs">Déjà disponible</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <AlertCircle className="w-4 h-4" />
                                                                        <span className="font-medium text-xs">Ce titre n'est pas encore disponible.</span>
                                                                    </>
                                                                )}
                                                            </motion.div>
                                                        )}

                                                        {/* Voir Button disabled completely to act exactly as simple string as requested */}
                                                        {availabilityStatus === 'available' && foundMovie && (
                                                            <div
                                                                onClick={() => router.push(`/dashboard/movies?movie=${foundMovie.id}`)}
                                                                className="text-gray-300 font-bold text-sm hover:text-white hover:underline transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
                                                            >
                                                                Voir le film
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="empty"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="h-full flex flex-col items-center justify-center text-gray-500 border border-dashed border-white/10 rounded-2xl p-8 bg-white/[0.02]"
                                        >
                                            <Search className="w-12 h-12 mb-3 opacity-20" />
                                            <p className="text-lg font-medium">Recherchez un contenu</p>
                                            <p className="text-xs opacity-60">Utilisez la barre de recherche ci-dessus</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Bottom: Notification Preferences & Submit */}
                            <div className="bg-[#08090e] border border-white/10 rounded-2xl p-6 relative">
                                <h3 className="text-lg font-bold text-gray-400 mb-4 uppercase tracking-wider text-xs">Notification et Envoi</h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                                    {notificationMethods.map((method) => (
                                        <div key={method.id} className="relative">
                                            <label
                                                className={`flex flex-row items-center gap-3 px-3 py-3 rounded-xl border transition-all cursor-pointer h-full ${notificationMethod === method.id
                                                    ? 'bg-blue-500/10 border-blue-500 shadow-md shadow-blue-500/10'
                                                    : 'bg-black/20 border-white/5 hover:border-white/20 hover:bg-white/5'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="notificationMethod"
                                                    value={method.id}
                                                    checked={notificationMethod === method.id}
                                                    onChange={() => {
                                                        setNotificationMethod(method.id as NotificationMethod);
                                                        setContactError(null);
                                                    }}
                                                    className="sr-only"
                                                />
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${notificationMethod === method.id ? 'border-blue-500' : 'border-gray-600'
                                                    }`}>
                                                    {notificationMethod === method.id && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                                                </div>

                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    {method.iconName ? (
                                                        <Icon icon={method.iconName} className="w-5 h-5 flex-shrink-0 grayscale-[0.5] group-hover:grayscale-0" />
                                                    ) : (
                                                        React.createElement(method.icon as any, {
                                                            className: `w-5 h-5 flex-shrink-0 ${notificationMethod === method.id ? 'text-blue-500' : 'text-gray-400'}`
                                                        })
                                                    )}
                                                    <span className={`font-medium text-xs truncate ${notificationMethod === method.id ? 'text-white' : 'text-gray-400'}`}>{method.label}</span>
                                                </div>
                                            </label>
                                        </div>
                                    ))}
                                </div>

                                <div className="mb-6">
                                    <label className="block text-xs font-medium text-gray-400 mb-2">
                                        {notificationMethod === 'whatsapp' ? 'Numéro WhatsApp (avec indicatif)' :
                                            notificationMethod === 'email' ? 'Adresse Email' : 'Nom d\'utilisateur Telegram'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={notificationMethod === 'email' ? 'email' : 'text'}
                                            value={contactInfo}
                                            onChange={(e) => {
                                                setContactInfo(e.target.value);
                                                setContactError(null);
                                            }}
                                            placeholder={
                                                notificationMethod === 'whatsapp' ? '+33 6 12 34 56 78' :
                                                    notificationMethod === 'email' ? 'votre@email.com' : '@votre_username'
                                            }
                                            className={`w-full bg-black/40 border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm ${contactError ? 'border-red-500 ring-1 ring-red-500/50' : 'border-white/10'
                                                }`}
                                        />
                                        {contactError && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-red-500 text-xs font-medium bg-[#1a1a1a] pl-2">
                                                <AlertCircle size={14} />
                                                {contactError}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || (availabilityStatus === 'available' && !requestType.includes('tv_channel'))}
                                    className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-xl transform hover:-translate-y-1 ${loading || (availabilityStatus === 'available' && !requestType.includes('tv_channel'))
                                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                        }`}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin w-5 h-5" />
                                            <span>Envoi en cours...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send size={20} />
                                            <span>Envoyer la demande</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Right Sidebar: Tips / Info Box */}
                        <div className="hidden xl:flex w-80 flex-shrink-0 flex-col">
                            <div className="bg-[#08090e] border border-white/10 rounded-3xl p-6 relative overflow-hidden h-full flex flex-col">
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>

                                <div className="relative z-10 flex flex-col flex-1">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-10 h-10 rounded-xl border border-white/10 bg-transparent flex items-center justify-center flex-shrink-0">
                                            <Icon icon="solar:lightbulb-bolt-bold-duotone" className="w-6 h-6 text-yellow-500" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white leading-tight mt-0.5">Comment ça marche ?</h3>
                                    </div>
                                    <ul className="space-y-6 text-sm text-gray-400">
                                        <li className="flex items-start gap-4">
                                            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold border border-blue-500/30">1</div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-white mb-1">Sélectionnez</h4>
                                                <p className="text-xs">Film, Série ou Chaîne TV.</p>
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-4">
                                            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold border border-blue-500/30">2</div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-white mb-1">Recherchez</h4>
                                                <p className="text-xs">Trouvez votre titre exact.</p>
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-4">
                                            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold border border-blue-500/30">3</div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-white mb-1">Validez</h4>
                                                <p className="text-xs">Renseignez votre contact.</p>
                                            </div>
                                        </li>
                                    </ul>

                                    <div className="mt-6 pt-6 border-t border-white/10">
                                        <div className="flex gap-4">
                                            <div className="w-8 h-8 rounded-xl border border-white/10 bg-transparent flex items-center justify-center flex-shrink-0">
                                                <Icon icon="solar:info-circle-bold-duotone" className="w-5 h-5 text-orange-500" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-white mb-1.5 text-sm text-orange-400">Avertissement</h4>
                                                <p className="text-xs text-gray-400 leading-relaxed">
                                                    Soumettre une demande d'ajout ne garantit pas obligatoirement sa mise en ligne. Certains contenus peuvent être introuvables ou temporairement indisponibles. En cas d'incapacité d'ajout, vous recevrez automatiquement une notification avec les détails de la situation.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-4">
                                        <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
                                            <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center flex-shrink-0">
                                                <CheckCircle size={16} />
                                            </div>
                                            <p className="text-sm font-semibold text-green-400">Mise en ligne rapide, en moins de 24h !</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Modal/Overlay */}
            <AnimatePresence>
                {showSuccessMessage && (
                    <div className="fixed inset-0 z-[1001] flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/90 backdrop-blur-md"
                            onClick={() => setShowSuccessMessage(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-[#08090e] border border-white/10 rounded-3xl p-8 max-w-sm w-full relative z-10 text-center shadow-2xl"
                        >
                            <div className="mx-auto mb-5 w-16 h-16 flex items-center justify-center">
                                <Icon icon="solar:verified-check-bold" className="w-16 h-16 text-green-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">Demande envoyée !</h3>
                            <p className="text-gray-400 mb-8 text-sm leading-relaxed px-2">
                                Votre demande a bien été reçue. Vous recevrez une notification dès que le contenu sera disponible sur la plateforme.
                            </p>
                            <button
                                onClick={() => setShowSuccessMessage(false)}
                                className="w-full py-3 bg-white text-black font-bold text-sm rounded-xl hover:bg-gray-200 transition-colors shadow-lg"
                            >
                                Fermer
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
