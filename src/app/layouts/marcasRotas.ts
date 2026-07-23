// Enlaces rotos: /marcas/* nunca se construyó. Ocultos, no borrar.
// Fuente única para MenuHorizontal.tsx y MenuHamburguesa.tsx — antes cada uno
// tenía su propia copia (desincronizadas: a una le faltaba Pantene, la otra
// escribía "Kérastase" con acento distinto). El filtro por marca real y
// funcional vive en el sidebar del catálogo (cliente/tienda-online), no aquí.
//
// Anotado con `: boolean` a propósito (no el literal `false`): con el tipo
// literal, TypeScript trata el JSX que lo usa como código inalcanzable y dejó
// de angostar tipos correctamente en otro lugar de este mismo repo — ver
// checkout/page.tsx::MOSTRAR_ENTREGA_DOMICILIO para el caso que lo destapó.
export const MOSTRAR_MARCAS: boolean = false;

export interface MarcaRota {
  name: string;
  href: string;
}

export const MARCAS_ROTAS: MarcaRota[] = [
  { name: "L'Oréal", href: '/marcas/loreal' },
  { name: 'Kerastase', href: '/marcas/kerastase' },
  { name: 'Revlon', href: '/marcas/revlon' },
  { name: 'Schwarzkopf', href: '/marcas/schwarzkopf' },
  { name: 'Wella', href: '/marcas/wella' },
  { name: 'Matrix', href: '/marcas/matrix' },
  { name: 'Pantene', href: '/marcas/pantene' },
];
