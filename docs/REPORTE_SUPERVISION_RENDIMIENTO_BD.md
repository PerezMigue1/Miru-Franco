# Supervisión de rendimiento (para PDF)

Esta guía te ayuda a reunir evidencia real de monitoreo de PostgreSQL para cumplir el apartado de "Supervisión del rendimiento".

## 1) Evidencia de actividad / conexiones

```sql
SELECT pid,
       usename,
       datname,
       state,
       wait_event_type,
       wait_event,
       query_start,
       query
FROM pg_stat_activity
WHERE datname = current_database()
ORDER BY query_start DESC;
```

Qué poner en el PDF:
- captura de resultados;
- cuántas sesiones activas/idle había;
- si hubo consultas largas.

## 2) Ejemplo de lock o transacción abierta

### Simulación recomendada (2 sesiones)

Sesión A:
```sql
BEGIN;
UPDATE servicios
SET descripcion = descripcion
WHERE id = 1;
-- no hacer COMMIT todavía
```

Sesión B:
```sql
UPDATE servicios
SET descripcion = descripcion
WHERE id = 1;
-- esta consulta puede quedar esperando lock
```

Monitoreo de locks:
```sql
SELECT l.pid,
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
ORDER BY l.granted ASC, l.pid ASC;
```

Para cerrar la prueba:
```sql
ROLLBACK; -- o COMMIT en la sesión A
```

Qué poner en el PDF:
- captura del lock (granted true/false);
- explicación breve de quién bloquea y quién espera.

## 3) EXPLAIN (o equivalente) con interpretación

Ejemplo:
```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT *
FROM servicios
WHERE categoria = 'Alaciados'
LIMIT 200;
```

Qué interpretar en el PDF:
- si aparece `Seq Scan` (escaneo completo) o `Index Scan`;
- tiempo total de ejecución;
- recomendación breve (por ejemplo, índice por `categoria` si el filtro es frecuente).

## 4) Texto corto sugerido para el reporte

"Se monitoreó la base de datos PostgreSQL con consultas de actividad (`pg_stat_activity`) y bloqueo (`pg_locks`). Se observó el estado de sesiones activas, eventos de espera y transacciones en curso. Además, se ejecutó `EXPLAIN (ANALYZE, BUFFERS)` para evaluar el plan de ejecución de una consulta sobre la tabla `servicios`, identificando el tipo de escaneo y el costo/tiempo asociado para proponer mejoras de indexación."

