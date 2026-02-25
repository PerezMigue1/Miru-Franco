import ErrorScreen from '../../../components/ErrorScreen';

export default function Error403Page() {
  return (
    <ErrorScreen
      codigo={403}
      titulo="Acceso denegado"
      mensaje="No tienes permiso para ver esta página. Inicia sesión con una cuenta autorizada o vuelve al inicio."
      icono="🔒"
    />
  );
}
