import { NextRequest, NextResponse } from 'next/server';
import { UserModel } from '@/lib/models/User';
import { generateResetToken } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, method } = body; // method: 'email', 'sms', 'security-questions'

    if (!email) {
      return NextResponse.json(
        { error: 'El correo electrónico es requerido' },
        { status: 400 }
      );
    }

    const user = await UserModel.findByEmail(email.toLowerCase().trim());
    if (!user) {
      // Por seguridad, no revelamos si el email existe o no
      return NextResponse.json({
        success: true,
        message: 'Si el correo existe, se enviará un enlace de recuperación',
      });
    }

    if (method === 'email') {
      // Generar token de reset
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date();
      resetExpires.setHours(resetExpires.getHours() + 1); // Expira en 1 hora

      await UserModel.updateResetToken(user.email, resetToken, resetExpires);

      // Aquí deberías enviar el email con el enlace
      // Por ahora solo retornamos éxito
      const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      
      // TODO: Implementar envío de email con nodemailer
      console.log('Reset link:', resetLink);

      return NextResponse.json({
        success: true,
        message: 'Se ha enviado un enlace de recuperación a tu correo electrónico',
      });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error en forgot-password:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud. Intenta nuevamente.' },
      { status: 500 }
    );
  }
}

