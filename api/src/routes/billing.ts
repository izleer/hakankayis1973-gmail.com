import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { env } from '../env.js';
import { ApiError, badRequest, unauthorized } from '../lib/errors.js';
import { parseBody } from '../lib/http.js';
import { requireViewer } from '../lib/session.js';
import {
  applyVerifiedPurchase,
  billingConfigured,
  billingProducts,
  entitlementView,
  findTransactionOwner,
  recordStoreEvent,
  verifyAppleJws,
  verifyAppleTransaction,
  verifyGoogleOidcToken,
  verifyGooglePurchase,
} from '../lib/billing.js';

const googleVerifySchema = z.object({
  productId: z.string().min(1).max(200),
  purchaseToken: z.string().min(1).max(4096),
  packageName: z.string().min(1).max(200).optional(),
});

const appleVerifySchema = z.object({
  productId: z.string().min(1).max(200),
  transactionId: z.string().min(1).max(200),
});

const restoreSchema = z.object({
  store: z.enum(['google', 'apple']),
  purchases: z
    .array(
      z.object({
        productId: z.string().min(1).max(200),
        purchaseToken: z.string().min(1).max(4096).optional(),
        transactionId: z.string().min(1).max(200).optional(),
      }),
    )
    .min(1)
    .max(50),
});

/**
 * İstemcinin ön kontrol için kullandığı ürün listesi. Satın alma yetkisi
 * yalnızca doğrulama uçlarında verilir.
 */
