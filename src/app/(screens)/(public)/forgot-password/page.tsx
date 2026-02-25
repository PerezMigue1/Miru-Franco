'use client';

import { useRouter } from 'next/navigation';
import AuthContainer from '../../../components/auth/AuthContainer';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const handleAuthSuccess = () => {
    // Despues de recuperar password, ir a login
    router.push('/login');
  };

  return (
    <AuthContainer 
      initialView="forgot-email"
      onAuthSuccess={handleAuthSuccess}
    />
  );
}
