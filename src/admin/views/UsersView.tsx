import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
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

const UsersView: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, online, offline, blocked
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
    const [modalType, setModalType] = useState<'role' | 'subscription' | 'block' | 'delete' | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium' | 'vip'>('free');

    useEffect(() => {
        fetchUsers();
        // Refresh every 30 seconds to update online status
        const interval = setInterval(fetchUsers, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchUsers = async () => {
        try {
            // Only set loading on first load
            if (users.length === 0) setIsLoading(true);
            const data = await usersService.getAllUsers();
            
            // Map API data to UI format
            const mappedUsers: User[] = data.map(u => {
                // Determine status
                let status: 'online' | 'offline' | 'blocked' = 'offline';
                if (u.accountStatus === 'blocked') {
                    status = 'blocked';
                } else if (u.lastActive) {
                    const lastActive = new Date(u.lastActive).getTime();
                    // Consider online if active in last 5 minutes
                    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
                    if (lastActive > fiveMinutesAgo) {
                        status = 'online';
                    }
                }

                // Parse device string or use defaults
                let deviceObj = { type: 'unknown', os: 'Unknown', name: 'Unknown' };
                if (u.lastDevice) {
                    const lowerDevice = u.lastDevice.toLowerCase();
                    let type = 'computer';
                    if (lowerDevice.includes('mobile') || lowerDevice.includes('android') || lowerDevice.includes('iphone')) type = 'phone';
                    if (lowerDevice.includes('tablet') || lowerDevice.includes('ipad')) type = 'tablet';
                    
                    deviceObj = {
                        type,
                        os: u.lastDevice, // Simplified mapping
                        name: u.lastDevice
                    };
                }

                return {
                    ...u,
                    status,
                    location: (u.lastCity && u.lastCountry) ? `${u.lastCity}, ${u.lastCountry}` : (u.lastCountry || 'Inconnu'),
                    countryCode: u.lastCountryCode,
                    ipAddress: u.lastIp || 'Inconnu',
                    isEmailVerified: true, // Assuming true for now
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
        const menuHeight = 200; // Approximate height
        
        // Determine if menu should open upwards
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

    const handleOpenModal = (type: 'role' | 'subscription' | 'block' | 'delete', user: any) => {
        setDropdownState(null);
        setSelectedUser(user);
        setModalType(type);
        setActiveMenu(null);
        if (type === 'subscription') {
            setSelectedPlan(user.subscriptionType);
        }
    };

    const handleConfirmAction = async () => {
        if (!selectedUser || !modalType) return;

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
                    setUsers(users.filter(u => u.id !== selectedUser.id));
                    setModalType(null);
                    setSelectedUser(null);
                    return;
                default:
                    return;
            }

            // Call backend API
            const updatedUser = await usersService.updateUser(selectedUser.id, updates);

            // Update local state
            setUsers(users.map(u => {
                if (u.id === selectedUser.id) {
                    // Re-apply computed fields on top of updated user
                    const status = updates.accountStatus === 'blocked' ? 'blocked' : (u.status === 'blocked' ? 'offline' : u.status);
                    return {
                        ...u,
                        ...updates,
                        status
                    };
                }
                return u;
            }));

        } catch (error) {
            console.error('Failed to update user:', error);
            // Optionally show error notification
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

    const handleRefresh = () => {
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
        }, 1000);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'online':
                return (
                    <span className="text-sm font-medium text-green-400 flex items-center gap-1.5 w-fit">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/> En ligne
                    </span>
                );
            case 'offline':
                return (
                    <span className="text-sm font-medium text-yellow-400 w-fit">Hors ligne</span>
                );
            case 'blocked':
                return (
                    <span className="text-sm font-medium text-red-400 w-fit">Bloqué</span>
                );
            default:
                return null;
        }
    };

    const getDeviceDisplay = (device: any) => {
        // Return the full device name if available (e.g. "iPhone 12 Pro", "Windows 10")
        if (device.name && device.name !== 'Unknown') {
            return device.name;
        }

        const os = device.os.toLowerCase();
        if (os.includes('ios') || device.name.toLowerCase().includes('iphone')) return 'iPhone';
        if (os.includes('android')) return 'Android';
        if (os.includes('windows')) return 'Windows';
        if (os.includes('mac') || os.includes('macos')) return 'Mac';
        if (os.includes('linux')) return 'Linux';
        return device.type.charAt(0).toUpperCase() + device.type.slice(1);
    };

    const getDeviceIcon = (type: string, os: string) => {
        const osLower = os.toLowerCase();
        if (osLower.includes('android')) return 'solar:smartphone-linear';
        if (osLower.includes('ios')) return 'solar:smartphone-linear';
        if (osLower.includes('windows') || osLower.includes('mac') || osLower.includes('linux')) return 'solar:laptop-minimalistic-linear';
        
        switch (type) {
            case 'computer': return 'solar:laptop-minimalistic-linear';
            case 'phone': return 'solar:smartphone-linear';
            case 'tablet': return 'solar:tablet-linear';
            default: return 'solar:devices-linear';
        }
    };

    const getSubscriptionBadge = (type: string) => {
        switch (type) {
            case 'vip':
                return <span className="text-sm font-bold text-purple-400 flex items-center gap-1.5 w-fit"><Icon icon="solar:crown-star-bold" width="16" /> VIP</span>;
            case 'premium':
                return <span className="text-sm font-medium text-blue-400 flex items-center gap-1.5 w-fit"><Icon icon="solar:cup-first-bold" width="16" /> Premium</span>;
            case 'free':
                return <span className="text-sm font-medium text-yellow-400 flex items-center gap-1.5 w-fit"><Icon icon="solar:crown-bold" width="16" /> Gratuit</span>;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Filters Bar */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between backdrop-blur-sm">
                {/* Search */}
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

                {/* Filter Tabs */}
                <div className="flex items-center bg-black/20 p-1 rounded-xl border border-white/5 w-full md:w-auto overflow-x-auto">
                    {['all', 'online', 'blocked'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                                statusFilter === status 
                                ? 'bg-white/10 text-white shadow-sm' 
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {status === 'all' && 'Tous'}
                            {status === 'online' && 'En ligne'}
                            {status === 'blocked' && 'Bloqués'}
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
                            {paginatedUsers.length > 0 ? (
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
                                                    <img 
                                                        src={`https://flagcdn.com/w40/${user.countryCode.toLowerCase()}.png`} 
                                                        width="24" 
                                                        alt={user.location} 
                                                    />
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
                                            {/* Subscription Badge (Disabled/Hidden or Static) */}
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
                                        <td className="pl-3 pr-6 py-4 whitespace-nowrap">
                                            {user.isEmailVerified ? (
                                                <span className="flex items-center gap-1.5 text-green-400 text-sm w-fit">
                                                    <Icon icon="solar:verified-check-bold" width="16" />
                                                    Vérifié
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-yellow-400 text-sm w-fit">
                                                    <Icon icon="solar:danger-circle-linear" width="16" />
                                                    En attente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right relative">
                                            <button 
                                                className="action-menu-trigger p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                                onClick={(e) => handleOpenDropdown(e, user.id)}
                                            >
                                                <Icon icon="solar:menu-dots-bold" width="24" />
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
                        style={{
                            top: dropdownState.top,
                            right: dropdownState.right,
                        }}
                    >
                        <div className="p-2 space-y-1">
                            {(() => {
                                const user = users.find(u => u.id === dropdownState.userId);
                                if (!user) return null;
                                return (
                                    <>
                                        {/* Role Management */}
                                        <button 
                                            onClick={() => handleOpenModal('role', user)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group text-left"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                                <Icon icon="solar:shield-user-bold-duotone" width="20" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-300 group-hover:text-white">Gérer le Rôle</span>
                                        </button>

                                        {/* Subscription */}
                                        <button 
                                            onClick={() => handleOpenModal('subscription', user)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group text-left"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                                <Icon icon="solar:crown-star-bold-duotone" width="20" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-300 group-hover:text-white">Changer l'Abonnement</span>
                                        </button>

                                        <div className="h-px bg-white/5 my-1" />

                                        {/* Block/Unblock */}
                                        <button 
                                            onClick={() => handleOpenModal('block', user)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group text-left"
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                                user.status === 'blocked'
                                                ? 'bg-green-500/10 text-green-500 group-hover:bg-green-500 group-hover:text-white'
                                                : 'bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-white'
                                            }`}>
                                                <Icon icon={user.status === 'blocked' ? 'solar:check-circle-bold-duotone' : 'solar:forbidden-circle-bold-duotone'} width="20" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-300 group-hover:text-white">
                                                {user.status === 'blocked' ? 'Débloquer' : 'Bloquer'}
                                            </span>
                                        </button>

                                        {/* Delete */}
                                        <button 
                                            onClick={() => handleOpenModal('delete', user)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/10 transition-colors group text-left"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                                                <Icon icon="solar:trash-bin-trash-bold-duotone" width="20" />
                                            </div>
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
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setModalType(null)} />
                    <div className="relative w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        
                        {/* Modal Header Decoration */}
                        <div className={`h-24 w-full flex items-center justify-center relative overflow-hidden ${
                            modalType === 'delete' ? 'bg-red-500/10' :
                            modalType === 'block' ? 'bg-orange-500/10' :
                            modalType === 'subscription' ? 'bg-purple-500/10' :
                            'bg-blue-500/10'
                        }`}>
                            <div className={`absolute inset-0 opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]`} />
                            <Icon icon={
                                modalType === 'delete' ? 'solar:trash-bin-trash-bold-duotone' :
                                modalType === 'subscription' ? 'solar:crown-star-bold-duotone' :
                                modalType === 'block' ? (selectedUser.status === 'blocked' ? 'solar:check-circle-bold-duotone' : 'solar:forbidden-circle-bold-duotone') :
                                'solar:shield-user-bold-duotone'
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
                                    {modalType === 'block' && (selectedUser.status === 'blocked' ? 'Débloquer l\'utilisateur' : 'Bloquer l\'utilisateur')}
                                    {modalType === 'delete' && 'Supprimer l\'utilisateur'}
                                </h3>
                                
                                <div className="text-gray-400 leading-relaxed mb-6">
                                    {modalType === 'role' && `Voulez-vous vraiment ${selectedUser.role === 'admin' ? 'rétrograder' : 'attribuer le rôle administrateur à'} cet utilisateur ?`}
                                    {modalType === 'subscription' && (
                                        <div className="space-y-4">
                                            <p>Sélectionnez le nouveau plan d'abonnement pour {selectedUser.firstName} :</p>
                                            <div className="grid grid-cols-1 gap-2">
                                                {['free', 'premium', 'vip'].map((plan) => (
                                                    <button
                                                        key={plan}
                                                        onClick={() => setSelectedPlan(plan as any)}
                                                        className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                                                            selectedPlan === plan 
                                                            ? 'bg-purple-500/10 border-purple-500/50 text-purple-400' 
                                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                                        }`}
                                                    >
                                                        <span className="capitalize">{plan === 'free' ? 'Gratuit' : plan}</span>
                                                        {selectedPlan === plan && <Icon icon="solar:check-circle-bold" width="20" />}
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
                                    onClick={() => setModalType(null)}
                                    className="flex-1 px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all hover:scale-[1.02]"
                                >
                                    Annuler
                                </button>
                                <button 
                                    onClick={handleConfirmAction}
                                    className={`flex-1 px-6 py-3.5 rounded-xl text-white text-sm font-bold shadow-lg shadow-black/20 transition-all hover:scale-[1.02] ${
                                        modalType === 'delete' || (modalType === 'block' && selectedUser.status !== 'blocked')
                                        ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400' 
                                        : modalType === 'subscription'
                                        ? 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400'
                                        : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400'
                                    }`}
                                >
                                    Confirmer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersView;
