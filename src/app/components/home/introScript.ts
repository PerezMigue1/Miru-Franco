/**
 * Script mínimo del <head> (layout raíz): en /home, primera visita de la sesión y sin
 * prefers-reduced-motion, marca html[data-intro="si"] antes del primer pintado para que la intro
 * de la grieta (IntroGrieta.tsx) se vea sin parpadeos; en cualquier otro caso no hace nada.
 */
export const SCRIPT_INTRO = `(function(){try{var p=location.pathname;if(p!=='/home'&&p!=='/')return;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;if(sessionStorage.getItem('mf-intro'))return;sessionStorage.setItem('mf-intro','1');document.documentElement.setAttribute('data-intro','si');}catch(e){}})();`;
