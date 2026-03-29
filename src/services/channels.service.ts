import { ServiceConfig } from './config';
import { apiService } from './api.service';

export interface Channel {
    id: string;
    name: string;
    url: string;
    status: 'active' | 'inactive';
    logo?: string;
}

export interface ParsedChannel {
    name: string;
    url: string;
    logo?: string;
    group?: string;
}

export interface Playlist {
    id: string;
    name: string;
    country: string;
    countryCode?: string;
    channels: Channel[];
    status: 'active' | 'inactive';
    createdAt: string;
}

export interface ImportM3UResult {
    imported: number;
    skipped: number;
    total: number;
}

class ChannelsService {

    async getAllChannels(): Promise<Channel[]> {
        return apiService.request<Channel[]>('/channels');
    }

    /**
     * Importe des chaînes depuis une URL M3U via le backend (server-side).
     * Le serveur fetche le M3U, le parse et insère les chaînes en masse.
     * Avantage : pas de CORS, gestion SSL auto-signé, insertion en masse.
     */
    async importM3U(playlistId: string, m3uUrl: string): Promise<ImportM3UResult> {
        return apiService.request<ImportM3UResult>(`/channels/playlists/${playlistId}/import-m3u`, {
            method: 'POST',
            body: JSON.stringify({ m3uUrl })
        });
    }

    async getAllPlaylists(): Promise<Playlist[]> {
        return apiService.request<Playlist[]>('/channels/playlists');
    }

    async createPlaylist(data: Partial<Playlist>): Promise<Playlist> {
        return apiService.request<Playlist>('/channels/playlists', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updatePlaylist(id: string, data: Partial<Playlist>): Promise<Playlist> {
        return apiService.request<Playlist>(`/channels/playlists/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    async addChannelToPlaylist(playlistId: string, channel: Omit<Channel, 'id' | 'status'>): Promise<Playlist> {
        await apiService.request<Channel>('/channels', {
            method: 'POST',
            body: JSON.stringify({ ...channel, playlistId })
        });
        return this.getPlaylist(playlistId);
    }

    async removeChannelFromPlaylist(playlistId: string, channelId: string): Promise<Playlist> {
        await apiService.request(`/channels/${channelId}`, { method: 'DELETE' });
        return this.getPlaylist(playlistId);
    }

    async togglePlaylistStatus(id: string): Promise<Playlist> {
        const playlist = await this.getPlaylist(id);
        const newStatus = playlist.status === 'active' ? 'inactive' : 'active';
        return this.updatePlaylist(id, { status: newStatus });
    }

    async toggleChannelStatus(playlistId: string, channelId: string): Promise<Playlist> {
        const playlist = await this.getPlaylist(playlistId);
        const channel = playlist.channels.find(c => c.id === channelId);
        if (!channel) throw new Error('Channel not found');
        const newStatus = channel.status === 'active' ? 'inactive' : 'active';
        await apiService.request<Channel>(`/channels/${channelId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });
        return this.getPlaylist(playlistId);
    }

    async getPlaylist(id: string): Promise<Playlist> {
        return apiService.request<Playlist>(`/channels/playlists/${id}`);
    }

    async deletePlaylist(id: string): Promise<void> {
        return apiService.request<void>(`/channels/playlists/${id}`, { method: 'DELETE' });
    }
}

export const channelsService = new ChannelsService();
export default channelsService;
