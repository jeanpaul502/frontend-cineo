import { Toast } from '../components/Toast/ToastContext';

// Variable globale pour stocker la fonction addToast
let globalAddToast: ((toast: Omit<Toast, 'id'>) => void) | null = null;

/**
 * Initialise la fonction addToast globale
 * Cette fonction est appelée par le ToastProvider
 */
export function initToast(addToast: (toast: Omit<Toast, 'id'>) => void) {
    globalAddToast = addToast;
}

/**
 * Show success toast (green with check icon)
 */
export function showSuccessToast(title: string, description?: string) {
    if (globalAddToast) {
        globalAddToast({
            type: 'success',
            title,
            description: description || '',
        });
    }
}

/**
 * Show error toast (red with error icon)
 */
export function showErrorToast(title: string, description?: string) {
    if (globalAddToast) {
        globalAddToast({
            type: 'error',
            title,
            description: description || '',
        });
    }
}

/**
 * Show warning toast (yellow with warning icon)
 */
export function showWarningToast(title: string, description?: string) {
    if (globalAddToast) {
        globalAddToast({
            type: 'warning',
            title,
            description: description || '',
        });
    }
}

/**
 * Show info toast (blue with info icon)
 */
export function showInfoToast(title: string, description?: string) {
    if (globalAddToast) {
        globalAddToast({
            type: 'info',
            title,
            description: description || '',
        });
    }
}
