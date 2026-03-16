import { ApiService } from './api.service';

export interface Movie {
    id: string;
    title: string;
    poster: string;
    coverImage: string;
    titleLogo: string;
    description: string;
    ageRating: string;
    score: number;
    voteCount?: number;
    section: 'Tendances' | 'Top 10' | 'Action' | 'Horreur' | 'Animé' | 'Fantastique' | 'Aventure' | 'Comédie';
    genres: string[];
    releaseDate: string;
    isTop10: boolean;
    isHero: boolean;
    status: 'active' | 'inactive' | 'scheduled';
    scheduledDate?: string;
    badge?: 'new' | 'recent';
    videoUrl?: string;
    duration?: string;
    createdAt: string;
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

export class MoviesService extends ApiService {
    async getAllMovies(): Promise<Movie[]> {
        return this.request<Movie[]>('/movies');
    }

    async getMovie(id: string): Promise<Movie> {
        return this.request<Movie>(`/movies/${id}`);
    }

    async createMovie(movie: Omit<Movie, 'id' | 'createdAt'>): Promise<Movie> {
        return this.request<Movie>('/movies', {
            method: 'POST',
            body: JSON.stringify(movie),
        });
    }

    async updateMovie(id: string, updates: Partial<Movie>): Promise<Movie> {
        return this.request<Movie>(`/movies/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
    }

    async deleteMovie(id: string): Promise<void> {
        return this.request<void>(`/movies/${id}`, {
            method: 'DELETE',
            body: JSON.stringify({}),
        });
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
}

export const moviesService = new MoviesService();
