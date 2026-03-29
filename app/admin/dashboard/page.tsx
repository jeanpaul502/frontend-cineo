import AdminDashboard from '@/src/admin/AdminDashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Dashboard Admin | Netfix',
    description: 'Panneau de gestion administrateur',
    robots: {
        index: false,
        follow: false,
    },
};

export default function AdminDashboardPage() {
    return <AdminDashboard />;
}
