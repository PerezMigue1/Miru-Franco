'use client';

import { useEffect, useState } from 'react';
import ModuleLayout from '../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import {
  CotizacionesCargando,
  CotizacionesError,
  CotizacionesVacio,
  ListaCotizaciones,
} from '../../../../components/cliente/CotizacionesCliente';
import { listarMisCotizaciones, type CotizacionApi } from '../../../../services/cotizaciones';

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'error' }
  | { tipo: 'listo'; cotizaciones: CotizacionApi[] };

function pedirCotizaciones(setEstado: (e: Estado) => void) {
  listarMisCotizaciones()
    .then((cotizaciones) => setEstado({ tipo: 'listo', cotizaciones }))
    .catch(() => setEstado({ tipo: 'error' }));
}

/** Mis cotizaciones (eventos especiales): las del cliente en sesión, de GET /api/cotizaciones/mias. */
export default function CotizacionesPage() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });

  useEffect(() => {
    pedirCotizaciones(setEstado);
  }, []);

  const reintentar = () => {
    setEstado({ tipo: 'cargando' });
    pedirCotizaciones(setEstado);
  };

  return (
    <ModuleLayout>
      <div className="w-full max-w-none py-4">
        <PageHeader
          title="Mis cotizaciones"
          subtitle="Paquetes de maquillaje y peinado para bodas, XV años y otros eventos especiales."
        />

        {estado.tipo === 'cargando' ? (
          <CotizacionesCargando />
        ) : estado.tipo === 'error' ? (
          <CotizacionesError onReintentar={reintentar} />
        ) : estado.cotizaciones.length === 0 ? (
          <CotizacionesVacio />
        ) : (
          <ListaCotizaciones cotizaciones={estado.cotizaciones} />
        )}
      </div>
    </ModuleLayout>
  );
}
