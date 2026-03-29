import type { Metadata } from 'next';
import { Movies } from "../../../src/dashboard/Movies";
import { Suspense } from "react";

export const metadata: Metadata = {
    title: 'Films',
};

export default function MoviesPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black" />}>
            <Movies />
        </Suspense>
    );
}