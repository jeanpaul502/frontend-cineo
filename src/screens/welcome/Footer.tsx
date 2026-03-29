'use client';

import React from 'react';
import { APP_NAME } from '../../services/config';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-b from-gray-900 to-black text-gray-300 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Section 1: Logo et Description */}
          <div className="lg:col-span-2 -ml-1 md:-ml-6 lg:-ml-[57px]">
            <div className="flex items-center space-x-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L20.5 6.5V17.5L12 22L3.5 17.5V6.5L12 2Z" fill="white" fillOpacity="0.9" />
                  <path d="M12 7L16.5 9.5V14.5L12 17L7.5 14.5V9.5L12 7Z" fill="#2563EB" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-white">{APP_NAME}</span>
            </div>
            <div className="mt-8 max-w-[90%]">
              <p className="text-gray-400 leading-relaxed">
                Plateforme CCDA de nouvelle génération, {APP_NAME} révolutionne l'expérience du streaming avec une technologie de pointe. Notre infrastructure robuste garantit une diffusion fluide et sécurisée de vos contenus multimédias.
              </p>
              <div className="flex space-x-6 mt-6">
                {/* Twitter/X */}
                <a href="#" className="bg-black p-1.5 rounded-md hover:opacity-80 transition-all duration-300 hover:scale-110 border border-white/10">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                {/* WhatsApp */}
                <a href="#" className="bg-[#25D366] p-1.5 rounded-md hover:opacity-80 transition-all duration-300 hover:scale-110">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
                {/* Telegram */}
                <a href="#" className="bg-[#0088CC] p-1.5 rounded-md hover:opacity-80 transition-all duration-300 hover:scale-110">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                </a>
                {/* GitHub */}
                <a href="#" className="bg-white p-1.5 rounded-md hover:opacity-80 transition-all duration-300 hover:scale-110">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#171515">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Sections du milieu */}
          <div>
            <h3 className="text-lg font-semibold text-white">Services</h3>
            <ul className="mt-8 space-y-3">
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-all duration-300">Streaming Ultra HD</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-all duration-300">Contenus Premium</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-all duration-300">Multi-appareils</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-all duration-300">Diffusion Sécurisée</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">Support</h3>
            <ul className="mt-8 space-y-3">
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-all duration-300">Documentation</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-all duration-300">Centre d'assistance</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-all duration-300">Support technique</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-all duration-300">État des services</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">Légal</h3>
            <ul className="mt-8 space-y-3">
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-all duration-300">Mentions légales</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-all duration-300">Confidentialité</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-all duration-300">Sécurité</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-all duration-300">Conformité RGPD</a></li>
            </ul>
          </div>

          {/* Section Newsletter */}
          <div>
            <h3 className="text-lg font-semibold text-white">Newsletter</h3>
            <div className="mt-8">
              <form className="flex flex-col space-y-4">
                <div className="relative flex w-72">
                  <input
                    type="email"
                    placeholder="Votre adresse email professionnelle"
                    className="w-full bg-gray-800/80 text-gray-200 text-sm placeholder-gray-400 px-5 py-3.5 rounded-lg border-2 border-gray-700/50 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <button type="submit" className="w-72 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3.5 rounded-lg hover:shadow-lg hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 cursor-pointer">
                  <span className="text-sm font-medium">S'abonner à la newsletter</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Barre de séparation et logos stores */}
        <div className="mt-12 pt-8 relative">
          <div className="absolute -left-[57px] -right-[115px] top-0 h-px bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800/40 md:-left-6 md:-right-[48px] lg:-left-[57px] lg:-right-[115px]"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-4 -ml-1 md:-ml-6 lg:-ml-[57px]">
              <span className="text-sm text-gray-400">© {new Date().getFullYear()} {APP_NAME}. Tous droits réservés.</span>
            </div>
            <div className="flex justify-end md:mr-[-46px] lg:mr-[-112px]">
              <div className="flex space-x-4">
                {/* App Store avec bordure gradient et effet hover */}
                <a href="#" className="group bg-gradient-to-br from-[#A917E8] via-[#4F46E5] to-[#2563EB] p-[2px] rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg">
                  <div className="bg-black rounded-xl overflow-hidden">
                    <img src="/app.svg" alt="App Store" className="h-12" />
                  </div>
                </a>

                {/* Google Play avec bordure gradient et effet hover */}
                <a href="#" className="group bg-gradient-to-br from-[#00DC82] via-[#36B37E] to-[#00875A] p-[2px] rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg">
                  <div className="bg-black rounded-xl overflow-hidden">
                    <img src="/android.svg" alt="Google Play" className="h-12" />
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;