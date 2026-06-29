/* ui.js — Shared UI helpers: toasts, button loading, skeletons, confirm dialog.
 * Exposes a global `UI` object. Pure vanilla, no dependencies.
 * Load on every page (after config.js). Self-injects its own DOM + escape handling.
 */
(function () {
  'use strict';

  // ── Toast notifications ──────────────────────────────────────────────
  function toastContainer() {
    var c = document.getElementById('toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toast-container';
      c.className = 'toast-container';
      c.setAttribute('role', 'status');
      c.setAttribute('aria-live', 'polite');
      (document.body || document.documentElement).appendChild(c);
    }
    return c;
  }

  var ICONS = {
    success: '✓',
    error: '✕',
    warning: '!',
    info: 'i',
  };

  function toast(message, type, opts) {
    type = type || 'info';
    opts = opts || {};
    var duration = opts.duration != null ? opts.duration : (type === 'error' ? 5000 : 3500);
    var c = toastContainer();

    var el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');

    var icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.textContent = ICONS[type] || ICONS.info;

    var msg = document.createElement('span');
    msg.className = 'toast-msg';
    msg.textContent = message;

    var close = document.createElement('button');
    close.className = 'toast-close';
    close.setAttribute('aria-label', 'Dismiss');
    close.innerHTML = '&times;';

    el.appendChild(icon);
    el.appendChild(msg);
    el.appendChild(close);
    c.appendChild(el);

    // trigger enter animation
    requestAnimationFrame(function () { el.classList.add('toast-show'); });

    var timer;
    function dismiss() {
      if (el._dismissed) return;
      el._dismissed = true;
      clearTimeout(timer);
      el.classList.remove('toast-show');
      el.classList.add('toast-hide');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 280);
    }
    close.addEventListener('click', dismiss);
    if (duration > 0) timer = setTimeout(dismiss, duration);
    return dismiss;
  }

  // ── Button loading state ─────────────────────────────────────────────
  // setBtnLoading(btn, true) disables + shows inline spinner; false restores.
  function setBtnLoading(btn, loading, loadingText) {
    if (!btn) return;
    if (loading) {
      if (btn._origHtml == null) btn._origHtml = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add('btn-loading');
      btn.setAttribute('aria-busy', 'true');
      var label = loadingText || btn.dataset.loadingText || '';
      btn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span>' +
        (label ? '<span>' + escapeHtml(label) + '</span>' : '');
    } else {
      btn.disabled = false;
      btn.classList.remove('btn-loading');
      btn.removeAttribute('aria-busy');
      if (btn._origHtml != null) { btn.innerHTML = btn._origHtml; btn._origHtml = null; }
    }
  }

  // ── Inline alert helper (replaces ad-hoc innerHTML alert markup) ──────
  function showAlert(target, message, type) {
    var el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el) return;
    type = type || 'info';
    el.innerHTML = '<div class="alert alert-' + type + '" role="alert">' +
      escapeHtml(message) + '</div>';
  }
  function clearAlert(target) {
    var el = typeof target === 'string' ? document.getElementById(target) : target;
    if (el) el.innerHTML = '';
  }

  // ── Skeleton placeholder markup ──────────────────────────────────────
  // skeletonCards(n) → string of n shimmering card placeholders.
  function skeletonCards(n, kind) {
    n = n || 3;
    var out = '';
    for (var i = 0; i < n; i++) {
      out += '<div class="skeleton-card ' + (kind === 'list' ? 'skeleton-list' : '') + '">' +
        '<div class="skeleton skeleton-img"></div>' +
        '<div class="skeleton-card-body">' +
        '<div class="skeleton skeleton-line skeleton-line-lg"></div>' +
        '<div class="skeleton skeleton-line skeleton-line-sm"></div>' +
        '</div></div>';
    }
    return out;
  }

  // ── Confirm dialog (promise-based, accessible) ───────────────────────
  function confirmDialog(opts) {
    opts = opts || {};
    var title = opts.title || 'Are you sure?';
    var message = opts.message || '';
    var confirmText = opts.confirmText || 'Confirm';
    var cancelText = opts.cancelText || 'Cancel';
    var danger = opts.danger !== false;

    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML =
        '<div class="modal" role="dialog" aria-modal="true" style="max-width:420px">' +
        '<div class="modal-header"><h3 class="modal-title">' + escapeHtml(title) + '</h3>' +
        '<button class="modal-close" aria-label="Close">&times;</button></div>' +
        (message ? '<p style="color:var(--text-secondary);margin-bottom:1.25rem">' + escapeHtml(message) + '</p>' : '') +
        '<div style="display:flex;gap:0.75rem;justify-content:flex-end">' +
        '<button class="btn btn-outline" data-act="cancel">' + escapeHtml(cancelText) + '</button>' +
        '<button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" data-act="ok">' + escapeHtml(confirmText) + '</button>' +
        '</div></div>';
      document.body.appendChild(overlay);

      var okBtn = overlay.querySelector('[data-act="ok"]');
      okBtn.focus();

      function close(val) {
        document.removeEventListener('keydown', onKey);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(val);
      }
      function onKey(e) { if (e.key === 'Escape') close(false); }

      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) close(false);
        var act = e.target.getAttribute('data-act');
        if (act === 'ok') close(true);
        if (act === 'cancel' || e.target.classList.contains('modal-close')) close(false);
      });
      document.addEventListener('keydown', onKey);
    });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  window.UI = {
    toast: toast,
    setBtnLoading: setBtnLoading,
    showAlert: showAlert,
    clearAlert: clearAlert,
    skeletonCards: skeletonCards,
    confirm: confirmDialog,
    escapeHtml: escapeHtml,
  };
})();
