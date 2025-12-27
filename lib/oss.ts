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
if (
  !config.region ||
  !config.accessKeyId ||
  !config.accessKeySecret ||
  !config.bucket
) {
  // 注意：在构建阶段 Next.js 可能会预执行代码，这里可以加个非空判断防止 build 失败
  if (process.env.NODE_ENV !== "production") {
    console.warn("OSS环境变量未设置，OSS功能将不可用");
  }
}

const client = new OSS(config);

// 获取存储空间的访问权限。
// export async function getBucketAcl() {
//   const result = await client.getBucketACL(process.env.OSS_BUCKET as string);
//   console.log(`${process.env.OSS_BUCKET} acl: `, result.acl);
// }

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
    const result = await client.put(uniqueFilename, fileContent);

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
): Promise<string> {
  try {
    return client.signatureUrl(fileName, {
      expires: expire,
    });
  } catch (error) {
    console.error("OSS更新文件地址错误", error);
    throw new Error("文件地址更新失败");
  }
}

// 删除文件
export async function deleteObject(fileName: string) {
  try {
    // 填写Object完整路径。Object完整路径中不能包含Bucket名称。
    // fileName="yuanlu/podcastes/covers/1742616413531_v8u19i72m4k.jpg"
    return await client.delete(fileName);
  } catch (error) {
    console.log(error);
  }
}
