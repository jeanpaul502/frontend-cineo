import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { Movie, moviesService } from '../../services/movies.service';
import { socketService } from '../../services/socket.service';

interface DownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
    movie: Movie;
}

export const DownloadModal = ({ isOpen, onClose, movie }: DownloadModalProps) => {
    const [selectedFormat, setSelectedFormat] = useState('MP4');
    const [downloadStatus, setDownloadStatus] = useState<'idle' | 'converting' | 'ready' | 'error'>('idle');
    const [serverProgress, setServerProgress] = useState(0);
    const [clientProgress, setClientProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');
    const [loadedBytes, setLoadedBytes] = useState(0);
    const [totalBytes, setTotalBytes] = useState(0);
    const [readyBytes, setReadyBytes] = useState<number | null>(null);
    const blobUrlRef = useRef<string | null>(null);
    const blobRef = useRef<Blob | null>(null);
    const filenameRef = useRef<string>('film.mp4');
    const abortControllerRef = useRef<AbortController | null>(null);
    const isDownloadingRef = useRef(false);

    const setServerProgressSafe = (pct: number) => {
        const p = Math.max(0, Math.min(100, Math.round(pct)));
        setServerProgress(prev => Math.max(prev, p));
    };

    const setClientProgressSafe = (pct: number) => {
        const p = Math.max(0, Math.min(100, Math.round(pct)));
        setClientProgress(prev => Math.max(prev, p));
    };

    const displayedProgress = totalBytes > 0
        ? Math.max(serverProgress, clientProgress)
        : serverProgress;

    const formatBytes = (bytes: number) => {
        if (!bytes || bytes <= 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
        const value = bytes / Math.pow(1024, i);
        return `${value.toFixed(i >= 2 ? 2 : 0)} ${units[i]}`;
    };

    useEffect(() => {
        if (isOpen) {
            setDownloadStatus('idle');
            setServerProgress(0);
            setClientProgress(0);
            setErrorMsg('');
            setLoadedBytes(0);
            setTotalBytes(0);
            setReadyBytes(null);
            blobUrlRef.current = null;
            blobRef.current = null;
            abortControllerRef.current?.abort();
            abortControllerRef.current = null;
            isDownloadingRef.current = false;
        }

        // --- NEW: Socket.io listener for remote conversion progress ---
        const handleRemoteProgress = (data: { movieId: string, progress: number, status: string }) => {
            if (data.movieId === movie.id && isDownloadingRef.current) {
                setServerProgressSafe(Math.min(data.progress, 99));
            }
        };

        socketService.on('downloadProgress', handleRemoteProgress);

        // Revoke blob URL when modal closes to free memory
        return () => {
            socketService.off('downloadProgress', handleRemoteProgress);
            if (!isOpen && blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current);
                blobUrlRef.current = null;
            }
        };
    }, [isOpen, movie.id]);

    if (!movie) return null;

    const formats = ['MP4', 'MKV', 'AVI'];

    const sizeLine = (() => {
        if (downloadStatus === 'ready' && typeof readyBytes === 'number' && readyBytes > 0) {
            return `Taille : ${formatBytes(readyBytes)}`;
        }
        if (loadedBytes > 0) {
            return `Taille : ${formatBytes(loadedBytes)}`;
        }
        return 'Taille : 0 B';
    })();

    const cancelDownload = () => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        isDownloadingRef.current = false;
        setDownloadStatus('idle');
        setServerProgress(0);
        setClientProgress(0);
        setErrorMsg('');
        setLoadedBytes(0);
        setTotalBytes(0);
    };

    const handleClose = () => {
        if (downloadStatus === 'converting') cancelDownload();
        onClose();
    };

    const handleDownload = async () => {
        if (downloadStatus === 'idle') {
            setDownloadStatus('converting');
            setServerProgress(0);
            setClientProgress(0);
            setErrorMsg('');
            setLoadedBytes(0);
            setTotalBytes(0);
            abortControllerRef.current?.abort();
            abortControllerRef.current = new AbortController();
            isDownloadingRef.current = true;

            try {
                await moviesService.downloadMovie(
                    movie.id,
                    selectedFormat,
                    (pct) => setClientProgressSafe(pct),
                    (result) => {
                        filenameRef.current = result.filename;
                        blobRef.current = result.blob;
                        blobUrlRef.current = result.blobUrl;
                        isDownloadingRef.current = false;
                        setReadyBytes(result.blob.size);
                        setDownloadStatus('ready');
                    },
                    (stats) => {
                        setLoadedBytes(stats.loadedBytes);
                        setTotalBytes(stats.totalBytes);
                    },
                    { signal: abortControllerRef.current.signal },
                );
            } catch (err: unknown) {
                const maybe = err as { name?: unknown; message?: unknown };
                if (maybe?.name === 'AbortError') {
                    cancelDownload();
                    return;
                }
                isDownloadingRef.current = false;
                setDownloadStatus('error');
                setErrorMsg(typeof maybe?.message === 'string' ? maybe.message : 'Une erreur est survenue lors de la conversion.');
            }
        } else if (downloadStatus === 'ready') {
            const blob = blobRef.current;
            const filename = filenameRef.current;
            const blobUrl = blobUrlRef.current;
            if (!blob || !filename || !blobUrl) {
                setDownloadStatus('error');
                setErrorMsg('Fichier introuvable. Veuillez réessayer le téléchargement.');
                return;
            }

            const canPick = typeof window !== 'undefined' && 'showSaveFilePicker' in window;
            if (canPick) {
                try {
                    const ext = (filename.split('.').pop() || selectedFormat).toLowerCase();
                    const mime =
                        ext === 'mp4'
                            ? 'video/mp4'
                            : ext === 'mkv'
                                ? 'video/x-matroska'
                                : ext === 'avi'
                                    ? 'video/x-msvideo'
                                    : 'application/octet-stream';

                    type FilePickerAcceptType = Record<string, string[]>;
                    type FilePickerType = { description: string; accept: FilePickerAcceptType };
                    type FilePickerOptions = { suggestedName?: string; types?: FilePickerType[] };
                    type WritableLike = { write: (data: Blob) => Promise<void>; close: () => Promise<void> };
                    type FileHandleLike = { createWritable: () => Promise<WritableLike> };
                    type ShowSaveFilePicker = (options: FilePickerOptions) => Promise<FileHandleLike>;
                    const picker = (window as unknown as { showSaveFilePicker?: ShowSaveFilePicker }).showSaveFilePicker;
                    if (!picker) throw new Error('File picker indisponible');
                    const handle = await picker({
                        suggestedName: filename,
                        types: [
                            {
                                description: ext.toUpperCase(),
                                accept: { [mime]: [`.${ext}`] },
                            },
                        ],
                    });

                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                } catch (e: unknown) {
                    const maybe = e as { name?: unknown };
                    if (maybe?.name === 'AbortError') return;
                    setDownloadStatus('error');
                    setErrorMsg('Erreur lors de l’enregistrement du fichier.');
                    return;
                }
            } else {
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }

            URL.revokeObjectURL(blobUrl);
            blobUrlRef.current = null;
            blobRef.current = null;
            handleClose();
        }
    };


    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-4xl bg-[#0a0a0a] rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row border border-white/5 h-[600px] max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Left Column - Image */}
                        <div className="hidden md:block md:w-5/12 relative h-full">
                            <img
                                src={movie.poster || movie.coverImage || movie.image}
                                alt={movie.title}
                                className="w-full h-full object-cover"
                            />
                            {/* Inner gradient to gently fade into the dark background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0a0a0a] opacity-80" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent opacity-40" />
                        </div>

                        {/* Right Column - Content */}
                        <div className="flex-1 p-6 sm:p-8 flex flex-col h-full relative overflow-hidden">
                            {/* Close button */}
                            <button
                                onClick={handleClose}
                                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors z-10 cursor-pointer"
                            >
                                <Icon icon="solar:close-circle-linear" width="28" height="28" />
                            </button>

                            <h3 className="text-blue-400 text-xs font-black tracking-[0.2em] uppercase mb-3 mt-4 md:mt-0">
                                TÉLÉCHARGEMENT HORS LIGNE
                            </h3>
                            <h2 className="text-3xl md:text-4xl font-black text-white mb-2 leading-tight pr-8">
                                {movie.title}
                            </h2>
                            <p className="text-gray-400 text-sm mb-6 leading-relaxed line-clamp-2 md:line-clamp-3">
                                Emportez ce film partout avec vous. Téléchargez-le maintenant et profitez-en hors ligne où vous voulez, quand vous voulez, sans connexion internet.
                            </p>

                            {/* Format selector */}
                            <div className="flex bg-[#1a1a1a] p-1.5 rounded-xl mb-6 relative">
                                {formats.map((format) => (
                                    <button
                                        key={format}
                                        onClick={() => setSelectedFormat(format)}
                                        className={`relative flex-1 py-2 text-sm font-bold rounded-lg transition-colors z-10 ${selectedFormat === format
                                                ? 'text-blue-400'
                                                : 'text-gray-500 hover:text-gray-300'
                                            }`}
                                    >
                                        {selectedFormat === format && (
                                            <motion.div
                                                layoutId="activeFormat"
                                                className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5 shadow-lg border border-blue-500/20 rounded-lg -z-10"
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            />
                                        )}
                                        {format}
                                    </button>
                                ))}
                            </div>

                            {/* Features list & Progress */}
                            <div className="space-y-4 mb-auto w-full">
                                {/* The 4 top features */}
                                <div className="space-y-3">
                                    {[
                                        `Qualité Optimale (1080p Haute Définition)`,
                                        `Format de fichier hautement compatible (${selectedFormat})`,
                                        'Piste Audio : Version Originale & Française (VF)',
                                        'Visionnage illimité sans publicité',
                                    ].map((feature, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <Icon icon="solar:check-circle-bold" className="text-green-500 flex-shrink-0" width="20" />
                                            <span className="text-gray-200 text-sm font-medium">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* 5th Feature (Static) */}
                                <div className="flex items-center gap-3 mt-3">
                                    <Icon icon="solar:check-circle-bold" className="text-green-500 flex-shrink-0" width="20" />
                                    <span className="text-gray-200 text-sm font-medium">
                                        {sizeLine}
                                    </span>
                                </div>

                                {/* Progress Block (Reserved Space) */}
                                <div className={`w-full flex flex-col gap-2 transition-opacity duration-300 mt-4 ${downloadStatus === 'idle' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                                    {downloadStatus === 'error' ? (
                                        <div className="flex items-center gap-2 text-red-400 text-xs">
                                            <Icon icon="solar:danger-triangle-bold" width="16" className="flex-shrink-0" />
                                            <span>{errorMsg}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex justify-end w-full">
                                                {downloadStatus === 'ready' ? (
                                                    <span className="text-green-500 font-bold text-sm">
                                                        100% Terminé
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 font-medium text-xs">
                                                        {displayedProgress < 100 ? `${displayedProgress}%` : 'Finalisation...'}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="w-full">
                                                <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden relative">
                                                    <div 
                                                        className="h-full bg-green-500 rounded-full transition-all duration-75 relative"
                                                        style={{ width: `${displayedProgress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Bottom Buttons */}
                            <div className="flex flex-row gap-4 pt-5 border-t border-white/10 w-full">
                                <button
                                    onClick={handleClose}
                                    className="flex-1 py-2.5 px-4 bg-[#262626] hover:bg-[#333333] text-gray-300 font-bold rounded-lg transition-all border border-white/5 flex items-center justify-center gap-2 text-sm cursor-pointer"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleDownload}
                                    disabled={downloadStatus === 'converting'}
                                    className={`flex-[2] py-2.5 px-4 font-black rounded-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer ${
                                        downloadStatus === 'converting' 
                                            ? 'bg-[#333] text-gray-500 cursor-not-allowed opacity-70'
                                            : downloadStatus === 'error'
                                            ? 'bg-red-600/80 hover:bg-red-600 text-white shadow-lg'
                                            : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-600/20'
                                    }`}
                                >
                                    {downloadStatus === 'converting' ? (
                                        <>
                                            <Icon icon="svg-spinners:ring-resize" width="20" />
                                            Téléchargement...
                                        </>
                                    ) : downloadStatus === 'ready' ? (
                                        <>
                                            <Icon icon="solar:download-minimalistic-linear" width="20" />
                                            Enregistrer
                                        </>
                                    ) : downloadStatus === 'error' ? (
                                        <>
                                            <Icon icon="solar:restart-bold" width="20" />
                                            Réessayer
                                        </>
                                    ) : (
                                        <>
                                            <Icon icon="solar:download-minimalistic-linear" width="20" />
                                            Télécharger
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
