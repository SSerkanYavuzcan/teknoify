import { renderNav } from '../lib/nav.js';

export function initCommonPage({ activePath } = {}) {
  renderNav({ activePath });
}
