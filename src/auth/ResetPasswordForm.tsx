'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@iconify/react';
import { showErrorToast } from '../lib/toast';
import { authService } from '../services/auth.service';

const ResetPasswordForm = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordReset, setIsPasswordReset] = useState(false);
    const [isTokenChecked, setIsTokenChecked] = useState(false);

    useEffect(() => {
        if (!token) {
            showErrorToast('Accès refusé', 'Token invalide ou manquant. Veuillez recommencer la procédure.');
            router.replace('/login');
        } else {
            setIsTokenChecked(true);
        }
    }, [token, router]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            showErrorToast('Mots de passe différents', 'Les mots de passe ne correspondent pas');
            return;
        }

        if (formData.password.length < 8) {
            showErrorToast('Mot de passe faible', 'Le mot de passe doit contenir au moins 8 caractères');
            return;
        }

        if (!token) {
            showErrorToast('Token invalide', 'Token invalide');
            return;
        }

        setIsLoading(true);

        try {
            await authService.resetPassword(token, formData.password);

            setIsPasswordReset(true);
        } catch (error: any) {
            setIsLoading(false);
            showErrorToast('Erreur', error.message || 'Une erreur est survenue');
        }
    };

    const handleLogoClick = () => {
        const isLoggedIn =
            typeof document !== 'undefined' &&
            document.cookie.includes('cineo_session_token=');
        router.push(isLoggedIn ? '/dashboard' : '/');
    };

    const getPasswordStrength = (password: string) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        return strength;
    };

    const passwordStrength = getPasswordStrength(formData.password);
    const strengthLabels = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];
    const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

    if (!isTokenChecked) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="text-gray-400 text-sm font-medium animate-pulse">Vérification du token...</p>
            </div>
        );
    }

    if (isPasswordReset) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center px-4 sm:px-6 lg:px-8">
                <div className="max-w-lg w-full">
                    <div className="relative rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-xl p-8 text-center space-y-6">
                        {/* Logo succès */}
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                {/* Fond blanc pour la coche transparente */}
                                <div className="absolute inset-0 m-auto w-10 h-10 bg-white rounded-full"></div>
                                <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" className="text-green-500 relative z-10"><path fill="currentColor" fillRule="evenodd" d="M9.592 3.2a6 6 0 0 1-.495.399c-.298.2-.633.338-.985.408c-.153.03-.313.043-.632.068c-.801.064-1.202.096-1.536.214a2.71 2.71 0 0 0-1.655 1.655c-.118.334-.15.735-.214 1.536a6 6 0 0 1-.068.632c-.07.352-.208.687-.408.985c-.087.13-.191.252-.399.495c-.521.612-.782.918-.935 1.238c-.353.74-.353 1.6 0 2.34c.153.32.414.626.935 1.238c.208.243.312.365.399.495c.2.298.338.633.408.985c.03.153.043.313.068.632c.064.801.096 1.202.214 1.536a2.71 2.71 0 0 0 1.655 1.655c.334.118.735.15 1.536.214c.319.025.479.038.632.068c.352.07.687.209.985.408c.13.087.252.191.495.399c.612.521.918.782 1.238.935c.74.353 1.6.353 2.34 0c.32-.153.626-.414 1.238-.935c.243-.208.365-.312.495-.399c.298-.2.633-.338.985-.408c.153-.03.313-.043.632-.068c.801-.064 1.202-.096 1.536-.214a2.71 2.71 0 0 0 1.655-1.655c.118-.334.15-.735.214-1.536c.025-.319.038-.479.068-.632c.07-.352.209-.687.408-.985c.087-.13.191-.252.399-.495c.521-.612.782-.918.935-1.238c.353-.74.353-1.6 0-2.34c-.153-.32-.414-.626-.935-1.238a6 6 0 0 1-.399-.495a2.7 2.7 0 0 1-.408-.985a6 6 0 0 1-.068-.632c-.064-.801-.096-1.202-.214-1.536a2.71 2.71 0 0 0-1.655-1.655c-.334-.118-.735-.15-1.536-.214a6 6 0 0 1-.632-.068a2.7 2.7 0 0 1-.985-.408a6 6 0 0 1-.495-.399c-.612-.521-.918-.782-1.238-.935a2.71 2.71 0 0 0-2.34 0c-.32.153-.626.414-1.238.935m6.781 6.663a.814.814 0 0 0-1.15-1.15l-4.85 4.85l-1.596-1.595a.814.814 0 0 0-1.15 1.15l2.17 2.17a.814.814 0 0 0 1.15 0z" clipRule="evenodd" /></svg>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold text-white">
                                Mot de passe réinitialisé !
                            </h2>
                            <p className="text-sm text-gray-400">
                                Votre mot de passe a été mis à jour avec succès
                            </p>
                        </div>

                        <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-6 text-left">
                            <div className="flex items-start">
                                <div className="flex-shrink-0 mt-0.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="text-green-400"><path fill="currentColor" fillRule="evenodd" d="M3.378 5.082C3 5.62 3 7.22 3 10.417v1.574c0 5.638 4.239 8.375 6.899 9.536c.721.315 1.082.473 2.101.473c1.02 0 1.38-.158 2.101-.473C16.761 20.365 21 17.63 21 11.991v-1.574c0-3.198 0-4.797-.378-5.335c-.377-.537-1.88-1.052-4.887-2.081l-.573-.196C13.595 2.268 12.812 2 12 2s-1.595.268-3.162.805L8.265 3c-3.007 1.03-4.51 1.545-4.887 2.082M15.06 10.5a.75.75 0 0 0-1.12-.999l-3.011 3.374l-.87-.974a.75.75 0 0 0-1.118 1l1.428 1.6a.75.75 0 0 0 1.119 0z" clipRule="evenodd" /></svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-green-300">
                                        Réinitialisation réussie
                                    </h3>
                                    <div className="mt-2 text-sm text-green-200">
                                        <p>
                                            Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <a
                                href="/login"
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30 flex items-center justify-center cursor-pointer"
                            >
                                Se connecter maintenant
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center px-4 sm:px-6 lg:px-8">
            <div className="max-w-lg w-full">
                <div className="relative rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-xl">
                    <div className="p-6 sm:p-8">
                        <div className="text-center">
                            <div className="flex justify-center mb-6">
                                <div
                                    className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300"
                                    onClick={handleLogoClick}
                                >
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2L20.5 6.5V17.5L12 22L3.5 17.5V6.5L12 2Z" fill="white" fillOpacity="0.9" />
                                        <path d="M12 7L16.5 9.5V14.5L12 17L7.5 14.5V9.5L12 7Z" fill="#2563EB" />
                                    </svg>
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-2">
                                Réinitialiser le mot de passe
                            </h2>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                Choisissez un mot de passe sécurisé pour protéger l'accès à votre compte
                            </p>
                        </div>

                        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                                        Nouveau mot de passe
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                            <Icon icon="solar:lock-password-bold" width="20" height="20" />
                                        </div>
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                            required
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className="w-full bg-gray-800/80 text-gray-200 placeholder-gray-400 pl-12 pr-12 py-3.5 rounded-lg border-2 border-gray-700/50 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors cursor-pointer"
                                        >
                                            {showPassword ? (
                                                <Icon icon="solar:eye-closed-bold" width="20" height="20" />
                                            ) : (
                                                <Icon icon="solar:eye-bold" width="20" height="20" />
                                            )}
                                        </button>
                                    </div>

                                    {formData.password && (
                                        <div className="mt-2 space-y-2">
                                            <div className="flex items-center space-x-2">
                                                <div className="flex-1 flex gap-1">
                                                    {[1, 2, 3, 4, 5].map((segment) => (
                                                        <div
                                                            key={segment}
                                                            className={`h-2 flex-1 rounded-full transition-all duration-300 ${segment <= passwordStrength
                                                                ? strengthColors[passwordStrength - 1] || 'bg-gray-700'
                                                                : 'bg-gray-700'
                                                                }`}
                                                        ></div>
                                                    ))}
                                                </div>
                                                <span className="text-xs text-gray-400 min-w-[70px] text-right">
                                                    {strengthLabels[passwordStrength - 1] || 'Très faible'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                Minimum 8 caractères avec majuscules, minuscules, chiffres et symboles
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                                        Confirmer le mot de passe
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                            <Icon icon="solar:lock-password-bold" width="20" height="20" />
                                        </div>
                                        <input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                            required
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            className="w-full bg-gray-800/80 text-gray-200 placeholder-gray-400 pl-12 pr-12 py-3.5 rounded-lg border-2 border-gray-700/50 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors cursor-pointer"
                                        >
                                            {showConfirmPassword ? (
                                                <Icon icon="solar:eye-closed-bold" width="20" height="20" />
                                            ) : (
                                                <Icon icon="solar:eye-bold" width="20" height="20" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30 cursor-pointer"
                                >
                                    {isLoading ? (
                                        <div className="flex items-center">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                            Réinitialisation en cours...
                                        </div>
                                    ) : (
                                        'Réinitialiser le mot de passe'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordForm;
