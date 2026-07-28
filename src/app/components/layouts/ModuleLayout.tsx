'use client';

import { ReactNode } from 'react';
import Header from '../../layouts/Header';
import Footer from '../../layouts/Footer';
import GlobalBreadcrumb from '../GlobalBreadcrumb';

interface ModuleLayoutProps {
  children: ReactNode;
}

export default function ModuleLayout({ children }: ModuleLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--fondo-general)' }}>
      <Header />
      <main className="flex-1 layout-page pt-1.5 pb-6 md:pt-2 md:pb-8" style={{ marginTop: 'var(--mf-header-offset, 136px)' }}>
        <GlobalBreadcrumb />
        <div className="pt-1">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

