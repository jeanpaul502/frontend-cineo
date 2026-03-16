import React from 'react';
import { Icon } from '@iconify/react';
import { X, Tv, Trash2, Power, Plus } from 'lucide-react';
import { Playlist, Channel } from '../../services/channels.service';

interface ManageChannelsModalProps {
    isOpen: boolean;
    onClose: () => void;
    playlist: Playlist | null;
    onAddChannel: () => void;
    onDeleteChannel: (channelId: string) => void;
    onToggleStatus: (channelId: string) => void;
}

const ManageChannelsModal: React.FC<ManageChannelsModalProps> = ({
    isOpen,
    onClose,
    playlist,
    onAddChannel,
    onDeleteChannel,
    onToggleStatus
}) => {
    if (!isOpen || !playlist) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 w-full max-w-3xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Tv className="w-5 h-5 text-blue-500" />
                            Gérer les chaînes - {playlist.name}
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            {playlist.channels.length} chaînes dans cette playlist
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="text-sm text-slate-400">
                            {playlist.channels.length} chaînes dans cette playlist
                        </div>
                        <button
                            onClick={onAddChannel}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl text-sm font-medium transition-all transform hover:scale-105 shadow-lg shadow-blue-500/20"
                        >
                            <Plus className="w-4 h-4" />
                            Ajouter une chaîne
                        </button>
                    </div>

                    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-700">
                                <tr>
                                    <th className="p-4 font-semibold uppercase tracking-wider text-xs">Nom</th>
                                    <th className="p-4 font-semibold uppercase tracking-wider text-xs">URL</th>
                                    <th className="p-4 font-semibold uppercase tracking-wider text-xs text-center">Statut</th>
                                    <th className="p-4 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {playlist.channels.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <Icon icon="mdi:television-off" width="24" height="24" />
                                                <p className="text-sm">Aucune chaîne dans cette playlist</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    playlist.channels.map((channel) => (
                                        <tr key={channel.id} className="hover:bg-slate-800/50 transition-colors group">
                                            <td className="p-4 text-white font-medium">
                                                {channel.name}
                                            </td>
                                            <td className="p-4 text-slate-400 text-sm max-w-[200px] truncate">
                                                {channel.url}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                                                    channel.status === 'active' 
                                                        ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${channel.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                                    {channel.status === 'active' ? 'Actif' : 'Inactif'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => onToggleStatus(channel.id)}
                                                        className={`p-2 rounded-lg transition-colors ${
                                                            channel.status === 'active'
                                                                ? 'text-green-400 hover:bg-green-500/10'
                                                                : 'text-slate-400 hover:bg-slate-500/10'
                                                        }`}
                                                        title={channel.status === 'active' ? 'Désactiver' : 'Activer'}
                                                    >
                                                        <Power className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => onDeleteChannel(channel.id)}
                                                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageChannelsModal;
