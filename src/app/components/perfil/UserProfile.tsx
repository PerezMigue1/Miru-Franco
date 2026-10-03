'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  IdCard,
  LockKeyhole,
  LogOut,
  MessageSquare,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tag,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import { clearAuthData } from '../../utils/security';
import { showAlert } from '../../utils/toast';
import { api } from '../../services/auth';
import PerfilDatosForm from './PerfilDatosForm';
import { mergePerfilEnLocalStorage, patchMiPerfil } from '../../services/perfil';
import { subirFotoPerfilCloudinary } from '../../utils/cloudinary';
import { normalizarUrlImagenExterna } from '../../utils/normalizarUrlImagen';

interface UserInfo {
  id?: string;
  nombre: string;
  email: string;
  telefono?: string;
  /** URL pública de la foto (Cloudinary u otro) */
  foto?: string;
  rol: string;
  rolRaw?: string;
  desde: string;
}

type NormalizedRole = 'admin' | 'estilista' | 'empleado' | 'becario' | 'cliente';

function normalizeRole(raw?: string): NormalizedRole {
  const r = (raw || '').toLowerCase().trim();
  if (r.includes('admin')) return 'admin';
  if (r.includes('estilista')) return 'estilista';
  if (r.includes('empleado') || r.includes('auxiliar')) return 'empleado';
  if (r.includes('bec')) return 'becario';
  return 'cliente';
}

function roleLabel(role: NormalizedRole): string {
  switch (role) {
    case 'admin': return 'Administrador';
    case 'estilista': return 'Estilista';
    case 'empleado': return 'Empleado';
    case 'becario': return 'Becario';
    default: return 'Cliente';
  }
}

type SidebarItem = 'perfil' | 'pedidos' | 'citas' | 'tienda' | 'seguridad';
type ActiveSection = 'informacion-personal' | 'datos-cuenta' | null;

interface ProfileCard {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  href?: string;
  section?: ActiveSection;
  alert?: boolean;
}

/** Grupos del hub de la cuenta (listas de filas en vez de tarjetas iguales). */
const GRUPOS_TARJETAS: { titulo: string; ids: string[] }[] = [
  { titulo: 'Tu cuenta', ids: ['info', 'cuenta', 'seguridad', 'tarjetas', 'comunicaciones'] },
  { titulo: 'Citas y beneficios', ids: ['citas', 'promociones'] },
  { titulo: 'Paneles del salón', ids: ['admin', 'operacion'] },
];

