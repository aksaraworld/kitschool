/**
 * Firebase Cloud Messaging — server-side push on new chat messages.
 */

import { getMessaging, usersCollection } from '@/lib/server/firebase-admin';

export async function sendChatPush(
  recipientUid: string,
  payload: { title: string; body: string; conversationId?: string; href?: string }
): Promise<void> {
  if (!process.env.FIREBASE_PROJECT_ID) return;

  try {
    const userSnap = await usersCollection().doc(recipientUid).get();
    if (!userSnap.exists) return;
    const tokens = (userSnap.data() as { fcmTokens?: string[] })?.fcmTokens ?? [];
    const validTokens = tokens.filter(Boolean);
    if (!validTokens.length) return;

    const messaging = getMessaging();
    const response = await messaging.sendEachForMulticast({
      tokens: validTokens,
      notification: { title: payload.title, body: payload.body },
      data: {
        type: payload.conversationId ? 'chat' : 'notification',
        conversationId: payload.conversationId ?? '',
        href: payload.href ?? (payload.conversationId ? `/messages?c=${payload.conversationId}` : '/tickets'),
      },
      webpush: {
        fcmOptions: {
          link: payload.href ?? (payload.conversationId ? `/messages?c=${payload.conversationId}` : '/tickets'),
        },
      },
    });

    if (response.successCount > 0) {
      console.info(`FCM push sent: ${response.successCount}/${validTokens.length}`);
    }
    if (response.failureCount > 0) {
      console.warn(
        `FCM push partial failure: ${response.successCount}/${validTokens.length} sent`,
        response.responses.filter((r) => !r.success).map((r) => r.error?.code)
      );
    }

    const stale: string[] = [];
    response.responses.forEach((res, i) => {
      if (
        !res.success &&
        res.error?.code === 'messaging/registration-token-not-registered'
      ) {
        stale.push(validTokens[i]);
      }
    });
    if (stale.length) {
      await usersCollection()
        .doc(recipientUid)
        .update({
          fcmTokens: validTokens.filter((t) => !stale.includes(t)),
          updatedAt: new Date(),
        });
    }
  } catch (e) {
    console.error('FCM send error:', e);
  }
}
