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
  filtrarLineasPorProducto,
  filtrarLineasRangoFechasInclusivo,
  promedioUnidadesPorDia,
  proyeccionDemandaUnidades,
  type LineaVentaProducto,
} from "../../../../utils/inventarioVentasOnline";
import { parseCategoriaSub } from "../../../../utils/inventarioInteligente";
import { CHART_COLORS_MARCA } from "../../../../utils/chartColors";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Maximize2,
  Package,
  ShoppingBag,
} from "lucide-react";

function parseFechaInputLocal(ymd: string): Date | null {
  const t = ymd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const [y, m, d] = t.split("-").map((n) => parseInt(n, 10));
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const out = new Date(y, m - 1, d, 0, 0, 0, 0);
  if (out.getFullYear() !== y || out.getMonth() !== m - 1 || out.getDate() !== d) return null;
  return out;
}

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
  const [rangoFechaInicio, setRangoFechaInicio] = useState("");
  const [rangoFechaFin, setRangoFechaFin] = useState("");
  const [rangoFechasActivo, setRangoFechasActivo] = useState(false);
  const [fechaProyeccionRef, setFechaProyeccionRef] = useState("");
  const fechaInicioModelo = useMemo(
    () => (rangoFechaInicio ? parseFechaInputLocal(rangoFechaInicio) : null),
    [rangoFechaInicio],
  );
  const fechaProyeccionValida = useMemo(
    () => (fechaProyeccionRef ? parseFechaInputLocal(fechaProyeccionRef) : null),
    [fechaProyeccionRef],
  );
  const horizonteDiasCalendario = useMemo(() => {
    if (!fechaInicioModelo || !fechaProyeccionValida) return null as number | null;
    const d0 = new Date(fechaInicioModelo);
    d0.setHours(0, 0, 0, 0);
    const d1 = new Date(fechaProyeccionValida);
    d1.setHours(0, 0, 0, 0);
    const diff = Math.round((d1.getTime() - d0.getTime()) / 86400000);
    return diff >= 0 ? diff : null;
  }, [fechaInicioModelo, fechaProyeccionValida]);
  const horizonteDias = horizonteDiasCalendario ?? periodoDias;
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
  const [tablaOverlayOpen, setTablaOverlayOpen] = useState(false);
  const [origenBarraHover, setOrigenBarraHover] = useState<string | null>(null);
  const [graficaPredHover, setGraficaPredHover] = useState<{
    dia: number;
    valor: number;
    fechaTxt: string;
    x: number;
    y: number;
  } | null>(null);

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
    const bajoUmbralHoy = predicciones.filter((p) => p.x0 <= umbralParaX0(p.x0));
    if (bajoUmbralHoy.length > 0) {
      const worst = bajoUmbralHoy.reduce((a, b) => (a.xT <= b.xT ? a : b));
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
      const umbral = umbralParaX0(p.x0);
      if (p.k >= -1e-12) continue;
      if (p.x0 <= umbral) continue;
      const diasCruce = Math.log(umbral / p.x0) / p.k;
      if (Number.isFinite(diasCruce) && diasCruce > 0 && diasCruce < minDias) {
        minDias = diasCruce;
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
      dias: Math.ceil(minDias),
      nombre,
      urgente: false,
      stockProyectadoPeor: null,
    };
  }, [predicciones, umbralParaX0]);

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

  const modeloVentas3Fechas = useMemo(() => {
    if (!curvaAgregada || !fechaInicioModelo) return null;
    const fecha2 = parseFechaInputLocal(rangoFechaFin);
    if (!fecha2) return null;
    const f1 = new Date(fechaInicioModelo);
    f1.setHours(0, 0, 0, 0);
    const f2 = new Date(fecha2);
    f2.setHours(0, 0, 0, 0);
    const t2 = Math.round((f2.getTime() - f1.getTime()) / 86400000);
    if (!Number.isFinite(t2) || t2 <= 0) return null;

    const t3 =
      fechaProyeccionValida != null
        ? Math.round(
            (new Date(fechaProyeccionValida).setHours(0, 0, 0, 0) -
              f1.getTime()) /
              86400000,
          )
        : horizonteDias;
    if (!Number.isFinite(t3) || t3 < 0) return null;

    const idsVista = new Set(
      productosVista.map((p) => String(p.id).trim()).filter(Boolean),
    );
    const claveDia = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`;
    const claveF1 = claveDia(f1);
    const claveF2 = claveDia(f2);
    let v1 = 0;
    let v2 = 0;
    for (const l of lineasVentas) {
      const d = new Date(l.fechaIso);
      if (Number.isNaN(d.getTime())) continue;
      const key = claveDia(d);
      if (key !== claveF1 && key !== claveF2) continue;
      if (
        hayFiltrosCatalogo &&
        !idsVista.has(String(l.productoId).trim())
      )
        continue;
      if (key === claveF1) v1 += l.cantidad;
      if (key === claveF2) v2 += l.cantidad;
    }
    const base = Math.max(v1, 0.0001);
    const objetivo = Math.max(v2, 0.0001);
    const kVentas = Math.log(objetivo / base) / t2;

    const ventasDia = (t: number) => Math.max(0, base * Math.exp(kVentas * t));
    const stockProyectado = (t: number) => {
      const x0 = Math.max(0, curvaAgregada.x0);
      if (x0 <= 0) return 0;
      let acumulada: number;
      if (Math.abs(kVentas) < 1e-9) acumulada = base * t;
      else acumulada = (base / kVentas) * (Math.exp(kVentas * t) - 1);
      return Math.max(0, x0 - Math.max(0, acumulada));
    };

    return {
      f1,
      f2,
      t2,
      t3,
      kVentas,
      v1,
      v2,
      v3: ventasDia(t3),
      ventasDia,
      stockProyectado,
    };
  }, [
    curvaAgregada,
    fechaInicioModelo,
    rangoFechaFin,
    fechaProyeccionValida,
    horizonteDias,
    productosVista,
    lineasVentas,
    hayFiltrosCatalogo,
  ]);
  const graficaModoVentas = modeloVentas3Fechas !== null;

  const puntosCurvaDensa = useMemo<PuntoGrafica[]>(() => {
    if (!curvaAgregada) return [];
    const H = horizonteDias;
    const maxPts = 90;
    const step = H <= maxPts ? 1 : Math.ceil(H / maxPts);
    const out: PuntoGrafica[] = [];
    for (let d = 0; d <= H; d += step) {
      out.push({
        dia: d,
        valor: modeloVentas3Fechas
          ? modeloVentas3Fechas.ventasDia(d)
          : curvaAgregada.x0 * Math.exp(curvaAgregada.k * d),
      });
    }
    if (out[out.length - 1]?.dia !== H) {
      out.push({
        dia: H,
        valor: modeloVentas3Fechas
          ? modeloVentas3Fechas.ventasDia(H)
          : curvaAgregada.x0 * Math.exp(curvaAgregada.k * H),
      });
    }
    return out;
  }, [curvaAgregada, horizonteDias, modeloVentas3Fechas]);

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

  const rangoFechasParseado = useMemo((): { inicio: Date; fin: Date } | null => {
    if (!rangoFechaInicio || !rangoFechaFin) return null;
    const a = parseFechaInputLocal(rangoFechaInicio);
    const b = parseFechaInputLocal(rangoFechaFin);
    if (!a || !b || a.getTime() > b.getTime()) return null;
    return { inicio: a, fin: b };
  }, [rangoFechaInicio, rangoFechaFin]);

  const hitosGraficaFechas = useMemo(() => {
    const out: Array<{
      key: "f1" | "f2" | "f3";
      label: string;
      dia: number;
      fecha: Date;
    }> = [];
    if (!fechaInicioModelo) return out;
    const f1 = new Date(fechaInicioModelo);
    f1.setHours(0, 0, 0, 0);
    out.push({ key: "f1", label: "Inicio", dia: 0, fecha: f1 });
    if (rangoFechasParseado) {
      const f2 = new Date(rangoFechasParseado.fin);
      f2.setHours(0, 0, 0, 0);
      const d2 = Math.max(
        0,
        Math.round((f2.getTime() - f1.getTime()) / 86400000),
      );
      out.push({ key: "f2", label: "Corte", dia: d2, fecha: f2 });
    }
    if (fechaProyeccionValida) {
      const f3 = new Date(fechaProyeccionValida);
      f3.setHours(0, 0, 0, 0);
      const d3 = Math.max(
        0,
        Math.round((f3.getTime() - f1.getTime()) / 86400000),
      );
      out.push({ key: "f3", label: "Pred.", dia: d3, fecha: f3 });
    }
    const unicos = new Map<number, (typeof out)[number]>();
    out.forEach((h) => {
      if (!unicos.has(h.dia)) unicos.set(h.dia, h);
      else if (h.key === "f3") unicos.set(h.dia, h);
    });
    return [...unicos.values()].sort((a, b) => a.dia - b.dia);
  }, [fechaInicioModelo, rangoFechasParseado, fechaProyeccionValida]);

  const ventanaOrigenPedidos = useMemo(() => {
    if (rangoFechasActivo && rangoFechasParseado) {
      const desde = new Date(rangoFechasParseado.inicio);
      desde.setHours(0, 0, 0, 0);
      const hasta = new Date(rangoFechasParseado.fin);
      hasta.setHours(23, 59, 59, 999);
      const d0 = new Date(rangoFechasParseado.inicio);
      d0.setHours(0, 0, 0, 0);
      const d1 = new Date(rangoFechasParseado.fin);
      d1.setHours(0, 0, 0, 0);
      const dias = Math.max(
        1,
        Math.round((d1.getTime() - d0.getTime()) / 86400000) + 1,
      );
      return {
        desde,
        hasta,
        dias,
        modo: "rango" as const,
      };
    }
    const desde = new Date();
    desde.setDate(desde.getDate() - periodoDias);
    desde.setHours(0, 0, 0, 0);
    const hasta = new Date();
    hasta.setHours(23, 59, 59, 999);
    return {
      desde,
      hasta,
      dias: periodoDias,
      modo: "rolling" as const,
    };
  }, [rangoFechasActivo, rangoFechasParseado, periodoDias]);

  const diasVentanaVentas = ventanaOrigenPedidos.dias;

  const lineasVentanaVentas = useMemo(
    () =>
      filtrarLineasRangoFechasInclusivo(
        lineasVentas,
        ventanaOrigenPedidos.desde,
        ventanaOrigenPedidos.hasta,
      ),
    [lineasVentas, ventanaOrigenPedidos],
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
    const pedidosEnVentanaBase = rangoFechasActivo
      ? new Set(lineasVentanaVentas.map((l) => l.pedidoId)).size
      : pedidosVentasCount;
    if (!hayFiltrosCatalogo) {
      const u = lineasVentanaVentas.reduce((s, l) => s + l.cantidad, 0);
      return {
        unidades: u,
        lineas: lineasVentanaVentas.length,
        pedidos: pedidosEnVentanaBase,
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
    rangoFechasActivo,
  ]);

  const stockTotalCatalogo = useMemo(
    () => predicciones.reduce((sum, p) => sum + p.x0, 0),
    [predicciones],
  );
  const promedioDiarioVentasGlobal = useMemo(() => {
    const d = Math.max(1, contextoPedidos.dias);
    return contextoPedidos.unidades / d;
  }, [contextoPedidos.dias, contextoPedidos.unidades]);

  /** Días globales para cruzar umbral (stock total vs umbral total). */
  const diasReabastecerGlobal = useMemo(() => {
    if (!curvaAgregada) return null as number | null;
    const x0 = Math.max(0, curvaAgregada.x0);
    /** k de consumo real: dx/dt = kx con tasa observada ≈ ventas_dia / stock_actual. */
    const k = x0 > 0 ? -(promedioDiarioVentasGlobal / x0) : 0;
    const umbral = Math.max(1, umbralLineaGrafica);
    if (x0 <= 0) return 0;
    if (x0 <= umbral) return 0;
    if (k >= -1e-12) return null;
    const t = Math.log(umbral / x0) / k;
    if (!Number.isFinite(t) || t > 36500) return null;
    if (t <= 0) return 0;
    return Math.ceil(t);
  }, [curvaAgregada, umbralLineaGrafica, promedioDiarioVentasGlobal]);

  const reabastecerEnHorizonte = useMemo(() => {
    if (diasReabastecerGlobal === null) return "sin_presion" as const;
    if (diasReabastecerGlobal <= 0) return "urgente" as const;
    if (diasReabastecerGlobal <= horizonteDias) return "estimado" as const;
    return "fuera_horizonte" as const;
  }, [diasReabastecerGlobal, horizonteDias]);

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

  const serieOrigenVentasDia = useMemo(() => {
    const lineas = hayFiltrosCatalogo
      ? lineasVentanaFiltradas
      : lineasVentanaVentas;
    const inicio = new Date(ventanaOrigenPedidos.desde);
    inicio.setHours(0, 0, 0, 0);
    const finD = new Date(ventanaOrigenPedidos.hasta);
    finD.setHours(0, 0, 0, 0);
    if (inicio.getTime() > finD.getTime()) return [];
    const map = new Map<string, { u: number; m: number }>();
    for (const l of lineas) {
      const t = new Date(l.fechaIso);
      if (Number.isNaN(t.getTime())) continue;
      t.setHours(0, 0, 0, 0);
      if (t.getTime() < inicio.getTime() || t.getTime() > finD.getTime()) continue;
      const clave = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
      const prev = map.get(clave) ?? { u: 0, m: 0 };
      prev.u += l.cantidad;
      prev.m += l.subtotal;
      map.set(clave, prev);
    }
    const out: { clave: string; etiqueta: string; u: number; m: number }[] = [];
    for (const cur = new Date(inicio); cur.getTime() <= finD.getTime(); cur.setDate(cur.getDate() + 1)) {
      const clave = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
      const data = map.get(clave) ?? { u: 0, m: 0 };
      out.push({
        clave,
        etiqueta: new Intl.DateTimeFormat("es-MX", {
          day: "2-digit",
          month: "short",
        }).format(cur),
        u: data.u,
        m: data.m,
      });
    }
    return out;
  }, [ventanaOrigenPedidos, lineasVentanaVentas, lineasVentanaFiltradas, hayFiltrosCatalogo]);

  const datoOrigenHover = useMemo(
    () =>
      origenBarraHover
        ? serieOrigenVentasDia.find((p) => p.clave === origenBarraHover) ?? null
        : null,
    [origenBarraHover, serieOrigenVentasDia],
  );

  const graficaOrigenVentas = useMemo(() => {
    const pts = serieOrigenVentasDia;
    if (pts.length === 0) return null;
    const w = 640;
    const h = 200;
    const padL = 40;
    const padR = 8;
    const padT = 8;
    const padB = 32;
    const n = pts.length;
    const maxU = Math.max(1, ...pts.map((p) => p.u));
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;
    const step = innerW / Math.max(1, n);
    const barW = Math.max(2, Math.min(20, step * 0.65));
    const yBase = padT + innerH;
    return {
      w,
      h,
      padL,
      padR,
      padT,
      padB,
      yBase,
      innerH,
      maxU,
      barW,
      toY: (u: number) => padT + innerH * (1 - u / maxU),
      toX: (i: number) => padL + (i + 0.5) * step,
    };
  }, [serieOrigenVentasDia]);

  const aplicarRangoFechasOrigen = useCallback(() => {
    if (!rangoFechasParseado) return;
    setRangoFechasActivo(true);
  }, [rangoFechasParseado]);

  const restablecerVentanaAperiodo = useCallback(() => {
    setRangoFechasActivo(false);
  }, []);

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
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: "var(--menu-texto-principal)" }}>
              Predicción del inventario
            </h1>
            <p
              className="text-sm mt-1 max-w-xl leading-relaxed"
              style={{ color: "var(--encabezados-alterno)" }}
            >
              Pedidos online + stock del catálogo. Elige 7, 30 o 90 días, o
              aplica un rango de fechas al origen de ventas.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:justify-end">
            <Button
              variant="outline"
              className="shrink-0 w-full sm:w-auto"
              onClick={() => {
                const pid = searchParams.get("producto");
                const q = pid
                  ? `?producto=${encodeURIComponent(pid)}`
                  : "";
                router.push(`/admin/inventario/historial-ventas${q}`);
              }}
            >
              Historial de ventas
            </Button>
            <Button
              variant="outline"
              className="shrink-0 w-full sm:w-auto"
              onClick={() => router.push("/admin/inventario")}
            >
              Volver a inventario
            </Button>
          </div>
        </header>

        <section
          className="rounded-2xl px-4 py-7 md:py-9 mb-1 overflow-hidden"
          style={{
            ...superficieCard,
            background: fondoHeroPrediccion,
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            <Card variant="elevated" padding="lg">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "var(--fondos-suaves)" }}
                >
                  <Package className="h-5 w-5" style={{ color: "var(--logo-branding)" }} aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--encabezados-alterno)" }}>
                    Unidades vendidas
                  </p>
                  <p className="text-2xl font-bold mt-0.5 tabular-nums" style={{ color: "var(--menu-texto-principal)" }}>
                    {loading ? "…" : contextoPedidos.unidades}
                  </p>
                  <p className="text-xs mt-1 leading-snug" style={{ color: "var(--encabezados-alterno)" }}>
                    {ventanaOrigenPedidos.modo === "rango" && rangoFechasParseado
                      ? hayFiltrosCatalogo
                        ? "Vista · rango de fechas"
                        : "Global · rango de fechas"
                      : hayFiltrosCatalogo
                        ? `Vista · últimos ${contextoPedidos.dias} d`
                        : `Global · últimos ${contextoPedidos.dias} d`}
                  </p>
                </div>
              </div>
            </Card>
            <Card variant="elevated" padding="lg">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "var(--fondos-suaves)" }}
                >
                  <ShoppingBag className="h-5 w-5" style={{ color: "var(--enlaces-textos-interactivos)" }} aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--encabezados-alterno)" }}>
                    Pedidos analizados
                  </p>
                  <p className="text-2xl font-bold mt-0.5 tabular-nums" style={{ color: "var(--menu-texto-principal)" }}>
                    {loading ? "…" : contextoPedidos.pedidos}
                  </p>
                  <p className="text-xs mt-1 leading-snug" style={{ color: "var(--encabezados-alterno)" }}>
                    {ventanaOrigenPedidos.modo === "rango" && rangoFechasParseado
                      ? hayFiltrosCatalogo
                        ? "Pedidos con líneas en vista (rango)"
                        : "Pedidos con líneas en rango (origen de datos)"
                      : hayFiltrosCatalogo
                        ? `Pedidos con líneas en vista · ${contextoPedidos.dias} d`
                        : `Pedidos contables (API). Unidades: últimos ${contextoPedidos.dias} d`}
                  </p>
                </div>
              </div>
            </Card>
            <Card variant="elevated" padding="lg">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "var(--fondos-suaves)" }}
                >
                  <Activity className="h-5 w-5" style={{ color: "var(--success)" }} aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--encabezados-alterno)" }}>
                    Promedio diario
                  </p>
                  <p className="text-2xl font-bold mt-0.5 tabular-nums" style={{ color: "var(--menu-texto-principal)" }}>
                    {loading ? "…" : promedioDiarioVentasGlobal.toFixed(1)}
                  </p>
                  <p className="text-xs mt-1 leading-snug" style={{ color: "var(--encabezados-alterno)" }}>
                    {hayFiltrosCatalogo
                      ? "Media diaria (vista)"
                      : "Media diaria (ventana)"}
                  </p>
                </div>
              </div>
            </Card>
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
              style={{ color: "var(--danger-texto)" }}
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
                variant={
                  !rangoFechasActivo && periodoDias === d ? "primary" : "outline"
                }
                onClick={() => {
                  setPeriodoDias(d);
                  setRangoFechasActivo(false);
                }}
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
            {rangoFechasActivo && rangoFechasParseado && (
              <Badge variant="info" size="sm" className="sm:ml-1">
                Rango de fechas
              </Badge>
            )}
          </div>
          <div
            className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-end border-t pt-3 mt-2"
            style={sutilDivisor}
          >
            <span
              className="text-sm font-semibold w-full sm:w-auto mr-0 sm:mr-2"
              style={{ color: "var(--menu-texto-principal)" }}
            >
              Origen de ventas
            </span>
            <Input
              type="date"
              label="Desde"
              value={rangoFechaInicio}
              onChange={(e) => setRangoFechaInicio(e.target.value)}
              className="w-full min-w-0 sm:w-40"
            />
            <Input
              type="date"
              label="Hasta"
              value={rangoFechaFin}
              onChange={(e) => setRangoFechaFin(e.target.value)}
              className="w-full min-w-0 sm:w-40"
            />
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={aplicarRangoFechasOrigen}
              disabled={!rangoFechasParseado}
              title={
                rangoFechasParseado
                  ? "Usar pedidos cuya fecha cae en este rango (incl.)"
                  : "Indica dos fechas válidas (inicio ≤ fin)"
              }
            >
              Aplicar rango
            </Button>
            {rangoFechasActivo && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={restablecerVentanaAperiodo}
              >
                Volver a 7/30/90
              </Button>
            )}
            {rangoFechaInicio &&
              rangoFechaFin &&
              !rangoFechasParseado && (
                <span
                  className="text-xs w-full"
                  style={{ color: "var(--danger-texto)" }}
                >
                  Fechas no válidas (revisa inicio y fin).
                </span>
              )}
          </div>
          <div
            className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-end border-t pt-3"
            style={sutilDivisor}
          >
            <span
              className="text-sm font-semibold w-full sm:w-auto mr-0 sm:mr-2"
              style={{ color: "var(--menu-texto-principal)" }}
            >
              Proyección (fecha referencia)
            </span>
            <Input
              type="date"
              label="Fecha"
              value={fechaProyeccionRef}
              onChange={(e) => setFechaProyeccionRef(e.target.value)}
              className="w-full min-w-0 sm:w-40"
            />
            {fechaProyeccionValida && horizonteDiasCalendario !== null ? (
              <span
                className="text-xs w-full sm:w-auto"
                style={{ color: "var(--encabezados-alterno)" }}
              >
                Fecha seleccionada:{" "}
                {fechaProyeccionValida.toLocaleDateString("es-MX", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}{" "}
                · t = {horizonteDiasCalendario} día
                {horizonteDiasCalendario === 1 ? "" : "s"} desde la fecha inicial.
              </span>
            ) : (
              fechaProyeccionRef && (
                <span
                  className="text-xs w-full"
                  style={{ color: "var(--danger-texto)" }}
                >
                  Fecha no válida o anterior a la fecha inicial.
                </span>
              )
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
          padding="lg"
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
                    className="text-lg font-semibold"
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
                      className="font-semibold tabular-nums text-right"
                      style={{ color: "var(--menu-texto-principal)" }}
                    >
                      {ventanaOrigenPedidos.modo === "rango" && rangoFechasParseado ? (
                        <span className="block text-sm font-medium leading-snug">
                          {rangoFechasParseado.inicio.toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          –{" "}
                          {rangoFechasParseado.fin.toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                          <span className="block text-xs font-normal tabular-nums mt-0.5">
                            {ventanaOrigenPedidos.dias} días
                          </span>
                        </span>
                      ) : horizonteDiasCalendario !== null ? (
                        `${horizonteDias} días (calendario)`
                      ) : (
                        `${periodoDias} días`
                      )}
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
                        ? "Condición inicial (stock en vista)"
                        : "Condición inicial (stock en catálogo)"}
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
                style={superficieCard}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3
                    className="text-lg font-semibold tracking-tight"
                    style={{ color: "var(--menu-texto-principal)" }}
                  >
                    Total de días para reabastecer
                  </h3>
                  {reabastecerEnHorizonte === "urgente" ? (
                    <Badge variant="danger" size="sm" className="shrink-0">
                      Urgente
                    </Badge>
                  ) : reabastecerEnHorizonte === "estimado" ? (
                    <Badge variant="warning" size="sm" className="shrink-0">
                      Estimado
                    </Badge>
                  ) : reabastecerEnHorizonte === "fuera_horizonte" ? (
                    <Badge variant="success" size="sm" className="shrink-0">
                      Fuera de horizonte
                    </Badge>
                  ) : (
                    <Badge variant="success" size="sm" className="shrink-0">
                      Sin presión
                    </Badge>
                  )}
                </div>
                <p
                  className="mt-3 text-3xl font-bold tabular-nums"
                  style={{ color: "var(--menu-texto-principal)" }}
                >
                  {diasReabastecerGlobal !== null
                    ? `${diasReabastecerGlobal} d`
                    : "N/A"}
                </p>
                <p
                  className="mt-1 text-xs leading-relaxed"
                  style={{ color: "var(--encabezados-alterno)" }}
                >
                  {reabastecerEnHorizonte === "urgente"
                    ? "El stock total ya está en o por debajo del umbral en la vista actual."
                    : reabastecerEnHorizonte === "estimado"
                      ? "Días estimados hasta que el stock total cruce el umbral en la vista actual."
                      : reabastecerEnHorizonte === "fuera_horizonte"
                        ? `El cruce estimado ocurre después del período activo (${horizonteDias} d).`
                        : "No se proyecta cruce de umbral para el stock total con la tendencia actual."}
                </p>
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
                    className="text-lg font-semibold tracking-tight"
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
                  className="text-lg font-semibold mb-1"
                  style={{ color: "var(--menu-texto-principal)" }}
                >
                  {graficaModoVentas
                    ? "Ventas proyectadas por día"
                    : "Stock proyectado"}
                </h3>
                <p
                  className="text-xs mb-4"
                  style={{ color: "var(--encabezados-alterno)" }}
                >
                  {graficaModoVentas
                    ? "Línea = ventas proyectadas por día (modelo F1/F2/F3, dx/dt = kx)."
                    : `Línea = stock total · rojo = umbral (${umbralModo === "auto" ? "auto" : `${umbralPct}% del total`})`}
                </p>
                {graficaReserva && curvaAgregada ? (
                  <div
                    className="relative w-full overflow-x-auto p-3 sm:p-4"
                    style={chartWellStyle}
                  >
                    <svg
                      viewBox={`0 0 ${graficaReserva.width} ${graficaReserva.height}`}
                      width="100%"
                      height="auto"
                      className="min-h-[220px] max-h-[300px]"
                      role="img"
                      aria-label="Stock proyectado"
                      onMouseLeave={() => setGraficaPredHover(null)}
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
                      {!graficaModoVentas && (
                        <>
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
                        </>
                      )}
                      <path
                        d={graficaReserva.path}
                        fill="none"
                        stroke="var(--warning)"
                        strokeWidth="3"
                        strokeLinejoin="round"
                      />
                      {graficaReserva.pts.map((p) => {
                        const dt = fechaInicioModelo
                          ? new Date(fechaInicioModelo)
                          : new Date();
                        dt.setHours(0, 0, 0, 0);
                        dt.setDate(dt.getDate() + p.dia);
                        const fechaTxt = dt.toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        });
                        return (
                          <circle
                            key={`hover-pt-${p.dia}`}
                            cx={graficaReserva.toX(p.dia)}
                            cy={graficaReserva.toY(p.valor)}
                            r="9"
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={(e) =>
                              setGraficaPredHover({
                                dia: p.dia,
                                valor: p.valor,
                                fechaTxt,
                                x: e.nativeEvent.offsetX,
                                y: e.nativeEvent.offsetY,
                              })
                            }
                            onMouseMove={(e) =>
                              setGraficaPredHover((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      x: e.nativeEvent.offsetX,
                                      y: e.nativeEvent.offsetY,
                                    }
                                  : prev,
                              )
                            }
                          />
                        );
                      })}
                      {curvaAgregada &&
                        hitosGraficaFechas
                          .filter((h) => h.dia <= graficaReserva.xMax)
                          .map((h) => {
                            const x = graficaReserva.toX(h.dia);
                            const valorH = modeloVentas3Fechas
                              ? modeloVentas3Fechas.ventasDia(h.dia)
                              : curvaAgregada.x0 * Math.exp(curvaAgregada.k * h.dia);
                            const y = graficaReserva.toY(valorH);
                            const ventasDiaH = modeloVentas3Fechas
                              ? h.key === "f1"
                                ? modeloVentas3Fechas.v1
                                : h.key === "f2"
                                  ? modeloVentas3Fechas.v2
                                  : modeloVentas3Fechas.ventasDia(h.dia)
                              : promedioDiarioVentasGlobal;
                            return (
                              <g key={`hito-${h.key}-${h.dia}`}>
                                <line
                                  x1={x}
                                  y1={graficaReserva.padT}
                                  x2={x}
                                  y2={graficaReserva.padT + graficaReserva.innerH}
                                  stroke="var(--logo-branding)"
                                  strokeWidth="1"
                                  strokeDasharray="2 4"
                                  opacity={0.7}
                                />
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="5"
                                  fill="var(--logo-branding)"
                                  stroke="var(--superficie-elevada)"
                                  strokeWidth="1.5"
                                />
                                <text
                                  x={x}
                                  y={Math.max(graficaReserva.padT + 10, y - 10)}
                                  textAnchor="middle"
                                  fontSize="10"
                                  fontWeight="700"
                                  fill="var(--logo-branding)"
                                >
                                  {h.label}
                                </text>
                                <title>{`${h.label} · ${h.fecha.toLocaleDateString("es-MX")} · t=${h.dia} d · ventas día=${ventasDiaH.toFixed(1)} u.`}</title>
                              </g>
                            );
                          })}
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
                        {graficaModoVentas ? "Ventas/día" : "Stock"}
                      </text>
                      {[
                        0,
                        Math.round(graficaReserva.xMax / 2),
                        graficaReserva.xMax,
                      ].map((d) => {
                        const dt = fechaInicioModelo
                          ? new Date(fechaInicioModelo)
                          : new Date();
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
                    {graficaPredHover && (
                      <div
                        className="pointer-events-none absolute z-20 rounded-md border px-2 py-1.5 text-xs shadow-lg"
                        style={{
                          left: Math.min(
                            Math.max(8, graficaPredHover.x + 12),
                            560,
                          ),
                          top: Math.max(8, graficaPredHover.y - 34),
                          color: "var(--menu-texto-principal)",
                          backgroundColor: "var(--superficie-elevada)",
                          borderColor:
                            "color-mix(in srgb, var(--tarjetas-paneles) 45%, transparent)",
                        }}
                      >
                        <p className="font-semibold tabular-nums">
                          t={graficaPredHover.dia} d
                        </p>
                        <p>{graficaPredHover.fechaTxt}</p>
                        <p className="tabular-nums">
                          {graficaModoVentas
                            ? `${graficaPredHover.valor.toFixed(1)} u./día`
                            : `${graficaPredHover.valor.toFixed(1)} u.`}
                        </p>
                      </div>
                    )}
                    <p
                      className="text-xs mt-3"
                      style={{ color: "var(--encabezados-alterno)" }}
                    >
                      {graficaModoVentas
                        ? "Curva dinámica basada en ventas por día (F1/F2) y proyección en F3."
                        : curvaAgregada.subtitulo}
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--encabezados-alterno)" }}
                    >
                      Fecha 1 (inicio):{" "}
                      {fechaInicioModelo
                        ? fechaInicioModelo.toLocaleDateString("es-MX")
                        : "—"}{" "}
                      · Fecha 2 (corte):{" "}
                      {rangoFechasParseado
                        ? rangoFechasParseado.fin.toLocaleDateString("es-MX")
                        : "—"}{" "}
                      · Fecha 3 (predicción):{" "}
                      {fechaProyeccionValida
                        ? fechaProyeccionValida.toLocaleDateString("es-MX")
                        : "—"}
                    </p>
                    {hitosGraficaFechas.length > 0 && curvaAgregada && (
                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--encabezados-alterno)" }}
                      >
                        {hitosGraficaFechas
                          .map((h) => {
                            const xh = modeloVentas3Fechas
                              ? modeloVentas3Fechas.ventasDia(h.dia)
                              : curvaAgregada.x0 * Math.exp(curvaAgregada.k * h.dia);
                            const vh = modeloVentas3Fechas
                              ? h.key === "f1"
                                ? modeloVentas3Fechas.v1
                                : h.key === "f2"
                                  ? modeloVentas3Fechas.v2
                                  : modeloVentas3Fechas.ventasDia(h.dia)
                              : promedioDiarioVentasGlobal;
                            return graficaModoVentas
                              ? `${h.label}: t=${h.dia} d · ventas día ${xh.toFixed(1)} u.`
                              : `${h.label}: t=${h.dia} d · stock ${xh.toFixed(1)} u. · ventas día ${vh.toFixed(1)} u.`;
                          })
                          .join("  |  ")}
                      </p>
                    )}
                    {modeloVentas3Fechas && (
                      <div
                        className="mt-3 rounded-lg border overflow-x-auto"
                        style={{
                          borderColor:
                            "color-mix(in srgb, var(--tarjetas-paneles) 45%, transparent)",
                          backgroundColor:
                            "color-mix(in srgb, var(--fondos-suaves) 35%, var(--superficie-elevada))",
                        }}
                      >
                        <table className="w-full min-w-[560px] text-xs">
                          <thead>
                            <tr
                              style={{
                                backgroundColor:
                                  "color-mix(in srgb, var(--tarjetas-paneles) 25%, transparent)",
                              }}
                            >
                              <th className="px-3 py-2 text-left font-semibold">Punto</th>
                              <th className="px-3 py-2 text-left font-semibold">x (ventas día)</th>
                              <th className="px-3 py-2 text-left font-semibold">t</th>
                              <th className="px-3 py-2 text-left font-semibold">fecha</th>
                            </tr>
                          </thead>
                          <tbody style={{ color: "var(--menu-texto-principal)" }}>
                            <tr>
                              <td className="px-3 py-2 font-medium">CI (F1)</td>
                              <td className="px-3 py-2 tabular-nums">
                                {Math.round(modeloVentas3Fechas.v1)}
                              </td>
                              <td className="px-3 py-2 tabular-nums">0</td>
                              <td className="px-3 py-2">
                                {modeloVentas3Fechas.f1.toLocaleDateString("es-MX")}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">k (F2)</td>
                              <td className="px-3 py-2 tabular-nums">
                                {Math.round(modeloVentas3Fechas.v2)}
                              </td>
                              <td className="px-3 py-2 tabular-nums">
                                {modeloVentas3Fechas.t2}
                              </td>
                              <td className="px-3 py-2">
                                {modeloVentas3Fechas.f2.toLocaleDateString("es-MX")}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">p1 (F3)</td>
                              <td className="px-3 py-2 tabular-nums">
                                {Math.round(modeloVentas3Fechas.v3)}
                              </td>
                              <td className="px-3 py-2 tabular-nums">
                                {modeloVentas3Fechas.t3}
                              </td>
                              <td className="px-3 py-2">
                                {fechaProyeccionValida
                                  ? fechaProyeccionValida.toLocaleDateString("es-MX")
                                  : "—"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <p
                          className="px-3 py-2 border-t"
                          style={{
                            color: "var(--encabezados-alterno)",
                            borderColor:
                              "color-mix(in srgb, var(--tarjetas-paneles) 40%, transparent)",
                          }}
                        >
                          Modelo usado: <strong>dx/dt = kx</strong> sobre ventas del día.
                          k = ln(x₂/x₁) / (t₂ - t₁) ={" "}
                          <span className="tabular-nums">
                            {modeloVentas3Fechas.kVentas.toFixed(6)}
                          </span>
                        </p>
                      </div>
                    )}
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
                className="mb-6 rounded-2xl border-0"
                style={superficieCard}
              >
                <h3
                  className="text-lg font-semibold mb-1 flex items-center gap-2"
                  style={{ color: "var(--menu-texto-principal)" }}
                >
                  <CalendarDays
                    className="h-5 w-5 shrink-0"
                    style={{ color: "var(--iconografia)" }}
                    aria-hidden
                  />
                  Origen de datos (ventas)
                </h3>
                <p
                  className="text-xs mb-3"
                  style={{ color: "var(--encabezados-alterno)" }}
                >
                  Suma de unidades por <strong>fecha de pedido</strong> en el
                  rango actual (
                  {ventanaOrigenPedidos.modo === "rango" && rangoFechasParseado
                    ? "rango fijo"
                    : "últimos"}{" "}
                  {ventanaOrigenPedidos.dias} d). Respeta los filtros de
                  categoría y producto.
                </p>
                {loading ? (
                  <p
                    className="text-xs"
                    style={{ color: "var(--encabezados-alterno)" }}
                  >
                    Cargando origen de ventas…
                  </p>
                ) : !graficaOrigenVentas || serieOrigenVentasDia.length === 0 ? (
                  <p
                    className="text-xs"
                    style={{ color: "var(--encabezados-alterno)" }}
                  >
                    Sin ventas con fecha en el rango seleccionado, o aún no hay
                    datos.
                  </p>
                ) : (
                  <div
                    className="w-full overflow-x-auto p-3 sm:p-4"
                    style={chartWellStyle}
                  >
                    <svg
                      viewBox={`0 0 ${graficaOrigenVentas.w} ${graficaOrigenVentas.h}`}
                      width="100%"
                      height="auto"
                      className="min-h-[200px] max-h-[240px]"
                      role="img"
                      aria-label="Unidades de venta por día"
                    >
                      {[
                        0,
                        Math.round(graficaOrigenVentas.maxU / 2),
                        graficaOrigenVentas.maxU,
                      ].map((v, i) => {
                        const y = graficaOrigenVentas.toY(v);
                        return (
                          <g key={`goy-${i}`}>
                            <line
                              x1={graficaOrigenVentas.padL}
                              y1={y}
                              x2={graficaOrigenVentas.w - graficaOrigenVentas.padR}
                              y2={y}
                              stroke="var(--encabezados-alterno)"
                              strokeWidth="0.5"
                              strokeDasharray="3 4"
                              opacity={0.35}
                            />
                            <text
                              x={graficaOrigenVentas.padL - 6}
                              y={y + 4}
                              textAnchor="end"
                              fontSize="10"
                              fill="var(--encabezados-alterno)"
                            >
                              {v}
                            </text>
                          </g>
                        );
                      })}
                      {serieOrigenVentasDia.map((p, i) => {
                        const cx = graficaOrigenVentas.toX(i);
                        const yTop = graficaOrigenVentas.toY(p.u);
                        const hBar = Math.max(
                          0.5,
                          graficaOrigenVentas.yBase - yTop,
                        );
                        return (
                          <g key={p.clave}>
                            <rect
                              x={cx - graficaOrigenVentas.barW / 2}
                              y={yTop}
                              width={graficaOrigenVentas.barW}
                              height={hBar}
                              fill={CHART_COLORS_MARCA[0]}
                              rx="2"
                              className="cursor-pointer"
                              onMouseEnter={() => setOrigenBarraHover(p.clave)}
                              onMouseLeave={() => setOrigenBarraHover(null)}
                            />
                            <title>{`${p.etiqueta}: ${p.u} u. · $${p.m.toFixed(2)}`}</title>
                            {serieOrigenVentasDia.length <= 14 && (
                              <text
                                x={cx}
                                y={graficaOrigenVentas.h - 4}
                                textAnchor="middle"
                                fontSize="9"
                                fill="var(--encabezados-alterno)"
                              >
                                {p.etiqueta}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                    {serieOrigenVentasDia.length > 14 && (
                      <p
                        className="text-xs mt-2"
                        style={{ color: "var(--encabezados-alterno)" }}
                      >
                        Eje horizontal: un punto por día en el rango. Barra
                        baja o cero = sin unidades de venta ese día.
                      </p>
                    )}
                    <p
                      className="text-xs mt-2"
                      style={{ color: "var(--menu-texto-principal)" }}
                    >
                      {datoOrigenHover
                        ? `${datoOrigenHover.etiqueta}: ${datoOrigenHover.u} u. · $${datoOrigenHover.m.toFixed(2)}`
                        : "Pasa el puntero sobre una barra para ver el detalle del día."}
                    </p>
                  </div>
                )}
              </Card>

              <Card
                variant="elevated"
                padding="lg"
                className="mb-6 scroll-mt-24 rounded-2xl border-0"
                style={superficieCard}
              >
                <h3
                  className="text-lg font-semibold mb-2"
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
                <div className="flex justify-end gap-2 mb-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTablaOverlayOpen(true)}
                    disabled={predicciones.length === 0}
                  >
                    <Maximize2 className="h-4 w-4 mr-1.5" aria-hidden />
                    Ver tabla completa
                  </Button>
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
                  className="text-lg font-semibold mb-1"
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

        {tablaOverlayOpen && (
          <div
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-[1px] p-3 sm:p-5"
            onClick={() => setTablaOverlayOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Tabla de predicción ampliada"
          >
            <div
              className="mx-auto h-full w-full max-w-[1450px] rounded-2xl border p-4 sm:p-5 flex flex-col"
              style={{
                backgroundColor: "var(--superficie-elevada)",
                borderColor:
                  "color-mix(in srgb, var(--tarjetas-paneles) 45%, transparent)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: "var(--menu-texto-principal)" }}
                  >
                    Tabla completa de predicción
                  </h3>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--encabezados-alterno)" }}
                  >
                    Unidades = pedidos válidos en el período. Salida estimada =
                    referencia, no pronóstico exacto.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportarCsv}
                    disabled={predicciones.length === 0}
                  >
                    Exportar CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTablaOverlayOpen(false)}
                  >
                    Cerrar
                  </Button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
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
                        <TableRow key={`overlay-${p.id}`}>
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
                              className="text-xs mt-1.5 leading-relaxed"
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
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
