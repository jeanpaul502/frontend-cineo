import { ServiceConfig } from './config';

/**
 * Base API Service for centralized request handling and token injection
 */
export class ApiService {
    protected baseUrl = ServiceConfig.API_URL;

    protected getToken(): string | null {
        if (typeof document === 'undefined') return null;
        const match = document.cookie.match(new RegExp('(^| )cineo_session_token=([^;]+)'));
        return match ? match[2] : null;
    }

    public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const token = this.getToken();
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
        console.log(`[API] ${options.method || 'GET'} Request to: ${url}`);

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            console.log(`[API] Response from ${url} - Status: ${response.status}`);

            // Handle empty responses (like 204 No Content)
            if (response.status === 204) {
                return {} as T;
            }

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                // If 401 Unauthorized, we might want to trigger logout or redirect
                if (response.status === 401) {
                    console.warn('Unauthorized access - Token might be invalid');
                    // Optional: Trigger logout event or redirect
                }

                throw {
                    message: data.message || data.error || `Error ${response.status}`,
                    code: data.code,
                    status: response.status
                };
            }

            return data as T;
        } catch (error: any) {
            // Re-throw formatted error
            throw error;
        }
    }

    public async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    public async post<T>(endpoint: string, body: any, options: RequestInit = {}): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    public async put<T>(endpoint: string, body: any, options: RequestInit = {}): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    public async delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }

    public async patch<T>(endpoint: string, body: any, options: RequestInit = {}): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(body)
        });
    }
}

export const apiService = new ApiService();
