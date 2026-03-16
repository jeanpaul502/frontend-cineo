/**
 * Configuration des services
 * Centralise les URLs et clés d'API
 */

export const ServiceConfig = {
    // Nom de l'application
    APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Cineo',

    // URL de l'API Backend
    // Utiliser 127.0.0.1 pour le développement local sur la même machine (plus fiable que localhost)
    API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001',
    
    // Timeout par défaut pour les requêtes (en ms)
    DEFAULT_TIMEOUT: 10000,

    // Version de l'application
    VERSION: '1.0.0',
    DESCRIPTION: 'Plateforme de streaming premium',
};

// Exports pour compatibilité avec l'ancien config.ts
export const APP_NAME = ServiceConfig.APP_NAME;
export const API_BASE_URL = ServiceConfig.API_URL;

