'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { APP_NAME } from '../services/config';
import { authService } from '../services/auth.service';
import { showErrorToast } from '../lib/toast';

const ForgotPasswordForm = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const handleLogoClick = () => {
    const isLoggedIn =
      typeof document !== 'undefined' &&
      document.cookie.includes('cineo_session_token=');
    router.push(isLoggedIn ? '/dashboard' : '/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authService.forgotPassword(email);

      setIsEmailSent(true);
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      showErrorToast('Erreur', error.message || 'Une erreur est survenue');
    }
  };

  // Redirection automatique après 5 secondes
  useEffect(() => {
    if (isEmailSent && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (isEmailSent && countdown === 0) {
      const token = btoa(`${email}:${Date.now()}`);
      router.push(`/verify-pin?email=${encodeURIComponent(email)}&token=${token}`);
    }
  }, [isEmailSent, countdown, email, router]);

  if (isEmailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full">
          <div className="relative rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-xl p-8 text-center space-y-6">
            {/* Logo succès */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 m-auto w-10 h-10 bg-white rounded-full"></div>
                <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" className="text-green-500 relative z-10"><path fill="currentColor" fillRule="evenodd" d="M9.592 3.2a6 6 0 0 1-.495.399c-.298.2-.633.338-.985.408c-.153.03-.313.043-.632.068c-.801.064-1.202.096-1.536.214a2.71 2.71 0 0 0-1.655 1.655c-.118.334-.15.735-.214 1.536a6 6 0 0 1-.068.632c-.07.352-.208.687-.408.985c-.087.13-.191.252-.399.495c-.521.612-.782.918-.935 1.238c-.353.74-.353 1.6 0 2.34c.153.32.414.626.935 1.238c.208.243.312.365.399.495c.2.298.338.633.408.985c.03.153.043.313.068.632c.064.801.096 1.202.214 1.536a2.71 2.71 0 0 0 1.655 1.655c.334.118.735.15 1.536.214c.319.025.479.038.632.068c.352.07.687.209.985.408c.13.087.252.191.495.399c.612.521.918.782 1.238.935c.74.353 1.6.353 2.34 0c.32-.153.626-.414 1.238-.935c.243-.208.365-.312.495-.399c.298-.2.633-.338.985-.408c.153-.03.313-.043.632-.068c.801-.064 1.202-.096 1.536-.214a2.71 2.71 0 0 0 1.655-1.655c.118-.334.15-.735.214-1.536c.025-.319.038-.479.068-.632c.07-.352.209-.687.408-.985c.087-.13.191-.252.399-.495c.521-.612.782-.918.935-1.238c.353-.74.353-1.6 0-2.34c-.153-.32-.414-.626-.935-1.238a6 6 0 0 1-.399-.495a2.7 2.7 0 0 1-.408-.985a6 6 0 0 1-.068-.632c-.064-.801-.096-1.202-.214-1.536a2.71 2.71 0 0 0-1.655-1.655c-.334-.118-.735-.15-1.536-.214a6 6 0 0 1-.632-.068a2.7 2.7 0 0 1-.985-.408a6 6 0 0 1-.495-.399c-.612-.521-.918-.782-1.238-.935a2.71 2.71 0 0 0-2.34 0c-.32.153-.626.414-1.238.935m6.781 6.663a.814.814 0 0 0-1.15-1.15l-4.85 4.85l-1.596-1.595a.814.814 0 0 0-1.15 1.15l2.17 2.17a.814.814 0 0 0 1.15 0z" clipRule="evenodd" /></svg>
              </div>
            </div>

            {/* Message de confirmation */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-white">
                Email envoyé !
              </h2>
              <p className="text-sm text-gray-400">
                Vérifiez votre boîte de réception
              </p>
            </div>

            {/* Instructions principales */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6 text-left">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="text-green-400"><path fill="currentColor" fillRule="evenodd" d="M3.172 5.172C2 6.343 2 8.229 2 12s0 5.657 1.172 6.828S6.229 20 10 20h4c3.771 0 5.657 0 6.828-1.172S22 15.771 22 12s0-5.657-1.172-6.828S17.771 4 14 4h-4C6.229 4 4.343 4 3.172 5.172M18.576 7.52a.75.75 0 0 1-.096 1.056l-2.196 1.83c-.887.74-1.605 1.338-2.24 1.746c-.66.425-1.303.693-2.044.693s-1.384-.269-2.045-.693c-.634-.408-1.352-1.007-2.239-1.745L5.52 8.577a.75.75 0 0 1 .96-1.153l2.16 1.799c.933.777 1.58 1.315 2.128 1.667c.529.34.888.455 1.233.455s.704-.114 1.233-.455c.547-.352 1.195-.89 2.128-1.667l2.159-1.8a.75.75 0 0 1 1.056.097" clipRule="evenodd" /></svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-white">
                    Code envoyé
                  </h3>
                  <div className="mt-2 text-sm text-gray-300">
                    <p>
                      Nous avons envoyé un code de vérification à{' '}
                      <span className="font-medium text-blue-400">{email}</span>
                    </p>
                    <p className="mt-2">
                      Utilisez ce code pour réinitialiser votre mot de passe.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Information d'expiration */}
            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4 text-left">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="text-yellow-400"><path fill="currentColor" fillRule="evenodd" d="M3.378 5.082C3 5.62 3 7.22 3 10.417v1.574c0 5.638 4.239 8.375 6.899 9.536c.721.315 1.082.473 2.101.473c1.02 0 1.38-.158 2.101-.473C16.761 20.365 21 17.63 21 11.991v-1.574c0-3.198 0-4.797-.378-5.335c-.377-.537-1.88-1.052-4.887-2.081l-.573-.196C13.595 2.268 12.812 2 12 2s-1.595.268-3.162.805L8.265 3c-3.007 1.03-4.51 1.545-4.887 2.082M13.5 15a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1.401A2.999 2.999 0 0 1 12 8a3 3 0 0 1 1.5 5.599z" clipRule="evenodd" /></svg>
                </div>
                <div className="ml-3">
                  <div className="text-sm text-yellow-200">
                    <p>
                      Le code expire dans les 10 minutes après l'envoi pour garantir votre sécurité.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Redirection automatique */}
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full">
        <div className="relative rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-xl">
          <div className="p-6 sm:p-8">
            {/* Logo */}
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
                Mot de passe oublié ?
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Entrez votre adresse email et nous vous enverrons un code pour réinitialiser votre mot de passe
              </p>
            </div>

            {/* Formulaire */}
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Adresse email
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" fillRule="evenodd" d="M3.172 5.172C2 6.343 2 8.229 2 12s0 5.657 1.172 6.828S6.229 20 10 20h4c3.771 0 5.657 0 6.828-1.172S22 15.771 22 12s0-5.657-1.172-6.828S17.771 4 14 4h-4C6.229 4 4.343 4 3.172 5.172M18.576 7.52a.75.75 0 0 1-.096 1.056l-2.196 1.83c-.887.74-1.605 1.338-2.24 1.746c-.66.425-1.303.693-2.044.693s-1.384-.269-2.045-.693c-.634-.408-1.352-1.007-2.239-1.745L5.52 8.577a.75.75 0 0 1 .96-1.153l2.16 1.799c.933.777 1.58 1.315 2.128 1.667c.529.34.888.455 1.233.455s.704-.114 1.233-.455c.547-.352 1.195-.89 2.128-1.667l2.159-1.8a.75.75 0 0 1 1.056.097" clipRule="evenodd" /></svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-800/80 text-gray-200 placeholder-gray-400 pl-12 pr-4 py-3.5 rounded-lg border-2 border-gray-700/50 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                    placeholder="votre@email.com"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Entrez l'adresse email associée à votre compte
                </p>
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
                      Envoi en cours...
                    </div>
                  ) : (
                    'Envoyer le lien de réinitialisation'
                  )}
                </button>
              </div>

              <div className="text-center">
                <a href="/login" className="text-sm text-gray-400 hover:text-blue-400 transition-colors cursor-pointer inline-flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" className="mr-2"><path fill="currentColor" d="M20 11.25a.75.75 0 0 1 0 1.5h-9.25V18a.75.75 0 0 1-1.28.53l-6-6a.75.75 0 0 1 0-1.06l6-6a.75.75 0 0 1 1.28.53v5.25z" /></svg>
                  Retour à la connexion
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
