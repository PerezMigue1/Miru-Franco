'use client';

import type { ContenidoContacto, ContenidoInicio, ContenidoSobreNosotros } from '../../../services/configuracionSitio';
import ImagenCloudinary, { urlImagenMostrable } from './ImagenCloudinary';
import { ListaParrafos, ListaValores } from './ListasEditables';
import { CampoConfig, VistaPrevia } from './piezas';
import { CAMPOS_CONTACTO, CAMPOS_INICIO, CAMPOS_SOBRE_NOSOTROS, LISTAS, type Errores } from './validacionConfiguracion';

interface FormProps<T> {
  valor: T;
  errores: Errores;
  onCambiar: (valor: T) => void;
}

const TITULO_PREVIA = { fontFamily: 'var(--font-family-serif)', color: 'var(--menu-texto-principal)' };

function Subtitulo({ children }: { children: string }) {
  return (
    <h4 className="mb-3 text-base font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
      {children}
    </h4>
  );
}

export function FormInicio({ valor, errores, onCambiar }: FormProps<ContenidoInicio>) {
  const campo = (k: Exclude<keyof ContenidoInicio, 'sobreNosotrosParrafos' | 'sobreNosotrosImagen'>) => (
    <CampoConfig id={`inicio-${k}`} def={CAMPOS_INICIO[k]} valor={valor[k]} onCambiar={(v) => onCambiar({ ...valor, [k]: v })} error={errores[k]} />
  );
  return (
    <div className="space-y-6">
      <section>
        <Subtitulo>Portada</Subtitulo>
        <div className="grid grid-cols-1 gap-4">
          {campo('heroDestacado')}
          {campo('heroTexto')}
        </div>
      </section>
      <section>
        <Subtitulo>Textos de las secciones</Subtitulo>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {campo('productosDescripcion')}
          {campo('serviciosDescripcion')}
          {campo('trabajoDescripcion')}
        </div>
      </section>
      <section className="space-y-4">
        <Subtitulo>&quot;Sobre nosotros&quot; en el inicio</Subtitulo>
        <ListaParrafos
          id="inicio-parrafo"
          titulo="Párrafos"
          parrafos={valor.sobreNosotrosParrafos}
          llave="sobreNosotrosParrafos"
          errores={errores}
          {...LISTAS.parrafosInicio}
          onCambiar={(p) => onCambiar({ ...valor, sobreNosotrosParrafos: p })}
        />
        <ImagenCloudinary
          id="inicio-sobreNosotrosImagen"
          def={CAMPOS_INICIO.sobreNosotrosImagen}
          valor={valor.sobreNosotrosImagen}
          onCambiar={(v) => onCambiar({ ...valor, sobreNosotrosImagen: v })}
          error={errores.sobreNosotrosImagen}
        />
      </section>
      <section>
        <Subtitulo>Cierre</Subtitulo>
        <div className="grid grid-cols-1 gap-4">
          {campo('cierreTitulo')}
          {campo('cierreTexto')}
        </div>
      </section>
    </div>
  );
}

export function VistaPreviaInicio({ valor }: { valor: ContenidoInicio }) {
  return (
    <VistaPrevia titulo="Así se lee en el inicio">
      <div className="space-y-4 text-sm leading-relaxed">
        <p className="text-2xl font-bold" style={TITULO_PREVIA}>
          {valor.heroDestacado}
        </p>
        <p>{valor.heroTexto}</p>
        <dl className="space-y-2">
          {[
            ['Productos', valor.productosDescripcion],
            ['Servicios', valor.serviciosDescripcion],
            ['Nuestro trabajo', valor.trabajoDescripcion],
          ].map(([t, d]) => (
            <div key={t}>
              <dt className="font-semibold">{t}</dt>
              <dd>{d || '(sin texto)'}</dd>
            </div>
          ))}
        </dl>
        <div className="space-y-2">
          <p className="font-semibold">Sobre nosotros</p>
          {valor.sobreNosotrosParrafos.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div>
          <p className="text-lg font-bold" style={TITULO_PREVIA}>
            {valor.cierreTitulo}
          </p>
          {valor.cierreTexto && <p>{valor.cierreTexto}</p>}
        </div>
      </div>
    </VistaPrevia>
  );
}

export function FormSobreNosotros({ valor, errores, onCambiar }: FormProps<ContenidoSobreNosotros>) {
  return (
    <div className="space-y-6">
      <CampoConfig id="sobre-titulo" def={CAMPOS_SOBRE_NOSOTROS.titulo} valor={valor.titulo} onCambiar={(v) => onCambiar({ ...valor, titulo: v })} error={errores.titulo} />
      <ListaParrafos
        id="sobre-parrafo"
        titulo="Párrafos de la historia"
        parrafos={valor.parrafos}
        llave="parrafos"
        errores={errores}
        {...LISTAS.parrafosSobreNosotros}
        onCambiar={(p) => onCambiar({ ...valor, parrafos: p })}
      />
      <ImagenCloudinary id="sobre-imagen" def={CAMPOS_SOBRE_NOSOTROS.imagen} valor={valor.imagen} onCambiar={(v) => onCambiar({ ...valor, imagen: v })} error={errores.imagen} />
      <ListaValores valores={valor.valores} errores={errores} {...LISTAS.valores} onCambiar={(v) => onCambiar({ ...valor, valores: v })} />
    </div>
  );
}

export function VistaPreviaSobreNosotros({ valor }: { valor: ContenidoSobreNosotros }) {
  return (
    <VistaPrevia titulo='Así se lee "Sobre nosotros"'>
      <div className="space-y-3 text-sm leading-relaxed">
        <p className="text-2xl font-bold" style={TITULO_PREVIA}>
          {valor.titulo}
        </p>
        {!!urlImagenMostrable(valor.imagen) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urlImagenMostrable(valor.imagen) ?? undefined} alt="" className="aspect-[4/3] w-full rounded-[10px] object-cover" loading="lazy" />
        )}
        {valor.parrafos.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {valor.valores.length > 0 && (
          <ul className="grid grid-cols-1 gap-2">
            {valor.valores.map((v, i) => (
              <li key={i}>
                <p className="font-semibold">{v.titulo}</p>
                <p>{v.descripcion}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </VistaPrevia>
  );
}

export function FormContacto({ valor, errores, onCambiar }: FormProps<ContenidoContacto>) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {(Object.keys(CAMPOS_CONTACTO) as (keyof ContenidoContacto)[]).map((k) => (
        <CampoConfig key={k} id={`contacto-${k}`} def={CAMPOS_CONTACTO[k]} valor={valor[k]} onCambiar={(v) => onCambiar({ ...valor, [k]: v })} error={errores[k]} />
      ))}
    </div>
  );
}

export function VistaPreviaContacto({ valor }: { valor: ContenidoContacto }) {
  return (
    <VistaPrevia titulo="Así se lee en Contacto">
      <div className="space-y-3 text-sm leading-relaxed">
        <p>{valor.introduccion}</p>
        <p className="font-semibold">Agenda en línea</p>
        <p>{valor.agendaTexto}</p>
      </div>
    </VistaPrevia>
  );
}
