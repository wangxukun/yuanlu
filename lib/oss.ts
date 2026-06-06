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
): Promise<{ fileUrl: string; fileName: string }> {
  // 添加Blob处理逻辑
  if (fileContent instanceof Blob) {
    const arrayBuffer = await fileContent.arrayBuffer();
    fileContent = Buffer.from(arrayBuffer);
  }
  try {
    const result = await getClient().put(uniqueFilename, fileContent);

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
