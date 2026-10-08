import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'VeloVisa AI | Visa Intelligence Engine', description: 'Bilingual visa research, evidence preparation and human-reviewed Cloud browser automation', manifest: '/manifest.webmanifest', appleWebApp: { capable: true, statusBarStyle: 'default', title: 'VeloVisa AI' } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#ffffff' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body className="antialiased">{children}</body></html>; }
