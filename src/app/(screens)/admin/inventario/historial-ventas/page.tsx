"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminLayout from "../../../../components/layouts/AdminLayout";
import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import Input from "../../../../components/ui/Input";
import Table, { TableCell, TableRow } from "../../../../components/ui/Table";
import {
  cargarLineasVentasDesdePedidosOnline,
  ESTADOS_PEDIDO_CONTABLES_VENTA,
  type LineaVentaProducto,
} from "../../../../utils/inventarioVentasOnline";
import { Search } from "lucide-react";

const PAGE_SIZE = 80;

const fmtFecha = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "short",
  timeStyle: "short",
});

const fmtMoneda = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

function coincideBusqueda(l: LineaVentaProducto, q: string): boolean {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  const ped = String(l.pedidoId);
  const pid = String(l.productoId);
  const nom = (l.nombreProducto ?? "").toLowerCase();
  return ped.includes(t) || pid.includes(t) || nom.includes(t);
}

/**
 * Listado de líneas de venta (pedidos online en estados contables) que usa la predicción.
 */
export default function InventarioHistorialVentasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [lineas, setLineas] = useState<LineaVentaProducto[]>([]);
  const [pedidosAnalizados, setPedidosAnalizados] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const pid = searchParams.get("producto");
    if (pid) setBusqueda(pid);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      const res = await cargarLineasVentasDesdePedidosOnline();
      if (cancelled) return;
      setLineas(res.lineas);
      setPedidosAnalizados(res.pedidosAnalizados);
      setError(res.error ?? null);
      setLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const ordenadas = useMemo(
    () =>
      [...lineas].sort(
        (a, b) =>
          new Date(b.fechaIso).getTime() - new Date(a.fechaIso).getTime(),
      ),
    [lineas],
  );

  const filtradas = useMemo(
    () => ordenadas.filter((l) => coincideBusqueda(l, busqueda)),
    [ordenadas, busqueda],
  );

  useEffect(() => {
    setPage(1);
  }, [busqueda]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const effectivePage = Math.min(page, totalPages);
  const slice = useMemo(() => {
    const start = (effectivePage - 1) * PAGE_SIZE;
    return filtradas.slice(start, start + PAGE_SIZE);
  }, [filtradas, effectivePage]);

  return (
    <AdminLayout>
      <div
        className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-8"
        style={{ color: "var(--menu-texto-principal)" }}
      >
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--encabezados-alterno)" }}
          >
            Inventario · líneas de venta
          </p>
          <Button
            variant="outline"
            className="shrink-0 w-full sm:w-auto"
            onClick={() => router.push("/admin/inventario/prediccion")}
          >
            Volver a predicción
          </Button>
        </header>

        <div>
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ color: "var(--menu-texto-principal)" }}
          >
            Historial de ventas (tienda online)
          </h1>
          <p
            className="text-sm mt-3 leading-relaxed max-w-3xl"
            style={{ color: "var(--encabezados-alterno)" }}
          >
            Mismas líneas que alimentan la predicción: pedidos en estados{" "}
            <span className="font-medium" style={{ color: "var(--menu-texto-principal)" }}>
              {ESTADOS_PEDIDO_CONTABLES_VENTA.join(", ")}
            </span>
            , con fecha de pedido, cantidad y subtotal por ítem.
            {pedidosAnalizados > 0 && !loading && (
              <>
                {" "}
                ({pedidosAnalizados} pedidos, {lineas.length} filas).
              </>
            )}
          </p>
        </div>

        <Card variant="elevated" padding="lg" className="rounded-2xl border-0 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
            <Input
              fullWidth
              label="Buscar"
              placeholder="Pedido, ID de producto o nombre…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              icon={<Search className="h-4 w-4" aria-hidden />}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          {loading ? (
            <p className="text-sm" style={{ color: "var(--encabezados-alterno)" }}>
              Cargando historial…
            </p>
          ) : filtradas.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--encabezados-alterno)" }}>
              {lineas.length === 0
                ? "No hay líneas en el rango de pedidos contables."
                : "Ninguna fila coincide con la búsqueda."}
            </p>
          ) : (
            <>
              <Table
                headersLegibles
                headers={[
                  "Fecha pedido",
                  "Pedido",
                  "Producto (ID)",
                  "Nombre",
                  "Cantidad",
                  "Subtotal",
                ]}
              >
                {slice.map((l, i) => {
                  const d = new Date(l.fechaIso);
                  const fechaTxt = Number.isNaN(d.getTime())
                    ? "—"
                    : fmtFecha.format(d);
                  return (
                    <TableRow
                      key={`${l.pedidoId}-${l.productoId}-${l.fechaIso}-${i}`}
                    >
                      <TableCell>{fechaTxt}</TableCell>
                      <TableCell className="font-mono tabular-nums">
                        #{l.pedidoId}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">
                        {String(l.productoId)}
                      </TableCell>
                      <TableCell className="whitespace-normal max-w-[min(280px,40vw)]">
                        {l.nombreProducto ?? "—"}
                      </TableCell>
                      <TableCell className="tabular-nums text-right">
                        {l.cantidad}
                      </TableCell>
                      <TableCell className="tabular-nums text-right">
                        {fmtMoneda.format(l.subtotal)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </Table>

              {totalPages > 1 && (
                <div
                  className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 text-sm"
                  style={{ color: "var(--encabezados-alterno)" }}
                >
                  <span>
                    Mostrando {(effectivePage - 1) * PAGE_SIZE + 1}–
                    {Math.min(effectivePage * PAGE_SIZE, filtradas.length)} de{" "}
                    {filtradas.length}
                  </span>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={effectivePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Anterior
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={effectivePage >= totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
