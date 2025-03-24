import OSS, { Options } from "ali-oss";
import * as process from "process";

const config: Options = {
  // yourRegion填写Bucket所在地域。以华东1（杭州）为例，yourRegion填写为oss-cn-hangzhou。
  region: process.env.OSS_REGION as string,
  // 从环境变量中获取访问凭证。运行本代码示例之前，请确保已设置环境变量OSS_ACCESS_KEY_ID和OSS_ACCESS_KEY_SECRET。
  accessKeyId: process.env.OSS_ACCESS_KEY_ID as string,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET as string,
  // authorizationV4: true,
  // 填写Bucket名称。
  bucket: process.env.OSS_BUCKET as string,
};

if (
  !config.region ||
  !config.accessKeyId ||
  !config.accessKeySecret ||
  !config.bucket
) {
  throw new Error("请检查环境变量是否正确设置");
}

const client = new OSS(config);

// 获取存储空间的访问权限。
export async function getBucketAcl() {
  const result = await client.getBucketACL("wxkzd");
  console.log("acl: ", result.acl);
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
    const result = await client.put(uniqueFilename, fileContent);

    if (!result.name) {
      throw new Error("文件上传失败");
    }
    // 生成签名URL
    const url = client.signatureUrl(result.name, {
      expires: 3600,
    });

    return {
      fileUrl: url,
      fileName: result.name,
    };
  } catch (error) {
    console.error("OSS上传错误", error);
    throw new Error("文件上传失败");
  }
}

// 更新文件地址
export async function updateFileUrl(
  fileName: string,
  expire: number,
): Promise<string> {
  try {
    const url = client.signatureUrl(fileName, {
      expires: expire,
    });
    return url;
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
    const result = await client.delete(fileName);
    console.log("删除OSS中封面图片成功");
    return result;
  } catch (error) {
    console.log(error);
  }
}
