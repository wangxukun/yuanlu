"use client";

import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  const handleClosePage = () => {
    // 尝试关闭当前标签页
    window.close();

    // 如果无法关闭（大多数情况下），则返回上一页
    router.back();
  };

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="container mx-auto">
        <div className="card card-side bg-base-100 shadow-lg overflow-hidden">
          <div className="card-body p-8">
            <h1 className="text-3xl font-extrabold mb-4 text-primary">
              会员订阅服务协议
            </h1>
            <p className="text-sm text-base-content opacity-70 mb-6">
              最后更新：2026年6月
            </p>

            <article className="prose prose-sm max-w-none">
              <p>
                本协议是您（下称“用户”）与《远路播客》（下称“本平台”）之间关于订阅会员服务及相关权益的法律协议。在使用会员服务前，请务必审慎阅读本协议的全部条款。
              </p>

              <h3>1. 服务内容</h3>
              <p>
                本平台提供的会员服务（下称“会员服务”）指用户支付相关费用后，在本平台享有的专属内容访问权限、特定增值功能或相关社区权益。
              </p>

              <h3>2. 会员方案与支付</h3>
              <ul>
                <li>
                  <strong>方案设置：</strong>{" "}
                  平台提供周度（7天）、月度（30天）、季度（90天）及年度（365天）四种订阅方案。
                </li>
                <li>
                  <strong>支付与激活：</strong>{" "}
                  本平台目前通过“爱发电”平台进行交易处理。用户在支付时，需确保填写的邮箱信息准确无误。该邮箱将作为系统自动激活会员资格的唯一凭证。
                </li>
                <li>
                  <strong>自动激活：</strong>{" "}
                  用户完成支付后，系统将通过预留邮箱进行匹配并自动开通权益。
                  <strong>
                    用户应确保邮箱准确无误；因用户填错信息导致无法激活，本平台不承担补发或退款责任。
                  </strong>
                </li>
              </ul>

              <h3>3. 会员有效期与叠加机制</h3>
              <ul>
                <li>
                  <strong>有效期计算：</strong> 会员有效期自支付成功之时起算。
                </li>
                <li>
                  <strong>叠加机制：</strong>{" "}
                  若用户在现有会员有效期内再次购买任何订阅方案，新的有效期将在当前剩余时间基础上进行对应天数的累加，不会覆盖或清空现有权益。
                </li>
              </ul>

              <h3>4. 用户行为约束</h3>
              <p>为保障社区环境及各方合法权益，用户承诺遵守以下约束：</p>
              <ul>
                <li>
                  <strong>禁止账号共享：</strong>{" "}
                  会员账号仅限购买者本人使用。严禁通过共享、转借、售卖、批发账号等方式让非本人使用会员权益。
                </li>
                <li>
                  <strong>禁止非法传播：</strong>{" "}
                  会员专属内容仅供用户个人学习、欣赏之用。用户不得通过任何形式（包括但不限于录音、下载、截图、分发、转贴、用于公共展示）将会员内容传播至第三方平台。
                </li>
                <li>
                  <strong>违规处理：</strong>{" "}
                  若系统监测到账号存在异常登录（多设备高频异地登录）、非法下载或内容盗版传播行为，本平台有权
                  <strong>
                    立即封禁相关账号，并取消其所有剩余会员权益，且无需进行退款或赔偿
                  </strong>
                  。若情节严重导致平台损失，平台保留追究法律责任的权利。
                </li>
              </ul>

              <h3>5. 免责声明</h3>
              <ul>
                <li>
                  <strong>服务稳定性：</strong>{" "}
                  本平台尽力确保服务的连续性，但因互联网环境、第三方支付接口故障、网络波动或必要的系统维护，导致用户无法正常使用会员服务的，本平台不承担违约责任。
                </li>
                <li>
                  <strong>内容提供：</strong>{" "}
                  会员权益中的内容（如播客、附件、文档等）由平台根据运营计划更新。本平台对内容的具体更新频率、数量及持久保留时间不作强制性承诺，用户不得以内容更新变动为由要求退款。
                </li>
                <li>
                  <strong>间接损失：</strong>{" "}
                  在法律允许的最大范围内，因使用本平台服务导致的任何间接、附带或特殊损失，本平台概不负责。
                </li>
              </ul>

              <h3>6. 服务终止与退款</h3>
              <ul>
                <li>
                  <strong>服务性质：</strong>{" "}
                  鉴于数字内容服务的特殊性，会员服务一经激活，除法律法规另有规定或平台存在重大系统故障外，原则上不支持退款。
                </li>
                <li>
                  <strong>特殊退款：</strong>{" "}
                  若因平台重大故障导致长期无法提供服务，用户可向客服申请退还剩余未生效天数的等值费用（按支付实际金额折算）。
                </li>
              </ul>

              <h3>7. 协议变更</h3>
              <p>
                本平台有权根据业务发展及法律法规变化，对本协议内容进行调整。相关变动将在平台显著位置公示，公示期满后即生效。如用户在协议变更后继续使用本服务，即视为已接受变更后的协议。
              </p>

              <h3>8. 争议解决</h3>
              <p>
                本协议适用中华人民共和国法律。双方发生争议时，应协商解决；协商不成的，应向本平台所在地人民法院提起诉讼。
              </p>

              <p className="italic mt-6 text-base-content opacity-80">
                （用户通过“爱发电”完成支付，即视为完全理解并自愿遵守本协议所有内容。）
              </p>
            </article>

            <div className="mt-6 flex gap-3">
              <button className="btn btn-primary" onClick={handleClosePage}>
                关闭页面
              </button>
            </div>
          </div>

          <div className="hidden lg:block lg:w-80 bg-primary p-8">
            <div className="text-white">
              <h3 className="text-xl font-bold mb-2">关于远路播客</h3>
              <p className="text-sm opacity-90">
                为英语学习者打造的优质播客平台，提供分级内容、跟读评测与社群练习。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
