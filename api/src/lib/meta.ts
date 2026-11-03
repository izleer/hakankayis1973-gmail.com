import { env } from '../env.js';
import { ApiError } from './errors.js';

export const GRAPH_VERSION = env.META_GRAPH_VERSION;
export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export const SOCIAL_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
  'business_management',
];

export class MetaError extends Error {
  readonly status: number;
  readonly code?: number;
  readonly subcode?: number;
  readonly type?: string;

  constructor(
    status: number,
    body: { message?: string; code?: number; error_subcode?: number; type?: string },
  ) {
    super(body.message ?? 'Meta isteği başarısız oldu.');
    this.name = 'MetaError';
    this.status = status;
    this.code = body.code;
    this.subcode = body.error_subcode;
    this.type = body.type;
  }
}

export function oauthRedirectUri(): string {
  return env.META_REDIRECT_URI ?? `${env.PUBLIC_API_URL.replace(/\/$/, '')}/v1/social/callback`;
}

export function socialWebReturnUrl(): string {
  return (
    env.SOCIAL_WEB_RETURN_URL ??
    `${(env.corsOrigins[0] ?? 'http://localhost:3000').replace(/\/$/, '')}/ayarlar/sosyal`
  );
}

export function facebookLoginUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.META_APP_ID ?? '',
    redirect_uri: oauthRedirectUri(),
    state,
    response_type: 'code',
    scope: SOCIAL_SCOPES.join(','),
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

async function callGraph<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 35_000,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    throw new ApiError(
      timedOut ? 504 : 502,
      timedOut ? 'SOCIAL_TIMEOUT' : 'SOCIAL_NETWORK',
      timedOut
        ? 'Meta sunucusu zamanında yanıt vermedi. Lütfen tekrar deneyin.'
        : 'Meta sunucularına ulaşılamadı. İnternet bağlantınızı kontrol edin.',
    );
  }

  const payload = (await response.json().catch(() => ({}))) as {
    error?: { message?: string; code?: number; error_subcode?: number; type?: string };
  } & T;
  if (!response.ok || payload?.error) {
    throw new MetaError(response.status, payload?.error ?? {});
  }
  return payload;
}

function withToken(url: string, token: string): string {
  const target = new URL(url);
  target.searchParams.set('access_token', token);
  return target.toString();
}

export type FacebookPage = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
    username?: string;
    name?: string;
  };
};

export async function exchangeCode(code: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: env.META_APP_ID ?? '',
    client_secret: env.META_APP_SECRET ?? '',
    redirect_uri: oauthRedirectUri(),
    code,
  });
  const short = await callGraph<{ access_token?: string }>(
    `${GRAPH_BASE}/oauth/access_token?${params.toString()}`,
  );
  if (!short.access_token) {
    throw new ApiError(502, 'SOCIAL_TOKEN_MISSING', 'Meta erişim jetonu alınamadı.');
  }

  const longParams = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: env.META_APP_ID ?? '',
    client_secret: env.META_APP_SECRET ?? '',
    fb_exchange_token: short.access_token,
  });
  const long = await callGraph<{ access_token?: string }>(
    `${GRAPH_BASE}/oauth/access_token?${longParams.toString()}`,
  );
  return long.access_token ?? short.access_token;
}

export async function listPages(userToken: string): Promise<FacebookPage[]> {
  const params = new URLSearchParams({
    fields:
      'id,name,access_token,instagram_business_account{id,username,name}',
    limit: '100',
  });
  const data = await callGraph<{ data?: FacebookPage[] }>(
    withToken(`${GRAPH_BASE}/me/accounts?${params.toString()}`, userToken),
  );
  return data.data ?? [];
}

export async function uploadPagePhoto(
  pageId: string,
  token: string,
  input: {
    buffer: Buffer;
    mimeType: string;
    filename: string;
    message?: string;
    published: boolean;
  },
): Promise<{ id: string; post_id?: string }> {
  const form = new FormData();
  form.append('access_token', token);
  form.append('published', input.published ? 'true' : 'false');
  if (input.message) form.append('message', input.message);
  form.append(
    'source',
    new Blob([input.buffer], { type: input.mimeType }),
    input.filename,
  );
  return callGraph<{ id: string; post_id?: string }>(`${GRAPH_BASE}/${pageId}/photos`, {
    method: 'POST',
    body: form,
  });
}

export async function publishPageStory(
  pageId: string,
  token: string,
  photoId: string,
): Promise<{ id?: string }> {
  const body = new URLSearchParams({ photo_id: photoId, access_token: token });
  return callGraph<{ id?: string }>(`${GRAPH_BASE}/${pageId}/photo_stories`, {
    method: 'POST',
    body,
  });
}

export async function uploadPageVideo(
  pageId: string,
  token: string,
  input: { buffer: Buffer; mimeType: string; filename: string; description?: string },
): Promise<{ id: string }> {
  const form = new FormData();
  form.append('access_token', token);
  if (input.description) form.append('description', input.description);
  form.append(
    'source',
    new Blob([input.buffer], { type: input.mimeType }),
    input.filename,
  );
  return callGraph<{ id: string }>(`${GRAPH_BASE}/${pageId}/videos`, {
    method: 'POST',
    body: form,
    // Video işleme fotoğraftan uzun sürebilir.
  }, 120_000);
}

