'use client';

import { ReactNode } from 'react';
import Header from '../../layouts/Header';
import Footer from '../../layouts/Footer';
import { colors } from '../../utils/colors';

interface ModuleLayoutProps {
  children: ReactNode;
}

export default function ModuleLayout({ children }: ModuleLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: colors.fondoGeneral }}>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8" style={{ marginTop: '136px' }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}

