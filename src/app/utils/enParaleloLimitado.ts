type Tareas = readonly (() => Promise<unknown>)[];

/**
 * Ejecuta las tareas con como mucho `limite` a la vez y devuelve los resultados en el mismo
 * orden (como Promise.all, pero sin lanzar todas juntas). Si una tarea rechaza, rechaza.
 */
export async function enParaleloLimitado<T extends Tareas>(
  tareas: T,
  limite: number,
): Promise<{ -readonly [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const resultados: unknown[] = new Array(tareas.length);
  let siguiente = 0;
  const trabajador = async () => {
    while (siguiente < tareas.length) {
      const i = siguiente++;
      resultados[i] = await tareas[i]();
    }
  };
  const trabajadores = Array.from({ length: Math.max(1, Math.min(limite, tareas.length)) }, trabajador);
  await Promise.all(trabajadores);
  return resultados as { -readonly [K in keyof T]: Awaited<ReturnType<T[K]>> };
}
