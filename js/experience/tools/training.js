/* Eğitim & Danışmanlık page: the shared Tools page behaviour plus the hero roadmap vignette
   (ihtiyaç → yol haritası → eğitim → uygulama), a stepped run that plays once per visit. */
import { mountToolsPage, playRunVignette } from '../tools.js';
mountToolsPage();
playRunVignette(document.querySelector('[data-vignette]'));
