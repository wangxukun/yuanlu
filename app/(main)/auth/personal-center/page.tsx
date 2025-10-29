import Link from "next/link";
export default function Page() {
  return (
    <div className="flex flex-col items-center justify-items-center min-h-screen p-2 gap-16 sm:p-20 font-(family-name:--font-geist-sans)">
      <main className="flex flex-col md:min-w-[960px] gap-8 items-center justify-items-center sm:items-start">
        <h1 className="text-2xl font-bold text-base-content">User Center</h1>
        <ul className="space-y-2">
          <li>
            <Link
              href="/"
              className="text-base-content hover:text-primary transition-colors"
            >
              Favorites
            </Link>
          </li>
          <li>
            <Link
              href="/"
              className="text-base-content hover:text-primary transition-colors"
            >
              Profile
            </Link>
          </li>
        </ul>
      </main>
    </div>
  );
}
