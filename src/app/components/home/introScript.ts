/**
 * Script mínimo del <head> (layout raíz): en /home y sin prefers-reduced-motion, marca
 * html[data-intro="si"] antes del primer pintado para que la intro de la grieta (IntroGrieta.tsx)
 * se vea sin parpadeos; en cualquier otro caso no hace nada.
 *
 * Un script inline del <head> solo corre en una carga completa del documento (entrada directa,
 * llegada desde otro sitio, recarga): la navegación interna no lo vuelve a ejecutar y el atributo
 * se queda en el <html> del layout raíz, igual que al restaurar desde el bfcache. Si "atrás"
 * recarga el documento (sin bfcache), la entrada de navegación es back_forward y tampoco se muestra.
 *
 * Es el único punto que inicia la intro. Además guarda en `window.__mfIntroInicio` cuándo arrancó
 * su animación, para que IntroGrieta no la vuelva a empezar si React recrea el nodo (ver ahí).
 */
export const SCRIPT_INTRO = `(function(){try{var p=location.pathname;if(p!=='/home'&&p!=='/')return;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;var n=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];if(n&&n.type==='back_forward')return;document.documentElement.setAttribute('data-intro','si');document.addEventListener('animationstart',function f(e){if(e.animationName!=='mf-intro-trazo')return;document.removeEventListener('animationstart',f,true);var a=e.target.getAnimations?e.target.getAnimations().filter(function(x){return x.animationName==='mf-intro-trazo';})[0]:null;window.__mfIntroInicio=a&&a.startTime!=null?a.startTime:document.timeline.currentTime;},true);}catch(e){}})();`;
