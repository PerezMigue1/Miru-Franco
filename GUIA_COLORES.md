# 🎨 Guía de Uso - Sistema de Colores

## ✅ Sistema Implementado (Opción Híbrida)

Ahora tienes **3 formas** de usar colores, elige la que más te convenga:

---

## 1️⃣ **Clases Tailwind (Recomendado para estilos estáticos)**

Ahora puedes usar tus colores como clases Tailwind:

```tsx
// ✅ Usando clases Tailwind
<div className="bg-header-footer text-texto-fondo-oscuro">
  <button className="bg-botones-principales hover:bg-hover">
    Click Me
  </button>
</div>
```

### Colores disponibles en Tailwind:
- `bg-fondo-general` / `text-fondo-general`
- `bg-logo-branding` / `text-logo-branding`
- `bg-tarjetas-paneles` / `text-tarjetas-paneles`
- `bg-header-footer` / `text-header-footer`
- `bg-menu-texto-principal` / `text-menu-texto-principal`
- `bg-warning` / `text-warning`
- `bg-danger` / `text-danger`
- `bg-success` / `text-success`
- `bg-encabezados-alterno` / `text-encabezados-alterno`
- `bg-hover` / `text-hover`
- `bg-botones-principales` / `text-botones-principales`
- `bg-texto-fondo-oscuro` / `text-texto-fondo-oscuro`
- `bg-enlaces-textos-interactivos` / `text-enlaces-textos-interactivos`
- `bg-fondos-suaves` / `text-fondos-suaves`
- `bg-iconografia` / `text-iconografia`

---

## 2️⃣ **Constantes TypeScript (Para estilos dinámicos)**

Usa el archivo `colors.ts` cuando necesites:
- Estilos inline dinámicos
- Valores calculados
- Lógica condicional

```tsx
import { colors, colorsWithOpacity } from '@/app/utils/colors';

// ✅ Para estilos inline dinámicos
<button 
  style={{ 
    backgroundColor: isActive ? colors.hover : colors.botonesPrincipales 
  }}
  onMouseEnter={(e) => 
    e.currentTarget.style.backgroundColor = colors.hover
  }
>
  Click Me
</button>
```

---

## 3️⃣ **Variables CSS (Para CSS puro)**

Para archivos CSS o cuando necesites variables CSS:

```css
/* ✅ En archivos .css */
.mi-clase {
  background-color: var(--header-footer);
  color: var(--texto-fondo-oscuro);
}
```

```tsx
// ✅ En componentes React
<div style={{ backgroundColor: 'var(--header-footer)' }}>
```

---

## 📋 Comparación: ¿Cuándo usar cada uno?

| Escenario | Recomendación | Ejemplo |
|-----------|--------------|---------|
| Estilos estáticos | ✅ Clases Tailwind | `className="bg-header-footer"` |
| Estilos dinámicos | ✅ Constantes TypeScript | `style={{ bg: isActive ? colors.hover : colors.botonesPrincipales }}` |
| Hover effects inline | ✅ Constantes TypeScript | `onMouseEnter={(e) => e.currentTarget.style.bg = colors.hover}` |
| CSS puro | ✅ Variables CSS | `background-color: var(--header-footer)` |

---

## 🎯 Recomendación para tu proyecto:

1. **Nuevos componentes**: Usa clases Tailwind cuando sea posible
2. **Componentes existentes**: Puedes dejarlos con `style={{}}` o migrarlos gradualmente
3. **Estilos dinámicos**: Siempre usa `colors.ts`

---

## 💡 Ejemplo Práctico

### Antes:
```tsx
<header style={{ backgroundColor: '#161616' }}>
  <h1 style={{ color: '#9f6d1f' }}>MIRÚ FRANCO</h1>
  <button style={{ backgroundColor: '#710014' }}>
```

### Opción A (Clases Tailwind):
```tsx
<header className="bg-header-footer">
  <h1 className="text-logo-branding">MIRÚ FRANCO</h1>
  <button className="bg-botones-principales hover:bg-hover">
```

### Opción B (Constantes - si necesitas lógica):
```tsx
import { colors } from '@/app/utils/colors';

<header style={{ backgroundColor: colors.headerFooter }}>
  <h1 style={{ color: colors.logoBranding }}>MIRÚ FRANCO</h1>
  <button 
    style={{ backgroundColor: colors.botonesPrincipales }}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.hover}
  >
```

---

## ✅ Ventajas del Sistema Híbrido

1. **Flexibilidad**: Usa el método que mejor se adapte a cada caso
2. **Mantenibilidad**: Todos los colores centralizados
3. **Performance**: Tailwind pre-compila las clases
4. **Type-safety**: TypeScript te ayuda con autocompletado
5. **Migración gradual**: Puedes actualizar componentes poco a poco

---

## 🔄 Cambiar un Color Globalmente

Si necesitas cambiar un color, solo actualiza **3 lugares**:

1. **`globals.css`** - Variables CSS:
```css
--header-footer: #nuevo-color;
```

2. **`colors.ts`** - Constantes TypeScript:
```ts
headerFooter: '#nuevo-color',
```

3. **Tailwind se actualiza automáticamente** (usa las variables CSS)

¡Eso es todo! 🎉

