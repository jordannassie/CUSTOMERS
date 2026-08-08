import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Next.js + Supabase + Netlify
        </h1>
        <p className="text-lg text-gray-500 mb-8">
          Your starter is ready. Connect Supabase and deploy to Netlify.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <Card
          title="⚡ Next.js 15"
          description="App Router, TypeScript, Tailwind CSS — production-ready from day one."
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
          description="Continuous deployment via netlify.toml. Push to GitHub → live in seconds."
          href="https://docs.netlify.com"
        />
      </div>

      <p className="text-sm text-gray-400 mt-4">
        Edit{" "}
        <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs">
          src/app/page.tsx
        </code>{" "}
        to get started.
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
      className="group rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
    >
      <h2 className="font-semibold text-lg mb-2 group-hover:underline">
        {title}
      </h2>
      <p className="text-sm text-gray-500">{description}</p>
    </a>
  );
}
