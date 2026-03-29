import type { Metadata } from 'next';
import { TVChannels } from "../../../src/dashboard/TVChannels";

export const metadata: Metadata = {
    title: 'TV Direct',
};

export default function ChannelsPage() {
    return <TVChannels />;
}