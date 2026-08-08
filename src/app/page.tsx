import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-white px-6 py-24">
      {/* Logo */}
      <Image
        src="https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/logo/Logo.png"
        alt="Customers.Direct"
        width={320}
        height={80}
        priority
        className="h-auto"
        unoptimized
      />

      {/* Headline */}
      <div className="text-center max-w-xl">
        <p className="text-lg text-gray-500">
          {user
            ? `Welcome back, ${user.email} 👋`
            : "Your customer platform is ready. Connect Supabase and go live."}
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <Card
          title="⚡ Next.js 15"
          description="App Router, TypeScript & Tailwind CSS — production-ready from day one."
          href="https://nextjs.org/docs"
        />
        <Card
          title="🟢 Supabase"
          description={
            user
              ? `Signed in as ${user.email}`
              : "Auth, database & storage. Add your env vars to connect."
          }
          href="https://supabase.com/docs"
        />
        <Card
          title="▲ Netlify"
          description="Push to GitHub → instantly live. Configured via netlify.toml."
          href="https://docs.netlify.com"
        />
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Edit{" "}
        <code className="bg-gray-100 px-1 py-0.5 rounded">
          src/app/page.tsx
        </code>{" "}
        to start building.
      </p>
    </main>
  );
}

function Card({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group rounded-xl border border-gray-200 p-6 hover:border-black transition-colors"
    >
      <h2 className="font-semibold text-base mb-2 group-hover:underline">
        {title}
      </h2>
      <p className="text-sm text-gray-500">{description}</p>
    </a>
  );
}
