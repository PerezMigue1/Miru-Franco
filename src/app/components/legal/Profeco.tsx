/** Datos de contacto de la Procuraduría Federal del Consumidor: los usan las páginas legales y el pie de página. */
export const PROFECO = {
  telefonoCdmx: { visible: '55 5568 8722', enlace: 'tel:+525555688722' },
  telefonoPais: { visible: '800 468 8722', enlace: 'tel:+528004688722' },
  sitio: { visible: 'www.gob.mx/profeco', url: 'https://www.gob.mx/profeco' },
} as const;

/**
 * "Teléfono del Consumidor 55 5568 8722 (CDMX y zona metropolitana) y 800 468 8722 (resto del país), sitio
 * www.gob.mx/profeco", con los teléfonos y el sitio como enlaces. Va dentro de un párrafo de texto legal.
 */
export default function ContactoProfeco() {
  return (
    <>
      Teléfono del Consumidor <a href={PROFECO.telefonoCdmx.enlace}>{PROFECO.telefonoCdmx.visible}</a> (CDMX y zona
      metropolitana) y <a href={PROFECO.telefonoPais.enlace}>{PROFECO.telefonoPais.visible}</a> (resto del país), sitio{' '}
      <a href={PROFECO.sitio.url} target="_blank" rel="noopener noreferrer">
        {PROFECO.sitio.visible}
        <span className="sr-only"> (se abre en otra pestaña)</span>
      </a>
    </>
  );
}
