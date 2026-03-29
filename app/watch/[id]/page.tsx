'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { moviesService, Movie } from '../../../src/services/movies.service';
import { ServiceConfig } from '../../../src/services/config';
import { Icon } from '@iconify/react';
import Hls from 'hls.js';

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = React.use(params);
    const id = resolvedParams?.id as string;

    const [movie, setMovie] = useState<Movie | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    
    // Feature states
    const [isPiPActive, setIsPiPActive] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

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

    const initPlayer = useCallback((video: HTMLVideoElement, videoUrl: string) => {
        if (!video || !videoUrl) return;

        if (playerInitialized.current) {
            destroyHls();
        }
        playerInitialized.current = true;
        setHasStarted(false);

        const cleanUrl = cleanVideoUrl(videoUrl);
        if (!cleanUrl) {
            setError('URL vidéo invalide.');
            return;
        }

        const token = getToken();
        const isM3u8 = cleanUrl.toLowerCase().split('?')[0].includes('.m3u8');
        const endpoint = isM3u8 ? 'proxy/m3u8' : 'proxy';
        const proxyUrl = `${ServiceConfig.API_URL}/${endpoint}?url=${encodeURIComponent(cleanUrl)}${token ? `&token=${token}` : ''}`;

        const tryPlay = () => {
            video.muted = false;
            video.volume = 1;
            setMuted(false);
            setVolume(1);

            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch((err: any) => {
                    if (err && (err.name === 'AbortError' || err.code === 20)) return;
                    setIsPlaying(false);
                    setIsBuffering(false);
                    setShowControls(true);
                });
            }
        };

        const initHls = (url: string) => {
            if (Hls.isSupported()) {
                const hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: false,
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
                    tryPlay();
                });

                hls.on(Hls.Events.ERROR, (_event, data) => {
                    if (!data.fatal) return;
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        setError('Impossible de charger la vidéo (réseau).');
                    } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                        hls.recoverMediaError();
                    } else {
                        setError('Impossible de lire cette vidéo.');
                        hls.destroy();
                    }
                    setIsBuffering(false);
                });

            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = url;
                video.addEventListener('loadedmetadata', () => {
                    setIsBuffering(false);
                    tryPlay();
                }, { once: true });
            }
        };

        if (!isM3u8) {
            setIsBuffering(true);
            video.src = proxyUrl;
            video.load();
            video.addEventListener('canplay', () => {
                tryPlay();
            }, { once: true });
            return;
        }

        setIsBuffering(true);
        initHls(proxyUrl);

    }, []);

    const videoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
        if (!node) {
            videoRef.current = null;
            return;
        }
        videoRef.current = node;
        if (movie?.videoUrl) {
            initPlayer(node, movie.videoUrl);
        }
    }, [movie, initPlayer]);

    useEffect(() => {
        if (!movie?.videoUrl || !videoRef.current) return;
        playerInitialized.current = false;
        initPlayer(videoRef.current, movie.videoUrl);
    }, [movie]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onTimeUpdate = () => setCurrentTime(video.currentTime);
        const onDurationChange = () => { if (!isNaN(video.duration)) setDuration(video.duration); };
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onEnded = () => setIsPlaying(false);
        const onWaiting = () => setIsBuffering(true);
        const onPlaying = () => {
            setHasStarted(true);
            setIsBuffering(false);
        };
        const onFirstProgress = () => {
            if (!hasStarted && video.currentTime > 0.15) {
                setHasStarted(true);
                setIsBuffering(false);
            }
        };

        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('durationchange', onDurationChange);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('ended', onEnded);
        video.addEventListener('waiting', onWaiting);
        video.addEventListener('playing', onPlaying);
        video.addEventListener('timeupdate', onFirstProgress);

        const onEnterPiP = () => setIsPiPActive(true);
        const onLeavePiP = () => setIsPiPActive(false);
        video.addEventListener('enterpictureinpicture', onEnterPiP);
        video.addEventListener('leavepictureinpicture', onLeavePiP);

        return () => {
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('durationchange', onDurationChange);
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('ended', onEnded);
            video.removeEventListener('waiting', onWaiting);
            video.removeEventListener('playing', onPlaying);
            video.removeEventListener('timeupdate', onFirstProgress);
            video.removeEventListener('enterpictureinpicture', onEnterPiP);
            video.removeEventListener('leavepictureinpicture', onLeavePiP);
        };
    }, [movie, hasStarted]);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
        const handleMouseMove = () => {
            setShowControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            controlsTimeoutRef.current = setTimeout(() => {
                if (isPlaying && !isBuffering) setShowControls(false);
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
    }, [isPlaying, isBuffering]);

    useEffect(() => {
        if (isBuffering) {
            setShowControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        }
    }, [isBuffering]);

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
        const mm = date.getUTCMinutes();
        const ss = date.getUTCSeconds().toString().padStart(2, '0');
        const hh = date.getUTCHours();
        if (hh) return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
        return `${mm}:${ss}`;
    };

    const toggleFullscreen = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        try {
            if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
                if (containerRef.current?.requestFullscreen) {
                    containerRef.current.requestFullscreen();
                } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
                    (containerRef.current as any).webkitRequestFullscreen();
                } else if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
                    // Fallback natif pour iOS Safari
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

    const togglePiP = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (videoRef.current) {
                await videoRef.current.requestPictureInPicture();
            }
        } catch (err) {
            console.error('[PiP Error]', err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <p className="text-gray-400 text-sm font-medium animate-pulse">Chargement du film...</p>
            </div>
        );
    }

    if (error || !movie) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
                <Icon icon="solar:danger-circle-bold" width={64} className="text-red-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Erreur</h1>
                <p className="text-gray-400 mb-6">{error || 'Film introuvable'}</p>
                <button onClick={handleBack} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
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
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <div className="text-center">
                        <Icon icon="solar:videocamera-slash-bold" width={64} className="text-gray-600 mx-auto mb-4" />
                        <p className="text-xl text-gray-400">Aucune source vidéo disponible</p>
                    </div>
                )}
            </div>

            {/* ── PiP Activation Overlay (The 'Fiche') ── */}
            {isPiPActive && (
                <div className="absolute inset-0 z-[25] bg-black text-white">
                    <div className="absolute inset-0 opacity-60">
                        <img src={movie.coverImage || movie.poster} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="relative h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-t from-black via-black/40 to-black/80 pointer-events-none">
                        <h1 className="text-3xl sm:text-6xl font-black mb-4 drop-shadow-2xl text-white tracking-tight">{movie.title}</h1>
                        <p className="max-w-2xl text-white/80 text-sm sm:text-lg line-clamp-3 leading-relaxed drop-shadow-md">{movie.description}</p>
                    </div>
                </div>
            )}

            {/* ── Click zone (play/pause) icon ── */}
            <div className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer group/center" onClick={togglePlay}>
                {!isPlaying && !isBuffering && movie.videoUrl && (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm transition-all duration-300 group-hover/center:scale-110 group-hover/center:bg-blue-600/60 shadow-2xl">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-white ml-2 transition-transform duration-300 group-hover/center:scale-110">
                            <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}
            </div>

            {/* ── Buffering Spinner ── */}
            {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 bg-black/40">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                </div>
            )}

            {/* ── Top Bar ── */}
            <div className={`w-full absolute top-0 right-0 left-0 pointer-events-none z-20 transition-all duration-500 ${(showControls || !isPlaying || isBuffering) ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-px'}`}>
                <div>
                    <div className="absolute w-full transition-all z-10 top-0 left-0 right-0 h-[80px] md:h-[120px] bg-gradient-to-b to-transparent from-black/50"></div>
                </div>
                <div className="relative z-20 p-4 md:p-8">
                    <div className="flex w-full justify-between items-start">
                        <div className="flex flex-row gap-4">
                            <div className="flex flex-row items-center">
                                <div className="pointer-events-auto flex flex-row items-center">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleBack(); }}
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

            {/* ── Bottom Controls ── */}
            <div className={`w-full absolute bottom-0 right-0 left-0 pointer-events-none transition-all duration-500 z-20 ${(showControls || !isPlaying || isBuffering) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}>
                <div className="relative z-20 p-4 md:p-8">
                    <div className="flex flex-col w-full justify-between md:gap-1.5">
                        <div className="flex justify-between" dir="ltr">
                            <div className="flex flex-row justify-between items-end w-full pointer-events-none">
                                <div className="w-full flex flex-col items-start">
                                    <span className="text-md sm:text-lg text-white drop-shadow-lg font-medium">{movie.title}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 pointer-events-auto">
                            <div className="group relative w-full h-10 flex items-center cursor-pointer select-none"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!videoRef.current || duration <= 0) return;
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const clickX = e.clientX - rect.left;
                                    const newTime = (clickX / rect.width) * duration;
                                    videoRef.current.currentTime = newTime;
                                    setCurrentTime(newTime);
                                }}
                            >
                                <div className="relative w-full bg-white/25 rounded-full transition-[height] duration-100 h-1 group-hover:h-1.5">
                                    <div className="absolute top-0 left-0 h-full bg-white/25 rounded-full" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}></div>
                                    <div className="absolute top-0 left-0 h-full bg-blue-500 rounded-full" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}></div>
                                    <div className="absolute top-1/2 rounded-full bg-white border border-white/50 shadow-md transition-opacity duration-150 -translate-x-1/2 -translate-y-1/2 group-data-[dragging]:opacity-100 opacity-0 group-hover:opacity-100 w-4 h-4" style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}></div>
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
                                <button className="flex items-center justify-center font-medium whitespace-nowrap relative overflow-hidden transition-all h-10 text-sm px-4 rounded-md cursor-pointer text-white bg-opacity-20 hover:bg-opacity-15 backdrop-blur-sm transform-gpu bg-white/5" onClick={(e) => { e.stopPropagation(); skipTime(-10); }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-ccw h-3.5 w-3.5" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                                    <span className="ml-1 text-xs font-medium">10</span>
                                </button>
                                <button className="flex items-center justify-center font-medium whitespace-nowrap relative overflow-hidden transition-all h-10 text-sm px-4 rounded-md cursor-pointer text-white bg-opacity-20 hover:bg-opacity-15 backdrop-blur-sm transform-gpu bg-white/5" onClick={(e) => { e.stopPropagation(); skipTime(10); }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-cw h-3.5 w-3.5" aria-hidden="true"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></svg>
                                    <span className="ml-1 text-xs font-medium">10</span>
                                </button>
                                <div className="w-px mx-1 h-5 bg-white/25"></div>
                                <button className="justify-center font-medium whitespace-nowrap relative overflow-hidden transition-all h-10 text-sm px-4 rounded-md text-white bg-opacity-20 hover:bg-opacity-15 backdrop-blur-sm transform-gpu bg-white/5 flex items-center cursor-auto">
                                    <div className="text-sm">{formatTime(currentTime)}</div>
                                    <div className="mx-1 text-white/50 text-sm">/</div>
                                    <div className="text-sm">{formatTime(duration || 0)}</div>
                                </button>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center font-medium whitespace-nowrap relative overflow-hidden transition-all h-10 text-sm rounded-md cursor-pointer text-white bg-opacity-20 hover:bg-opacity-15 backdrop-blur-sm transform-gpu bg-white/5 px-0">
                                    <button className="w-full h-full px-3" onClick={(e) => { e.stopPropagation(); togglePiP(); }} title="PIP">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-picture-in-picture-2 w-6 h-6" aria-hidden="true"><path d="M21 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h4"></path><rect width="10" height="7" x="12" y="13" rx="2"></rect></svg>
                                    </button>
                                </div>
                                <div className="flex items-center justify-center font-medium whitespace-nowrap relative overflow-hidden transition-all h-10 text-sm rounded-md cursor-pointer text-white bg-opacity-20 hover:bg-opacity-15 backdrop-blur-sm transform-gpu bg-white/5 px-0 py-0">
                                    <button className="w-full h-full px-3" onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} title={isFullscreen ? "Quitter" : "Plein écran"}>
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

        </div>
    );
}
