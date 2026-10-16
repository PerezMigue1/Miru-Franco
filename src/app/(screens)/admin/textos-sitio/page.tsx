'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../../components/layouts/AdminLayout';
import { obtenerTextosSitio, type CatalogoTextos } from '../../../services/textosSitio';
import { useConfiguracionPublica } from '../../../hooks/useConfiguracionPublica';
import { mensajeDeError } from '../../../utils/errorRed';
import { COLOR_SUAVE, PantallaError } from '../configuracion-sitio/piezas';
import { ListaTextos, TextosCargando, TextosSinPermiso } from './ListaTextos';

type Estado = 'cargando' | 'listo' | 'error' | 'sin-permiso';

/**
 * Admin > Textos del sitio (solo admin): buscador, filtro por página, editor con vista previa y variables, restaurar el
 * texto original e historial de cada texto.
 */
export default function TextosSitioPage() {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const [catalogo, setCatalogo] = useState<CatalogoTextos | null>(null);
  const { salon } = useConfiguracionPublica();

  useEffect(() => {
    let vigente = true;
    obtenerTextosSitio()
      .then((c) => {
        if (!vigente) return;
        setCatalogo(c);
        setEstado('listo');
      })
      .catch((e) => {
        if (!vigente) return;
        if ((e as { status?: number } | null)?.status === 403) {
          setEstado('sin-permiso');
          return;
        }
        setError(mensajeDeError(e, 'No se pudieron cargar los textos del sitio. Intenta de nuevo.'));
        setEstado('error');
      });
    return () => {
      vigente = false;
    };
  }, [intento]);

  const reintentar = useCallback(() => {
    setEstado('cargando');
    setIntento((n) => n + 1);
  }, []);

  const guardado = (clave: string, valor: string) =>
    setCatalogo((c) =>
      c ? { ...c, data: c.data.map((t) => (t.clave === clave ? { ...t, valor, personalizado: valor !== t.porDefecto, actualizadoEn: new Date().toISOString(), actualizadoPor: null } : t)) } : c,
    );

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-6">
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Textos del sitio
          </h1>
          <p className="mt-1 max-w-[65ch] text-sm" style={{ color: COLOR_SUAVE }}>
            Los textos que ve la clienta al agendar, pagar y comprar, los de los correos y los de los avisos. Las variables
            entre llaves, como {'{plazoAnticipoHoras}'}, se llenan solas con las reglas: si cambias una regla, el texto se
            actualiza. Los documentos legales y las casillas de aceptación no cambian desde aquí.
          </p>
        </div>

        {estado === 'cargando' && <TextosCargando />}
        {estado === 'sin-permiso' && <TextosSinPermiso />}
        {estado === 'error' && <PantallaError mensaje={error} onReintentar={reintentar} />}
        {estado === 'listo' && catalogo && <ListaTextos key={intento} catalogo={catalogo} nombreSalon={salon.nombre} onGuardado={guardado} />}
      </div>
    </AdminLayout>
  );
}
