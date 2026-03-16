'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';
import { showSuccessToast, showErrorToast, showInfoToast } from '../lib/toast';
import { authService } from '../services/auth.service';
import { apiService } from '../services/api.service';

interface UserProfile {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
    notificationsEnabled: boolean;
    subscriptionType?: 'free' | 'premium' | 'vip';
    subscriptionEndDate?: string;
    memberSince?: string;
    emailVerified?: boolean;
    createdAt?: string;
    emailNotifications?: boolean;
    whatsappPhone?: string;
    telegramChatId?: string;
    telegramUsername?: string;
}

interface Session {
    id: string;
    device: string;
    deviceType: string;
    browser: string;
    os: string;
    ipAddress: string;
    city: string;
    country: string;
    location: string;
    lastActiveAt: string;
    isCurrent: boolean;
    isOnline: boolean;
}

type TabType = 'account' | 'profile' | 'notifications' | 'security' | 'sessions';

export default function Settings() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('account');
    const [sessions, setSessions] = useState<Session[]>([]);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);

    const [profile, setProfile] = useState<UserProfile>({
        firstName: '',
        lastName: '',
        email: '',
        avatar: '',
        notificationsEnabled: true,
        subscriptionType: 'free',
        memberSince: undefined
    });

    useEffect(() => {
        setImageError(false);
    }, [previewImage, profile.avatar]);

    const [notificationChannels, setNotificationChannels] = useState({
        email: true,
        whatsapp: false,
        telegram: false
    });

    const [countryCodes, setCountryCodes] = useState<{ code: string; flag: string; dial: string }[]>([]);
    const [showCountryMenu, setShowCountryMenu] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState({ code: 'FR', flag: 'https://flagcdn.com/w40/fr.png', dial: '+33' });

    useEffect(() => {
        fetch('https://restcountries.com/v3.1/all?fields=cca2,idd,flags')
            .then(res => res.json())
            .then(data => {
                const formatted = data
                    .filter((c: any) => c.idd?.root)
                    .map((c: any) => ({
                        code: c.cca2,
                        flag: c.flags.png,
                        dial: c.idd.root + (c.idd.suffixes?.length === 1 ? c.idd.suffixes[0] : '')
                    }))
                    .sort((a: any, b: any) => a.code.localeCompare(b.code));
                setCountryCodes(formatted);
                const fr = formatted.find((c: any) => c.code === 'FR');
                if (fr) setSelectedCountry(fr);
            })
            .catch(err => console.error('Failed to load country codes', err));
    }, []);

    const [verificationModal, setVerificationModal] = useState<{
        type: 'whatsapp' | 'telegram' | null;
        step: 'input' | 'verify';
        value: string;
        email: string;
        code: string;
        isLoading: boolean;
    }>({ type: null, step: 'input', value: '', email: '', code: '', isLoading: false });

    const [showPassword, setShowPassword] = useState({
        current: false,
        new: false,
        confirm: false
    });

    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    const [showUpgradeMenu, setShowUpgradeMenu] = useState(false);
    const [plans, setPlans] = useState<any[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch real user data from backend
                let backendUser = null;
                try {
                    backendUser = await authService.getCurrentUser();
                } catch (err) {
                    // Silent fail for backend fetch
                }

                // Try to get data from localStorage
                const storedUser = localStorage.getItem('netfix_user_data');
                let localData: any = {};
                
                if (storedUser) {
                    try {
                        localData = JSON.parse(storedUser);
                    } catch (e) {
                        console.error('Error parsing stored user data', e);
                    }
                }

                const formatMemberSince = (dateStr?: string) => {
                    if (!dateStr) return '';
                    try {
                        const date = new Date(dateStr);
                        const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
                        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
                    } catch (e) { return ''; }
                };

                const formatSubscriptionDate = (dateStr?: string) => {
                    if (!dateStr) return '';
                    try {
                        const date = new Date(dateStr);
                        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
                        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
                    } catch (e) { return ''; }
                };

                const userData = backendUser || localData || {};

                setProfile({
                    firstName: userData.firstName || '',
                    lastName: userData.lastName || '',
                    email: userData.email || '',
                    avatar: userData.profilePicture || userData.avatar || '',
                    notificationsEnabled: userData.notificationsEnabled ?? true,
                    subscriptionType: userData.subscriptionType || 'free',
                    id: userData.id,
                    memberSince: formatMemberSince(userData.createdAt),
                    subscriptionEndDate: formatSubscriptionDate(userData.subscriptionEndDate),
                    emailVerified: userData.isVerified ?? userData.emailVerified,
                    emailNotifications: userData.emailNotifications ?? true,
                    whatsappPhone: userData.whatsappPhone || '',
                    telegramChatId: userData.telegramChatId || '',
                    telegramUsername: userData.telegramUsername || ''
                });

                setNotificationChannels(prev => ({
                    ...prev,
                    email: backendUser?.emailNotifications ?? localData?.emailNotifications ?? true,
                    whatsapp: !!(backendUser?.whatsappPhone || localData?.whatsappPhone),
                    telegram: !!(backendUser?.telegramChatId || localData?.telegramChatId)
                }));

                if (backendUser) {
                    localStorage.setItem('netfix_user_data', JSON.stringify(backendUser));
                }

            } catch (e) { console.error('Error loading profile:', e) }
        };
        loadData();
    }, []);

    const handleSave = async (retry = true) => {
        setSaving(true);
        try {
            const body: any = {};
            // Only include fields that have values to avoid sending empty strings if not intended
            if (profile.firstName !== undefined) body.firstName = profile.firstName;
            if (profile.lastName !== undefined) body.lastName = profile.lastName;
            if (profile.emailNotifications !== undefined) body.emailNotifications = profile.emailNotifications;
            body.whatsappPhone = notificationChannels.whatsapp ? (profile.whatsappPhone || '') : '';
            body.telegramChatId = notificationChannels.telegram ? (profile.telegramChatId || '') : '';
            body.telegramUsername = notificationChannels.telegram ? (profile.telegramUsername || '') : '';

            // API request
            const updatedUser = await authService.updateProfile(body);
            
            // Update local state with response
            setProfile(prev => ({
                ...prev,
                ...updatedUser,
                updatedAt: new Date().toISOString()
            }));

            // Update localStorage
            const storedUser = localStorage.getItem('netfix_user_data');
            if (storedUser) {
                try {
                    const parsed = JSON.parse(storedUser);
                    localStorage.setItem('netfix_user_data', JSON.stringify({ ...parsed, ...updatedUser }));
                } catch (e) {
                    localStorage.setItem('netfix_user_data', JSON.stringify(updatedUser));
                }
            } else {
                localStorage.setItem('netfix_user_data', JSON.stringify(updatedUser));
            }
            
            showSuccessToast('Modifications enregistrées');
        } catch (error) {
            console.error('Save error:', error);
            showErrorToast('Erreur lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (passwords.new !== passwords.confirm) {
            showErrorToast('Les mots de passe ne correspondent pas');
            return;
        }

        if (passwords.new.length < 6) {
            showErrorToast('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        try {
            await authService.changePassword(passwords.current, passwords.new);
            
            showSuccessToast('Mot de passe modifié avec succès');
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (error: any) {
            console.error('Password update error:', error);
            showErrorToast(error.message || 'Erreur lors de la mise à jour du mot de passe');
        }
    };

    const fetchSessions = async () => {
        const userId = profile.id;
        if (!userId) return;
        try {
            const sessionsData = await authService.getSessions(userId);
            // Map backend sessions to UI format if needed
            // Assuming backend returns array of sessions similar to Session interface
            setSessions(sessionsData);
        } catch (e) {
            console.error('Failed to fetch sessions', e);
            // Fallback to mock if needed, or just show empty
        }
    };

    useEffect(() => {
        if (activeTab === 'sessions') {
            fetchSessions();
        }
    }, [activeTab, profile.id]);

    const formatLastActive = (dateStr: string) => {
        const diff = new Date().getTime() - new Date(dateStr).getTime();
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return "À l'instant";
        if (minutes < 60) return `Il y a ${minutes} min`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Il y a ${hours} h`;
        
        const days = Math.floor(hours / 24);
        return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    };

    const handleRevokeSession = async (sessionId: string) => {
        const userId = profile.id;
        if (!userId) return;
        try {
            await authService.deleteSession(userId, sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            showSuccessToast('Session déconnectée');
        } catch (e) {
            showErrorToast('Erreur lors de la déconnexion de la session');
        }
    };

    const handleRevokeAllSessions = async () => {
        const userId = profile.id;
        if (!userId) return;
        try {
            const sessionsToDelete = sessions.filter(s => !s.isCurrent);
            await Promise.all(sessionsToDelete.map(s => authService.deleteSession(userId, s.id)));
            
            setSessions(prev => prev.filter(s => s.isCurrent));
            showSuccessToast('Tous les autres appareils ont été déconnectés');
        } catch (e) {
            showErrorToast('Erreur lors de la déconnexion des appareils');
        }
    };

    const tabs = [
        { id: 'account', label: 'Compte', icon: 'solar:user-circle-bold' },
        { id: 'profile', label: 'Profil', icon: 'solar:user-id-bold' },
        { id: 'notifications', label: 'Notifications', icon: 'solar:bell-bing-bold' },
        { id: 'security', label: 'Sécurité', icon: 'solar:shield-keyhole-bold' },
        { id: 'sessions', label: 'Sessions', icon: 'solar:devices-bold' },
    ];

    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleDeleteAccount = async () => {
        try {
            await authService.deleteAccount();

            setShowDeleteModal(false);
            showSuccessToast('Votre compte a été supprimé avec succès.');
            router.push('/login');
        } catch (error) {
            console.error('Delete account error:', error);
            showErrorToast('Erreur lors de la suppression du compte');
        }
    };

    const getSubscriptionDetails = () => {
        switch (profile.subscriptionType) {
            case 'vip':
                return { 
                    label: 'Abonnement VIP', 
                    status: 'Accès Illimité',
                    icon: 'solar:crown-star-bold',
                    colorClass: 'text-purple-500',
                    bgClass: 'bg-purple-500/10'
                };
            case 'premium':
                return { 
                    label: 'Premium 4K', 
                    status: profile.subscriptionEndDate ? `Actif jusqu'au ${profile.subscriptionEndDate}` : 'Date d\'expiration non définie',
                    icon: 'solar:cup-first-bold',
                    colorClass: 'text-blue-500',
                    bgClass: 'bg-blue-500/10'
                };
            default:
                return { 
                    label: 'Abonnement Gratuit', 
                    status: 'Accès limité',
                    icon: 'solar:crown-bold',
                    colorClass: 'text-yellow-500',
                    bgClass: 'bg-yellow-500/10'
                };
        }
    };

    const getDeviceDisplay = (session: Session) => {
        const os = (session.os || '').toLowerCase();
        const device = session.device || 'Appareil inconnu';
        const type = (session.deviceType || '').toLowerCase();
        
        // Desktop / Computer
        if (type === 'desktop' || os.includes('windows') || os.includes('mac') || os.includes('linux') || os.includes('ubuntu')) {
            return {
                title: `Ordinateur`,
                subtitle: session.os || 'Système inconnu',
                icon: 'solar:laptop-bold-duotone',
                iconBg: 'bg-blue-500/10',
                iconColor: 'text-blue-500'
            };
        }
        
        // iPhone
        if (os.includes('ios') || device.toLowerCase().includes('iphone')) {
            return {
                title: 'iPhone',
                subtitle: session.os || 'iOS',
                icon: 'solar:smartphone-bold-duotone',
                iconBg: 'bg-gray-100/10',
                iconColor: 'text-white'
            };
        }
        
        // Android
        if (os.includes('android')) {
            return {
                title: 'Téléphone Android',
                subtitle: `${device} • ${session.os || ''}`,
                icon: 'solar:smartphone-bold-duotone',
                iconBg: 'bg-green-500/10',
                iconColor: 'text-green-500'
            };
        }
        
        // Tablet (iPad or Android Tablet)
        if (type === 'tablet' || device.toLowerCase().includes('ipad')) {
             return {
                title: device.includes('iPad') ? 'iPad' : 'Tablette',
                subtitle: session.os || '',
                icon: 'solar:tablet-bold-duotone',
                iconBg: 'bg-purple-500/10',
                iconColor: 'text-purple-500'
            };
        }

        // Default
        return {
            title: device,
            subtitle: `${session.os || ''} • ${session.browser || ''}`,
            icon: 'solar:devices-bold-duotone',
            iconBg: 'bg-white/5',
            iconColor: 'text-gray-400'
        };
    };

    const subDetails = getSubscriptionDetails();

    const fetchPlans = async () => {
        setLoadingPlans(true);
        try {
            const data = await apiService.get<any[]>('/subscriptions');
            setPlans(Array.isArray(data) ? data.filter((p: any) => p.type !== 'free') : []);
        } catch (err) {
            console.error('Failed to fetch plans', err);
        } finally {
            setLoadingPlans(false);
        }
    };

    useEffect(() => {
        if (showUpgradeMenu) {
            fetchPlans();
        }
    }, [showUpgradeMenu]);

    const handlePayment = async (plan: any) => {
        showInfoToast("Le système de paiement est en cours de maintenance.");
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 flex flex-col items-center pt-10 md:pt-14 p-6">
            <div className="w-full max-w-5xl">
                {/* Header */}
                <div className="flex items-start gap-5 border-b border-white/10 pb-8 mb-10">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all border border-white/5 hover:border-white/20 group cursor-pointer"
                    >
                        <Icon icon="solar:arrow-left-linear" width={20} className="text-gray-400 group-hover:text-white transition-colors" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
                        <p className="text-gray-500 text-sm mt-1 max-w-2xl">
                            Gérez vos préférences et votre compte. Mettez à jour vos informations personnelles, configurez vos notifications et renforcez la sécurité de votre accès.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-stretch min-h-[500px]">
                    {/* Sidebar Navigation */}
                    <div className="w-full lg:w-64 flex-shrink-0 flex flex-col">
                        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex-1 shadow-2xl flex flex-col">
                            <div className="space-y-1">
                                {tabs.map((tab) => {
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as TabType)}
                                            className={`w-full text-left px-4 py-3.5 rounded-xl transition-all duration-200 relative flex items-center gap-3 font-medium cursor-pointer overflow-hidden ${isActive
                                                ? 'bg-white/5 text-blue-500'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <Icon
                                                icon={tab.icon}
                                                width={22}
                                                className={isActive ? 'text-blue-500' : 'text-gray-500'}
                                            />
                                            <span>{tab.label}</span>
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeTabIndicator"
                                                    className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-l-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-auto pt-8 px-4 text-center">
                                <p className="text-xs text-gray-700 font-mono">
                                    ID: {profile.email?.split('@')[0] || 'USER'}-8842
                                </p>
                                <p className="text-[10px] text-gray-800 mt-1">
                                    v2.4.0
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 w-full flex flex-col">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                            className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl flex-1 relative overflow-hidden"
                        >
                            {/* Content Background Glow */}
                            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

                            {activeTab === 'account' && (
                                <div className="space-y-8 relative z-10">
                                    <div className="border-b border-white/10 pb-6">
                                        <h2 className="text-2xl font-bold mb-2">Détails du Compte</h2>
                                        <p className="text-gray-400 text-sm">Informations sur votre abonnement et votre statut.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${subDetails.colorClass} ${subDetails.bgClass}`}>
                                                        <Icon icon={subDetails.icon} width={20} />
                                                    </div>
                                                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Abonnement</h3>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="text-xl font-bold text-white">{subDetails.label}</div>
                                                <div className="flex flex-col items-end">
                                                    <p className={`text-xs ${profile.subscriptionType === 'vip' ? 'text-purple-500' : (profile.subscriptionType === 'premium' ? 'text-blue-500' : 'text-yellow-500')}`}>
                                                        {subDetails.status}
                                                    </p>
                                                    {/* Upgrade Button Removed */}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                                        <Icon icon="solar:calendar-bold" width={20} />
                                                    </div>
                                                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Membre depuis</h3>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="text-xl font-bold text-white first-letter:uppercase">{profile.memberSince || 'N/A'}</div>
                                                <p className={`text-xs ${profile.emailVerified ? 'text-green-500' : 'text-yellow-500'}`}>
                                                    {profile.emailVerified ? 'Compte vérifié' : 'Non vérifié'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-8 mt-8 border-t border-white/10">
                                        <h3 className="text-lg font-bold text-red-500 mb-4">Zone Danger</h3>
                                        <div className="p-5 border border-red-500/10 rounded-xl bg-red-500/[0.03] flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div>
                                                <h4 className="text-white font-medium text-sm">Fermeture du compte</h4>
                                                <p className="text-gray-500 text-xs mt-1 max-w-sm">
                                                    Supprimer définitivement votre compte et toutes ses données.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setShowDeleteModal(true)}
                                                className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold rounded-lg border border-red-500/20 transition-all whitespace-nowrap cursor-pointer"
                                            >
                                                Supprimer
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'profile' && (
                                <div className="space-y-8 relative z-10">
                                    <div className="border-b border-white/10 pb-6">
                                        <h2 className="text-2xl font-bold mb-2">Profil</h2>
                                        <p className="text-gray-400 text-sm">Vos informations visibles sur la plateforme.</p>
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-10">
                                        <div className="relative group cursor-pointer w-32 h-32 flex-shrink-0 mx-auto md:mx-0" onClick={() => fileInputRef.current?.click()}>
                                            <div className="w-32 h-32 rounded-full bg-black ring-4 ring-white/5 overflow-hidden group-hover:ring-blue-500/50 transition-all duration-300 shadow-2xl">
                                                <img 
                                                    src={previewImage || profile.avatar || '/images/splash.png'}
                                                    className="w-full h-full object-cover" 
                                                    onError={(e) => {
                                                        e.currentTarget.src = '/images/splash.png';
                                                        setImageError(true);
                                                    }}
                                                    alt="Profile"
                                                />
                                            </div>
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full backdrop-blur-[2px]">
                                                <Icon icon="solar:camera-bold" className="text-white" width={24} />
                                            </div>
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                                                if (e.target.files?.[0]) {
                                                    const file = e.target.files[0];
                                                    
                                                    // Local preview & Simulate Upload
                                                    const reader = new FileReader();
                                                    reader.onload = async () => {
                                                        const base64Image = reader.result as string;
                                                        setPreviewImage(base64Image);
                                                        
                                                        try {
                                                            showInfoToast('Téléchargement en cours...');
                                                            
                                                            // Save to backend
                                                            await authService.updateProfile({ profilePicture: base64Image });
                                                            
                                                            setProfile(prev => ({ ...prev, avatar: base64Image }));
                                                            
                                                            // Update local storage so Navbar picks it up
                                                            const cached = localStorage.getItem('netfix_user_data');
                                                            if (cached) {
                                                                try {
                                                                    const user = JSON.parse(cached);
                                                                    user.avatar = base64Image;
                                                                    localStorage.setItem('netfix_user_data', JSON.stringify(user));
                                                                } catch (e) {
                                                                    localStorage.setItem('netfix_user_data', JSON.stringify({ avatar: base64Image }));
                                                                }
                                                            } else {
                                                                localStorage.setItem('netfix_user_data', JSON.stringify({ avatar: base64Image }));
                                                            }

                                                            showSuccessToast('Photo de profil mise à jour');
                                                        } catch (error) {
                                                            console.error('Upload error:', error);
                                                            showErrorToast('Erreur lors du téléchargement');
                                                        }
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }} />
                                        </div>

                                        <div className="flex-1 space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Prénom</label>
                                                    <div className="relative">
                                                        <Icon icon="solar:user-linear" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" width={18} />
                                                        <input
                                                            value={profile.firstName}
                                                            onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 pl-11 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                                                            placeholder="Votre prénom"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nom</label>
                                                    <div className="relative">
                                                        <Icon icon="solar:text-field-linear" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" width={18} />
                                                        <input
                                                            value={profile.lastName}
                                                            onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 pl-11 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                                                            placeholder="Votre nom"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Adresse Email</label>
                                                <div className="relative">
                                                    <Icon icon="solar:letter-linear" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" width={18} />
                                                    <input
                                                        value={profile.email}
                                                        readOnly
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 pl-11 text-sm text-gray-300 cursor-not-allowed"
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 bg-green-500/10 rounded-md border border-green-500/20">
                                                        <Icon icon="solar:verified-check-bold" className="text-green-500" width={14} />
                                                        <span className="text-[10px] font-bold text-green-500 uppercase">Vérifié</span>
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-gray-600 mt-1">Votre email est utilisé pour la connexion et la sécurité.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/10 flex justify-end">
                                        <button onClick={() => handleSave()} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-lg transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 cursor-pointer">
                                            {saving && <Icon icon="svg-spinners:ring-resize" width={16} />}
                                            <span>Enregistrer les modifications</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'notifications' && (
                                <div className="space-y-8 relative z-10">
                                    <div className="border-b border-white/10 pb-6">
                                        <h2 className="text-2xl font-bold mb-2">Notifications</h2>
                                        <p className="text-gray-400 text-sm">Gérez vos alertes et communications.</p>
                                    </div>

                                    <div className="space-y-4">
                                        {[
                                            {
                                                id: 'email',
                                                title: 'Email',
                                                desc: 'Recevoir les actualités et mises à jour par email.',
                                                icon: 'solar:letter-bold',
                                                iconColor: 'text-blue-500',
                                                bg: 'bg-white/5'
                                            },
                                            {
                                                id: 'whatsapp',
                                                title: 'WhatsApp',
                                                desc: 'Recevoir les notifications importantes sur WhatsApp.',
                                                icon: 'logos:whatsapp-icon',
                                                iconColor: '',
                                                bg: 'bg-white/5'
                                            },
                                            {
                                                id: 'telegram',
                                                title: 'Telegram',
                                                desc: 'Recevoir les notifications via Telegram.',
                                                icon: 'logos:telegram',
                                                iconColor: '',
                                                bg: 'bg-white/5'
                                            }
                                        ].map((item) => (
                                            <div key={item.id} className="flex items-center justify-between p-5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-colors">
                                                <div className="flex items-center gap-5">
                                                    <div className={`p-3 rounded-xl h-fit ${item.bg} ${item.iconColor}`}>
                                                        <Icon icon={item.icon} width={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-white mb-1">{item.title}</h3>
                                                        <p className="text-xs text-gray-500">{item.desc}</p>
                                                    </div>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            item.id === 'email' 
                                                                ? !!profile.emailNotifications 
                                                                : notificationChannels[item.id as keyof typeof notificationChannels]
                                                        }
                                                        onChange={(e) => {
                                                            const isChecking = e.target.checked;
                                                            
                                                            if (item.id === 'email') {
                                                                setProfile(prev => ({ ...prev, emailNotifications: isChecking }));
                                                                setNotificationChannels(prev => ({ ...prev, email: isChecking }));
                                                            } else if (isChecking && (item.id === 'whatsapp' || item.id === 'telegram')) {
                                                                setVerificationModal({
                                                                    type: item.id as 'whatsapp' | 'telegram',
                                                                    step: 'input',
                                                                    value: '',
                                                                    email: '', // Requires email field as requested
                                                                    code: '',
                                                                    isLoading: false
                                                                });
                                                            } else {
                                                                setNotificationChannels(prev => ({ ...prev, [item.id]: isChecking }));
                                                                if (!isChecking && item.id === 'whatsapp') {
                                                                    setProfile(prev => ({ ...prev, whatsappPhone: '' }));
                                                                }
                                                                if (!isChecking && item.id === 'telegram') {
                                                                    setProfile(prev => ({ ...prev, telegramChatId: '', telegramUsername: '' }));
                                                                }
                                                            }
                                                        }}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                </label>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-6 border-t border-white/10 flex justify-end">
                                        <button onClick={() => handleSave()} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-lg transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 cursor-pointer">
                                            {saving && <Icon icon="svg-spinners:ring-resize" width={16} />}
                                            <span>Enregistrer les préférences</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <div className="space-y-8 relative z-10">
                                    <div className="border-b border-white/10 pb-6">
                                        <h2 className="text-2xl font-bold mb-2">Sécurité</h2>
                                        <p className="text-gray-400 text-sm">Modifiez votre mot de passe.</p>
                                    </div>

                                    <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-2xl mx-auto">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mot de passe actuel</label>
                                            <div className="relative">
                                                <Icon icon="solar:lock-keyhole-linear" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" width={18} />
                                                <input 
                                                    type={showPassword.current ? "text" : "password"} 
                                                    value={passwords.current}
                                                    onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 pl-11 pr-12 text-sm text-white focus:border-blue-500 outline-none transition-colors" 
                                                    placeholder="••••••••••••" 
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors cursor-pointer"
                                                >
                                                    <Icon icon={showPassword.current ? "solar:eye-linear" : "solar:eye-closed-linear"} width={18} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nouveau</label>
                                                <div className="relative">
                                                    <Icon icon="solar:key-linear" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" width={18} />
                                                    <input 
                                                        type={showPassword.new ? "text" : "password"} 
                                                        value={passwords.new}
                                                        onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 pl-11 pr-12 text-sm text-white focus:border-blue-500 outline-none transition-colors" 
                                                        placeholder="••••••••••••" 
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors cursor-pointer"
                                                    >
                                                        <Icon icon={showPassword.new ? "solar:eye-linear" : "solar:eye-closed-linear"} width={18} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Confirmer</label>
                                                <div className="relative">
                                                    <Icon icon="solar:check-circle-linear" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" width={18} />
                                                    <input 
                                                        type={showPassword.confirm ? "text" : "password"} 
                                                        value={passwords.confirm}
                                                        onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 pl-11 pr-12 text-sm text-white focus:border-blue-500 outline-none transition-colors" 
                                                        placeholder="••••••••••••" 
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors cursor-pointer"
                                                    >
                                                        <Icon icon={showPassword.confirm ? "solar:eye-linear" : "solar:eye-closed-linear"} width={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 flex justify-end">
                                            <button type="submit" className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-lg transition-all shadow-lg shadow-blue-500/20 cursor-pointer">
                                                Enregistrer le mot de passe
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {activeTab === 'sessions' && (
                                <div className="space-y-8 relative z-10">
                                    <div className="border-b border-white/10 pb-6">
                                        <h2 className="text-2xl font-bold mb-2">Sessions Actives</h2>
                                        <p className="text-gray-400 text-sm">Gérez l'accès à votre compte.</p>
                                    </div>

                                    <div className="space-y-8">
                                        {/* Current Session */}
                                        {sessions.find(s => s.isCurrent) && (() => {
                                            const current = sessions.find(s => s.isCurrent)!;
                                            const display = getDeviceDisplay(current);
                                            return (
                                                <div className="space-y-3">
                                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider ml-1">Appareil actuel</h3>
                                                    <div className="flex items-center justify-between p-5 bg-green-500/[0.05] border border-green-500/20 rounded-xl">
                                                        <div className="flex items-center gap-5">
                                                            <div className={`p-3 rounded-full ${display.iconBg} ${display.iconColor}`}>
                                                                <Icon 
                                                                    icon={display.icon} 
                                                                    width={24} 
                                                                />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                                                    {display.title}
                                                                    <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] rounded uppercase tracking-wider border border-green-500/20">Actuel</span>
                                                                </h4>
                                                                <p className="text-xs text-gray-400 mt-1">
                                                                    {display.subtitle} • {current.city ? `${current.city}, ${current.country}` : (current.location || 'Localisation inconnue')} • En ligne
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Other Sessions */}
                                        {(() => {
                                            const otherSessions = sessions.filter(s => !s.isCurrent);
                                            if (otherSessions.length === 0) return null;

                                            const content = otherSessions.map(session => {
                                                const display = getDeviceDisplay(session);
                                                return (
                                                    <div key={session.id} className="flex items-center justify-between p-5 bg-white/[0.02] rounded-xl border border-white/10">
                                                        <div className="flex items-center gap-5">
                                                            <div className={`p-3 rounded-full ${display.iconBg} ${display.iconColor}`}>
                                                                <Icon 
                                                                    icon={display.icon} 
                                                                    width={24} 
                                                                />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-bold text-white">{display.title}</h4>
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    {display.subtitle} • {session.city ? `${session.city}, ${session.country}` : (session.location || 'Localisation inconnue')} • {session.isOnline ? <span className="text-green-500">En ligne</span> : formatLastActive(session.lastActiveAt)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleRevokeSession(session.id)}
                                                            className="text-xs font-bold text-red-500 hover:text-red-400 hover:underline cursor-pointer"
                                                        >
                                                            Déconnecter
                                                        </button>
                                                    </div>
                                                );
                                            });

                                            return (
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider ml-1">Autres appareils</h3>
                                                    </div>
                                                    
                                                    <div className={`space-y-4 ${otherSessions.length > 3 ? 'max-h-[400px] overflow-y-auto pr-2 custom-scrollbar' : ''}`}>
                                                        <style>{`
                                                            .custom-scrollbar::-webkit-scrollbar {
                                                                width: 4px;
                                                            }
                                                            .custom-scrollbar::-webkit-scrollbar-track {
                                                                background: rgba(255, 255, 255, 0.02);
                                                                border-radius: 4px;
                                                            }
                                                            .custom-scrollbar::-webkit-scrollbar-thumb {
                                                                background: rgba(255, 255, 255, 0.1);
                                                                border-radius: 4px;
                                                            }
                                                            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                                                                background: rgba(255, 255, 255, 0.2);
                                                            }
                                                        `}</style>
                                                        {content}
                                                    </div>

                                                    <div className="flex justify-end pt-2">
                                                        <button 
                                                            onClick={handleRevokeAllSessions}
                                                            className="text-red-500 text-xs font-bold hover:underline flex items-center gap-2 cursor-pointer"
                                                        >
                                                            <Icon icon="solar:logout-linear" width={16} />
                                                            Déconnecter tous
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {sessions.length === 0 && (
                                            <div className="text-center text-gray-500 py-10">
                                                Aucune session active trouvée.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showDeleteModal && (
                    <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
                        <div className="p-8 text-center">
                            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                                <Icon icon="solar:danger-triangle-bold" width={40} />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">Supprimer votre compte ?</h3>
                            <p className="text-gray-400 text-sm mb-8 leading-relaxed max-w-sm mx-auto">
                                Cette action est <span className="text-red-500 font-bold">irréversible</span>. Toutes vos données, préférences et historique seront définitivement effacés. Êtes-vous sûr de vouloir continuer ?
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-xl transition-all cursor-pointer border border-white/5"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-red-500/20 cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <Icon icon="solar:trash-bin-trash-bold" width={18} />
                                    Confirmer
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {verificationModal.type && (
                    <Modal isOpen={!!verificationModal.type} onClose={() => setVerificationModal(prev => ({ ...prev, type: null }))}>
                        <div className="p-6">
                            <div className="relative flex items-center justify-center mb-8">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Icon icon={verificationModal.type === 'whatsapp' ? 'logos:whatsapp-icon' : 'logos:telegram'} width={28} />
                                    <span className="capitalize">{verificationModal.type}</span>
                                </h3>
                                <button
                                    onClick={() => setVerificationModal(prev => ({ ...prev, type: null }))}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                                >
                                    <Icon icon="solar:close-circle-linear" width={24} className="text-gray-400 hover:text-white" />
                                </button>
                            </div>

                            {verificationModal.step === 'input' ? (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-400">
                                        Entrez vos informations pour recevoir un code de vérification.
                                    </p>

                                    {verificationModal.type === 'whatsapp' ? (
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Numéro de téléphone</label>
                                            <div className="flex gap-3">
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setShowCountryMenu(!showCountryMenu)}
                                                        className="w-32 bg-[#1A1A1A] border border-white/10 rounded-xl px-3 py-3.5 flex items-center justify-between text-sm text-white hover:border-blue-500 hover:bg-[#222] transition-all cursor-pointer"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {selectedCountry.flag && <img src={selectedCountry.flag} alt="flag" className="w-5 h-3.5 object-cover rounded-[2px]" />}
                                                            <span>{selectedCountry.dial}</span>
                                                        </div>
                                                        <Icon icon="solar:alt-arrow-down-linear" className="text-gray-500" width={14} />
                                                    </button>

                                                    {showCountryMenu && (
                                                        <>
                                                            <div className="fixed inset-0 z-[60]" onClick={() => setShowCountryMenu(false)} />
                                                            <style>
                                                                {`
                                                                .custom-scrollbar::-webkit-scrollbar {
                                                                    width: 10px;
                                                                    height: 10px;
                                                                }
                                                                .custom-scrollbar::-webkit-scrollbar-track {
                                                                    background: rgba(0, 0, 0, 0.3);
                                                                    border-left: 1px solid rgba(255, 255, 255, 0.05);
                                                                }
                                                                .custom-scrollbar::-webkit-scrollbar-thumb {
                                                                    background: rgba(255, 255, 255, 0.2);
                                                                    border-radius: 5px;
                                                                    border: 2px solid transparent;
                                                                    background-clip: content-box;
                                                                }
                                                                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                                                                    background: rgba(255, 255, 255, 0.3);
                                                                    border: 2px solid transparent;
                                                                    background-clip: content-box;
                                                                }
                                                                `}
                                                            </style>
                                                            <div className="absolute bottom-full left-0 mb-4 w-80 h-80 overflow-y-auto bg-[#101010] border border-white/10 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[70] p-0 custom-scrollbar flex flex-col">
                                                                {countryCodes.map((c) => (
                                                                    <button
                                                                        key={c.code}
                                                                        onClick={() => {
                                                                            setSelectedCountry(c);
                                                                            setShowCountryMenu(false);
                                                                        }}
                                                                        className="w-full flex items-center gap-4 px-5 py-3 hover:bg-white/5 transition-all text-left group border-b border-white/5 last:border-0 cursor-pointer"
                                                                    >
                                                                        <img src={c.flag} alt={c.code} className="w-8 h-5 object-cover rounded shadow-sm opacity-80 group-hover:opacity-100 transition-opacity" />
                                                                        <span className="text-gray-500 w-8 text-right text-xs font-mono font-bold tracking-wider group-hover:text-white transition-colors">{c.code}</span>
                                                                        <span className="text-white font-medium text-sm ml-auto tracking-wide">{c.dial}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="relative flex-1">
                                                    <Icon icon="solar:phone-linear" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" width={18} />
                                                    <input
                                                        value={verificationModal.value}
                                                        onChange={(e) => setVerificationModal(prev => ({ ...prev, value: e.target.value }))}
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 pl-11 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                                                        placeholder="6 12 34 56 78"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Nom d'utilisateur Telegram</label>
                                            <div className="relative">
                                                <Icon icon="logos:telegram" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" width={18} />
                                                <input
                                                    value={verificationModal.value}
                                                    onChange={(e) => setVerificationModal(prev => ({ ...prev, value: e.target.value }))}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 pl-11 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                                                    placeholder="@utilisateur"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => {
                                            setVerificationModal(prev => ({ ...prev, isLoading: true }));
                                            setTimeout(() => {
                                                setVerificationModal(prev => ({ ...prev, isLoading: false, step: 'verify' }));
                                                showSuccessToast(`Un code a été envoyé sur ${verificationModal.type === 'whatsapp' ? 'WhatsApp' : 'Telegram'}`);
                                            }, 1500);
                                        }}
                                        disabled={!verificationModal.value}
                                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        {verificationModal.isLoading ? <Icon icon="svg-spinners:ring-resize" /> : 'Envoyer le code'}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <h4 className="text-lg font-bold text-white mb-2">Vérification Requise</h4>

                                    <p className="text-sm text-gray-400 text-center max-w-[85%] leading-relaxed">
                                        Pour sécuriser votre compte, veuillez entrer le code à 5 chiffres que nous venons d'envoyer sur <span className="text-white font-medium capitalize">{verificationModal.type}</span>.
                                    </p>

                                    <div className="relative w-full text-white my-8">
                                        <div className="flex gap-3 justify-center">
                                            {[...Array(5)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-12 h-14 rounded-xl border flex items-center justify-center text-xl font-bold transition-all ${verificationModal.code.length === i
                                                        ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.2)] scale-105'
                                                        : verificationModal.code.length > i
                                                            ? 'border-blue-500/50 bg-blue-500/5 text-blue-400'
                                                            : 'border-white/10 bg-black/40 text-gray-600'
                                                        }`}
                                                >
                                                    {verificationModal.code[i] || '•'}
                                                </div>
                                            ))}
                                        </div>
                                        <input
                                            value={verificationModal.code}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 5);
                                                setVerificationModal(prev => ({ ...prev, code: val }));
                                            }}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-text"
                                            autoFocus
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                        />
                                    </div>

                                    <button
                                        onClick={() => {
                                            setVerificationModal(prev => ({ ...prev, isLoading: true }));
                                            setTimeout(() => {
                                                if (verificationModal.type === 'whatsapp') {
                                                    const digitsOnly = `${selectedCountry.dial}${verificationModal.value}`.replace(/[^\d]/g, '');
                                                    const phone = digitsOnly ? `+${digitsOnly}` : '';
                                                    setProfile(prev => ({ ...prev, whatsappPhone: phone }));
                                                }

                                                if (verificationModal.type === 'telegram') {
                                                    const username = verificationModal.value.trim();
                                                    setProfile(prev => ({ ...prev, telegramUsername: username, telegramChatId: '' }));
                                                }

                                                setNotificationChannels(prev => ({ ...prev, [verificationModal.type!]: true }));
                                                setVerificationModal(prev => ({ ...prev, type: null, isLoading: false, step: 'input', value: '', code: '' }));
                                                showSuccessToast('Notification activée avec succès !');
                                            }, 1000);
                                        }}
                                        disabled={verificationModal.code.length < 5}
                                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        {verificationModal.isLoading ? <Icon icon="svg-spinners:ring-resize" /> : 'Confirmer le code'}
                                    </button>

                                    <button className="mt-6 text-xs font-medium text-gray-500 hover:text-white transition-colors cursor-pointer flex items-center gap-2">
                                        <Icon icon="solar:restart-linear" width={14} />
                                        Renvoyer le code
                                    </button>

                                </div>
                            )}
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            {/* Upgrade Menu Modal */}
            <AnimatePresence>
                {showUpgradeMenu && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !processingPayment && setShowUpgradeMenu(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-8 w-full max-w-2xl relative shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600" />
                            
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Choisir un forfait</h2>
                                    <p className="text-gray-400 text-sm mt-1">Passez au niveau supérieur pour une expérience premium.</p>
                                </div>
                                <button
                                    onClick={() => !processingPayment && setShowUpgradeMenu(false)}
                                    className="p-2 hover:bg-white/5 rounded-full transition-colors cursor-pointer"
                                >
                                    <Icon icon="solar:close-circle-bold" width={24} className="text-gray-500" />
                                </button>
                            </div>

                            {loadingPlans ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <Icon icon="svg-spinners:ring-resize" width={40} className="text-blue-500 mb-4" />
                                    <p className="text-gray-400">Chargement des offres...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {plans.map((plan) => (
                                        <div 
                                            key={plan.id}
                                            className={`p-6 rounded-2xl border transition-all ${
                                                profile.subscriptionType === plan.type 
                                                ? 'border-blue-500/50 bg-blue-500/5' 
                                                : 'border-white/10 bg-white/5 hover:border-white/20'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <div className={`p-2 rounded-lg ${
                                                    plan.type === 'vip' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'
                                                }`}>
                                                    <Icon icon={plan.type === 'vip' ? 'solar:crown-star-bold' : 'solar:cup-first-bold'} width={20} />
                                                </div>
                                                {profile.subscriptionType === plan.type && (
                                                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Actuel</span>
                                                )}
                                            </div>
                                            <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                                            <div className="mt-2 flex items-baseline gap-1">
                                                <span className="text-2xl font-black text-white">{plan.price.toLocaleString()}</span>
                                                <span className="text-sm text-gray-500">FCFA</span>
                                                {plan.durationMonths && (
                                                    <span className="text-xs text-gray-600 ml-1">/ {plan.durationMonths} mois</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-3 line-clamp-2">{plan.description}</p>
                                            
                                            <button
                                                disabled={profile.subscriptionType === plan.type || processingPayment}
                                                onClick={() => handlePayment(plan)}
                                                className={`w-full mt-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                                    profile.subscriptionType === plan.type
                                                    ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                                                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                }`}
                                            >
                                                {processingPayment ? (
                                                     <Icon icon="svg-spinners:ring-resize" width={18} />
                                                ) : (
                                                    <span>{profile.subscriptionType === plan.type ? 'Forfait Actuel' : 'Choisir ce plan'}</span>
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

{/* Verification Modal Logic */ }
function Modal({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl"
            >
                {children}
            </motion.div>
        </div>
    );
}
