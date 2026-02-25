import ErrorScreen from '../../../components/ErrorScreen';

export default function Error500Page() {
  return (
    <ErrorScreen
      codigo={500}
      titulo="Error del servidor"
      mensaje="Algo salió mal en el servidor. Por favor intenta más tarde o vuelve al inicio."
      icono="⚙"
    />
  );
}
