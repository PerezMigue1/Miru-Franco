'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import Input from '../ui/Input';
import { listarClientes, type ClienteApi } from '../../services/clientes';

interface BuscadorClientaProps {
  /** Clienta elegida (null si aún no se elige). */
  seleccion: { id: string; nombre: string } | null;
  onSeleccionar: (clienta: { id: string; nombre: string } | null) => void;
  label?: string;
}

/** Búsqueda de clienta registrada por nombre o teléfono (con espera de 300 ms entre teclas). */
export default function BuscadorClienta({ seleccion, onSeleccionar, label = 'Clienta registrada' }: BuscadorClientaProps) {
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState<ClienteApi[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (temporizador.current) clearTimeout(temporizador.current); }, []);

  const buscar = (valor: string) => {
    setTermino(valor);
    setAbierto(true);
    if (temporizador.current) clearTimeout(temporizador.current);
    const q = valor.trim();
    if (q.length < 2) {
      setResultados([]);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    temporizador.current = setTimeout(() => {
      listarClientes({ q, limit: 8 })
        .then(({ data }) => setResultados(data))
        .catch(() => setResultados([]))
        .finally(() => setBuscando(false));
    }, 300);
  };

  if (seleccion) {
    return (
      <div>
        <span className="block text-sm font-medium mb-1 text-menu-texto-principal">{label}</span>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--borde-visible)] bg-fondos-suaves px-3 py-2">
          <span className="text-sm font-semibold text-menu-texto-principal truncate">{seleccion.nombre}</span>
          <button
            type="button"
            onClick={() => { onSeleccionar(null); setTermino(''); setResultados([]); }}
            aria-label="Quitar clienta"
            className="shrink-0 rounded p-1 text-[var(--danger-texto)] hover:bg-fondos-suaves"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        label={label}
        value={termino}
        onChange={(e) => buscar(e.target.value)}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder="Nombre o teléfono…"
        autoComplete="off"
        fullWidth
      />
      {abierto && termino.trim().length >= 2 && (
        <div
          role="listbox"
          aria-label="Clientas encontradas"
          className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-[var(--borde-visible)] bg-tarjetas-paneles shadow-lg"
        >
          {buscando ? (
            <p className="px-3 py-2 text-sm text-encabezados-alterno">Buscando…</p>
          ) : resultados.length === 0 ? (
            <p className="flex items-center gap-2 px-3 py-2 text-sm text-encabezados-alterno">
              <Search size={14} aria-hidden /> Sin coincidencias. Regístrala como persona sin cuenta.
            </p>
          ) : (
            resultados.map((c) => (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onSeleccionar({ id: c.id, nombre: c.nombre || c.email || c.telefono || 'Clienta' }); setAbierto(false); }}
                className="block w-full px-3 py-2 text-left text-sm text-menu-texto-principal hover:bg-fondos-suaves"
              >
                <span className="font-semibold">{c.nombre || c.email || 'Clienta'}</span>
                {c.telefono && <span className="text-encabezados-alterno"> · {c.telefono}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
