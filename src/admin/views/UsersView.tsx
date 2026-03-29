import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { usersService, User as ApiUser } from '../../services/users.service';

// Extended User type for UI with mapped fields
interface User extends ApiUser {
    device: {
        type: string;
        os: string;
        browser?: string;
        name: string;
    };
    status: 'online' | 'offline' | 'blocked';
    location: string;
    countryCode?: string;
    ipAddress: string;
    isEmailVerified: boolean;
}

// Edit modal form state
interface EditForm {
    firstName: string;
    lastName: string;
    email: string;
    isVerified: boolean;
}

const UsersView: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [users, setUsers] = useState<User[]>([]);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    // Dropdown State (Fixed Position)
    const [dropdownState, setDropdownState] = useState<{
        userId: string;
        top: number;
        right: number;
    } | null>(null);

    // Modal State
    const [modalType, setModalType] = useState<'role' | 'subscription' | 'block' | 'delete' | 'edit' | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium' | 'vip'>('free');
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Edit form state
    const [editForm, setEditForm] = useState<EditForm>({
        firstName: '',
        lastName: '',
        email: '',
        isVerified: false,
    });

    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    useEffect(() => {
        fetchUsers();
        const interval = setInterval(() => fetchUsers(true), 15000); // 15s quiet update
        return () => clearInterval(interval);
    }, []);

    const fetchUsers = async (isSilent = false) => {
        try {
            if (!isSilent) setIsLoading(true);
            const data = await usersService.getAllUsers();

            const mappedUsers: User[] = data.map(u => {
                let status: 'online' | 'offline' | 'blocked' = 'offline';
                if (u.accountStatus === 'blocked') {
                    status = 'blocked';
                } else if (u.lastActive) {
                    const lastActive = new Date(u.lastActive).getTime();
                    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
                    if (lastActive > fiveMinutesAgo) status = 'online';
                }

                let deviceObj = { type: 'unknown', os: 'Unknown', name: 'Inconnu' };
                if (u.lastDevice) {
                    const d = u.lastDevice;
                    const lowerDevice = d.toLowerCase();
                    let type = 'computer';

                    // Device Type detection
                    const isTV = lowerDevice.includes('tv') || lowerDevice.includes('smart tv') || lowerDevice.includes('television') || lowerDevice.includes('androidtv') || lowerDevice.includes('firetv') || lowerDevice.includes('roku') || lowerDevice.includes('tizen') || lowerDevice.includes('webos');
                    const isMobile = lowerDevice.includes('phone') || lowerDevice.includes('mobile') ||
                                   lowerDevice.includes('android') || lowerDevice.includes('ios') ||
                                   lowerDevice.includes('iphone') || lowerDevice.includes('téléphone');
                    const isTablet = lowerDevice.includes('tablet') || lowerDevice.includes('ipad') || lowerDevice.includes('tablette');
                    const isComputer = lowerDevice.includes('windows') || lowerDevice.includes('mac') ||
                                     lowerDevice.includes('linux') || lowerDevice.includes('desktop') ||
                                     lowerDevice.includes('chrome') || lowerDevice.includes('firefox') ||
                                     lowerDevice.includes('safari') || lowerDevice.includes('edge');

                    if (isTV) type = 'tv';
                    else if (isMobile && !isTablet) type = 'phone';
                    else if (isTablet) type = 'tablet';
                    else if (isComputer) type = 'computer';

                    deviceObj = { type, os: d, name: d };
                }

                return {
                    ...u,
                    status,
                    location: u.lastCountry || 'Inconnu',
                    countryCode: u.lastCountryCode,
                    ipAddress: u.lastIp && u.lastIp !== '::1' && u.lastIp !== 'Unknown' ? u.lastIp : 'N/A',
                    isEmailVerified: u.isVerified ?? false,
                    device: deviceObj
                };
            });

            setUsers(mappedUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenDropdown = (e: React.MouseEvent, userId: string) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const menuHeight = 240;
        const spaceBelow = windowHeight - rect.bottom;
        const openUpwards = spaceBelow < menuHeight;

        setDropdownState({
            userId,
            top: openUpwards ? rect.top - 8 : rect.bottom + 8,
            right: window.innerWidth - rect.right
        });
    };

    // Close dropdown on scroll or resize
    useEffect(() => {
        const closeDropdown = () => setDropdownState(null);
        window.addEventListener('scroll', closeDropdown);
        window.addEventListener('resize', closeDropdown);
        return () => {
            window.removeEventListener('scroll', closeDropdown);
            window.removeEventListener('resize', closeDropdown);
        };
    }, []);

    const handleOpenModal = (type: 'role' | 'subscription' | 'block' | 'delete' | 'edit', user: any) => {
        setDropdownState(null);
        setSelectedUser(user);
        setModalType(type);
        setActiveMenu(null);
        if (type === 'subscription') {
            setSelectedPlan(user.subscriptionType || 'free');
        }
        if (type === 'edit') {
            setEditForm({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                isVerified: user.isEmailVerified ?? user.isVerified ?? false,
            });
        }
    };

    const handleConfirmAction = async () => {
        if (!selectedUser || !modalType || isActionLoading) return;

        setIsActionLoading(true);
        try {
            let updates: Partial<User> = {};

            switch (modalType) {
                case 'role':
                    updates = { role: selectedUser.role === 'admin' ? 'user' : 'admin' };
                    break;
                case 'subscription':
                    updates = { subscriptionType: selectedPlan as 'free' | 'premium' | 'vip' };
                    break;
                case 'block':
                    updates = { accountStatus: selectedUser.accountStatus === 'blocked' ? 'active' : 'blocked' };
                    break;
                case 'delete':
                    await usersService.deleteUser(selectedUser.id);
                    setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
                    setModalType(null);
                    setSelectedUser(null);
                    showToast('Utilisateur supprimé avec succès', 'success');
                    return;
                case 'edit':
                    updates = {
                        firstName: editForm.firstName,
                        lastName: editForm.lastName,
                        isVerified: editForm.isVerified,
                    } as any;
                    break;
                default:
                    return;
            }

            await usersService.updateUser(selectedUser.id, updates);

            // Optimistic update local state
            setUsers(prev => prev.map(u => {
                if (u.id === selectedUser.id) {
                    const newAccountStatus = (updates.accountStatus ?? u.accountStatus) as 'active' | 'blocked';
                    const status: 'online' | 'offline' | 'blocked' =
                        newAccountStatus === 'blocked' ? 'blocked'
                        : u.status === 'blocked' ? 'offline'
                        : u.status;
                    const isEmailVerified = modalType === 'edit'
                        ? editForm.isVerified
                        : u.isEmailVerified;
                    return { ...u, ...updates, status, isEmailVerified };
                }
                return u;
            }));

            const actionLabels: Record<string, string> = {
                role: 'Rôle modifié avec succès',
                subscription: 'Abonnement mis à jour avec succès',
                block: updates.accountStatus === 'blocked' ? 'Utilisateur bloqué' : 'Utilisateur débloqué',
                edit: 'Utilisateur modifié avec succès',
            };
            showToast(actionLabels[modalType] || 'Action effectuée', 'success');

        } catch (error: any) {
            console.error('Failed to update user:', error);
            showToast(error?.message || 'Une erreur est survenue', 'error');
        } finally {
            setIsActionLoading(false);
        }

        setModalType(null);
        setSelectedUser(null);
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.action-menu-trigger') && !target.closest('.action-menu-dropdown')) {
                setActiveMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleRefresh = () => {
        setIsLoading(true);
        fetchUsers();
    };

    // Filter Logic
    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'online':
                return (
                    <span className="text-sm font-medium text-green-400 flex items-center gap-1.5 w-fit">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>En ligne
                    </span>
                );
            case 'offline':
                return <span className="text-sm font-medium text-yellow-400 w-fit">Hors ligne</span>;
            case 'blocked':
                return <span className="text-sm font-medium text-red-400 w-fit">Bloqué</span>;
            default:
                return null;
        }
    };

    const getDeviceDisplay = (device: any) => {
        if (!device.name || device.name === 'Unknown' || device.name === 'Inconnu') return 'Inconnu';
        
        // If it's pure "Windows", "iPhone" etc from backend, it's good.
        // If it's a browser + OS string like "Chrome (Windows)", it's also good.
        return device.name;
    };

    const getDeviceIcon = (type: string, os: string) => {
        const osLower = (os || '').toLowerCase();
        const typeLower = (type || '').toLowerCase();
        // TV detection
        if (osLower.includes('tv') || osLower.includes('tizen') || osLower.includes('webos') || osLower.includes('roku') || osLower.includes('androidtv') || osLower.includes('firetv')) {
            return 'solar:tv-linear';
        }
        // Mobile/tablet OS
        if (osLower.includes('android') && !osLower.includes('tablet')) return 'solar:smartphone-linear';
        if (osLower.includes('iphone') || osLower.includes('ios')) return 'solar:smartphone-linear';
        if (osLower.includes('ipad') || osLower.includes('tablet')) return 'solar:tablet-linear';
        if (osLower.includes('windows') || osLower.includes('mac') || osLower.includes('linux')) return 'solar:laptop-minimalistic-linear';
        // Fallback by type
        switch (typeLower) {
            case 'tv': return 'solar:tv-linear';
            case 'computer': return 'solar:laptop-minimalistic-linear';
            case 'phone': return 'solar:smartphone-linear';
            case 'tablet': return 'solar:tablet-linear';
            default: return 'solar:devices-linear';
        }
    };

    const getSubscriptionBadge = (type: string) => {
        switch (type) {
            case 'vip':
                return <span className="text-sm font-bold text-purple-400 flex items-center gap-1.5 w-fit"><Icon icon="solar:crown-star-linear" width="16" /> VIP</span>;
            case 'premium':
                return <span className="text-sm font-medium text-blue-400 flex items-center gap-1.5 w-fit"><Icon icon="solar:cup-first-linear" width="16" /> Premium</span>;
            case 'free':
                return <span className="text-sm font-medium text-yellow-400 flex items-center gap-1.5 w-fit"><Icon icon="solar:crown-linear" width="16" /> Gratuit</span>;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border backdrop-blur-sm animate-in slide-in-from-right-4 duration-300 ${
                    toast.type === 'success'
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                    <Icon icon={toast.type === 'success' ? 'solar:check-circle-bold' : 'solar:danger-circle-bold'} width="20" />
                    <span className="text-sm font-medium">{toast.message}</span>
                </div>
            )}

            {/* Filters Bar */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between backdrop-blur-sm">
                <div className="relative w-full md:w-96">
                    <Icon icon="solar:magnifer-linear" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" width="20" height="20" />
                    <input
                        type="text"
                        placeholder="Rechercher un utilisateur..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    />
                </div>
                <div className="flex items-center bg-black/20 p-1 rounded-xl border border-white/5 w-full md:w-auto overflow-x-auto relative">
                    {(['all', 'online', 'blocked'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap z-10 ${
                                statusFilter === status
                                ? 'text-white'
                                : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            {statusFilter === status && (
                                <motion.div
                                    layoutId="adminUsersStatusFilterActive"
                                    className="absolute inset-0 bg-white/10 shadow-sm rounded-lg"
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                />
                            )}
                            <span className="relative">
                                {status === 'all' && 'Tous'}
                                {status === 'online' && 'En ligne'}
                                {status === 'blocked' && 'Bloqués'}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
                <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-sm uppercase tracking-wider">
                                <th className="px-6 py-5 font-semibold">Utilisateur</th>
                                <th className="px-6 py-5 font-semibold">Localisation</th>
                                <th className="px-6 py-5 font-semibold">IP</th>
                                <th className="px-6 py-5 font-semibold">Appareil</th>
                                <th className="px-6 py-5 font-semibold">Abonnement</th>
                                <th className="px-6 py-5 font-semibold">Statut</th>
                                <th className="px-6 py-5 font-semibold">Rôle</th>
                                <th className="px-6 py-5 font-semibold">Vérifié</th>
                                <th className="px-6 py-5 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Icon icon="svg-spinners:3-dots-fade" width="24" height="24" />
                                            <p className="text-sm">Chargement des utilisateurs...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedUsers.length > 0 ? (
                                paginatedUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden border border-white/10 shrink-0">
                                                    {user.profilePicture ? (
                                                        <img src={user.profilePicture} alt={user.firstName} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <span>{user.firstName[0]}{user.lastName[0]}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium text-base">{user.firstName} {user.lastName}</p>
                                                    <p className="text-gray-500 text-sm">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2.5 text-gray-300 text-sm">
                                                {user.countryCode ? (
                                                    <img src={`https://flagcdn.com/w40/${user.countryCode.toLowerCase()}.png`} width="24" alt={user.location} />
                                                ) : (
                                                    <Icon icon="solar:map-point-linear" className="text-gray-500" width="20" />
                                                )}
                                                {user.location}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-gray-500 text-sm font-mono">{user.ipAddress}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2.5 text-gray-300 text-sm">
                                                <Icon icon={getDeviceIcon(user.device.type, user.device.os)} width="20" className="text-gray-500" />
                                                <span>{getDeviceDisplay(user.device)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getSubscriptionBadge(user.subscriptionType)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(user.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`text-sm font-medium ${user.role === 'admin' ? 'text-blue-400' : 'text-gray-400'}`}>
                                                {user.role === 'admin' ? 'ADMIN' : 'USER'}
                                            </span>
                                        </td>
                                        {/* ✅ Real isVerified badge */}
                                        <td className="pl-3 pr-6 py-4 whitespace-nowrap">
                                            {user.isEmailVerified ? (
                                                <span className="flex items-center gap-1.5 text-green-400 text-sm w-fit">
                                                    <Icon icon="solar:verified-check-bold" width="16" />
                                                    Vérifié
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-yellow-400 text-sm w-fit">
                                                    <Icon icon="solar:danger-circle-linear" width="16" />
                                                    Non vérifié
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right relative">
                                            <button
                                                className="action-menu-trigger p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                                onClick={(e) => handleOpenDropdown(e, user.id)}
                                            >
                                                <Icon icon="solar:menu-dots-linear" width="24" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <Icon icon="solar:user-rounded-broken" width="48" height="48" className="text-gray-600" />
                                            <p>Aucun utilisateur trouvé</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Pagination */}
                {filteredUsers.length > itemsPerPage && (
                    <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-500">
                        <span>Affichage de {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredUsers.length)} sur {filteredUsers.length} utilisateurs</span>
                        <div className="flex gap-2">
                            <button
                                className="px-3 py-1 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-50 transition-colors"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                            >
                                Précédent
                            </button>
                            <button
                                className="px-3 py-1 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-50 transition-colors"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                            >
                                Suivant
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Fixed Position Dropdown Portal */}
            {dropdownState && (
                <>
                    <div className="fixed inset-0 z-[50]" onClick={() => setDropdownState(null)} />
                    <div
                        className="fixed z-[60] w-64 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        style={{ top: dropdownState.top, right: dropdownState.right }}
                    >
                        <div className="p-2 space-y-1">
                            {(() => {
                                const user = users.find(u => u.id === dropdownState.userId);
                                if (!user) return null;
                                return (
                                    <>
                                        {/* Edit User */}
                                        <button
                                            onClick={() => handleOpenModal('edit', user)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group text-left"
                                        >
                                            <Icon icon="solar:pen-new-square-linear" width="20" className="text-teal-400 group-hover:text-white transition-colors" />
                                            <span className="text-sm font-medium text-gray-300 group-hover:text-white">Modifier</span>
                                        </button>

                                        {/* Role Management */}
                                        <button
                                            onClick={() => handleOpenModal('role', user)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group text-left"
                                        >
                                            <Icon icon="solar:shield-user-linear" width="20" className="text-blue-400 group-hover:text-white transition-colors" />
                                            <span className="text-sm font-medium text-gray-300 group-hover:text-white">Gérer le Rôle</span>
                                        </button>

                                        {/* Subscription */}
                                        <button
                                            onClick={() => handleOpenModal('subscription', user)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group text-left"
                                        >
                                            <Icon icon="solar:crown-star-linear" width="20" className="text-purple-400 group-hover:text-white transition-colors" />
                                            <span className="text-sm font-medium text-gray-300 group-hover:text-white">Changer l'Abonnement</span>
                                        </button>

                                        <div className="h-px bg-white/5 my-1" />

                                        {/* Block/Unblock */}
                                        <button
                                            onClick={() => handleOpenModal('block', user)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group text-left"
                                        >
                                            <Icon
                                                icon={user.status === 'blocked' ? 'solar:check-circle-linear' : 'solar:forbidden-circle-linear'}
                                                width="20"
                                                className={`transition-colors ${
                                                    user.status === 'blocked'
                                                    ? 'text-green-400 group-hover:text-white'
                                                    : 'text-orange-400 group-hover:text-white'
                                                }`}
                                            />
                                            <span className="text-sm font-medium text-gray-300 group-hover:text-white">
                                                {user.status === 'blocked' ? 'Débloquer' : 'Bloquer'}
                                            </span>
                                        </button>

                                        {/* Delete */}
                                        <button
                                            onClick={() => handleOpenModal('delete', user)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/10 transition-colors group text-left"
                                        >
                                            <Icon icon="solar:trash-bin-trash-linear" width="20" className="text-red-400 group-hover:text-red-300 transition-colors" />
                                            <span className="text-sm font-medium text-red-400 group-hover:text-red-300">Supprimer</span>
                                        </button>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </>
            )}

            {/* Modals */}
            {modalType && selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => { setModalType(null); setSelectedUser(null); }} />
                    <div className="relative w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                        {/* ── EDIT MODAL ── */}
                        {modalType === 'edit' && (
                            <>
                                <div className="h-20 w-full bg-teal-500/10 flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                                    <Icon icon="solar:pen-new-square-linear" width="30" className="text-teal-400 drop-shadow-lg" />
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="text-center mb-2">
                                        <h3 className="text-xl font-bold text-white">Modifier l'utilisateur</h3>
                                        <p className="text-gray-500 text-sm mt-1">{selectedUser.email}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Prénom</label>
                                            <input
                                                value={editForm.firstName}
                                                onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))}
                                                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500/50 transition-all"
                                                placeholder="Prénom"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Nom</label>
                                            <input
                                                value={editForm.lastName}
                                                onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))}
                                                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500/50 transition-all"
                                                placeholder="Nom"
                                            />
                                        </div>
                                    </div>
                                    {/* Verification toggle */}
                                    <div className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                        editForm.isVerified ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'
                                    }`} onClick={() => setEditForm(f => ({ ...f, isVerified: !f.isVerified }))}>
                                        <div className="flex items-center gap-3">
                                            <Icon
                                                icon={editForm.isVerified ? 'solar:verified-check-linear' : 'solar:danger-circle-linear'}
                                                width="20"
                                                className={editForm.isVerified ? 'text-green-400' : 'text-yellow-400'}
                                            />
                                            <div>
                                                <p className="text-sm font-medium text-white">Email vérifié</p>
                                                <p className="text-xs text-gray-500">
                                                    {editForm.isVerified ? 'Le compte est marqué comme vérifié' : 'Le compte n\'est pas vérifié'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`relative w-10 h-5 rounded-full transition-all ${editForm.isVerified ? 'bg-green-500' : 'bg-gray-700'}`}>
                                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${editForm.isVerified ? 'left-5' : 'left-0.5'}`} />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => { setModalType(null); setSelectedUser(null); }}
                                            className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            onClick={handleConfirmAction}
                                            disabled={isActionLoading}
                                            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white text-sm font-bold shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {isActionLoading ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <Icon icon="svg-spinners:ring-resize" width="16" /> En cours...
                                                </span>
                                            ) : 'Enregistrer'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── OTHER MODALS (role, block, delete, subscription) ── */}
                        {modalType !== 'edit' && (
                            <>
                                <div className={`h-24 w-full flex items-center justify-center relative overflow-hidden ${
                                    modalType === 'delete' ? 'bg-red-500/10' :
                                    modalType === 'block' ? 'bg-orange-500/10' :
                                    modalType === 'subscription' ? 'bg-purple-500/10' :
                                    'bg-blue-500/10'
                                }`}>
                                    <div className="absolute inset-0 opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                                    <Icon icon={
                                        modalType === 'delete' ? 'solar:trash-bin-trash-linear' :
                                        modalType === 'subscription' ? 'solar:crown-star-linear' :
                                        modalType === 'block' ? (selectedUser.status === 'blocked' ? 'solar:check-circle-linear' : 'solar:forbidden-circle-linear') :
                                        'solar:shield-user-linear'
                                    } width="32" className={`drop-shadow-lg ${
                                        modalType === 'delete' ? 'text-red-500' :
                                        modalType === 'subscription' ? 'text-purple-500' :
                                        modalType === 'block' ? (selectedUser.status === 'blocked' ? 'text-green-500' : 'text-orange-500') :
                                        'text-blue-500'
                                    }`} />
                                </div>

                                <div className="p-6">
                                    <div className="text-center mb-6">
                                        <h3 className="text-2xl font-bold text-white mb-3">
                                            {modalType === 'role' && 'Gestion du rôle'}
                                            {modalType === 'subscription' && 'Abonnement utilisateur'}
                                            {modalType === 'block' && (selectedUser.status === 'blocked' ? "Débloquer l'utilisateur" : "Bloquer l'utilisateur")}
                                            {modalType === 'delete' && "Supprimer l'utilisateur"}
                                        </h3>

                                        <div className="text-gray-400 leading-relaxed mb-6">
                                            {modalType === 'role' && `Voulez-vous vraiment ${selectedUser.role === 'admin' ? 'rétrograder' : 'attribuer le rôle administrateur à'} cet utilisateur ?`}

                                            {/* ✅ Subscription — 3 buttons side by side with icons */}
                                            {modalType === 'subscription' && (
                                                <div className="space-y-4">
                                                    <p>Sélectionnez le plan pour <span className="text-white font-semibold">{selectedUser.firstName}</span> :</p>
                                                    <div className="flex bg-black/20 p-1.5 rounded-xl border border-white/10 relative">
                                                        {([
                                                            { id: 'free', label: 'Gratuit', icon: 'solar:crown-linear', color: 'text-yellow-400', activeBg: 'bg-yellow-500/10 border-yellow-500/50', activeText: 'text-yellow-400' },
                                                            { id: 'premium', label: 'Premium', icon: 'solar:cup-first-linear', color: 'text-blue-400', activeBg: 'bg-blue-500/10 border-blue-500/50', activeText: 'text-blue-400' },
                                                            { id: 'vip', label: 'VIP', icon: 'solar:crown-star-linear', color: 'text-purple-400', activeBg: 'bg-purple-500/10 border-purple-500/50', activeText: 'text-purple-400' },
                                                        ] as const).map((plan) => (
                                                            <button
                                                                key={plan.id}
                                                                onClick={() => setSelectedPlan(plan.id)}
                                                                className={`relative flex-1 py-2.5 px-3 text-sm font-bold rounded-lg transition-colors z-10 ${
                                                                    selectedPlan === plan.id
                                                                    ? `${plan.activeText}`
                                                                    : 'text-gray-400 hover:text-gray-200'
                                                                }`}
                                                            >
                                                                {selectedPlan === plan.id && (
                                                                    <motion.div
                                                                        layoutId="adminUsersSubscriptionActive"
                                                                        className={`absolute inset-0 ${plan.activeBg} border rounded-lg`}
                                                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                                                    />
                                                                )}
                                                                <span className="relative flex items-center justify-center gap-2">
                                                                    <Icon icon={plan.icon} width="18" className={plan.color} />
                                                                    <span className="text-xs font-bold">{plan.label}</span>
                                                                    {selectedPlan === plan.id && (
                                                                        <Icon icon="solar:check-circle-linear" width="16" />
                                                                    )}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {modalType === 'block' && `Êtes-vous vraiment sûr de vouloir ${selectedUser.status === 'blocked' ? 'débloquer' : 'bloquer'} cet utilisateur ?`}
                                            {modalType === 'delete' && 'Êtes-vous vraiment sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.'}
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => { setModalType(null); setSelectedUser(null); }}
                                            className="flex-1 px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all hover:scale-[1.02]"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            onClick={handleConfirmAction}
                                            disabled={isActionLoading}
                                            className={`flex-1 px-6 py-3.5 rounded-xl text-white text-sm font-bold shadow-lg shadow-black/20 transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                                                modalType === 'delete' || (modalType === 'block' && selectedUser.status !== 'blocked')
                                                ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400'
                                                : modalType === 'subscription'
                                                ? 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400'
                                                : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400'
                                            }`}
                                        >
                                            {isActionLoading ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <Icon icon="svg-spinners:ring-resize" width="16" />
                                                    En cours...
                                                </span>
                                            ) : 'Confirmer'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersView;
