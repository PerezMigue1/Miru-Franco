import { NextRequest, NextResponse } from 'next/server';
import { UserModel } from '@/lib/models/User';

// En producción, deberías usar un servicio como Twilio o AWS SNS
// Por ahora, esto es una simulación
const SMS_CODES: Record<string, { code: string; expires: Date }> = {};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code } = body;

    if (!phone || !code) {
      return NextResponse.json(
        { error: 'Teléfono y código son requeridos' },
        { status: 400 }
      );
    }

    // Verificar código
    const storedData = SMS_CODES[phone];
    if (!storedData || storedData.code !== code) {
      return NextResponse.json(
        { error: 'Código inválido' },
        { status: 400 }
      );
    }

    if (new Date() > storedData.expires) {
      delete SMS_CODES[phone];
      return NextResponse.json(
        { error: 'Código expirado' },
        { status: 400 }
      );
    }

    // Buscar usuario por teléfono
    const db = await import('@/lib/mongodb').then(m => m.getDatabase());
    const users = db.collection('users');
    const user = await users.findOne({ phone });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar código usado
    delete SMS_CODES[phone];

    return NextResponse.json({
      success: true,
      email: user.email,
      message: 'Código verificado correctamente',
    });
  } catch (error) {
    console.error('Error en verify-sms:', error);
    return NextResponse.json(
      { error: 'Error al verificar el código. Intenta nuevamente.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { error: 'El número de teléfono es requerido' },
        { status: 400 }
      );
    }

    // Generar código aleatorio de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 5); // Expira en 5 minutos

    SMS_CODES[phone] = { code, expires };

    // TODO: Enviar SMS real con Twilio o AWS SNS
    console.log(`SMS Code for ${phone}: ${code}`);

    return NextResponse.json({
      success: true,
      message: 'Código enviado por SMS',
    });
  } catch (error) {
    console.error('Error en send-sms:', error);
    return NextResponse.json(
      { error: 'Error al enviar el código SMS. Intenta nuevamente.' },
      { status: 500 }
    );
  }
}

