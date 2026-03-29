import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmer',
    cancelText = 'Annuler',
    isDestructive = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700/50 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center space-y-4">
                    <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
                        isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                    }`}>
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white">{title}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            {message}
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-slate-300 bg-slate-800/50 hover:bg-slate-700/50 hover:text-white backdrop-blur-sm transition-colors border border-slate-700/30"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all shadow-lg ${
                                isDestructive 
                                    ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' 
                                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-blue-500/20 transform hover:scale-105'
                            }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
