'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface LoadingScreenProps {
    message?: string;
    showLogo?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
    message = "Chargement...", 
    showLogo = false 
}) => {
    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="text-gray-400 text-sm font-medium animate-pulse">{message}</p>
        </div>
    );
};
