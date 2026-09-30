"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createAcademyAccountAfterPurchase } from "@/modules/launch-kit/claim-account";

export default function ClaimAccountForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData();
    formData.set("sessionId", sessionId);
    formData.set("password", password);
    const result = await createAcademyAccountAfterPurchase(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      if (result.email) {
        router.push("/login?next=/academy");
      }
      return;
    }
    router.push("/login?next=/academy");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 max-w-md space-y-3">
      <label className="block text-[13px] font-medium text-[#171717]">
        Create a password for the Academy
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full border border-[#8F8F8A] rounded-[4px] px-3 py-2 text-[14px] bg-white"
        />
      </label>
      {error ? (
        <p className="text-[13px] text-[#B91C1C]" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold px-5 py-2.5 rounded-[4px] disabled:opacity-70"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
        Create login and continue
      </button>
    </form>
  );
}
