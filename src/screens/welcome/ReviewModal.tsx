'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Review submitted:', { rating });

    setIsSubmitting(false);
    setShowSuccess(true);
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    setRating(0);
    onClose();
    onSuccess();
  };

  const handleStarClick = (starRating: number) => {
    setRating(starRating);
  };

  const handleStarHover = (starRating: number) => {
    setHoveredRating(starRating);
  };

  const handleStarLeave = () => {
    setHoveredRating(0);
  };

  if (!isOpen) return null;

  // Modal de succès
  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={handleCloseSuccess}
        />

        {/* Success Modal */}
        <div className="relative w-full max-w-md bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl p-8 text-center">
          {/* Success Icon avec badge animé */}
          {/* Success Icon - Badge uniquement */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              {/* Fond blanc pour la coche transparente */}
              <div className="absolute inset-0 m-auto w-10 h-10 bg-white rounded-full"></div>
              <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" className="text-green-500 relative z-10"><path fill="currentColor" fillRule="evenodd" d="M9.592 3.2a6 6 0 0 1-.495.399c-.298.2-.633.338-.985.408c-.153.03-.313.043-.632.068c-.801.064-1.202.096-1.536.214a2.71 2.71 0 0 0-1.655 1.655c-.118.334-.15.735-.214 1.536a6 6 0 0 1-.068.632c-.07.352-.208.687-.408.985c-.087.13-.191.252-.399.495c-.521.612-.782.918-.935 1.238c-.353.74-.353 1.6 0 2.34c.153.32.414.626.935 1.238c.208.243.312.365.399.495c.2.298.338.633.408.985c.03.153.043.313.068.632c.064.801.096 1.202.214 1.536a2.71 2.71 0 0 0 1.655 1.655c.334.118.735.15 1.536.214c.319.025.479.038.632.068c.352.07.687.209.985.408c.13.087.252.191.495.399c.612.521.918.782 1.238.935c.74.353 1.6.353 2.34 0c.32-.153.626-.414 1.238-.935c.243-.208.365-.312.495-.399c.298-.2.633-.338.985-.408c.153-.03.313-.043.632-.068c.801-.064 1.202-.096 1.536-.214a2.71 2.71 0 0 0 1.655-1.655c.118-.334.15-.735.214-1.536c.025-.319.038-.479.068-.632c.07-.352.209-.687.408-.985c.087-.13.191-.252.399-.495c.521-.612.782-.918.935-1.238c.353-.74.353-1.6 0-2.34c-.153-.32-.414-.626-.935-1.238a6 6 0 0 1-.399-.495a2.7 2.7 0 0 1-.408-.985a6 6 0 0 1-.068-.632c-.064-.801-.096-1.202-.214-1.536a2.71 2.71 0 0 0-1.655-1.655c-.334-.118-.735-.15-1.536-.214a6 6 0 0 1-.632-.068a2.7 2.7 0 0 1-.985-.408a6 6 0 0 1-.495-.399c-.612-.521-.918-.782-1.238-.935a2.71 2.71 0 0 0-2.34 0c-.32.153-.626.414-1.238.935m6.781 6.663a.814.814 0 0 0-1.15-1.15l-4.85 4.85l-1.596-1.595a.814.814 0 0 0-1.15 1.15l2.17 2.17a.814.814 0 0 0 1.15 0z" clipRule="evenodd" /></svg>
            </div>
          </div>

          {/* Success Message */}
          <div className="space-y-4 mb-6">
            <h2 className="text-3xl font-bold text-white">
              Merci pour votre avis !
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              Votre retour est précieux et nous aide à améliorer continuellement nos services pour vous offrir la meilleure expérience possible.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="text-red-500"><path fill="currentColor" d="M2 9.137C2 14 6.02 16.591 8.962 18.911C10 19.729 11 20.5 12 20.5s2-.77 3.038-1.59C17.981 16.592 22 14 22 9.138S16.5.825 12 5.501C7.5.825 2 4.274 2 9.137" /></svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-white mb-1">
                  Votre contribution compte
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Grâce à vos avis, nous identifions les points à améliorer et développons de nouvelles fonctionnalités adaptées à vos besoins.
                </p>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <Button
            onClick={handleCloseSuccess}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30 cursor-pointer"
          >
            Compris
          </Button>
        </div>
      </div>
    );
  }

  // Modal d'avis
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Review Modal */}
      <div className="relative w-full max-w-md bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Loading Overlay */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center z-30">
            <div className="flex flex-col items-center justify-center gap-3">
              {/* Elegant Spinner */}
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
              <p className="text-white text-sm font-light tracking-wide">Envoi en cours...</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="relative p-8">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-gray-400 hover:text-white"><path fill="currentColor" fillRule="evenodd" d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2s10 4.477 10 10M8.97 8.97a.75.75 0 0 1 1.06 0L12 10.94l1.97-1.97a.75.75 0 0 1 1.06 1.06L13.06 12l1.97 1.97a.75.75 0 0 1-1.06 1.06L12 13.06l-1.97 1.97a.75.75 0 0 1-1.06-1.06L10.94 12l-1.97-1.97a.75.75 0 0 1 0-1.06" clipRule="evenodd" /></svg>
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 text-amber-400"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" d="M9.232 8.618c-1.968.445-2.952.667-3.186 1.42s.437 1.537 1.778 3.106l.347.406c.381.445.572.668.658.944c.085.276.057.573-.001 1.168l-.052.541c-.203 2.094-.305 3.14.308 3.605s1.534.041 3.377-.807l.476-.22c.524-.24.786-.361 1.063-.361s.54.12 1.063.361l.476.22c1.843.848 2.764 1.272 3.377.807s.511-1.511.308-3.605m.952-3.06c1.341-1.568 2.012-2.352 1.778-3.105s-1.218-.975-3.186-1.42l-.509-.116c-.559-.126-.838-.19-1.063-.36s-.368-.428-.656-.945l-.262-.47C15.264 4.909 14.758 4 14 4s-1.264.909-2.277 2.727M2.089 16a4.74 4.74 0 0 1 4-.874m-4-4.626c1-.5 1.29-.44 2-.5M2 5.609l.208-.122c2.206-1.292 4.542-1.64 6.745-1.005l.208.06" /></svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Votre avis compte
            </h2>
            <p className="text-sm text-gray-400">
              Évaluez votre expérience en quelques secondes
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rating Stars */}
            <div className="text-center">
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleStarClick(star)}
                    onMouseEnter={() => handleStarHover(star)}
                    onMouseLeave={handleStarLeave}
                    className="p-2 transition-all hover:scale-110"
                  >
                    {star <= (hoveredRating || rating) ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-7 h-7 text-amber-400"><path fill="currentColor" d="M9.153 5.408C10.42 3.136 11.053 2 12 2s1.58 1.136 2.847 3.408l.328.588c.36.646.54.969.82 1.182s.63.292 1.33.45l.636.144c2.46.557 3.689.835 3.982 1.776c.292.94-.546 1.921-2.223 3.882l-.434.507c-.476.557-.715.836-.822 1.18c-.107.345-.071.717.001 1.46l.066.677c.253 2.617.38 3.925-.386 4.506s-1.918.051-4.22-1.009l-.597-.274c-.654-.302-.981-.452-1.328-.452s-.674.15-1.328.452l-.596.274c-2.303 1.06-3.455 1.59-4.22 1.01c-.767-.582-.64-1.89-.387-4.507l.066-.676c.072-.744.108-1.116 0-1.46c-.106-.345-.345-.624-.821-1.18l-.434-.508c-1.677-1.96-2.515-2.941-2.223-3.882S3.58 8.328 6.04 7.772l.636-.144c.699-.158 1.048-.237 1.329-.45s.46-.536.82-1.182z" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-7 h-7 text-gray-600"><path fill="currentColor" fillRule="evenodd" d="M12 2.75c.568 0 1.138.73 2.254 3.008l.188.384c.28.574.421.862.635 1.076s.49.337 1.093.486l.445.11c2.343.579 3.515.868 3.78 1.67s-.616 1.745-2.28 3.588l-.28.31c-.416.46-.624.69-.746 1.002s-.113.65-.04 1.339l.054.51c.258 2.41.387 3.615-.274 4.124s-1.719.083-3.931-.826l-.372-.153q-.729-.3-1.158-.463c-.286-.109-.429-.163-.576-.163s-.29.054-.576.163q-.43.163-1.158.463l-.372.153c-2.212.909-3.318 1.363-3.98.854s-.532-1.714-.274-4.124l.054-.51c.073-.69.11-1.036-.04-1.339c-.15-.304-.33-.542-.746-1.002l-.28-.31C3.008 11.394 2.344 10.25 2.61 9.448s1.437-1.091 3.78-1.67l.445-.11c.603-.15.88-.272 1.093-.486s.355-.502.635-1.076l.188-.384C9.862 3.48 10.432 2.75 11 2.75zm0 1.542c-.315.457-.71 1.156-1.332 2.464l-.189.384c-.353.724-.53 1.086-.828 1.384s-.672.489-1.446.674l-.445.11c-1.305.322-1.958.483-2.176.75s-.067.598.155 1.587c0 .001 0 .003.001.005l.032.142l.248.276c.486.538.729.807.92 1.194s.224.821.124 1.589l-.054.51c-.182 1.696-.274 2.545-.054 2.825s.748.244 2.122-.33l.371-.153q.76-.313 1.21-.488c.449-.174.673-.261.898-.261s.45.087.898.261q.45.175 1.21.488l.371.153c1.374.574 2.061.86 2.281.58s.128-1.129-.054-2.825l-.054-.51c-.1-.768-.067-1.202.124-1.588s.434-.657.92-1.195l.248-.276l.032-.141c0-.003.001-.005.001-.006c.222-.989.373-1.32.155-1.587s-.871-.428-2.176-.75l-.445-.11c-.774-.185-1.161-.278-1.446-.674s-.475-.66-.828-1.384l-.189-.384c-.622-1.308-1.017-2.007-1.332-2.464" clipRule="evenodd" /></svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Info Message */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="text-blue-400"><path fill="currentColor" fillRule="evenodd" d="M11.5 2C7.358 2 4 5.436 4 9.674c0 2.273.966 4.315 2.499 5.72c.51.467.889.814 1.157 1.066a15 15 0 0 1 .4.39l.033.036c.237.3.288.376.318.446s.053.16.112.54c.024.15.026.406.026 1.105v.03c0 .409 0 .762.026 1.051c.027.306.087.61.248.895c.18.319.438.583.75.767c.278.165.575.226.874.254c.283.026.628.026 1.028.026h.058c.4 0 .745 0 1.028-.026c.3-.028.595-.09.875-.254a2.07 2.07 0 0 0 .749-.767c.16-.285.22-.588.248-.895c.026-.29.026-.642.025-1.051v-.03c0-.699.003-.955.026-1.105c.06-.38.082-.47.113-.54c.03-.07.081-.147.318-.446l.008-.01l.025-.026l.088-.09q.112-.113.312-.3c.268-.252.647-.599 1.157-1.067A7.74 7.74 0 0 0 19 9.674C19 5.436 15.642 2 11.5 2m1.585 17.674h-3.17q.004.145.014.258c.019.21.05.286.071.324a.7.7 0 0 0 .25.255c.037.022.111.054.316.073c.214.02.497.02.934.02s.72 0 .934-.02c.205-.019.279-.05.316-.073a.7.7 0 0 0 .25-.255c.021-.038.052-.114.07-.324q.011-.113.015-.258M12.61 8.176c.307.224.378.66.159.974l-1.178 1.687h1.402a.68.68 0 0 1 .607.379a.71.71 0 0 1-.052.724L11.6 14.731a.67.67 0 0 1-.951.162a.71.71 0 0 1-.158-.973l1.178-1.687h-1.403a.68.68 0 0 1-.606-.379a.71.71 0 0 1 .051-.725l1.948-2.79a.67.67 0 0 1 .951-.163" clipRule="evenodd" /></svg>
                </div>
                <div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Vos retours nous permettent d'améliorer continuellement notre plateforme et de vous offrir une expérience toujours plus exceptionnelle.
                  </p>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 bg-gray-700/50 hover:bg-gray-700/70 text-white py-3 rounded-lg transition-all cursor-pointer"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={rating === 0 || isSubmitting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" fillRule="evenodd" d="M3.172 5.172C2 6.343 2 8.229 2 12s0 5.657 1.172 6.828S6.229 20 10 20h4c3.771 0 5.657 0 6.828-1.172S22 15.771 22 12s0-5.657-1.172-6.828S17.771 4 14 4h-4C6.229 4 4.343 4 3.172 5.172M18.576 7.52a.75.75 0 0 1-.096 1.056l-2.196 1.83c-.887.74-1.605 1.338-2.24 1.746c-.66.425-1.303.693-2.044.693s-1.384-.269-2.045-.693c-.634-.408-1.352-1.007-2.239-1.745L5.52 8.577a.75.75 0 0 1 .96-1.153l2.16 1.799c.933.777 1.58 1.315 2.128 1.667c.529.34.888.455 1.233.455s.704-.114 1.233-.455c.547-.352 1.195-.89 2.128-1.667l2.159-1.8a.75.75 0 0 1 1.056.097" clipRule="evenodd" /></svg>
                  Publier
                </div>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;