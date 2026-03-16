'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Poppins } from 'next/font/google';
import { APP_NAME } from '../../services/config';

const poppins = Poppins({ subsets: ['latin'], weight: ['500', '600'] });

const ActionButtons = ({ full = false }: { full?: boolean }) => (
  <>
    <Button
      href="/login"
      variant="outline"
      size="lg"
      className={`${poppins.className} ${full ? "w-full justify-center text-[14px]" : "w-[160px] md:w-[145px] justify-center text-[14px] md:text-[13px] md:h-9 md:px-3"}`}
    >
      Se connecter
    </Button>
    <Button
      href="/register"
      variant="default"
      size="lg"
      className={`${poppins.className} ${full ? "w-full justify-center text-[14px]" : "w-[160px] md:w-[145px] justify-center text-[14px] md:text-[13px] md:h-9 md:px-3"}`}
    >
      S&apos;inscrire
    </Button>
  </>
);

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black' : ''}`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 md:-translate-x-2 lg:-translate-x-28">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L20.5 6.5V17.5L12 22L3.5 17.5V6.5L12 2Z" fill="white" fillOpacity="0.9"/>
              <path d="M12 7L16.5 9.5V14.5L12 17L7.5 14.5V9.5L12 7Z" fill="#2563EB"/>
            </svg>
          </div>
          <span className="font-semibold text-lg text-white">{APP_NAME}</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-300">
          <a href="#" className="relative group transition-colors text-gray-300 hover:text-white">
            <span className="inline-block relative after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-blue-500 after:transition-all after:duration-200 group-hover:after:w-full">À propos</span>
          </a>
          <a href="#" className="relative group flex items-center gap-1 transition-colors text-gray-300 hover:text-white">
            <span className="inline-block relative after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-blue-500 after:transition-all after:duration-200 group-hover:after:w-full">Ressources</span>
            <svg className="h-3.5 w-3.5 text-gray-400 transition-transform duration-200 group-hover:translate-y-0.5 group-hover:text-white" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5.5 7.5l4.5 4.5 4.5-4.5H5.5z"/>
            </svg>
          </a>
          <a href="#" className="relative group transition-colors text-gray-300 hover:text-white">
            <span className="inline-block relative after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-blue-500 after:transition-all after:duration-200 group-hover:after:w-full">Solutions</span>
          </a>
          <a href="#" className="relative group flex items-center gap-1 transition-colors text-gray-300 hover:text-white">
            <span className="inline-block relative after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-blue-500 after:transition-all after:duration-200 group-hover:after:w-full">Tarifs</span>
            <svg className="h-3.5 w-3.5 text-gray-400 transition-transform duration-200 group-hover:translate-y-0.5 group-hover:text-white" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5.5 7.5l4.5 4.5 4.5-4.5H5.5z"/>
            </svg>
          </a>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Ouvrir le menu"
          className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h16v2H4z" />
          </svg>
        </button>
        <div className="hidden md:flex items-center gap-3 justify-self-end md:translate-x-8 lg:translate-x-40">
          <ActionButtons />
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-black border-t border-white/10">
          <div className="px-4 py-4 space-y-3">
            <a href="#" className="block px-2 py-2 text-gray-300 hover:text-white">À propos</a>
            <a href="#" className="block px-2 py-2 text-gray-300 hover:text-white">Ressources</a>
            <a href="#" className="block px-2 py-2 text-gray-300 hover:text-white">Solutions</a>
            <a href="#" className="block px-2 py-2 text-gray-300 hover:text-white">Tarifs</a>
            <div className="pt-2 grid grid-cols-2 gap-3">
              <Button href="/login" variant="outline" size="lg" className={`${poppins.className} w-full justify-center text-[14px]`}>Se connecter</Button>
              <Button href="/register" variant="default" size="lg" className={`${poppins.className} w-full justify-center text-[14px]`}>S&apos;inscrire</Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;