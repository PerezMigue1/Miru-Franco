'use client';

import { ReactNode } from 'react';
import Header from '../../layouts/Header';
import Footer from '../../layouts/Footer';
import { colors } from '../../utils/colors';

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: colors.fondoGeneral }}>
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

