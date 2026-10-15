'use client';

import { useEffect, useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Modal from '../../../../components/ui/Modal';
import Textarea from '../../../../components/ui/Textarea';
import { showToast } from '../../../../utils/toast';
import {
  MAX_CARACTERES_OBSERVACION,
  crearObservacionCliente,
  fechaObservacion,
  listarObservacionesCliente,
  validarTextoObservacion,
  type ObservacionCliente,
} from './observaciones';

interface ObservacionesClienteProps {
  clienteId: string;
  /** clientes:lectura: ver la lista. */
  puedeLeer: boolean;
  /** clientes:escritura: botón "Agregar observación". */
  puedeEscribir: boolean;
}

type EstadoLista = { cargando: boolean; error: string | null; data: ObservacionCliente[] };

/** Observaciones del CRM en la ficha de la clienta (admin y operación): lista con autor y fecha, y modal para agregar. */
export default function ObservacionesCliente({ clienteId, puedeLeer, puedeEscribir }: ObservacionesClienteProps) {
  const [lista, setLista] = useState<EstadoLista>({ cargando: true, error: null, data: [] });
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  useEffect(() => {
    if (!puedeLeer || !clienteId) return;
    let cancelado = false;
    listarObservacionesCliente(clienteId)
      .then((data) => {
        if (!cancelado) setLista({ cargando: false, error: null, data });
      })
      .catch((e) => {
        if (!cancelado) {
          setLista({ cargando: false, error: e instanceof Error ? e.message : 'No se pudieron cargar las observaciones.', data: [] });
        }
      });
    return () => {
      cancelado = true;
    };
  }, [clienteId, puedeLeer]);

  if (!puedeLeer && !puedeEscribir) return null;

  const abrir = () => {
    setTexto('');
    setErrorForm(null);
    setAbierto(true);
  };

  const cerrar = () => {
    if (!guardando) setAbierto(false);
  };

  const guardar = async () => {
    const error = validarTextoObservacion(texto);
    if (error) {
      setErrorForm(error);
      return;
    }
    setGuardando(true);
    setErrorForm(null);
    try {
      const nueva = await crearObservacionCliente(clienteId, texto);
      setLista((prev) => ({ ...prev, data: [nueva, ...prev.data] }));
      setAbierto(false);
      setTexto('');
      showToast('Observación guardada.', 'success');
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'No pudimos guardar la observación. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Card variant="elevated" padding="lg">
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
        Observaciones
      </h2>
      {puedeLeer &&
        (lista.cargando ? (
          <p className="text-sm py-4" style={{ color: 'var(--encabezados-alterno)' }}>Cargando observaciones…</p>
        ) : lista.error ? (
          <p role="alert" className="text-sm py-4" style={{ color: 'var(--danger-texto)' }}>{lista.error}</p>
        ) : lista.data.length > 0 ? (
          <ul className="space-y-2">
            {lista.data.map((o) => (
              <li key={o.id} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <p className="text-sm whitespace-pre-wrap break-words" style={{ color: 'var(--menu-texto-principal)' }}>{o.texto}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                  {o.autor} · {fechaObservacion(o.creadoEn)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm py-4" style={{ color: 'var(--encabezados-alterno)' }}>Sin observaciones registradas.</p>
        ))}
      {puedeEscribir && (
        <div className="mt-4">
          <Button variant="outline" onClick={abrir}>
            <span className="inline-flex items-center gap-1.5">
              <MessageSquarePlus size={16} aria-hidden />
              Agregar observación
            </span>
          </Button>
        </div>
      )}

      <Modal
        isOpen={abierto}
        onClose={cerrar}
        title="Agregar observación"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={cerrar} disabled={guardando}>Cancelar</Button>
            <Button onClick={() => void guardar()} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar observación'}
            </Button>
          </>
        }
      >
        <Textarea
          label="Observación"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={5}
          maxLength={MAX_CARACTERES_OBSERVACION}
          disabled={guardando}
          error={errorForm ?? undefined}
          helperText={`${texto.trim().length}/${MAX_CARACTERES_OBSERVACION} caracteres`}
          placeholder="Ej. Prefiere citas por la tarde"
          fullWidth
        />
      </Modal>
    </Card>
  );
}
