// core/auth/captcha.client.ts
import { CaptchaValidateData } from './sms-auth.dto';
import crypto from 'crypto';

export class CaptchaClient {
  private static API_SERVER = 'https://captcha.alicaptcha.com/validate';

  /**
   * 图形验证码服务端二次校验
   * @param data 客户端获取的验证参数
   */
  public static async validate(data: CaptchaValidateData): Promise<boolean> {
    try {
      const appId = process.env.CAPTCHA_APP_ID;
      const appKey = process.env.CAPTCHA_APP_KEY;

      if (!appId || !appKey) {
        console.warn('Captcha APP_ID or APP_KEY is not configured, skipping validation.');
        return true; // 开发环境如果未配置可先绕过，或者根据需要返回 false
      }

      // 生成签名，使用 lotNumber 作为原始消息 message
      // 采用 hmac-sha256 将 message 和 key 进行单向散列
      const signToken = crypto
        .createHmac('sha256', appKey)
        .update(data.lotNumber)
        .digest('hex');

      // 上传校验参数到验证服务二次验证接口
      const query = new URLSearchParams({
        lot_number: data.lotNumber,
        captcha_output: data.captchaOutput,
        pass_token: data.passToken,
        gen_time: data.genTime,
        sign_token: signToken,
      });

      const url = `${this.API_SERVER}?captcha_id=${appId}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: query.toString(),
      });

      if (!response.ok) {
        console.error('Captcha Validation HTTP Error:', response.status);
        return false;
      }

      const resData = await response.json();
      
      if (resData.result === 'success') {
        return true;
      } else {
        console.error('Captcha Validation Failed:', resData.reason);
        return false;
      }
    } catch (error) {
      console.error('Captcha Validation Exception:', error);
      return false;
    }
  }
}
