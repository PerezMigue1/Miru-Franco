import { Check } from 'lucide-react';

/** Sello animado de confirmación (styles/cliente.css `.mf-sello`): anillo dorado + check. */
export default function SelloConfirmacion() {
  return (
    <span className="mf-sello" aria-hidden>
      <svg viewBox="0 0 88 88">
        <circle cx="44" cy="44" r="42" />
      </svg>
      <span className="mf-sello__icono">
        <Check size={30} strokeWidth={2.5} />
      </span>
    </span>
  );
}
