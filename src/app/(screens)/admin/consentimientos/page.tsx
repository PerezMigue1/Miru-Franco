'use client';

import { useCallback, useEffect, useReducer, useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, FileDown, Search, ScrollText, X } from 'lucide-react';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Table, { TableCell, TableRow } from '../../../components/ui/Table';
import {
  buscarConsentimientosAdmin,
  descargarConsentimientosCsv,
  todosLosConsentimientosAdmin,
  type ConsentimientoAdmin,
} from '../../../services/consentimientosAdmin';
import { showToast } from '../../../utils/toast';
import { mensajeDeError } from '../../../utils/errorRed';
import {
  documentoYVersion,
  etiquetaAccion,
  etiquetaConsentimiento,
  fechaHoraMexico,
} from '../../../components/privacidad/textosPrivacidad';
import { guardarArchivo } from '../../../components/privacidad/descargas';
import { avisoSinCsv, CONSULTA_INICIAL, csvDisponible, etiquetaCsv, personaDeResultados, reducirConsulta } from './busqueda';

/** Nombre de quien emite la constancia (la sesión guardada); vacío si no se puede leer. */
function nombreDeLaSesion(): string | undefined {
  try {
    const user = JSON.parse(localStorage.getItem('user') ?? 'null') as { nombre?: unknown } | null;
    return typeof user?.nombre === 'string' && user.nombre.trim() ? user.nombre.trim() : undefined;
  } catch {
    return undefined;
  }
}

