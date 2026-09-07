/* Web Scraping page: the shared Tools page behaviour plus the hero extraction vignette
   (kaynak → keşif → alanlar → veri seti), a stepped run that plays once per visit. */
import { mountToolsPage, playRunVignette } from '../tools.js';
mountToolsPage();
playRunVignette(document.querySelector('[data-vignette]'));
