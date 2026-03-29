import { Suspense } from 'react';
import { VerifyPinForm } from "../../src/auth";

export default function VerifyPinPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white">Chargement...</div></div>}>
            <VerifyPinForm />
        </Suspense>
    );
}
