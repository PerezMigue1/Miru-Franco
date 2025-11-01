'use client';

import AuthContainer from './components/AuthContainer';

export default function Home() {
  const handleAuthSuccess = () => {
    console.log('Usuario autenticado exitosamente');
    // Aquí puedes redirigir a otra página o actualizar el estado de la aplicación
  };

  return (
    <AuthContainer 
      initialView="login"
      onAuthSuccess={handleAuthSuccess}
    />
  );
}
