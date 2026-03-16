import React, { useState, useEffect, useRef } from 'react';
import { X, Globe, Link, Plus, Loader2, ChevronDown, Check, Edit, Upload } from 'lucide-react';
import { Playlist, channelsService } from '../../services/channels.service';
import { countries, getCountryFlagUrl } from '../../lib/countries';

interface ChannelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    mode: 'create_playlist' | 'add_channel';
    playlist?: Playlist | null;
}

const ChannelModal: React.FC<ChannelModalProps> = ({ isOpen, onClose, onSave, mode, playlist }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [importResult, setImportResult] = useState<{ imported: number; skipped: number; total: number } | null>(null);
    const [formData, setFormData] = useState({
        country: '',
        countryCode: '',
        playlistName: '',
        m3uUrl: '',
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setImportResult(null);
            if (mode === 'create_playlist' && playlist) {
                setFormData({
                    country: playlist.country,
                    countryCode: playlist.countryCode || '',
                    playlistName: playlist.name,
                    m3uUrl: '',
                });
            } else {
                setFormData({ country: '', countryCode: '', playlistName: '', m3uUrl: '' });
            }
            setSearchTerm('');
            setIsCountryDropdownOpen(false);
        }
    }, [isOpen, mode, playlist]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsCountryDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isOpen) return null;

    const filteredCountries = countries.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setImportResult(null);

        try {
            if (mode === 'add_channel') {
                // Import M3U serveur-side — le backend gère tout
                if (!playlist?.id || !formData.m3uUrl) return;
                const result = await channelsService.importM3U(playlist.id, formData.m3uUrl);
                setImportResult(result);
                // Notifier le parent pour rafraîchir la liste
                await onSave({ playlistId: playlist.id });
            } else {
                await onSave(formData);
                onClose();
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Une erreur est survenue. Vérifiez l\'URL et réessayez.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-2xl shadow-2xl relative">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {mode === 'create_playlist' ? (
                                <>
                                    {playlist ? <Edit className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-blue-500" />}
                                    {playlist ? 'Modifier la Playlist' : 'Nouvelle Playlist'}
                                </>
                            ) : (
                                <>
                                    <Upload className="w-5 h-5 text-blue-500" />
                                    Importer des chaînes M3U
                                </>
                            )}
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            {mode === 'create_playlist'
                                ? (playlist ? 'Modifiez les informations de la playlist.' : 'Créez une nouvelle playlist pour organiser vos chaînes TV.')
                                : `Import serveur-side dans "${playlist?.name}" — rapide, sans CORS.`
                            }
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Résultat import */}
                {importResult && (
                    <div className="mx-6 mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-sm">
                        <p className="text-green-400 font-semibold mb-1">✓ Import terminé</p>
                        <div className="text-slate-300 space-y-0.5">
                            <p>• <span className="text-green-400 font-medium">{importResult.imported}</span> chaînes importées</p>
                            <p>• <span className="text-amber-400 font-medium">{importResult.skipped}</span> chaînes ignorées (doublons)</p>
                            <p>• <span className="text-slate-400">{importResult.total}</span> chaînes au total dans le fichier M3U</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="mt-3 w-full py-2 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors font-medium text-sm"
                        >
                            Fermer
                        </button>
                    </div>
                )}

                {/* Form */}
                {!importResult && (
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">

                        {/* ── Mode création/édition playlist ── */}
                        {mode === 'create_playlist' && (
                            <>
                                {/* Country Select */}
                                <div className="space-y-2 relative" ref={dropdownRef}>
                                    <label className="text-sm font-medium text-slate-300">Pays de la Playlist</label>
                                    <p className="text-xs text-slate-500">Pays principal des chaînes TV de cette playlist.</p>
                                    <button
                                        type="button"
                                        onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white hover:border-slate-600 transition-colors outline-none focus:ring-2 focus:ring-violet-500/50"
                                    >
                                        {formData.country ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-6 bg-slate-700 rounded overflow-hidden flex items-center justify-center shrink-0">
                                                    {(() => {
                                                        const c = countries.find(c => c.name === formData.country);
                                                        return c ? <img src={getCountryFlagUrl(c.code)} alt={c.name} className="w-full h-full object-cover" /> : <Globe className="w-4 h-4 text-slate-500" />;
                                                    })()}
                                                </div>
                                                <span className="font-medium">{formData.country}</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-500">Sélectionner un pays...</span>
                                        )}
                                        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isCountryDropdownOpen && (
                                        <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                                            <div className="p-2">
                                                <input
                                                    type="text"
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    placeholder="Rechercher un pays..."
                                                    className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none placeholder:text-slate-500"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="p-1 space-y-0.5">
                                                {filteredCountries.map(country => (
                                                    <button
                                                        key={country.code}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({
                                                                ...formData,
                                                                country: country.name,
                                                                countryCode: country.code,
                                                                playlistName: playlist ? formData.playlistName : `Playlist ${country.name}`
                                                            });
                                                            setIsCountryDropdownOpen(false);
                                                            setSearchTerm('');
                                                        }}
                                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${formData.country === country.name ? 'bg-blue-500/10 text-blue-300' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-6 bg-slate-700 rounded overflow-hidden flex items-center justify-center shrink-0">
                                                                <img src={getCountryFlagUrl(country.code)} alt="" className="w-full h-full object-cover" />
                                                            </div>
                                                            <span className="font-medium">{country.name}</span>
                                                        </div>
                                                        {formData.country === country.name && <Check className="w-4 h-4" />}
                                                    </button>
                                                ))}
                                                {filteredCountries.length === 0 && (
                                                    <div className="px-3 py-4 text-center text-sm text-slate-500">Aucun pays trouvé</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Playlist Name */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Nom de la Playlist</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.playlistName}
                                        onChange={(e) => setFormData({ ...formData, playlistName: e.target.value })}
                                        placeholder="Ex: Playlist Cameroun"
                                        className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-500"
                                    />
                                </div>
                            </>
                        )}

                        {/* ── Mode import chaînes ── */}
                        {mode === 'add_channel' && (
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-300">URL du fichier M3U / M3U8</label>
                                <p className="text-xs text-slate-500">
                                    Collez le lien direct vers votre playlist M3U. Le serveur se charge de tout :
                                    téléchargement, parsing et enregistrement en base. Aucune limite de taille.
                                </p>
                                <div className="relative">
                                    <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="url"
                                        required
                                        value={formData.m3uUrl}
                                        onChange={(e) => setFormData({ ...formData, m3uUrl: e.target.value })}
                                        placeholder="http://exemple.com/playlist.m3u"
                                        className="w-full bg-slate-900 border border-slate-700/50 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-500"
                                    />
                                </div>

                                {/* Info box */}
                                <div className="flex items-start gap-3 p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl">
                                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-blue-400 text-[10px] font-bold">i</span>
                                    </div>
                                    <div className="text-xs text-slate-400 leading-relaxed">
                                        <strong className="text-slate-300">Import serveur-side.</strong> Les chaînes déjà présentes dans la playlist seront automatiquement ignorées (déduplication par URL). Les formats supportés : <code className="text-blue-400">.m3u</code>, <code className="text-blue-400">.m3u8</code> et URLs directes.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Boutons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || (mode === 'create_playlist' && !formData.country) || (mode === 'add_channel' && !formData.m3uUrl)}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium transition-all transform hover:scale-105 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {mode === 'add_channel' ? 'Import en cours...' : 'Traitement...'}
                                    </>
                                ) : (
                                    mode === 'create_playlist' ? (playlist ? 'Modifier' : 'Créer') : 'Importer les chaînes'
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ChannelModal;
