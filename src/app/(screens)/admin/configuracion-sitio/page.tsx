'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import AdminLayout from '../../../components/layouts/AdminLayout';
import {
  obtenerConfiguracionAdminEnPantalla,
  obtenerPermisosPorRolEnPantalla,
  type ConfiguracionAdmin,
  type ContenidoContacto,
  type ContenidoInicio,
  type ContenidoSobreNosotros,
  type DatosSalon,
  type HorarioDia,
  type PermisosPorRol,
  type RedesSalon,
  type SeccionConfiguracion,
} from '../../../services/configuracionSitio';
import { mensajeDeError } from '../../../utils/errorRed';
import { esCampoLegal, valorInicial } from './cambiosConfiguracion';
import EditorSeccion from './EditorSeccion';
import { FormHorario, VistaPreviaHorario } from './FormHorario';
import { FormRedes, FormSalon, VistaPreviaPie } from './FormSalon';
import { FormContacto, FormInicio, FormSobreNosotros, VistaPreviaContacto, VistaPreviaInicio, VistaPreviaSobreNosotros } from './FormTextos';
import Pestanas, { idPanel, idPestana } from './Pestanas';
import { PantallaCargando, PantallaError, PantallaSinPermiso } from './piezas';
import SeccionPermisos from './SeccionPermisos';
import { FormReglas, PlazosTerminos } from './SeccionReglas';

interface Valores {
  salon: DatosSalon;
  redes: RedesSalon;
  horario: { dias: HorarioDia[] };
  contenido_inicio: ContenidoInicio;
  contenido_sobre_nosotros: ContenidoSobreNosotros;
  contenido_contacto: ContenidoContacto;
  reglas: { anticiposDesde: string | null };
}

const CLAVES: SeccionConfiguracion[] = ['salon', 'redes', 'horario', 'contenido_inicio', 'contenido_sobre_nosotros', 'contenido_contacto', 'reglas'];

function inicializar(c: ConfiguracionAdmin): Valores {
  return Object.fromEntries(CLAVES.map((k) => [k, valorInicial(k, c.data?.[k]?.valor)])) as unknown as Valores;
}

const PESTANAS = [
  { id: 'salon', etiqueta: 'Salón y redes' },
  { id: 'horario', etiqueta: 'Horario' },
  { id: 'textos', etiqueta: 'Textos del sitio' },
  { id: 'reglas', etiqueta: 'Citas y anticipos' },
  { id: 'permisos', etiqueta: 'Permisos por rol' },
];
const GRUPO = 'config-sitio';

const ENLACES_TEXTOS = [
  { href: '#textos-inicio', etiqueta: 'Inicio' },
  { href: '#textos-sobre-nosotros', etiqueta: 'Sobre nosotros' },
  { href: '#textos-contacto', etiqueta: 'Contacto' },
];

type Estado = 'cargando' | 'listo' | 'error' | 'sin-permiso';

