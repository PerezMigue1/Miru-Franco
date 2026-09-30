'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

/** Cambio de tema para barras oscuras (cabecera del sitio y de los paneles): área táctil de 44px. */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="inline-block h-11 w-11 shrink-0" aria-hidden="true" />;

  const claro = theme === 'light';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="mf-panel-icono-btn shrink-0"
      aria-label={claro ? 'Activar modo oscuro' : 'Activar modo claro'}
      title={claro ? 'Modo oscuro' : 'Modo claro'}
    >
      {claro ? <Moon size={20} aria-hidden /> : <Sun size={20} aria-hidden />}
    </button>
  );
}
