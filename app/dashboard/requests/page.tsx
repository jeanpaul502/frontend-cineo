import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Requests } from '@/src/dashboard/Requests';

export const metadata: Metadata = {
  title: 'Faire une demande - Cineo',
  description: 'Demandez l\'ajout de films et séries',
};

export default function RequestsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Chargement...</div>}>
      <Requests />
    </Suspense>
  );
}
