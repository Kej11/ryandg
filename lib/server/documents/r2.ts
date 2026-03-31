import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getDocumentR2Config } from "@/lib/server/documents/env";

declare global {
  // eslint-disable-next-line no-var
  var __ryandgR2Client: S3Client | undefined;
}

function getR2Client() {
  if (!globalThis.__ryandgR2Client) {
    const config = getDocumentR2Config();

    globalThis.__ryandgR2Client = new S3Client({
      region: "auto",
      endpoint: `https://${config.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.r2AccessKeyId,
        secretAccessKey: config.r2SecretAccessKey
      }
    });
  }

  return globalThis.__ryandgR2Client;
}

function getBucketName() {
  return getDocumentR2Config().r2BucketName;
}

function getR2ErrorName(error: unknown) {
  if (!error || typeof error !== "object") {
    return "";
  }

  const value =
    "name" in error && typeof error.name === "string"
      ? error.name
      : "Code" in error && typeof error.Code === "string"
        ? error.Code
        : "";

  return value;
}

function getR2StatusCode(error: unknown) {
  if (!error || typeof error !== "object" || !("$metadata" in error)) {
    return null;
  }

  const metadata = error.$metadata;

  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  return "httpStatusCode" in metadata &&
    typeof metadata.httpStatusCode === "number"
    ? metadata.httpStatusCode
    : null;
}

export function isR2ObjectMissingError(error: unknown) {
  const name = getR2ErrorName(error);
  const statusCode = getR2StatusCode(error);

  return (
    name === "NoSuchKey" ||
    name === "NotFound" ||
    statusCode === 404
  );
}

export async function uploadDocumentObject(input: {
  key: string;
  body: Uint8Array;
  contentType: string;
  contentDisposition?: string;
}) {
  const response = await getR2Client().send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      ContentDisposition: input.contentDisposition
    })
  );

  return {
    etag: response.ETag?.replaceAll('"', "") ?? null
  };
}

export async function getDocumentObject(key: string) {
  return getR2Client().send(
    new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key
    })
  );
}

export async function deleteDocumentObject(
  key: string,
  options?: { ignoreMissing?: boolean }
) {
  try {
    await getR2Client().send(
      new DeleteObjectCommand({
        Bucket: getBucketName(),
        Key: key
      })
    );
  } catch (error) {
    if (options?.ignoreMissing && isR2ObjectMissingError(error)) {
      return;
    }

    throw error;
  }
}
