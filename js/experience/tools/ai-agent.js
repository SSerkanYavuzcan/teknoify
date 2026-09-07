/* AI Agent page: the shared Tools page behaviour plus the hero execution vignette
   (istek → plan → araçlar → sonuç), a stepped run that plays once per visit. */
import { mountToolsPage, playRunVignette } from '../tools.js';
mountToolsPage();
playRunVignette(document.querySelector('[data-vignette]'));
