'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { CHAT_ROLES, hasAnyRole } from '@/lib/types';
import { useNotifications } from '@/hooks/useNotifications';

type ChatFabProps = {
  user: { role?: string; roles?: string[] };
};

export default function ChatFab({ user }: ChatFabProps) {
  const pathname = usePathname();
  const { unreadCount } = useNotifications(hasAnyRole(user, CHAT_ROLES.map(String)));

  if (!hasAnyRole(user, CHAT_ROLES.map(String))) return null;
  if (pathname === '/messages' || pathname.startsWith('/messages/')) return null;

  const badge = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <Link
      href="/messages"
      className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      aria-label="Buka pesan"
    >
      <MessageSquare className="w-6 h-6" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-bold shadow">
          {badge}
        </span>
      )}
    </Link>
  );
}