export async function billingRoutes(app: FastifyInstance): Promise<void> {
  app.get('/products', async () => ({
    data: {
      products: billingProducts(),
      stores: {
        google: billingConfigured('google'),
        apple: billingConfigured('apple'),
      },
      offlineGraceDays: env.BILLING_OFFLINE_GRACE_DAYS,
    },
  }));

  app.get('/status', async (req) => {
    const viewer = await requireViewer(req);
    return { data: await entitlementView(viewer.id) };
  });

  app.post('/google/verify', async (req) => {
    const viewer = await requireViewer(req);
    const body = parseBody(googleVerifySchema, req.body);
    const purchase = await verifyGooglePurchase(body);
    const entitlement = await applyVerifiedPurchase(viewer.id, purchase);
    return {
      data: {
        entitlement,
        productId: purchase.productId,
        status: purchase.status,
        expiresAt: purchase.expiresAt,
      },
    };
  });

  app.post('/apple/verify', async (req) => {
    const viewer = await requireViewer(req);
    const body = parseBody(appleVerifySchema, req.body);
    const purchase = await verifyAppleTransaction(body);
    const entitlement = await applyVerifiedPurchase(viewer.id, purchase);
    return {
      data: {
        entitlement,
        productId: purchase.productId,
        status: purchase.status,
        expiresAt: purchase.expiresAt,
      },
    };
  });

  /**
   * "Satın alımlarımı geri yükle". Her işlem tek tek doğrulanır; bir işlem
   * başarısız olsa da diğerleri uygulanır ve sonuçta hata listesi döner.
   */
  app.post('/restore', async (req) => {
    const viewer = await requireViewer(req);
    const body = parseBody(restoreSchema, req.body);
    const restored: string[] = [];
    const failed: Array<{ productId: string; message: string }> = [];

    for (const item of body.purchases) {
      try {
        const purchase =
          body.store === 'google'
            ? await verifyGooglePurchase({
                productId: item.productId,
                purchaseToken: item.purchaseToken ?? '',
              })
            : await verifyAppleTransaction({
                productId: item.productId,
                transactionId: item.transactionId ?? item.purchaseToken ?? '',
              });
        await applyVerifiedPurchase(viewer.id, purchase);
        restored.push(item.productId);
      } catch (error) {
        failed.push({
          productId: item.productId,
          message: error instanceof Error ? error.message : 'Satın alma doğrulanamadı.',
        });
      }
    }

    return {
      data: {
        entitlement: await entitlementView(viewer.id),
        restored,
        failed,
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Webhook'lar
// ---------------------------------------------------------------------------

function webhookSecret(req: FastifyRequest): string | null {
  const header = req.headers['x-izleer-webhook-secret'];
  return typeof header === 'string' && header.length > 0 ? header : null;
}

async function assertGoogleWebhook(req: FastifyRequest): Promise<void> {
  if (env.GOOGLE_PLAY_WEBHOOK_AUDIENCE) {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) unauthorized('Webhook doğrulanamadı.');
    await verifyGoogleOidcToken(token, env.GOOGLE_PLAY_WEBHOOK_AUDIENCE);
    return;
  }
  if (!env.GOOGLE_PLAY_WEBHOOK_SECRET) {
    if (env.NODE_ENV === 'production') {
      throw new ApiError(
        503,
        'BILLING_NOT_CONFIGURED',
        'Google webhook doğrulaması üretimde zorunludur.',
      );
    }
    return;
  }
  if (webhookSecret(req) !== env.GOOGLE_PLAY_WEBHOOK_SECRET) {
    unauthorized('Webhook doğrulanamadı.');
  }
}

const googleWebhookSchema = z.object({
  message: z.object({
    data: z.string().min(1),
    messageId: z.string().optional(),
  }),
});

type GoogleNotificationPayload = {
  packageName?: string;
  subscriptionNotification?: {
    notificationType?: number;
    purchaseToken?: string;
    subscriptionId?: string;
  };
  testNotification?: { version?: string };
};

/**
 * Google Pub/Sub push uç noktası. Yük base64 kodlu `message.data` içerir.
 * Öncelik sırası: OIDC jetonu (`GOOGLE_PLAY_WEBHOOK_AUDIENCE`), paylaşılan
 * sır header'ı, geliştirme ortamında doğrulamasız.
 */
export async function billingWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.post('/google', async (req) => {
    await assertGoogleWebhook(req);
    const body = parseBody(googleWebhookSchema, req.body);
    let payload: GoogleNotificationPayload;
    try {
      payload = JSON.parse(
        Buffer.from(body.message.data, 'base64').toString('utf8'),
      ) as GoogleNotificationPayload;
    } catch {
      throw badRequest('Google bildirimi çözümlenemedi.');
    }

    if (payload.packageName && payload.packageName !== env.GOOGLE_PLAY_PACKAGE_NAME) {
      throw badRequest('Bildirim paket adı eşleşmiyor.');
    }
    if (payload.testNotification) {
      await recordStoreEvent({
        store: 'google',
        eventType: 'TEST_NOTIFICATION',
        payload,
        result: 'ignored',
      });
      return { data: { processed: false, test: true } };
    }

    const notification = payload.subscriptionNotification;
    if (!notification?.purchaseToken || !notification.subscriptionId) {
      await recordStoreEvent({
        store: 'google',
        eventType: 'UNKNOWN_NOTIFICATION',
        payload,
        result: 'ignored',
      });
      return { data: { processed: false } };
    }

    const owner = await findTransactionOwner('google', notification.purchaseToken);
    if (!owner) {
      await recordStoreEvent({
        store: 'google',
        eventType: `NOTIFICATION_${notification.notificationType ?? 0}`,
        transactionRef: notification.purchaseToken,
        payload,
        result: 'no_owner',
      });
      return { data: { processed: false } };
    }

    const purchase = await verifyGooglePurchase({
      productId: notification.subscriptionId,
      purchaseToken: notification.purchaseToken,
    });
    await applyVerifiedPurchase(owner, purchase);
    await recordStoreEvent({
      store: 'google',
      eventType: `NOTIFICATION_${notification.notificationType ?? 0}`,
      transactionRef: notification.purchaseToken,
      payload,
      result: purchase.status,
    });
    return { data: { processed: true, status: purchase.status } };
  });

  app.post('/apple', async (req) => {
    const body = parseBody(z.object({ signedPayload: z.string().min(1) }), req.body);
    const payload = await verifyAppleJws(body.signedPayload);
    const notificationType = String(payload.notificationType ?? 'UNKNOWN');
    const data = payload.data as
      | { signedTransactionInfo?: string; signedRenewalInfo?: string }
      | undefined;

    const transaction = data?.signedTransactionInfo
      ? await verifyAppleJws(data.signedTransactionInfo)
      : null;
    const ref = transaction
      ? String(transaction.originalTransactionId ?? transaction.transactionId ?? '')
      : '';

    if (!ref) {
      await recordStoreEvent({
        store: 'apple',
        eventType: notificationType,
        payload,
        result: 'ignored',
      });
      return { data: { processed: false } };
    }

    const owner = await findTransactionOwner('apple', ref);
    if (!owner) {
      await recordStoreEvent({
        store: 'apple',
        eventType: notificationType,
        transactionRef: ref,
        payload,
        result: 'no_owner',
      });
      return { data: { processed: false } };
    }

    const purchase = await verifyAppleTransaction({ transactionId: ref });
    await applyVerifiedPurchase(owner, purchase);
    await recordStoreEvent({
      store: 'apple',
      eventType: notificationType,
      transactionRef: ref,
      payload,
      result: purchase.status,
    });
    return { data: { processed: true, status: purchase.status } };
  });
}
