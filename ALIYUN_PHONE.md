# 手机短信与图形认证

代码核对：2026-11-17。Web 登录在 auth.ts，移动登录在 app/api/auth/mobile/；验证码服务两端复用。

| 环节                       | 代码                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 发码路由                   | [app/api/auth/sms/send/route.ts](app/api/auth/sms/send/route.ts)                                             |
| 发码、校验、绑定、重置密码 | [core/auth/sms-auth.service.ts](core/auth/sms-auth.service.ts)、[sms-auth.dto.ts](core/auth/sms-auth.dto.ts) |
| Redis 计数                 | [core/auth/rate-limiter.service.ts](core/auth/rate-limiter.service.ts)、[lib/redis.ts](lib/redis.ts)         |
| 阿里云号码认证             | [core/auth/aliyun-sms.client.ts](core/auth/aliyun-sms.client.ts)：SendSmsVerifyCode / CheckSmsVerifyCode     |
| 图形认证二次校验           | [core/auth/captcha.client.ts](core/auth/captcha.client.ts)                                                   |
| Web 表单                   | [components/auth](components/auth)、[lib/form-schema.ts](lib/form-schema.ts)                                 |

## 当前行为

Redis 发码门槛：同号 60 秒冷却；已有同号 10 分钟 ≥3 次或同 IP 1 分钟 ≥5 次时要求图形验证；同号 24 小时 ≥15 次、同 IP 1 小时 ≥30 次拒绝发送。成功发码才记数。

验证码由阿里云服务校验（6 位数字、300 秒有效）；Redis 保存失败计数，不保存验证码。失败达到 5 次后，计数键过期前拒绝验证；30 分钟 TTL 从首次失败起算，不是每次失败重新计时。成功清除失败计数，不存在“在 Redis 删除验证码”的实现。

Web 手机登录可自动创建占位邮箱用户；不是调用 SmsAuthService.phoneLogin 后自动注册。自定义错误用短期 `custom_auth_error` Cookie 透传，旧 CustomAuthError 已移除。图形认证缺少 CAPTCHA_APP_ID/KEY 时当前代码直接放行，部署前须核对配置，不能把它描述为始终强制校验。

## 配置入口

不记录密钥值。Redis 使用 REDIS*URL；短信使用 ALIYUN_SMS_ACCESS_KEY_ID / ACCESS_KEY_SECRET / SIGN_NAME / SCHEME_NAME，以及 ALIYUN_SMS_TEMPLATE_LOGIN_REGISTER / CHANGE_PHONE / RESET_PASSWORD / BIND_PHONE（均带 ALIYUN_SMS_TEMPLATE* 前缀）。图形认证服务端用 CAPTCHA_APP_ID / CAPTCHA_APP_KEY，前端配置查 components/auth。服务商频控以实际响应为准，本仓库不承诺外部固定上限。
