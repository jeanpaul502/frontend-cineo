'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { moviesService, Movie } from '../../../src/services/movies.service';
import { ServiceConfig } from '../../../src/services/config';
import { Icon } from '@iconify/react';
import Hls from 'hls.js';

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    // Next.js 15 requires unwrapping Promise params with React.use() in client components
    const resolvedParams = React.use(params);
    const id = resolvedParams?.id as string;

    const [movie, setMovie] = useState<Movie | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    // Start at false — only show spinner when actually buffering after load
    const [isBuffering, setIsBuffering] = useState(false);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    // Track if player has been initialized to avoid double-init
    const playerInitialized = useRef(false);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch Movie Data
    useEffect(() => {
        if (id) {
            fetchMovie();
        }
        return () => {
            destroyHls();
        };
    }, [id]);

    const destroyHls = () => {
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
    };

    // Helper to get token
    const getToken = () => {
        if (typeof document === 'undefined') return null;
        const match = document.cookie.match(new RegExp('(^| )cineo_session_token=([^;]+)'));
        return match ? match[2] : null;
    };

    const cleanVideoUrl = (rawUrl: string | undefined | null): string => {
        if (!rawUrl) return '';
        let cleaned = String(rawUrl).trim();
        if (cleaned.startsWith('`') && cleaned.endsWith('`')) {
            cleaned = cleaned.slice(1, -1).trim();
        }
        return cleaned;
    };

    // ─── Initialize Player ────────────────────────────────────────────────────
    // NOTE: We use a callback ref for the video element to guarantee that
    // initPlayer() is called AFTER the <video> DOM node is mounted.
    // This fixes the race condition where movie state is set before videoRef
    // is populated, which caused HLS to never attach on first load.
    const initPlayer = useCallback((video: HTMLVideoElement, videoUrl: string) => {
        if (!video || !videoUrl) return;

        // Avoid re-initializing with the same URL
        if (playerInitialized.current) {
            destroyHls();
        }
        playerInitialized.current = true;

        const cleanUrl = cleanVideoUrl(videoUrl);
        if (!cleanUrl) {
            setError('URL vidéo invalide.');
            return;
        }

        const token = getToken();
        const isM3u8 = cleanUrl.toLowerCase().split('?')[0].includes('.m3u8');
        const endpoint = isM3u8 ? 'proxy/m3u8' : 'proxy';
        const proxyUrl = `${ServiceConfig.API_URL}/${endpoint}?url=${encodeURIComponent(cleanUrl)}${token ? `&token=${token}` : ''}`;

        // ── Attempt to play and handle browser autoplay restrictions ──────────
        const tryPlay = () => {
            // Reset volume state before play
            video.muted = false;
            video.volume = 1;
            setMuted(false);
            setVolume(1);

            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch((err: any) => {
                    // AbortError: source changed mid-play, safe to ignore
                    if (err && (err.name === 'AbortError' || err.code === 20)) return;
                    // Autoplay policy blocked: show controls so user can click play
                    console.warn('[Player] Autoplay prevented:', err.message || err);
                    setIsPlaying(false);
                    setIsBuffering(false);
                    setShowControls(true);
                });
            }
        };

        // ── HLS Initialization ─────────────────────────────────────────────────
        const initHls = (url: string, isFirstAttempt: boolean, fallbackUrl?: string) => {
            if (Hls.isSupported()) {
                const hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: false,
                    backBufferLength: 30,
                    maxBufferLength: 30,
                    maxMaxBufferLength: 60,
                    fragLoadingTimeOut: 20000,
                    manifestLoadingTimeOut: 20000,
                    levelLoadingTimeOut: 20000,
                    fragLoadingMaxRetry: 5,
                    manifestLoadingMaxRetry: 5,
                    startLevel: -1,
                    abrEwmaDefaultEstimate: 400000,
                    capLevelToPlayerSize: true,
                    xhrSetup: (xhr, reqUrl) => {
                        const t = getToken();
                        if (t && reqUrl.includes(ServiceConfig.API_URL)) {
                            xhr.setRequestHeader('Authorization', `Bearer ${t}`);
                        }
                    },
                });

                hlsRef.current = hls;
                hls.loadSource(url);
                hls.attachMedia(video);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    setIsBuffering(false);
                    tryPlay();
                });

                hls.on(Hls.Events.ERROR, (_event, data) => {
                    if (!data.fatal) return;

                    console.warn('[HLS] Fatal error:', data.type, data.details);

                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        if (isFirstAttempt && fallbackUrl && fallbackUrl !== url) {
                            // Direct URL failed → fallback to proxy
                            console.warn('[Player] Direct URL failed, falling back to proxy...');
                            setTimeout(() => {
                                destroyHls();
                                initHls(fallbackUrl, false);
                            }, 500);
                        } else {
                            setError('Impossible de charger la vidéo (réseau ou source bloquée).');
                            setIsBuffering(false);
                            hls.destroy();
                        }
                    } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                        hls.recoverMediaError();
                    } else {
                        setError('Impossible de lire cette vidéo.');
                        setIsBuffering(false);
                        hls.destroy();
                    }
                });

            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Native HLS (Safari / iOS)
                video.src = url;
                video.addEventListener('loadedmetadata', () => {
                    setIsBuffering(false);
                    tryPlay();
                }, { once: true });
                video.addEventListener('error', () => {
                    if (isFirstAttempt && fallbackUrl && fallbackUrl !== url) {
                        video.src = fallbackUrl;
                        video.load();
                    } else {
                        setError('Erreur de lecture (Safari natif).');
                        setIsBuffering(false);
                    }
                }, { once: true });
            } else {
                setError('Votre navigateur ne supporte pas la lecture HLS.');
                setIsBuffering(false);
            }
        };

        // ── Non-HLS: MP4 / direct source ──────────────────────────────────────
        if (!isM3u8) {
            setIsBuffering(true);
            video.src = proxyUrl;
            video.load();
            video.addEventListener('canplay', () => {
                setIsBuffering(false);
                tryPlay();
            }, { once: true });
            video.addEventListener('error', () => {
                setError('Impossible de charger la vidéo.');
                setIsBuffering(false);
            }, { once: true });
            return;
        }

        // ── HLS: Always use proxy ───────────────────────────
        // In the browser, direct URLs almost always fail due to:
        // 1. Mixed Content (HTTPS website trying to load HTTP m3u8)
        // 2. Missing CORS headers (Access-Control-Allow-Origin: *)
        // The mobile app bypasses this, but Web requires the backend proxy.
        setIsBuffering(true);
        initHls(proxyUrl, false);

    }, []); // stable — deps accessed via refs / closures

    // ── Callback ref on <video> ────────────────────────────────────────────────
    // Called by React when the DOM node mounts (non-null) or unmounts (null).
    // This guarantees video DOM is ready before we attach HLS.
    const videoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
        if (!node) {
            // Node unmounted
            videoRef.current = null;
            return;
        }
        videoRef.current = node;

        // Attach player once movie URL is known
        if (movie?.videoUrl) {
            initPlayer(node, movie.videoUrl);
        }
    }, [movie, initPlayer]);

    // Re-init when movie changes (e.g., different movie ID)
    useEffect(() => {
        if (!movie?.videoUrl || !videoRef.current) return;
        playerInitialized.current = false;
        initPlayer(videoRef.current, movie.videoUrl);
    }, [movie]);

    // ── Video Event Listeners ──────────────────────────────────────────────────
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onTimeUpdate = () => setCurrentTime(video.currentTime);
        const onDurationChange = () => { if (!isNaN(video.duration)) setDuration(video.duration); };
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onEnded = () => setIsPlaying(false);
        const onWaiting = () => setIsBuffering(true);
        const onPlaying = () => setIsBuffering(false);
        const onCanPlay = () => setIsBuffering(false);
        const onError = (e: Event) => console.error('[Video] Error event:', (e.target as HTMLVideoElement).error);

        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('durationchange', onDurationChange);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('ended', onEnded);
        video.addEventListener('waiting', onWaiting);
        video.addEventListener('playing', onPlaying);
        video.addEventListener('canplay', onCanPlay);
        video.addEventListener('error', onError);

        return () => {
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('durationchange', onDurationChange);
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('ended', onEnded);
            video.removeEventListener('waiting', onWaiting);
            video.removeEventListener('playing', onPlaying);
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('error', onError);
        };
    }, [movie]); // rebind when movie changes (new video node might render)

    // ── Controls Visibility ────────────────────────────────────────────────────
    useEffect(() => {
        const handleMouseMove = () => {
            setShowControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            controlsTimeoutRef.current = setTimeout(() => {
                if (isPlaying) setShowControls(false);
            }, 3000);
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('mousemove', handleMouseMove);
            container.addEventListener('click', handleMouseMove);
        }

        return () => {
            if (container) {
                container.removeEventListener('mousemove', handleMouseMove);
                container.removeEventListener('click', handleMouseMove);
            }
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, [isPlaying]);

    const fetchMovie = async () => {
        try {
            setLoading(true);
            const data = await moviesService.getMovie(id);
            setMovie(data);
        } catch (err) {
            console.error('[Watch] Failed to fetch movie', err);
            setError('Impossible de charger le film.');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => router.back();

    const togglePlay = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            try {
                await video.play();
                if (window.innerWidth < 768) {
                    if (video.requestFullscreen) {
                        await video.requestFullscreen();
                    } else if ((video as any).webkitEnterFullscreen) {
                        (video as any).webkitEnterFullscreen();
                    }
                }
            } catch (err) {
                console.error('[Play]', err);
            }
        } else {
            video.pause();
        }
    };

    const toggleMute = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        const video = videoRef.current;
        if (!video) return;
        const newMuted = !muted;
        setMuted(newMuted);
        video.muted = newMuted;
        setVolume(newMuted ? 0 : 1);
        if (!newMuted) video.volume = 1;
    };

    const skipTime = (seconds: number) => {
        const video = videoRef.current;
        if (video) video.currentTime += seconds;
    };

    const formatTime = (seconds: number) => {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        const date = new Date(seconds * 1000);
        const hh = date.getUTCHours();
        const mm = date.getUTCMinutes();
        const ss = date.getUTCSeconds().toString().padStart(2, '0');
        if (hh) return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
        return `${mm}:${ss}`;
    };

    // ── Loading / Error screens ────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                    <p className="text-white/60 text-sm">Chargement du film...</p>
                </div>
            </div>
        );
    }

    if (error || !movie) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
                <Icon icon="solar:danger-circle-bold" width={64} className="text-red-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Erreur</h1>
                <p className="text-gray-400 mb-6">{error || 'Film introuvable'}</p>
                <button
                    onClick={handleBack}
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                    Retour à l'accueil
                </button>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 bg-black z-50 group select-none"
            onMouseMove={() => setShowControls(true)}
            onMouseLeave={() => { if (isPlaying) setShowControls(false); }}
        >
            {/* ── Video Element ── */}
            <div className="absolute inset-0 flex items-center justify-center bg-black">
                {movie.videoUrl ? (
                    <video
                        ref={videoCallbackRef}
                        className="w-full h-full object-contain"
                        playsInline
                        preload="auto"
                        // ⚠️ crossOrigin removed: "anonymous" breaks many IPTV/CDN streams.
                        // The proxy backend already handles CORS headers for us.
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <div className="text-center">
                        <Icon icon="solar:videocamera-slash-bold" width={64} className="text-gray-600 mx-auto mb-4" />
                        <p className="text-xl text-gray-400">Aucune source vidéo disponible</p>
                    </div>
                )}
            </div>

            {/* ── Click zone (play/pause) ── */}
            <div
                className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer group/center"
                onClick={togglePlay}
            >
                {!isPlaying && !isBuffering && !loading && movie.videoUrl && (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm transition-all duration-300 group-hover/center:scale-110 group-hover/center:bg-blue-600/60 shadow-2xl shadow-black/50">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 sm:w-12 sm:h-12 text-white ml-2 transition-transform duration-300 group-hover/center:scale-110">
                            <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}
            </div>

            {/* ── Buffering Spinner ── */}
            {isBuffering && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 bg-black/40 backdrop-blur-[2px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
                    <p className="text-white font-medium text-base tracking-wide drop-shadow-md">Chargement en cours...</p>
                </div>
            )}

            {/* ── Top Bar (back button) ── */}
            <div className={`w-full absolute top-0 right-0 left-0 pointer-events-none z-20 transition-all duration-500 ease-in-out ${showControls || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'}`}>
                <div className="absolute w-full transition-all z-10 top-0 left-0 right-0 h-[120px] bg-gradient-to-b to-transparent from-black/80" />
                <div className="relative z-20 p-8">
                    <div className="flex w-full justify-between items-center">
                        <div className="pointer-events-auto flex flex-row items-center gap-4">
                            <button
                                className="flex items-center justify-center font-medium whitespace-nowrap transition-all h-10 text-sm px-4 rounded-md bg-transparent text-white hover:bg-white/10 cursor-pointer gap-3"
                                onClick={(e) => { e.stopPropagation(); handleBack(); }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M16 12H8" />
                                    <path d="m12 8-4 4 4 4" />
                                </svg>
                                Retour
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Bottom Controls ── */}
            <div className={`hidden md:block absolute bottom-0 left-0 right-0 transition-all duration-500 ease-in-out z-20 ${showControls || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}>
                <div className="absolute w-full bottom-0 left-0 right-0 h-[200px] bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />

                <div className="relative z-20 p-6 pt-2 pb-10">
                    <div className="flex flex-col w-full gap-2">

                        {/* Movie Title */}
                        <div className="w-full flex pb-1 pointer-events-auto px-1">
                            <h2 className="text-white font-bold text-lg md:text-2xl drop-shadow-md truncate">
                                {movie.title}
                            </h2>
                        </div>

                        {/* Progress Bar */}
                        <div
                            className="flex items-center space-x-3 pointer-events-auto mb-1"
                            onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                const clickX = e.clientX - rect.left;
                                const newTime = (clickX / rect.width) * duration;
                                if (videoRef.current && duration > 0) {
                                    videoRef.current.currentTime = newTime;
                                    setCurrentTime(newTime);
                                }
                            }}
                        >
                            <div className="group relative w-full h-10 flex items-center cursor-pointer select-none">
                                <div className="w-full h-1 bg-white/25 rounded-full overflow-hidden group-hover:h-1.5 transition-all">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full transition-all duration-200 ease-out"
                                        style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Controls Row */}
                        <div className="flex justify-between pointer-events-auto">
                            <div className="flex items-center gap-3">
                                {/* Play/Pause */}
                                <button
                                    className="flex items-center justify-center h-10 w-10 rounded-md text-white hover:bg-white/10 transition-all"
                                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                >
                                    {isPlaying ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>

                                {/* Volume */}
                                <div
                                    className="relative flex items-center"
                                    onMouseEnter={() => setShowVolumeSlider(true)}
                                    onMouseLeave={() => setShowVolumeSlider(false)}
                                >
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                                        className="h-10 px-3 rounded-md text-white hover:bg-white/10 transition-all flex items-center"
                                    >
                                        {muted ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
                                                <path d="M2 2l20 20" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
                                                <path d="M16 9a5 5 0 0 1 0 6" />
                                                <path d="M19.364 18.364a9 9 0 0 0 0-12.728" />
                                            </svg>
                                        )}
                                    </button>

                                    <div className={`transition-all duration-300 overflow-hidden ${showVolumeSlider ? 'w-24 opacity-100' : 'w-0 opacity-0'}`}>
                                        <div className="relative h-1 w-full rounded-full bg-white/25 cursor-pointer mx-2">
                                            <div
                                                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500"
                                                style={{ width: `${muted ? 0 : volume * 100}%` }}
                                            />
                                            <input
                                                type="range" min="0" max="1" step="0.01"
                                                value={muted ? 0 : volume}
                                                onChange={(e) => {
                                                    const v = parseFloat(e.target.value);
                                                    setVolume(v);
                                                    setMuted(v === 0);
                                                    if (videoRef.current) {
                                                        videoRef.current.volume = v;
                                                        videoRef.current.muted = v === 0;
                                                    }
                                                }}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="w-px h-5 bg-white/25" />

                                {/* Skip -10s */}
                                <button
                                    className="flex items-center gap-1 h-10 px-3 rounded-md text-white hover:bg-white/10 transition-all text-sm"
                                    onClick={(e) => { e.stopPropagation(); skipTime(-10); }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                        <path d="M3 3v5h5" />
                                    </svg>
                                    <span className="text-xs font-medium">10</span>
                                </button>

                                {/* Skip +10s */}
                                <button
                                    className="flex items-center gap-1 h-10 px-3 rounded-md text-white hover:bg-white/10 transition-all text-sm"
                                    onClick={(e) => { e.stopPropagation(); skipTime(10); }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                                        <path d="M21 3v5h-5" />
                                    </svg>
                                    <span className="text-xs font-medium">10</span>
                                </button>

                                <div className="w-px h-5 bg-white/25" />

                                {/* Time display */}
                                <span className="text-white text-sm font-medium tabular-nums">
                                    {formatTime(currentTime)} / {formatTime(duration)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
