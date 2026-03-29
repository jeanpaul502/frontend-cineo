import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { createPortal } from 'react-dom';
import { showErrorToast, showSuccessToast } from '../../lib/toast';
import { requestsService, MediaRequest } from '../../services/requests.service';
import MovieModal from '../components/MovieModal';
import { moviesService, Movie } from '../../services/movies.service';

type MenuState = { requestId: string; x: number; y: number } | null;

const RequestsView: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<MediaRequest[]>([]);
    const [menu, setMenu] = useState<MenuState>(null);
    const [selectedRequest, setSelectedRequest] = useState<MediaRequest | null>(null);
    const [movieModalOpen, setMovieModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<MediaRequest | null>(null);
    const [prefillMovieData, setPrefillMovieData] = useState<Partial<Movie> | null>(null);
    const [prefillLoading, setPrefillLoading] = useState(false);

    const stats = useMemo(() => {
        const total = items.length;
        const pending = items.filter(i => i.status === 'pending').length;
        const approved = items.filter(i => i.status === 'approved').length;
        const rejected = items.filter(i => i.status === 'rejected').length;
        return { total, pending, approved, rejected };
    }, [items]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const data = await requestsService.getAdminRequests();
            setItems(Array.isArray(data) ? data : []);
        } catch (e: any) {
            showErrorToast('Erreur', e?.message || 'Impossible de charger les demandes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    useEffect(() => {
        const close = () => setMenu(null);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, []);

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const notificationIcon = (m?: string | null) => {
        if (m === 'whatsapp') return 'logos:whatsapp-icon';
        if (m === 'telegram') return 'logos:telegram';
        if (m === 'email') return 'solar:letter-linear';
        return 'solar:bell-linear';
    };

    const statusBadge = (s: MediaRequest['status']) => {
        if (s === 'approved') return { label: 'Approuvée', cls: 'bg-green-500/10 text-green-400 border-green-500/20' };
        if (s === 'rejected') return { label: 'Refusée', cls: 'bg-red-500/10 text-red-400 border-red-500/20' };
        return { label: 'En attente', cls: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20' };
    };

    const isTerminal = (s: MediaRequest['status']) => s === 'approved' || s === 'rejected';

    const updateStatus = async (id: string, status: MediaRequest['status']) => {
        try {
            const updated = await requestsService.updateRequestStatus(id, status);
            setItems(prev => prev.map(r => r.id === id ? { ...r, status: updated.status, updatedAt: updated.updatedAt } : r));
            setMenu(null);
            if (status === 'approved') showSuccessToast('Demande approuvée');
            if (status === 'rejected') showSuccessToast('Demande refusée');
        } catch (e: any) {
            showErrorToast('Erreur', e?.message || 'Impossible de mettre à jour la demande');
        }
    };

    const openAddMovie = async (r: MediaRequest) => {
        setSelectedRequest(r);
        setMovieModalOpen(true);
        setMenu(null);
        setPrefillLoading(true);

        const basic: Partial<Movie> = {
            title: r.title || '',
            poster: r.poster || '',
            description: r.overview || '',
            releaseDate: r.releaseDate || '',
            section: 'Tendances',
            status: 'active',
        };

        setPrefillMovieData(basic);

        try {
            if (typeof r.tmdbId === 'number' && Number.isFinite(r.tmdbId) && r.tmdbId > 0) {
                const details = await moviesService.getTmdbDetails(String(r.tmdbId));
                setPrefillMovieData({
                    ...basic,
                    ...details,
                    title: details.title || basic.title,
                    poster: details.poster || basic.poster,
                    description: details.description || basic.description,
                    releaseDate: details.releaseDate || basic.releaseDate,
                });
            } else {
                showErrorToast('TMDB manquant', 'Cette demande ne contient pas de TMDB ID, le pré-remplissage sera partiel.');
            }
        } catch (e: any) {
            showErrorToast('Pré-remplissage', 'Impossible de récupérer les détails TMDB. Le formulaire sera partiel.');
        } finally {
            setPrefillLoading(false);
        }
    };

    const requestDelete = async (r: MediaRequest) => {
        try {
            await requestsService.deleteRequest(r.id);
            setItems(prev => prev.filter(x => x.id !== r.id));
            setDeleteTarget(null);
            setMenu(null);
            showSuccessToast('Demande supprimée');
        } catch (e: any) {
            showErrorToast('Erreur', e?.message || 'Impossible de supprimer la demande');
        }
    };

    const handleSaveMovie = async (movieData: Partial<Movie>) => {
        try {
            await moviesService.createMovie(movieData as any);
            if (selectedRequest) {
                await updateStatus(selectedRequest.id, 'approved');
            }
            setMovieModalOpen(false);
            setSelectedRequest(null);
            showSuccessToast('Film ajouté', 'Le film a été ajouté et la demande approuvée');
        } catch (e: any) {
            showErrorToast('Erreur', e?.message || 'Impossible d’ajouter le film');
            throw e;
        }
    };

    const openMenu = (requestId: string, el: HTMLElement) => {
        const rect = el.getBoundingClientRect();
        const width = 240;
        const padding = 12;
        const x = Math.max(padding, Math.min(window.innerWidth - width - padding, rect.right - width));
        const y = Math.max(padding, Math.min(window.innerHeight - padding, rect.bottom + 8));
        setMenu(prev => (prev?.requestId === requestId ? null : { requestId, x, y }));
    };

    const menuNode = menu
        ? createPortal(
            <div className="fixed inset-0 z-[80]" onMouseDown={() => setMenu(null)}>
                <div
                    className="absolute w-64 bg-[#0b0b0b]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
                    style={{ left: menu.x, top: menu.y }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {(() => {
                        const r = items.find(i => i.id === menu.requestId);
                        if (!r) return null;
                        return (
                            <>
                                <button
                                    onClick={() => openAddMovie(r)}
                                    className="w-full px-4 py-3 text-left text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                                >
                                    Ajouter
                                </button>
                                {isTerminal(r.status) && (
                                    <button
                                        onClick={() => {
                                            setDeleteTarget(r);
                                            setMenu(null);
                                        }}
                                        className="w-full px-4 py-3 text-left text-sm font-bold text-red-300 hover:bg-red-500/10 transition-colors border-t border-white/10"
                                    >
                                        Supprimer
                                    </button>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>,
            document.body,
        )
        : null;

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {menuNode}

            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex flex-col md:flex-row gap-3 items-center justify-between backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl text-blue-500">
                        <Icon icon="solar:clipboard-list-linear" width="22" height="22" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-white font-bold leading-tight">Demandes</span>
                        <span className="text-gray-400 text-xs">{stats.pending} en attente</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchRequests}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Icon icon="solar:refresh-linear" width="18" height="18" />
                        Actualiser
                    </button>
                </div>
            </div>
            {prefillLoading && (
                <div className="px-4 py-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-sm flex items-center gap-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                    <span>Récupération des infos TMDB...</span>
                </div>
            )}

            <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
                <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
                                <th className="px-4 py-3 font-semibold">Film</th>
                                <th className="px-4 py-3 font-semibold">Utilisateur</th>
                                <th className="px-4 py-3 font-semibold">Contact</th>
                                <th className="px-4 py-3 font-semibold text-center">Date</th>
                                <th className="px-4 py-3 font-semibold text-center">Statut</th>
                                <th className="px-4 py-3 font-semibold text-center w-28">Actions</th>
                                <th className="px-4 py-3 font-semibold text-right w-14"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
                                            <span className="text-sm">Chargement des demandes...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center text-blue-500">
                                                <Icon icon="solar:inbox-linear" width="22" height="22" />
                                            </div>
                                            <span className="text-sm">Aucune demande pour le moment</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                items.map((r) => {
                                    const badge = statusBadge(r.status);
                                    const userName = r.user ? `${r.user.firstName} ${r.user.lastName}`.trim() : '';
                                    const userLine = userName || r.user?.email || r.userId || '—';
                                    const poster = r.poster || '';

                                    return (
                                        <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-11 h-14 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                                                        {poster ? (
                                                            <img src={poster} alt={r.title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                                <Icon icon="solar:clapperboard-play-linear" width="20" height="20" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-white font-bold text-sm truncate">{r.title}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-white text-sm font-medium truncate">{userLine}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Icon icon={notificationIcon(r.notificationMethod)} width="18" height="18" className="flex-shrink-0" />
                                                    <span className="text-gray-300 text-sm truncate">{r.contactInfo || '—'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs text-gray-400">
                                                {formatDate(r.createdAt)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${badge.cls}`}>
                                                    {badge.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {r.status === 'pending' ? (
                                                    <div className="inline-flex items-center gap-2">
                                                        <button
                                                            onClick={() => updateStatus(r.id, 'approved')}
                                                            className="p-2 rounded-xl text-green-400 hover:bg-white/10 transition-colors"
                                                            aria-label="Approuver"
                                                        >
                                                            <Icon icon="solar:check-circle-bold" width="18" height="18" />
                                                        </button>
                                                        <button
                                                            onClick={() => updateStatus(r.id, 'rejected')}
                                                            className="p-2 rounded-xl text-red-400 hover:bg-white/10 transition-colors"
                                                            aria-label="Refuser"
                                                        >
                                                            <Icon icon="solar:close-circle-bold" width="18" height="18" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-500 text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={(e) => openMenu(r.id, e.currentTarget)}
                                                    className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                                                    aria-label="Menu"
                                                >
                                                    <Icon icon="solar:menu-dots-linear" width="28" height="28" className="text-white" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {deleteTarget && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0b0b0b] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
                                <Icon icon="solar:trash-bin-trash-bold" width="22" height="22" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Supprimer la demande ?</h3>
                            <p className="text-gray-400 text-sm">
                                Supprimer la demande pour <span className="text-white font-medium">"{deleteTarget.title}"</span> ?
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors border border-white/10"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => requestDelete(deleteTarget)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <MovieModal
                isOpen={movieModalOpen}
                onClose={() => {
                    setMovieModalOpen(false);
                    setSelectedRequest(null);
                    setPrefillMovieData(null);
                    setPrefillLoading(false);
                }}
                onSave={handleSaveMovie}
                movie={null}
                prefill={prefillMovieData}
            />
        </div>
    );
};

export default RequestsView;
