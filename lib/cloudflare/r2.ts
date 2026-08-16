import { S3Client } from "@aws-sdk/client-s3";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function getR2Config() {
  return {
    accountId: required("CLOUDFLARE_R2_ACCOUNT_ID"),
    accessKeyId: required("CLOUDFLARE_R2_ACCESS_KEY_ID"),
    secretAccessKey: required("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
    bucket: required("CLOUDFLARE_R2_BUCKET"),
    publicBaseUrl: required("CLOUDFLARE_R2_PUBLIC_BASE_URL").replace(/\/$/, ""),
  };
}

export function createR2Client() {
  const config = getR2Config();
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}