export default function ConsentimientosAdminPage() {
  const [texto, setTexto] = useState('');
  const [consulta, despachar] = useReducer(reducirConsulta, CONSULTA_INICIAL);
  const { q, pagina } = consulta;
  const [filas, setFilas] = useState<ConsentimientoAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState<'csv' | 'pdf' | null>(null);

  useEffect(() => {
    let vigente = true;
    buscarConsentimientosAdmin({ q: consulta.q, page: consulta.pagina })
      .then((res) => {
        if (!vigente) return;
        setFilas(res.filas);
        setTotal(res.total);
        setTotalPaginas(res.totalPages);
        setError(null);
      })
      .catch((e) => {
        if (vigente) setError(mensajeDeError(e, 'No se pudo consultar el registro. Intenta de nuevo.'));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [consulta]);

  const buscar = (valor: string) => {
    setTexto(valor);
    despachar({ tipo: 'buscar', texto: valor });
    setCargando(true);
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    buscar(texto);
  };

  const recargar = useCallback(() => {
    setCargando(true);
    despachar({ tipo: 'recargar' });
  }, []);

  const irAPagina = (destino: number) => {
    setCargando(true);
    despachar({ tipo: 'pagina', pagina: destino });
  };

  const persona = personaDeResultados(filas, { q, totalPages: totalPaginas });
  const csvHabilitado = csvDisponible(persona, q);
  const aviso = csvHabilitado ? null : avisoSinCsv(filas);

  const exportarCsv = async () => {
    setExportando('csv');
    try {
      const { blob, nombre } = await descargarConsentimientosCsv(persona?.id);
      guardarArchivo(blob, nombre);
      showToast('CSV descargado.', 'success');
    } catch (e) {
      showToast(mensajeDeError(e, 'No se pudo descargar el CSV.'), 'error');
    } finally {
      setExportando(null);
    }
  };

  const exportarPdf = async () => {
    setExportando('pdf');
    try {
      const [{ crearPdfConsentimientos, nombrePdfConsentimientos }, todas] = await Promise.all([
        import('../../../components/privacidad/pdfConsentimientos'),
        todosLosConsentimientosAdmin(q),
      ]);
      const ahora = new Date();
      crearPdfConsentimientos({ filas: todas, persona, busqueda: q, emitidoPor: nombreDeLaSesion(), ahora }).save(
        nombrePdfConsentimientos(persona?.id ?? null, ahora),
      );
      showToast('Constancia en PDF descargada.', 'success');
    } catch (e) {
      showToast(mensajeDeError(e, 'No se pudo generar el PDF.'), 'error');
    } finally {
      setExportando(null);
    }
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-6">
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Consentimientos
          </h1>
          <p className="mt-1 max-w-[65ch] text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            Cada casilla aceptada o revocada, con el documento y la versión que la persona tenía a la vista. Las filas no
            se editan ni se borran: revocar agrega una fila nueva.
          </p>
        </div>

        <Card padding="md">
          <form role="search" onSubmit={enviar} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Input
                label="Buscar persona"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Nombre, correo o id"
                maxLength={100}
                helperText="El id debe ser exacto; el nombre y el correo pueden ser parciales."
                icon={<Search size={16} aria-hidden />}
                fullWidth
              />
            </div>
            <div className="flex gap-2 sm:mb-7">
              <Button type="submit" disabled={cargando}>
                Buscar
              </Button>
              {q && (
                <Button variant="outline" onClick={() => buscar('')}>
                  <span className="inline-flex items-center gap-1">
                    <X size={16} aria-hidden />
                    Limpiar
                  </span>
                </Button>
              )}
            </div>
          </form>
        </Card>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }} aria-live="polite">
            {cargando
              ? 'Consultando…'
              : persona
                ? `${total} registro${total === 1 ? '' : 's'} de ${persona.nombre} (${persona.email})`
                : `${total} registro${total === 1 ? '' : 's'}${q ? ` para "${q}"` : ' de todas las personas'}`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportarCsv} disabled={!csvHabilitado || exportando !== null || cargando}>
              <span className="inline-flex items-center gap-2">
                <FileDown size={16} aria-hidden />
                {exportando === 'csv' ? 'Descargando…' : etiquetaCsv(persona, q)}
              </span>
            </Button>
            <Button variant="outline" onClick={exportarPdf} disabled={exportando !== null || cargando || total === 0}>
              <span className="inline-flex items-center gap-2">
                <ScrollText size={16} aria-hidden />
                {exportando === 'pdf' ? 'Generando…' : 'Constancia en PDF'}
              </span>
            </Button>
          </div>
        </div>
        {aviso && total > 0 && !cargando && (
          <p className="-mt-3 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            {aviso}
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-[10px] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            style={{ backgroundColor: 'color-mix(in srgb, var(--danger) 10%, var(--fondo-general))', color: 'var(--danger-texto)' }}
          >
            <span className="font-semibold">{error}</span>
            <Button variant="outline" onClick={recargar}>
              Reintentar
            </Button>
          </div>
        )}

        <Card padding="sm" className="!p-0 overflow-hidden">
          {cargando && filas.length === 0 ? (
            <div className="space-y-3 p-5" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="mf-skeleton h-10 w-full" />
              ))}
            </div>
          ) : filas.length === 0 && !error ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <ScrollText size={36} aria-hidden style={{ color: 'var(--logo-branding)' }} />
              <p className="mt-3 font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                {q ? 'Sin consentimientos para esta búsqueda' : 'Todavía no hay consentimientos registrados'}
              </p>
              <p className="mt-1 max-w-sm text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                {q ? 'Revisa el nombre, el correo o el id y vuelve a buscar.' : 'Aparecerán aquí al registrarse o aceptar un documento.'}
              </p>
            </div>
          ) : (
            <>
              <Table
                headers={['Fecha y hora', 'Persona', 'Consentimiento', 'Documento y versión', 'Acción', 'Formulario', 'Ruta', 'IP', 'Navegador']}
                headersLegibles
              >
                {filas.map((f) => {
                  const filtro = f.usuario?.id ?? f.visitanteId;
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="tabular-nums">{fechaHoraMexico(f.creadoEn)}</TableCell>
                      <TableCell>
                        {filtro ? (
                          <button
                            type="button"
                            onClick={() => buscar(filtro)}
                            className="min-h-11 text-left underline-offset-4 hover:underline"
                            style={{ color: 'var(--menu-texto-principal)' }}
                            title="Ver solo a esta persona"
                          >
                            <span className="block font-medium">{f.usuario?.nombre ?? 'Visitante sin cuenta'}</span>
                            <span className="block text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                              {f.usuario?.email ?? f.visitanteId}
                            </span>
                          </button>
                        ) : (
                          'Sin persona'
                        )}
                      </TableCell>
                      <TableCell>{etiquetaConsentimiento(f.tipo)}</TableCell>
                      <TableCell>{documentoYVersion(f)}</TableCell>
                      <TableCell>
                        <Badge variant={f.accion === 'revocado' ? 'warning' : 'success'} size="sm">
                          {etiquetaAccion(f.accion)}
                        </Badge>
                      </TableCell>
                      <TableCell>{f.formulario}</TableCell>
                      <TableCell>{f.rutaOrigen ?? 'Sin dato'}</TableCell>
                      <TableCell className="tabular-nums">{f.ip ?? 'Sin dato'}</TableCell>
                      <TableCell className="max-w-[16rem] truncate">
                        <span title={f.userAgent ?? undefined}>{f.userAgent ?? 'Sin dato'}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </Table>
            </>
          )}
        </Card>

        {totalPaginas > 1 && (
          <nav aria-label="Páginas de consentimientos" className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" disabled={pagina <= 1 || cargando} onClick={() => irAPagina(pagina - 1)}>
              <span className="inline-flex items-center gap-1">
                <ChevronLeft size={16} aria-hidden />
                Anterior
              </span>
            </Button>
            <p className="text-sm tabular-nums" style={{ color: 'var(--encabezados-alterno)' }}>
              Página {pagina} de {totalPaginas}
            </p>
            <Button variant="outline" disabled={pagina >= totalPaginas || cargando} onClick={() => irAPagina(pagina + 1)}>
              <span className="inline-flex items-center gap-1">
                Siguiente
                <ChevronRight size={16} aria-hidden />
              </span>
            </Button>
          </nav>
        )}
      </div>
    </AdminLayout>
  );
}
