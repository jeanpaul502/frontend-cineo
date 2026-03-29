import { ApiService } from './api.service';

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'user' | 'admin';
    accountStatus: 'active' | 'blocked'; // Backend field
    subscriptionType: 'free' | 'premium' | 'vip';
    lastIp?: string;
    lastCountry?: string;
    lastCountryCode?: string;
    lastCity?: string;
    lastDevice?: string;
    lastActive?: string; // ISO date string
    profilePicture?: string;
    createdAt: string;
    isVerified: boolean; // Backend verification flag

    // Computed/Frontend helpers (optional, can be derived in component)
    status?: 'online' | 'offline' | 'blocked';
}

class UsersService extends ApiService {
    async getAllUsers(): Promise<User[]> {
        return this.request<User[]>('/users');
    }

    async updateUser(id: string, updates: Partial<User>): Promise<User> {
        return this.request<User>(`/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
    }

    async deleteUser(id: string): Promise<void> {
        return this.request<void>(`/users/${id}`, {
            method: 'DELETE',
        });
    }
}

export const usersService = new UsersService();
