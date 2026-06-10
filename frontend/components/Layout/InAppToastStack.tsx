'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, X } from 'lucide-react';
import { IN_APP_TOAST_EVENT, type InAppToast } from '@/lib/in-app-notify';

export default function InAppToastStack() {
  const [toasts, setToasts] = useState<InAppToast[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<InAppToast>).detail;
      if (!detail?.id) return;
      setToasts((prev) => [detail, ...prev].slice(0, 3));
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== detail.id));
      }, 8000);
    };
    window.addEventListener(IN_APP_TOAST_EVENT, onToast);
    return () => window.removeEventListener(IN_APP_TOAST_EVENT, onToast);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-2 w-[min(100vw-3rem,340px)]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-white border border-gray-200 shadow-lg rounded-xl p-4 flex gap-3"
        >
          <div className="shrink-0 w-9 h-9 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            {toast.href ? (
              <Link href={toast.href} className="block hover:opacity-80">
                <p className="text-sm font-semibold text-gray-900 truncate">{toast.title}</p>
                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{toast.body}</p>
              </Link>
            ) : (
              <>
                <p className="text-sm font-semibold text-gray-900 truncate">{toast.title}</p>
                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{toast.body}</p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="shrink-0 text-gray-400 hover:text-gray-600"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
