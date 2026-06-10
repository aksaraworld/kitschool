export type InAppToast = {
  id: string;
  title: string;
  body: string;
  href?: string;
};

export const IN_APP_TOAST_EVENT = 'in-app-toast';

export function showInAppToast(toast: Omit<InAppToast, 'id'>) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(IN_APP_TOAST_EVENT, {
      detail: { ...toast, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` } satisfies InAppToast,
    })
  );
}
