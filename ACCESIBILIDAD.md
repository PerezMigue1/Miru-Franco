# Guía de Herramientas de Accesibilidad

## Herramientas Recomendadas para este Proyecto

### 1. WAVE (Web Accessibility Evaluation Tool)
**Tipo:** Extensión de navegador  
**Instalación:**
- Chrome: https://chrome.google.com/webstore/detail/wave-evaluation-tool/jbbplnpkjmmeebjpijfedlgcdilocofh
- Firefox: https://addons.mozilla.org/en-US/firefox/addon/wave-accessibility-tool/

**Cómo usar:**
1. Instala la extensión
2. Abre tu aplicación en `http://localhost:3000`
3. Haz clic en el ícono de WAVE en la barra de herramientas
4. Revisa los errores (rojo) y advertencias (amarillo)
5. Corrige los problemas señalados

**Qué detecta:**
- Falta de etiquetas alt en imágenes
- Contraste de colores insuficiente
- Falta de encabezados
- Problemas con formularios
- Estructura de la página

---

### 2. Lighthouse (Chrome DevTools)
**Tipo:** Herramienta integrada en Chrome  
**Cómo usar:**
1. Abre tu aplicación en Chrome
2. Presiona `F12` para abrir DevTools
3. Ve a la pestaña "Lighthouse"
4. Marca solo "Accessibility"
5. Haz clic en "Generate report"
6. Revisa la puntuación (objetivo: 90+)
7. Revisa los problemas detectados

**Qué detecta:**
- Puntuación de accesibilidad (0-100)
- Problemas de ARIA
- Contraste de colores
- Navegación por teclado
- Semántica HTML

---

### 3. Contrast Checker
**Tipo:** Herramienta web / Extensión  
**Opciones:**
- Web: https://webaim.org/resources/contrastchecker/
- Extensión Chrome: https://chrome.google.com/webstore/detail/color-contrast-checker/fplafidjghaflfagimggcggaefajljjf

**Cómo usar:**
1. Abre la herramienta
2. Ingresa tus colores:
   - **Fondo:** `#F2F1ED` (textoFondoOscuro)
   - **Texto:** `#710014` (menuTextoPrincipal)
3. Verifica que el ratio sea ≥ 4.5:1 (WCAG AA) o ≥ 7:1 (WCAG AAA)

**Colores a verificar en este proyecto:**
- `#F2F1ED` (fondo) vs `#710014` (texto principal)
- `#F2F1ED` (fondo) vs `#B38E6F` (texto alterno)
- `#DCC8B6` (fondo general) vs `#710014` (texto)

---

### 4. Navegación por Teclado (Prueba Manual)
**Tipo:** Prueba manual  
**Cómo probar:**
1. Abre tu aplicación
2. Presiona `Tab` para navegar hacia adelante
3. Presiona `Shift + Tab` para navegar hacia atrás
4. Presiona `Enter` o `Space` para activar botones
5. Presiona `Esc` para cerrar modales
6. Verifica que:
   - Todos los elementos sean accesibles
   - Haya un indicador visual de foco
   - El orden de navegación sea lógico
   - No haya "trampas de teclado"

**Atajos importantes:**
- `Tab` - Siguiente elemento
- `Shift + Tab` - Elemento anterior
- `Enter` / `Space` - Activar botón/enlace
- `Esc` - Cerrar modal/dropdown
- `Flechas` - Navegar en listas/opciones

---

### 5. Lectores de Pantalla

#### NVDA (Windows - Gratuito)
**Descarga:** https://www.nvaccess.org/download/  
**Cómo usar:**
1. Descarga e instala NVDA
2. Ejecuta NVDA
3. Navega por tu aplicación
4. Escucha lo que lee el lector
5. Verifica que:
   - Los elementos se anuncien correctamente
   - Los botones tengan etiquetas descriptivas
   - Los formularios tengan etiquetas asociadas
   - Los mensajes de error se anuncien

**Comandos básicos:**
- `NVDA + Flechas` - Leer contenido
- `Tab` - Navegar entre elementos
- `NVDA + K` - Leer siguiente encabezado

#### VoiceOver (Mac - Integrado)
**Cómo activar:**
1. Presiona `Cmd + F5` para activar VoiceOver
2. O ve a Preferencias del Sistema > Accesibilidad > VoiceOver

**Comandos básicos:**
- `VO + Flechas` - Navegar
- `VO + A` - Leer desde el cursor
- `VO + B` - Leer desde el inicio
- `Tab` - Siguiente elemento interactivo

---

### 6. axe DevTools (Extensión)
**Tipo:** Extensión de Chrome  
**Instalación:** https://chrome.google.com/webstore/detail/axe-devtools-web-accessibility/lhdoppojpmngadmnindnejefpokejbdd

**Cómo usar:**
1. Instala la extensión
2. Abre tu aplicación
3. Presiona `F12` para abrir DevTools
4. Ve a la pestaña "axe DevTools"
5. Haz clic en "Scan"
6. Revisa los problemas detectados
7. Corrige los problemas

**Ventajas:**
- Detecta problemas en tiempo real
- Muestra el código problemático
- Sugiere soluciones

---

## Checklist de Accesibilidad

### ✅ Contraste de Colores
- [ ] Verificar todos los pares de colores con Contrast Checker
- [ ] Asegurar ratio mínimo de 4.5:1 para texto normal
- [ ] Asegurar ratio mínimo de 3:1 para texto grande (18pt+)

### ✅ Navegación por Teclado
- [ ] Todos los elementos interactivos son accesibles con Tab
- [ ] Hay indicador visual de foco
- [ ] No hay "trampas de teclado"
- [ ] El orden de navegación es lógico

### ✅ Etiquetas y ARIA
- [ ] Todos los inputs tienen etiquetas asociadas
- [ ] Los botones tienen texto descriptivo o aria-label
- [ ] Las imágenes tienen alt text descriptivo
- [ ] Los modales tienen aria-modal="true"
- [ ] Los elementos interactivos tienen roles ARIA apropiados

### ✅ Estructura Semántica
- [ ] Uso correcto de encabezados (h1, h2, h3...)
- [ ] Uso de landmarks (nav, main, aside, footer)
- [ ] Listas usan elementos `<ul>` o `<ol>`
- [ ] Formularios están correctamente estructurados

### ✅ Lectores de Pantalla
- [ ] Probar con NVDA o VoiceOver
- [ ] Verificar que el contenido se anuncie correctamente
- [ ] Verificar que los mensajes de error se anuncien
- [ ] Verificar que los cambios dinámicos se anuncien

---

## Próximos Pasos

1. **Instalar WAVE** y ejecutar en todas las páginas principales
2. **Ejecutar Lighthouse** y obtener puntuación de accesibilidad
3. **Verificar contraste** de todos los pares de colores
4. **Probar navegación por teclado** en todas las páginas
5. **Probar con lector de pantalla** en flujos críticos
6. **Corregir problemas** detectados por las herramientas

---

## Recursos Adicionales

- **WCAG 2.1 Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **WebAIM:** https://webaim.org/
- **A11y Project:** https://www.a11yproject.com/
- **MDN Accessibility:** https://developer.mozilla.org/en-US/docs/Web/Accessibility

