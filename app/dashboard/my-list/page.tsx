import type { Metadata } from 'next';
import { MyList } from "../../../src/dashboard/MyList";

export const metadata: Metadata = {
    title: 'Ma Liste',
};

export default function MyListPage() {
    return <MyList />;
}