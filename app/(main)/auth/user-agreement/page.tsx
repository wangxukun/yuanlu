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
              用户协议
            </h1>
            <p className="text-sm text-base-content/70 mb-6">
              最后更新：2025年11月
            </p>

            <article className="prose prose-sm max-w-none">
              <h2>欢迎使用 远路播客</h2>
              <p>
                在使用我们的产品和服务之前，请您仔细阅读并充分理解本《用户协议》（以下简称“本协议”）。一旦您访问或使用本网站、移动应用或任何相关服务，即视为您已阅读、理解并同意受本协议约束。
              </p>

              <h3>1. 服务简介</h3>
              <p>
                远路播客是一个面向英语学习者的多媒体学习平台，提供包括但不限于英语播客收听、口语训练、词汇学习、语音评测、社区互动等功能。
              </p>

              <h3>2. 用户注册与账户安全</h3>
              <ol>
                <li>
                  用户需使用有效电子邮箱注册账户，并保证提供的信息真实、准确、完整。
                </li>
                <li>
                  用户有责任妥善保管账户及密码信息，因用户自身原因造成的账户泄露或损失，远路播客不承担责任。
                </li>
                <li>若发现账户被未经授权使用，请立即联系我们。</li>
              </ol>

              <h3>3. 使用规范</h3>
              <ul>
                <li>
                  用户在使用本服务时，应遵守法律法规及社会公德，不得上传或传播任何违法、暴力、色情、辱骂等不良内容。
                </li>
                <li>用户不得以任何方式干扰网站的正常运营或破坏系统安全。</li>
                <li>
                  用户不得利用本平台从事商业广告、诈骗、数据采集等与学习无关的行为。
                </li>
              </ul>

              <h3>4. 内容与版权</h3>
              <ol>
                <li>
                  网站内提供的部分音频、文本、图片及其他资源可能来源于互联网公共资源或第三方平台。我们已尽力核实内容的真实性和合法性，但无法保证其完全准确、完整或最新。
                </li>
                <li>
                  用户上传的学习记录或评论等内容，视为用户同意授予远路播客在平台内进行展示、推广的非独占许可。
                </li>
                <li>
                  用户仅可将内容用于个人学习和非商业用途，未经许可不得转载、分发或用于盈利目的。
                </li>
                <li>
                  本网站尊重知识产权，如发现使用的互联网资源存在版权争议，请及时联系我们，我们将在核实后及时处理，包括删除或更正相关内容。
                </li>
              </ol>
              <h3>5. 服务变更与终止</h3>
              <p>
                远路播客有权根据运营需要对服务进行更新、暂停或终止。若用户违反本协议或法律法规，平台有权随时限制或关闭其账户。
              </p>

              <h3>6. 免责声明</h3>
              <p>
                用户在使用本网站提供的互联网资源时，需自行判断其适用性及可靠性。因使用相关资源而产生的任何直接或间接损失，网站及其运营方不承担任何责任。平台提供的音频与内容仅供学习参考，不构成任何学术或考试保证。因网络中断、设备故障、不可抗力等原因造成的服务中断，远路播客不承担责任。本免责声明不排除或限制法律规定下用户享有的权利，但在法律允许的最大范围内，本网站及其运营方对因使用互联网资源而引起的任何损害不承担责任。
              </p>

              <h3>7. 更新与修改</h3>
              <p>
                本免责声明可随时更新，更新后的内容将在网站上发布并立即生效。用户应定期查阅免责声明内容。
              </p>

              <p>感谢您使用远路播客！</p>
            </article>

            <div className="mt-6 flex gap-3">
              <button className="btn btn-primary" onClick={handleClosePage}>
                关闭页面
              </button>
            </div>
          </div>

          <div className="hidden lg:block lg:w-80 bg-gradient-to-b from-primary to-secondary p-8">
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
