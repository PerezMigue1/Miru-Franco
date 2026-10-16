'use client';

import { useEffect, useState } from 'react';
import ModuleLayout from '../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Textarea from '../../../../components/ui/Textarea';
import Badge from '../../../../components/ui/Badge';
import { getMiPerfil } from '../../../../services/auth';
import { crearQueja, listarQuejasPorCliente, type QuejaApi } from '../../../../services/quejas';
import { useTextosSitio } from '../../../../hooks/useTextosSitio';
import { mensajeDeError } from '../../../../utils/errorRed';
import { showToast } from '../../../../utils/toast';
import { fechaHoraMexico } from '../../../../components/privacidad/textosPrivacidad';
import { ETIQUETA_ESTADO_QUEJA, MAX_ASUNTO, MAX_DESCRIPCION, validarQueja } from './garantias';

/** Garantías y soporte: las quejas de la clienta (de la base) y el formulario para registrar una nueva. */
export default function GarantiasClientePage() {
  const { t } = useTextosSitio();
  const [quejas, setQuejas] = useState<QuejaApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [asunto, setAsunto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [errores, setErrores] = useState<{ asunto?: string; descripcion?: string }>({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vigente = true;
    getMiPerfil()
      .then((perfil) => listarQuejasPorCliente(perfil.id))
      .then((lista) => {
        if (!vigente) return;
        setQuejas(lista);
        setError(null);
      })
      .catch((e) => vigente && setError(mensajeDeError(e, 'No pudimos cargar tus casos.')))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [intento]);

  const enviar = async () => {
    const e = validarQueja(asunto, descripcion);
    setErrores(e);
    if (e.asunto || e.descripcion) return;
    setEnviando(true);
    try {
      await crearQueja({ asunto: asunto.trim(), descripcion: descripcion.trim() });
      showToast(t('garantias.toastRegistrado'), 'success');
      setAsunto('');
      setDescripcion('');
      setMostrarFormulario(false);
      setCargando(true);
      setIntento((n) => n + 1);
    } catch (err) {
      showToast(mensajeDeError(err, 'No pudimos registrar tu caso. Intenta de nuevo.'), 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ModuleLayout>
      <div className="max-w-4xl mx-auto py-4">
        <PageHeader
          title="Garantías y soporte"
          subtitle={t('garantias.subtitulo')}
        />

        <Card className="mb-6">
          <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Mis casos
          </h2>
          {cargando ? (
            <div className="space-y-2" aria-busy="true" aria-label="Cargando tus casos">
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
          ) : quejas.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              {t('garantias.vacia')}
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: 'var(--mf-linea)' }}>
              {quejas.map((q) => (
                <li key={q.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                      {q.asunto}
                    </p>
                    <Badge variant={q.estado === 'resuelta' || q.estado === 'cerrada' ? 'success' : 'info'} size="sm">
                      {ETIQUETA_ESTADO_QUEJA[q.estado]}
                    </Badge>
                  </div>
                  {q.creadoEn && (
                    <p className="mt-0.5 text-xs tabular-nums" style={{ color: 'var(--encabezados-alterno)' }}>
                      {fechaHoraMexico(q.creadoEn)}
                    </p>
                  )}
                  <p className="mt-1 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                    {q.descripcion}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          {!mostrarFormulario ? (
            <div className="text-center py-6">
              <h2 className="text-page-title mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                ¿Necesitas ayuda?
              </h2>
              <p className="mb-4 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                {t('garantias.formularioTexto')}
              </p>
              <Button onClick={() => setMostrarFormulario(true)}>Reportar un caso</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-page-title" style={{ color: 'var(--menu-texto-principal)' }}>
                Reportar un caso
              </h2>
              <Input
                label="Asunto"
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                maxLength={MAX_ASUNTO}
                required
                aria-required
                error={errores.asunto}
                helperText="Por ejemplo: el alaciado no duró lo esperado."
                fullWidth
              />
              <Textarea
                label="¿Qué pasó?"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                maxLength={MAX_DESCRIPCION}
                rows={5}
                required
                error={errores.descripcion}
                fullWidth
              />
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button variant="outline" fullWidth onClick={() => setMostrarFormulario(false)} disabled={enviando}>
                  Cancelar
                </Button>
                <Button fullWidth onClick={() => void enviar()} disabled={enviando}>
                  {enviando ? 'Enviando…' : 'Enviar'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </ModuleLayout>
  );
}
