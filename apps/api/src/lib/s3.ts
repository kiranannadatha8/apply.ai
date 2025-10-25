import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./env";

export const s3 = new S3Client({
  region: ENV.S3_REGION,
  credentials: undefined,
}); // uses env/instance role

export async function presignPut(key: string, contentType: string) {
  const cmd = new PutObjectCommand({
    Bucket: ENV.S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ACL: "private",
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn: 600 });
  return url;
}
