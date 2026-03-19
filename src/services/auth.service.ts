import { ServiceConfig } from './config';
import { ApiService } from './api.service';
import { socketService } from './socket.service';

export interface LoginDto {
    email: string;
    password: string;
}

export interface RegisterDto {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}

export interface AuthResponse {
    access_token?: string;
    resetToken?: string;
    user?: any;
    message?: string;
    error?: string;
    code?: string;
}

class AuthService extends ApiService {
    private setToken(token: string) {
        if (typeof document === 'undefined') return;
        const d = new Date();
        d.setTime(d.getTime() + (7*24*60*60*1000));
        document.cookie = `cineo_session_token=${token};expires=${d.toUTCString()};path=/;SameSite=Lax`;
    }

    private removeToken() {
        if (typeof document === 'undefined') return;
        document.cookie = 'cineo_session_token=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
    }

    async login(credentials: LoginDto): Promise<AuthResponse> {
        // Collect device info similar to mobile app
        const deviceInfo = await this.getDeviceInfo();
        
        const response = await this.request<AuthResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                ...credentials,
                ...deviceInfo
            }),
        });
        if (response.access_token) {
            this.setToken(response.access_token);
        }
        return response;
    }

    private async getDeviceInfo() {
        if (typeof window === 'undefined') return {};
        
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('deviceId', deviceId);
        }

        let location = 'Unknown';
        let city = '';
        let country = '';
        let countryCode = '';
        let ipAddress = '';

        try {
            const response = await fetch('https://ipwho.is/');
            const data = await response.json();
            if (data.success) {
                location = `${data.country}, ${data.city}`;
                city = data.city;
                country = data.country;
                countryCode = data.country_code;
                ipAddress = data.ip;
            } else {
                throw new Error('ipwho.is failed');
            }
        } catch (e) {
            try {
                const response = await fetch('https://ipapi.co/json/');
                const data = await response.json();
                if (data.city && data.country_name) {
                    location = `${data.country_name}, ${data.city}`;
                    city = data.city;
                    country = data.country_name;
                    countryCode = data.country_code;
                    ipAddress = data.ip;
                }
            } catch (e2) {
                // Ignore fallback error
            }
        }

        const userAgent = window.navigator.userAgent;
        let device = 'Desktop';
        let os = 'Unknown OS';
        let browser = 'Unknown';

        // Detect Browser
        if (userAgent.indexOf('Firefox') > -1) browser = 'Firefox';
        else if (userAgent.indexOf('Chrome') > -1) browser = 'Chrome';
        else if (userAgent.indexOf('Safari') > -1) browser = 'Safari';
        else if (userAgent.indexOf('Edge') > -1) browser = 'Edge';

        // Detect OS and Device Name
        if (userAgent.indexOf('Win') !== -1) {
            os = 'Windows';
            device = 'Windows';
            // Detect Windows Version
            const match = userAgent.match(/Windows NT (\d+\.\d+)/);
            if (match) {
                const version = parseFloat(match[1]);
                if (version === 10.0) {
                     device = 'Windows 10';
                     os = 'Windows 10';
                     // Check for Windows 11 via Client Hints if available
                     try {
                         // @ts-ignore
                         if (navigator.userAgentData) {
                             // @ts-ignore
                             const uaData = await navigator.userAgentData.getHighEntropyValues(['platformVersion']);
                             if (uaData.platformVersion) {
                                 const major = parseInt(uaData.platformVersion.split('.')[0]);
                                 if (major >= 13) {
                                     device = 'Windows 11';
                                     os = 'Windows 11';
                                 }
                             }
                         }
                     } catch (e) {
                         // Fallback to Windows 10
                     }
                } else if (version === 6.3) { device = 'Windows 8.1'; os = 'Windows 8.1'; }
                else if (version === 6.2) { device = 'Windows 8'; os = 'Windows 8'; }
                else if (version === 6.1) { device = 'Windows 7'; os = 'Windows 7'; }
            }
        }
        else if (userAgent.indexOf('Mac') !== -1) {
            os = 'macOS';
            device = 'Mac';
            if (userAgent.indexOf('iPhone') !== -1) {
                 device = 'iPhone';
                 const match = userAgent.match(/OS (\d+)_/);
                 if (match) device = `iPhone (iOS ${match[1]})`;
            } else if (userAgent.indexOf('iPad') !== -1) {
                 device = 'iPad';
                 const match = userAgent.match(/OS (\d+)_/);
                 if (match) device = `iPad (iOS ${match[1]})`;
            }
        }
        else if (userAgent.indexOf('Linux') !== -1) {
            os = 'Linux';
            device = 'Linux';
            if (userAgent.indexOf('Android') !== -1) {
                os = 'Android';
                const match = userAgent.match(/Android\s([0-9.]+)/);
                if (match) {
                    device = `Android ${match[1]}`;
                } else {
                    device = 'Android';
                }
            }
        }

        let deviceType = 'desktop';
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
            if (/iPad|Tablet/i.test(userAgent)) {
                deviceType = 'tablet';
            } else {
                deviceType = 'mobile';
            }
        }

        return {
            device: device,
            deviceType: deviceType,
            browser: browser,
            os: os,
            location: location,
            city: city,
            country: country,
            countryCode: countryCode,
            ipAddress: ipAddress,
            deviceId: deviceId,
        };
    }

    async register(data: RegisterDto): Promise<AuthResponse> {
        const response = await this.request<AuthResponse>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        if (response.access_token) {
            this.setToken(response.access_token);
        }
        return response;
    }

    async verifyCode(email: string, code: string): Promise<AuthResponse> {
        return this.request<AuthResponse>('/auth/verify-code', {
            method: 'POST',
            body: JSON.stringify({ email, code }),
        });
    }

    async verifyEmail(email: string, code: string): Promise<AuthResponse> {
        return this.request<AuthResponse>('/auth/verify-email', {
            method: 'POST',
            body: JSON.stringify({ email, code }),
        });
    }

    async resendVerificationCode(email: string): Promise<AuthResponse> {
        return this.request<AuthResponse>('/auth/resend-verification-code', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    }

    async forgotPassword(email: string): Promise<AuthResponse> {
        return this.request<AuthResponse>('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    }

    async verifyPin(email: string, pin: string): Promise<AuthResponse> {
        return this.request<AuthResponse>('/auth/verify-pin', {
            method: 'POST',
            body: JSON.stringify({ email, pin }),
        });
    }

    async resendPin(email: string): Promise<AuthResponse> {
        return this.request<AuthResponse>('/auth/resend-pin', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    }

    async resetPassword(token: string, newPassword: string): Promise<AuthResponse> {
        return this.request<AuthResponse>('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, newPassword }),
        });
    }

    async getProfile(retry = true): Promise<any> {
        try {
            return await this.request<any>(`/auth/profile?t=${Date.now()}`, {
                credentials: 'include',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
        } catch (error: any) {
            if (error.status === 401 && retry) {
                try {
                    await this.refreshToken();
                    return this.getProfile(false);
                } catch (e) {
                    throw error;
                }
            }
            throw error;
        }
    }

    async getCurrentUser(retry = true): Promise<any> {
        return this.getProfile(retry);
    }

    async refreshToken(): Promise<any> {
        return this.request<any>('/auth/refresh', {
            method: 'POST',
            credentials: 'include'
        });
    }

    async logout(): Promise<void> {
        try {
            await this.request<void>('/auth/logout', {
                method: 'POST'
            });
        } catch (e) {
            // Ignore error on logout (token might be invalid already)
        } finally {
            this.removeToken();
            socketService.disconnect();
        }
    }

    async getSessions(userId: string): Promise<any[]> {
        return this.request<any[]>(`/users/${userId}/sessions?t=${Date.now()}`);
    }

    async deleteSession(userId: string, sessionId: string | number): Promise<void> {
        return this.request<void>(`/users/${userId}/sessions/${sessionId}`, {
            method: 'DELETE'
        });
    }

    async deleteAccount(): Promise<void> {
        await this.request<void>('/auth/delete', {
            method: 'DELETE',
        });
        this.removeToken();
    }

    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        const user = await this.getCurrentUser();
        if (user && user.id) {
             return this.request<void>(`/users/${user.id}/password`, {
                method: 'PATCH',
                body: JSON.stringify({ currentPassword, newPassword })
            });
        }
    }

    async sendHeartbeat(): Promise<void> {
        try {
            await this.request<void>('/users/heartbeat', {
                method: 'POST',
            });
        } catch (e) {
            // Ignore heartbeat errors
        }
    }

    async updateProfile(data: any): Promise<any> {
        return this.request<any>('/auth/profile', {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }
}

export const authService = new AuthService();
