import { useState } from "react";
// 使用电子邮箱登录或注册表单
export default function SignInForm({
  email,
  onBack,
}: {
  email: string;
  onBack: () => void;
}) {
  // 登录表单组件
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 这里添加实际的登录逻辑
      // 例如使用 signIn('credentials', { email, password })
      console.log("执行登录", { email, password });
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 模拟延迟
    } catch (err) {
      console.error(err);
      setError("登录失败，请检查密码");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl max-w-md mx-auto p-6">
      <div className="card-body">
        <button
          onClick={onBack}
          className="btn btn-ghost btn-sm self-start mb-4"
        >
          ← 返回
        </button>
        <h2 className="card-title text-2xl mb-4">欢迎回来</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-control">
            <label className="label">
              <span className="label-text">邮箱地址</span>
            </label>
            <input
              type="email"
              className="input input-bordered"
              value={email}
              readOnly
            />
          </div>

          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">密码</span>
            </label>
            <input
              type="password"
              className="input input-bordered"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-error mt-2">{error}</p>}

          <button
            type="submit"
            className={`btn btn-primary w-full mt-6 ${loading ? "loading" : ""}`}
            disabled={loading}
          >
            登录
          </button>
        </form>
      </div>
    </div>
  );
}
