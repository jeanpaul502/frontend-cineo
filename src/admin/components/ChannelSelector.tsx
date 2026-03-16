import React, { useState } from 'react';
import { Check, Tv, Globe, Loader2, AlertCircle } from 'lucide-react';
import { ParsedChannel } from '../../services/channels.service';

interface ChannelSelectorProps {
    channels: ParsedChannel[];
    existingChannels: ParsedChannel[];
    isLoading: boolean;
    onConfirm: (selectedChannels: ParsedChannel[]) => void;
    onCancel: () => void;
}

const ChannelSelector: React.FC<ChannelSelectorProps> = ({ channels, existingChannels, isLoading, onConfirm, onCancel }) => {
    const [selectedChannels, setSelectedChannels] = useState<Set<number>>(new Set());

    // Fonction pour vérifier si une chaîne existe déjà
    const isChannelDuplicate = (channel: ParsedChannel): boolean => {
        return existingChannels.some(existing => 
            existing.name.toLowerCase().trim() === channel.name.toLowerCase().trim() ||
            existing.url === channel.url
        );
    };

    const toggleChannel = (index: number) => {
        const newSelected = new Set(selectedChannels);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedChannels(newSelected);
    };

    const handleConfirm = () => {
        const selected = Array.from(selectedChannels)
            .map(index => channels[index])
            .filter(channel => !isChannelDuplicate(channel)); // Filtrer les doublons
        onConfirm(selected);
    };

    const selectAll = () => {
        const availableIndices = channels
            .map((_, index) => index)
            .filter(index => !isChannelDuplicate(channels[index]));
        setSelectedChannels(new Set(availableIndices));
    };

    const deselectAll = () => {
        setSelectedChannels(new Set());
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p className="text-sm">Extraction des chaînes en cours...</p>
            </div>
        );
    }

    if (channels.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-slate-400">
                <Tv className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-sm">Aucune chaîne trouvée dans le fichier M3U</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Tv className="w-5 h-5 text-blue-500" />
                        Chaînes trouvées ({channels.length})
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                        Sélectionnez les chaînes que vous souhaitez ajouter à votre playlist
                    </p>
                    {existingChannels.length > 0 && (
                        <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Les chaînes déjà présentes seront ignorées
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={selectAll}
                        className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                        Tout sélectionner
                    </button>
                    <button
                        onClick={deselectAll}
                        className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                        Tout désélectionner
                    </button>
                </div>
            </div>

            {/* Channels List */}
            <div className="max-h-96 overflow-y-auto space-y-2 scrollbar-custom">
                {channels.map((channel, index) => {
                    const isDuplicate = isChannelDuplicate(channel);
                    return (
                        <div
                            key={index}
                            className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                isDuplicate
                                    ? 'bg-slate-800/30 border-slate-600 opacity-60'
                                    : selectedChannels.has(index)
                                    ? 'bg-blue-500/10 border-blue-500/30'
                                    : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50'
                            }`}
                            onClick={() => !isDuplicate && toggleChannel(index)}
                        >
                            <div className="flex items-center gap-3">
                            {/* Checkbox */}
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                selectedChannels.has(index)
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'border-slate-600'
                            }`}>
                                {selectedChannels.has(index) && (
                                    <Check className="w-3 h-3 text-white" />
                                )}
                            </div>

                            {/* Logo */}
                            <div className="w-12 h-8 bg-slate-700 rounded flex items-center justify-center overflow-hidden shrink-0">
                                {channel.logo ? (
                                    <img
                                        src={channel.logo}
                                        alt={channel.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                        }}
                                    />
                                ) : (
                                    <Globe className="w-4 h-4 text-slate-500" />
                                )}
                                <Globe className={`w-4 h-4 text-slate-500 ${channel.logo ? 'hidden' : ''}`} />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-white truncate">{channel.name}</h4>
                                    {isDuplicate && (
                                        <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                                            Déjà ajouté
                                        </span>
                                    )}
                                </div>
                                {channel.group && (
                                    <p className="text-xs text-slate-400">{channel.group}</p>
                                )}
                                <p className="text-xs text-slate-500 truncate">{channel.url}</p>
                            </div>
                        </div>
                    </div>
                );
            })}
            </div>

            {/* Footer */}
            <div className="flex gap-3 pt-4 border-t border-slate-700">
                <button
                    onClick={onCancel}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors"
                >
                    Annuler
                </button>
                <button
                    onClick={handleConfirm}
                    disabled={selectedChannels.size === 0}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium transition-all transform hover:scale-105 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                    Ajouter {selectedChannels.size} chaîne{selectedChannels.size !== 1 ? 's' : ''}
                </button>
            </div>
        </div>
    );
};

export default ChannelSelector;