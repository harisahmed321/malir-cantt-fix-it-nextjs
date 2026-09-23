import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Malir Cantt Fix It',
  description: 'Community-first civic reporting platform for Malir Cantonment.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
