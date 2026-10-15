import { documentoLegal } from '../../utils/documentosLegales';

/** Domicilio de la responsable, el mismo que publican los Términos y el Aviso de Privacidad. */
const DOMICILIO_RESPONSABLE = 'Segunda Cerrada de Allende No. 15, Col. Juárez, Huejutla de Reyes, Hidalgo, C.P. 43000';

interface AvisoSimplificadoProps {
  /** Para qué se usan los datos de este formulario, en segunda persona: "procesar tu pedido y tu pago". */
  finalidad: string;
  className?: string;
}

/**
 * Aviso de privacidad simplificado: va junto al botón de envío de cada formulario que recaba datos. El enlace
 * abre el Aviso integral en otra pestaña para no perder lo capturado. Estilos en cliente.css
 * (`.mf-leyenda-terminos`, la misma leyenda de "aceptas los Términos").
 */
export default function AvisoSimplificado({ finalidad, className = '' }: AvisoSimplificadoProps) {
  return (
    <p className={`mf-leyenda-terminos ${className}`.trim()}>
      Mirú Franco Salón Beauty, {DOMICILIO_RESPONSABLE}, usará tus datos para {finalidad}. Puedes limitar su uso y
      ejercer tus derechos como dice el{' '}
      <a href={documentoLegal('aviso-privacidad').ruta} target="_blank" rel="noopener noreferrer">
        Aviso de privacidad<span className="sr-only"> (se abre en otra pestaña)</span>
      </a>
      .
    </p>
  );
}
