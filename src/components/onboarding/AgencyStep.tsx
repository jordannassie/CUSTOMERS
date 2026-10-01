"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, X } from "lucide-react";
import type { ActionResult } from "@/modules/auth";
import { LOGO_MAX_BYTES, LOGO_RULES } from "@/modules/settings/service";
import { Button } from "@/components/ui/button";
import { FieldMessage, useFieldErrors } from "@/components/ui/field-errors";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldHint, StepActions, StepError } from "./StepBits";

type Props = {
  defaultName: string;
  logoUrl: string | null;
  plan: string | null;
  save: (input: { name: string; plan: string | null }) => Promise<ActionResult<null>>;
  uploadLogo: (form: FormData) => Promise<ActionResult<{ logoUrl: string }>>;
};

// MVP_SPEC 3.1 step 2: the agency name, and a logo for PDF reports if they have one to hand.
export function AgencyStep({ defaultName, logoUrl, plan, save, uploadLogo }: Props) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fields = useFieldErrors<"name">("agency");
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    e.target.value = "";
    setError(null);
    // The server checks the bytes again; this only stops a big file from being sent.
    if (picked && picked.size > LOGO_MAX_BYTES) return setError(`That file is too big. ${LOGO_RULES}`);
    setFile(picked);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (fields.show({ name: name.trim() ? undefined : "Enter your agency name." })) return;
    startTransition(async () => {
      const saved = await save({ name, plan });
      if (!saved.ok) return setError(saved.error);
      if (file) {
        const form = new FormData();
        form.append("logo", file);
        const uploaded = await uploadLogo(form);
        // The agency is saved, so a logo problem does not block the next step; Settings can add it later.
        if (!uploaded.ok) return setError(`${uploaded.error} You can also skip the logo and add it later in Settings.`);
      }
      router.push("/onboarding/website");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="agency-name">Agency name</Label>
        <Input
          id="agency-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            fields.clear("name");
          }}
          maxLength={120}
          required
          autoFocus
          autoComplete="organization"
          placeholder="Blue Door Marketing"
          className="h-11 text-base"
          {...fields.fieldProps("name", "agency-name-hint")}
        />
        <FieldMessage id={fields.idOf("name")} message={fields.errors.name} />
        <FieldHint id="agency-name-hint">Shown on your reports. If you run your own business, use its name.</FieldHint>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">
          Logo <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        <div className="flex items-center gap-4 rounded-md border border-dashed border-border bg-surface p-4">
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
            {logoUrl && !file ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Your agency logo" className="size-full object-contain p-1" />
            ) : (
              <ImageUp aria-hidden className="size-5 text-text-hint" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            {file ? (
              <p className="flex items-center gap-2 text-sm">
                <span className="truncate">{file.name}</span>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setFile(null)} aria-label="Remove logo">
                  <X aria-hidden />
                </Button>
              </p>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                {logoUrl ? "Replace logo" : "Choose a logo"}
              </Button>
            )}
            <p className="mt-1 text-xs text-text-hint">{LOGO_RULES} Used on PDF reports.</p>
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={pickFile} tabIndex={-1} aria-label="Logo file" />
        </div>
      </div>

      <StepError message={error} />
      <StepActions pending={pending} />
    </form>
  );
}
