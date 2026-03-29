import React from 'react';
import { Icon } from '@iconify/react';

interface AdminSidebarProps {
    user: any;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ user, activeTab = 'overview', onTabChange }) => {
    // Liste simple des éléments du menu
    const menuItems = [
        { id: 'overview', label: "Vue d'ensemble", icon: "solar:widget-5-linear" },
        { id: 'users', label: "Utilisateurs", icon: "solar:users-group-rounded-linear" },
        { id: 'movies', label: "Films", icon: "solar:clapperboard-play-linear" },
        { id: 'series', label: "Séries", icon: "solar:play-stream-linear" },
        { id: 'channels', label: "Chaînes TV", icon: "solar:tv-linear" },
        { id: 'requests', label: "Demandes", icon: "solar:clipboard-list-linear", badge: 12 },
        { id: 'notifications', label: "Notifications", icon: "solar:bell-linear", badge: 5 }
    ];

    return (
        <aside 
            className="fixed left-0 top-0 h-screen w-64 bg-black/95 backdrop-blur-xl border-r border-white/20 p-6 z-20 flex flex-col overflow-hidden"
        >
            {/* Logo */}
            <div className="flex items-center gap-3 mb-14 px-2">
                <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L20.5 6.5V17.5L12 22L3.5 17.5V6.5L12 2Z" fill="white" fillOpacity="0.9" />
                        <path d="M12 7L16.5 9.5V14.5L12 17L7.5 14.5V9.5L12 7Z" fill="#2563EB" />
                    </svg>
                </div>
                <span className="font-bold text-xl tracking-tight text-white">Admin</span>
            </div>

            {/* Navigation */}
            <nav 
                className="flex-1 overflow-y-auto overflow-x-hidden space-y-1 pb-4 no-scrollbar"
                style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none' 
                }}
            >
                <style jsx global>{`
                    .no-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                    .no-scrollbar {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                `}</style>
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onTabChange && onTabChange(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative cursor-pointer ${activeTab === item.id
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        {/* Active Indicator (Blue Line on Border) */}
                        {activeTab === item.id && (
                            <div className="absolute right-[-24px] top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                        )}

                        <Icon 
                            icon={item.icon} 
                            width="22" 
                            height="22" 
                            className={activeTab === item.id ? 'text-white' : 'text-gray-500 group-hover:text-white transition-colors'}
                        />
                        <span className="font-medium text-sm flex-1 text-left">{item.label}</span>

                        {/* Badge (Simple Number) */}
                        {item.badge && (
                            <span className={`text-xs font-bold ${
                                activeTab === item.id ? 'text-white' : 'text-gray-500 group-hover:text-white'
                            }`}>
                                {item.badge}
                            </span>
                        )}
                    </button>
                ))}
            </nav>
        </aside>
    );
};

export default AdminSidebar;
