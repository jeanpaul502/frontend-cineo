import { ApiService } from './api.service';
import { cacheService, CACHE_KEYS } from './cache.service';

export interface Movie {
    id: string;
    title: string;
    poster: string;
    coverImage: string;
    titleLogo: string;
    description: string;
    overview?: string;
    ageRating: string;
    score: number;
    voteAverage?: number;
    voteCount?: number;
    section: 'Tendances' | 'Top 10' | 'Action' | 'Horreur' | 'Animé' | 'Fantastique' | 'Aventure' | 'Comédie';
    genres: string[] | string;
    releaseDate: string;
    isTop10: boolean;
    isHero: boolean;
    status: 'active' | 'inactive' | 'scheduled';
    scheduledDate?: string;
    badge?: 'new' | 'recent';
    videoUrl?: string;
    duration?: string | number;
    director?: string;
    logoPath?: string;
    image?: string;
    rank?: number;
    cast?: { name: string; image: string }[];
    createdAt: string;
    updatedAt: string;
}

export interface TmdbSearchResult {
    id: number;
    title: string;
    releaseDate: string;
    poster: string | null;
    overview: string;
    type?: 'movie' | 'series';
    voteAverage?: number;
}

const MOVIES_TTL = 5 * 60 * 1000; // 5 minutes

export class MoviesService extends ApiService {

    /**
     * Récupère tous les films avec stratégie Stale-While-Revalidate :
     * - Retourne le cache instantanément si disponible
     * - Fetch en arrière-plan si le cache est périmé
     * - onUpdate() est appelé quand les nouvelles données arrivent
     */
    async getAllMovies(onUpdate?: (movies: Movie[]) => void): Promise<Movie[]> {
        const cached = cacheService.get<Movie[]>(CACHE_KEYS.MOVIES);

        if (cached) {
            // Cache disponible → retourner immédiatement
            if (!cacheService.isFresh(CACHE_KEYS.MOVIES, MOVIES_TTL) && onUpdate) {
                // Cache périmé → refresh en arrière-plan sans bloquer
                this.fetchAndCacheMovies().then(fresh => {
                    if (fresh) onUpdate(fresh);
                }).catch(console.error);
            }
            return cached;
        }

        // Pas de cache → fetch bloquant (premier chargement)
        return this.fetchAndCacheMovies() ?? [];
    }

    /**
     * Fetch depuis l'API et met à jour le cache
     */
    async fetchAndCacheMovies(): Promise<Movie[]> {
        const data = await this.request<Movie[]>('/movies');
        cacheService.set(CACHE_KEYS.MOVIES, data);
        return data;
    }

    /**
     * Applique une mise à jour WebSocket au cache local
     */
    applyWebSocketUpdate(event: 'created' | 'updated' | 'deleted', movie: Movie | { id: string }) {
        switch (event) {
            case 'created':
                cacheService.addItem<Movie>(CACHE_KEYS.MOVIES, movie as Movie);
                break;
            case 'updated':
                cacheService.updateItem<Movie>(CACHE_KEYS.MOVIES, movie as Movie);
                break;
            case 'deleted':
                cacheService.removeItem(CACHE_KEYS.MOVIES, (movie as { id: string }).id);
                break;
        }
    }

    async getMovie(id: string): Promise<Movie> {
        // Essayer de trouver le film dans le cache d'abord
        const cached = cacheService.get<Movie[]>(CACHE_KEYS.MOVIES);
        const found = cached?.find(m => m.id === id);
        if (found) return found;

        return this.request<Movie>(`/movies/${id}`);
    }

    async createMovie(movie: Omit<Movie, 'id' | 'createdAt'>): Promise<Movie> {
        const created = await this.request<Movie>('/movies', {
            method: 'POST',
            body: JSON.stringify(movie),
        });
        cacheService.addItem<Movie>(CACHE_KEYS.MOVIES, created);
        return created;
    }

    async updateMovie(id: string, updates: Partial<Movie>): Promise<Movie> {
        const updated = await this.request<Movie>(`/movies/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
        cacheService.updateItem<Movie>(CACHE_KEYS.MOVIES, updated);
        return updated;
    }

    async deleteMovie(id: string): Promise<void> {
        await this.request<void>(`/movies/${id}`, {
            method: 'DELETE',
            body: JSON.stringify({}),
        });
        cacheService.removeItem(CACHE_KEYS.MOVIES, id);
    }

    async searchTmdb(query: string, type: 'movie' | 'series' = 'movie'): Promise<TmdbSearchResult[]> {
        return this.request<TmdbSearchResult[]>(`/movies/search/tmdb?query=${encodeURIComponent(query)}&type=${type}`);
    }

    async getTmdbDetails(tmdbId: string): Promise<Partial<Movie>> {
        return this.request<Partial<Movie>>(`/movies/tmdb/${tmdbId}`);
    }

    async createRequest(data: {
        type: 'movie' | 'series' | 'tv_channel';
        title: string;
        tmdbId?: number;
        poster?: string;
        overview?: string;
        releaseDate?: string;
        notificationMethod?: string;
        contactInfo?: string;
        userId?: string;
    }): Promise<any> {
        return this.request<any>('/requests', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Trigger a real download with progress tracking.
     * The backend streams an FFmpeg-converted file.
     * @param movieId   ID of the movie
     * @param format    'mp4' | 'mkv' | 'avi'
     * @param onProgress  callback(percent 0-100)
     * @param onDone      callback(objectUrl) – called when file is ready
     */
    async downloadMovie(
        movieId: string,
        format: string,
        onProgress: (percent: number) => void,
        onDone: (result: { filename: string; blob: Blob; blobUrl: string }) => void,
        onStats?: (stats: { loadedBytes: number; totalBytes: number }) => void,
        options?: { signal?: AbortSignal },
    ): Promise<void> {
        const token = this.getToken();
        const url = `${this.baseUrl}/movies/${movieId}/download?format=${format.toLowerCase()}`;

        let res: Response;
        try {
            res = await fetch(url, {
                headers: {
                    Authorization: token ? `Bearer ${token}` : '',
                },
                signal: options?.signal,
            });
        } catch (err: any) {
            if (err?.name === 'AbortError') throw err;
            throw err;
        }

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `Erreur serveur ${res.status}`);
        }

        let loaded = 0;

        const reader = res.body?.getReader();
        if (!reader) throw new Error('Impossible de lire le flux de la réponse.');

        const disposition = res.headers.get('Content-Disposition') || '';
        const match = disposition.match(/filename="(.+?)"/);
        const filename = match ? match[1] : `film.${format.toLowerCase()}`;

        const chunks: Uint8Array[] = [];
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                loaded += value.length;
                onStats?.({ loadedBytes: loaded, totalBytes: 0 });
                // Pas de taille totale fiable : laisser l'UI utiliser le progrès serveur (WebSocket)
            }
        } catch (err: any) {
            if (err?.name === 'AbortError') {
                throw err;
            }
            throw err;
        }

        onStats?.({ loadedBytes: loaded, totalBytes: 0 });
        onProgress(100);

        const blob = new Blob(chunks.map(c => c.buffer as ArrayBuffer));
        const blobUrl = URL.createObjectURL(blob);
        onDone({ filename, blob, blobUrl });
    }
}

export const moviesService = new MoviesService();