export default function UserProfile() {
  const router = useRouter();
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [dismissBanner, setDismissBanner] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFotoUploading, setAvatarFotoUploading] = useState(false);
  const [avatarFotoError, setAvatarFotoError] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo>({
    nombre: '',
    email: '',
    telefono: '',
    rol: 'Cliente',
    desde: '',
  });

  const refreshUserFromApi = useCallback(async () => {
    try {
      const result = await api.getProfile();
      if (result.success && result.data) {
        const rawRole: string = String(result.data.rol ?? (result.data as { role?: string }).role ?? 'usuario');
        const normalized = normalizeRole(rawRole);
        const displayRole = roleLabel(normalized);
        const createdAt = result.data.creadoEn ? new Date(result.data.creadoEn) : undefined;
        const desde = createdAt ? String(createdAt.getFullYear()) : '';

        setUser({
          id: result.data.id,
          nombre: result.data.nombre || '',
          email: result.data.email || '',
          telefono: result.data.telefono || '',
          foto: normalizarUrlImagenExterna(result.data.foto) || '',
          rol: displayRole,
          rolRaw: rawRole,
          desde,
        });
        // Header y menú leen `localStorage.user`; tras Google a veces solo hay token hasta que /me responde.
        mergePerfilEnLocalStorage(result.data);
        return;
      }
    } catch {
      /* sigue a localStorage */
    }

    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser) as Record<string, unknown>;
          const rawRole = (parsed.rol as string) || (parsed.role as string) || 'usuario';
          const normalized = normalizeRole(rawRole);
          const displayRole = roleLabel(normalized);
          setUser({
            id: String(parsed.id ?? parsed._id ?? ''),
            nombre: String(parsed.nombre ?? parsed.name ?? ''),
            email: String(parsed.email ?? ''),
            telefono: String(parsed.telefono ?? ''),
            foto: normalizarUrlImagenExterna(
              String(parsed.foto ?? parsed.avatarUrl ?? parsed.picture ?? parsed.photo ?? '')
            ),
            rol: displayRole,
            rolRaw: rawRole,
            desde: String(parsed.desde ?? ''),
          });
        } catch {
          /* ignore */
        }
      }
    }
  }, []);

  useEffect(() => {
    void refreshUserFromApi();
  }, [refreshUserFromApi]);

  const openAvatarFotoPicker = useCallback(() => {
    setAvatarFotoError(null);
    avatarFileInputRef.current?.click();
  }, []);

  const handleAvatarFotoSelected = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setAvatarFotoError(null);
      setAvatarFotoUploading(true);
      try {
        const url = await subirFotoPerfilCloudinary(file);
        const updated = await patchMiPerfil({ foto: url });
        const nextUrl =
          normalizarUrlImagenExterna(updated.foto?.trim() ? updated.foto.trim() : url) || url;
        mergePerfilEnLocalStorage(updated, nextUrl);
        setUser((prev) => ({ ...prev, foto: nextUrl }));
        await refreshUserFromApi();
      } catch (e) {
        setAvatarFotoError(e instanceof Error ? e.message : 'No se pudo subir la foto');
      } finally {
        setAvatarFotoUploading(false);
        if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
      }
    },
    [refreshUserFromApi]
  );

  const handleLogoutAllSessions = async () => {
    setLogoutAllLoading(true);
    try {
      if (typeof window !== 'undefined') localStorage.setItem('manualLogout', 'true');
      const { api } = await import('../../services');
      const result = await api.logoutAll();
      clearAuthData();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('manualLogout');
        await showAlert(result.message || 'Todas tus sesiones han sido cerradas correctamente');
      }
      router.push('/login');
    } catch {
      clearAuthData();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('manualLogout');
        await showAlert('Se cerró la sesión en este dispositivo.');
      }
      router.push('/login');
    } finally {
      setLogoutAllLoading(false);
    }
  };

  const normalizedRole = normalizeRole(user.rolRaw || user.rol);
  const initials = user.nombre
    ? user.nombre.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  /** URL de foto lista para next/image (corrige &#x2F; etc. si el API la devuelve escapada). */
  const fotoPerfilSrc = normalizarUrlImagenExterna(user.foto);

  const cards: ProfileCard[] = [
    {
      id: 'info',
      title: 'Información personal',
      subtitle: 'Foto de perfil, nombre, teléfono y datos capilares.',
      icon: IdCard,
      section: 'informacion-personal',
    },
    {
      id: 'cuenta',
      title: 'Datos de tu cuenta',
      subtitle: `Rol: ${roleLabel(normalizedRole)}. ${user.desde ? `Cliente desde ${user.desde}.` : ''}`,
      icon: UserRound,
      section: 'datos-cuenta',
    },
    {
      id: 'citas',
      title: 'Mis citas',
      subtitle: 'Consulta, reprograma o cancela tus citas agendadas.',
      icon: CalendarDays,
      href: '/cliente/servicios-citas/mis-citas',
    },
    {
      id: 'seguridad',
      title: 'Seguridad',
      subtitle: 'Modifica tu contraseña y mantén tu cuenta segura.',
      icon: LockKeyhole,
      href: '/forgot-password',
      alert: true,
    },
    {
      id: 'tarjetas',
      title: 'Tarjetas',
      subtitle: 'Métodos de pago guardados para tus compras.',
      icon: CreditCard,
      href: '/cliente/tarjetas',
    },
    {
      id: 'comunicaciones',
      title: 'Comunicaciones',
      subtitle: 'Elige qué tipo de información quieres recibir.',
      icon: MessageSquare,
      href: '/cliente/comunicaciones',
    },
    {
      id: 'admin',
      title: 'Panel de administración',
      subtitle: 'Gestiona el salón y reportes.',
      icon: BarChart3,
      href: '/admin',
    },
    {
      id: 'operacion',
      title: 'Panel de operación',
      subtitle: 'Agenda, citas y servicios.',
      icon: ClipboardList,
      href: '/operacion',
    },
    {
      id: 'promociones',
      title: 'Promociones',
      subtitle: 'Ofertas y descuentos disponibles.',
      icon: Tag,
      href: '/cliente/promociones',
    },
  ];

  const visibleCards = cards.filter((c) => {
    if (c.id === 'admin') return normalizedRole === 'admin';
    if (c.id === 'operacion') return ['estilista', 'empleado', 'becario'].includes(normalizedRole);
    // Oculto hasta integrar pasarela (Mercado Pago). No borrar.
    // Sin pasarela real, "Tarjetas" no tiene nada verificable que gestionar — se paga en el salón.
    if (c.id === 'tarjetas') return false;
    // Oculto: la ruta /cliente/comunicaciones todavía no existe (llevaba a un 404). No borrar.
    if (c.id === 'comunicaciones') return false;
    return true;
  });

  const sidebarItems: { id: SidebarItem; label: string; href?: string; icon: LucideIcon }[] = [
    { id: 'perfil', label: 'Mi perfil', icon: UserRound },
    { id: 'pedidos', label: 'Mis pedidos', href: '/cliente/tienda-online/mis-pedidos', icon: ShoppingBag },
    { id: 'citas', label: 'Mis citas', href: '/cliente/servicios-citas/mis-citas', icon: CalendarDays },
    { id: 'tienda', label: 'Tienda', href: '/cliente/tienda-online', icon: Store },
    { id: 'seguridad', label: 'Seguridad', href: '/forgot-password', icon: LockKeyhole },
  ];

  const abrirTarjeta = (card: ProfileCard) => {
    if (card.href) router.push(card.href);
    else if (card.section) setActiveSection(card.section);
  };

  const volver = (
    <button
      type="button"
      onClick={() => setActiveSection(null)}
      className="mb-5 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline"
      style={{ color: 'var(--menu-texto-principal)' }}
    >
      <ChevronLeft size={16} aria-hidden />
      Volver a mi cuenta
    </button>
  );

  const cerrarSesion = (
    <button
      type="button"
      onClick={handleLogoutAllSessions}
      disabled={logoutAllLoading}
      className="mf-perfil-nav__item mf-perfil-nav__item--peligro"
    >
      <LogOut size={18} aria-hidden />
      <span>{logoutAllLoading ? 'Cerrando…' : 'Cerrar sesión'}</span>
    </button>
  );

  return (
    <div className="mf-perfil">
      {/* Navegación de la cuenta: fila desplazable en móvil, columna fija en escritorio */}
      <nav aria-label="Mi cuenta" className="mf-perfil-nav">
        <ul className="mf-perfil-nav__lista">
          {sidebarItems.map((item) => {
            const Icono = item.icon;
            const activo = item.id === 'perfil';
            return (
              <li key={item.id}>
                {item.href ? (
                  <Link href={item.href} className="mf-perfil-nav__item">
                    <Icono size={18} aria-hidden />
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <span className="mf-perfil-nav__item" aria-current={activo ? 'page' : undefined}>
                    <Icono size={18} aria-hidden />
                    <span>{item.label}</span>
                  </span>
                )}
              </li>
            );
          })}
          <li className="hidden lg:block mf-perfil-nav__separado">{cerrarSesion}</li>
        </ul>
      </nav>

      <div className="min-w-0">
        {/* Cabecera de la cuenta */}
        <header className="mf-entrada mb-8 flex flex-col gap-5 sm:flex-row sm:items-center">
          <input
            ref={avatarFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            disabled={avatarFotoUploading}
            onChange={(e) => void handleAvatarFotoSelected(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={openAvatarFotoPicker}
            disabled={avatarFotoUploading}
            className="group relative h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-full disabled:cursor-wait disabled:opacity-60"
            style={{
              backgroundColor: 'var(--tarjetas-paneles)',
              boxShadow: '0 0 0 2px var(--logo-branding), 0 0 0 6px var(--fondos-suaves)',
            }}
            title={fotoPerfilSrc ? 'Cambiar foto (elegir archivo)' : 'Elegir foto de perfil'}
            aria-label={fotoPerfilSrc ? 'Cambiar foto de perfil, elegir archivo' : 'Elegir foto de perfil'}
          >
            {fotoPerfilSrc ? (
              <Image
                src={fotoPerfilSrc}
                alt={user.nombre ? `Foto de ${user.nombre}` : 'Foto de perfil'}
                fill
                className="object-cover"
                sizes="96px"
                unoptimized={
                  fotoPerfilSrc.includes('http') && !fotoPerfilSrc.includes('res.cloudinary.com')
                }
              />
            ) : (
              <span
                className="flex h-full w-full items-center justify-center text-2xl font-bold"
                style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}
              >
                {initials}
              </span>
            )}
            <span
              className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/45"
              aria-hidden
            >
              <span className="px-1 text-center text-xs font-semibold leading-tight text-[#f2f1ed] opacity-0 group-hover:opacity-100">
                {avatarFotoUploading ? '…' : 'Cambiar'}
              </span>
            </span>
          </button>
          <div className="min-w-0">
            <h1 className="mf-titulo-pagina break-words" style={{ color: 'var(--menu-texto-principal)' }}>
              {user.nombre || 'Mi cuenta'}
            </h1>
            <p className="mt-1 break-all text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              {user.email || '—'}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <Badge variant="default" size="sm">
                {roleLabel(normalizedRole)}
                {user.desde ? ` · desde ${user.desde}` : ''}
              </Badge>
              <button
                type="button"
                onClick={openAvatarFotoPicker}
                disabled={avatarFotoUploading}
                className="inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline disabled:opacity-60"
                style={{ color: 'var(--menu-texto-principal)' }}
              >
                {avatarFotoUploading
                  ? 'Subiendo foto…'
                  : fotoPerfilSrc
                    ? 'Cambiar foto de perfil'
                    : 'Elegir foto de perfil'}
              </button>
            </div>
            {avatarFotoError && (
              <p className="mt-2 text-sm" style={{ color: 'var(--danger-texto)' }} role="alert">
                {avatarFotoError}
              </p>
            )}
          </div>
        </header>

        {/* Recordatorio de contraseña (se puede cerrar) */}
        {!dismissBanner && !activeSection && (
          <div
            className="mf-entrada mb-8 flex flex-col gap-4 rounded-[14px] p-5 sm:flex-row sm:items-center sm:justify-between"
            style={{
              ['--i' as string]: 1,
              backgroundColor: 'color-mix(in srgb, var(--logo-branding) 12%, var(--fondos-suaves))',
            }}
          >
            <div className="flex items-start gap-4">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                style={{ backgroundColor: 'var(--fondo-general)', color: 'var(--oro-texto)' }}
              >
                <ShieldCheck size={22} aria-hidden />
              </span>
              <div>
                <h2 className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                  Modifica tu contraseña y mantén tu cuenta segura
                </h2>
                <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                  Te recomendamos cambiar tu contraseña periódicamente.
                </p>
              </div>
            </div>
            <div className="flex w-full items-center gap-1 sm:w-auto">
              <Button size="sm" onClick={() => router.push('/forgot-password')}>
                Modificar
              </Button>
              <button
                type="button"
                onClick={() => setDismissBanner(true)}
                className="grid h-11 w-11 place-items-center rounded-[10px] hover:bg-[var(--nav-hover-bg)]"
                style={{ color: 'var(--encabezados-alterno)' }}
                aria-label="Cerrar recordatorio"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
          </div>
        )}

        {/* Editar datos personales y perfil capilar */}
        {activeSection === 'informacion-personal' && (
          <section className="mb-8">
            {volver}
            <h2 className="mb-6 text-2xl font-bold" style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}>
              Información personal
            </h2>
            <PerfilDatosForm onSaved={() => void refreshUserFromApi()} />
          </section>
        )}

        {/* Sub-vista: Datos de tu cuenta */}
        {activeSection === 'datos-cuenta' && (
          <section className="mb-8">
            {volver}
            <h2 className="mb-6 text-2xl font-bold" style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}>
              Datos de tu cuenta
            </h2>
            <Card padding="sm" className="!p-0">
              <dl>
                {[
                  { etiqueta: 'E-mail', valor: user.email || '—', accion: () => router.push('/forgot-password'), romper: true },
                  { etiqueta: 'Teléfono', valor: user.telefono?.trim() ? user.telefono : '—', accion: () => setActiveSection('informacion-personal') },
                  { etiqueta: 'ID de cuenta', valor: user.id || '—', accion: () => setActiveSection('informacion-personal'), romper: true },
                ].map((fila, i) => (
                  <div
                    key={fila.etiqueta}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                    style={i > 0 ? { borderTop: '1px solid var(--mf-linea)' } : undefined}
                  >
                    <div className="min-w-0">
                      <dt className="flex items-center gap-2 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                        {fila.etiqueta}
                        <Badge variant="success" size="sm">Validado</Badge>
                      </dt>
                      <dd
                        className={`mt-0.5 text-base font-semibold ${fila.romper ? 'break-all' : ''}`}
                        style={{ color: 'var(--menu-texto-principal)' }}
                      >
                        {fila.valor}
                      </dd>
                    </div>
                    <Button size="sm" variant="outline" onClick={fila.accion} className="self-start sm:self-auto">
                      Modificar
                    </Button>
                  </div>
                ))}
              </dl>
            </Card>
          </section>
        )}

        {/* Hub de la cuenta: grupos de filas */}
        {!activeSection && (
          <div className="space-y-8">
            {GRUPOS_TARJETAS.map((grupo, gi) => {
              const filas = grupo.ids
                .map((id) => visibleCards.find((c) => c.id === id))
                .filter((c): c is ProfileCard => !!c);
              if (filas.length === 0) return null;
              return (
                <section key={grupo.titulo} className="mf-entrada" style={{ ['--i' as string]: gi + 2 }}>
                  <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--encabezados-alterno)' }}>
                    {grupo.titulo}
                  </h2>
                  <Card padding="sm" className="!p-0 overflow-hidden">
                    <ul>
                      {filas.map((card, i) => {
                        const Icono = card.icon;
                        return (
                          <li key={card.id} style={i > 0 ? { borderTop: '1px solid var(--mf-linea)' } : undefined}>
                            <button type="button" className="mf-perfil-fila" onClick={() => abrirTarjeta(card)}>
                              <span className="mf-perfil-fila__icono">
                                <Icono size={20} aria-hidden />
                              </span>
                              <span className="min-w-0 flex-1 text-left">
                                <span className="flex items-center gap-2 font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                                  {card.title}
                                  {card.alert && (
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--warning)' }}>
                                      <span className="sr-only">(pendiente)</span>
                                    </span>
                                  )}
                                </span>
                                <span className="block text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                                  {card.subtitle}
                                </span>
                              </span>
                              <ChevronRight size={18} aria-hidden className="shrink-0" style={{ color: 'var(--campo-placeholder)' }} />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                </section>
              );
            })}
            <div className="lg:hidden">{cerrarSesion}</div>
          </div>
        )}
      </div>
    </div>
  );
}
