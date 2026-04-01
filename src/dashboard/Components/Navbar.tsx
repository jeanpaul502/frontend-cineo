'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';

import { APP_NAME, API_BASE_URL } from '../../services/config';
import { authService } from '../../services/auth.service';
import { moviesService, Movie } from '../../services/movies.service';
import { useRouter, usePathname } from 'next/navigation';
import { showSuccessToast, showErrorToast } from '../../lib/toast';

interface UserData {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    profilePicture?: string;
    emailVerified: boolean;
    createdAt: string;
    role: string;
}

export const Navbar = () => {
    const router = useRouter();
    const pathname = usePathname();
    const [activeTab, setActiveTab] = useState("Home");
    const [communityLinks, setCommunityLinks] = useState({
        whatsappUrl: '',
        telegramUrl: '',
        discordUrl: '',
        redditUrl: '',
    });

    const handleLogoClick = () => {
        const isLoggedIn =
            typeof document !== 'undefined' &&
            document.cookie.includes('cineo_session_token=');
        router.push(isLoggedIn ? '/dashboard' : '/');
    };

    useEffect(() => {
        if (pathname === '/dashboard') setActiveTab('Home');
        else if (pathname === '/dashboard/movies') setActiveTab('Films');
        else if (pathname === '/dashboard/series') setActiveTab('Séries');
        else if (pathname === '/dashboard/channels') setActiveTab('Chaines TV');
        else if (pathname === '/dashboard/my-list') setActiveTab('Ma Liste');
    }, [pathname]);
    const [isCommunityOpen, setIsCommunityOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Movie[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [allMovies, setAllMovies] = useState<Movie[]>([]);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const searchButtonRef = useRef<HTMLButtonElement>(null);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Notification state
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const notificationContainerRef = useRef<HTMLDivElement>(null);
    const notificationButtonRef = useRef<HTMLDivElement>(null);
    const communityMenuRef = useRef<HTMLLIElement>(null);
    const [notifications, setNotifications] = useState<any[]>([]);

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    useEffect(() => {
        let isMounted = true;
        const loadCommunityLinks = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/auth/community-links`, { method: 'GET' });
                if (!res.ok) return;
                const data = await res.json().catch(() => null);
                if (!isMounted || !data) return;
                setCommunityLinks({
                    whatsappUrl: String(data.whatsappUrl || ''),
                    telegramUrl: String(data.telegramUrl || ''),
                    discordUrl: String(data.discordUrl || ''),
                    redditUrl: String(data.redditUrl || ''),
                });
            } catch {}
        };
        loadCommunityLinks();
        return () => {
            isMounted = false;
        };
    }, []);

    const handleCommunityLinkClick = (e: React.MouseEvent, url: string) => {
        if (!url) {
            e.preventDefault();
            return;
        }
        setIsCommunityOpen(false);
    };

    const handleNavigation = (item: string) => {
        setActiveTab(item);
        switch (item) {
            case 'Home':
                router.push('/dashboard');
                break;
            case 'Films':
                router.push('/dashboard/movies');
                break;
            case 'Séries':
                router.push('/dashboard/series');
                break;
            case 'Chaines TV':
                router.push('/dashboard/channels');
                break;
            case 'Ma Liste':
                router.push('/dashboard/my-list');
                break;
            default:
                break;
        }
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    // Group notifications helper
    const groupedNotifications = notifications.reduce((acc, notification) => {
        const group = notification.group;
        if (!acc[group]) {
            acc[group] = [];
        }
        acc[group].push(notification);
        return acc;
    }, {} as Record<string, typeof notifications>);

    // Handle ESC key to close search
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsSearchOpen(false);
                setSearchQuery('');
                setSearchResults([]);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    // Focus input when search opens
    useEffect(() => {
        if (isSearchOpen && searchInputRef.current) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
        }
        if (!isSearchOpen) {
            setSearchQuery('');
            setSearchResults([]);
        }
    }, [isSearchOpen]);

    // Preload all movies for local search
    useEffect(() => {
        moviesService.getAllMovies()
            .then(movies => setAllMovies(movies.filter(m => m.status === 'active')))
            .catch(() => {});
    }, []);

    // Debounced local search
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

        if (pathname === '/dashboard/movies') {
            router.replace(`/dashboard/movies${query ? '?q=' + encodeURIComponent(query) : ''}`);
            return;
        }

        if (!query.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        searchDebounceRef.current = setTimeout(() => {
            const q = query.toLowerCase().trim();
            const results = allMovies.filter(movie =>
                movie.title.toLowerCase().includes(q) ||
                (Array.isArray(movie.genres) ? movie.genres : (typeof movie.genres === 'string' ? movie.genres.split(',') : []))
                    .some(g => String(g).toLowerCase().includes(q)) ||
                (movie.director || '').toLowerCase().includes(q)
            ).slice(0, 20);
            setSearchResults(results);
            setIsSearching(false);
        }, 300);
    }, [allMovies]);

    // Fetch user data
    useEffect(() => {
        const fetchUserData = async () => {
            // 1. Load from cache first for immediate display
            const cachedData = localStorage.getItem('netfix_user_data');
            if (cachedData) {
                try {
                    const parsed = JSON.parse(cachedData);
                    setUserData(parsed);
                    setIsLoading(false);
                } catch (e) {
                    console.error('Error parsing cached data', e);
                    localStorage.removeItem('netfix_user_data');
                }
            }

            // 2. Always fetch fresh data from API
            try {
                const data = await authService.getCurrentUser();

                const user = data.user || data;
                if (user && (user.id || user.email)) {
                    setUserData(user);
                    localStorage.setItem('netfix_user_data', JSON.stringify(user));
                } else {
                    console.error('Failed to fetch user data: No user object in response');
                }
            } catch (error: any) {
                console.error('Error fetching user data:', error);
                
                // If 401 Unauthorized, token is invalid/expired
                if (error.status === 401 || error.code === 'UNAUTHORIZED') {
                    console.log('Session expired, redirecting to login...');
                    localStorage.removeItem('netfix_user_data');
                    await authService.logout();
                    
                    if (error.message && (error.message.includes('bloqué') || error.message.includes('blocked'))) {
                        showErrorToast('Compte bloqué', 'Votre compte a été bloqué. Veuillez contacter le support.');
                    }
                    
                    router.push('/login');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, []);

    useEffect(() => {
        if (!userData?.id) return;
        
        // Socket removed
    }, [userData?.id]);

    // Close menu or search when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Close user menu
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
            // Close search bar
            if (
                isSearchOpen &&
                searchContainerRef.current &&
                !searchContainerRef.current.contains(event.target as Node) &&
                searchButtonRef.current &&
                !searchButtonRef.current.contains(event.target as Node)
            ) {
                setIsSearchOpen(false);
            }

            // Close notifications
            if (
                isNotificationOpen &&
                notificationContainerRef.current &&
                !notificationContainerRef.current.contains(event.target as Node) &&
                notificationButtonRef.current &&
                !notificationButtonRef.current.contains(event.target as Node)
            ) {
                setIsNotificationOpen(false);
            }

            // Close community menu
            if (isCommunityOpen && communityMenuRef.current && !communityMenuRef.current.contains(event.target as Node)) {
                setIsCommunityOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isSearchOpen, isNotificationOpen, isCommunityOpen]);

    // Logout handler
    const handleLogout = async () => {
        try {
            // Clear cache immediately
            localStorage.removeItem('netfix_user_data');

            await authService.logout();

            showSuccessToast('Déconnexion réussie', 'À bientôt !');
            setTimeout(() => {
                router.push('/login');
                router.refresh();
            }, 1000);
        } catch (error) {
            showErrorToast('Erreur', 'Une erreur est survenue lors de la déconnexion');
        }
    };

    const displayName = userData?.firstName && userData?.lastName
        ? `${userData.firstName} ${userData.lastName}`
        : userData?.email || 'Utilisateur';

    return (
        <>
        <nav className="fixed top-0 z-50 w-full bg-black/90 backdrop-blur-lg border-b border-white/10 shadow-lg">
            <div className="flex items-center justify-between px-4 py-4 md:px-16 lg:px-24 relative">
                {/* Left: Logo + App Name */}
                <div className="flex items-center gap-3 cursor-pointer" onClick={handleLogoClick}>
                    <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L20.5 6.5V17.5L12 22L3.5 17.5V6.5L12 2Z" fill="white" fillOpacity="0.9" />
                            <path d="M12 7L16.5 9.5V14.5L12 17L7.5 14.5V9.5L12 7Z" fill="#2563EB" />
                        </svg>
                    </div>
                    <span className="font-semibold text-lg text-white">{APP_NAME}</span>
                </div>

                {/* Center: Navigation Menu */}
                <ul className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-bold text-gray-300 absolute left-1/2 -translate-x-1/2">
                    {["Home", "Films", "Chaines TV", "Ma Liste"].map((item) => (
                        <li
                            key={item}
                            onClick={() => handleNavigation(item)}
                            className={`relative cursor-pointer transition-colors ${activeTab === item ? "text-white" : "hover:text-white"}`}
                        >
                            {item}
                            {activeTab === item && (
                                <motion.div
                                    layoutId="activeTab"
                                    layout
                                    className="absolute -bottom-[21px] left-0 right-0 h-[3px] bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.6)] rounded-t-full"
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                            )}
                        </li>
                    ))}

                    {/* Vertical Separator */}
                    <li className="h-4 w-px bg-white/20"></li>

                    {/* Communauté Dropdown */}
                    <li
                        ref={communityMenuRef}
                        className="relative group h-full flex items-center"
                    >
                        <button
                            onClick={() => setIsCommunityOpen(!isCommunityOpen)}
                            className={`flex items-center gap-1.5 transition-colors cursor-pointer ${isCommunityOpen ? "text-white" : "hover:text-white"}`}
                        >
                            <span>Communauté</span>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                className={`transition-transform duration-300 ${isCommunityOpen ? "rotate-180" : ""}`}
                            >
                                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 9l6 6l6-6" />
                            </svg>
                        </button>

                        {/* Dropdown Menu with Bridge */}
                        {isCommunityOpen && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-6 w-[780px] z-50">
                                <div className="bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6">

                                    {/* Header Section */}
                                    <div className="pb-4 mb-4 border-b border-white/10">
                                        <span className="text-[14px] font-semibold text-gray-400 pl-2">Retrouvez tous nos canaux de discussion</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                        {/* WhatsApp */}
                                        <a
                                            href={communityLinks.whatsappUrl || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => handleCommunityLinkClick(e, communityLinks.whatsappUrl)}
                                            className={`flex items-start gap-4 p-3 rounded-xl transition-all group/item ${communityLinks.whatsappUrl ? 'hover:bg-white/5' : 'opacity-60 cursor-not-allowed'}`}
                                        >
                                            <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 transition-colors group-hover/item:bg-white/10 group-hover/item:border-white/20">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="text-[#25D366] fill-current">
                                                    <path d="M19.001 4.908A9.817 9.817 0 0 0 11.992 2C6.534 2 2.085 6.448 2.08 11.908c0 1.748.458 3.45 1.321 4.956L2 22l5.255-1.377a9.816 9.816 0 0 0 4.737 1.206h.005c5.46 0 9.91-4.448 9.915-9.913a9.82 9.82 0 0 0-2.906-7.008zm-7.009 14.862h-.005a8.13 8.13 0 0 1-4.146-1.135l-.297-.176-3.092.811.825-3.014-.193-.307A8.14 8.14 0 0 1 3.758 11.91c.004-4.509 3.673-8.177 8.187-8.177 2.186 0 4.242.85 5.792 2.398a8.148 8.148 0 0 1 2.394 5.787c-.005 4.512-3.676 8.181-8.193 8.181zm4.493-6.138c-.246-.123-1.458-.72-1.684-.802-.225-.082-.39-.123-.554.123-.164.246-.636.802-.78.966-.145.165-.288.185-.533.062-.246-.123-1.039-.383-1.98-1.221-.734-.652-1.229-1.458-1.373-1.705-.144-.246-.015-.38.108-.501.11-.11.246-.287.369-.431.123-.143.164-.246.246-.41.082-.164.041-.308-.02-.41-.062-.103-.554-1.334-.76-1.827-.2-.486-.402-.419-.554-.426l-.472-.007c-.164 0-.43.061-.656.307-.225.246-.86.842-.86 2.053 0 1.211.881 2.382 1.005 2.546.123.164 1.733 2.647 4.199 3.712.586.254 1.044.406 1.4.52.597.192 1.14.165 1.572.1.481-.072 1.458-.596 1.664-1.171.205-.575.205-1.066.143-1.171-.061-.104-.225-.164-.471-.287z" />
                                                </svg>
                                            </div>
                                            <div className="flex flex-col pt-0.5">
                                                <span className="text-white font-bold text-sm group-hover/item:text-[#25D366] transition-colors">Groupe WhatsApp</span>
                                                <span className="text-xs text-gray-500 mt-1 leading-relaxed">Rejoignez la discussion et les actus en direct.</span>
                                            </div>
                                        </a>

                                        {/* Telegram */}
                                        <a
                                            href={communityLinks.telegramUrl || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => handleCommunityLinkClick(e, communityLinks.telegramUrl)}
                                            className={`flex items-start gap-4 p-3 rounded-xl transition-all group/item ${communityLinks.telegramUrl ? 'hover:bg-white/5' : 'opacity-60 cursor-not-allowed'}`}
                                        >
                                            <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 transition-colors group-hover/item:bg-white/10 group-hover/item:border-white/20">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="text-[#229ED9] fill-current">
                                                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                                </svg>
                                            </div>
                                            <div className="flex flex-col pt-0.5">
                                                <span className="text-white font-bold text-sm group-hover/item:text-[#229ED9] transition-colors">Canal Telegram</span>
                                                <span className="text-xs text-gray-500 mt-1 leading-relaxed">Ne manquez aucune sortie et contenu bonus.</span>
                                            </div>
                                        </a>

                                        {/* Discord */}
                                        <a
                                            href={communityLinks.discordUrl || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => handleCommunityLinkClick(e, communityLinks.discordUrl)}
                                            className={`flex items-start gap-4 p-3 rounded-xl transition-all group/item ${communityLinks.discordUrl ? 'hover:bg-white/5' : 'opacity-60 cursor-not-allowed'}`}
                                        >
                                            <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 transition-colors group-hover/item:bg-white/10 group-hover/item:border-white/20">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="text-[#5865F2] fill-current">
                                                    <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0 12.61 12.61 0 0 0-.54-1.09.08.08 0 0 0-.07-.03A16.15 16.15 0 0 0 4.73 5.33a.06.06 0 0 0-.03.05c-2.7 4.01-3.44 7.91-3.07 11.75a.08.08 0 0 0 .04.05C3.37 18.49 5 19.38 6.57 19.85c.06.02.13 0 .16-.06l.75-1.04a.05.05 0 0 0-.02-.07 11.4 11.4 0 0 1-1.63-.78.06.06 0 0 1 .01-.1c.12-.08.24-.17.35-.25a.05.05 0 0 1 .06 0c3.48 1.59 7.24 1.59 10.7 0a.05.05 0 0 1 .06 0c.11.09.23.17.35.26.04.03.05.08.01.1a11.23 11.23 0 0 1-1.63.78.05.05 0 0 0-.02.07l.75 1.04c.04.05.1.07.16.05 1.57-.47 3.2-1.35 4.87-2.67a.08.08 0 0 0 .04-.05c.44-4.52-.72-8.49-3.73-11.75a.06.06 0 0 0-.03-.05zM8.5 14.5c-1.08 0-1.96-.99-1.96-2.21S7.4 10.08 8.5 10.08c1.1 0 1.97.99 1.96 2.21 0 1.22-.88 2.21-1.96 2.21zm7 0c-1.08 0-1.96-.99-1.96-2.21S14.4 10.08 15.5 10.08c1.1 0 1.97.99 1.96 2.21 0 1.22-.88 2.21-1.96 2.21z" />
                                                </svg>
                                            </div>
                                            <div className="flex flex-col pt-0.5">
                                                <span className="text-white font-bold text-sm group-hover/item:text-[#5865F2] transition-colors">Serveur Discord</span>
                                                <span className="text-xs text-gray-500 mt-1 leading-relaxed">Salons vocaux, jeux et watch-parties.</span>
                                            </div>
                                        </a>

                                        {/* Reddit */}
                                        <a
                                            href={communityLinks.redditUrl || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => handleCommunityLinkClick(e, communityLinks.redditUrl)}
                                            className={`flex items-start gap-4 p-3 rounded-xl transition-all group/item ${communityLinks.redditUrl ? 'hover:bg-white/5' : 'opacity-60 cursor-not-allowed'}`}
                                        >
                                            <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 transition-colors group-hover/item:bg-white/10 group-hover/item:border-white/20">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="text-[#FF4500] fill-current">
                                                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                                                </svg>
                                            </div>
                                            <div className="flex flex-col pt-0.5">
                                                <span className="text-white font-bold text-sm group-hover/item:text-[#FF4500] transition-colors">Page Reddit</span>
                                                <span className="text-xs text-gray-500 mt-1 leading-relaxed">Partagez vos avis et théories avec tous.</span>
                                            </div>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )}
                    </li>
                </ul>

                {/* Right: User Icons */}
                <div className="flex items-center gap-6 text-white">
                    {/* Search Icon */}
                    <div className="hidden md:block relative group">
                        <button
                            ref={searchButtonRef}
                            onClick={() => setIsSearchOpen(!isSearchOpen)}
                            className={`cursor-pointer hover:text-blue-400 transition-colors focus:outline-none ${isSearchOpen ? 'text-blue-500' : ''}`}
                        >
                            <Icon icon="solar:magnifer-linear" width="24" height="24" />
                        </button>
                    </div>

                    {/* Notification Icon with Badge (number) - Next to User */}
                    <div
                        ref={notificationButtonRef}
                        className="hidden md:block relative cursor-pointer group"
                        onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    >
                        <Icon icon="solar:bell-linear" width="24" height="24" className={`transition-colors ${isNotificationOpen ? 'text-blue-500' : 'hover:text-blue-400'}`} />

                        {/* Notification Panel */}
                        {isNotificationOpen && (
                            <div
                                ref={notificationContainerRef}
                                className="absolute top-full right-0 mt-4 w-80 sm:w-96 bg-black/100 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200 cursor-default"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                                    <h3 className="text-white font-semibold">Notifications</h3>
                                </div>

                                <div className="max-h-[400px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-600">
                                    <div className="flex flex-col items-center justify-center py-14 text-gray-500 gap-4">
                                        <Icon icon="solar:bell-off-linear" width="44" height="44" className="text-gray-600" />
                                        <p className="text-sm font-medium text-gray-400 text-center px-6">Aucune notification disponible pour le moment</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Avatar with Dropdown */}
                    <div className="relative" ref={userMenuRef}>
                        <div
                            className="flex items-center gap-3 cursor-pointer group p-1.5 rounded-xl hover:bg-white/5 transition-all"
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        >
                            <div className="h-9 w-9 overflow-hidden rounded-full border-2 border-transparent group-hover:border-blue-500 transition-all">
                                <img 
                                    src={userData?.profilePicture || "/images/splash.png"} 
                                    alt="User" 
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                className={`text-gray-400 group-hover:text-white transition-all ${isUserMenuOpen ? 'rotate-180' : ''}`}
                            >
                                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m19 9l-7 6l-7-6" />
                            </svg>
                        </div>

                        {/*  Dropdown Menu */}

                        {isUserMenuOpen && (
                            <div className="absolute right-0 mt-3 w-72 bg-black border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
                                {/* User Info */}
                                <div className="p-4 border-b border-white/10 bg-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-blue-500">
                                            <img 
                                                src={userData?.profilePicture || "/images/splash.png"} 
                                                alt="User" 
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                        <div>
                                            {isLoading ? (
                                                <p className="text-sm text-gray-400">Chargement...</p>
                                            ) : (
                                                <>
                                                    <p className="font-bold text-white">{displayName}</p>
                                                    <p className="text-xs text-gray-400">{userData?.email}</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Request Section */}
                                <div className="p-3 border-b border-white/10 bg-white/5">
                                    <button
                                        onClick={() => {
                                            router.push('/dashboard/requests');
                                            setIsUserMenuOpen(false);
                                        }}
                                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-3 py-2 rounded-lg transition-all cursor-pointer shadow-lg shadow-blue-900/20 hover:shadow-blue-600/40 active:scale-95 flex items-center justify-center gap-2 text-sm"
                                    >
                                        <Icon icon="solar:add-circle-linear" width="18" height="18" />
                                        <span>Faire une demande</span>
                                    </button>
                                </div>

                                {/* Menu Items */}
                                <div className="py-2 flex flex-col gap-1">

                                    <button 
                                        onClick={() => router.push('/dashboard/settings')}
                                        className="group relative mx-2 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                                    >
                                        {/* Hover Indicator Line */}
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-blue-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-all shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>

                                        <Icon icon="solar:settings-linear" width="20" height="20" className="text-gray-400 group-hover:text-white transition-colors" />
                                        <span className="text-white font-medium">Paramètres</span>
                                    </button>

                                    <div className="h-px bg-white/5 mx-4 my-1"></div>

                                    {userData?.role === 'admin' && (
                                        <button
                                            onClick={() => router.push('/admin/dashboard')}
                                            className="group relative mx-2 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                                        >
                                            {/* Hover Indicator Line */}
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-red-600 rounded-r-full opacity-0 group-hover:opacity-100 transition-all shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>

                                            <Icon icon="solar:shield-user-linear" width="20" height="20" className="text-gray-400 group-hover:text-white transition-colors" />
                                            <span className="text-white font-medium">Administration</span>
                                        </button>
                                    )}

                                    <button
                                        onClick={handleLogout}
                                        className="group relative mx-2 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-all cursor-pointer"
                                    >
                                        {/* Hover Indicator Line */}
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-red-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-all shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>

                                        <Icon icon="solar:logout-2-linear" width="20" height="20" className="text-red-400 group-hover:text-red-300 transition-colors" />
                                        <span className="text-red-400 font-medium">Déconnexion</span>
                                    </button>
                                </div>
                            </div>

                        )}
                    </div>
                </div>
            </div>

            {/* Search Bar Dropdown */}
            {isSearchOpen && (
                <div
                    ref={searchContainerRef}
                    className="absolute top-[calc(100%+1rem)] left-1/2 -translate-x-1/2 w-[95%] max-w-2xl bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl animate-in slide-in-from-top-2 duration-200 p-6"
                >
                    <div className="relative w-full">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            {isSearching ? (
                                <Icon icon="svg-spinners:ring-resize" width="20" height="20" className="text-blue-400" />
                            ) : (
                                <Icon icon="solar:magnifer-linear" width="20" height="20" className="text-gray-400" />
                            )}
                        </div>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="Rechercher un film, une série, un genre..."
                            className="block w-full pl-12 pr-20 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/10 transition-all text-base"
                            autoFocus
                        />
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center gap-2">
                            {searchQuery && (
                                <button
                                    onClick={() => { setSearchQuery(''); setSearchResults([]); searchInputRef.current?.focus(); }}
                                    className="text-gray-500 hover:text-white transition-colors"
                                    title="Effacer"
                                >
                                    <Icon icon="solar:close-circle-linear" width="16" height="16" />
                                </button>
                            )}
                            <button
                                onClick={() => { setIsSearchOpen(false); setSearchQuery(''); setSearchResults([]); }}
                                className="p-1 bg-white/10 rounded-lg text-white transition-colors"
                            >
                                <span className="text-xs font-medium px-2">ESC</span>
                            </button>
                        </div>
                    </div>

                    {/* Search Results */}
                    {searchQuery.trim() && pathname !== '/dashboard/movies' && (
                        <div className="mt-4">
                            {searchResults.length === 0 && !isSearching ? (
                                <div className="flex flex-col items-center justify-center py-8 text-gray-500 gap-3">
                                    <Icon icon="solar:magnifer-linear" width="36" height="36" className="text-gray-600" />
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-gray-400">Aucun résultat pour <span className="text-white">"{searchQuery}"</span></p>
                                        <p className="text-xs text-gray-600 mt-1">Essayez un autre titre, genre ou réalisateur</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p className="text-xs text-gray-500 mb-3 font-medium">{searchResults.length} résultat{searchResults.length > 1 ? 's' : ''} pour <span className="text-gray-300">"{searchQuery}"</span></p>
                                    <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full pr-1">
                                        {searchResults.map(movie => (
                                            <div
                                                key={movie.id}
                                                onClick={() => {
                                                    if (pathname === '/dashboard') {
                                                        window.dispatchEvent(new CustomEvent('open-movie-details', { detail: movie }));
                                                    } else {
                                                        router.push(`/dashboard?movie=${movie.id}`);
                                                    }
                                                    setIsSearchOpen(false);
                                                    setSearchQuery('');
                                                    setSearchResults([]);
                                                }}
                                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/8 bg-white/3 border border-white/5 hover:border-white/15 transition-all cursor-pointer group"
                                            >
                                                {/* Poster */}
                                                <div className="flex-shrink-0 w-12 h-16 rounded-lg overflow-hidden bg-white/5">
                                                    {movie.poster ? (
                                                        <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600">
                                                                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
                                                                <line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
                                                                <line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/>
                                                                <line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/>
                                                                <line x1="17" y1="7" x2="22" y2="7"/>
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-semibold text-sm group-hover:text-blue-400 transition-colors truncate">{movie.title}</p>
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        {(Array.isArray(movie.genres) ? movie.genres : (typeof movie.genres === 'string' ? movie.genres.split(',').map(s => s.trim()).filter(Boolean) : []))
                                                            .slice(0, 2).map(g => (
                                                            <span key={g} className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">{g}</span>
                                                        ))}
                                                        {movie.releaseDate && (
                                                            <span className="text-[10px] text-gray-500">{new Date(movie.releaseDate).getFullYear()}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Score */}
                                                {movie.score > 0 && (
                                                    <div className="flex-shrink-0 flex items-center gap-1">
                                                        <Icon icon="solar:star-linear" width="12" height="12" className="text-yellow-400" />
                                                        <span className="text-xs text-yellow-400 font-medium">{movie.score.toFixed(1)}</span>
                                                    </div>
                                                )}
                                                {/* Arrow */}
                                                <Icon icon="solar:alt-arrow-right-linear" width="16" height="16" className="text-gray-600 group-hover:text-blue-400 flex-shrink-0 transition-colors" />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </nav>

        {/* ── Bottom Navigation for Mobile ── */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-[#000000] border-t border-white/10 shadow-[0_-5px_15px_rgba(0,0,0,0.5)] pt-2 pb-1 pb-safe">
            <div className="flex items-center justify-around h-14 px-2">
                <button 
                    onClick={() => handleNavigation('Home')}
                    className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'Home' ? 'text-white' : 'text-gray-500 hover:text-white'}`}
                >
                    <Icon icon={activeTab === 'Home' ? "solar:home-smile-angle-bold" : "solar:home-smile-angle-linear"} width="24" height="24" className={activeTab === 'Home' ? 'text-blue-500' : ''} />
                    <span className={`text-[10px] ${activeTab === 'Home' ? 'font-bold' : 'font-medium'}`}>Accueil</span>
                </button>

                <button 
                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                    className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isSearchOpen ? 'text-white' : 'text-gray-500 hover:text-white'}`}
                >
                    <Icon icon={isSearchOpen ? "solar:magnifer-bold" : "solar:magnifer-linear"} width="24" height="24" className={isSearchOpen ? 'text-blue-500' : ''} />
                    <span className={`text-[10px] ${isSearchOpen ? 'font-bold' : 'font-medium'}`}>Recherche</span>
                </button>

                <button 
                    onClick={() => handleNavigation('Films')}
                    className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'Films' ? 'text-white' : 'text-gray-500 hover:text-white'}`}
                >
                    <Icon icon={activeTab === 'Films' ? "solar:clapperboard-play-bold" : "solar:clapperboard-play-linear"} width="24" height="24" className={activeTab === 'Films' ? 'text-blue-500' : ''} />
                    <span className={`text-[10px] ${activeTab === 'Films' ? 'font-bold' : 'font-medium'}`}>Films</span>
                </button>
                <button 
                    onClick={() => handleNavigation('Chaines TV')}
                    className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'Chaines TV' ? 'text-white' : 'text-gray-500 hover:text-white'}`}
                >
                    <Icon icon={activeTab === 'Chaines TV' ? "solar:tv-bold" : "solar:tv-linear"} width="24" height="24" className={activeTab === 'Chaines TV' ? 'text-blue-500' : ''} />
                    <span className={`text-[10px] ${activeTab === 'Chaines TV' ? 'font-bold' : 'font-medium'}`}>TV</span>
                </button>
                <button 
                    onClick={() => handleNavigation('Ma Liste')}
                    className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'Ma Liste' ? 'text-white' : 'text-gray-500 hover:text-white'}`}
                >
                    <Icon icon={activeTab === 'Ma Liste' ? "solar:bookmark-square-minimalistic-bold" : "solar:bookmark-square-minimalistic-linear"} width="24" height="24" className={activeTab === 'Ma Liste' ? 'text-blue-500' : ''} />
                    <span className={`text-[10px] ${activeTab === 'Ma Liste' ? 'font-bold' : 'font-medium'}`}>Ma Liste</span>
                </button>
            </div>
        </div>
        </>
    );
};