export default function ConfiguracionSitioPage() {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const [config, setConfig] = useState<ConfiguracionAdmin | null>(null);
  const [valores, setValores] = useState<Valores | null>(null);
  const [permisos, setPermisos] = useState<PermisosPorRol | null>(null);
  const [activa, setActiva] = useState('salon');

  useEffect(() => {
    let vigente = true;
    Promise.all([obtenerConfiguracionAdminEnPantalla(), obtenerPermisosPorRolEnPantalla()])
      .then(([c, p]) => {
        if (!vigente) return;
        setConfig(c);
        setValores(inicializar(c));
        setPermisos(p);
        setEstado('listo');
      })
      .catch((e) => {
        if (!vigente) return;
        if ((e as { status?: number } | null)?.status === 403) {
          setEstado('sin-permiso');
          return;
        }
        setError(mensajeDeError(e, 'No se pudo cargar la configuración del sitio. Intenta de nuevo.'));
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

  const guardado = <K extends keyof Valores>(clave: K) => (valor: Valores[K]) => setValores((v) => (v ? { ...v, [clave]: valor } : v));
  const actualizado = (clave: SeccionConfiguracion) => config?.data?.[clave] ?? null;
  const camposLegales = config?.camposEnDocumentosLegales;

  const panel = (id: string, contenido: ReactNode) => (
    <div key={id} role="tabpanel" id={idPanel(GRUPO, id)} aria-labelledby={idPestana(GRUPO, id)} hidden={activa !== id} className="space-y-6">
      {contenido}
    </div>
  );

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-6">
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Configuración del sitio
          </h1>
          <p className="mt-1 max-w-[65ch] text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            Datos del salón, horario, textos públicos, reglas de anticipos y permisos del personal. Lo que guardes aquí se
            ve en el sitio en menos de un minuto, sin publicar de nuevo. Los documentos legales no cambian desde aquí.
          </p>
        </div>

        {estado === 'cargando' && <PantallaCargando />}
        {estado === 'sin-permiso' && <PantallaSinPermiso />}
        {estado === 'error' && <PantallaError mensaje={error} onReintentar={reintentar} />}

        {estado === 'listo' && valores && permisos && (
          <>
            <Pestanas id={GRUPO} etiqueta="Secciones de la configuración" pestanas={PESTANAS} activa={activa} onCambiar={setActiva} />

            {panel(
              'salon',
              <>
                <EditorSeccion<DatosSalon>
                  key={`salon-${intento}`}
                  clave="salon"
                  titulo="Datos del salón"
                  descripcion="Nombre, domicilio y contacto que muestran el pie de página, Contacto, la compra y los tickets."
                  guardado={valores.salon}
                  actualizado={actualizado('salon')}
                  camposLegales={camposLegales}
                  onGuardado={guardado('salon')}
                  vistaPrevia={(v) => <VistaPreviaPie salon={v} dias={valores.horario.dias} />}
                >
                  {({ valor, cambiar, errores }) => <FormSalon valor={valor} errores={errores} onCambiar={cambiar} camposLegales={camposLegales} />}
                </EditorSeccion>
                <EditorSeccion<RedesSalon>
                  key={`redes-${intento}`}
                  clave="redes"
                  titulo="Redes sociales"
                  descripcion="Los íconos del pie de página. Una red sin enlace no se muestra."
                  guardado={valores.redes}
                  actualizado={actualizado('redes')}
                  camposLegales={camposLegales}
                  onGuardado={guardado('redes')}
                >
                  {({ valor, cambiar, errores }) => <FormRedes valor={valor} errores={errores} onCambiar={cambiar} />}
                </EditorSeccion>
              </>,
            )}

            {panel(
              'horario',
              <EditorSeccion<{ dias: HorarioDia[] }>
                key={`horario-${intento}`}
                clave="horario"
                titulo="Horario"
                descripcion="El horario del sitio y de la agenda de citas en línea."
                guardado={valores.horario}
                actualizado={actualizado('horario')}
                camposLegales={camposLegales}
                onGuardado={guardado('horario')}
                vistaPrevia={(v, errores) => <VistaPreviaHorario dias={v.dias} errores={errores} />}
              >
                {({ valor, cambiar, errores }) => (
                  <FormHorario dias={valor.dias} errores={errores} onCambiar={(dias) => cambiar({ dias })} legal={esCampoLegal(camposLegales, 'horario', 'dias')} />
                )}
              </EditorSeccion>,
            )}

            {panel(
              'textos',
              <>
                <nav aria-label="Textos del sitio" className="flex flex-wrap gap-2">
                  {ENLACES_TEXTOS.map((e) => (
                    <a
                      key={e.href}
                      href={e.href}
                      className="inline-flex min-h-11 items-center rounded-[10px] px-3 text-sm font-semibold underline underline-offset-4"
                      style={{ color: 'var(--menu-texto-principal)' }}
                    >
                      {e.etiqueta}
                    </a>
                  ))}
                </nav>
                <div id="textos-inicio" className="scroll-mt-24">
                  <EditorSeccion<ContenidoInicio>
                    key={`inicio-${intento}`}
                    clave="contenido_inicio"
                    titulo="Textos e imagen del inicio"
                    guardado={valores.contenido_inicio}
                    actualizado={actualizado('contenido_inicio')}
                    camposLegales={camposLegales}
                    onGuardado={guardado('contenido_inicio')}
                    vistaPrevia={(v) => <VistaPreviaInicio valor={v} />}
                  >
                    {({ valor, cambiar, errores }) => <FormInicio valor={valor} errores={errores} onCambiar={cambiar} />}
                  </EditorSeccion>
                </div>
                <div id="textos-sobre-nosotros" className="scroll-mt-24">
                  <EditorSeccion<ContenidoSobreNosotros>
                    key={`sobre-${intento}`}
                    clave="contenido_sobre_nosotros"
                    titulo='Página "Sobre nosotros"'
                    guardado={valores.contenido_sobre_nosotros}
                    actualizado={actualizado('contenido_sobre_nosotros')}
                    camposLegales={camposLegales}
                    onGuardado={guardado('contenido_sobre_nosotros')}
                    vistaPrevia={(v) => <VistaPreviaSobreNosotros valor={v} />}
                  >
                    {({ valor, cambiar, errores }) => <FormSobreNosotros valor={valor} errores={errores} onCambiar={cambiar} />}
                  </EditorSeccion>
                </div>
                <div id="textos-contacto" className="scroll-mt-24">
                  <EditorSeccion<ContenidoContacto>
                    key={`contacto-${intento}`}
                    clave="contenido_contacto"
                    titulo="Página de contacto"
                    guardado={valores.contenido_contacto}
                    actualizado={actualizado('contenido_contacto')}
                    camposLegales={camposLegales}
                    onGuardado={guardado('contenido_contacto')}
                    vistaPrevia={(v) => <VistaPreviaContacto valor={v} />}
                  >
                    {({ valor, cambiar, errores }) => <FormContacto valor={valor} errores={errores} onCambiar={cambiar} />}
                  </EditorSeccion>
                </div>
              </>,
            )}

            {panel(
              'reglas',
              <EditorSeccion<{ anticiposDesde: string | null }>
                key={`reglas-${intento}`}
                clave="reglas"
                titulo="Reglas de citas y anticipos"
                descripcion="Desde cuándo se pide anticipo al agendar en línea los servicios que lo tienen."
                guardado={valores.reglas}
                actualizado={actualizado('reglas')}
                camposLegales={camposLegales}
                onGuardado={guardado('reglas')}
              >
                {({ valor, cambiar, errores }) => (
                  <div className="space-y-8">
                    <FormReglas valor={valor} respaldo={config?.anticiposDesdeRespaldo ?? null} errores={errores} onCambiar={cambiar} />
                    <PlazosTerminos />
                  </div>
                )}
              </EditorSeccion>,
            )}

            {panel(
              'permisos',
              <SeccionPermisos
                key={`permisos-${intento}`}
                datos={permisos}
                onGuardado={(rol, claves) =>
                  setPermisos((p) => (p ? { ...p, roles: p.roles.map((r) => (r.rol === rol ? { ...r, claves } : r)) } : p))
                }
              />,
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
