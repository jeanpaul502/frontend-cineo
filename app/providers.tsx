'use client';

import { HeroUIProvider } from '@heroui/react';
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from '../src/components/Toast/ToastContext';
import ToastContainer from '../src/components/Toast/ToastContainer';
import { useEffect } from 'react';
import { initToast } from '../src/lib/toast';
import { useToast } from '../src/components/Toast/ToastContext';

import { ActivityMonitor } from '../src/components/ActivityMonitor';

function ToastInitializer() {
    const { addToast } = useToast();

    useEffect(() => {
        initToast(addToast);
    }, [addToast]);

    return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <HeroUIProvider>
            <TooltipProvider>
                <ToastProvider>
                    <ToastInitializer />
                    <ActivityMonitor />
                    <ToastContainer />
                    {children}
                </ToastProvider>
            </TooltipProvider>
        </HeroUIProvider>
    );
}
