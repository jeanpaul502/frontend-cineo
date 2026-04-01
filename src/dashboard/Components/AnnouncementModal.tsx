"use client";

import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { API_BASE_URL } from '../../services/config';

const AnnouncementModal: React.FC = () => {
    const [announcement, setAnnouncement] = useState<any>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const fetchActiveAnnouncement = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/announcements/active`);
                if (!response.ok) return;

                const data = await response.json();
                
                // S'il y a une annonce et qu'elle a bien un ID et est active
                if (data && typeof data === 'object' && 'id' in data && data.isActive) {
                    let seenState = null;
                    try {
                        const rawState = localStorage.getItem('cineo_seen_announcement');
                        if (rawState) seenState = JSON.parse(rawState);
                    } catch (e) {
                        // ignore localstorage error
                    }

                    // On affiche si:
                    // 1. L'annonce n'a jamais été vue (ID différent)
                    // 2. OU si le compteur de rappel (recallCount) a changé depuis la dernière vue
                    const shouldShow = !seenState || 
                                     seenState.id !== data.id || 
                                     seenState.recallCount !== data.recallCount;

                    if (shouldShow) {
                        setAnnouncement(data);
                        setIsOpen(true);
                    }
                }
            } catch (error) {
                // Ignore l'erreur silencieusement s'il n'y a pas d'annonce active
            }
        };

        fetchActiveAnnouncement();
    }, []);

    const handleClose = () => {
        if (announcement) {
            try {
                localStorage.setItem('cineo_seen_announcement', JSON.stringify({
                    id: announcement.id,
                    recallCount: announcement.recallCount
                }));
            } catch (e) {
                // ignore
            }
        }
        setIsOpen(false);
    };

    if (!isOpen || !announcement) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop with strong blur */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-500"
                onClick={handleClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-2xl bg-[#0a0a0a] rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-white/5 max-h-[90vh]">
                
                {/* Right Column - Content (Taking full width here) */}
                <div className="flex-1 p-6 sm:p-8 flex flex-col h-full relative overflow-hidden">
                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors z-10 cursor-pointer"
                    >
                        <Icon icon="solar:close-circle-linear" width="28" height="28" />
                    </button>

                    {announcement.isUpdate && announcement.version && (
                        <h3 className="text-blue-400 text-xs font-black tracking-[0.2em] uppercase mb-3 mt-4 md:mt-0">
                            VERSION {announcement.version}
                        </h3>
                    )}
                    
                    <h2 className={`text-2xl md:text-3xl font-black text-white mb-2 leading-tight pr-8 ${!announcement.isUpdate ? 'mt-4 md:mt-0' : ''}`}>
                        {announcement.title}
                    </h2>
                    <p className="text-gray-400 text-sm mb-8 leading-relaxed line-clamp-2 md:line-clamp-3">
                        Découvrez les dernières améliorations et fonctionnalités ajoutées pour vous offrir une meilleure expérience de streaming.
                    </p>

                    {/* Features list */}
                    <div className="space-y-4 mb-8 w-full">
                        {announcement.features?.map((feature: string, index: number) => (
                            <div key={index} className="flex items-start gap-3">
                                <Icon icon="solar:check-circle-bold" className="text-green-500 mt-0.5 flex-shrink-0" width="20" />
                                <span className="text-gray-200 text-sm font-medium">{feature}</span>
                            </div>
                        ))}
                        
                        <div className="flex items-start gap-3 mt-3">
                             <Icon icon="solar:info-circle-linear" className="text-gray-500 mt-0.5 flex-shrink-0" width="20" />
                             <span className="text-gray-400 text-sm font-medium">
                                  D'autres mises à jour viendront très bientôt et vous serez notifié en temps réel.
                             </span>
                        </div>
                    </div>

                    <div className="mt-auto"></div>

                    {/* Bottom Buttons */}
                    <div className="flex flex-row gap-4 pt-5 border-t border-white/10 w-full">
                        <button
                            onClick={handleClose}
                            className="flex-1 py-2.5 px-4 bg-[#262626] hover:bg-[#333333] text-gray-300 font-bold rounded-lg transition-all border border-white/5 flex items-center justify-center gap-2 text-sm cursor-pointer"
                        >
                            J'ai compris
                        </button>
                        
                        {announcement.hasAndroidApp && announcement.androidAppUrl && (
                            <a 
                                href={announcement.androidAppUrl.startsWith('/') ? `${API_BASE_URL.replace(/\/api$/, '')}${announcement.androidAppUrl}` : announcement.androidAppUrl}
                                download
                                className="flex-[2] py-2.5 px-4 font-black rounded-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-600/20"
                            >
                                <Icon icon="logos:android-icon" width="20" />
                                Télécharger l'APK
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnnouncementModal;