'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ModuleLayout from '../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import { listarMisSeguimientos, type MiSeguimiento } from '../../../../services/seguimientos';
import { mensajeDeError } from '../../../../utils/errorRed';
import { fechaHoraMexico } from '../../../../components/privacidad/textosPrivacidad';

/** Seguimientos posteriores al servicio de la clienta (de la base; antes eran datos inventados). */
export default function SeguimientosClientePage() {
  const router = useRouter();
  const [seguimientos, setSeguimientos] = useState<MiSeguimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    listarMisSeguimientos()
      .then((lista) => {
        if (!vigente) return;
        setSeguimientos(lista);
        setError(null);
      })
      .catch((e) => vigente && setError(mensajeDeError(e, 'No pudimos cargar tus seguimientos.')))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [intento]);

  return (
    <ModuleLayout>
      <div className="max-w-4xl mx-auto py-4">
        <PageHeader title="Seguimientos posteriores al servicio" subtitle="Aquí ves el seguimiento que hicimos después de tus servicios." />

        <Card>
          {cargando ? (
            <div className="space-y-2" aria-busy="true" aria-label="Cargando tus seguimientos">
              <div className="mf-skeleton h-14 rounded-[10px]" />
              <div className="mf-skeleton h-14 rounded-[10px]" />
            </div>
          ) : error ? (
            <div>
              <p role="alert" className="text-sm" style={{ color: 'var(--danger-texto)' }}>
                {error}
              </p>
              <Button className="mt-3" variant="outline" onClick={() => { setCargando(true); setIntento((n) => n + 1); }}>
                Reintentar
              </Button>
            </div>
          ) : seguimientos.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              Aún no hay seguimientos de tus servicios.
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: 'var(--mf-linea)' }}>
              {seguimientos.map((s) => (
                <li key={s.id} className="py-3">
                  <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                    {s.servicio ?? 'Servicio'}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums" style={{ color: 'var(--encabezados-alterno)' }}>
                    {fechaHoraMexico(s.fechaContacto)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="mt-6">
          <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            ¿Necesitas ayuda?
          </h2>
          <p className="mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
            Si tienes alguna duda sobre tu servicio, escríbenos y te responderemos en tu cuenta.
          </p>
          <Button onClick={() => router.push('/cliente/garantias')}>Contactar soporte</Button>
        </Card>
      </div>
    </ModuleLayout>
  );
}
