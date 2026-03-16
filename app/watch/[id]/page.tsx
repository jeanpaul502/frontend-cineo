'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
    const [isPlaying, setIsPlaying] = useState(false); // Default to false, let autoplay trigger true
    const [showControls, setShowControls] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);

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
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }
        };
    }, [id]);

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

    // Initialize Player
    useEffect(() => {
        if (!movie?.videoUrl || !videoRef.current) return;

        const video = videoRef.current;
        const videoUrl = cleanVideoUrl(movie.videoUrl);

        // Cleanup previous instance
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        const handlePlay = () => {
            // Force unmuted state
            video.muted = false;
            video.volume = 1;
            setMuted(false);
            setVolume(1);

            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch((error: any) => {
                    // AbortError arrive quand on change la source / on recharge la vidéo
                    // pendant qu'un play() est encore en cours. Ce n'est pas une vraie erreur
                    // de lecture, on l'ignore simplement.
                    if (error && (error.name === 'AbortError' || error.code === 20)) {
                        return;
                    }

                    console.warn("Autoplay prevented or failed:", error);
                    // Ne pas forcer un autre play ici, on laisse l'utilisateur cliquer.
                    setIsPlaying(false);
                    setShowControls(true);
                });
            }
        };

        const initHls = (url: string, isUsingDirect: boolean, proxyUrl?: string) => {

            if (Hls.isSupported()) {
                const hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: false, // Disabled for better stability on VOD/weak connections
                    backBufferLength: 30,
                    maxBufferLength: 30,  // Increased for stability
                    maxMaxBufferLength: 60, // Increased for stability
                    fragLoadingTimeOut: 20000, // Increased timeout for slow connections
                    manifestLoadingTimeOut: 20000,
                    levelLoadingTimeOut: 20000,
                    fragLoadingMaxRetry: 5, // More retries for stability
                    manifestLoadingMaxRetry: 5,
                    startLevel: -1, // Auto quality selection
                    abrEwmaDefaultEstimate: 400000, // Conservative initial bandwidth estimate (400kbps) for faster start
                    capLevelToPlayerSize: true, // Limit quality to player size to save bandwidth
                    xhrSetup: (xhr, reqUrl) => {
                        const token = getToken();
                        if (token && reqUrl.includes(ServiceConfig.API_URL)) {
                            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                        }
                    }
                });

                hlsRef.current = hls;
                hls.loadSource(url);
                hls.attachMedia(video);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    handlePlay();
                });

                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (!data.fatal) {
                        return;
                    }

                    console.warn('HLS Fatal Error:', data);

                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        if (isUsingDirect && proxyUrl) {
                            console.warn('[WatchPage] Direct URL failed, switching to proxy in 500ms...');
                            setTimeout(() => {
                                if (hlsRef.current) {
                                    hlsRef.current.destroy();
                                    hlsRef.current = null;
                                }
                                initHls(proxyUrl, false, proxyUrl);
                            }, 500);
                        } else {
                            console.error('[WatchPage] Network error on proxy URL, giving up.');
                            setError('Impossible de lire cette vidéo (source bloquée ou indisponible).');
                            hls.destroy();
                        }
                    } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {

                        hls.recoverMediaError();
                    } else {
                        console.error('Unrecoverable HLS error');
                        setError('Impossible de lire cette vidéo.');
                        hls.destroy();
                    }
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Native HLS support (Safari)
                video.src = url;
                video.addEventListener('loadedmetadata', handlePlay);

                // Add error listener for native fallback
                const onNativeError = (e: any) => {
                    console.error("Native Video Error:", e);
                    if (!isUsingDirect && proxyUrl) {

                        video.src = proxyUrl;
                        video.load();
                    }
                };
                video.addEventListener('error', onNativeError, { once: true });
            }
        };

        const token = getToken();
        const isM3u8 = videoUrl.toLowerCase().split('?')[0].includes('.m3u8');
        const endpoint = isM3u8 ? 'proxy/m3u8' : 'proxy';
        const proxyUrl = `${ServiceConfig.API_URL}/${endpoint}?url=${encodeURIComponent(videoUrl)}${token ? `&token=${token}` : ''}`;



        // Try direct HLS URL first for faster startup.
        // If it fails (CORS / réseau), fallback automatique sur le proxy.
        initHls(videoUrl, true, proxyUrl);

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
            video.removeEventListener('loadedmetadata', handlePlay);
            video.removeAttribute('src'); // Clear source
            video.load(); // Reset video element
        };
    }, [movie]);

    // Event Listeners
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onTimeUpdate = () => setCurrentTime(video.currentTime);
        const onDurationChange = () => setDuration(video.duration);
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onEnded = () => setIsPlaying(false);
        const onWaiting = () => setIsBuffering(true);
        const onPlaying = () => setIsBuffering(false);
        const onError = (e: any) => console.error("Video Error Event:", e);

        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('durationchange', onDurationChange);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('ended', onEnded);
        video.addEventListener('waiting', onWaiting);
        video.addEventListener('playing', onPlaying);
        video.addEventListener('error', onError);

        return () => {
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('durationchange', onDurationChange);
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('ended', onEnded);
            video.removeEventListener('waiting', onWaiting);
            video.removeEventListener('playing', onPlaying);
            video.removeEventListener('error', onError);
        };
    }, [loading, movie]); // Re-bind when loading/movie changes (video ref might change)

    // Controls Visibility
    useEffect(() => {
        const handleMouseMove = () => {
            setShowControls(true);
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
            controlsTimeoutRef.current = setTimeout(() => {
                if (isPlaying) {
                    setShowControls(false);
                }
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
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, [isPlaying]);

    const fetchMovie = async () => {
        try {
            setLoading(true);
            const data = await moviesService.getMovie(id);
            setMovie(data);
        } catch (err) {
            console.error("Failed to fetch movie", err);
            setError("Impossible de charger le film.");
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        router.back();
    };

    const togglePlay = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!videoRef.current) return;

        if (videoRef.current.paused) {
            videoRef.current.play().catch(e => console.error("Play error:", e));
        } else {
            videoRef.current.pause();
        }
    };

    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        setCurrentTime(time);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
        }
    };

    const toggleMute = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!videoRef.current) return;
        const newMuted = !muted;
        setMuted(newMuted);
        videoRef.current.muted = newMuted;
        if (newMuted) setVolume(0);
        else setVolume(1);
    };

    const skipTime = (seconds: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime += seconds;
        }
    };

    const formatTime = (seconds: number) => {
        if (isNaN(seconds)) return "0:00";
        const date = new Date(seconds * 1000);
        const hh = date.getUTCHours();
        const mm = date.getUTCMinutes();
        const ss = date.getUTCSeconds().toString().padStart(2, '0');
        if (hh) {
            return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
        }
        return `${mm}:${ss}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !movie) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
                <Icon icon="solar:danger-circle-bold" width={64} className="text-red-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Erreur</h1>
                <p className="text-gray-400 mb-6">{error || "Film introuvable"}</p>
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
            onMouseLeave={() => setShowControls(false)}
        >
            {/* Video Element */}
            <div className="absolute inset-0 flex items-center justify-center bg-black">
                {movie.videoUrl ? (
                    <video
                        ref={videoRef}
                        className="w-full h-full object-contain"
                        playsInline
                        preload="auto"
                        crossOrigin="anonymous"
                        onClick={(e) => e.stopPropagation()}
                        autoPlay
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
                onClick={togglePlay}
            >
                {!isPlaying && !isBuffering && !loading && !error && (
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
                    <p className="text-white font-medium text-base tracking-wide drop-shadow-md">Chargement en cours...</p>
                </div>
            )}

            {/* En-tête avec bouton retour */}
            <div className={`w-full absolute top-0 right-0 left-0 pointer-events-none z-20 transition-all duration-500 ease-in-out ${showControls || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
                }`}>
                <div className="absolute w-full transition-all z-10 top-0 left-0 right-0 h-[120px] bg-gradient-to-b to-transparent from-black/50"></div>
                <div className="relative z-20 p-8">
                    <div className="flex w-full justify-between items-center">
                        <div className="flex flex-row gap-4">
                            <div className="flex flex-row items-center">
                                <div className="pointer-events-auto flex flex-row items-center">
                                    <button
                                        className="flex items-center justify-center font-medium whitespace-nowrap relative overflow-hidden transition-all transform-gpu h-10 text-sm px-4 rounded-md bg-transparent text-white hover:bg-white/10 cursor-pointer gap-3"
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
                </div>
            </div>

            {/* Contrôles */}
            <div className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ease-in-out z-20 ${showControls || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'
                }`}>
                {/* Bande noire */}
                <div className={`absolute w-full transition-all bottom-0 left-0 right-0 bg-black z-10 h-[calc(100%-160px)]`}></div>

                <div className="relative z-20 p-8 pt-2 pb-12">
                    <div className="flex flex-col w-full justify-between md:gap-1.5">
                        {/* Titre */}
                        <div className="flex justify-between mb-0" dir="ltr">
                            <div className="flex flex-row justify-between items-end w-full pointer-events-none">
                                <div className="w-full flex flex-col items-start">
                                    <span className="text-md sm:text-lg text-white drop-shadow-lg font-medium">{movie.title}</span>
                                </div>
                            </div>
                        </div>

                        {/* Barre de progression interactive */}
                        <div className="flex items-center space-x-3 pointer-events-auto mb-0">
                            <div className="group relative w-full h-10 flex items-center cursor-pointer select-none"
                                onClick={(e) => {
                                    e.stopPropagation();
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
                                <div className="w-full h-1 bg-white/25 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full transition-all duration-200 ease-out"
                                        style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* Contrôles principaux */}
                        <div className="flex justify-between pointer-events-auto" dir="ltr">
                            <div className="flex items-center gap-3">
                                {/* Bouton Play/Pause */}
                                <div className="flex items-center justify-center font-medium whitespace-nowrap relative overflow-hidden transition-all h-10 text-sm rounded-md cursor-pointer text-white bg-opacity-20 hover:bg-opacity-15 backdrop-blur-sm transform-gpu bg-white/5 py-0 px-0">
                                    <button className="w-full h-full px-3 py-2.5" onClick={(e) => {
                                        e.stopPropagation();
                                        togglePlay();
                                    }}>
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
                                </div>

                                {/* Contrôle du volume */}
                                <div className="relative flex items-center">
                                    <div
                                        className="justify-center font-medium whitespace-nowrap relative overflow-hidden transition-all h-10 text-sm px-4 rounded-md text-white bg-opacity-20 hover:bg-opacity-15 backdrop-blur-sm transform-gpu bg-white/5 pointer-events-auto flex items-center py-0 pr-1"
                                        onMouseEnter={() => setShowVolumeSlider(true)}
                                        onMouseLeave={() => setShowVolumeSlider(false)}
                                    >
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleMute();
                                            }}
                                            className="pr-2 text-2xl text-white flex items-center"
                                        >
                                            {muted ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                                    <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"></path>
                                                    <path d="M2 2l20 20"></path>
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                                    <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"></path>
                                                    <path d="M16 9a5 5 0 0 1 0 6"></path>
                                                    <path d="M19.364 18.364a9 9 0 0 0 0-12.728"></path>
                                                </svg>
                                            )}
                                        </button>

                                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showVolumeSlider ? 'w-24 px-2 opacity-100' : 'w-0 px-0 opacity-0'}`}>
                                            <div className="flex h-10 w-full items-center">
                                                <div className="relative h-1 flex-1 rounded-full bg-white bg-opacity-25 cursor-pointer">
                                                    <div className="absolute inset-y-0 left-0 flex items-center justify-end rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500" style={{ width: `${muted ? 0 : volume * 100}%` }}>
                                                        <div className="absolute h-3 w-3 translate-x-1/2 rounded-full bg-white"></div>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="1"
                                                        step="0.01"
                                                        value={muted ? 0 : volume}
                                                        onChange={(e) => {
                                                            const newVolume = parseFloat(e.target.value);
                                                            setVolume(newVolume);
                                                            const shouldMute = newVolume === 0;
                                                            setMuted(shouldMute);
                                                            if (videoRef.current) {
                                                                videoRef.current.volume = newVolume;
                                                                videoRef.current.muted = shouldMute;
                                                            }
                                                        }}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-px mx-1 h-5 bg-white/25"></div>

                                {/* Boutons Skip */}
                                <button className="flex items-center justify-center font-medium whitespace-nowrap relative overflow-hidden transition-all h-10 text-sm px-4 rounded-md cursor-pointer text-white bg-opacity-20 hover:bg-opacity-15 backdrop-blur-sm transform-gpu bg-white/5" onClick={(e) => {
                                    e.stopPropagation();
                                    skipTime(-10);
                                }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                                        <path d="M3 3v5h5"></path>
                                    </svg>
                                    <span className="ml-1 text-xs font-medium">10</span>
                                </button>

                                <button className="flex items-center justify-center font-medium whitespace-nowrap relative overflow-hidden transition-all h-10 text-sm px-4 rounded-md cursor-pointer text-white bg-opacity-20 hover:bg-opacity-15 backdrop-blur-sm transform-gpu bg-white/5" onClick={(e) => {
                                    e.stopPropagation();
                                    skipTime(10);
                                }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
                                        <path d="M21 3v5h-5"></path>
                                    </svg>
                                    <span className="ml-1 text-xs font-medium">10</span>
                                </button>

                                <div className="w-px mx-1 h-5 bg-white/25"></div>

                                {/* Affichage du temps */}
                                <button className="justify-center font-medium whitespace-nowrap relative overflow-hidden transition-all h-10 text-sm px-4 rounded-md text-white bg-opacity-20 hover:bg-opacity-15 backdrop-blur-sm transform-gpu bg-white/5 flex items-center cursor-auto">
                                    <div className="text-sm">{formatTime(currentTime)}</div>
                                    <div className="mx-1 text-white/50 text-sm">/</div>
                                    <div className="text-sm">{formatTime(duration)}</div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
