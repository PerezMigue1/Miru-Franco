import ErrorScreen from '../../../components/ErrorScreen';

export default function Error400Page() {
  return (
    <ErrorScreen
      codigo={400}
      titulo="Solicitud incorrecta"
      mensaje="La petición no es válida. Revisa los datos que enviaste e intenta de nuevo."
      icono="✕"
    />
  );
}
