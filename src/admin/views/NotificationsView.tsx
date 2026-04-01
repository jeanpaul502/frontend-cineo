import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { ApiService } from '../../services/api.service';
import { showSuccessToast, showErrorToast } from '../../lib/toast';

const apiService = new ApiService();

const NotificationsView: React.FC = () => {
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form state
    const [isUpdate, setIsUpdate] = useState(true);
    const [version, setVersion] = useState('1.2.0');
    const [title, setTitle] = useState('Nouvelle mise à jour disponible !');
    const [features, setFeatures] = useState([
        'Désormais, il est possible de faire des demandes d\'ajout de films',
        'Il est désormais possible de télécharger vos films préférés',
        'L\'application Android est désormais disponible'
    ]);
    const [hasAndroidApp, setHasAndroidApp] = useState(true);
    const [androidAppUrl, setAndroidAppUrl] = useState('/downloads/cineo.apk');
    const [isActive, setIsActive] = useState(true);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);
    
    // Menu state
    const [menuState, setMenuState] = useState<{ id: string, x: number, y: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            const data = await apiService.request('/announcements');
            setAnnouncements(data as any[]);
        } catch (error) {
            console.error(error);
            showErrorToast('Erreur', 'Impossible de charger les annonces');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuState(null);
            }
        };

        if (menuState) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuState]);

    const openMenu = (id: string, event: React.MouseEvent) => {
        event.stopPropagation();
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        setMenuState({
            id,
            x: rect.right - 200, // 200px est la largeur approximative du menu
            y: rect.bottom + 5
        });
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await apiService.request(`/announcements/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ isActive: !currentStatus })
            });
            showSuccessToast('Succès', 'Statut mis à jour');
            fetchAnnouncements();
        } catch (error) {
            showErrorToast('Erreur', 'Impossible de modifier le statut');
        }
    };

    const handleRecall = async (id: string) => {
        setMenuState(null);
        try {
            await apiService.request(`/announcements/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ recallCount: Date.now() }) // Force update to trigger recall
            });
            showSuccessToast('Succès', 'Un rappel a été envoyé pour cette annonce');
            fetchAnnouncements();
        } catch (error) {
            showErrorToast('Erreur', 'Impossible d\'envoyer le rappel');
        }
    };

    const confirmDelete = (id: string) => {
        setMenuState(null);
        setAnnouncementToDelete(id);
        setDeleteModalOpen(true);
    };

    const handleEdit = (announcement: any) => {
        setMenuState(null);
        setEditingId(announcement.id);
        setIsUpdate(announcement.isUpdate);
        setVersion(announcement.version || '');
        setTitle(announcement.title);
        setFeatures([...announcement.features]);
        setHasAndroidApp(announcement.hasAndroidApp);
        setAndroidAppUrl(announcement.androidAppUrl || '');
        setIsActive(announcement.isActive);
        setModalOpen(true);
    };

    const resetForm = () => {
        setEditingId(null);
        setIsUpdate(true);
        setVersion('1.2.0');
        setTitle('Nouvelle mise à jour disponible !');
        setFeatures(['Désormais, il est possible de faire des demandes d\'ajout de films', 'Il est désormais possible de télécharger vos films préférés', 'L\'application Android est désormais disponible']);
        setHasAndroidApp(true);
        setAndroidAppUrl('/downloads/cineo.apk');
        setIsActive(true);
    };

    const handleDelete = async () => {
        if (!announcementToDelete) return;
        try {
            await apiService.request(`/announcements/${announcementToDelete}`, {
                method: 'DELETE'
            });
            showSuccessToast('Succès', 'Annonce supprimée');
            setDeleteModalOpen(false);
            setAnnouncementToDelete(null);
            fetchAnnouncements();
        } catch (error) {
            showErrorToast('Erreur', 'Impossible de supprimer l\'annonce');
        }
    };

    const handleFeatureChange = (index: number, value: string) => {
        const newFeatures = [...features];
        newFeatures[index] = value;
        setFeatures(newFeatures);
    };

    const addFeature = () => setFeatures([...features, '']);
    const removeFeature = (index: number) => setFeatures(features.filter((_, i) => i !== index));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                isUpdate,
                version: isUpdate ? version : null,
                title,
                features: features.filter(f => f.trim() !== ''),
                hasAndroidApp,
                androidAppUrl,
                isActive
            };

            if (editingId) {
                await apiService.request(`/announcements/${editingId}`, {
                    method: 'PATCH',
                    body: JSON.stringify(payload)
                });
                showSuccessToast('Succès', 'Annonce modifiée avec succès');
            } else {
                await apiService.request('/announcements', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                showSuccessToast('Succès', 'Annonce créée avec succès');
            }
            
            setModalOpen(false);
            resetForm();
            fetchAnnouncements();
        } catch (error) {
            showErrorToast('Erreur', `Impossible de ${editingId ? 'modifier' : 'créer'} l'annonce`);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl text-blue-500">
                        <Icon icon="solar:bell-bold" width="22" height="22" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white leading-tight">Annonces & Mises à jour</h2>
                        <p className="text-sm text-gray-400">Gérez les fenêtres d'information affichées aux utilisateurs</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-600/20"
                >
                    <Icon icon="solar:add-circle-bold" width="18" height="18" />
                    Nouvelle Annonce
                </button>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-sm uppercase tracking-wider">
                            <th className="px-6 py-4 font-semibold">Type / Version</th>
                            <th className="px-6 py-4 font-semibold">Titre</th>
                            <th className="px-6 py-4 font-semibold text-center">Statut</th>
                            <th className="px-6 py-4 font-semibold text-center">Date</th>
                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-400">Chargement...</td>
                            </tr>
                        ) : announcements.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-400">Aucune annonce trouvée.</td>
                            </tr>
                        ) : (
                            announcements.map((ann) => (
                                <tr key={ann.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white">
                                        {ann.isUpdate ? (
                                            <span className="inline-flex items-center gap-1 text-blue-400 bg-blue-400/10 px-2 py-1 rounded-md text-xs">
                                                <Icon icon="solar:cloud-download-bold" />
                                                v{ann.version}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-md text-xs">
                                                <Icon icon="solar:info-circle-bold" />
                                                Info
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-300">{ann.title}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-bold ${ann.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}
                                        >
                                            {ann.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm text-gray-400">
                                        {new Date(ann.createdAt).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td className="px-6 py-4 text-right relative">
                                        <button
                                            onClick={(e) => openMenu(ann.id, e)}
                                            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                                        >
                                            <Icon icon="solar:menu-dots-bold" width="24" height="24" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Dropdown Menu */}
            {menuState && (
                <div 
                    ref={menuRef}
                    className="fixed z-50 w-48 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl py-2 animate-in fade-in zoom-in duration-200"
                    style={{ 
                        top: menuState.y, 
                        left: menuState.x 
                    }}
                >
                    {(() => {
                        const ann = announcements.find(a => a.id === menuState.id);
                        if (!ann) return null;
                        
                        return (
                            <>
                                <button
                                    onClick={() => handleEdit(ann)}
                                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-3"
                                >
                                    <Icon icon="solar:pen-bold" width="18" />
                                    Modifier
                                </button>
                                
                                <button
                                    onClick={() => {
                                        toggleStatus(ann.id, ann.isActive);
                                        setMenuState(null);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-3"
                                >
                                    <Icon icon={ann.isActive ? "solar:close-circle-bold" : "solar:check-circle-bold"} width="18" className={ann.isActive ? "text-yellow-500" : "text-green-500"} />
                                    {ann.isActive ? "Désactiver" : "Activer"}
                                </button>

                                <button
                                    onClick={() => handleRecall(ann.id)}
                                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-3"
                                >
                                    <Icon icon="solar:bell-bing-bold" width="18" className="text-blue-500" />
                                    Faire un rappel
                                </button>

                                <div className="h-px bg-white/10 my-1 w-full" />

                                <button
                                    onClick={() => confirmDelete(ann.id)}
                                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-3"
                                >
                                    <Icon icon="solar:trash-bin-trash-bold" width="18" />
                                    Supprimer
                                </button>
                            </>
                        );
                    })()}
                </div>
            )}

            {/* Create/Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Icon icon="solar:bell-bold" className="text-blue-500" />
                                {editingId ? 'Modifier l\'annonce' : 'Créer une annonce'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <Icon icon="solar:close-circle-bold" width="24" height="24" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <form id="announcement-form" onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-3 gap-4 items-end">
                                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 h-[42px] mb-1">
                                        <input type="checkbox" id="isUpdate" checked={isUpdate} onChange={e => setIsUpdate(e.target.checked)} className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-600 bg-gray-700" />
                                        <label htmlFor="isUpdate" className="text-sm font-medium text-white cursor-pointer">
                                            Mise à jour
                                        </label>
                                    </div>
                                    
                                    {isUpdate && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-300">Version</label>
                                            <input type="text" value={version} onChange={e => setVersion(e.target.value)} required className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-blue-500 transition-colors h-[42px]" />
                                        </div>
                                    )}
                                    
                                    <div className={`space-y-2 ${!isUpdate ? 'col-span-2' : ''}`}>
                                        <label className="text-sm font-medium text-gray-300">Statut initial</label>
                                        <select value={isActive ? 'true' : 'false'} onChange={e => setIsActive(e.target.value === 'true')} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-blue-500 transition-colors [&>option]:bg-[#1A1A1A] h-[42px]">
                                            <option value="true">Activer</option>
                                            <option value="false">Inactif</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-300">Titre de l'annonce</label>
                                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-blue-500 transition-colors" />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-gray-300">Nouveautés (Points validés)</label>
                                        <button type="button" onClick={addFeature} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                            <Icon icon="solar:add-circle-linear" /> Ajouter un point
                                        </button>
                                    </div>
                                    {features.map((feat, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <div className="text-green-500"><Icon icon="solar:check-circle-bold" width="20" /></div>
                                            <input type="text" value={feat} onChange={e => handleFeatureChange(idx, e.target.value)} className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-blue-500 transition-colors text-sm" placeholder="Ex: Téléchargement disponible..." />
                                            <button type="button" onClick={() => removeFeature(idx)} className="text-red-400 hover:text-red-300 p-2"><Icon icon="solar:trash-bin-trash-bold" width="18" /></button>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-4 border-t border-white/10 pt-6 mt-6">
                                    <h3 className="text-sm font-bold text-white">Application Android</h3>
                                    
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" id="hasAndroidApp" checked={hasAndroidApp} onChange={e => setHasAndroidApp(e.target.checked)} className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-600 bg-gray-700" />
                                        <label htmlFor="hasAndroidApp" className="text-sm text-gray-300 cursor-pointer">
                                            Inclure le bouton de téléchargement de l'APK
                                        </label>
                                    </div>

                                    {hasAndroidApp && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-300">URL du fichier APK</label>
                                            <input type="text" value={androidAppUrl} onChange={e => setAndroidAppUrl(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-blue-500 transition-colors" placeholder="/downloads/cineo.apk" />
                                            <p className="text-xs text-gray-500">Mettez le fichier .apk dans le dossier /public/downloads/ du projet Next.js</p>
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>
                        
                        <div className="p-6 border-t border-white/10 bg-black/20 flex justify-end gap-3">
                            <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors border border-white/10">
                                Annuler
                            </button>
                            <button type="submit" form="announcement-form" className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-2">
                                <Icon icon="solar:disk-bold" width="18" /> Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1A1A1A] border border-red-500/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-red-500/5">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Icon icon="solar:danger-triangle-bold" className="text-red-500" width="24" />
                                Supprimer l'annonce
                            </h2>
                            <button 
                                onClick={() => {
                                    setDeleteModalOpen(false);
                                    setAnnouncementToDelete(null);
                                }} 
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <Icon icon="solar:close-circle-bold" width="24" height="24" />
                            </button>
                        </div>
                        
                        <div className="p-6">
                            <p className="text-gray-300 text-sm leading-relaxed">
                                Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action est irréversible et supprimera l'historique de cette mise à jour.
                            </p>
                        </div>
                        
                        <div className="p-6 border-t border-white/10 bg-black/20 flex justify-end gap-3">
                            <button 
                                onClick={() => {
                                    setDeleteModalOpen(false);
                                    setAnnouncementToDelete(null);
                                }} 
                                className="px-5 py-2.5 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors border border-white/10"
                            >
                                Annuler
                            </button>
                            <button 
                                onClick={handleDelete} 
                                className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 flex items-center gap-2"
                            >
                                <Icon icon="solar:trash-bin-trash-bold" width="18" /> Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationsView;
