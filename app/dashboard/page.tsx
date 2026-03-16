import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Dashboard from '@/src/dashboard/Dashboard';

export const metadata: Metadata = {
  title: 'Dashboard',
};

const DashboardPage = () => {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Chargement...</div>}>
      <Dashboard />
    </Suspense>
  );
};

export default DashboardPage;
