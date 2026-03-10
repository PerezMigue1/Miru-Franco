/**
 * Renderiza código Mermaid a SVG/PNG en el navegador.
 * Evita el error "document is not defined" del backend (Node.js).
 * Usa fuentes del sistema para evitar "Tainted canvas" al exportar PNG.
 */

export async function mermaidToSvg(mermaidCode: string): Promise<string> {
  const mermaid = (await import('mermaid')).default;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'neutral',
    er: { useMaxWidth: true },
    themeVariables: {
      fontFamily: 'Arial, Helvetica, sans-serif',
      primaryColor: '#eee',
      primaryTextColor: '#333',
      primaryBorderColor: '#999',
      lineColor: '#666',
      secondaryColor: '#ddd',
      tertiaryColor: '#fff',
    },
  });
  const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { svg } = await mermaid.render(id, mermaidCode);
  return svg;
}

function getSvgDimensions(svgString: string): { width: number; height: number } {
  const viewBoxMatch = svgString.match(/viewBox=["']([^"']+)["']/);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/\s+/);
    if (parts.length >= 4) {
      const w = parseFloat(parts[2]);
      const h = parseFloat(parts[3]);
      if (w > 0 && h > 0) return { width: Math.ceil(w), height: Math.ceil(h) };
    }
  }
  const wMatch = svgString.match(/width=["']([^"']+)["']/);
  const hMatch = svgString.match(/height=["']([^"']+)["']/);
  if (wMatch && hMatch) {
    const w = parseFloat(wMatch[1]);
    const h = parseFloat(hMatch[1]);
    if (w > 0 && h > 0) return { width: Math.ceil(w), height: Math.ceil(h) };
  }
  return { width: 1200, height: 800 };
}

/**
 * Elimina referencias externas del SVG que pueden "manchar" el canvas.
 * Evita "Tainted canvases may not be exported" al generar PNG.
 */
function sanitizeSvgForCanvas(svgString: string): string {
  return svgString
    .replace(/url\(["']?https?:\/\/[^"')]+["']?\)/gi, 'none')
    .replace(/xlink:href=["']https?:\/\/[^"']+["']/gi, '')
    .replace(/href=["']https?:\/\/[^"']+["']/gi, '');
}

/** Escala para PNG: multiplica las dimensiones para mejor calidad y tamaño legible */
const PNG_SCALE = 3;

/** Dimensiones mínimas del PNG (px) para que se vea bien incluso en diagramas pequeños */
const MIN_PNG_WIDTH = 1800;
const MIN_PNG_HEIGHT = 1200;

export async function svgToPngBlob(svgString: string): Promise<Blob> {
  const { width, height } = getSvgDimensions(svgString);
  let svgForImg = sanitizeSvgForCanvas(svgString);
  const baseW = Math.max(width, MIN_PNG_WIDTH / PNG_SCALE);
  const baseH = Math.max(height, MIN_PNG_HEIGHT / PNG_SCALE);

  // Forzar dimensiones explícitas en píxeles para que el SVG completo se renderice
  // (Mermaid usa width="100%" que hace que el Image muestre solo una porción del diagrama)
  svgForImg = svgForImg.replace(/<svg([^>]*)>/, (_, attrs) => {
    const cleaned = attrs
      .replace(/\s*width\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\s*height\s*=\s*["'][^"']*["']/gi, '')
      .trim();
    return `<svg width="${baseW}" height="${baseH}" ${cleaned}>`;
  });

  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBase64 = btoa(unescape(encodeURIComponent(svgForImg)));
    const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const srcW = baseW;
      const srcH = baseH;
      canvas.width = Math.max(Math.ceil(srcW * PNG_SCALE), MIN_PNG_WIDTH);
      canvas.height = Math.max(Math.ceil(srcH * PNG_SCALE), MIN_PNG_HEIGHT);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo crear el contexto del canvas'));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, srcW, srcH, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (pngBlob) => {
          if (pngBlob) resolve(pngBlob);
          else reject(new Error('No se pudo generar PNG'));
        },
        'image/png',
        1
      );
    };

    img.onerror = () => {
      reject(new Error('Error al cargar el SVG'));
    };

    img.src = dataUrl;
  });
}
