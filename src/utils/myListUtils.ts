import { apiService } from '../services/api.service';

export interface MovieItem {
    id: string | number;
    title: string;
    image: string;
    rating: number;
    year: number;
    category: string;
    duration?: string;
    description?: string;
    [key: string]: any;
}

let cachedIds: Set<string> | null = null;
let cachedIdsAt = 0;
let cachedMovies: MovieItem[] | null = null;
let cachedMoviesAt = 0;
const CACHE_TTL_MS = 30_000;

const toKey = (id: string | number) => String(id);

const emitUpdate = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event('my-list-updated'));
};

export const getMyList = async (): Promise<MovieItem[]> => {
    const now = Date.now();
    if (cachedMovies && now - cachedMoviesAt < CACHE_TTL_MS) return cachedMovies;

    const movies = await apiService.get<any[]>('/favorites');
    const normalized = (Array.isArray(movies) ? movies : []).map((m) => ({
        ...m,
        image: m.poster || m.coverImage || m.image,
        rating: typeof m.score === 'number' ? m.score : Number(m.score || 0),
        year: m.releaseDate ? new Date(m.releaseDate).getFullYear() : 0,
        category: m.section || '',
    })) as MovieItem[];

    cachedMovies = normalized;
    cachedMoviesAt = now;
    cachedIds = new Set(normalized.map((m) => toKey(m.id)));
    cachedIdsAt = now;
    return normalized;
};

const getIds = async (): Promise<Set<string>> => {
    const now = Date.now();
    if (cachedIds && now - cachedIdsAt < CACHE_TTL_MS) return cachedIds;
    const ids = await apiService.get<string[]>('/favorites/ids');
    cachedIds = new Set((Array.isArray(ids) ? ids : []).map(toKey));
    cachedIdsAt = now;
    return cachedIds;
};

export const addToMyList = async (movie: MovieItem): Promise<boolean> => {
    const idKey = toKey(movie.id);
    const ids = await getIds();
    if (ids.has(idKey)) return false;

    await apiService.post(`/favorites/${idKey}`, {});
    ids.add(idKey);
    cachedIdsAt = Date.now();
    cachedMovies = null;
    cachedMoviesAt = 0;
    emitUpdate();
    return true;
};

export const removeFromMyList = async (id: string | number): Promise<boolean> => {
    const idKey = toKey(id);
    const ids = await getIds();
    if (!ids.has(idKey)) return false;

    await apiService.delete(`/favorites/${idKey}`);
    ids.delete(idKey);
    cachedIdsAt = Date.now();
    cachedMovies = null;
    cachedMoviesAt = 0;
    emitUpdate();
    return true;
};

export const isInMyList = async (id: string | number): Promise<boolean> => {
    const ids = await getIds();
    return ids.has(toKey(id));
};
