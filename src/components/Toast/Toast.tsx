'use client';

import React, { useEffect, useState } from 'react';
import { Toast as ToastType } from './ToastContext';

interface ToastProps {
    toast: ToastType;
    onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, 4500);

        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            onRemove(toast.id);
        }, 300);
    };

    const getIcon = () => {
        switch (toast.type) {
            case 'success':
                return (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                );
            case 'error':
                return (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
                    </svg>
                );
            case 'warning':
                return (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                    </svg>
                );
            case 'info':
                return (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                    </svg>
                );
        }
    };

    const getColors = () => {
        switch (toast.type) {
            case 'success':
                return 'bg-green-500 text-white';
            case 'error':
                return 'bg-red-500 text-white';
            case 'warning':
                return 'bg-yellow-500 text-white';
            case 'info':
                return 'bg-blue-500 text-white';
        }
    };

    const getIconBg = () => {
        switch (toast.type) {
            case 'success':
                return 'bg-white/30';
            case 'error':
                return 'bg-white/30';
            case 'warning':
                return 'bg-white/30';
            case 'info':
                return 'bg-white/30';
        }
    };

    return (
        <div
            className={`
        relative flex items-start gap-3 p-4 rounded-xl
        shadow-2xl min-w-[320px] max-w-md
        ${getColors()}
        ${isExiting ? 'toast-exit' : 'toast-enter'}
      `}
            style={{
                animation: isExiting ? 'slideOutRight 0.3s ease-in forwards' : 'slideInTop 0.3s ease-out forwards'
            }}
        >
            {/* Icon */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${getIconBg()} flex items-center justify-center`}>
                {getIcon()}
            </div>

            {/* Content */}
            <div className="flex-1 pt-0.5">
                <h4 className="font-semibold text-white text-sm mb-0.5">
                    {toast.title}
                </h4>
                {toast.description && (
                    <p className="text-xs text-white/90">
                        {toast.description}
                    </p>
                )}
            </div>

            {/* Close button */}
            <button
                onClick={handleClose}
                className="flex-shrink-0 text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <style jsx>{`
        @keyframes slideInTop {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(120%);
            opacity: 0;
          }
        }
      `}</style>
        </div>
    );
};

export default Toast;
