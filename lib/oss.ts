import OSS, { Options } from "ali-oss";
import * as process from "process";

const config: Options = {
  // yourRegion填写Bucket所在地域。以华东1（杭州）为例，yourRegion填写为oss-cn-hangzhou。
  region: process.env.OSS_REGION as string,
  // 从环境变量中获取访问凭证。运行本代码示例之前，请确保已设置环境变量OSS_ACCESS_KEY_ID和OSS_ACCESS_KEY_SECRET。
  accessKeyId: process.env.OSS_ACCESS_KEY_ID as string,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET as string,
  secure: true, // 强制使用HTTPS。
  // 填写Bucket名称。
  bucket: process.env.OSS_BUCKET as string,
};

let client: OSS | null = null;

function getClient(): OSS {
  if (client) return client;

  if (
    !config.region ||
    !config.accessKeyId ||
    !config.accessKeySecret ||
    !config.bucket
  ) {
    throw new Error(
      "OSS client is not configured. Missing environment variables.",
    );
  }

  client = new OSS(config);
  return client;
}

// 上传文件
export async function uploadFile(
  fileContent: Buffer | Blob,
  uniqueFilename: string,
  options?: { acl?: "private" | "public-read" },
): Promise<{ fileUrl: string; fileName: string }> {
  // 添加Blob处理逻辑
  if (fileContent instanceof Blob) {
    const arrayBuffer = await fileContent.arrayBuffer();
    fileContent = Buffer.from(arrayBuffer);
  }
  try {
    const result = await getClient().put(uniqueFilename, fileContent, {
      // 对象级 ACL：public-read 用于无需签名即可访问的公开资源（如频道品牌封面）
      headers: options?.acl ? { "x-oss-object-acl": options.acl } : undefined,
    });

    if (!result.name) {
      throw new Error("文件上传失败");
    }

    return {
      fileUrl: result.url,
      fileName: result.name,
    };
  } catch (error) {
    console.error("OSS上传错误", error);
    throw new Error("文件上传失败");
  }
}

/**
 * 生成临时签名文件路径
 * @param fileName // 文件名
 * @param expire  // 有效时间
 */
export async function generateSignatureUrl(
  fileName: string,
  expire: number,
  options?: OSS.SignatureUrlOptions,
): Promise<string> {
  try {
    return getClient().signatureUrl(fileName, {
      expires: expire,
      ...options,
    });
  } catch (error) {
    console.error("OSS更新文件地址错误", error);
    // 构建阶段如无凭证则返回原始文件名，避免构建中断
    return fileName || "";
  }
}

// 删除文件
export async function deleteObject(fileName: string) {
  try {
    // 填写Object完整路径。Object完整路径中不能包含Bucket名称。
    return await getClient().delete(fileName);
  } catch (error) {
    console.log(error);
  }
}

/**
 * 从完整 OSS URL 中提取对象 key（"https://bucket.oss-cn-hangzhou.aliyuncs.com/yuanlu/speech/..."
 * → "yuanlu/speech/..."）。已是相对 key（无协议头）则原样返回。
 * speech_recognition 落库的 userAudioUrl/detailUrl 是上传返回的完整 URL，
 * 删除前须经本函数转换（用户注销与剧集删除的级联清理、同句保留策略共用）。
 */
export function extractOssKey(urlOrKey: string): string | null {
  if (!urlOrKey) return null;

  // If it's already a relative key (no protocol), return as-is
  if (!urlOrKey.startsWith("http")) return urlOrKey;

  try {
    const url = new URL(urlOrKey);
    // Remove leading slash from pathname
    return url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
  } catch {
    // If URL parsing fails, return original value as potential key
    return urlOrKey;
  }
}
