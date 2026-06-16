'use client';

import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getFirestore,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { ChatMessage } from '@/lib/types';

function getClientDb(): Firestore | null {
  if (!app) return null;
  try {
    return getFirestore(app);
  } catch {
    return null;
  }
}

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

export function subscribeToChatMessages(
  conversationId: string,
  onMessages: (messages: ChatMessage[]) => void,
  onError?: (err: Error) => void
): Unsubscribe | null {
  const firestore = getClientDb();
  if (!firestore || !conversationId) return null;

  try {
    const q = query(
      collection(firestore, 'chatConversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(200)
    );

    return onSnapshot(
      q,
      (snap) => {
        const messages: ChatMessage[] = snap.docs.map((doc) => {
          const data = doc.data();
          return {
            _id: doc.id,
            conversationId,
            schoolId: String(data.schoolId ?? ''),
            senderId: String(data.senderId ?? ''),
            senderType: data.senderType as ChatMessage['senderType'],
            senderName: data.senderName ? String(data.senderName) : undefined,
            text: String(data.text ?? ''),
            createdAt: toIso(data.createdAt),
            readBy: data.readBy as Record<string, string> | undefined,
          };
        });
        onMessages(messages);
      },
      (err) => onError?.(err)
    );
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)));
    return null;
  }
}
