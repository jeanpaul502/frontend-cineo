'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { showErrorToast, showSuccessToast } from '../lib/toast';
import { authService } from '../services/auth.service';

const VerifyPinForm = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email');
    const token = searchParams.get('token');

    const [pin, setPin] = useState(['', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [showHelp, setShowHelp] = useState(false);
    const [maxAttemptsReached, setMaxAttemptsReached] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [isTokenChecked, setIsTokenChecked] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        // Auto-focus sur le premier champ au chargement
        if (!maxAttemptsReached && !isSuccess) {
            inputRefs.current[0]?.focus();
        }

        if (!email || !token) {
            showErrorToast('Accès refusé', 'Token invalide ou manquant. Veuillez recommencer la procédure.');
            router.replace('/login');
        } else {
            setIsTokenChecked(true);
        }
    }, [email, token, maxAttemptsReached, isSuccess, router]);

    // Gestion du compte à rebours
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleChange = (index: number, value: string) => {
        // N'accepter que les chiffres
        if (value && !/^\d$/.test(value)) return;

        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);
        setError(null);

        // Auto-focus sur le champ suivant
        if (value && index < 4) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        // Retour arrière : revenir au champ précédent
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);

        if (/^\d+$/.test(pastedData)) {
            const newPin = pastedData.split('').concat(Array(5).fill('')).slice(0, 5);
            setPin(newPin);

            // Focus sur le dernier champ rempli ou le premier vide
            const nextIndex = Math.min(pastedData.length, 4);
            inputRefs.current[nextIndex]?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const enteredPin = pin.join('');

        if (enteredPin.length !== 5) {
            setError('Veuillez entrer les 5 chiffres du code');
            return;
        }

        if (!email) {
            setError('Adresse email manquante');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const data = await authService.verifyPin(email, enteredPin);

            setIsSuccess(true);
            setIsLoading(false);

            // Redirection après succès
            setTimeout(() => {
                if (data.resetToken) {
                    router.push(`/reset-password?token=${encodeURIComponent(data.resetToken)}`);
                } else {
                     // Fallback
                     showErrorToast('Erreur', 'Token de réinitialisation manquant');
                }
            }, 1500);

        } catch (error: any) {
            setIsLoading(false);
            if (error.message === 'Max attempts reached') {
                setMaxAttemptsReached(true);
                setError('Nombre maximum d\'essais atteint. Veuillez recommencer la procédure.');
            } else {
                setError(error.message || 'Code incorrect');
            }
            // Vider les champs en cas d'erreur
            setPin(['', '', '', '', '']);
            inputRefs.current[0]?.focus();
        }
    };

    const handleResendPin = async () => {
        if (countdown > 0 || isResending || !email) return;

        setIsResending(true);
        try {
            await authService.resendPin(email);
            
            setCountdown(60);
            showSuccessToast('Code renvoyé', 'Un nouveau code a été envoyé à votre adresse email');
        } catch (error: any) {
            showErrorToast('Erreur', error.message || 'Impossible de renvoyer le code');
        } finally {
            setIsResending(false);
        }
    };

    const handleResendCode = async () => {
        if (!email) return;

        setIsResending(true);
        setError(null);
        setPin(['', '', '', '', '']);
        inputRefs.current[0]?.focus();

        try {
            await authService.forgotPassword(email);

            // Démarrer le compte à rebours
            setCountdown(60);
            showSuccessToast('Code envoyé', 'Un nouveau code a été envoyé à votre adresse email');
        } catch (error) {
            console.error('Erreur resend:', error);
            setError('Impossible de renvoyer le code. Veuillez réessayer.');
        } finally {
            setIsResending(false);
        }
    };

    if (!isTokenChecked) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (maxAttemptsReached) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center px-4 sm:px-6 lg:px-8">
                <div className="max-w-lg w-full">
                    <div className="relative rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-xl p-8 text-center space-y-6">
                        {/* Icône Avertissement Jaune */}
                        <div className="flex justify-center mb-6">
                            <div className="h-16 w-16 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" className="text-yellow-500"><path fill="currentColor" fillRule="evenodd" d="M9.401 3.003c1.155-2 3.999-2 5.154 0l9.405 16.29c1.155 2-.292 4.508-2.6 4.508H2.597c-2.308 0-3.755-2.508-2.6-4.508zM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75m0 8.25a.75.75 0 1 0 0-1.5a.75.75 0 0 0 0 1.5" clipRule="evenodd" /></svg>
                            </div>
                        </div>

                        {/* Message d'avertissement */}
                        <div className="space-y-3">
                            <h2 className="text-2xl font-bold text-white">
                                Nombre de tentatives atteint
                            </h2>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                Vous avez dépassé le nombre maximum de tentatives autorisées. Par mesure de sécurité, le code a été invalidé.
                            </p>
                            <p className="text-sm text-gray-400">
                                Veuillez recommencer la procédure pour obtenir un nouveau code.
                            </p>
                        </div>

                        {/* Bouton Retour */}
                        <div className="pt-4">
                            <button
                                onClick={() => router.push('/forgot-password')}
                                className="w-full py-3.5 px-4 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white text-sm font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-yellow-500/20 cursor-pointer flex items-center justify-center"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="mr-2"><path fill="currentColor" d="M9.57 5.93L3.5 12l6.07 6.07l1.41-1.41L7.33 13H21v-2H7.33l3.66-3.66z" /></svg>
                                Retour
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isSuccess) {
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

                        {/* Message de succès */}
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold text-white">
                                Code vérifié !
                            </h2>
                            <p className="text-sm text-gray-400">
                                Vous allez être redirigé vers la page de réinitialisation
                            </p>
                        </div>

                        {/* Confirmation */}
                        <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-6 text-left">
                            <div className="flex items-start">
                                <div className="flex-shrink-0 mt-0.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="text-green-400"><path fill="currentColor" fillRule="evenodd" d="M3.378 5.082C3 5.62 3 7.22 3 10.417v1.574c0 5.638 4.239 8.375 6.899 9.536c.721.315 1.082.473 2.101.473c1.02 0 1.38-.158 2.101-.473C16.761 20.365 21 17.63 21 11.991v-1.574c0-3.198 0-4.797-.378-5.335c-.377-.537-1.88-1.052-4.887-2.081l-.573-.196C13.595 2.268 12.812 2 12 2s-1.595.268-3.162.805L8.265 3c-3.007 1.03-4.51 1.545-4.887 2.082M15.06 10.5a.75.75 0 0 0-1.12-.999l-3.011 3.374l-.87-.974a.75.75 0 0 0-1.118 1l1.428 1.6a.75.75 0 0 0 1.119 0z" clipRule="evenodd" /></svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-green-300">
                                        Vérification réussie
                                    </h3>
                                    <div className="mt-2 text-sm text-green-200">
                                        <p>
                                            Votre identité a été confirmée. Vous pouvez maintenant créer un nouveau mot de passe sécurisé.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Spinner de redirection */}
                        {/* Spinner de redirection */}
                        <div className="flex justify-center items-center gap-3">
                            <span className="text-sm text-gray-400">Veuillez patienter...</span>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center px-4 sm:px-6 lg:px-8">
                <div className="max-w-lg w-full">
                    <div className="relative rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-xl">
                        <div className="p-6 sm:p-8">
                            {/* Logo */}
                            <div className="text-center">
                                <div className="flex justify-center mb-6">
                                    <div
                                        className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300"
                                        onClick={() => router.push('/')}
                                    >
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 2L20.5 6.5V17.5L12 22L3.5 17.5V6.5L12 2Z" fill="white" fillOpacity="0.9" />
                                            <path d="M12 7L16.5 9.5V14.5L12 17L7.5 14.5V9.5L12 7Z" fill="#2563EB" />
                                        </svg>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-400 leading-relaxed">
                                    Entrez le code PIN à 5 chiffres envoyé à votre adresse email
                                </p>
                            </div>

                            {/* Formulaire */}
                            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                                {/* Champs PIN */}
                                <div>
                                    <div className="flex justify-center gap-3">
                                        {pin.map((digit, index) => (
                                            <div key={index} className="relative">
                                                <input
                                                    ref={(el) => {
                                                        inputRefs.current[index] = el;
                                                    }}
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={1}
                                                    value={digit}
                                                    onChange={(e) => handleChange(index, e.target.value)}
                                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                                    onPaste={index === 0 ? handlePaste : undefined}
                                                    className="w-14 h-14 text-center text-2xl font-bold bg-gray-800/80 text-gray-200 rounded-lg border-2 border-gray-700/50 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                                                />
                                                {/* Point indicateur quand le champ est vide */}
                                                {!digit && (
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                        <div className="w-2 h-2 rounded-full bg-gray-600 transition-opacity duration-200"></div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Texte et bouton renvoyer le code côte à côte */}
                                    <div className="flex items-center justify-center gap-2 mt-4">
                                        <p className="text-xs text-gray-400">
                                            Vous n'avez pas reçu de code ?
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleResendCode}
                                            disabled={countdown > 0 || isResending}
                                            className={`text-xs font-medium transition-colors cursor-pointer flex items-center ${countdown > 0 || isResending
                                                ? 'text-gray-500 cursor-not-allowed'
                                                : 'text-blue-400 hover:text-blue-300'
                                                }`}
                                        >
                                            {isResending ? (
                                                <>
                                                    Envoi en cours...
                                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500 ml-2"></div>
                                                </>
                                            ) : (
                                                countdown > 0 ? `Renvoyer le code (${countdown}s)` : 'Renvoyer le code'
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Message d'erreur */}
                                {error && (
                                    <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4">
                                        <div className="flex items-start">
                                            <div className="flex-shrink-0">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="text-red-400"><path fill="currentColor" fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12s4.477 10 10 10s10-4.477 10-10M12 6.25a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0V7a.75.75 0 0 1 .75-.75M12 17a1 1 0 1 0 0-2a1 1 0 0 0 0 2" clipRule="evenodd" /></svg>
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm text-red-300">
                                                    {error}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Bouton d'aide */}
                                <div className="text-center">
                                    <button
                                        type="button"
                                        onClick={() => setShowHelp(true)}
                                        className="text-xs text-gray-400 hover:text-gray-300 transition-colors cursor-pointer inline-flex items-center"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" className="mr-1"><path fill="currentColor" fillRule="evenodd" d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2s10 4.477 10 10M12 7.75c-.621 0-1.125.504-1.125 1.125a.75.75 0 0 1-1.5 0a2.625 2.625 0 1 1 4.508 1.829q-.138.142-.264.267a7 7 0 0 0-.571.617c-.22.282-.298.489-.298.662V13a.75.75 0 0 1-1.5 0v-.75c0-.655.305-1.186.614-1.583c.229-.294.516-.58.75-.814q.106-.105.193-.194A1.125 1.125 0 0 0 12 7.75M12 17a1 1 0 1 0 0-2a1 1 0 0 0 0 2" clipRule="evenodd" /></svg>
                                        Vous ne recevez pas le code ?
                                    </button>
                                </div>

                                {/* Bouton de vérification */}
                                <div>
                                    <button
                                        type="submit"
                                        disabled={isLoading || pin.join('').length !== 5}
                                        className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30 cursor-pointer"
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center">
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                                Vérification...
                                            </div>
                                        ) : (
                                            'Vérifier le code'
                                        )}
                                    </button>
                                </div>

                                {/* Lien de retour */}
                                <div className="text-center mt-8 pt-2">
                                    <a href="/login" className="text-sm text-gray-400 hover:text-blue-400 transition-colors inline-flex items-center cursor-pointer">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" className="mr-2"><path fill="currentColor" d="M20 11.25a.75.75 0 0 1 0 1.5h-9.25V18a.75.75 0 0 1-1.28.53l-6-6a.75.75 0 0 1 0-1.06l6-6a.75.75 0 0 1 1.28.53v5.25z" /></svg>
                                        Retour à la connexion
                                    </a>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modale d'aide avec ampoule, message et boutons */}
            {showHelp && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4 z-50"
                    onClick={() => setShowHelp(false)}
                >
                    <div
                        className="bg-black/60 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl p-6 max-w-sm w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* En-tête avec icône ampoule jaune */}
                        <div className="flex items-center mb-4">
                            <div className="h-8 w-8 rounded-lg bg-yellow-500/20 flex items-center justify-center mr-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" className="text-yellow-400"><path fill="currentColor" fillRule="evenodd" d="M11.5 2C7.358 2 4 5.436 4 9.674c0 2.273.966 4.315 2.499 5.72c.51.467.889.814 1.157 1.066a15 15 0 0 1 .4.39l.033.036c.237.3.288.376.318.446s.053.16.112.54c.024.15.026.406.026 1.105v.03c0 .409 0 .762.026 1.051c.027.306.087.61.248.895c.18.319.438.583.75.767c.278.165.575.226.874.254c.283.026.628.026 1.028.026h.058c.4 0 .745 0 1.028-.026c.3-.028.595-.09.875-.254a2.07 2.07 0 0 0 .749-.767c.16-.285.22-.588.248-.895c.026-.29.026-.642.025-1.051v-.03c0-.699.003-.955.026-1.105c.06-.38.082-.47.113-.54c.03-.07.081-.147.318-.446l.008-.01l.025-.026l.088-.09q.112-.113.312-.3c.268-.252.647-.599 1.157-1.067A7.74 7.74 0 0 0 19 9.674C19 5.436 15.642 2 11.5 2m1.585 17.674h-3.17q.004.145.014.258c.019.21.05.286.071.324a.7.7 0 0 0 .25.255c.037.022.111.054.316.073c.214.02.497.02.934.02s.72 0 .934-.02c.205-.019.279-.05.316-.073a.7.7 0 0 0 .25-.255c.021-.038.052-.114.07-.324q.011-.113.015-.258M12.61 8.176c.307.224.378.66.159.974l-1.178 1.687h1.402a.68.68 0 0 1 .607.379a.71.71 0 0 1-.052.724L11.6 14.731a.67.67 0 0 1-.951.162a.71.71 0 0 1-.158-.973l1.178-1.687h-1.403a.68.68 0 0 1-.606-.379a.71.71 0 0 1 .051-.725l1.948-2.79a.67.67 0 0 1 .951-.163" clipRule="evenodd" /></svg>
                            </div>
                            <h4 className="text-sm font-medium text-gray-200">Conseils</h4>
                        </div>

                        {/* Liste simple avec icônes */}
                        <ul className="text-xs text-gray-300 space-y-2.5 mb-5">
                            <li className="flex items-start">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" className="mr-2 mt-0.5 text-blue-400 flex-shrink-0"><path fill="currentColor" fillRule="evenodd" d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2s10 4.477 10 10m-5.97-3.03a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 1 1 1.06-1.06l1.47 1.47l2.235-2.235L14.97 8.97a.75.75 0 0 1 1.06 0" clipRule="evenodd" /></svg>
                                Vérifiez votre dossier spam ou courrier indésirable
                            </li>
                            <li className="flex items-start">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" className="mr-2 mt-0.5 text-blue-400 flex-shrink-0"><path fill="currentColor" fillRule="evenodd" d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2s10 4.477 10 10m-5.97-3.03a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 1 1 1.06-1.06l1.47 1.47l2.235-2.235L14.97 8.97a.75.75 0 0 1 1.06 0" clipRule="evenodd" /></svg>
                                L'email peut prendre quelques minutes à arriver
                            </li>
                            <li className="flex items-start">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" className="mr-2 mt-0.5 text-blue-400 flex-shrink-0"><path fill="currentColor" fillRule="evenodd" d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2s10 4.477 10 10m-5.97-3.03a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 1 1 1.06-1.06l1.47 1.47l2.235-2.235L14.97 8.97a.75.75 0 0 1 1.06 0" clipRule="evenodd" /></svg>
                                Assurez-vous que votre adresse email est correcte
                            </li>
                        </ul>

                        {/* Message de fin */}
                        <p className="text-xs text-gray-400 text-center mb-4">
                            J'espère que ces conseils vous ont été très utiles
                        </p>

                        {/* Boutons côte à côte - Annuler (gris) et Compris (bleu) */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowHelp(false)}
                                className="flex-1 py-2.5 px-4 bg-gray-700/50 hover:bg-gray-700/70 text-white text-sm font-medium rounded-lg transition-all duration-300 cursor-pointer"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => setShowHelp(false)}
                                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-medium rounded-lg transition-all duration-300 cursor-pointer"
                            >
                                Compris
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default VerifyPinForm;
