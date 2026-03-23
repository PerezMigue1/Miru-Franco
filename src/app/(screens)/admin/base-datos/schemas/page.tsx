'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Select from '../../../../components/ui/Select';
import { listarTablasDirectas, obtenerSchemaDirecto, type ColumnaSchemaDirecta } from '../../../../services/database';

export default function BaseDatosSchemasPage() {
  const [tablas, setTablas] = useState<string[]>([]);
  const [loadingTablas, setLoadingTablas] = useState(false);
  const [tablaSeleccionada, setTablaSeleccionada] = useState('');
  const [columnas, setColumnas] = useState<ColumnaSchemaDirecta[]>([]);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarTablas = async () => {
    setLoadingTablas(true);
    setError(null);
    const res = await listarTablasDirectas();
    if (res.success) {
      setTablas(res.tablas);
      if (res.tablas.length && !tablaSeleccionada) {
        setTablaSeleccionada(res.tablas[0]);
      }
    } else {
      setTablas([]);
      setTablaSeleccionada('');
      setError(res.error);
    }
    setLoadingTablas(false);
  };

  const cargarSchema = async (tabla: string) => {
    if (!tabla) {
      setColumnas([]);
      return;
    }
    setLoadingSchema(true);
    setError(null);
    const res = await obtenerSchemaDirecto(tabla);
    if (res.success) {
      setColumnas(res.columnas);
    } else {
      setColumnas([]);
      setError(res.error);
    }
    setLoadingSchema(false);
  };

  useEffect(() => {
    // Carga inicial de tablas al entrar.
    void cargarTablas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tablaSeleccionada) {
      void cargarSchema(tablaSeleccionada);
    } else {
      setColumnas([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablaSeleccionada]);

  return (
    <AdminLayout>
      <div className="px-4 md:px-8 lg:px-12">
        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wider opacity-80 mb-1">
            Módulo de base de datos · Schemas
          </p>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Estructura de tablas</h1>
          <p className="text-base opacity-80">
            Consulta la estructura real de las tablas en PostgreSQL usando la conexión directa (`DATABASE_URL`), sin
            depender de endpoints del backend.
          </p>
        </header>

        <Card variant="elevated" padding="lg">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Button type="button" variant="outline" onClick={cargarTablas} disabled={loadingTablas}>
              {loadingTablas ? 'Cargando tablas…' : 'Cargar tablas de la BD'}
            </Button>
            <div className="flex-1 min-w-[220px]">
              <label className="block mb-1 text-xs font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                Tabla
              </label>
              <Select
                options={
                  tablas.length === 0
                    ? [{ value: '', label: '— Carga las tablas primero —' }]
                    : tablas.map((t) => ({ value: t, label: t }))
                }
                value={tablas.length === 0 ? '' : tablaSeleccionada}
                onChange={(e) => setTablaSeleccionada(e.target.value)}
                disabled={tablas.length === 0}
              />
            </div>
          </div>

          {tablaSeleccionada && (
            <p className="text-sm mb-3" style={{ color: 'var(--encabezados-alterno)' }}>
              Mostrando columnas de la tabla <code className="text-xs bg-black/10 px-1 rounded">{tablaSeleccionada}</code>
              {' '}del schema <code className="text-xs bg-black/10 px-1 rounded">public</code>.
            </p>
          )}

          {loadingSchema ? (
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              Cargando estructura de la tabla…
            </p>
          ) : columnas.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              {tablaSeleccionada ? 'La tabla no tiene columnas visibles.' : 'Selecciona una tabla para ver su esquema.'}
            </p>
          ) : (
            <div
              className="mt-4 rounded-lg border overflow-x-auto"
              style={{ borderColor: 'var(--encabezados-alterno)' }}
            >
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: 'var(--encabezados-alterno)' }}>
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold" style={{ color: 'var(--texto-fondo-oscuro)' }}>
                      Columna
                    </th>
                    <th className="px-4 py-2 text-left font-semibold" style={{ color: 'var(--texto-fondo-oscuro)' }}>
                      Tipo
                    </th>
                    <th className="px-4 py-2 text-left font-semibold" style={{ color: 'var(--texto-fondo-oscuro)' }}>
                      Nullable
                    </th>
                    <th className="px-4 py-2 text-left font-semibold" style={{ color: 'var(--texto-fondo-oscuro)' }}>
                      Long./Precisión
                    </th>
                    <th className="px-4 py-2 text-left font-semibold" style={{ color: 'var(--texto-fondo-oscuro)' }}>
                      Default
                    </th>
                    <th className="px-4 py-2 text-left font-semibold" style={{ color: 'var(--texto-fondo-oscuro)' }}>
                      Identity
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--encabezados-alterno)' }}>
                  {columnas.map((c) => (
                    <tr key={c.nombre} style={{ backgroundColor: 'var(--fondo-general)' }}>
                      <td className="px-4 py-2 font-mono text-xs" style={{ color: 'var(--menu-texto-principal)' }}>
                        {c.nombre}
                      </td>
                      <td className="px-4 py-2" style={{ color: 'var(--menu-texto-principal)' }}>
                        {c.tipo}
                      </td>
                      <td className="px-4 py-2" style={{ color: 'var(--menu-texto-principal)' }}>
                        {c.nullable ? 'Sí' : 'No'}
                      </td>
                      <td className="px-4 py-2" style={{ color: 'var(--menu-texto-principal)' }}>
                        {c.maxLength != null
                          ? `(${c.maxLength})`
                          : c.numericPrecision != null
                            ? `${c.numericPrecision}${c.numericScale != null ? `, ${c.numericScale}` : ''}`
                            : '—'}
                      </td>
                      <td className="px-4 py-2 text-xs" style={{ color: 'var(--menu-texto-principal)' }}>
                        {c.porDefecto ?? '—'}
                      </td>
                      <td className="px-4 py-2" style={{ color: 'var(--menu-texto-principal)' }}>
                        {c.identity ? 'Sí' : 'No'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm" style={{ color: 'var(--danger)' }}>
              {error}
            </p>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}

