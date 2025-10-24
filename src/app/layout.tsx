import '@/styles/globals.css';
import type { Metadata } from 'next';
import { Sidebar } from '@/components/Sidebar';
import { MobileNav } from '@/components/MobileNav';

export const metadata: Metadata = {
  title: 'Controle Financeiro',
  description: 'Controle financeiro mensal simples e moderno',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body>
        <MobileNav />
        <div className="min-h-screen md:flex">
          <Sidebar />
          <main className="flex-1 p-4 md:p-8">
            <div className="max-w-6xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}


