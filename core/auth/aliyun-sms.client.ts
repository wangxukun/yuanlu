// core/auth/aliyun-sms.client.ts
import Dypnsapi20170525, * as $Dypnsapi20170525 from '@alicloud/dypnsapi20170525';
import * as $OpenApi from '@alicloud/openapi-client';
import * as $Util from '@alicloud/tea-util';

export class AliyunSmsClient {
  private static instance: Dypnsapi20170525;

  private static createClient(): Dypnsapi20170525 {
    if (this.instance) {
      return this.instance;
    }

    const config = new $OpenApi.Config({
      accessKeyId: process.env.ALIYUN_SMS_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIYUN_SMS_ACCESS_KEY_SECRET,
    });
    // Endpoint 请参考 https://api.aliyun.com/product/Dypnsapi
    config.endpoint = 'dypnsapi.aliyuncs.com';
    this.instance = new Dypnsapi20170525(config);
    return this.instance;
  }

  /**
   * 调用 SendSmsVerifyCode 发送短信验证码
   */
  public static async sendSmsVerifyCode(
    phone: string,
    templateCode: string,
  ): Promise<boolean> {
    const client = this.createClient();
    const request = new $Dypnsapi20170525.SendSmsVerifyCodeRequest({
      phoneNumber: phone,
      signName: process.env.ALIYUN_SMS_SIGN_NAME,
      templateCode: templateCode,
      templateParam: '{"code":"##code##","min":"5"}',
      codeLength: 6,
      validTime: 300,
      codeType: 1, // 纯数字
      duplicatePolicy: 1, // 覆盖
      interval: 60,
      schemeName: process.env.ALIYUN_SMS_SCHEME_NAME || '远路播客',
    });

    const runtime = new $Util.RuntimeOptions({});

    try {
      const response = await client.sendSmsVerifyCodeWithOptions(request, runtime);
      if (response.body?.code !== 'OK') {
        console.error('Aliyun SMS Send Failed:', response.body);
      }
      return response.body?.code === 'OK';
    } catch (error) {
      console.error('Aliyun SMS Send Error:', error);
      return false;
    }
  }

  /**
   * 调用 CheckSmsVerifyCode 校验短信验证码
   */
  public static async checkSmsVerifyCode(
    phone: string,
    code: string,
  ): Promise<boolean> {
    const client = this.createClient();
    const request = new $Dypnsapi20170525.CheckSmsVerifyCodeRequest({
      phoneNumber: phone,
      verifyCode: code,
      schemeName: process.env.ALIYUN_SMS_SCHEME_NAME || '远路播客',
    });

    const runtime = new $Util.RuntimeOptions({});

    try {
      const response = await client.checkSmsVerifyCodeWithOptions(request, runtime);
      if (response.body?.code !== 'OK' || response.body?.model?.verifyResult !== 'PASS') {
         console.error('Aliyun SMS Check Failed:', response.body);
      }
      return response.body?.code === 'OK' && response.body?.model?.verifyResult === 'PASS';
    } catch (error) {
      console.error('Aliyun SMS Check Error:', error);
      return false;
    }
  }
}
