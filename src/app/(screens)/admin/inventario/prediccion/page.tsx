"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminLayout from "../../../../components/layouts/AdminLayout";
import Card from "../../../../components/ui/Card";
import Button from "../../../../components/ui/Button";
import Select from "../../../../components/ui/Select";
import Input from "../../../../components/ui/Input";
import Table, { TableCell, TableRow } from "../../../../components/ui/Table";
import Badge from "../../../../components/ui/Badge";
import { Drawer } from "../../../../components/ui/Drawer";
import { InventarioAnalisisCategoriasPanel } from "../../../../components/inventario/InventarioAnalisisCategoriasPanel";
import {
  getProductosSinRedirigir,
  type Producto,
} from "../../../../services/productos";
import {
  cargarLineasVentasDesdePedidosOnline,
  filtrarLineasDesdeFecha,
  filtrarLineasPorProducto,
  promedioUnidadesPorDia,
  proyeccionDemandaUnidades,
  type LineaVentaProducto,
} from "../../../../utils/inventarioVentasOnline";
import { parseCategoriaSub } from "../../../../utils/inventarioInteligente";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Package,
  ShoppingBag,
} from "lucide-react";

type EstadoPrediccion = "normal" | "preventivo" | "critico";

const AJUSTE_K_MODELO = 1;
const FILAS_VISIBLES_TABLA = 10;
const ALTO_FILA_PX = 44;
const ALTO_ENCABEZADO_PX = 44;

type UmbralModo = "auto" | "pct";

/** Bordes / fondos solo con variables de `globals.css` (cambian en `.dark`). */
const bordePanelPrediccion =
  "1px solid color-mix(in srgb, var(--tarjetas-paneles) 36%, transparent)";
const sombraPanelPrediccion =
  "0 12px 32px color-mix(in srgb, var(--menu-texto-principal) 10%, transparent)";
const fondoHeroPrediccion =
  "linear-gradient(165deg, color-mix(in srgb, var(--tarjetas-paneles) 14%, var(--fondos-suaves)) 0%, var(--superficie-elevada) 56%)";

interface PrediccionProducto {
  id: string | number;
  nombre: string;
  marca: string;
  x0: number;
  k: number;
  xT: number;
  estado: EstadoPrediccion;
  recomendacion: string;
  cambioPct: number;
}

interface PuntoGrafica {
  dia: number;
  valor: number;
}

function estimarKPorProducto(producto: Producto): number {
  const stock = Math.max(0, producto.stockCantidad ?? 0);
  if (stock >= 25) return -0.01;
  if (stock >= 10) return -0.02;
  if (stock > 0) return -0.035;
  return -0.05;
}

function estadoDesdePrediccion(xT: number, xMin: number): EstadoPrediccion {
  if (xT <= xMin) return "critico";
  if (xT <= xMin * 1.5) return "preventivo";
  return "normal";
}

function estadoBadge(estado: EstadoPrediccion): {
  variant: "success" | "warning" | "danger";
  label: string;
} {
  if (estado === "critico") return { variant: "danger", label: "Crítico" };
  if (estado === "preventivo")
    return { variant: "warning", label: "Preventivo" };
  return { variant: "success", label: "Normal" };
}

type MetricaVentaProd = { unidades: number; promD: number; demH: number };

function cruceModeloVentas(
  p: PrediccionProducto,
  mv: MetricaVentaProd,
  umbralAlerta: number,
): { variant: "success" | "warning" | "danger" | "default"; label: string } {
  if (mv.unidades === 0) {
    if (p.estado === "critico") {
      return { variant: "warning", label: "Bajo stock, sin ventas" };
    }
    return { variant: "default", label: "Sin ventas" };
  }
  if (mv.demH > p.xT + 0.01 && mv.demH > umbralAlerta) {
    return { variant: "warning", label: "Ventas > modelo" };
  }
  if (
    (p.estado === "critico" || p.estado === "preventivo") &&
    mv.unidades >= 3
  ) {
    return { variant: "danger", label: "Se vende y cae stock" };
  }
  if (p.estado === "normal" && mv.demH <= p.x0 + 0.01)
    return { variant: "success", label: "Alineado" };
  return { variant: "default", label: "Revisar" };
}

type SugerenciaCelda = { accion: string; detalle: string };

function sugerenciaAccion(
  p: PrediccionProducto,
  mv: MetricaVentaProd,
  horizonteDias: number,
): SugerenciaCelda {
  const detalle =
    mv.unidades > 0
      ? `${mv.unidades} u. en el período · extrapolación ~${mv.demH.toFixed(0)} u. en ${horizonteDias} d.`
      : "Sin ventas en este período; cambia el rango o revisa movimiento.";
  return { accion: p.recomendacion, detalle };
}

function sugerenciaExportText(s: SugerenciaCelda): string {
  return `${s.accion} ${s.detalle}`;
}

function productoPerteneceFiltroCatSub(
  p: Producto,
  cat: string,
  sub: string,
): boolean {
  const { categoriaPrincipal, subcategoria } = parseCategoriaSub(
    p.categoria || "",
  );
  const okCat = !cat || categoriaPrincipal === cat;
  const okSub = !sub || subcategoria === sub;
  return okCat && okSub;
}

function umbralAlertaAutomatico(productos: Producto[]): number {
  if (productos.length === 0) return 5;
  const stocks = productos
    .map((p) => Math.max(0, p.stockCantidad ?? 0))
    .filter((s) => s > 0)
    .sort((a, b) => a - b);
  if (stocks.length === 0) return 5;
  const mid = stocks[Math.floor(stocks.length / 2)] ?? stocks[0];
  return Math.max(3, Math.min(40, Math.round(mid * 0.12)));
}

