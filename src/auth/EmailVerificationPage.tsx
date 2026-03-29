'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { showErrorToast, showSuccessToast } from '../lib/toast';
import { authService } from '../services/auth.service';

const EmailVerificationPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  
  const [code, setCode] = useState(['', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
       router.replace('/login');
    } else {
        // Auto focus first input
        inputRefs.current[0]?.focus();
    }
  }, [email, router]);

  const handleLogoClick = () => {
    const isLoggedIn =
      typeof document !== 'undefined' &&
      document.cookie.includes('cineo_session_token=');
    router.push(isLoggedIn ? '/dashboard' : '/');
  };

  const handleChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 5);
    if (/^\d+$/.test(pastedData)) {
      const newCode = pastedData.split('').concat(Array(5).fill('')).slice(0, 5);
      setCode(newCode);
      const nextIndex = Math.min(pastedData.length, 4);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const fullCode = code.join('');
    if (fullCode.length !== 5) {
        showErrorToast('Erreur', 'Veuillez entrer le code à 5 chiffres');
        return;
    }

    setIsLoading(true);
    try {
        await authService.verifyEmail(email, fullCode);
        setIsSuccess(true);
        setTimeout(() => router.push('/login'), 3000);
    } catch (error: any) {
        showErrorToast('Erreur', error.message || 'Code invalide');
        setIsLoading(false);
        setCode(['', '', '', '', '']);
        inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
     if (countdown > 0 || !email) return;
     try {
         await authService.resendVerificationCode(email);
         showSuccessToast('Succès', 'Un nouveau code a été envoyé');
         setCountdown(60);
     } catch (error: any) {
         showErrorToast('Erreur', error.message || 'Erreur lors de l\'envoi du code');
     }
  };

  useEffect(() => {
    if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
    }
  }, [countdown]);

  if (isSuccess) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg w-full">
            <div className="relative rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-xl p-8 text-center space-y-6">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 m-auto w-10 h-10 bg-white rounded-full"></div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" className="text-green-500 relative z-10"><path fill="currentColor" fillRule="evenodd" d="M9.592 3.2a6 6 0 0 1-.495.399c-.298.2-.633.338-.985.408c-.153.03-.313.043-.632.068c-.801.064-1.202.096-1.536.214a2.71 2.71 0 0 0-1.655 1.655c-.118.334-.15.735-.214 1.536a6 6 0 0 1-.068.632c-.07.352-.208.687-.408.985c-.087.13-.191.252-.399.495c-.521.612-.782.918-.935 1.238c-.353.74-.353 1.6 0 2.34c.153.32.414.626.935 1.238c.208.243.312.365.399.495c.2.298.338.633.408.985c.03.153.043.313.068.632c.064.801.096 1.202.214 1.536a2.71 2.71 0 0 0 1.655 1.655c.334.118.735.15 1.536.214c.319.025.479.038.632.068c.352.07.687.209.985.408c.13.087.252.191.495.399c.612.521.918.782 1.238.935c.74.353 1.6.353 2.34 0c.32-.153.626-.414 1.238-.935c.243-.208.365-.312.495-.399c.298-.2.633-.338.985-.408c.153-.03.313-.043.632-.068c.801-.064 1.202-.096 1.536-.214a2.71 2.71 0 0 0 1.655-1.655c.118-.334.15-.735.214-1.536c.025-.319.038-.479.068-.632c.07-.352.209-.687.408-.985c.087-.13.191-.252.399-.495c.521-.612.782-.918.935-1.238c.353-.74.353-1.6 0-2.34c-.153-.32-.414-.626-.935-1.238a6 6 0 0 1-.399-.495a2.7 2.7 0 0 1-.408-.985a6 6 0 0 1-.068-.632c-.064-.801-.096-1.202-.214-1.536a2.71 2.71 0 0 0-1.655-1.655c-.334-.118-.735-.15-1.536-.214a6 6 0 0 1-.632-.068a2.7 2.7 0 0 1-.985-.408a6 6 0 0 1-.495-.399c-.612-.521-.918-.782-1.238-.935a2.71 2.71 0 0 0-2.34 0c-.32.153-.626.414-1.238.935m6.781 6.663a.814.814 0 0 0-1.15-1.15l-4.85 4.85l-1.596-1.595a.814.814 0 0 0-1.15 1.15l2.17 2.17a.814.814 0 0 0 1.15 0z" clipRule="evenodd" /></svg>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white">
                  Email vérifié !
                </h2>
                <p className="text-sm text-gray-400">
                  Votre compte a été activé avec succès.
                </p>
              </div>

              <div className="flex justify-center items-center gap-3 pt-4">
                <span className="text-sm text-gray-400">Redirection vers la connexion...</span>
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
        <div className="relative rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-xl p-8">
          <div className="text-center mb-8">
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
            <h2 className="text-2xl font-bold text-white mb-2">Vérification de l'email</h2>
            <p className="text-gray-400 text-sm">
              Entrez le code à 5 chiffres envoyé à <span className="text-blue-400">{email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex justify-center gap-3">
              {code.map((digit, index) => (
                <div key={index} className="relative">
                  <input
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold bg-gray-800/80 text-gray-200 rounded-lg border-2 border-gray-700/50 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                  />
                  {!digit && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                       <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-gray-400">Vous n'avez pas reçu le code ?</span>
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={countdown > 0}
                        className={`text-sm font-medium ${countdown > 0 ? 'text-gray-500 cursor-not-allowed' : 'text-blue-400 hover:text-blue-300 cursor-pointer'}`}
                    >
                        {countdown > 0 ? `Renvoyer (${countdown}s)` : 'Renvoyer'}
                    </button>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/30 flex justify-center items-center"
                >
                    {isLoading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Vérification...
                        </>
                    ) : (
                        'Vérifier'
                    )}
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;
