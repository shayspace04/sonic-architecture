import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/LandingPage';

export const metadata: Metadata = {
  title: 'Sonic Architecture — Your taste has a world of its own',
  description: 'Turn cultural taste into explorable architectural worlds grounded in Qloo taste intelligence.',
};

export default function HomePage() {
  return <LandingPage />;
}
