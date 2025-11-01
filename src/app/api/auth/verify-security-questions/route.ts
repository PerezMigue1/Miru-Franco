import { NextRequest, NextResponse } from 'next/server';
import { UserModel } from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, answers } = body;

    if (!email || !answers) {
      return NextResponse.json(
        { error: 'Email y respuestas son requeridos' },
        { status: 400 }
      );
    }

    // Verificar respuestas
    const isValid = await UserModel.verifySecurityQuestions(
      email.toLowerCase().trim(),
      answers
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Una o más respuestas son incorrectas' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Respuestas verificadas correctamente',
    });
  } catch (error) {
    console.error('Error en verify-security-questions:', error);
    return NextResponse.json(
      { error: 'Error al verificar las respuestas. Intenta nuevamente.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'El correo electrónico es requerido' },
        { status: 400 }
      );
    }

    const user = await UserModel.findByEmail(email.toLowerCase().trim());
    if (!user || !user.securityQuestions) {
      return NextResponse.json(
        { error: 'Usuario no encontrado o no tiene preguntas de seguridad configuradas' },
        { status: 404 }
      );
    }

    // Retornar solo las preguntas, no las respuestas
    const questions = user.securityQuestions.map(q => ({
      question: q.question,
    }));

    return NextResponse.json({
      success: true,
      questions,
    });
  } catch (error) {
    console.error('Error en get-security-questions:', error);
    return NextResponse.json(
      { error: 'Error al obtener las preguntas. Intenta nuevamente.' },
      { status: 500 }
    );
  }
}

