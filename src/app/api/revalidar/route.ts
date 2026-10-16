import { revalidateTag } from 'next/cache';
import { ETIQUETAS_PUBLICAS, secretoValido } from '../../utils/revalidacion';

/**
 * POST /api/revalidar: el backend lo llama al guardar contenido público (configuración, reglas, textos, galería,
 * equipo, promociones y preguntas). Vacía al momento la caché de lo público; la revalidación de 60 segundos queda de
 * respaldo. Protegido con el secreto compartido REVALIDAR_SECRETO (variable de servidor, nunca NEXT_PUBLIC_) en el
 * encabezado x-revalidar-secreto. Sin secreto configurado responde 404 (como si no existiera).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  const esperado = process.env.REVALIDAR_SECRETO;
  if ((esperado ?? '').trim().length < 32) return new Response(null, { status: 404 });
  if (!secretoValido(req.headers.get('x-revalidar-secreto'), esperado)) {
    return Response.json({ message: 'No autorizado' }, { status: 401 });
  }
  for (const etiqueta of ETIQUETAS_PUBLICAS) revalidateTag(etiqueta, { expire: 0 });
  return Response.json({ revalidado: true }, { headers: { 'Cache-Control': 'no-store' } });
}
