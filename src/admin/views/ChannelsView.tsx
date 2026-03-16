import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { channelsService, Playlist, Channel } from '../../services/channels.service';
import ChannelModal from '../components/ChannelModal';
import ManageChannelsModal from '../components/ManageChannelsModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { showSuccessToast, showErrorToast } from '../../lib/toast';
import { countries, getCountryFlagUrl } from '../../lib/countries';
import {
    Plus,
    RefreshCw,
    Trash2,
    Globe,
    ChevronDown,
    Check,
    Link as LinkIcon,
    X,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    Search,
    MoreVertical,
    Edit,
    Power,
    Ban,
    Filter
} from 'lucide-react';

const ChannelsView: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [dropdownState, setDropdownState] = useState<{
        playlistId: string;
        top: number;
        right: number;
    } | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const menuRef = useRef<HTMLDivElement>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create_playlist' | 'add_channel'>('create_playlist');
    const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

    // Manage Modal State
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [managingPlaylist, setManagingPlaylist] = useState<Playlist | null>(null);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDestructive: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        isDestructive: false
    });

    useEffect(() => {
        fetchPlaylists();
    }, []);

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

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.action-menu-trigger') && !target.closest('.action-menu-dropdown')) {
                setActiveMenu(null);
                setDropdownState(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchPlaylists = async () => {
        try {
            setIsLoading(true);
            const data = await channelsService.getAllPlaylists();
            setPlaylists(data);
        } catch (error) {
            console.error('Error fetching playlists:', error);
            showErrorToast('Erreur', 'Erreur lors du chargement des playlists');
        } finally {
            setIsLoading(false);
        }
    };

    const refreshPlaylists = () => {
        const data = JSON.parse(localStorage.getItem('playlists') || '[]');
        setPlaylists(data);
    };

    const handleOpenDropdown = (e: React.MouseEvent, playlistId: string) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const menuHeight = 150; // Approximate height
        
        const spaceBelow = windowHeight - rect.bottom;
        const openUpwards = spaceBelow < menuHeight;

        setDropdownState({
            playlistId,
            top: openUpwards ? rect.top - 8 : rect.bottom + 8,
            right: window.innerWidth - rect.right
        });
        setActiveMenu(playlistId);
    };

    const handleSave = async (data: any) => {
        try {
            if (modalMode === 'create_playlist') {
                if (selectedPlaylist) {
                    // Mode édition
                    const updatedPlaylist = await channelsService.updatePlaylist(selectedPlaylist.id, {
                        name: data.playlistName,
                        country: data.country,
                        countryCode: data.countryCode
                    });
                    setPlaylists(playlists.map(p => p.id === updatedPlaylist.id ? updatedPlaylist : p));
                    showSuccessToast('Succès', 'Playlist modifiée avec succès');
                } else {
                    // Mode création - créer une playlist vide sans chaînes
                    const newPlaylist = await channelsService.createPlaylist({
                        name: data.playlistName,
                        country: data.country,
                        countryCode: data.countryCode,
                        status: 'active',
                        channels: [] // Playlist vide au départ
                    });
                    setPlaylists([...playlists, newPlaylist]);
                    showSuccessToast('Succès', 'Playlist créée avec succès');
                }
            } else if (modalMode === 'add_channel' && selectedPlaylist) {
                // Pour l'ajout de chaînes via extraction M3U, on rafraîchit simplement la playlist
                if (data.playlistId) {
                    refreshPlaylists();
                    showSuccessToast('Succès', 'Chaînes ajoutées avec succès');
                } else {
                    // Mode traditionnel d'ajout d'une seule chaîne (fallback)
                    const updatedPlaylist = await channelsService.addChannelToPlaylist(selectedPlaylist.id, {
                        name: data.channelName,
                        url: data.channelUrl
                    });
                    setPlaylists(playlists.map(p => p.id === updatedPlaylist.id ? updatedPlaylist : p));
                    showSuccessToast('Succès', 'Chaîne ajoutée avec succès');
                }
            }
        } catch (error) {
            console.error('Error saving:', error);
            showErrorToast('Erreur', 'Une erreur est survenue');
            throw error;
        }
    };

    const handleDeletePlaylist = (playlistId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Supprimer la playlist',
            message: 'Êtes-vous sûr de vouloir supprimer cette playlist ? Cette action est irréversible.',
            isDestructive: true,
            onConfirm: async () => {
                try {
                    await channelsService.deletePlaylist(playlistId);
                    setPlaylists(playlists.filter(p => p.id !== playlistId));
                    setDropdownState(null);
                    showSuccessToast('Succès', 'Playlist supprimée');
                } catch (error) {
                    console.error('Error deleting playlist:', error);
                    showErrorToast('Erreur', 'Erreur lors de la suppression');
                }
            }
        });
    };

    const handleTogglePlaylistStatus = async (playlistId: string) => {
        try {
            const updatedPlaylist = await channelsService.togglePlaylistStatus(playlistId);
            setPlaylists(playlists.map(p => p.id === playlistId ? updatedPlaylist : p));
            setDropdownState(null);
            showSuccessToast('Succès', 'Statut mis à jour');
        } catch (error) {
            console.error('Error toggling status:', error);
            showErrorToast('Erreur', 'Erreur lors de la mise à jour du statut');
        }
    };

    const handleDeleteChannel = (channelId: string) => {
        if (!managingPlaylist) return;
        
        setConfirmModal({
            isOpen: true,
            title: 'Supprimer la chaîne',
            message: 'Êtes-vous sûr de vouloir supprimer cette chaîne ?',
            isDestructive: true,
            onConfirm: async () => {
                try {
                    const updatedPlaylist = await channelsService.removeChannelFromPlaylist(managingPlaylist.id, channelId);
                    setManagingPlaylist(updatedPlaylist);
                    setPlaylists(playlists.map(p => p.id === updatedPlaylist.id ? updatedPlaylist : p));
                    showSuccessToast('Succès', 'Chaîne supprimée');
                } catch (error) {
                    console.error('Error deleting channel:', error);
                    showErrorToast('Erreur', 'Erreur lors de la suppression de la chaîne');
                }
            }
        });
    };

    const handleToggleChannelStatus = async (channelId: string) => {
        if (!managingPlaylist) return;

        try {
            const updatedPlaylist = await channelsService.toggleChannelStatus(managingPlaylist.id, channelId);
            setManagingPlaylist(updatedPlaylist);
            setPlaylists(playlists.map(p => p.id === updatedPlaylist.id ? updatedPlaylist : p));
            showSuccessToast('Succès', 'Statut de la chaîne mis à jour');
        } catch (error) {
            console.error('Error toggling channel status:', error);
            showErrorToast('Erreur', 'Erreur lors de la mise à jour du statut');
        }
    };

    const openAddChannelModal = (playlist: Playlist) => {
        setSelectedPlaylist(playlist);
        setModalMode('add_channel');
        setIsModalOpen(true);
        setDropdownState(null);
        // We don't close manage modal if it's open, but maybe we should?
        // Actually, if we open "Add Channel", we might want to refresh manage modal after.
        // But the handlers update the state, so it should be fine.
        // If manage modal is open, we can keep it open or close it.
        // Let's close manage modal to avoid stacking.
        setIsManageModalOpen(false);
    };

    const openManageModal = (playlist: Playlist) => {
        setManagingPlaylist(playlist);
        setIsManageModalOpen(true);
        setDropdownState(null);
    };

    const handleEditPlaylist = (playlist: Playlist) => {
        setSelectedPlaylist(playlist);
        setModalMode('create_playlist');
        setIsModalOpen(true);
        setDropdownState(null);
    };

    const filteredPlaylists = playlists.filter(playlist => {
        const matchesSearch = 
            playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            playlist.country.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesStatus = 
            statusFilter === 'all' || 
            (statusFilter === 'active' && playlist.status === 'active') || 
            (statusFilter === 'inactive' && playlist.status === 'inactive');

        return matchesSearch && matchesStatus;
    });

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredPlaylists.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredPlaylists.length / itemsPerPage);

    return (
        <div className="space-y-6">
            {/* Header / Actions */}
            <div className="flex flex-col xl:flex-row justify-between items-center gap-4">
                {/* Left: Filters */}
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700/50 shadow-lg">
                    <button
                        onClick={() => {
                            setStatusFilter('all');
                            setCurrentPage(1);
                        }}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                            statusFilter === 'all'
                            ? 'bg-slate-700 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <Filter className="w-3.5 h-3.5" />
                        Tous
                    </button>
                    <button
                        onClick={() => {
                            setStatusFilter('active');
                            setCurrentPage(1);
                        }}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                            statusFilter === 'active'
                            ? 'bg-green-500/20 text-green-400 shadow-sm'
                            : 'text-slate-400 hover:text-green-400'
                        }`}
                    >
                        <div className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'active' ? 'bg-green-400' : 'bg-slate-500'}`} />
                        Actifs
                    </button>
                    <button
                        onClick={() => {
                            setStatusFilter('inactive');
                            setCurrentPage(1);
                        }}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                            statusFilter === 'inactive'
                            ? 'bg-red-500/20 text-red-400 shadow-sm'
                            : 'text-slate-400 hover:text-red-400'
                        }`}
                    >
                        <div className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'inactive' ? 'bg-red-400' : 'bg-slate-500'}`} />
                        Inactifs
                    </button>
                </div>

                {/* Center: Search Bar */}
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Rechercher une playlist ou un pays..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full bg-slate-900 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-500 shadow-lg"
                    />
                </div>

                {/* Right: Add Playlist Button */}
                <button
                    onClick={() => {
                        setSelectedPlaylist(null);
                        setModalMode('create_playlist');
                        setIsModalOpen(true);
                    }}
                    className="px-4 py-2 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all transform hover:scale-105 font-medium text-sm whitespace-nowrap"
                >
                    <Plus className="h-4 w-4" />
                    Ajouter une playlist
                </button>
            </div>

            {/* Table Card */}
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-xl">
                {/* Table Header */}
                <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/50 rounded-t-2xl">
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-400" />
                        Playlists Disponibles
                    </h3>
                    <button
                        onClick={fetchPlaylists}
                        className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        title="Actualiser"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-700">
                            <tr>
                                <th className="p-4 font-semibold uppercase tracking-wider text-xs w-1/4">Playlist</th>
                                <th className="p-4 font-semibold uppercase tracking-wider text-xs w-1/4">Pays</th>
                                <th className="p-4 font-semibold uppercase tracking-wider text-xs text-center w-1/6">Chaînes</th>
                                <th className="p-4 font-semibold uppercase tracking-wider text-xs w-1/6">Statut</th>
                                <th className="p-4 font-semibold uppercase tracking-wider text-xs w-1/6">Date de création</th>
                                <th className="p-4 font-semibold uppercase tracking-wider text-xs text-right w-1/6">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Icon icon="svg-spinners:3-dots-fade" width="24" height="24" />
                                            <p className="text-sm">Chargement des playlists...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400">
                                        Aucune playlist trouvée. Commencez par en ajouter une.
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((playlist) => (
                                    <tr key={playlist.id} className="hover:bg-slate-800/50 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-6 bg-slate-700 rounded shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                                                    {(() => {
                                                        const country = countries.find(c => c.name === playlist.country);
                                                        const flagUrl = country ? getCountryFlagUrl(country.code) : null;
                                                        return flagUrl ? (
                                                            <img
                                                                src={flagUrl}
                                                                alt={playlist.country}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : null;
                                                    })()}
                                                </div>
                                                <span className="font-medium text-white">{playlist.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-6 bg-slate-700 rounded shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                                                    {(() => {
                                                        const country = countries.find(c => c.name === playlist.country);
                                                        const flagUrl = country ? getCountryFlagUrl(country.code) : null;
                                                        return flagUrl ? (
                                                            <img
                                                                src={flagUrl}
                                                                alt={playlist.country}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : null;
                                                    })()}
                                                </div>
                                                <span className="font-medium text-white">{playlist.country}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="text-sm font-medium text-slate-300">
                                                {playlist.channels.length} chaînes
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${playlist.status === 'active'
                                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${playlist.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                                {playlist.status === 'active' ? 'Actif' : 'Inactif'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-400 text-xs">
                                            {new Date(playlist.createdAt || Date.now()).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className="p-4 text-right relative">
                                            <button
                                                onClick={(e) => handleOpenDropdown(e, playlist.id)}
                                                className={`p-2 rounded-lg transition-colors ${
                                                    activeMenu === playlist.id 
                                                    ? 'bg-slate-800 text-white' 
                                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                }`}
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                            Page {currentPage} sur {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Dropdown Menu Portal */}
            {dropdownState && (
                <div 
                    ref={menuRef}
                    className="fixed z-50 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 action-menu-dropdown"
                    style={{
                        top: dropdownState.top,
                        right: dropdownState.right,
                        position: 'fixed'
                    }}
                >
                    <div className="p-1 space-y-1">
                        <button
                            onClick={() => {
                                const playlist = playlists.find(p => p.id === dropdownState.playlistId);
                                if (playlist) openAddChannelModal(playlist);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Ajouter une chaîne
                        </button>
                        <button
                            onClick={() => {
                                const playlist = playlists.find(p => p.id === dropdownState.playlistId);
                                if (playlist) openManageModal(playlist);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                        >
                            <Icon icon="solar:list-check-linear" width="16" height="16" />
                            Gérer les chaînes
                        </button>
                        <button
                            onClick={() => {
                                const playlist = playlists.find(p => p.id === dropdownState.playlistId);
                                if (playlist) handleEditPlaylist(playlist);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                        >
                            <Edit className="w-4 h-4" />
                            Modifier
                        </button>
                        <button
                            onClick={() => handleTogglePlaylistStatus(dropdownState.playlistId)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-amber-400 hover:bg-amber-500/10"
                        >
                            <Power className="w-4 h-4" />
                            Activer/Désactiver
                        </button>
                        <div className="h-px bg-slate-700/50 my-1" />
                        <button
                            onClick={() => handleDeletePlaylist(dropdownState.playlistId)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Supprimer
                        </button>
                    </div>
                </div>
            )}

            <ChannelModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                mode={modalMode}
                playlist={selectedPlaylist}
            />

            <ManageChannelsModal
                isOpen={isManageModalOpen}
                onClose={() => setIsManageModalOpen(false)}
                playlist={managingPlaylist}
                onAddChannel={() => managingPlaylist && openAddChannelModal(managingPlaylist)}
                onDeleteChannel={handleDeleteChannel}
                onToggleStatus={handleToggleChannelStatus}
            />
            
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isDestructive={confirmModal.isDestructive}
            />
        </div>
    );
};

export default ChannelsView;
