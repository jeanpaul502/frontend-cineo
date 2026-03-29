'use client';

import { useEffect } from 'react';
import { authService } from '../services/auth.service';

export function ActivityMonitor() {
    useEffect(() => {
        // Initial heartbeat
        const checkAndSend = () => {
             if (typeof document !== 'undefined' && document.cookie.includes('cineo_session_token')) {
                authService.sendHeartbeat();
            }
        };

        checkAndSend();

        const interval = setInterval(checkAndSend, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, []);

    return null;
}
