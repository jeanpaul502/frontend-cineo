import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '../../services/auth.service';
import { Icon } from '@iconify/react';

interface AdminNavbarProps {
    title: string;
    description?: string;
    user: any;
    onTabChange?: (tab: string) => void;
}

const AdminNavbar: React.FC<AdminNavbarProps> = ({ title, description, user, onTabChange }) => {
    const router = useRouter();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    const handleLogout = async () => {
        try {
            await authService.logout();
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
            router.push('/login');
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const displayName = user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`
        : user?.email || 'Administrateur';

    const userImage = user?.profilePicture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1780&auto=format&fit=crop";

    return (
        <header className="h-20 border-b border-white/10 bg-black/40 backdrop-blur-xl flex justify-between items-center px-8 sticky top-0 z-10">
            <div>
                <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
            </div>

            <div className="flex items-center gap-6">
                {/* User Dropdown */}
                <div className="relative" ref={userMenuRef}>
                    <div
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    >
                        <div className="h-9 w-9 overflow-hidden rounded-lg border-2 border-transparent group-hover:border-blue-500 transition-all">
                            <img src={userImage} alt="User" className="w-full h-full object-cover" />
                        </div>
                        <Icon 
                            icon="solar:alt-arrow-down-linear"
                            width="16"
                            height="16"
                            className={`text-gray-400 group-hover:text-white transition-all ${isUserMenuOpen ? 'rotate-180' : ''}`}
                        />
                    </div>

                    {/* Dropdown Menu */}
                    {isUserMenuOpen && (
                        <div className="absolute right-0 mt-3 w-72 bg-black border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            {/* User Info */}
                            <div className="p-4 border-b border-white/10 bg-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-blue-500">
                                        <img src={userImage} alt="User" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-bold text-white truncate">{displayName}</p>
                                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Menu Items */}
                            <div className="py-2 flex flex-col gap-1">
                                <button 
                                    onClick={() => router.push('/dashboard')}
                                    className="group relative mx-2 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                                >
                                    {/* Hover Indicator Line */}
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-blue-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-all shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>

                                    <Icon icon="solar:earth-linear" width="20" height="20" className="text-gray-400 group-hover:text-white transition-colors" />
                                    <span className="text-white font-medium">Retour au site</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default AdminNavbar;
