'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '../services/auth.service';
import { usersService } from '../services/users.service';
import AdminSidebar from './components/AdminSidebar';
import AdminNavbar from './components/AdminNavbar';
import { Icon } from '@iconify/react';
import UsersView from './views/UsersView';
import MoviesView from './views/MoviesView';
import SeriesView from './views/SeriesView';
import ChannelsView from './views/ChannelsView';
import RequestsView from './views/RequestsView';
import NotificationsView from './views/NotificationsView';

const AdminDashboard = () => {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [totalUsers, setTotalUsers] = useState<number>(0);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const data = await authService.getCurrentUser();
                const user = data.user || data;

                if (!user || user.role !== 'admin') {
                    console.warn('Access denied: User is not ADMIN', user);
                    router.push('/dashboard');
                    return;
                }

                setUser(user);

                // Fetch dashboard stats
                try {
                    const users = await usersService.getAllUsers();
                    setTotalUsers(users.length);
                } catch (err) {
                    console.error('Failed to fetch stats', err);
                }

            } catch (error) {
                console.error('Auth error:', error);
                router.push('/login');
            } finally {
                setIsLoading(false);
            }
        };

        fetchUser();
    }, [router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Dynamic Title based on Active Tab
    const getPageTitle = () => {
        switch (activeTab) {
            case 'users': return 'Gestion des Utilisateurs';
            case 'transactions': return 'Transactions Financières';
            case 'movies': return 'Films';
            case 'series': return 'Séries';
            case 'channels': return 'Chaînes TV';
            case 'requests': return 'Demandes';
            case 'notifications': return 'Notifications';
            default: return "Vue d'ensemble";
        }
    };

    const getPageDescription = () => {
        switch (activeTab) {
            case 'users': return 'Gérez les comptes utilisateurs';
            case 'transactions': return 'Consultez l\'historique des transactions (Désactivé)';
            case 'movies': return 'Ajoutez, modifiez ou supprimez des films';
            case 'series': return 'Ajoutez, modifiez ou supprimez des séries';
            case 'channels': return 'Gérez les chaînes de télévision et le guide des programmes';
            case 'requests': return 'Gérez les demandes de contenu des utilisateurs';
            case 'notifications': return 'Envoyez des notifications aux utilisateurs';
            default: return "Bienvenue dans votre panneau d'administration";
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
            {/* Sidebar (Fixed Left) */}
            <AdminSidebar
                user={user}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {/* Right Side Wrapper */}
            <div className="ml-64 min-h-screen flex flex-col">
                {/* Navbar (Sticky Top) */}
                <AdminNavbar
                    title={getPageTitle()}
                    description={getPageDescription()}
                    user={user}
                    onTabChange={setActiveTab}
                />

                {/* Main Content Area */}
                <main className="flex-1 p-8 bg-gradient-to-br from-gray-900 to-black">


                    {/* Content */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8 ani-slide-in">
                            {/* Stats Cards */}
                            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm hover:bg-white/10 transition-colors">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                            <Icon icon="solar:users-group-rounded-bold" width="24" height="24" />
                                        </div>
                                        <p className="text-sm text-gray-400 font-medium">Total Utilisateurs</p>
                                    </div>
                                </div>
                                <h3 className="text-3xl font-bold text-white">{totalUsers.toLocaleString()}</h3>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm hover:bg-white/10 transition-colors">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-pink-500/10 rounded-lg text-pink-500">
                                            <Icon icon="solar:clapperboard-play-bold" width="24" height="24" />
                                        </div>
                                        <p className="text-sm text-gray-400 font-medium">Films</p>
                                    </div>
                                </div>
                                <h3 className="text-3xl font-bold text-white">892</h3>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm hover:bg-white/10 transition-colors">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                                            <Icon icon="solar:videocamera-record-bold" width="24" height="24" />
                                        </div>
                                        <p className="text-sm text-gray-400 font-medium">Séries</p>
                                    </div>
                                </div>
                                <h3 className="text-3xl font-bold text-white">456</h3>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm hover:bg-white/10 transition-colors">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-500">
                                            <Icon icon="solar:tv-bold" width="24" height="24" />
                                        </div>
                                        <p className="text-sm text-gray-400 font-medium">Chaînes TV</p>
                                    </div>
                                </div>
                                <h3 className="text-3xl font-bold text-white">128</h3>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm hover:bg-white/10 transition-colors">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500">
                                            <Icon icon="solar:wallet-money-bold" width="24" height="24" />
                                        </div>
                                        <p className="text-sm text-gray-400 font-medium">Revenus</p>
                                    </div>
                                </div>
                                <h3 className="text-3xl font-bold text-white">--</h3>
                            </div>
                        </div>
                    )}

                    {activeTab === 'transactions' && (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                            <Icon icon="solar:card-search-linear" width="64" className="mb-4 opacity-50" />
                            <h3 className="text-xl font-medium mb-2">Module Désactivé</h3>
                            <p>La gestion des transactions est temporairement indisponible.</p>
                        </div>
                    )}
                    {activeTab === 'users' && <UsersView />}
                    {activeTab === 'movies' && <MoviesView />}
                    {activeTab === 'series' && <SeriesView />}
                    {activeTab === 'channels' && <ChannelsView />}
                    {activeTab === 'requests' && <RequestsView />}
                    {activeTab === 'notifications' && <NotificationsView />}
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;
