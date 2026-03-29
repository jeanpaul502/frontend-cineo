/**
 * CacheService — Cache local intelligent (localStorage + mémoire)
 * 
 * Stratégie "Stale-While-Revalidate" :
 * 1. Retourne les données en cache IMMÉDIATEMENT (0ms)
 * 2. Fetch les nouvelles données en arrière-plan
 * 3. WebSocket invalide/met à jour le cache en temps réel
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    version: number;
}

const CACHE_VERSION = 1;
const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes

class CacheService {
    private memoryCache: Map<string, CacheEntry<any>> = new Map();

    /**
     * Récupère depuis le cache mémoire d'abord, puis localStorage
     */
    get<T>(key: string): T | null {
        // 1. Mémoire (ultra-rapide, volatile)
        const mem = this.memoryCache.get(key);
        if (mem && mem.version === CACHE_VERSION) {
            return mem.data as T;
        }

        // 2. localStorage (persiste entre les visites)
        if (typeof window === 'undefined') return null;
        try {
            const raw = localStorage.getItem(`cineo_cache_${key}`);
            if (!raw) return null;
            const entry = JSON.parse(raw) as CacheEntry<T>;
            if (entry.version !== CACHE_VERSION) {
                localStorage.removeItem(`cineo_cache_${key}`);
                return null;
            }
            // Stocker en mémoire pour les prochains accès
            this.memoryCache.set(key, entry);
            return entry.data;
        } catch {
            return null;
        }
    }

    /**
     * Vérifie si le cache est encore "frais" (dans le TTL)
     */
    isFresh(key: string, ttl = DEFAULT_TTL): boolean {
        const entry = this.memoryCache.get(key);
        if (entry) return Date.now() - entry.timestamp < ttl;

        if (typeof window === 'undefined') return false;
        try {
            const raw = localStorage.getItem(`cineo_cache_${key}`);
            if (!raw) return false;
            const parsed = JSON.parse(raw) as CacheEntry<any>;
            return Date.now() - parsed.timestamp < ttl;
        } catch {
            return false;
        }
    }

    /**
     * Sauvegarde dans mémoire ET localStorage
     */
    set<T>(key: string, data: T): void {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            version: CACHE_VERSION,
        };
        this.memoryCache.set(key, entry);

        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(`cineo_cache_${key}`, JSON.stringify(entry));
        } catch (e) {
            // localStorage plein — vider les anciennes entrées
            this.evictOldEntries();
        }
    }

    /**
     * Met à jour un seul item dans un tableau en cache (pour WebSocket)
     */
    updateItem<T extends { id: string | number }>(key: string, updatedItem: T): void {
        const cached = this.get<T[]>(key);
        if (!cached) return;
        const updated = cached.map(item => item.id === updatedItem.id ? updatedItem : item);
        this.set(key, updated);
    }

    /**
     * Ajoute un item dans un tableau en cache (pour WebSocket)
     */
    addItem<T extends { id: string | number }>(key: string, newItem: T): void {
        const cached = this.get<T[]>(key);
        if (!cached) return;
        const exists = cached.find(item => item.id === newItem.id);
        if (!exists) {
            this.set(key, [newItem, ...cached]);
        }
    }

    /**
     * Supprime un item d'un tableau en cache (pour WebSocket)
     */
    removeItem<T extends { id: string | number }>(key: string, id: string | number): void {
        const cached = this.get<T[]>(key);
        if (!cached) return;
        this.set(key, cached.filter(item => item.id !== id));
    }

    /**
     * Invalide une clé de cache
     */
    invalidate(key: string): void {
        this.memoryCache.delete(key);
        if (typeof window !== 'undefined') {
            localStorage.removeItem(`cineo_cache_${key}`);
        }
    }

    /**
     * Vide les entrées les plus anciennes en cas de localStorage plein
     */
    private evictOldEntries(): void {
        if (typeof window === 'undefined') return;
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k?.startsWith('cineo_cache_')) keys.push(k);
        }
        // Supprimer la moitié des entrées les plus anciennes
        keys.slice(0, Math.ceil(keys.length / 2)).forEach(k => localStorage.removeItem(k));
    }
}

export const cacheService = new CacheService();
export const CACHE_KEYS = {
    MOVIES: 'movies_all',
    USER_COUNTRY: 'user_country',
} as const;
