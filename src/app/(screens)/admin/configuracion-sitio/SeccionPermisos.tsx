'use client';

import { useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Modal from '../../../components/ui/Modal';
import { guardarPermisosDeRol, type PermisosPorRol } from '../../../services/configuracionSitio';
import { mensajeDeError } from '../../../utils/errorRed';
import { showToast } from '../../../utils/toast';
import { alternarClave, cambiosDePermisos, type PermisoCatalogo } from './cambiosConfiguracion';
import HistorialSeccion from './HistorialSeccion';
import Pestanas, { idPanel, idPestana } from './Pestanas';
import { CambiosPermisos, COLOR_SUAVE, COLOR_TEXTO, ErroresGenerales } from './piezas';
import { mensajesDelServidor } from './validacionConfiguracion';

export const NOMBRE_ROL: Record<string, string> = {
  admin: 'Administrador',
  estilista: 'Estilista',
  empleado: 'Empleado',
  becario: 'Becario',
};
const nombreRol = (rol: string) => NOMBRE_ROL[rol] ?? rol;

/** Grupos del catálogo en el orden en que llegan. */
function agrupar(catalogo: PermisoCatalogo[]): { grupo: string; permisos: PermisoCatalogo[] }[] {
  const grupos: { grupo: string; permisos: PermisoCatalogo[] }[] = [];
  for (const p of catalogo) {
    const g = grupos.find((x) => x.grupo === p.grupo);
    if (g) g.permisos.push(p);
    else grupos.push({ grupo: p.grupo, permisos: [p] });
  }
  return grupos;
}

interface Props {
  datos: PermisosPorRol;
  onGuardado: (rol: string, claves: string[]) => void;
}

const GRUPO_PESTANAS = 'permisos-rol';

/**
 * Permisos por rol: una pestaña por rol. El admin se muestra bloqueado ("*"). En cada rol editable, casillas
 * por clave del catálogo agrupadas; solo se mandan claves del catálogo (el backend conserva las demás).
 */
export default function SeccionPermisos({ datos, onGuardado }: Props) {
  const catalogo = datos.catalogo;
  const enCatalogo = useMemo(() => new Set(catalogo.map((c) => c.clave)), [catalogo]);
  const grupos = useMemo(() => agrupar(catalogo), [catalogo]);
  const primeraEditable = datos.roles.find((r) => r.editable)?.rol ?? datos.roles[0]?.rol ?? '';
  const [activa, setActiva] = useState(primeraEditable);
  const guardadas = (rol: string) => (datos.roles.find((r) => r.rol === rol)?.claves ?? []).filter((c) => enCatalogo.has(c));
  const [borradores, setBorradores] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(datos.roles.filter((r) => r.editable).map((r) => [r.rol, r.claves.filter((c) => enCatalogo.has(c))])),
  );
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [versiones, setVersiones] = useState<Record<string, number>>({});

  const cambiosDe = (rol: string) => cambiosDePermisos(guardadas(rol), borradores[rol] ?? [], catalogo);

  const guardar = async () => {
    const rol = confirmando;
    if (!rol) return;
    setGuardando(true);
    try {
      const claves = borradores[rol] ?? [];
      const r = (await guardarPermisosDeRol(rol, claves)) as { claves?: unknown } | null;
      const nuevas = Array.isArray(r?.claves) ? (r.claves as string[]) : claves;
      onGuardado(rol, nuevas);
      setBorradores((b) => ({ ...b, [rol]: nuevas.filter((c) => enCatalogo.has(c)) }));
      setVersiones((v) => ({ ...v, [rol]: (v[rol] ?? 0) + 1 }));
      setErrores((e) => ({ ...e, [rol]: [] }));
      showToast(`Permisos de ${nombreRol(rol).toLowerCase()} guardados. El servidor los aplica de inmediato; el menú de esa persona se actualiza cuando vuelva a cargar el panel.`, 'success');
    } catch (e) {
      setErrores((x) => ({ ...x, [rol]: mensajesDelServidor(e) ?? [mensajeDeError(e, 'No se pudieron guardar los permisos. Intenta de nuevo.')] }));
    } finally {
      setGuardando(false);
      setConfirmando(null);
    }
  };

  const cambiosConfirmar = confirmando ? cambiosDe(confirmando) : { agregadas: [], quitadas: [] };

  return (
    <div className="space-y-4">
      <p className="max-w-[65ch] text-sm" style={{ color: COLOR_SUAVE }}>
        Qué puede hacer cada rol del personal en los paneles. Los cambios se guardan por rol.
      </p>
      <Pestanas
        id={GRUPO_PESTANAS}
        etiqueta="Roles"
        pestanas={datos.roles.map((r) => ({ id: r.rol, etiqueta: nombreRol(r.rol) }))}
        activa={activa}
        onCambiar={setActiva}
      />
      {datos.roles.map((r) => {
        const borrador = borradores[r.rol] ?? [];
        const cambios = r.editable ? cambiosDe(r.rol) : { agregadas: [], quitadas: [] };
        const hayCambios = cambios.agregadas.length + cambios.quitadas.length > 0;
        return (
          <div key={r.rol} role="tabpanel" id={idPanel(GRUPO_PESTANAS, r.rol)} aria-labelledby={idPestana(GRUPO_PESTANAS, r.rol)} hidden={r.rol !== activa} tabIndex={0}>
            <Card padding="lg">
              {!r.editable ? (
                <div className="flex items-start gap-3">
                  <Lock size={20} aria-hidden className="mt-0.5 shrink-0" style={{ color: 'var(--logo-branding)' }} />
                  <div>
                    <p className="font-semibold" style={{ color: COLOR_TEXTO }}>
                      Todos los permisos (*)
                    </p>
                    <p className="mt-1 max-w-[65ch] text-sm" style={{ color: COLOR_SUAVE }}>
                      {`El ${nombreRol(r.rol).toLowerCase()} siempre tiene todos los permisos, incluido cambiar esta configuración. No se edita.`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <ErroresGenerales mensajes={errores[r.rol] ?? []} />
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {grupos.map((g) => (
                      <fieldset key={g.grupo} className="min-w-0">
                        <legend className="mb-1 text-base font-semibold" style={{ color: COLOR_TEXTO }}>
                          {g.grupo}
                        </legend>
                        <ul>
                          {g.permisos.map((p) => {
                            const idCasilla = `permiso-${r.rol}-${p.clave}`;
                            return (
                              <li key={p.clave}>
                                <label htmlFor={idCasilla} className="flex min-h-11 cursor-pointer items-start gap-3 py-1.5 text-sm" style={{ color: COLOR_TEXTO }}>
                                  <input
                                    id={idCasilla}
                                    type="checkbox"
                                    checked={borrador.includes(p.clave)}
                                    onChange={(e) => setBorradores((b) => ({ ...b, [r.rol]: alternarClave(b[r.rol] ?? [], p.clave, e.target.checked) }))}
                                    className="mt-0.5 h-5 w-5 shrink-0"
                                  />
                                  <span className="min-w-0">
                                    <span className="block">{p.descripcion}</span>
                                    <span className="block break-all text-xs" style={{ color: COLOR_SUAVE, fontFamily: 'var(--font-family-mono)' }}>
                                      {p.clave}
                                    </span>
                                  </span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </fieldset>
                    ))}
                  </div>
                  <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-end" style={{ borderColor: 'var(--mf-linea-fuerte)' }}>
                    <p className="text-sm sm:mr-auto" style={{ color: COLOR_SUAVE }} aria-live="polite">
                      {hayCambios ? `${cambios.agregadas.length} por agregar y ${cambios.quitadas.length} por quitar.` : 'Sin cambios por guardar.'}
                    </p>
                    <Button variant="outline" onClick={() => setBorradores((b) => ({ ...b, [r.rol]: guardadas(r.rol) }))} disabled={!hayCambios || guardando}>
                      Descartar cambios
                    </Button>
                    <Button onClick={() => setConfirmando(r.rol)} disabled={!hayCambios || guardando}>
                      Guardar
                    </Button>
                  </div>
                </div>
              )}
              <HistorialSeccion clave={`permisos:${r.rol}`} version={versiones[r.rol] ?? 0} catalogo={catalogo} />
            </Card>
          </div>
        );
      })}

      <Modal
        isOpen={confirmando !== null}
        onClose={() => !guardando && setConfirmando(null)}
        title={confirmando ? `Guardar permisos de ${nombreRol(confirmando).toLowerCase()}` : undefined}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmando(null)} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </>
        }
      >
        <div className="space-y-4" style={{ color: 'var(--texto-cuerpo)' }}>
          <p className="text-sm">Revisa los permisos que cambian. El servidor los aplica de inmediato; el menú de esa persona se actualiza cuando vuelva a cargar el panel.</p>
          <CambiosPermisos {...cambiosConfirmar} />
        </div>
      </Modal>
    </div>
  );
}
