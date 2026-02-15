import { login } from '../lib/auth.js';
import { initSeedDataOnce } from '../lib/storage.js';
import { qs } from '../utils/dom.js';

const form = qs('#mvp-login-form');
const errorBox = qs('#mvp-login-error');

function showError(message) {
  if (!errorBox) {
    return;
  }
  errorBox.textContent = message;
  errorBox.hidden = false;
}

if (form) {
  initSeedDataOnce();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.hidden = true;

    const formData = new FormData(form);
    const email = String(formData.get('email') || '');
    const password = String(formData.get('password') || '');

    await initSeedDataOnce();
    const result = login(email, password);

    if (!result.ok) {
      showError(result.message);
      return;
    }

    window.location.href = '../dashboard/index.html';
  });
}
