'use client';

import { useSyncExternalStore } from 'react';
import ErrorScreen from '../../../components/ErrorScreen';
import { hasSession } from '../../../utils/security';
import { mensaje403 } from './mensaje403';

const sinSuscripcion = () => () => {};

export default function Error403Page() {
  // false en el servidor y al hidratar (la sesión vive en localStorage); el valor real ya en el cliente.
  const haySesion = useSyncExternalStore(sinSuscripcion, hasSession, () => false);
  return (
    <ErrorScreen
      codigo={403}
      titulo="Acceso denegado"
      mensaje={mensaje403(haySesion)}
      icono="acceso"
      ocultarIniciarSesion={haySesion}
    />
  );
}
