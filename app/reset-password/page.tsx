import { Suspense } from 'react';
import { ResetPasswordForm } from "../../src/auth";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white">Chargement...</div></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}