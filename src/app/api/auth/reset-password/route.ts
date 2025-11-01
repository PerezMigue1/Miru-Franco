import { NextRequest, NextResponse } from 'next/server';
import { UserModel } from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email, password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'La contraseña es requerida' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    let user;

    if (token) {
      // Reset por token (email)
      user = await UserModel.findByResetToken(token);
      if (!user) {
        return NextResponse.json(
          { error: 'Token inválido o expirado' },
          { status: 400 }
        );
      }
    } else if (email) {
      // Reset por email (después de SMS o preguntas de seguridad)
      user = await UserModel.findByEmail(email.toLowerCase().trim());
      if (!user) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Token o email requerido' },
        { status: 400 }
      );
    }

    // Actualizar contraseña
    await UserModel.updatePassword(user.email, password);

    return NextResponse.json({
      success: true,
      message: 'Contraseña restablecida exitosamente',
    });
  } catch (error) {
    console.error('Error en reset-password:', error);
    return NextResponse.json(
      { error: 'Error al restablecer la contraseña. Intenta nuevamente.' },
      { status: 500 }
    );
  }
}

