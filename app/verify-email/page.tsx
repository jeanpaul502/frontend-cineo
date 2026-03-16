import { Suspense } from 'react';
import { EmailVerificationPage } from '@/src/auth';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white">Chargement...</div></div>}>
      <EmailVerificationPage />
    </Suspense>
  );
}