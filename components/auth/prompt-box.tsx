export default function PromptBox() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold text-gray-800">注册成功</h3>
        <p className="mb-6 text-sm text-gray-600">请登录体验</p>
      </div>
    </div>
  );
}
