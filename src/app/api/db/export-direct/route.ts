/**
 * Exportación directa a la BD (Neon/PostgreSQL).
 * GET /api/db/export-direct?tabla=X&formato=Y
 * GET /api/db/export-direct → lista de tablas (JSON)
 * Requiere: DATABASE_URL, JWT_SECRET (opcional pero recomendado para verificar token).
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const TABLA_REGEX = /^[a-zA-Z0-9_]+$/;

function getAuthToken(request: NextRequest): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}

function verifyToken(token: string): { valid: boolean; error?: string } {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return { valid: true };
  }
  try {
    jwt.verify(token, secret);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Token inválido o expirado' };
  }
}

function getPool(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return new Pool({ connectionString: url, ssl: { rejectUnauthorized: true } });
}

/** GET sin params: lista de tablas. GET con tabla y formato: exporta. */
export async function GET(request: NextRequest) {
  const token = getAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });
  }
  const verification = verifyToken(token);
  if (!verification.valid) {
    return NextResponse.json({ error: verification.error }, { status: 401 });
  }

  const pool = getPool();
  if (!pool) {
    return NextResponse.json(
      { error: 'DATABASE_URL no configurada. Añádela en .env.local' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const tabla = searchParams.get('tabla');
  const formato = searchParams.get('formato') ?? 'json';
  const meta = searchParams.get('meta');
  const columnasParam = searchParams.get('columnas');
  const fechaDesde = searchParams.get('fechaDesde') ?? '';
  const fechaHasta = searchParams.get('fechaHasta') ?? '';
  const soloActivos = searchParams.get('soloActivos') === 'true';
  const explainColumna = searchParams.get('columna') ?? '';
  const explainValor = searchParams.get('valor') ?? '';

  try {
    if (meta === 'activity') {
      const activity = await pool.query<{
        pid: number;
        usename: string;
        datname: string;
        state: string | null;
        wait_event_type: string | null;
        wait_event: string | null;
        query_start: string | null;
        query: string | null;
      }>(
        `SELECT pid,
                usename,
                datname,
                state,
                wait_event_type,
                wait_event,
                query_start::text,
                query
         FROM pg_stat_activity
         WHERE datname = current_database()
         ORDER BY query_start DESC
         LIMIT 50`
      );
      return NextResponse.json({ rows: activity.rows });
    }

    if (meta === 'locks') {
      const locks = await pool.query<{
        pid: number;
        locktype: string;
        mode: string;
        granted: boolean;
        relation: string | null;
        state: string | null;
        wait_event_type: string | null;
        wait_event: string | null;
        query: string | null;
      }>(
        `SELECT l.pid,
                l.locktype,
                l.mode,
                l.granted,
                COALESCE(c.relname, l.relation::regclass::text) AS relation,
                a.state,
                a.wait_event_type,
                a.wait_event,
                a.query
         FROM pg_locks l
         LEFT JOIN pg_stat_activity a ON a.pid = l.pid
         LEFT JOIN pg_class c ON c.oid = l.relation
         WHERE a.datname = current_database()
         ORDER BY l.granted ASC, l.pid ASC
         LIMIT 100`
      );
      return NextResponse.json({ rows: locks.rows });
    }

    if (!tabla) {
      const listResult = await pool.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
         ORDER BY table_name`
      );
      const tablas = listResult.rows.map((r) => r.table_name);
      return NextResponse.json({ tablas });
    }

    if (!TABLA_REGEX.test(tabla)) {
      return NextResponse.json({ error: 'Nombre de tabla no válido' }, { status: 400 });
    }

    if (meta === '1') {
      const colResult = await pool.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = $1 
         ORDER BY ordinal_position`,
        [tabla]
      );
      const columnas = colResult.rows.map((r) => r.column_name);
      return NextResponse.json({ columnas });
    }

    if (meta === 'schema') {
      const colResult = await pool.query<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        character_maximum_length: number | null;
        numeric_precision: number | null;
        numeric_scale: number | null;
        column_default: string | null;
        is_identity: string;
        is_generated: string;
      }>(
        `SELECT column_name,
                data_type,
                is_nullable,
                character_maximum_length,
                numeric_precision,
                numeric_scale,
                column_default,
                is_identity,
                is_generated
         FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = $1 
         ORDER BY ordinal_position`,
        [tabla]
      );
      const columnas = colResult.rows.map((r) => ({
        nombre: r.column_name,
        tipo: r.data_type,
        nullable: r.is_nullable === 'YES',
        maxLength: r.character_maximum_length,
        numericPrecision: r.numeric_precision,
        numericScale: r.numeric_scale,
        porDefecto: r.column_default,
        identity: r.is_identity === 'YES' || r.is_generated === 'ALWAYS' || r.is_generated === 'BY DEFAULT',
      }));
      return NextResponse.json({ columnas });
    }

    if (meta === 'explain') {
      const colResult = await pool.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = $1 
         ORDER BY ordinal_position`,
        [tabla]
      );
      const columnasReales = colResult.rows.map((r) => r.column_name);
      if (!columnasReales.length) {
        return NextResponse.json({ error: 'Tabla sin columnas o inexistente' }, { status: 404 });
      }

      let query = `SELECT * FROM "${tabla}" LIMIT 200`;
      let explainParams: unknown[] = [];
      if (explainColumna && explainValor && columnasReales.includes(explainColumna)) {
        query = `SELECT * FROM "${tabla}" WHERE "${explainColumna}" = $1 LIMIT 200`;
        explainParams = [explainValor];
      }

      const explain = await pool.query<{ "QUERY PLAN": unknown }>(
        `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`,
        explainParams
      );
      const plan = explain.rows?.[0]?.["QUERY PLAN"] ?? null;
      return NextResponse.json({ plan, query });
    }

    if (formato !== 'json' && formato !== 'csv') {
      return NextResponse.json({ error: 'formato debe ser json o csv' }, { status: 400 });
    }

    const colResult = await pool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = $1 
       ORDER BY ordinal_position`,
      [tabla]
    );
    const columnasReales = colResult.rows.map((r) => r.column_name);
    let columnasSelect =
      columnasParam && columnasParam.trim()
        ? columnasParam
            .split(',')
            .map((c) => c.trim())
            .filter((c) => columnasReales.includes(c))
        : columnasReales;
    if (columnasSelect.length === 0) columnasSelect = columnasReales;

    const dateCol = columnasReales.find(
      (c) => c === 'created_at' || c === 'createdAt' || c === 'fecha_creacion' || c === 'fecha_creado'
    );
    const activoCol = columnasReales.find((c) => c === 'activo' || c === 'disponible');
    const estadoCol = columnasReales.find((c) => c === 'estado');

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;
    if (dateCol && (fechaDesde || fechaHasta)) {
      if (fechaDesde) {
        conditions.push(`"${dateCol}" >= $${paramIndex}`);
        params.push(fechaDesde);
        paramIndex++;
      }
      if (fechaHasta) {
        conditions.push(`"${dateCol}" <= $${paramIndex}`);
        params.push(fechaHasta + 'T23:59:59.999');
        paramIndex++;
      }
    }
    if (soloActivos) {
      if (activoCol) {
        conditions.push(`"${activoCol}" = true`);
      } else if (estadoCol) {
        conditions.push(`"${estadoCol}" = $${paramIndex}`);
        params.push('activo');
        paramIndex++;
      }
    }

    const selectList = columnasSelect.map((c) => `"${c}"`).join(', ');
    const whereClause = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT ${selectList} FROM "${tabla}"${whereClause}`;
    const result = await pool.query(query, params);
    const rows = result.rows as Record<string, unknown>[];

    if (formato === 'json') {
      const body = JSON.stringify(rows, null, 0);
      const filename = `${tabla}_${new Date().toISOString().slice(0, 10)}.json`;
      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    if (rows.length === 0) {
      const csv = '';
      const filename = `${tabla}_${new Date().toISOString().slice(0, 10)}.csv`;
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    const keys = Object.keys(rows[0] as object);
    const escape = (v: unknown): string => {
      const s = v == null ? '' : String(v);
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const header = keys.map(escape).join(',');
    const lines = rows.map((r) => keys.map((k) => escape((r as Record<string, unknown>)[k])).join(','));
    const csv = [header, ...lines].join('\r\n');
    const filename = `${tabla}_${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al consultar la base de datos';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (pool) await pool.end();
  }
}
