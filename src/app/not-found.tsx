import ErrorScreen from './components/ErrorScreen';

export default function NotFound() {
  return (
    <ErrorScreen
      codigo={404}
      titulo="Página no encontrada"
      mensaje="La página que buscas no existe o fue movida. Usa los enlaces para volver."
      icono="🔍"
    />
  );
}
