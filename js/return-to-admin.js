(function () {
  'use strict';

  var SESSION_KEY = 'teknoify_session';
  var IMPERSONATION_KEY = 'teknoify_impersonation';

  function parseJSON(value) {
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function setStatus(message, isError) {
    var statusEl = document.getElementById('status');
    if (!statusEl) {
      return;
    }
    statusEl.textContent = message;
    statusEl.style.color = isError ? '#b42318' : '#101828';
  }

  function redirectWithFallback(paths) {
    var index = 0;

    function next() {
      if (index >= paths.length) {
        return;
      }

      var target = paths[index];
      index += 1;

      try {
        window.location.assign(target);
      } catch (error) {
        next();
      }
    }

    next();
  }

  function run() {
    var impersonation = parseJSON(window.localStorage.getItem(IMPERSONATION_KEY));

    if (impersonation && impersonation.adminSession) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(impersonation.adminSession));
      window.localStorage.removeItem(IMPERSONATION_KEY);
      setStatus('Admin session restored. Redirecting...', false);
    } else {
      setStatus('No active impersonation found. Redirecting to admin...', false);
    }

    redirectWithFallback(['/dashboard/admin.html']);
  }

  run();
})();
