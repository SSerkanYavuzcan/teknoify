(function () {
  'use strict';

  var SESSION_KEY = 'teknoify_session';
  var USERS_KEY = 'teknoify_users';
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

  function setLoginLink() {
    var linkEl = document.getElementById('login-link');
    if (!linkEl) {
      return;
    }

    linkEl.href = '/pages/login.html';
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
    setLoginLink();

    var params = new URLSearchParams(window.location.search);
    var userId = params.get('userId');

    if (!userId) {
      setStatus('Missing required query parameter: userId', true);
      return;
    }

    var session = parseJSON(window.localStorage.getItem(SESSION_KEY));
    if (!session || session.role !== 'admin') {
      setStatus('Not authorized. Admin session required.', true);
      return;
    }

    var users = parseJSON(window.localStorage.getItem(USERS_KEY));
    if (!Array.isArray(users)) {
      setStatus('User data not found in localStorage (teknoify_users).', true);
      return;
    }

    var targetUser = users.find(function (item) {
      return item && item.id === userId;
    });

    if (!targetUser) {
      setStatus('Target user not found: ' + userId, true);
      return;
    }

    var impersonation = {
      adminSession: session,
      targetUserId: userId,
      startedAt: Date.now()
    };

    var targetSession = {
      userId: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      issuedAt: Date.now()
    };

    window.localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(impersonation));
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(targetSession));

    setStatus('Impersonation started. Redirecting...', false);
    redirectWithFallback(['/dashboard/index.html', '/pages/dashboard.html']);
  }

  run();
})();
