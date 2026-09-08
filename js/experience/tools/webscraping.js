/* Web Scraping page: the shared Tools page behaviour, the hero extraction vignette (a stepped run that
   plays once per visit) and the embedded price-comparison experience. */
import { mountToolsPage, playRunVignette } from '../tools.js';
import { initCompare } from './compare.js';
mountToolsPage();
playRunVignette(document.querySelector('[data-vignette]'));
initCompare(document.querySelector('[data-compare]'));
