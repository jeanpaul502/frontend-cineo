import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Dashboard from '@/src/dashboard/Dashboard';
import { LoadingScreen } from '../../src/dashboard/Components/LoadingScreen';

export const metadata: Metadata = {
  title: 'Dashboard',
};

const DashboardPage = () => {
  return (
    <Suspense fallback={<LoadingScreen message="Initialisation du dashboard..." />}>
      <Dashboard />
    </Suspense>
  );
};

export default DashboardPage;
