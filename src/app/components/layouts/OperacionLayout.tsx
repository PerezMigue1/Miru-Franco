'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { hasSession } from '../../utils/security';
import { normalizarUsuarioAlmacenado } from '../../utils/normalizarUsuarioAlmacenado';
import { emitMiruUserStorageUpdated } from '../../utils/userStorageSync';
import { api } from '../../services/auth';
import { STAFF_ROLES, getRolFromUser } from '../../utils/adminAuth';
import { usePermisos, getPermisosFromUser, evaluarPermiso, PERMISOS_COMISIONES } from '../../utils/permisos';
import PanelShell from './PanelShell';
import PanelVerificando from './PanelVerificando';
import {
  BrainCircuit,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  HandCoins,
  ImagePlus,
  LayoutDashboard,
  Receipt,
  Scissors,
  ShoppingBag,
  PackageCheck,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

interface OperacionLayoutProps {
  children: ReactNode;
  /**
   * Clave de `permisos_rol` que exige esta página (defensa en profundidad: bloquea el
   * acceso directo por URL además de que el enlace ya esté oculto en el sidebar).
   * Sin esta prop, el layout se comporta exactamente igual que antes de esta fase.
   * Con una lista basta con tener cualquiera de las claves (pasa una constante del módulo, no un
   * arreglo literal: la prop entra en las dependencias del efecto de verificación).
   */
  permisoRequerido?: string | readonly string[];
}

/**
 * Navegación del panel de operación — misma lista de destinos del hub.
 * `permiso` es la clave que exige la página protegida; sin `permiso` = enlace neutral,
 * siempre visible a todo el staff con acceso a operación.
 *
 * Agenda/Calendario se deja sin `permiso`: su función principal (ver citas) la cubre
 * cualquier rol de staff (`citas:escritura` o `citas:asignadas`); el selector de
 * especialistas ahí dentro degrada a vacío si el rol no tiene `empleados:lectura`
 * (ver `listarEmpleados` en services/empleados.ts), no rompe la página.
 * Gestión de citas sí exige `citas:escritura`: su función principal es crear/reprogramar/
 * cancelar citas, algo que becario no puede hacer (solo check-in/out vía citas:asignadas,
 * ya cubierto por Ejecución de servicios y Cola de atención) — mostrarle el enlace solo
 * para toparse con un módulo sin nada que hacer no aporta.
 * Pedidos online exige `caja:escritura` — es la jefa cobrando pedidos al recoger, mismo
 * permiso que ya tiene y con el que se cerró PagosService/PedidosService (ver esa tarea).
 * Empleado y becario no lo tienen, así que no ven el enlace.
 * Segmentación de clientes exige `clientes:lectura` — mismo permiso que ya gatea el
 * endpoint `/api/clientes/segmentacion` en el backend.
 */
const NAV_ITEMS: { label: string; href: string; icon: LucideIcon; permiso?: string | readonly string[] }[] = [
  { label: 'Panel de operación', href: '/operacion', icon: LayoutDashboard },
  { label: 'Ejecución de servicios', href: '/operacion/ejecucion-servicios', icon: Scissors },
  { label: 'Cola de atención', href: '/operacion/cola-atencion', icon: Users },
  { label: 'Punto de venta', href: '/operacion/punto-de-venta', icon: Receipt, permiso: 'ventas:escritura' },
  { label: 'Pedidos online', href: '/operacion/pedidos-online', icon: ShoppingBag, permiso: 'caja:escritura' },
  { label: 'Pedidos por recoger', href: '/operacion/pedidos-por-recoger', icon: PackageCheck, permiso: 'pedidos:entregar' },
  { label: 'Agenda / Calendario', href: '/operacion/agenda-calendario', icon: CalendarDays },
  { label: 'Gestión de citas', href: '/operacion/gestion-citas', icon: CalendarClock, permiso: 'citas:escritura' },
  { label: 'Segmentación de clientes', href: '/operacion/segmentacion-clientes', icon: BrainCircuit, permiso: 'clientes:lectura' },
  { label: 'Seguimiento', href: '/operacion/seguimiento-post-servicio', icon: ClipboardCheck, permiso: 'seguimientos:lectura' },
  { label: 'Mis solicitudes', href: '/operacion/mis-solicitudes', icon: ClipboardList },
  { label: 'Mi asistencia', href: '/operacion/mi-asistencia', icon: Clock3 },
  { label: 'Gestión de equipo', href: '/operacion/gestion-equipo', icon: UserCog, permiso: 'asistencia:gestionar' },
  { label: 'Subir imágenes', href: '/operacion/subir-imagenes', icon: ImagePlus },
  { label: 'Comisiones', href: '/operacion/comisiones', icon: HandCoins, permiso: PERMISOS_COMISIONES },
  { label: 'Anticipos por servicio', href: '/operacion/anticipos', icon: Wallet, permiso: 'servicios:escritura' },
];

function esActivo(pathname: string | null, href: string): boolean {
  if (href === '/operacion') return pathname === '/operacion';
  return !!pathname?.startsWith(href);
}

/** Roles que pueden acceder al módulo operación (staff: estilista, empleado, becario/becado). Match exacto. */
function isRolOperacion(rol: string | undefined): boolean {
  if (!rol || typeof rol !== 'string') return false;
  return STAFF_ROLES.includes(rol.toLowerCase().trim());
}

/**
 * Repuebla `localStorage.user` con `permisos` (y el resto del perfil) sin bloquear el
 * render — el acceso ya se concedió con el rol/permiso cacheado. Una vez guardado,
 * emite el evento que `usePermisos()` escucha para que el sidebar se re-filtre solo.
 */
function refrescarPermisosEnSegundoPlano(userJsonActual: string | null) {
  api.getProfile().then((res) => {
    if (!res.success || !res.data || typeof window === 'undefined') return;
    const current = userJsonActual ? (JSON.parse(userJsonActual) as Record<string, unknown>) : {};
    localStorage.setItem(
      'user',
      JSON.stringify(normalizarUsuarioAlmacenado({ ...current, ...res.data }))
    );
    emitMiruUserStorageUpdated();
  }).catch(() => {
    // Sin conexión o backend caído: el sidebar se queda con lo que había, sin bloquear nada.
  });
}

export default function OperacionLayout({ children, permisoRequerido }: OperacionLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [accesoPermitido, setAccesoPermitido] = useState(false);
  const { tienePermiso } = usePermisos();

  useEffect(() => {
    if (!hasSession()) {
      const returnUrl = encodeURIComponent(pathname || '/operacion');
      router.replace(`/login?returnUrl=${returnUrl}`);
      return;
    }

    // Rol válido para operación Y (si la página lo exige) permiso concedido. Sin
    // `permisoRequerido`, es exactamente el chequeo de rol de siempre.
    const rolYPermisoOk = (rol: string | undefined, permisos: string[]): boolean => {
      if (!isRolOperacion(rol)) return false;
      if (permisoRequerido && !evaluarPermiso(permisos, permisoRequerido)) return false;
      return true;
    };

    const userJson = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (userJson) {
      try {
        const user = JSON.parse(userJson) as Record<string, unknown>;
        const rolStorage = getRolFromUser(user);
        if (rolYPermisoOk(rolStorage, getPermisosFromUser(user))) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con localStorage tras hidratar; useSyncExternalStore cambiaría la semántica del guard de sesión
          setAccesoPermitido(true);
          setVerificando(false);
          // Sesión cacheada sin `permisos` (previa a esta fase): refresca en segundo
          // plano para que el sidebar filtrado por permiso no esconda enlaces con
          // datos obsoletos, sin bloquear el acceso ya concedido por rol.
          if (!Array.isArray(user.permisos)) {
            refrescarPermisosEnSegundoPlano(userJson);
          }
          return;
        }
        // Rol o permiso insuficiente según la caché: puede estar desactualizada
        // (ej. `permisos` no existía antes de esta fase) — no bloquear todavía,
        // confirmar contra el backend antes de decidir.
      } catch {
        // seguir a backend
      }
    }

    api
      .getProfile()
      .then((res) => {
        if (!res.success) {
          router.replace('/403');
          return;
        }
        const dataRecord = res.data as unknown as Record<string, unknown> | undefined;
        const rolBackend = res.data?.rol ?? getRolFromUser(dataRecord);
        const permisosBackend = getPermisosFromUser(dataRecord);
        if (rolYPermisoOk(rolBackend, permisosBackend)) {
          if (res.data && typeof window !== 'undefined' && userJson) {
            const current = JSON.parse(userJson) as Record<string, unknown>;
            localStorage.setItem(
              'user',
              JSON.stringify(
                normalizarUsuarioAlmacenado({
                  ...current,
                  ...res.data,
                  rol: rolBackend ?? current.rol,
                  role: rolBackend ?? current.role,
                })
              )
            );
            emitMiruUserStorageUpdated();
          }
          setAccesoPermitido(true);
          setVerificando(false);
          return;
        }
        router.replace('/403');
      })
      .catch(() => {
        router.replace(`/login?returnUrl=${encodeURIComponent(pathname || '/operacion')}`);
      });
  }, [pathname, router, permisoRequerido]);

  if (verificando) {
    return <PanelVerificando detalle="Comprobando sesión y permisos de operación" />;
  }

  if (!accesoPermitido) {
    return null;
  }

  return (
    <PanelShell
      etiqueta="Operación"
      inicioHref="/operacion"
      grupos={[{ items: NAV_ITEMS.filter((item) => tienePermiso(item.permiso)) }]}
      esActivo={(href) => esActivo(pathname, href)}
    >
      {children}
    </PanelShell>
  );
}
