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

const MY_LIST_KEY = 'netfix_my_list';

export const getMyList = (): MovieItem[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(MY_LIST_KEY);
    return stored ? JSON.parse(stored) : [];
};

export const addToMyList = async (movie: MovieItem): Promise<boolean> => {
    const list = getMyList();
    if (list.some(item => item.id === movie.id)) return false;

    const newList = [...list, movie];
    localStorage.setItem(MY_LIST_KEY, JSON.stringify(newList));
    window.dispatchEvent(new Event('my-list-updated'));
    return true;
};

export const removeFromMyList = async (id: string | number): Promise<boolean> => {
    const list = getMyList();
    const newList = list.filter(item => item.id !== id);

    if (list.length === newList.length) return false;

    localStorage.setItem(MY_LIST_KEY, JSON.stringify(newList));
    window.dispatchEvent(new Event('my-list-updated'));
    return true;
};

export const isInMyList = async (id: string | number): Promise<boolean> => {
    const list = getMyList();
    return list.some(item => item.id === id);
};
