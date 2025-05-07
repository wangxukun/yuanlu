import Link from "next/link";
export default function Page() {
  return (
    <div className="flex flex-col items-center justify-items-center min-h-screen p-2 gap-16 sm:p-20 font-(family-name:--font-geist-sans)">
      <main className="flex flex-col md:min-w-[960px] gap-8 items-center justify-items-center sm:items-start">
        <h1>User Center</h1>
        <ul>
          <li>
            <Link href="/">Favorites</Link>
          </li>
          <li>
            <Link href="/">Profile</Link>
          </li>
        </ul>
      </main>
    </div>
  );
}
