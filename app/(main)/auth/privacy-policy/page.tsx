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
        <div className="card bg-base-100 shadow-lg p-8">
          <h1 className="text-3xl font-extrabold text-primary mb-2">
            隐私政策
          </h1>
          <p className="text-sm text-base-content/70 mb-6">
            最后更新：2025年11月
          </p>

          <section className="prose prose-sm max-w-none">
            <p>
              远路播客非常重视用户的个人信息保护。本政策旨在说明我们如何收集、使用、存储及保护您的个人信息。请您仔细阅读本政策内容。
            </p>

            <h3>1. 信息收集</h3>
            <p>我们可能会收集以下类型的信息：</p>
            <ul>
              <li>
                <strong>账户信息</strong>：您注册时提供的邮箱、密码等；
              </li>
              <li>
                <strong>学习数据</strong>：您的学习记录、收听历史、收藏内容等；
              </li>
              <li>
                <strong>设备信息</strong>：浏览器类型、访问时间、IP
                地址、操作系统等；
              </li>
              <li>
                <strong>反馈与互动信息</strong>
                ：您在评论、反馈中主动提供的内容。
              </li>
            </ul>

            <h3>2. 信息使用</h3>
            <p>我们收集信息的目的在于：</p>
            <ol>
              <li>提供、维护和优化我们的服务；</li>
              <li>分析学习行为，以改进内容推荐；</li>
              <li>防止欺诈、滥用或违反用户协议的行为；</li>
              <li>向您发送与学习相关的通知或更新。</li>
            </ol>

            <h3>3. 信息共享与披露</h3>
            <p>我们仅在以下情况下共享您的信息：</p>
            <ul>
              <li>经您明确授权；</li>
              <li>根据法律法规或监管机构要求；</li>
              <li>
                为实现功能（如云存储、统计分析）与受信任的第三方合作，但会要求合作方遵守保密义务。
              </li>
            </ul>

            <h3>4. 信息存储与安全</h3>
            <p>
              您的数据将安全存储在受保护的服务器上，并采取技术和管理措施防止丢失、滥用或泄露。如发生数据安全事件，我们将依照法律要求及时告知您。
            </p>

            <h3>5. 用户权利</h3>
            <p>
              您有权访问、更正或删除您的个人信息；撤回授权同意；注销账户并要求删除相关数据。如需行使以上权利，可通过“联系我们”页面与我们取得联系。
            </p>

            <h3>6. 未成年人保护</h3>
            <p>
              若您未满18岁，请在监护人陪同下使用本服务，并由监护人同意本隐私政策。
            </p>

            <h3>7. 政策更新</h3>
            <p>
              我们可能会不时更新本政策。若政策发生重大变化，我们将在网站显著位置通知您。
            </p>

            <p className="mt-4">
              <strong>联系方式：</strong> wxk-zd@qq.com
            </p>
          </section>

          <div className="mt-6 flex justify-end">
            <button className="btn btn-primary" onClick={handleClosePage}>
              关闭页面
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
