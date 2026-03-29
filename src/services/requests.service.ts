import { ApiService } from './api.service';

export type RequestType = 'movie' | 'series' | 'tv_channel';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type NotificationMethod = 'whatsapp' | 'email' | 'telegram' | null;

export interface MediaRequestUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

export interface MediaRequest {
    id: string;
    type: RequestType;
    title: string;
    tmdbId?: number | null;
    poster?: string | null;
    overview?: string | null;
    releaseDate?: string | null;
    status: RequestStatus;
    notificationMethod?: NotificationMethod;
    contactInfo?: string | null;
    userId?: string | null;
    user?: MediaRequestUser | null;
    createdAt: string;
    updatedAt: string;
}

class RequestsApiService extends ApiService {
    async getAdminRequests(): Promise<MediaRequest[]> {
        return this.request<MediaRequest[]>('/requests/admin');
    }

    async updateRequestStatus(id: string, status: RequestStatus): Promise<MediaRequest> {
        return this.request<MediaRequest>(`/requests/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    }

    async deleteRequest(id: string): Promise<void> {
        return this.request<void>(`/requests/${id}`, {
            method: 'DELETE',
        });
    }
}

export const requestsService = new RequestsApiService();

