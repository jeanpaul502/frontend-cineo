'use client';

import React, { useState } from 'react';
import Footer from './Footer';
import Navbar from './Navbar';
import ReviewModal from './ReviewModal';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';

const WelcomePage = () => {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 text-white overflow-hidden">
      <Navbar />

      {/* Hero Section */}
      <main className="relative pt-26">
        {/* Animated Background - Preserved */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black z-10"></div>
          <div className="grid grid-cols-8 md:grid-cols-12 lg:grid-cols-16 gap-1 h-full opacity-10">
            {Array.from({ length: 128 }).map((_, i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-blue-900/20 via-gray-800/30 to-purple-900/20 rounded-sm animate-pulse"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: `${3 + (i % 4)}s`
                }}
              />
            ))}
          </div>
        </div>

        <section className="relative z-20 mx-auto max-w-7xl px-6 lg:px-8 py-8 lg:py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left copy */}
            <div className="md:-ml-2 lg:-ml-16">
              <h1 className="mt-6 font-bold tracking-tight text-white text-[20px] sm:text-[30px] lg:text-[38px] leading-[1.12] max-w-[620px]">
                Regardez vos films<br className="hidden sm:block" />et séries préférés<br className="hidden sm:block" />gratuitement, partout dans le monde
              </h1>
              <p className="mt-4 text-gray-300 max-w-[560px]">
                Profitez d'un streaming de qualité HD/4K sans publicité, avec des notifications en temps réel et la possibilité de demander vos films favoris.
              </p>

              {/* Social proof */}
              <div className="mt-6">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-500 border-2 border-gray-800"></div>
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-500 border-2 border-gray-800"></div>
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-emerald-500 to-lime-500 border-2 border-gray-800"></div>
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 border-2 border-gray-800"></div>
                  </div>
                  <div className="flex items-center text-amber-400 space-x-1">
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2l2.39 4.84 5.34.78-3.86 3.76.91 5.32L10 14.77 5.22 16.7l.91-5.32L2.27 7.62l5.34-.78L10 2z" /></svg>
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2l2.39 4.84 5.34.78-3.86 3.76.91 5.32L10 14.77 5.22 16.7l.91-5.32L2.27 7.62l5.34-.78L10 2z" /></svg>
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2l2.39 4.84 5.34.78-3.86 3.76.91 5.32L10 14.77 5.22 16.7l.91-5.32L2.27 7.62l5.34-.78L10 2z" /></svg>
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" opacity=".4"><path d="M10 2l2.39 4.84 5.34.78-3.86 3.76.91 5.32L10 14.77 5.22 16.7l.91-5.32L2.27 7.62l5.34-.78L10 2z" /></svg>
                  </div>
                  <div className="text-sm text-gray-300">4.9 · 1.2k Évaluations · <a href="#" className="underline text-blue-400">400+ Avis</a></div>
                </div>
                {/* CTAs directly below reviews */}
                <div className="mt-7 flex items-center gap-3">
                  <Button
                    href="/register"
                    variant="default"
                    size="lg"
                    className="group w-full sm:w-[180px] text-[13px] sm:text-[13px] justify-center"
                  >
                    Commencer Gratuitement
                  </Button>
                  <Button variant="outline" size="lg" className="group w-full sm:w-[180px] text-[13px] sm:text-[13px] justify-center cursor-pointer" onClick={() => setIsReviewModalOpen(true)}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 mr-2"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" d="M9.232 8.618c-1.968.445-2.952.667-3.186 1.42s.437 1.537 1.778 3.106l.347.406c.381.445.572.668.658.944c.085.276.057.573-.001 1.168l-.052.541c-.203 2.094-.305 3.14.308 3.605s1.534.041 3.377-.807l.476-.22c.524-.24.786-.361 1.063-.361s.54.12 1.063.361l.476.22c1.843.848 2.764 1.272 3.377.807s.511-1.511.308-3.605m.952-3.06c1.341-1.568 2.012-2.352 1.778-3.105s-1.218-.975-3.186-1.42l-.509-.116c-.559-.126-.838-.19-1.063-.36s-.368-.428-.656-.945l-.262-.47C15.264 4.909 14.758 4 14 4s-1.264.909-2.277 2.727M2.089 16a4.74 4.74 0 0 1 4-.874m-4-4.626c1-.5 1.29-.44 2-.5M2 5.609l.208-.122c2.206-1.292 4.542-1.64 6.745-1.005l.208.06" /></svg>
                    Laissez un avis
                  </Button>
                </div>
              </div>
            </div>

            {/* Right visual: phone mockup with overlays */}
            <div className="relative flex justify-center lg:justify-end md:translate-x-4 lg:translate-x-8">
              {/* Phone body */}
              <div className="relative w-[320px] sm:w-[360px] rounded-[36px] border border-gray-600 bg-gray-800 shadow-2xl overflow-hidden">
                {/* Dynamic island notch */}
                <div className="absolute left-1/2 -translate-x-1/2 top-[6px]">
                  <div className="mx-auto h-5 w-20 rounded-full bg-black"></div>
                  <div className="absolute right-6 top-0 h-2.5 w-2.5 rounded-full bg-black/90"></div>
                </div>
                {/* App header */}
                <div className="px-4 pt-8 pb-3 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">Mon Compte</div>
                    <button className="h-7 w-7 rounded-full bg-gray-700"></button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="inline-flex items-center gap-1 rounded-full bg-gray-700 border border-gray-600 px-2 py-0.5 text-[10px] text-gray-300">
                      •••• 3425
                      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M7 8l3 2-3 2V8z" /></svg>
                    </div>
                  </div>
                  <div className="mt-2 text-white font-semibold text-2xl">10K+ Films</div>
                  <p className="text-[11px] text-emerald-400">Nouveau contenu chaque jour ↑</p>
                </div>
                {/* App grid */}
                <div className="px-4 py-3 grid grid-cols-4 gap-3 text-[11px]">
                  <div className="col-span-1 text-center">
                    <div className="mx-auto h-10 w-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">🎬</div>
                    <div className="mt-1 text-gray-400">Films</div>
                  </div>
                  <div className="col-span-1 text-center">
                    <div className="mx-auto h-10 w-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">📺</div>
                    <div className="mt-1 text-gray-400">Séries</div>
                  </div>
                  <div className="col-span-1 text-center">
                    <div className="mx-auto h-10 w-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">🔔</div>
                    <div className="mt-1 text-gray-400">Notifications</div>
                  </div>
                  <div className="col-span-1 text-center">
                    <div className="mx-auto h-10 w-10 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center">💝</div>
                    <div className="mt-1 text-gray-400">Dons</div>
                  </div>
                </div>
                {/* List */}
                <div className="px-4 pb-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">Populaires Aujourd'hui</div>
                    <span className="text-[10px] text-gray-500">Maintenant</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/20"></div>
                      <div>
                        <div className="text-[12px] font-medium text-gray-300">Action & Aventure</div>
                        <div className="text-[10px] text-gray-500">Nouveautés HD</div>
                      </div>
                    </div>
                    <div className="text-[12px] font-semibold text-blue-400">4K</div>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-purple-500/20"></div>
                      <div>
                        <div className="text-[12px] font-medium text-gray-300">Demande de Film</div>
                        <div className="text-[10px] text-gray-500">Gratuit</div>
                      </div>
                    </div>
                    <div className="text-[12px] font-semibold text-green-400">✓</div>
                  </div>
                </div>

                {/* Bottom navigation */}
                <div className="border-t border-gray-700 p-3 grid grid-cols-4 text-[10px] text-gray-400">
                  <div className="text-center"><div className="mx-auto h-5 w-5 rounded-md bg-gray-700"></div>Accueil</div>
                  <div className="text-center"><div className="mx-auto h-5 w-5 rounded-md bg-gray-700"></div>Films</div>
                  <div className="text-center"><div className="mx-auto h-5 w-5 rounded-md bg-gray-700"></div>Séries</div>
                  <div className="text-center"><div className="mx-auto h-5 w-5 rounded-md bg-blue-600"></div>Profil</div>
                </div>
              </div>

              {/* Floating: Receiver card */}
              <div className="absolute -right-18 -top-0.10 hidden md:block">
                <div className="w-[240px] rounded-2xl bg-gray-800/90 border border-gray-600 shadow-xl p-3 backdrop-blur-sm">
                  <div className="text-[11px] text-gray-400 mb-2">Genres Populaires</div>
                  <div className="space-y-2">
                    {[["Action", "2.5K films"], ["Comédie", "1.8K films"], ["Drame", "3.2K films"]].map((genre, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 overflow-hidden">
                            <div className="h-full w-full bg-gradient-to-br from-blue-400 to-purple-500"></div>
                          </div>
                          <div>
                            <div className="text-[12px] font-medium text-gray-300">{genre[0]}</div>
                            <div className="text-[10px] text-gray-500">{genre[1]}</div>
                          </div>
                        </div>
                        <div className="h-5 w-5 rounded-full border border-gray-600 flex items-center justify-center">
                          <svg className="h-3 w-3 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path d="M7.5 12.5l-2.5-2 1-1 1.5 1.2 4-4.2 1.2 1.2-5.2 5Z" /></svg>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating: Spending Limits */}
              <div className="absolute -left-0 bottom-10 hidden md:block">
                <div className="w-[280px] rounded-2xl bg-gray-800/90 border border-gray-600 shadow-xl p-3 backdrop-blur-sm">
                  <div className="text-[11px] text-gray-400 mb-2">Qualité de Streaming</div>
                  <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
                    <div className="h-full w-[85%] rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
                    <span>HD/4K disponible pour tous les contenus</span>
                    <span className="text-blue-400">85%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Statistiques */}
        <div className="py-10 md:py-22 bg-gradient-to-b from-gray-900/60 to-black/80">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-5 gap-2 md:gap-16 place-items-center -ml-1 md:-ml-2 lg:-ml-16">
              {/* Films */}
              <div className="text-center w-full">
                <div className="flex flex-col items-center justify-center group">
                  <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                    19.66M
                  </div>
                  <p className="text-base text-gray-300">Films Disponibles</p>
                </div>
              </div>

              {/* Utilisateurs */}
              <div className="text-center w-full">
                <div className="flex flex-col items-center justify-center group">
                  <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                    5.79M
                  </div>
                  <p className="text-base text-gray-300">Utilisateurs Actifs</p>
                </div>
              </div>

              {/* Séries */}
              <div className="text-center w-full">
                <div className="flex flex-col items-center justify-center group">
                  <div className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-red-400 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                    32.63M
                  </div>
                  <p className="text-base text-gray-300">Heures Visionnées</p>
                </div>
              </div>

              {/* Qualité */}
              <div className="text-center w-full">
                <div className="flex flex-col items-center justify-center group">
                  <div className="text-4xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                    4.23M
                  </div>
                  <p className="text-base text-gray-300">Visiteurs Uniques</p>
                </div>
              </div>

              {/* Streaming */}
              <div className="text-center w-full">
                <div className="flex flex-col items-center justify-center group">
                  <div className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                    24/7
                  </div>
                  <p className="text-base text-gray-300">Streaming Gratuit</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Fournisseurs de services */}
        <div className="py-16 bg-gradient-to-b from-black/80 to-gray-900/60">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Fournisseurs de services</h2>
              <div className="w-32 md:w-48 h-1 bg-gradient-to-r from-blue-400 to-purple-400 mx-auto rounded-full mb-6"></div>
            </div>

            <div className="flex justify-between items-center gap-8 overflow-x-auto pb-4">
              {/* Netflix */}
              <div className="group flex-shrink-0">
                <div className="w-24 h-24 flex items-center justify-center bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-red-500/20 group-hover:border-white/20">
                  <Icon icon="ri:netflix-fill" className="w-16 h-16 text-[#E50914]" />
                </div>
                <p className="text-center mt-2 text-sm text-gray-300 group-hover:text-white transition-colors">Netflix</p>
              </div>

              {/* Amazon Prime */}
              <div className="group flex-shrink-0">
                <div className="w-24 h-24 flex items-center justify-center bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-blue-500/20 group-hover:border-white/20">
                  <Icon icon="arcticons:amazon-prime-video" className="w-16 h-16 text-[#00A8E1]" />
                </div>
                <p className="text-center mt-2 text-sm text-gray-300 group-hover:text-white transition-colors">Prime Video</p>
              </div>

              {/* Disney+ */}
              <div className="group flex-shrink-0">
                <div className="w-24 h-24 flex items-center justify-center bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-blue-500/20 group-hover:border-white/20">
                  <Icon icon="cib:disney-plus" className="w-16 h-16 text-[#0063E5]" />
                </div>
                <p className="text-center mt-2 text-sm text-gray-300 group-hover:text-white transition-colors">Disney+</p>
              </div>

              {/* Paramount+ */}
              <div className="group flex-shrink-0">
                <div className="w-24 h-24 flex items-center justify-center bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-blue-500/20 group-hover:border-white/20">
                  <Icon icon="simple-icons:paramountplus" className="w-16 h-16 text-[#0064FF]" />
                </div>
                <p className="text-center mt-2 text-sm text-gray-300 group-hover:text-white transition-colors">Paramount+</p>
              </div>

              {/* Apple TV */}
              <div className="group flex-shrink-0">
                <div className="w-24 h-24 flex items-center justify-center bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-gray-500/20 group-hover:border-white/20">
                  <Icon icon="arcticons:apple-tv" className="w-16 h-16 text-white" />
                </div>
                <p className="text-center mt-2 text-sm text-gray-300 group-hover:text-white transition-colors">Apple TV+</p>
              </div>

              {/* Pluto TV */}
              <div className="group flex-shrink-0">
                <div className="w-24 h-24 flex items-center justify-center bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-yellow-500/20 group-hover:border-white/20">
                  <Icon icon="simple-icons:pluto" className="w-16 h-16 text-[#FFC600]" />
                </div>
                <p className="text-center mt-2 text-sm text-gray-300 group-hover:text-white transition-colors">Pluto TV</p>
              </div>

              {/* The Roku Channel */}
              <div className="group flex-shrink-0">
                <div className="w-24 h-24 flex items-center justify-center bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-purple-500/20 group-hover:border-white/20">
                  <Icon icon="simple-icons:roku" className="w-16 h-16 text-[#662D91]" />
                </div>
                <p className="text-center mt-2 text-sm text-gray-300 group-hover:text-white transition-colors">Roku Channel</p>
              </div>

              {/* Hulu */}
              <div className="group flex-shrink-0">
                <div className="w-24 h-24 flex items-center justify-center bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-green-500/20 group-hover:border-white/20">
                  <Icon icon="simple-icons:hulu" className="w-16 h-16 text-[#1CE783]" />
                </div>
                <p className="text-center mt-2 text-sm text-gray-300 group-hover:text-white transition-colors">Hulu</p>
              </div>

              {/* iQIYI */}
              <div className="group flex-shrink-0">
                <div className="w-24 h-24 flex items-center justify-center bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-green-500/20 group-hover:border-white/20">
                  <Icon icon="simple-icons:iqiyi" className="w-16 h-16 text-[#00BE06]" />
                </div>
                <p className="text-center mt-2 text-sm text-gray-300 group-hover:text-white transition-colors">iQIYI</p>
              </div>

              {/* HBO Max */}
              <div className="group flex-shrink-0">
                <div className="w-24 h-24 flex items-center justify-center bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-blue-500/20 group-hover:border-white/20">
                  <Icon icon="simple-icons:hbo" className="w-16 h-16 text-[#0078FF]" />
                </div>
                <p className="text-center mt-2 text-sm text-gray-300 group-hover:text-white transition-colors">HBO Max</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="relative py-16 px-6 bg-gradient-to-br from-gray-900/60 to-black/80">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Fonctionnalités Principales</h2>
            <div className="w-32 md:w-48 h-1 bg-gradient-to-r from-blue-400 to-purple-400 mx-auto rounded-full mb-6"></div>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">Découvrez tous les outils que nous proposons pour votre expérience de streaming.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Streaming Gratuit */}
            <div className="p-6 group">
              <div className="flex items-start mb-3">
                <div className="w-10 h-10 bg-white/5 border-2 border-white/20 rounded-lg flex items-center justify-center mr-3 backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-blue-400"><path fill="currentColor" d="M21.409 9.353a2.998 2.998 0 0 1 0 5.294L8.597 21.614C6.534 22.737 4 21.277 4 18.968V5.033c0-2.31 2.534-3.769 4.597-2.648z" /></svg>
                </div>
                <h3 className="text-base font-bold text-white pt-2">Streaming Gratuit</h3>
              </div>
              <p className="text-gray-300 text-sm">Regardez des milliers de films et séries en streaming gratuit, sans abonnement ni frais cachés.</p>
            </div>

            {/* Qualité HD/4K */}
            <div className="p-6 group">
              <div className="flex items-start mb-3">
                <div className="w-10 h-10 bg-white/5 border-2 border-white/20 rounded-lg flex items-center justify-center mr-3 backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-purple-400"><path fill="currentColor" d="M9.153 5.408C10.42 3.136 11.053 2 12 2s1.58 1.136 2.847 3.408l.328.588c.36.646.54.969.82 1.182s.63.292 1.33.45l.636.144c2.46.557 3.689.835 3.982 1.776c.292.94-.546 1.921-2.223 3.882l-.434.507c-.476.557-.715.836-.822 1.18c-.107.345-.071.717.001 1.46l.066.677c.253 2.617.38 3.925-.386 4.506s-1.918.051-4.22-1.009l-.597-.274c-.654-.302-.981-.452-1.328-.452s-.674.15-1.328.452l-.596.274c-2.303 1.06-3.455 1.59-4.22 1.01c-.767-.582-.64-1.89-.387-4.507l.066-.676c.072-.744.108-1.116 0-1.46c-.106-.345-.345-.624-.821-1.18l-.434-.508c-1.677-1.96-2.515-2.941-2.223-3.882S3.58 8.328 6.04 7.772l.636-.144c.699-.158 1.048-.237 1.329-.45s.46-.536.82-1.182z" /></svg>
                </div>
                <h3 className="text-base font-bold text-white pt-2">Qualité Ultra HD</h3>
              </div>
              <p className="text-gray-300 text-sm">Profitez d'une qualité d'image exceptionnelle en HD et 4K avec un son cristallin pour une expérience immersive.</p>
            </div>

            {/* Sans Publicité */}
            <div className="p-6 group">
              <div className="flex items-start mb-3">
                <div className="w-10 h-10 bg-white/5 border-2 border-white/20 rounded-lg flex items-center justify-center mr-3 backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-green-400"><path fill="currentColor" fillRule="evenodd" d="M3.378 5.082C3 5.62 3 7.22 3 10.417v1.574c0 5.638 4.239 8.375 6.899 9.536c.721.315 1.082.473 2.101.473c1.02 0 1.38-.158 2.101-.473C16.761 20.365 21 17.63 21 11.991v-1.574c0-3.198 0-4.797-.378-5.335c-.377-.537-1.88-1.052-4.887-2.081l-.573-.196C13.595 2.268 12.812 2 12 2s-1.595.268-3.162.805L8.265 3c-3.007 1.03-4.51 1.545-4.887 2.082M10.03 8.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.97 1.97a.75.75 0 1 0 1.06 1.06L12 13.06l1.97 1.97a.75.75 0 0 0 1.06-1.06L13.06 12l1.97-1.97a.75.75 0 1 0-1.06-1.06L12 10.94z" clipRule="evenodd" /></svg>
                </div>
                <h3 className="text-base font-bold text-white pt-2">Sans Publicité</h3>
              </div>
              <p className="text-gray-300 text-sm">Regardez vos contenus préférés sans interruption publicitaire pour une expérience de visionnage optimale.</p>
            </div>

            {/* Notifications Temps Réel */}
            <div className="p-6 group">
              <div className="flex items-start mb-3">
                <div className="w-10 h-10 bg-white/5 border-2 border-white/20 rounded-lg flex items-center justify-center mr-3 backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-orange-400"><path fill="currentColor" d="M8.352 20.242A4.63 4.63 0 0 0 12 22a4.63 4.63 0 0 0 3.648-1.758a27.2 27.2 0 0 1-7.296 0M18.75 9v.704c0 .845.24 1.671.692 2.374l1.108 1.723c1.011 1.574.239 3.713-1.52 4.21a25.8 25.8 0 0 1-14.06 0c-1.759-.497-2.531-2.636-1.52-4.21l1.108-1.723a4.4 4.4 0 0 0 .693-2.374V9c0-3.866 3.022-7 6.749-7s6.75 3.134 6.75 7" /></svg>
                </div>
                <h3 className="text-base font-bold text-white pt-2">Notifications Temps Réel</h3>
              </div>
              <p className="text-gray-300 text-sm">Recevez des notifications instantanées pour les nouveaux films, séries et mises à jour de votre liste de favoris.</p>
            </div>

            {/* Demandes de Films */}
            <div className="p-6 group">
              <div className="flex items-start mb-3">
                <div className="w-10 h-10 bg-white/5 border-2 border-white/20 rounded-lg flex items-center justify-center mr-3 backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-red-400"><path fill="currentColor" d="M16.519 16.501c.175-.136.334-.295.651-.612l3.957-3.958c.096-.095.052-.26-.075-.305a4.3 4.3 0 0 1-1.644-1.034a4.3 4.3 0 0 1-1.034-1.644c-.045-.127-.21-.171-.305-.075L14.11 12.83c-.317.317-.476.476-.612.651q-.243.311-.412.666c-.095.2-.166.414-.308.84l-.184.55l-.292.875l-.273.82a.584.584 0 0 0 .738.738l.82-.273l.875-.292l.55-.184c.426-.142.64-.212.84-.308q.355-.17.666-.412m5.849-5.809a2.163 2.163 0 1 0-3.06-3.059l-.126.128a.52.52 0 0 0-.148.465c.02.107.055.265.12.452c.13.375.376.867.839 1.33s.955.709 1.33.839c.188.065.345.1.452.12a.53.53 0 0 0 .465-.148z" /><path fill="currentColor" fillRule="evenodd" d="M4.172 3.172C3 4.343 3 6.229 3 10v4c0 3.771 0 5.657 1.172 6.828S7.229 22 11 22h2c3.771 0 5.657 0 6.828-1.172C20.981 19.676 21 17.832 21 14.18l-2.818 2.818c-.27.27-.491.491-.74.686a5 5 0 0 1-.944.583a8 8 0 0 1-.944.355l-2.312.771a2.083 2.083 0 0 1-2.635-2.635l.274-.82l.475-1.426l.021-.066c.121-.362.22-.658.356-.944q.24-.504.583-.943c.195-.25.416-.47.686-.74l4.006-4.007L18.12 6.7l.127-.127A3.65 3.65 0 0 1 20.838 5.5c-.151-1.03-.444-1.763-1.01-2.328C18.657 2 16.771 2 13 2h-2C7.229 2 5.343 2 4.172 3.172M7.25 9A.75.75 0 0 1 8 8.25h6.5a.75.75 0 0 1 0 1.5H8A.75.75 0 0 1 7.25 9m0 4a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5H8a.75.75 0 0 1-.75-.75m0 4a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H8a.75.75 0 0 1-.75-.75" clipRule="evenodd" /></svg>
                </div>
                <h3 className="text-base font-bold text-white pt-2">Demandes de Films</h3>
              </div>
              <p className="text-gray-300 text-sm">Demandez l'ajout de vos films et séries préférés. Notre équipe s'efforce de répondre rapidement à vos demandes.</p>
            </div>

            {/* Dons Volontaires */}
            <div className="p-6 group">
              <div className="flex items-start mb-3">
                <div className="w-10 h-10 bg-white/5 border-2 border-white/20 rounded-lg flex items-center justify-center mr-3 backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-indigo-400"><path fill="currentColor" d="M2 9.137C2 14 6.02 16.591 8.962 18.911C10 19.729 11 20.5 12 20.5s2-.77 3.038-1.59C17.981 16.592 22 14 22 9.138S16.5.825 12 5.501C7.5.825 2 4.274 2 9.137" /></svg>
                </div>
                <h3 className="text-base font-bold text-white pt-2">Dons Volontaires</h3>
              </div>
              <p className="text-gray-300 text-sm">Soutenez la plateforme par des dons volontaires pour nous aider à maintenir et améliorer nos services.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSuccess={() => {
          setIsReviewModalOpen(false);
        }}
      />
    </div>
  );
};

export default WelcomePage;