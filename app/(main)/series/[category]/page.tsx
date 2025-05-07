"use client";

import { useEffect, useState } from "react";

export default function Page() {
  const [count, setCount] = useState(0); // 触发重新渲染

  useEffect(() => {
    console.log("current count: ", count);
  }, [count]);

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-(family-name:--font-geist-sans)">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <p>计数值: {count}</p>
        <button onClick={() => setCount(count + 1)}>增加计数</button>
      </main>
    </div>
  );
}
