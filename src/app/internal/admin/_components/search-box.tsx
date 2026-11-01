"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * A search box for a server-paged admin list, like Leads: typing waits a moment, then puts ?q= in the URL and goes
 * back to page 1. The list itself is read on the server.
 */
export default function SearchBox({ id, label, placeholder }: { id: string; label: string; placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function search(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const query = new URLSearchParams(params);
      if (next.trim()) query.set("q", next.trim());
      else query.delete("q");
      query.delete("page");
      const qs = query.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    }, 350);
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-1 sm:w-72">
      <Label htmlFor={id} className="text-[13px]">
        {label}
      </Label>
      <div className="relative">
        <Input id={id} type="search" value={value} placeholder={placeholder} onChange={(e) => search(e.target.value)} className="pr-8" />
        {pending && (
          <Loader2 aria-label="Searching" className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-text-hint motion-reduce:animate-none" />
        )}
      </div>
    </div>
  );
}
