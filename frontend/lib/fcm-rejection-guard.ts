/**
 * Firebase may throw unhandled rejections when cleaning up tokens on a
 * replaced/unregistered service worker (pushManager undefined). Harmless if
 * a new token is registered — suppress so prod console stays clean.
 */
let installed = false;

export function installFcmRejectionGuard() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg =
      (reason && typeof reason === 'object' && 'message' in reason
        ? String((reason as Error).message)
        : String(reason ?? '')) +
      (reason && typeof reason === 'object' && 'stack' in reason
        ? String((reason as Error).stack ?? '')
        : '');

    if (
      /pushManager/i.test(msg) ||
      /deleteToken/i.test(msg) ||
      /service worker registration/i.test(msg)
    ) {
      event.preventDefault();
    }
  });
}

if (typeof window !== 'undefined') {
  installFcmRejectionGuard();
}
