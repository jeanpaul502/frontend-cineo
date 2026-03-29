'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ServiceConfig } from '../../../src/services/config';
import { Icon } from '@iconify/react';
import Hls from 'hls.js';
import { channelsService, Channel } from '../../../src/services/channels.service';

// ─── Constantes ──────────────────────────────────────────────────────────────

const PROXY_BASE = ServiceConfig.API_URL;
const MAX_RETRIES = 5;          // Nombre max de tentatives de reconnexion
const RETRY_BASE_DELAY = 2000;  // Délai de base entre les retries (ms)

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Construit l'URL proxy adaptée selon le type de flux */
function buildProxyUrl(targetUrl: string): string {
    const lower = targetUrl.split('?')[0].toLowerCase();
    const isM3u8 = lower.endsWith('.m3u8') || lower.includes('.m3u8.');
    const endpoint = isM3u8 ? 'proxy/m3u8' : 'proxy';
    return `${PROXY_BASE}/${endpoint}?url=${encodeURIComponent(targetUrl)}`;
}

/** Récupère le token de session depuis les cookies */
function getSessionToken(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(^| )cineo_session_token=([^;]+)/);
    return match ? match[2] : null;
}

// ─── Composants internes ───────────────────────────────────────────────────

function WatchTVContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const rawUrl = searchParams?.get('url') ?? '';
    const name = searchParams?.get('name') ?? 'Chaîne TV';
    const logo = searchParams?.get('logo') ?? '';
    const playlistId = searchParams?.get('playlistId') ?? '';

    // ── États ──────────────────────────────────────────────────────────────
    const [isPlaying, setIsPlaying] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [hasStarted, setHasStarted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [retryCount, setRetryCount] = useState(0);
    const [retryLabel, setRetryLabel] = useState('');
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [showChannelList, setShowChannelList] = useState(false);
    const [playlistChannels, setPlaylistChannels] = useState<Channel[]>([]);

    // ── Refs ───────────────────────────────────────────────────────────────
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
    const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
    const retryCountRef = useRef(0); // ref pour accéder à la valeur dans les callbacks

    // ── Cleanup HLS ────────────────────────────────────────────────────────
    const destroyHls = useCallback(() => {
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
    }, []);

    // ── Initialisation du player ───────────────────────────────────────────
    const initPlayer = useCallback((url: string, attempt = 0) => {
        const video = videoRef.current;
        if (!video || !url) return;

        destroyHls();
        setIsBuffering(true);
        setHasStarted(false);
        setError(null);

        const proxyUrl = buildProxyUrl(url);

        /** Tente de jouer la vidéo (gère l'autoplay policy) */
        const tryPlay = () => {
            video.muted = false;
            video.volume = 1;
            const p = video.play();
            if (p) {
                p.catch((err) => {
                    if (err.name === 'AbortError') return;
                    // Autoplay bloqué → montrer les contrôles pour que l'user clique
                    setIsPlaying(false);
                    setShowControls(true);
                });
            }
        };

        /** Planifie un retry avec back-off exponentiel */
        const scheduleRetry = () => {
            const next = attempt + 1;
            if (next > MAX_RETRIES) {
                setError(`La chaîne est temporairement indisponible. Veuillez réessayer plus tard.`);
                setIsBuffering(false);
                return;
            }
            const delay = Math.min(RETRY_BASE_DELAY * Math.pow(1.5, next), 15000);
            setRetryLabel(`Reconnexion (${next}/${MAX_RETRIES})…`);
            retryTimerRef.current = setTimeout(() => {
                retryCountRef.current = next;
                setRetryCount(next);
                setRetryLabel('');
                initPlayer(url, next);
            }, delay);
        };

        // ── HLS.js (Chrome, Firefox, Edge) ──
        if (Hls.isSupported()) {
            const hls = new Hls({
                // ── HLS Worker ──────────────────────────────────────────────
                // On peut réactiver le Worker (enableWorker: true) car nous avons 
                // corrigé la règle CSP stricte dans next.config.ts qui bloquait les eval().
                enableWorker: true,

                // ── Live TV : config spécifique ──────────────────────────────
                // lowLatencyMode: false → IPTV utilise HLS standard (pas LL-HLS).
                // Activer ce mode forcerait HLS.js à chercher des fonctionnalités
                // LL-HLS absentes (PART-INF, HOLD-BACK...) → re-buffering constant.
                lowLatencyMode: false,

                // Synchronisation avec le live :
                // Segments de 6s observés dans les logs (ex: 28-06000.ts = 6000ms).
                // liveSyncDurationCount: 10 → reste à 10×6s = 60s derrière le live.
                // Valeur plus haute = moins de seeks, moins d'aborts, lecture plus stable.
                // Valeur trop basse (ex: 3) → HLS.js seek en permanence → cycle abort/buffer.
                liveSyncDurationCount: 10,

                // Tolérance max avant rattrapage automatique.
                // 30 × 6s = 180s de retard maximum tolérée avant seek auto.
                liveMaxLatencyDurationCount: 30,

                // Stream infini (live TV)
                liveDurationInfinity: true,

                // ── Buffer ────────────────────────────────────────────────────
                // 60s de buffer en avant = assez pour absorber les variations réseau
                // sans consommer trop de mémoire ni bloquer le live.
                maxBufferLength: 60,
                maxMaxBufferLength: 120,
                backBufferLength: 10,       // Garde seulement 10s en arrière (inutile pour le live)

                // Tolère les micro-discontinuités entre segments (communes sur IPTV)
                maxBufferHole: 2,

                // ── Timeouts ──────────────────────────────────────────────────
                fragLoadingTimeOut: 25000,      // 25s pour les segments (via notre proxy)
                manifestLoadingTimeOut: 20000,
                levelLoadingTimeOut: 20000,
                fragLoadingMaxRetry: 6,
                manifestLoadingMaxRetry: 4,
                fragLoadingRetryDelay: 500,     // Retry rapide pour les segments live

                // ── Qualité ───────────────────────────────────────────────────
                startLevel: -1,                 // Auto-select la meilleure qualité
                enableSoftwareAES: true,        // Déchiffre les streams AES-128 (courant sur panels IPTV)
                progressive: true,              // Commence à jouer dès les premiers segments disponibles

                xhrSetup: (xhr, reqUrl) => {
                    const token = getSessionToken();
                    if (token && reqUrl.includes(PROXY_BASE)) {
                        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                    }
                },
            });

            hlsRef.current = hls;
            hls.loadSource(proxyUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setError(null);
                retryCountRef.current = 0;
                setRetryCount(0);
                tryPlay();
            });

            hls.on(Hls.Events.ERROR, (_event, data) => {
                if (!data.fatal) return; // Erreurs non-fatales → HLS.js gère seul

                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        // Erreur réseau → startLoad() pour relancer sans détruire
                        hls.startLoad();
                        // Si ça échoue encore, on recrée tout
                        retryTimerRef.current = setTimeout(() => {
                            if (hlsRef.current === hls) scheduleRetry();
                        }, 5000);
                        break;

                    case Hls.ErrorTypes.MEDIA_ERROR:
                        // Erreur media → tentative de recovery HLS intégrée
                        hls.recoverMediaError();
                        break;

                    default:
                        // Erreur fatale non récupérable → retry complet
                        destroyHls();
                        scheduleRetry();
                        break;
                }
            });
        }
        // ── Natif HLS (Safari, iOS) ──
        else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = proxyUrl;
            video.addEventListener('loadedmetadata', tryPlay, { once: true });
            video.addEventListener('error', () => {
                // Retry via proxy (jamais URL directe — CORS)
                scheduleRetry();
            }, { once: true });
        }
        // ── Fallback : flux direct (certains formats non-HLS) ──
        else {
            video.src = proxyUrl;
            video.addEventListener('loadedmetadata', tryPlay, { once: true });
        }
    }, [destroyHls]);

    // ── Sync URL → player ──────────────────────────────────────────────────
    useEffect(() => {
        if (!rawUrl) return;
        retryCountRef.current = 0;
        setRetryCount(0);
        setRetryLabel('');
        initPlayer(rawUrl, 0);

        return () => {
            destroyHls();
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
            const v = videoRef.current;
            if (v) { v.pause(); v.removeAttribute('src'); v.load(); }
        };
    }, [rawUrl, initPlayer, destroyHls]);

    // ── Fetch playlist channels ───────────────────────────────────────────
    useEffect(() => {
        if (!playlistId) return;
        const fetchPlaylist = async () => {
            try {
                const data = await channelsService.getPlaylist(playlistId);
                if (data && data.channels) {
                    setPlaylistChannels(data.channels.filter(c => c.status === 'active'));
                }
            } catch (err) {
                console.error('Failed to fetch playlist channels:', err);
            }
        };
        fetchPlaylist();
    }, [playlistId]);

    // ── Événements vidéo (play/pause/waiting etc.) ─────────────────────────
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onEnded = () => setIsPlaying(false);
        const onWaiting = () => setIsBuffering(true);
        const onPlaying = () => { setHasStarted(true); setIsBuffering(false); setIsPlaying(true); };
        const onTimeUpdate = () => setCurrentTime(video.currentTime);
        const onDurationChange = () => setDuration(video.duration);
        const onFirstProgress = () => {
            if (!hasStarted && video.currentTime > 0.15) {
                setHasStarted(true);
                setIsBuffering(false);
            }
        };

        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('ended', onEnded);
        video.addEventListener('waiting', onWaiting);
        video.addEventListener('playing', onPlaying);
        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('timeupdate', onFirstProgress);
        video.addEventListener('durationchange', onDurationChange);

        return () => {
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('ended', onEnded);
            video.removeEventListener('waiting', onWaiting);
            video.removeEventListener('playing', onPlaying);
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('timeupdate', onFirstProgress);
            video.removeEventListener('durationchange', onDurationChange);
        };
    }, [hasStarted]);

    // ── Auto-hide contrôles ────────────────────────────────────────────────
    useEffect(() => {
        const resetTimer = () => {
            setShowControls(true);
            if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
            controlsTimerRef.current = setTimeout(() => {
                if (isPlaying && !isBuffering) setShowControls(false);
            }, 4000);
        };

        const el = containerRef.current;
        if (el) {
            el.addEventListener('mousemove', resetTimer);
            el.addEventListener('click', resetTimer);
        }

        const handleFullscreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            if (el) {
                el.removeEventListener('mousemove', resetTimer);
                el.removeEventListener('click', resetTimer);
            }
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        };
    }, [isPlaying, isBuffering]);

    useEffect(() => {
        if (isBuffering) {
            setShowControls(true);
            if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        }
    }, [isBuffering]);

    // ── Contrôles ──────────────────────────────────────────────────────────
    const togglePlay = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!videoRef.current) return;
        videoRef.current.paused
            ? videoRef.current.play().catch(console.error)
            : videoRef.current.pause();
    };

    const toggleMute = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!videoRef.current) return;
        const next = !muted;
        setMuted(next);
        videoRef.current.muted = next;
        setVolume(next ? 0 : 1);
    };

    const skipTime = (s: number) => {
        if (videoRef.current) videoRef.current.currentTime += s;
    };

    const toggleFullScreen = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        try {
            if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
                if (containerRef.current?.requestFullscreen) {
                    containerRef.current.requestFullscreen();
                } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
                    (containerRef.current as any).webkitRequestFullscreen();
                } else if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
                    (videoRef.current as any).webkitEnterFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if ((document as any).webkitExitFullscreen) {
                    (document as any).webkitExitFullscreen();
                }
            }
        } catch (err) {
            console.error("[Fullscreen Error]", err);
        }
    };

    const formatTime = (s: number) => {
        if (isNaN(s) || !isFinite(s)) return 'LIVE';
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = Math.floor(s % 60).toString().padStart(2, '0');
        return h ? `${h}:${m.toString().padStart(2, '0')}:${sec}` : `${m}:${sec}`;
    };

    // ── Écran d'erreur ─────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
                <Icon icon="solar:danger-circle-bold" width={64} className="text-red-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Flux indisponible</h1>
                <p className="text-gray-400 mb-6 text-center max-w-md">{error}</p>
                <div className="flex gap-3">
                    <button
                        onClick={() => { setError(null); setRetryCount(0); retryCountRef.current = 0; initPlayer(rawUrl, 0); }}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium"
                    >
                        Réessayer
                    </button>
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        Retour
                    </button>
                </div>
            </div>
        );
    }

    // ── Rendu principal ────────────────────────────────────────────────────
    return (
        <div
            ref={containerRef}
            className="fixed inset-0 bg-black z-50 group select-none"
            onMouseMove={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
            {/* Video Element */}
            <div className="absolute inset-0 flex items-center justify-center bg-black">
                {rawUrl ? (
                    <video
                        ref={videoRef}
                        className="w-full h-full object-contain"
                        playsInline
                        preload="auto"
                        crossOrigin="anonymous"
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <div className="text-center">
                        <Icon icon="solar:videocamera-slash-bold" width={64} className="text-gray-600 mx-auto mb-4" />
                        <p className="text-xl text-gray-400">Aucune source vidéo disponible</p>
                    </div>
                )}
            </div>

            {/* Zone de clic pour l'écran de lecture (séparée des contrôles) */}
            <div
                className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer group/center"
                onClick={(e) => { e.stopPropagation(); setShowControls(true); }}
            >
                {!isPlaying && !isBuffering && !error && (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm transition-all duration-300 group-hover/center:scale-110 group-hover/center:bg-blue-600/60 shadow-2xl shadow-black/50">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 sm:w-12 sm:h-12 text-white ml-2 transition-transform duration-300 group-hover/center:scale-110">
                            <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Loading Spinner Overlay */}
            {isBuffering && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 bg-black/40 backdrop-blur-[2px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-white font-medium text-base tracking-wide drop-shadow-md">
                        {retryLabel || 'Chargement en cours...'}
                    </p>
                    {retryCount > 0 && (
                        <p className="text-white/50 text-xs mt-1">Tentative {retryCount}/{MAX_RETRIES}</p>
                    )}
                </div>
            )}

            {/* En-tête avec bouton retour */}
            <div className={`w-full absolute top-0 right-0 left-0 pointer-events-none z-20 transition-all duration-500 ease-in-out ${(showControls || !isPlaying || isBuffering) ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'}`}>
                <div>
                    <div className="absolute w-full transition-all z-10 top-0 left-0 right-0 h-[80px] md:h-[120px] bg-gradient-to-b to-transparent from-black/50"></div>
                </div>
                <div className="relative z-20 p-4 md:p-8">
                    <div className="flex w-full justify-between items-start">
                        <div className="flex flex-row gap-4">
                            <div className="flex flex-row items-center">
                                <div className="pointer-events-auto flex flex-row items-center">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); router.back(); }}
                                        className="flex items-center justify-center font-medium whitespace-nowrap relative overflow-hidden transition-all backdrop-blur-sm transform-gpu h-10 text-sm px-4 rounded-md bg-white/20 text-white hover:bg-white/15 focus-visible:outline-white/20 cursor-pointer gap-2"
                                    >
                                        <Icon icon="lucide:arrow-left-circle" width={20} />
                                        Retour
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contrôles */}
            <div className={`w-full absolute bottom-0 right-0 left-0 pointer-events-none transition-all duration-500 ease-in-out z-20 ${(showControls || !isPlaying || isBuffering) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}>
                <div className="relative z-20 p-4 md:p-8">
                    <div className="flex flex-col w-full justify-between md:gap-1.5">
                        <div className="flex justify-between" dir="ltr">
                            <div className="flex flex-row justify-between items-end w-full pointer-events-none">
                                <div className="w-full flex flex-col items-start gap-1">
                                    <div className="flex items-center gap-3">
                                        {logo && (
                                            <img
                                                src={logo}
                                                alt={name}
                                                className="h-7 w-auto object-contain drop-shadow bg-white/5 p-1 rounded-md"
                                                onError={(e) => e.currentTarget.style.display = 'none'}
                                            />
                                        )}
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-md sm:text-lg text-white drop-shadow-lg font-medium tracking-tight">{name}</span>
                                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest bg-red-600 animate-pulse text-white">LIVE</span>
                                            </div>
                                            <p className="text-white/40 text-[9px] font-bold uppercase tracking-[0.2em] mt-0.5 ml-0.5">Diffusion en direct</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 pointer-events-auto">
                            <div className="group relative w-full h-10 flex items-center cursor-pointer select-none"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!duration || !isFinite(duration)) return;
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const clickX = e.clientX - rect.left;
                                    const percentage = (clickX / rect.width) * 100;
                                    const newTime = (percentage / 100) * duration;
                                    if (videoRef.current) {
                                        videoRef.current.currentTime = newTime;
                                        setCurrentTime(newTime);
                                    }
                                }}
                            >
                                <div className="relative w-full bg-white/25 rounded-full transition-[height] duration-100 h-1 group-hover:h-1.5">
                                    <div className="absolute top-0 left-0 h-full bg-white/25 rounded-full" style={{ width: `${duration && isFinite(duration) ? (currentTime / duration) * 100 : 100}%` }}></div>
                                    <div className="absolute top-0 left-0 h-full bg-blue-500 rounded-full" style={{ width: `${duration && isFinite(duration) ? (currentTime / duration) * 100 : 100}%` }}></div>
                                    <div className="absolute top-1/2 rounded-full bg-white border border-white/50 shadow-md transition-opacity duration-150 -translate-x-1/2 -translate-y-1/2 group-data-[dragging]:opacity-100 opacity-0 group-hover:opacity-100 w-4 h-4" style={{ left: `${duration && isFinite(duration) ? (currentTime / duration) * 100 : 100}%` }}></div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between pointer-events-auto" dir="ltr">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center font-medium whitespace-nowrap relative overflow-hidden transition-all h-10 text-sm rounded-md cursor-pointer text-white bg-opacity-20 hover:bg-opacity-15 backdrop-blur-sm transform-gpu bg-white/5 py-0 px-0">
                                    <button className="w-full h-full px-3 py-2.5" onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
                                        {isPlaying ? (
                                            <Icon icon="lucide:pause" width={20} className="w-5 h-5 text-white" />
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="w-5 h-5 text-white"><path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd"></path></svg>
                                        )}
                                    </button>
                                </div>
                                <div>
                                    <button 
                                        className="justify-center font-medium whitespace-nowrap relative overflow-hidden transition-all h-10 text-sm px-4 rounded-md text-white bg-opacity-20 hover:bg-opacity-15 backdrop-blur-sm transform-gpu bg-white/5 pointer-events-auto flex cursor-pointer items-center py-0 pr-1 group/volume"
                                    >
                                        <div className="pr-4 -ml-1 text-2xl text-white" onClick={(e) => { e.stopPropagation(); toggleMute(); }}>
                                            {muted || volume === 0 ? (
                                                <Icon icon="lucide:volume-x" width={20} className="w-5 h-5" />
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-volume-2 w-5 h-5" aria-hidden="true"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"></path><path d="M16 9a5 5 0 0 1 0 6"></path><path d="M19.364 18.364a9 9 0 0 0 0-12.728"></path></svg>
                                            )}
                                        </div>
                                        <div className="linear -ml-2 overflow-hidden transition-[width,opacity,padding] duration-300 w-0 opacity-0 px-0 group-hover/volume:w-24 group-hover/volume:opacity-100 group-hover/volume:px-2">
                                            <div className="flex h-10 w-full items-center">
                                                <div className="relative h-1 flex-1 rounded-full bg-white/25">
                                                    <div className="absolute inset-y-0 left-0 flex items-center justify-end rounded-full bg-blue-500" style={{ width: `${muted ? 0 : volume * 100}%` }}>
                                                        <div className="absolute h-3 w-3 translate-x-1/2 rounded-full bg-white"></div>
                                                    </div>
                                                    <input
                                                        type="range" min="0" max="1" step="0.01"
                                                        value={muted ? 0 : volume}
                                                        onChange={(e) => {
                                                            const v = parseFloat(e.target.value);
                                                            setVolume(v);
                                                            setMuted(v === 0);
                                                            if (videoRef.current) videoRef.current.volume = v;
                                                        }}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                                <div className="w-px mx-1 h-5 bg-white/25"></div>
                                <button className="flex items-center justify-center font-medium whitespace-nowrap relative overflow-hidden transition-all h-10 text-sm px-4 rounded-md cursor-pointer text-white bg-opacity-20 hover:bg-opacity-15 backdrop-blur-sm transform-gpu bg-white/5" onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (playlistChannels.length > 0) {
                                        const currentIndex = playlistChannels.findIndex(c => c.url === rawUrl);
                                        let prevIndex = currentIndex - 1;
                                        if (prevIndex < 0) prevIndex = playlistChannels.length - 1;
                                        const channel = playlistChannels[prevIndex];
                                        if (channel) {
                                            router.replace(`/watch/tv?url=${encodeURIComponent(channel.url)}&name=${encodeURIComponent(channel.name)}&logo=${encodeURIComponent(channel.logo || '')}&playlistId=${playlistId}`);
                                        }
                                    }
                                }}>
                                    <Icon icon="lucide:skip-back" width={18} />
                                    <span className="ml-2 text-xs font-medium">Précédente</span>
                                </button>
                                <button className="flex items-center justify-center font-medium whitespace-nowrap relative overflow-hidden transition-all h-10 text-sm px-4 rounded-md cursor-pointer text-white bg-opacity-20 hover:bg-opacity-15 backdrop-blur-sm transform-gpu bg-white/5" onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (playlistChannels.length > 0) {
                                        const currentIndex = playlistChannels.findIndex(c => c.url === rawUrl);
                                        let nextIndex = currentIndex + 1;
                                        if (nextIndex >= playlistChannels.length) nextIndex = 0;
                                        const channel = playlistChannels[nextIndex];
                                        if (channel) {
                                            router.replace(`/watch/tv?url=${encodeURIComponent(channel.url)}&name=${encodeURIComponent(channel.name)}&logo=${encodeURIComponent(channel.logo || '')}&playlistId=${playlistId}`);
                                        }
                                    }
                                }}>
                                    <span className="mr-2 text-xs font-medium">Suivante</span>
                                    <Icon icon="lucide:skip-forward" width={18} />
                                </button>
                                <div className="w-px mx-1 h-5 bg-white/25"></div>
                                <button className="justify-center font-medium whitespace-nowrap relative overflow-hidden transition-all h-10 text-sm px-4 rounded-md text-white bg-opacity-20 hover:bg-opacity-15 backdrop-blur-sm transform-gpu bg-white/5 flex items-center cursor-auto">
                                    <div className="text-sm">{formatTime(currentTime)}</div>
                                    <div className="mx-1 text-white/50 text-sm">/</div>
                                    <div className="text-sm">{formatTime(duration || 0)}</div>
                                </button>
                            </div>
                            <div className="flex items-center gap-3">
                                {playlistChannels.length > 0 && (
                                    <div className="flex flex-row items-center">
                                        <button 
                                            className="flex items-center justify-center font-medium whitespace-nowrap relative overflow-hidden transition-all h-10 px-4 rounded-md cursor-pointer text-white bg-opacity-20 hover:bg-opacity-15 backdrop-blur-sm transform-gpu bg-white/5 pointer-events-auto text-sm"
                                            onClick={(e) => { e.stopPropagation(); setShowChannelList(!showChannelList); }}
                                            title="Lister des chaînes"
                                        >
                                            <Icon icon="solar:list-ul-linear" width={16} />
                                            <span className="ml-2 font-medium">Lister des chaînes</span>
                                        </button>
                                    </div>
                                )}
                                <div className="w-px mx-1 h-5 bg-white/25"></div>
                                <div className="flex items-center justify-center font-medium whitespace-nowrap relative overflow-hidden transition-all h-10 text-sm rounded-md cursor-pointer text-white bg-opacity-20 hover:bg-opacity-15 backdrop-blur-sm transform-gpu bg-white/5 px-0 py-0">
                                    <button className="w-full h-full px-3" onClick={(e) => { e.stopPropagation(); toggleFullScreen(); }} title={isFullScreen ? "Quitter" : "Plein écran"}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-maximize w-6 h-6" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3"></path><path d="M21 8V5a2 2 0 0 0-2-2h-3"></path><path d="M3 16v3a2 2 0 0 0 2 2h3"></path><path d="M16 21h3a2 2 0 0 0 2-2v-3"></path></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <div className="absolute w-full transition-all bottom-0 left-0 right-0 h-[300px] bg-gradient-to-t to-transparent from-black/75 z-10 pointer-events-none"></div>
                </div>
            </div>


            {/* Side Panel (Channel List Drawer) */}
            <div
                className={`fixed top-0 right-0 h-full w-[320px] sm:w-[380px] bg-black/90 backdrop-blur-xl border-l border-white/10 z-[60] transition-transform duration-500 ease-in-out shadow-2xl ${showChannelList ? 'translate-x-0' : 'translate-x-full'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drawer Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <h3 className="text-white font-bold text-lg">Liste des chaînes</h3>
                        <p className="text-white/50 text-xs">{playlistChannels.length} chaînes disponibles</p>
                    </div>
                    <button
                        onClick={() => setShowChannelList(false)}
                        className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all"
                    >
                        <Icon icon="solar:close-circle-bold" width={24} />
                    </button>
                </div>

                {/* Drawer Content (Scrollable List) */}
                <div className="h-[calc(100%-88px)] overflow-y-auto custom-scrollbar p-4 space-y-2">
                    {playlistChannels.map((channel) => {
                        const isCurrent = channel.url === rawUrl;
                        return (
                            <button
                                key={channel.id}
                                onClick={() => {
                                    router.replace(`/watch/tv?url=${encodeURIComponent(channel.url)}&name=${encodeURIComponent(channel.name)}&logo=${encodeURIComponent(channel.logo || '')}&playlistId=${playlistId}`);
                                    setShowChannelList(false);
                                }}
                                className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all group ${isCurrent ? 'border border-white/30' : 'hover:bg-white/5 border border-transparent'}`}
                            >
                                <div className="relative w-16 h-10 flex-shrink-0 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden border border-white/5">
                                    {channel.logo ? (
                                        <img
                                            src={channel.logo}
                                            alt={channel.name}
                                            className="w-full h-full object-contain p-1"
                                            onError={(e) => e.currentTarget.style.display = 'none'}
                                        />
                                    ) : (
                                        <Icon icon="solar:tv-bold" className="text-white/20" width={20} />
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-medium transition-colors text-white">
                                        {channel.name}
                                    </p>
                                    <p className="text-white/30 text-[10px] font-bold tracking-widest uppercase">Direct</p>
                                </div>

                                <div className="flex items-center gap-3">
                                    {isCurrent && (
                                        <div className="flex gap-0.5 items-end h-3 mb-0.5" title="En cours de lecture">
                                            <div className="w-0.5 h-full bg-green-500 animate-[bounce_1s_infinite_0s]"></div>
                                            <div className="w-0.5 h-3/4 bg-green-500 animate-[bounce_1s_infinite_0.1s]"></div>
                                            <div className="w-0.5 h-1/2 bg-green-500 animate-[bounce_1s_infinite_0.2s]"></div>
                                        </div>
                                    )}
                                    {isCurrent && (
                                        <Icon icon="solar:play-circle-bold" className="text-white" width={22} />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Backdrop for mobile or for closing when clicking outside */}
            {showChannelList && (
                <div
                    className="fixed inset-0 bg-black/40 z-[55] backdrop-blur-[2px]"
                    onClick={() => setShowChannelList(false)}
                />
            )}
        </div>
    );
}

// ─── Export Principal avec Suspense ──────────────────────────────────────────

export default function WatchTVPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-white text-sm">Chargement du lecteur TV...</p>
            </div>
        }>
            <WatchTVContent />
        </Suspense>
    );
}
