import { io, Socket } from 'socket.io-client';
import { ServiceConfig } from './config';

class SocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();

    private getToken(): string | null {
        if (typeof window === 'undefined') return null;
        const match = document.cookie.match(new RegExp('(^| )cineo_session_token=([^;]+)'));
        return match ? match[2] : null;
    }

    connect(): Socket {
        if (this.socket?.connected) return this.socket;

        // Si déjà instancié mais déconnecté, reconnecter
        if (this.socket) {
            this.socket.connect();
            return this.socket;
        }

        const token = this.getToken();

        this.socket = io(ServiceConfig.API_URL, {
            // Essayer WebSocket d'abord, fallback sur polling si bloqué
            transports: ['websocket', 'polling'],
            auth: { token },
            // Reconnexion automatique robuste
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
            timeout: 20000,
            // Optimisations
            forceNew: false,
            multiplex: true,
        });

        this.socket.on('connect', () => {
            console.log('[Socket] Connected ✓', this.socket?.id);
            // Re-attacher tous les listeners après reconnexion
            this.reattachListeners();
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
            // Si le serveur a coupé, se reconnecter automatiquement
            if (reason === 'io server disconnect') {
                this.socket?.connect();
            }
        });

        this.socket.on('connect_error', (err) => {
            console.warn('[Socket] Connection error:', err.message);
        });

        return this.socket;
    }

    /**
     * Re-attache tous les listeners enregistrés après une reconnexion
     */
    private reattachListeners(): void {
        this.listeners.forEach((callbacks, event) => {
            callbacks.forEach(cb => {
                this.socket?.off(event, cb); // éviter les doublons
                this.socket?.on(event, cb);
            });
        });
    }

    on(event: string, callback: (...args: any[]) => void): void {
        if (!this.socket) this.connect();

        // Stocker le listener pour la reconnexion
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);

        this.socket?.on(event, callback);
    }

    off(event: string, callback?: (...args: any[]) => void): void {
        if (callback) {
            this.listeners.get(event)?.delete(callback);
            this.socket?.off(event, callback);
        } else {
            this.listeners.delete(event);
            this.socket?.off(event);
        }
    }

    emit(event: string, data?: any): void {
        if (!this.socket?.connected) {
            this.connect();
        }
        this.socket?.emit(event, data);
    }

    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }

    disconnect(): void {
        if (this.socket) {
            this.listeners.clear();
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export const socketService = new SocketService();
