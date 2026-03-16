import { io, Socket } from 'socket.io-client';
import { ServiceConfig } from './config';

class SocketService {
    private socket: Socket | null = null;

    connect(): Socket {
        if (!this.socket) {
            const token = typeof window !== 'undefined' ? 
                document.cookie.match(new RegExp('(^| )cineo_session_token=([^;]+)'))?.[2] : null;
            
            this.socket = io(ServiceConfig.API_URL, {
                transports: ['websocket'],
                auth: {
                    token: token
                }
            });
            
            this.socket.on('connect', () => {
                console.log('Socket connected');
            });

            this.socket.on('disconnect', () => {
                console.log('Socket disconnected');
            });
        }
        return this.socket;
    }

    on(event: string, callback: (...args: any[]) => void) {
        if (!this.socket) this.connect();
        this.socket?.on(event, callback);
    }

    off(event: string, callback?: (...args: any[]) => void) {
        if (this.socket) {
            this.socket.off(event, callback);
        }
    }
    
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export const socketService = new SocketService();