export async function publishPageReel(
  pageId: string,
  token: string,
  input: { buffer: Buffer; mimeType: string; filename: string; description?: string },
): Promise<{ videoId: string }> {
  const startBody = new URLSearchParams({ upload_phase: 'start', access_token: token });
  const started = await callGraph<{ video_id?: string; upload_url?: string }>(
    `${GRAPH_BASE}/${pageId}/video_reels`,
    { method: 'POST', body: startBody },
  );
  if (!started.video_id || !started.upload_url) {
    throw new ApiError(502, 'SOCIAL_REEL_START', 'Facebook Reels yüklemesi başlatılamadı.');
  }

  let upload: Response;
  try {
    upload = await fetch(started.upload_url, {
      method: 'POST',
      headers: {
        Authorization: `OAuth ${token}`,
        offset: '0',
        file_size: String(input.buffer.length),
        'Content-Type': 'application/octet-stream',
      },
      body: input.buffer,
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    throw new ApiError(502, 'SOCIAL_REEL_UPLOAD', 'Reels videosu Meta sunucusuna yüklenemedi.');
  }
  if (!upload.ok) {
    throw new ApiError(502, 'SOCIAL_REEL_UPLOAD', 'Reels videosu Meta sunucusuna yüklenemedi.');
  }

  const finishBody = new URLSearchParams({
    upload_phase: 'finish',
    video_id: started.video_id,
    video_state: 'PUBLISHED',
    access_token: token,
  });
  if (input.description) finishBody.set('description', input.description);
  await callGraph(`${GRAPH_BASE}/${pageId}/video_reels`, {
    method: 'POST',
    body: finishBody,
  }, 120_000);

  return { videoId: started.video_id };
}

export async function createInstagramContainer(
  igUserId: string,
  token: string,
  input: {
    imageUrl?: string;
    videoUrl?: string;
    caption?: string;
    mediaType?: 'STORIES' | 'REELS';
    shareToFeed?: boolean;
  },
): Promise<string> {
  const body = new URLSearchParams({ access_token: token });
  if (input.imageUrl) body.set('image_url', input.imageUrl);
  if (input.videoUrl) body.set('video_url', input.videoUrl);
  if (input.caption && input.mediaType !== 'STORIES') body.set('caption', input.caption);
  if (input.mediaType) body.set('media_type', input.mediaType);
  if (input.shareToFeed != null) body.set('share_to_feed', String(input.shareToFeed));
  const created = await callGraph<{ id?: string }>(`${GRAPH_BASE}/${igUserId}/media`, {
    method: 'POST',
    body,
  });
  if (!created.id) {
    throw new ApiError(502, 'SOCIAL_IG_CONTAINER', 'Instagram medya kabı oluşturulamadı.');
  }
  return created.id;
}

export async function waitForInstagramContainer(
  containerId: string,
  token: string,
  timeoutMs = 90_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await callGraph<{ status_code?: string; status?: string }>(
      withToken(
        `${GRAPH_BASE}/${containerId}?fields=status_code,status`,
        token,
      ),
    );
    if (status.status_code === 'FINISHED') return;
    if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') {
      throw new ApiError(
        502,
        'SOCIAL_IG_PROCESSING',
        status.status
          ? `Instagram medyayı işleyemedi: ${status.status}`
          : 'Instagram medyayı işleyemedi. Video biçimini kontrol edin.',
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  throw new ApiError(
    504,
    'SOCIAL_IG_TIMEOUT',
    'Instagram medyası zamanında hazırlanamadı. Biraz sonra tekrar deneyin.',
  );
}

export async function publishInstagramContainer(
  igUserId: string,
  token: string,
  containerId: string,
): Promise<string> {
  const body = new URLSearchParams({ creation_id: containerId, access_token: token });
  const published = await callGraph<{ id?: string }>(
    `${GRAPH_BASE}/${igUserId}/media_publish`,
    { method: 'POST', body },
  );
  if (!published.id) {
    throw new ApiError(502, 'SOCIAL_IG_PUBLISH', 'Instagram gönderisi yayınlanamadı.');
  }
  return published.id;
}

export async function instagramPermalink(mediaId: string, token: string): Promise<string | null> {
  try {
    const data = await callGraph<{ permalink?: string }>(
      withToken(`${GRAPH_BASE}/${mediaId}?fields=permalink`, token),
    );
    return data.permalink ?? null;
  } catch {
    return null;
  }
}

export function describeMetaError(error: unknown): string {
  if (error instanceof MetaError) {
    if (error.code === 190) {
      return 'Sosyal bağlantının süresi dolmuş. Lütfen hesabı yeniden bağlayın.';
    }
    if (error.code === 4 || error.code === 17 || error.code === 32) {
      return 'Meta API istek sınırına ulaşıldı. Lütfen bir süre sonra tekrar deneyin.';
    }
    if (error.code === 10 || error.code === 200) {
      return 'Meta izinleri yetersiz. Bağlantıyı yenileyip yeniden deneyin.';
    }
    return `Meta paylaşımı tamamlanamadı: ${error.message}`;
  }
  if (error instanceof ApiError) return error.message;
  return 'Sosyal paylaşım tamamlanamadı.';
}
