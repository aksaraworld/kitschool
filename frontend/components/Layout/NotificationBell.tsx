'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, MessageSquare, Mail, Loader2 } from 'lucide-react';
import api from '@/lib/aksara-api';
import { useNotificationsContext } from '@/context/NotificationsContext';
import { useFCM } from '@/hooks/useFCM';
import { formatRelativeTime } from '@/lib/format-relative-time';
import type { AppNotification } from '@/lib/types';

export default function NotificationBell() {
  useFCM();
  const router = useRouter();
  const { notifications, unreadCount, loading, refresh } = useNotificationsContext();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const handleNotificationClick = async (item: AppNotification) => {
    if (item.type === 'communication') {
      const commId = item.id.replace(/^comm-/, '');
      try {
        await api.put(`/communications/${commId}/read`);
      } catch {
        // still navigate / refresh
      }
      await refresh();
    }

    setOpen(false);
    router.push(item.href);
  };

  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) refresh(true);
        }}
        className="relative p-2 rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        aria-label="Notifikasi"
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none shadow-sm">
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(100vw-2rem,380px)] bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Notifikasi</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-primary-600 font-medium">{unreadCount} belum dibaca</span>
            )}
          </div>

          <div className="max-h-[min(70vh,420px)] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Memuat...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Tidak ada notifikasi</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(item)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3"
                    >
                      <div
                        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                          item.type === 'chat' ? 'bg-primary-100 text-primary-600' : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        {item.type === 'chat' ? (
                          <MessageSquare className="w-4 h-4" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                          {(item.count ?? 1) > 1 && (
                            <span className="shrink-0 text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5">
                              {item.count}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{item.body}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{formatRelativeTime(item.createdAt)}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {notifications.some((n) => n.type === 'chat') && (
            <div className="border-t border-gray-100 p-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push('/messages');
                }}
                className="w-full text-center text-xs font-medium text-primary-600 hover:text-primary-700 py-2 rounded-lg hover:bg-primary-50"
              >
                Lihat semua pesan
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
