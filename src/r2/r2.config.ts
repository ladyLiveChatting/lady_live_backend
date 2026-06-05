export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
  endpoint: string;
  presignExpiresSeconds: number;
};

export function readR2Config(): R2Config | null {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');

  if (!accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl || !endpoint) {
    return null;
  }

  const rawTtl = process.env.R2_PRESIGN_EXPIRES_SECONDS?.trim();
  const presignExpiresSeconds = rawTtl ? Math.min(86400, Math.max(60, Number(rawTtl))) : 3600;

  return {
    accountId: accountId ?? '',
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl,
    endpoint,
    presignExpiresSeconds: Number.isFinite(presignExpiresSeconds)
      ? presignExpiresSeconds
      : 3600,
  };
}

export function isR2Configured(): boolean {
  return readR2Config() != null;
}