export default function PrediccionInventarioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lineasVentas, setLineasVentas] = useState<LineaVentaProducto[]>([]);
  const [pedidosVentasCount, setPedidosVentasCount] = useState(0);
  const [errorVentas, setErrorVentas] = useState<string | null>(null);
  /** Ventas recientes y horizonte de proyección van unidos: mismo número de días. */
  const [periodoDias, setPeriodoDias] = useState<7 | 30 | 90>(30);
  const diasVentanaVentas = periodoDias;
  const horizonteDias = periodoDias;
  const [umbralModo, setUmbralModo] = useState<UmbralModo>("auto");
  const [umbralPct, setUmbralPct] = useState(25);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getProductosSinRedirigir({ incluirNoDisponibles: true }),
      cargarLineasVentasDesdePedidosOnline(),
    ])
      .then(([prodRes, ventasRes]) => {
        if (cancelled) return;
        setProductos(prodRes.data);
        setError(prodRes.error);
        setLineasVentas(ventasRes.lineas);
        setPedidosVentasCount(ventasRes.pedidosAnalizados);
        setErrorVentas(ventasRes.error ?? null);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Error al cargar datos");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const pid = searchParams.get("producto");
    if (!pid || productos.length === 0) return;
    const exists = productos.some((p) => String(p.id) === String(pid));
    if (!exists) return;
    const sp = new URLSearchParams(searchParams.toString());
    if (!sp.has("tab")) return;
    sp.delete("tab");
    router.replace(`/admin/inventario/prediccion?${sp.toString()}`, {
      scroll: false,
    });
  }, [searchParams, productos, router]);

  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [productoFiltroId, setProductoFiltroId] = useState("");

  const categoriasFiltroOpciones = useMemo(() => {
    const s = new Set<string>();
    for (const p of productos) {
      const { categoriaPrincipal } = parseCategoriaSub(p.categoria || "");
      if (categoriaPrincipal && categoriaPrincipal !== "Sin categoría")
        s.add(categoriaPrincipal);
    }
    return [
      { value: "", label: "Todas las categorías" },
      ...Array.from(s)
        .sort((a, b) => a.localeCompare(b))
        .map((c) => ({ value: c, label: c })),
    ];
  }, [productos]);

  /** Sin subcategoría en el filtro: al elegir categoría entran todos los productos de esa rama (cualquier sub). */
  const productosTrasCategoria = useMemo(
    () =>
      productos.filter((p) =>
        productoPerteneceFiltroCatSub(p, categoriaFiltro, ""),
      ),
    [productos, categoriaFiltro],
  );

  const productoFiltroIdActivo = useMemo(() => {
    if (!productoFiltroId) return "";
    return productosTrasCategoria.some((p) => String(p.id) === productoFiltroId)
      ? productoFiltroId
      : "";
  }, [productosTrasCategoria, productoFiltroId]);

  const productosVista = useMemo(() => {
    if (!productoFiltroIdActivo) return productosTrasCategoria;
    return productosTrasCategoria.filter(
      (p) => String(p.id) === productoFiltroIdActivo,
    );
  }, [productosTrasCategoria, productoFiltroIdActivo]);

  const productosFiltroOpciones = useMemo(
    () => [
      { value: "", label: "Todos los productos" },
      ...productosTrasCategoria.map((p) => ({
        value: String(p.id),
        label: p.nombre,
      })),
    ],
    [productosTrasCategoria],
  );

  const hayFiltrosCatalogo = Boolean(categoriaFiltro || productoFiltroIdActivo);

  const stockMinimoAuto = useMemo(
    () => umbralAlertaAutomatico(productosVista),
    [productosVista],
  );

  const umbralParaX0 = useCallback(
    (x0: number) =>
      umbralModo === "auto"
        ? stockMinimoAuto
        : Math.max(1, Math.round((umbralPct / 100) * x0)),
    [umbralModo, umbralPct, stockMinimoAuto],
  );

  const predicciones = useMemo<PrediccionProducto[]>(() => {
    return productosVista.map((p) => {
      const x0 = Math.max(0, p.stockCantidad ?? 0);
      const kBase = estimarKPorProducto(p);
      const k = kBase * AJUSTE_K_MODELO;
      const xT = x0 * Math.exp(k * horizonteDias);
      const cambioPct = x0 > 0 ? ((xT - x0) / x0) * 100 : 0;
      const estado = estadoDesdePrediccion(xT, umbralParaX0(x0));
      const recomendacion =
        estado === "critico"
          ? "Reabastecer ya."
          : estado === "preventivo"
            ? "Programar compra."
            : "Monitoreo normal.";

      return {
        id: p.id,
        nombre: p.nombre,
        marca: p.marca && p.marca.trim() ? p.marca.trim() : "Sin marca",
        x0,
        k,
        xT,
        cambioPct,
        estado,
        recomendacion,
      };
    });
  }, [productosVista, horizonteDias, umbralParaX0]);

  const criticos = predicciones.filter((p) => p.estado === "critico").length;
  const preventivos = predicciones.filter(
    (p) => p.estado === "preventivo",
  ).length;
  const normales = predicciones.filter((p) => p.estado === "normal").length;
  const topRiesgo = [...predicciones].sort((a, b) => a.xT - b.xT).slice(0, 5);

  const restockGlobal = useMemo(() => {
    if (predicciones.length === 0) {
      return {
        dias: null as number | null,
        nombre: null as string | null,
        urgente: false,
        stockProyectadoPeor: null as number | null,
      };
    }
    const bajoUmbral = predicciones.filter(
      (p) => p.xT <= umbralParaX0(p.x0),
    );
    if (bajoUmbral.length > 0) {
      const worst = bajoUmbral.reduce((a, b) => (a.xT <= b.xT ? a : b));
      return {
        dias: 0,
        nombre: worst.nombre,
        urgente: true,
        stockProyectadoPeor: worst.xT,
      };
    }
    let minDias = Number.POSITIVE_INFINITY;
    let nombre: string | null = null;
    for (const p of predicciones) {
      const delta = (p.xT - p.x0) / Math.max(1, horizonteDias);
      if (delta >= -1e-12) continue;
      const dias = (p.x0 - umbralParaX0(p.x0)) / -delta;
      if (dias > 0 && dias < minDias) {
        minDias = dias;
        nombre = p.nombre;
      }
    }
    if (!Number.isFinite(minDias) || minDias > 36500) {
      return {
        dias: null,
        nombre: null,
        urgente: false,
        stockProyectadoPeor: null,
      };
    }
    return {
      dias: Math.round(minDias),
      nombre,
      urgente: false,
      stockProyectadoPeor: null,
    };
  }, [predicciones, horizonteDias, umbralParaX0]);

  const validacion = useMemo(() => {
    const sinNegativos = predicciones.every((p) => p.xT >= 0);
    const decrecimientoEsperado = predicciones.every((p) =>
      p.k < 0 ? p.xT <= p.x0 + 0.0001 : true,
    );
    const total = predicciones.length;
    const cumple = [sinNegativos, decrecimientoEsperado].filter(Boolean).length;
    const reglas = [
      {
        ok: sinNegativos,
        titulo: "Stock futuro ≥ 0",
        ayuda: "Proyección no negativa.",
      },
      {
        ok: decrecimientoEsperado,
        titulo: "Stock no sube solo",
        ayuda: "Con el modelo, el stock debería bajar o mantenerse.",
      },
    ] as const;
    return {
      totalReglas: 2,
      cumple,
      ok: total > 0 && cumple === 2,
      reglas,
      resumen:
        total === 0
          ? "Sin productos en vista."
          : cumple === 2
            ? "Comprobaciones OK."
            : "Revisa datos del catálogo.",
    };
  }, [predicciones]);

  const curvaAgregada = useMemo(() => {
    if (predicciones.length === 0) return null;
    const x0 = predicciones.reduce((s, p) => s + p.x0, 0);
    if (x0 <= 0) {
      const p0 = predicciones[0];
      return {
        x0: p0.x0,
        k: p0.k,
        subtitulo: hayFiltrosCatalogo
          ? `Vista: ${p0.nombre}`
          : `Ref: ${p0.nombre}`,
      } as const;
    }
    let kPonderado = 0;
    for (const p of predicciones) {
      kPonderado += p.k * p.x0;
    }
    const k = kPonderado / x0;
    return {
      x0,
      k,
      subtitulo: hayFiltrosCatalogo
        ? "Stock total · vista filtrada"
        : "Stock total · catálogo",
    } as const;
  }, [predicciones, hayFiltrosCatalogo]);

  const umbralLineaGrafica = useMemo(() => {
    if (umbralModo === "auto") return stockMinimoAuto;
    const xTot = curvaAgregada?.x0;
    if (xTot == null || xTot <= 0) return stockMinimoAuto;
    return Math.max(1, Math.round((umbralPct / 100) * xTot));
  }, [umbralModo, umbralPct, stockMinimoAuto, curvaAgregada]);

  const puntosCurvaDensa = useMemo<PuntoGrafica[]>(() => {
    if (!curvaAgregada) return [];
    const H = horizonteDias;
    const maxPts = 90;
    const step = H <= maxPts ? 1 : Math.ceil(H / maxPts);
    const out: PuntoGrafica[] = [];
    for (let d = 0; d <= H; d += step) {
      out.push({
        dia: d,
        valor: curvaAgregada.x0 * Math.exp(curvaAgregada.k * d),
      });
    }
    if (out[out.length - 1]?.dia !== H) {
      out.push({
        dia: H,
        valor: curvaAgregada.x0 * Math.exp(curvaAgregada.k * H),
      });
    }
    return out;
  }, [curvaAgregada, horizonteDias]);

  const graficaReserva = useMemo(() => {
    const pts = puntosCurvaDensa;
    if (pts.length === 0) return null;
    const width = 640;
    const height = 260;
    const padL = 56;
    const padR = 24;
    const padT = 28;
    const padB = 48;
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const valores = pts.map((p) => p.valor);
    const maxY = Math.max(...valores, umbralLineaGrafica, 1);
    const minY = 0;
    const yRange = Math.max(maxY - minY, 1e-9);
    const xMax = Math.max(...pts.map((p) => p.dia), 1);
    const toX = (d: number) => padL + (d / xMax) * innerW;
    const toY = (v: number) => padT + innerH - ((v - minY) / yRange) * innerH;
    const path = pts
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${toX(p.dia).toFixed(1)} ${toY(p.valor).toFixed(1)}`,
      )
      .join(" ");
    const yThreshold = toY(umbralLineaGrafica);
    const tickVals = [0, Math.round(maxY / 2), Math.round(maxY)];
    return {
      width,
      height,
      path,
      pts,
      toX,
      toY,
      yThreshold,
      padL,
      padT,
      innerW,
      innerH,
      maxY,
      minY,
      xMax,
      tickVals,
      fmtEjeY: (v: number) =>
        Math.abs(v) >= 1000
          ? `${Math.round(v / 1000)}k`
          : String(Math.round(v)),
    };
  }, [puntosCurvaDensa, umbralLineaGrafica]);

  const fechaRestock = useMemo(() => {
    if (restockGlobal.dias === null) return null;
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    t.setDate(t.getDate() + restockGlobal.dias);
    return t;
  }, [restockGlobal.dias]);

  /** Punto de la curva agregada usado como referencia rápida (tope 30 d o el período si es menor). */
  const diasReferenciaCurva = useMemo(
    () => Math.min(30, horizonteDias),
    [horizonteDias],
  );

  const stockProyectado30Ref = useMemo(() => {
    if (!curvaAgregada) return null;
    return curvaAgregada.x0 * Math.exp(curvaAgregada.k * diasReferenciaCurva);
  }, [curvaAgregada, diasReferenciaCurva]);

  const desdeVentas = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - diasVentanaVentas);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [diasVentanaVentas]);

  const lineasVentanaVentas = useMemo(
    () => filtrarLineasDesdeFecha(lineasVentas, desdeVentas),
    [lineasVentas, desdeVentas],
  );

  const idsProductosVista = useMemo(
    () =>
      new Set(productosVista.map((p) => String(p.id).trim()).filter(Boolean)),
    [productosVista],
  );

  const lineasVentanaFiltradas = useMemo(
    () =>
      lineasVentanaVentas.filter((l) =>
        idsProductosVista.has(String(l.productoId).trim()),
      ),
    [lineasVentanaVentas, idsProductosVista],
  );

  const contextoPedidos = useMemo(() => {
    if (!hayFiltrosCatalogo) {
      const u = lineasVentanaVentas.reduce((s, l) => s + l.cantidad, 0);
      return {
        unidades: u,
        lineas: lineasVentanaVentas.length,
        /** Conteo explícito de `cargarLineasVentasDesdePedidosOnline` (listarPedidos + ítems). */
        pedidos: pedidosVentasCount,
        dias: diasVentanaVentas,
      };
    }
    const u = lineasVentanaFiltradas.reduce((s, l) => s + l.cantidad, 0);
    const pedidosFiltrados = new Set(
      lineasVentanaFiltradas.map((l) => l.pedidoId),
    ).size;
    return {
      unidades: u,
      lineas: lineasVentanaFiltradas.length,
      pedidos: pedidosFiltrados,
      dias: diasVentanaVentas,
    };
  }, [
    hayFiltrosCatalogo,
    lineasVentanaVentas,
    lineasVentanaFiltradas,
    pedidosVentasCount,
    diasVentanaVentas,
  ]);

  const stockTotalCatalogo = useMemo(
    () => predicciones.reduce((sum, p) => sum + p.x0, 0),
    [predicciones],
  );
  const promedioDiarioVentasGlobal = useMemo(() => {
    const d = Math.max(1, contextoPedidos.dias);
    return contextoPedidos.unidades / d;
  }, [contextoPedidos.dias, contextoPedidos.unidades]);

  const metricasVentasPorProducto = useMemo(() => {
    const m = new Map<string, MetricaVentaProd>();
    for (const p of predicciones) {
      const pid = String(p.id).trim();
      if (!pid) continue;
      const lines = filtrarLineasPorProducto(lineasVentanaFiltradas, p.id);
      const unidades = lines.reduce((s, l) => s + l.cantidad, 0);
      const promD = promedioUnidadesPorDia(lines);
      const demH = proyeccionDemandaUnidades(promD, horizonteDias);
      m.set(pid, { unidades, promD, demH });
    }
    return m;
  }, [predicciones, lineasVentanaFiltradas, horizonteDias]);

  const drawerProductoId = useMemo(() => {
    const raw = searchParams.get("producto");
    if (!raw || productos.length === 0) return null;
    return productos.some((p) => String(p.id) === String(raw)) ? raw : null;
  }, [searchParams, productos]);

  const abrirDetalleProducto = (id: string | number) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("tab");
    sp.set("producto", String(id));
    router.replace(`/admin/inventario/prediccion?${sp.toString()}`, {
      scroll: false,
    });
  };

  const cerrarDrawerProducto = () => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("tab");
    if (!sp.has("producto")) return;
    sp.delete("producto");
    const q = sp.toString();
    router.replace(
      q ? `/admin/inventario/prediccion?${q}` : "/admin/inventario/prediccion",
      { scroll: false },
    );
  };

  const drawerTitulo = useMemo(() => {
    if (!drawerProductoId) return "Detalle de producto";
    const p = productos.find((x) => String(x.id) === drawerProductoId);
    return p ? `Consumo y reorden · ${p.nombre}` : "Detalle de producto";
  }, [drawerProductoId, productos]);

  const exportarCsv = () => {
    const headers = [
      "producto",
      "marca",
      "stock_actual",
      `unidades_vendidas_${diasVentanaVentas}_dias`,
      `demanda_desde_ventas_${horizonteDias}_dias`,
      `stock_proyectado_modelo_${horizonteDias}_dias`,
      "variacion_stock_pct",
      "alerta_modelo",
      "comparacion_ventas_vs_modelo",
      "sugerencia",
    ];
    const rows = predicciones.map((p) => {
      const mv = metricasVentasPorProducto.get(String(p.id).trim()) ?? {
        unidades: 0,
        promD: 0,
        demH: 0,
      };
      const cr = cruceModeloVentas(p, mv, umbralParaX0(p.x0));
      const q = sugerenciaExportText(sugerenciaAccion(p, mv, horizonteDias));
      return [
        `"${p.nombre.replace(/"/g, '""')}"`,
        `"${p.marca.replace(/"/g, '""')}"`,
        p.x0.toFixed(2),
        String(mv.unidades),
        mv.demH.toFixed(2),
        p.xT.toFixed(2),
        p.cambioPct.toFixed(2),
        p.estado,
        `"${cr.label.replace(/"/g, '""')}"`,
        `"${q.replace(/"/g, '""')}"`,
      ];
    });
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prediccion-inventario-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const superficieCard: CSSProperties = {
    backgroundColor: "var(--superficie-elevada)",
    border: bordePanelPrediccion,
    boxShadow: sombraPanelPrediccion,
  };

  const kpiTileStyle: CSSProperties = {
    ...superficieCard,
    borderRadius: "1rem",
    minHeight: "6.5rem",
  };

  const sutilDivisor: CSSProperties = {
    borderColor: "color-mix(in srgb, var(--tarjetas-paneles) 32%, transparent)",
  };

  const chartWellStyle: CSSProperties = {
    backgroundColor:
      "color-mix(in srgb, var(--fondos-suaves) 40%, var(--superficie-elevada))",
    border:
      "1px solid color-mix(in srgb, var(--tarjetas-paneles) 28%, transparent)",
    borderRadius: "0.75rem",
  };

  return (
    <AdminLayout>
      <div
        className="w-full max-w-none min-w-0 rounded-2xl px-4 pt-4 sm:pt-6 lg:pt-8 space-y-7 sm:space-y-8 pb-10 sm:pb-12"
        style={{
          backgroundColor: "var(--fondo-general)",
          border: bordePanelPrediccion,
        }}
      >
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.14em] order-2 sm:order-1"
            style={{ color: "var(--encabezados-alterno)" }}
          >
            Inventario · predicción
          </p>
          <Button
            variant="outline"
            className="shrink-0 w-full sm:w-auto order-1 sm:order-2"
            onClick={() => router.push("/admin/inventario")}
          >
            Volver a inventario
          </Button>
        </header>

        <section
          className="rounded-2xl px-4 py-7 md:py-9 mb-1 overflow-hidden"
          style={{
            ...superficieCard,
            background: fondoHeroPrediccion,
          }}
        >
          <div className="min-w-0">
            <h1
              className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight"
              style={{ color: "var(--menu-texto-principal)" }}
            >
              Predicción del inventario
            </h1>
            <p
              className="text-sm mt-3 max-w-xl leading-relaxed"
              style={{ color: "var(--encabezados-alterno)" }}
            >
              Pedidos online + stock del catálogo. Elige 7, 30 o 90 días.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mt-9 sm:mt-10">
            <div className="flex gap-4 items-center p-4" style={kpiTileStyle}>
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--iconografia) 30%, var(--superficie-elevada))",
                }}
              >
                <Package
                  className="h-7 w-7"
                  style={{ color: "var(--logo-branding)" }}
                  aria-hidden
                />
              </div>
              <div className="min-w-0">
                <p
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: "var(--encabezados-alterno)" }}
                >
                  Unidades vendidas
                </p>
                <p
                  className="text-2xl md:text-3xl font-bold tabular-nums"
                  style={{ color: "var(--menu-texto-principal)" }}
                >
                  {loading ? "…" : contextoPedidos.unidades}
                </p>
                <p
                  className="text-xs mt-1 leading-snug"
                  style={{ color: "var(--encabezados-alterno)" }}
                >
                  {hayFiltrosCatalogo
                    ? `Vista · últimos ${contextoPedidos.dias} d`
                    : `Global · últimos ${contextoPedidos.dias} d`}
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-center p-4" style={kpiTileStyle}>
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--enlaces-textos-interactivos) 18%, var(--superficie-elevada))",
                }}
              >
                <ShoppingBag
                  className="h-7 w-7"
                  style={{ color: "var(--enlaces-textos-interactivos)" }}
                  aria-hidden
                />
              </div>
              <div className="min-w-0">
                <p
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: "var(--encabezados-alterno)" }}
                >
                  Pedidos analizados
                </p>
                <p
                  className="text-2xl md:text-3xl font-bold tabular-nums"
                  style={{ color: "var(--menu-texto-principal)" }}
                >
                  {loading ? "…" : contextoPedidos.pedidos}
                </p>
                <p
                  className="text-xs mt-1 leading-snug"
                  style={{ color: "var(--encabezados-alterno)" }}
                >
                  {hayFiltrosCatalogo
                    ? `Pedidos con líneas en vista · ${contextoPedidos.dias} d`
                    : `Pedidos contables (API). Unidades: últimos ${contextoPedidos.dias} d`}
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-center p-4" style={kpiTileStyle}>
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--success) 20%, var(--superficie-elevada))",
                }}
              >
                <Activity
                  className="h-7 w-7"
                  style={{ color: "var(--success)" }}
                  aria-hidden
                />
              </div>
              <div className="min-w-0">
                <p
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: "var(--encabezados-alterno)" }}
                >
                  Promedio diario
                </p>
                <p
                  className="text-2xl md:text-3xl font-bold tabular-nums"
                  style={{ color: "var(--menu-texto-principal)" }}
                >
                  {loading ? "…" : promedioDiarioVentasGlobal.toFixed(1)}
                </p>
                <p
                  className="text-xs mt-1 leading-snug"
                  style={{ color: "var(--encabezados-alterno)" }}
                >
                  {hayFiltrosCatalogo
                    ? "Media diaria (vista)"
                    : "Media diaria (ventana)"}
                </p>
              </div>
            </div>
          </div>
          {!loading &&
            !errorVentas &&
            lineasVentas.length === 0 &&
            pedidosVentasCount === 0 && (
              <p
                className="text-xs mt-4 max-w-2xl leading-snug rounded-lg border px-3 py-2"
                style={{
                  borderColor: "var(--logo-branding)",
                  color: "var(--menu-texto-principal)",
                  backgroundColor:
                    "color-mix(in srgb, var(--fondos-suaves) 55%, var(--superficie-elevada))",
                }}
              >
                Sin pedidos con ítems (pagado → entregado). Revisa el aviso de
                pedidos abajo o <strong>90 días</strong>.
              </p>
            )}
          {!loading &&
            !errorVentas &&
            lineasVentas.length === 0 &&
            pedidosVentasCount > 0 && (
              <p
                className="text-xs mt-4 max-w-2xl leading-snug rounded-lg border px-3 py-2"
                style={{
                  borderColor: "var(--warning)",
                  color: "var(--menu-texto-principal)",
                  backgroundColor:
                    "color-mix(in srgb, var(--warning) 12%, var(--superficie-elevada))",
                }}
              >
                {pedidosVentasCount} pedido(s) sin líneas: revisa ítems en el
                API.
              </p>
            )}
          {!loading &&
            !errorVentas &&
            lineasVentas.length > 0 &&
            lineasVentanaVentas.length === 0 && (
              <p
                className="text-xs mt-4 max-w-2xl leading-snug rounded-lg border px-3 py-2"
                style={{
                  borderColor: "var(--logo-branding)",
                  color: "var(--menu-texto-principal)",
                  backgroundColor:
                    "color-mix(in srgb, var(--fondos-suaves) 55%, var(--superficie-elevada))",
                }}
              >
                Ningún pedido en los últimos <strong>{periodoDias} d</strong>.
                Prueba <strong>90 días</strong>.
              </p>
            )}
        </section>

        {error && (
          <Card
            className="mb-6 border-l-4"
            padding="md"
            style={{
              borderLeftColor: "var(--danger)",
              backgroundColor:
                "color-mix(in srgb, var(--danger) 6%, var(--superficie-elevada))",
            }}
          >
            <p
              className="text-sm font-medium"
              style={{ color: "var(--danger)" }}
            >
              {error}
            </p>
          </Card>
        )}
        {errorVentas && (
          <Card
            className="mb-6 border-l-4"
            padding="md"
            style={{
              borderLeftColor: "var(--warning)",
              backgroundColor:
                "color-mix(in srgb, var(--warning) 8%, var(--superficie-elevada))",
            }}
          >
            <p
              className="text-sm font-medium"
              style={{ color: "var(--menu-texto-principal)" }}
            >
              Pedidos: {errorVentas}
            </p>
          </Card>
        )}

        <div className="rounded-2xl p-4 space-y-4" style={superficieCard}>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span
              className="text-sm font-semibold shrink-0"
              style={{ color: "var(--menu-texto-principal)" }}
            >
              Período
            </span>
            {([7, 30, 90] as const).map((d) => (
              <Button
                key={d}
                type="button"
                size="sm"
                variant={periodoDias === d ? "primary" : "outline"}
                onClick={() => setPeriodoDias(d)}
              >
                {d} días
              </Button>
            ))}
            <span
              className="text-xs w-full sm:w-auto sm:ml-1"
              style={{ color: "var(--encabezados-alterno)" }}
            >
              {umbralModo === "auto" ? (
                <>
                  Umbral:{" "}
                  <strong style={{ color: "var(--menu-texto-principal)" }}>
                    {stockMinimoAuto} u.
                  </strong>{" "}
                  (auto)
                </>
              ) : (
                <>
                  SKU{" "}
                  <strong style={{ color: "var(--menu-texto-principal)" }}>
                    {umbralPct}%
                  </strong>{" "}
                  de cada x₀ · total (gráfico):{" "}
                  <strong style={{ color: "var(--menu-texto-principal)" }}>
                    {umbralLineaGrafica} u.
                  </strong>
                </>
              )}
            </span>
            {validacion.ok ? (
              <Badge variant="success" size="sm" className="sm:ml-auto">
                OK
              </Badge>
            ) : (
              <Badge variant="warning" size="sm" className="sm:ml-auto">
                Revisar
              </Badge>
            )}
          </div>
          <div
            className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-end border-t pt-3"
            style={sutilDivisor}
          >
            <Select
              label="Umbral de alerta"
              options={[
                { value: "auto", label: "Automático (catálogo)" },
                { value: "pct", label: "% del stock inicial (por SKU)" },
              ]}
              value={umbralModo}
              onChange={(e) =>
                setUmbralModo(e.target.value === "pct" ? "pct" : "auto")
              }
              className="sm:max-w-xs"
            />
            {umbralModo === "pct" ? (
              <Input
                label="% sobre x₀"
                type="number"
                min={1}
                max={99}
                value={umbralPct}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") return;
                  const n = parseInt(raw, 10);
                  if (!Number.isFinite(n)) return;
                  setUmbralPct(Math.min(99, Math.max(1, n)));
                }}
                className="max-w-[7.5rem]"
              />
            ) : null}
          </div>
        </div>

        <Card
          variant="elevated"
          padding="md"
          className="mb-6 rounded-2xl border-0"
          style={superficieCard}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--menu-texto-principal)" }}
            >
              Filtros
            </h3>
            {hayFiltrosCatalogo ? (
              <Badge variant="warning" size="sm">
                Vista acotada
              </Badge>
            ) : (
              <Badge variant="success" size="sm">
                Todo
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-end">
            <Select
              label="Categoría"
              options={categoriasFiltroOpciones}
              value={categoriaFiltro}
              onChange={(e) => {
                setCategoriaFiltro(e.target.value);
                setProductoFiltroId("");
              }}
              fullWidth
            />
            <Select
              label="Producto"
              options={productosFiltroOpciones}
              value={productoFiltroIdActivo}
              onChange={(e) => setProductoFiltroId(e.target.value)}
              fullWidth
            />
            <Button
              type="button"
              variant="outline"
              className="w-full self-stretch h-[46px] shrink-0"
              onClick={() => {
                setCategoriaFiltro("");
                setProductoFiltroId("");
              }}
            >
              Limpiar filtros
            </Button>
          </div>
          <p
            className="text-xs mt-2"
            style={{ color: "var(--encabezados-alterno)" }}
          >
            Con filtros, el resumen y la tabla usan solo esa selección.
          </p>
        </Card>

        <div
          id="seccion-modulo-prediccion"
          className="space-y-6 mb-6 scroll-mt-24"
        >
          <div className="pb-5 mb-1 border-b" style={sutilDivisor}>
            <h2
              className="text-lg sm:text-xl font-semibold tracking-tight"
              style={{ color: "var(--menu-texto-principal)" }}
            >
              Resultados
            </h2>
            <p
              className="text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed"
              style={{ color: "var(--encabezados-alterno)" }}
            >
              Curva = stock total proyectado. «Ver» = consumo del producto.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            <aside className="lg:col-span-4 space-y-6">
              <Card
                variant="elevated"
                padding="lg"
                className="rounded-2xl border-0"
                style={superficieCard}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h3
                    className="text-base font-semibold"
                    style={{ color: "var(--menu-texto-principal)" }}
                  >
                    Resumen
                  </h3>
                  <Badge variant="warning" size="sm">
                    {predicciones.length} productos
                  </Badge>
                </div>
                <dl className="text-sm">
                  <div className="flex justify-between gap-3 py-3 first:pt-0">
                    <dt style={{ color: "var(--encabezados-alterno)" }}>
                      Período activo
                    </dt>
                    <dd
                      className="font-semibold tabular-nums"
                      style={{ color: "var(--menu-texto-principal)" }}
                    >
                      {periodoDias} días
                    </dd>
                  </div>
                  <div
                    className="flex justify-between gap-3 py-3 border-t"
                    style={sutilDivisor}
                  >
                    <dt style={{ color: "var(--encabezados-alterno)" }}>
                      {umbralModo === "auto"
                        ? "Umbral (auto)"
                        : `Umbral (${umbralPct}% x₀)`}
                    </dt>
                    <dd
                      className="font-semibold tabular-nums"
                      style={{ color: "var(--menu-texto-principal)" }}
                    >
                      {umbralModo === "auto"
                        ? `${stockMinimoAuto} u.`
                        : `${umbralLineaGrafica} u. (total)`}
                    </dd>
                  </div>
                  <div
                    className="flex justify-between gap-3 py-3 border-t"
                    style={sutilDivisor}
                  >
                    <dt style={{ color: "var(--encabezados-alterno)" }}>
                      Líneas de pedido
                    </dt>
                    <dd
                      className="font-semibold tabular-nums"
                      style={{ color: "var(--menu-texto-principal)" }}
                    >
                      {loading
                        ? "…"
                        : hayFiltrosCatalogo
                          ? lineasVentanaFiltradas.length
                          : lineasVentanaVentas.length}
                    </dd>
                  </div>
                  <div
                    className="flex justify-between gap-3 py-3 border-t"
                    style={sutilDivisor}
                  >
                    <dt style={{ color: "var(--encabezados-alterno)" }}>
                      Unidades (ventana)
                    </dt>
                    <dd
                      className="font-semibold tabular-nums"
                      style={{ color: "var(--menu-texto-principal)" }}
                    >
                      {loading ? "…" : `${contextoPedidos.unidades} u.`}
                    </dd>
                  </div>
                  <div
                    className="flex justify-between gap-3 py-3 border-t"
                    style={sutilDivisor}
                  >
                    <dt style={{ color: "var(--encabezados-alterno)" }}>
                      {hayFiltrosCatalogo
                        ? "Stock en vista (suma)"
                        : "Stock en catálogo (suma)"}
                    </dt>
                    <dd
                      className="font-semibold tabular-nums"
                      style={{ color: "var(--menu-texto-principal)" }}
                    >
                      {loading ? "…" : `${Math.round(stockTotalCatalogo)} u.`}
                    </dd>
                  </div>
                  <div
                    className="flex justify-between gap-3 py-3 pb-0 border-t"
                    style={sutilDivisor}
                  >
                    <dt style={{ color: "var(--encabezados-alterno)" }}>
                      Promedio / día
                    </dt>
                    <dd
                      className="font-semibold tabular-nums"
                      style={{ color: "var(--menu-texto-principal)" }}
                    >
                      {loading
                        ? "…"
                        : `${promedioDiarioVentasGlobal.toFixed(1)} u./día`}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <Badge variant="danger" size="sm">
                    Crítico: {criticos}
                  </Badge>
                  <Badge variant="warning" size="sm">
                    Preventivo: {preventivos}
                  </Badge>
                  <Badge variant="success" size="sm">
                    Normal: {normales}
                  </Badge>
                </div>
              </Card>

              <Card
                variant="elevated"
                padding="lg"
                className="rounded-2xl border-0"
                style={{
                  ...superficieCard,
                  backgroundColor:
                    "color-mix(in srgb, var(--danger) 6%, var(--superficie-elevada))",
                  border:
                    "1px solid color-mix(in srgb, var(--danger) 22%, transparent)",
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <h3
                    className="text-base font-semibold tracking-tight"
                    style={{ color: "var(--menu-texto-principal)" }}
                  >
                    Reorden
                  </h3>
                  {restockGlobal.urgente ? (
                    <Badge variant="danger" size="sm" className="shrink-0">
                      Bajo mínimo
                    </Badge>
                  ) : restockGlobal.dias !== null ? (
                    <Badge variant="warning" size="sm" className="shrink-0">
                      Planificar
                    </Badge>
                  ) : null}
                </div>

                {predicciones.length > 0 ? (
                  <p
                    className="text-[11px] leading-snug mb-3 rounded-lg px-3 py-2 font-medium"
                    style={{
                      color: "var(--encabezados-alterno)",
                      backgroundColor:
                        "color-mix(in srgb, var(--fondos-suaves) 55%, var(--superficie-elevada))",
                      border:
                        "1px solid color-mix(in srgb, var(--tarjetas-paneles) 28%, transparent)",
                    }}
                  >
                    {hayFiltrosCatalogo ? (
                      <>
                        <span style={{ color: "var(--menu-texto-principal)" }}>
                          Vista filtrada
                        </span>
                        {" · "}
                        {predicciones.length} producto
                        {predicciones.length === 1 ? "" : "s"} en el análisis.
                      </>
                    ) : (
                      <>
                        <span style={{ color: "var(--menu-texto-principal)" }}>
                          Vista global
                        </span>
                        {" · "}
                        {predicciones.length} productos en el análisis (todas
                        las categorías).
                      </>
                    )}
                  </p>
                ) : null}

                {restockGlobal.urgente ? (
                  <div
                    className="rounded-xl p-3.5 sm:p-4 mb-3 flex gap-3"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, var(--danger) 12%, var(--superficie-elevada))",
                      border:
                        "1px solid color-mix(in srgb, var(--danger) 32%, transparent)",
                    }}
                  >
                    <AlertTriangle
                      className="h-5 w-5 shrink-0 mt-0.5"
                      aria-hidden
                      style={{
                        color:
                          "color-mix(in srgb, var(--danger) 88%, var(--menu-texto-principal))",
                      }}
                    />
                    <div className="min-w-0 space-y-2">
                      <p
                        className="text-base sm:text-lg font-bold leading-snug"
                        style={{ color: "var(--menu-texto-principal)" }}
                      >
                        {hayFiltrosCatalogo ? (
                          <>
                            En esta selección, al menos un producto queda por
                            debajo del umbral al cierre.
                          </>
                        ) : criticos === 1 ? (
                          <>
                            1 producto queda por debajo del umbral al cierre del
                            período.
                          </>
                        ) : (
                          <>
                            {criticos} productos quedan por debajo del umbral al
                            cierre del período.
                          </>
                        )}
                      </p>
                      {restockGlobal.nombre ? (
                        <p
                          className="text-sm leading-snug"
                          style={{ color: "var(--encabezados-alterno)" }}
                        >
                          <span
                            className="font-medium text-[0.95em]"
                            style={{ color: "var(--menu-texto-principal)" }}
                          >
                            {hayFiltrosCatalogo
                              ? "Referencia:"
                              : "Peor posición (menor stock proyectado):"}
                          </span>{" "}
                          <span className="break-words">
                            {restockGlobal.nombre}
                            {restockGlobal.stockProyectadoPeor !== null ? (
                              <span className="tabular-nums">
                                {" "}
                                (~
                                {restockGlobal.stockProyectadoPeor.toFixed(
                                  1,
                                )}{" "}
                                u.)
                              </span>
                            ) : null}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : restockGlobal.dias !== null ? (
                  <div
                    className="rounded-xl p-3.5 sm:p-4 mb-3 flex gap-3"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, var(--warning) 10%, var(--superficie-elevada))",
                      border:
                        "1px solid color-mix(in srgb, var(--warning) 28%, transparent)",
                    }}
                  >
                    <Package
                      className="h-5 w-5 shrink-0 mt-0.5"
                      aria-hidden
                      style={{ color: "var(--warning)" }}
                    />
                    <div className="min-w-0 space-y-2">
                      <p
                        className="text-base sm:text-lg font-bold leading-snug tabular-nums"
                        style={{ color: "var(--menu-texto-principal)" }}
                      >
                        {hayFiltrosCatalogo ? (
                          <>
                            Reorden sugerido en{" "}
                            <span style={{ color: "var(--warning)" }}>
                              {restockGlobal.dias} d
                            </span>{" "}
                            en esta selección.
                          </>
                        ) : (
                          <>
                            Próximo cruce de umbral en el catálogo:{" "}
                            <span style={{ color: "var(--warning)" }}>
                              ~{restockGlobal.dias} d
                            </span>
                            .
                          </>
                        )}
                      </p>
                      {restockGlobal.nombre ? (
                        <p
                          className="text-sm leading-snug"
                          style={{ color: "var(--encabezados-alterno)" }}
                        >
                          <span
                            className="font-medium text-[0.95em]"
                            style={{ color: "var(--menu-texto-principal)" }}
                          >
                            {hayFiltrosCatalogo
                              ? "Primer riesgo:"
                              : "Cruce más próximo (referencia):"}
                          </span>{" "}
                          <span className="break-words">
                            {restockGlobal.nombre}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p
                    className="text-sm leading-relaxed mb-3"
                    style={{ color: "var(--menu-texto-principal)" }}
                  >
                    Sin fecha clara de reorden: el stock se mantiene holgado
                    frente al umbral con la tendencia actual.
                  </p>
                )}

                {fechaRestock ? (
                  <div
                    className="flex items-start gap-2.5 text-sm mb-4"
                    style={{ color: "var(--encabezados-alterno)" }}
                  >
                    <CalendarDays
                      className="h-4 w-4 shrink-0 mt-0.5"
                      aria-hidden
                      style={{ color: "var(--iconografia)" }}
                    />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide">
                        Fecha orientativa
                      </p>
                      <p
                        className="font-medium tabular-nums"
                        style={{ color: "var(--menu-texto-principal)" }}
                      >
                        {fechaRestock.toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                ) : null}

                <p
                  className="text-[11px] leading-relaxed rounded-lg px-3 py-2 mb-4"
                  style={{
                    color: "var(--encabezados-alterno)",
                    backgroundColor:
                      "color-mix(in srgb, var(--menu-texto-principal) 5%, var(--superficie-elevada))",
                    border:
                      "1px solid color-mix(in srgb, var(--tarjetas-paneles) 40%, transparent)",
                  }}
                >
                  Peor caso del catálogo frente al umbral de{" "}
                  <strong style={{ color: "var(--menu-texto-principal)" }}>
                    {umbralLineaGrafica} u.
                  </strong>{" "}
                  en la ventana de{" "}
                  <strong style={{ color: "var(--menu-texto-principal)" }}>
                    {horizonteDias} d
                  </strong>
                  .
                </p>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    className="rounded-xl px-3 py-3 sm:py-3.5"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, var(--fondos-suaves) 35%, var(--superficie-elevada))",
                      border:
                        "1px solid color-mix(in srgb, var(--tarjetas-paneles) 30%, transparent)",
                    }}
                  >
                    <dt
                      className="text-[11px] font-medium uppercase tracking-wide mb-1"
                      style={{ color: "var(--encabezados-alterno)" }}
                    >
                      Stock proyectado (día {diasReferenciaCurva})
                    </dt>
                    <dd
                      className="text-xl font-bold tabular-nums tracking-tight"
                      style={{ color: "var(--menu-texto-principal)" }}
                    >
                      {stockProyectado30Ref !== null
                        ? `${Math.round(stockProyectado30Ref)} u.`
                        : "—"}
                    </dd>
                  </div>
                  <div
                    className="rounded-xl px-3 py-3 sm:py-3.5"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, var(--fondos-suaves) 35%, var(--superficie-elevada))",
                      border:
                        "1px solid color-mix(in srgb, var(--tarjetas-paneles) 30%, transparent)",
                    }}
                  >
                    <dt
                      className="text-[11px] font-medium uppercase tracking-wide mb-1"
                      style={{ color: "var(--encabezados-alterno)" }}
                    >
                      {umbralModo === "auto"
                        ? "Umbral automático"
                        : "Umbral (línea, % total)"}
                    </dt>
                    <dd
                      className="text-xl font-bold tabular-nums tracking-tight"
                      style={{ color: "var(--menu-texto-principal)" }}
                    >
                      {umbralLineaGrafica} u.
                    </dd>
                  </div>
                </dl>
              </Card>
            </aside>

            <div className="lg:col-span-8 space-y-6">
              <Card
                variant="elevated"
                padding="lg"
                className="rounded-2xl border-0 mb-0"
                style={superficieCard}
              >
                <h3
                  className="text-base font-semibold mb-1"
                  style={{ color: "var(--menu-texto-principal)" }}
                >
                  Stock proyectado
                </h3>
                <p
                  className="text-xs mb-4"
                  style={{ color: "var(--encabezados-alterno)" }}
                >
                  Línea = stock total · rojo = umbral (
                  {umbralModo === "auto" ? "auto" : `${umbralPct}% del total`})
                </p>
                {graficaReserva && curvaAgregada ? (
                  <div
                    className="w-full overflow-x-auto p-3 sm:p-4"
                    style={chartWellStyle}
                  >
                    <svg
                      viewBox={`0 0 ${graficaReserva.width} ${graficaReserva.height}`}
                      width="100%"
                      height="auto"
                      className="min-h-[220px] max-h-[300px]"
                      role="img"
                      aria-label="Stock proyectado"
                    >
                      {graficaReserva.tickVals.map((v, i) => {
                        const y = graficaReserva.toY(v);
                        return (
                          <g key={`gy-${i}`}>
                            <line
                              x1={graficaReserva.padL}
                              y1={y}
                              x2={graficaReserva.padL + graficaReserva.innerW}
                              y2={y}
                              stroke="var(--encabezados-alterno)"
                              strokeWidth="0.5"
                              strokeDasharray="3 5"
                              opacity={0.35}
                            />
                            <text
                              x={graficaReserva.padL - 8}
                              y={y + 4}
                              textAnchor="end"
                              fontSize="11"
                              fill="var(--encabezados-alterno)"
                            >
                              {graficaReserva.fmtEjeY(v)}
                            </text>
                          </g>
                        );
                      })}
                      <line
                        x1={graficaReserva.padL}
                        y1={graficaReserva.toY(0)}
                        x2={graficaReserva.padL + graficaReserva.innerW}
                        y2={graficaReserva.toY(0)}
                        stroke="var(--encabezados-alterno)"
                        strokeWidth="1"
                      />
                      <line
                        x1={graficaReserva.padL}
                        y1={graficaReserva.padT}
                        x2={graficaReserva.padL}
                        y2={graficaReserva.padT + graficaReserva.innerH}
                        stroke="var(--encabezados-alterno)"
                        strokeWidth="1"
                      />
                      <line
                        x1={graficaReserva.padL}
                        y1={graficaReserva.yThreshold}
                        x2={graficaReserva.padL + graficaReserva.innerW}
                        y2={graficaReserva.yThreshold}
                        stroke="var(--danger)"
                        strokeWidth="1.5"
                        strokeDasharray="6 4"
                      />
                      <text
                        x={graficaReserva.padL + graficaReserva.innerW - 2}
                        y={graficaReserva.yThreshold - 6}
                        textAnchor="end"
                        fontSize="11"
                        fill="var(--danger)"
                      >
                        Umbral: {umbralLineaGrafica}
                      </text>
                      <path
                        d={graficaReserva.path}
                        fill="none"
                        stroke="var(--warning)"
                        strokeWidth="3"
                        strokeLinejoin="round"
                      />
                      {graficaReserva.pts
                        .filter(
                          (_, i) =>
                            i %
                              Math.max(
                                1,
                                Math.floor(graficaReserva.pts.length / 6),
                              ) ===
                            0,
                        )
                        .map((p) => (
                          <circle
                            key={`pt-${p.dia}`}
                            cx={graficaReserva.toX(p.dia)}
                            cy={graficaReserva.toY(p.valor)}
                            r="4.5"
                            fill="var(--warning)"
                            stroke="var(--superficie-elevada)"
                            strokeWidth="1.5"
                          />
                        ))}
                      <text
                        x={14}
                        y={graficaReserva.padT + graficaReserva.innerH / 2}
                        transform={`rotate(-90 14 ${graficaReserva.padT + graficaReserva.innerH / 2})`}
                        fontSize="11"
                        fill="var(--encabezados-alterno)"
                        textAnchor="middle"
                      >
                        Stock
                      </text>
                      {[
                        0,
                        Math.round(graficaReserva.xMax / 2),
                        graficaReserva.xMax,
                      ].map((d) => {
                        const dt = new Date();
                        dt.setHours(0, 0, 0, 0);
                        dt.setDate(dt.getDate() + d);
                        const label = dt.toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "short",
                        });
                        const x = graficaReserva.toX(d);
                        return (
                          <text
                            key={`gx-${d}`}
                            x={x}
                            y={graficaReserva.height - 14}
                            textAnchor="middle"
                            fontSize="11"
                            fill="var(--menu-texto-principal)"
                          >
                            {label}
                          </text>
                        );
                      })}
                    </svg>
                    <p
                      className="text-xs mt-3"
                      style={{ color: "var(--encabezados-alterno)" }}
                    >
                      {curvaAgregada.subtitulo}
                    </p>
                  </div>
                ) : (
                  <p
                    className="text-xs"
                    style={{ color: "var(--encabezados-alterno)" }}
                  >
                    Sin stock en catálogo para dibujar la curva.
                  </p>
                )}
              </Card>

              <Card
                variant="elevated"
                padding="lg"
                className="mb-6 scroll-mt-24 rounded-2xl border-0"
                style={superficieCard}
              >
                <h3
                  className="text-base font-semibold mb-2"
                  style={{ color: "var(--menu-texto-principal)" }}
                >
                  Tabla
                </h3>
                <p
                  className="text-xs mb-3"
                  style={{ color: "var(--encabezados-alterno)" }}
                >
                  Unidades = pedidos válidos en el período. Salida estimada =
                  referencia, no pronóstico exacto.
                </p>
                <div className="flex justify-end mb-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportarCsv}
                    disabled={predicciones.length === 0}
                  >
                    Exportar CSV
                  </Button>
                </div>
                <div
                  className="overflow-x-auto overflow-y-auto"
                  style={{
                    maxHeight: `${ALTO_ENCABEZADO_PX + FILAS_VISIBLES_TABLA * ALTO_FILA_PX}px`,
                    scrollbarGutter: "stable",
                  }}
                >
                  <Table
                    className="min-w-[1260px]"
                    headersLegibles
                    stickyFirstColumn
                    headers={[
                      "Producto",
                      "Stock actual",
                      `Unidades vendidas (${diasVentanaVentas} d)`,
                      `Salida estimada (${horizonteDias} d)`,
                      `Stock estimado (${horizonteDias} d)`,
                      "Variación %",
                      "Nivel de alerta",
                      "Riesgo actual",
                      "Sugerencia",
                      "Nota",
                    ]}
                  >
                    {!loading &&
                      predicciones.map((p) => {
                        const badge = estadoBadge(p.estado);
                        const mv = metricasVentasPorProducto.get(
                          String(p.id).trim(),
                        ) ?? { unidades: 0, promD: 0, demH: 0 };
                        const cr = cruceModeloVentas(p, mv, umbralParaX0(p.x0));
                        const sug = sugerenciaAccion(p, mv, horizonteDias);
                        return (
                          <TableRow key={p.id}>
                            <TableCell
                              stickyLeft
                              className="font-semibold whitespace-nowrap min-w-[180px] max-w-[260px] truncate"
                            >
                              {p.nombre}
                            </TableCell>
                            <TableCell>{p.x0.toFixed(1)}</TableCell>
                            <TableCell>{mv.unidades}</TableCell>
                            <TableCell>{mv.demH.toFixed(1)}</TableCell>
                            <TableCell>{p.xT.toFixed(1)}</TableCell>
                            <TableCell
                              style={{
                                color:
                                  p.cambioPct <= 0
                                    ? "var(--danger)"
                                    : "var(--success)",
                              }}
                            >
                              {p.cambioPct.toFixed(1)}%
                            </TableCell>
                            <TableCell>
                              <Badge variant={badge.variant} size="sm">
                                {badge.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={cr.variant} size="sm">
                                {cr.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm align-top min-w-[320px] max-w-[420px]">
                              <p
                                className="font-medium leading-snug"
                                style={{ color: "var(--menu-texto-principal)" }}
                              >
                                {sug.accion}
                              </p>
                              <p
                                className="text-xs mt-1.5 leading-relaxed line-clamp-2"
                                style={{ color: "var(--encabezados-alterno)" }}
                              >
                                {sug.detalle}
                              </p>
                            </TableCell>
                            <TableCell className="min-w-[90px]">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => abrirDetalleProducto(p.id)}
                              >
                                Ver
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </Table>
                </div>
                {loading && (
                  <p
                    className="text-xs mt-3"
                    style={{ color: "var(--encabezados-alterno)" }}
                  >
                    Cargando…
                  </p>
                )}
              </Card>

              <Card
                variant="elevated"
                padding="lg"
                className="mb-6 rounded-2xl border-0"
                style={superficieCard}
              >
                <h3
                  className="text-base font-semibold mb-1"
                  style={{ color: "var(--menu-texto-principal)" }}
                >
                  Más riesgo de quiebre
                </h3>
                <p
                  className="text-xs mb-3"
                  style={{ color: "var(--encabezados-alterno)" }}
                >
                  Barra: stock proyectado vs umbral (más llena = más cerca del
                  mínimo).
                </p>
                <div className="space-y-3">
                  {topRiesgo.map((p) => {
                    const uM = umbralParaX0(p.x0);
                    const progress =
                      uM <= 0
                        ? 100
                        : Math.max(0, Math.min(100, (p.xT / uM) * 100));
                    const mvR = metricasVentasPorProducto.get(
                      String(p.id).trim(),
                    );
                    const vendidas =
                      mvR && mvR.unidades > 0
                        ? `${mvR.unidades} u. / ${diasVentanaVentas} d`
                        : "0 u. en ventana";
                    return (
                      <div key={p.id}>
                        <div
                          className="flex flex-wrap justify-between items-center gap-2 text-sm mb-1"
                          style={{ color: "var(--menu-texto-principal)" }}
                        >
                          <span className="font-medium">{p.nombre}</span>
                          <span className="flex flex-wrap items-center gap-2">
                            <span
                              className="text-xs sm:text-sm"
                              style={{ color: "var(--encabezados-alterno)" }}
                            >
                              {p.xT.toFixed(1)} u. · {vendidas}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => abrirDetalleProducto(p.id)}
                            >
                              Ver
                            </Button>
                          </span>
                        </div>
                        <div
                          className="w-full h-3 rounded-full"
                          style={{
                            backgroundColor:
                              "color-mix(in srgb, var(--tarjetas-paneles) 28%, var(--superficie-elevada))",
                          }}
                        >
                          <div
                            className="h-3 rounded-full"
                            style={{
                              width: `${progress}%`,
                              backgroundColor:
                                progress <= 100
                                  ? "var(--warning)"
                                  : "var(--success)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {!loading && topRiesgo.length === 0 && (
                    <p
                      className="text-xs"
                      style={{ color: "var(--encabezados-alterno)" }}
                    >
                      Sin productos para este ranking.
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>

        <Drawer
          open={Boolean(drawerProductoId)}
          title={drawerTitulo}
          onClose={cerrarDrawerProducto}
        >
          {drawerProductoId && (
            <InventarioAnalisisCategoriasPanel
              productos={productos}
              lineasVentas={lineasVentas}
              pedidosContados={pedidosVentasCount}
              loading={loading}
              error={errorVentas}
              productoIdExterno={drawerProductoId}
              variante="soloConsumoProducto"
            />
          )}
        </Drawer>
      </div>
    </AdminLayout>
  );
}
