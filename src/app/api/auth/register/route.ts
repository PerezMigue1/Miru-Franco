import { NextRequest, NextResponse } from 'next/server';
import { UserModel } from '@/lib/models/User';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password, phone } = body;

    // Validaciones básicas
    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, nombre y contraseña son requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Crear usuario
    const user = await UserModel.create({
      email: email.toLowerCase().trim(),
      name: name.trim(),
      password,
      phone: phone?.trim(),
    });

    // Generar token
    const token = generateToken({
      userId: user._id!,
      email: user.email,
    });

    // Retornar usuario sin contraseña
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        success: true,
        user: userWithoutPassword,
        token,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error en registro:', error);
    
    if (error.message === 'El usuario ya existe') {
      return NextResponse.json(
        { error: 'El correo electrónico ya está registrado' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Error al crear la cuenta. Intenta nuevamente.' },
      { status: 500 }
    );
  }
}

