import { Suspense } from 'react';
import { LoginForm } from "../../src/auth";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white">Chargement...</div></div>}>
      <LoginForm />
    </Suspense>
  );
}