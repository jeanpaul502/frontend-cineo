'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';

import { APP_NAME } from '../../services/config';
import { authService } from '../../services/auth.service';
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
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const searchButtonRef = useRef<HTMLButtonElement>(null);

    // Notification state
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const notificationContainerRef = useRef<HTMLDivElement>(null);
    const notificationButtonRef = useRef<HTMLDivElement>(null);
    const communityMenuRef = useRef<HTMLLIElement>(null);
    const [notifications, setNotifications] = useState([
        {
            id: '1',
            title: 'Inception',
            image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1925&auto=format&fit=crop',
            message: 'Est désormais Disponible',
            time: 'Il y a 15 minutes',
            read: false,
            group: "Aujourd'hui",
            status: 'Nouveau',
            statusColor: 'text-green-400'
        },
        {
            id: '2',
            title: 'Interstellar',
            image: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=2013&auto=format&fit=crop',
            message: 'Est désormais Disponible',
            time: 'Il y a 2 heures',
            read: true,
            group: "Aujourd'hui",
            status: 'Recommandé',
            statusColor: 'text-blue-400'
        },
        {
            id: '3',
            title: 'Dune: Part Two',
            image: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?q=80&w=1976&auto=format&fit=crop',
            message: 'Est désormais Disponible',
            time: 'Hier',
            read: true,
            group: 'Hier',
            status: 'Expire',
            statusColor: 'text-red-400'
        }
    ]);

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
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
    }, [isSearchOpen]);

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
                <div className="flex items-center gap-3 cursor-pointer">
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
                                        <a href="#" className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-all group/item">
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
                                        <a href="#" className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-all group/item">
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
                                        <a href="#" className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-all group/item">
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
                                        <a href="#" className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-all group/item">
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
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                <g fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <circle cx="11.5" cy="11.5" r="9.5" />
                                    <path strokeLinecap="round" d="M18.5 18.5L22 22" />
                                </g>
                            </svg>
                        </button>
                    </div>

                    {/* Notification Icon with Badge (number) - Next to User */}
                    <div
                        ref={notificationButtonRef}
                        className="hidden md:block relative cursor-pointer group"
                        onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={`transition-colors ${isNotificationOpen ? 'text-blue-500' : 'hover:text-blue-400'}`}>
                            <g fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M18.75 9.71v-.705C18.75 5.136 15.726 2 12 2S5.25 5.136 5.25 9.005v.705a4.4 4.4 0 0 1-.692 2.375L3.45 13.81c-1.011 1.575-.239 3.716 1.52 4.214a25.8 25.8 0 0 0 14.06 0c1.759-.498 2.531-2.639 1.52-4.213l-1.108-1.725a4.4 4.4 0 0 1-.693-2.375Z" />
                                <path strokeLinecap="round" d="M7.5 19c.655 1.748 2.422 3 4.5 3s3.845-1.252 4.5-3" />
                            </g>
                        </svg>
                        {notifications.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                                {notifications.length}
                            </span>
                        )}

                        {/* Notification Panel */}
                        {isNotificationOpen && (
                            <div
                                ref={notificationContainerRef}
                                className="absolute top-full right-0 mt-4 w-80 sm:w-96 bg-black/100 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200 cursor-default"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                                    <h3 className="text-white font-semibold">Notifications</h3>
                                    {notifications.length > 0 && (
                                        <div className="flex gap-6">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAllAsRead();
                                                }}
                                                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M18 6 7 17l-5-5" />
                                                    <path d="m22 10-7.5 7.5L13 16" />
                                                </svg>
                                                Tout lu
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setNotifications([]);
                                                }}
                                                className="text-xs text-gray-400 hover:text-white transition-colors"
                                            >
                                                Tout effacer
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="max-h-[400px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-600">
                                    {notifications.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-4">
                                            <div>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" className="text-gray-500">
                                                    <g fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <path d="M18.75 9.71v-.705C18.75 5.136 15.726 2 12 2S5.25 5.136 5.25 9.005v.705a4.4 4.4 0 0 1-.692 2.375L3.45 13.81c-1.011 1.575-.239 3.716 1.52 4.214a25.8 25.8 0 0 0 14.06 0c1.759-.498 2.531-2.639 1.52-4.213l-1.108-1.725a4.4 4.4 0 0 1-.693-2.375Z" />
                                                        <path strokeLinecap="round" d="M7.5 19c.655 1.748 2.422 3 4.5 3s3.845-1.252 4.5-3" />
                                                    </g>
                                                </svg>
                                            </div>
                                            <p className="text-sm font-medium">Aucune notification</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            {notifications.map((notification) => (
                                                <div key={notification.id} className="relative flex items-center gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group/item cursor-pointer">
                                                    {/* Movie Poster (Real Image) */}
                                                    <img
                                                        src={notification.image}
                                                        alt={notification.title}
                                                        className="w-16 h-24 rounded-lg object-cover shadow-lg flex-shrink-0"
                                                    />

                                                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                                        {/* Title Row */}
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-white font-medium text-sm truncate">{notification.title}</h4>
                                                            {!notification.read && (
                                                                <div className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0"></div>
                                                            )}
                                                        </div>

                                                        {/* Message + Delete Button Row */}
                                                        <div className="flex items-center justify-between w-full">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-gray-400 text-xs">{notification.message}</p>
                                                                {notification.status && (
                                                                    <span className={`text-[10px] font-bold ${notification.statusColor}`}>
                                                                        {notification.status}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Delete Button - Aligned with message/status line */}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    deleteNotification(notification.id);
                                                                }}
                                                                className="text-gray-500 hover:text-red-500 transition-colors p-1.5 opacity-0 group-hover/item:opacity-100 focus:opacity-100"
                                                                title="Supprimer"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M3 6h18"></path>
                                                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                                                </svg>
                                                            </button>
                                                        </div>

                                                        {/* Time Row */}
                                                        <p className="text-gray-600 text-[10px]">{notification.time}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
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

                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="text-gray-400 group-hover:text-white transition-colors">
                                            <g fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <circle cx="12" cy="12" r="3" />
                                                <path d="M13.765 2.152C13.398 2 12.932 2 12 2s-1.398 0-1.765.152a2 2 0 0 0-1.083 1.083c-.092.223-.129.484-.143.863a1.62 1.62 0 0 1-.79 1.353a1.62 1.62 0 0 1-1.567.008c-.336-.178-.579-.276-.82-.308a2 2 0 0 0-1.478.396C4.04 5.79 3.806 6.193 3.34 7s-.7 1.21-.751 1.605a2 2 0 0 0 .396 1.479c.148.192.355.353.676.555c.473.297.777.803.777 1.361s-.304 1.064-.777 1.36c-.321.203-.529.364-.676.556a2 2 0 0 0 .396 1.479c.052.394.285.798.75 1.605c.467.807.7 1.21 1.015 1.453a2 2 0 0 0 1.479.396c.24-.032.483-.13.819-.308a1.62 1.62 0 0 1 1.567.008c.483.28.77.795.79 1.353c.014.38.05.64.143.863a2 2 0 0 0 1.083 1.083C10.602 22 11.068 22 12 22s1.398 0 1.765-.152a2 2 0 0 0 1.083-1.083c.092-.223.129-.483.143-.863c.02-.558.307-1.074.79-1.353a1.62 1.62 0 0 1 1.567-.008c.336.178.579.276.819.308a2 2 0 0 0 1.479-.396c.315-.242.548-.646 1.014-1.453s.7-1.21.751-1.605a2 2 0 0 0-.396-1.479c-.148-.192-.355-.353-.676-.555A1.62 1.62 0 0 1 19.562 12c0-.558.304-1.064.777-1.36c.321-.203.529-.364.676-.556a2 2 0 0 0 .396-1.479c-.052-.394-.285-.798-.75-1.605c-.467-.807-.7-1.21-1.015-1.453a2 2 0 0 0-1.479-.396c-.24.032-.483.13-.82.308a1.62 1.62 0 0 1-1.566-.008a1.62 1.62 0 0 1-.79-1.353c-.014-.38-.05-.64-.143-.863a2 2 0 0 0-1.083-1.083Z" />
                                            </g>
                                        </svg>
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

                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="text-gray-400 group-hover:text-white transition-colors">
                                                <g fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                                    <path d="M12 8v4" />
                                                    <path d="M12 16h.01" />
                                                </g>
                                            </svg>
                                            <span className="text-white font-medium">Administration</span>
                                        </button>
                                    )}

                                    <button
                                        onClick={handleLogout}
                                        className="group relative mx-2 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-all cursor-pointer"
                                    >
                                        {/* Hover Indicator Line */}
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-red-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-all shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>

                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="text-red-400 group-hover:text-red-300 transition-colors">
                                            <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5">
                                                <path d="M9.002 7c.012-2.175.109-3.353.877-4.121C10.758 2 12.172 2 15 2h1c2.829 0 4.243 0 5.122.879C22 3.757 22 5.172 22 8v8c0 2.828 0 4.243-.878 5.121C20.242 22 18.829 22 16 22h-1c-2.828 0-4.242 0-5.121-.879c-.768-.768-.865-1.946-.877-4.121" />
                                                <path strokeLinejoin="round" d="M15 12H2m0 0l3.5-3M2 12l3.5 3" />
                                            </g>
                                        </svg>
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
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="text-gray-400">
                                <g fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <circle cx="11.5" cy="11.5" r="9.5" />
                                    <path strokeLinecap="round" d="M18.5 18.5L22 22" />
                                </g>
                            </svg>
                        </div>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Rechercher films, TV..."
                            className="block w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/10 transition-all text-base"
                            autoFocus
                        />
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                            <button
                                onClick={() => setIsSearchOpen(false)}
                                className="p-1 bg-white/10 rounded-lg text-white transition-colors"
                            >
                                <span className="text-xs font-medium px-2">ESC</span>
                            </button>
                        </div>
                    </div>
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
