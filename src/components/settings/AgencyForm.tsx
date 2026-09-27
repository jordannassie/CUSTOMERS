"use client";

import { useRef, useState, useTransition } from "react";
import { ImageUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/modules/auth";
import { LOGO_MAX_BYTES, LOGO_RULES } from "@/modules/settings/service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SaveAction } from "./BusinessProfileForm";
import { FormError, Panel } from "./SettingsSection";

export type UploadLogoAction = (form: FormData) => Promise<ActionResult<{ logoUrl: string }>>;

export function AgencyForm({
  name,
  logoUrl,
  saveName,
  uploadLogo,
}: {
  name: string;
  logoUrl: string | null;
  saveName: SaveAction;
  uploadLogo: UploadLogoAction;
}) {
  const [value, setValue] = useState(name);
  const [logo, setLogo] = useState(logoUrl);
  const [nameError, setNameError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [uploading, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function submitName(e: React.FormEvent) {
    e.preventDefault();
    setNameError(null);
    startSave(async () => {
      const result = await saveName({ name: value });
      if (result.ok) toast.success("Agency name saved");
      else setNameError(result.error);
    });
  }

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLogoError(null);
    // Checked here too so a big file never reaches the server; the server checks the bytes again.
    if (file.size > LOGO_MAX_BYTES) return setLogoError(`That file is too big. ${LOGO_RULES}`);
    const form = new FormData();
    form.append("logo", file);
    startUpload(async () => {
      const result = await uploadLogo(form);
      if (!result.ok) return setLogoError(result.error);
      setLogo(result.data.logoUrl);
      toast.success("Logo uploaded");
    });
  }

  return (
    <Panel className="flex flex-col gap-6">
      <form onSubmit={submitName} aria-label="Agency name" className="flex flex-col gap-2">
        <Label htmlFor="agency-name">Agency name</Label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input id="agency-name" value={value} onChange={(e) => setValue(e.target.value)} required maxLength={120} />
          <Button type="submit" variant="outline" className="w-fit" disabled={saving || value.trim() === name}>
            {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
            Save name
          </Button>
        </div>
        <FormError message={nameError} />
      </form>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium" id="agency-logo-label">
          Logo
        </p>
        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- public storage URL with a cache-busting version
              <img src={logo} alt="Agency logo" data-testid="agency-logo" className="size-full object-contain" />
            ) : (
              <span className="text-xs text-text-hint">No logo</span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-labelledby="agency-logo-label"
              onChange={pickFile}
              className="sr-only"
              tabIndex={-1}
            />
            <Button type="button" variant="outline" size="sm" className="w-fit" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ImageUp aria-hidden="true" />}
              {logo ? "Replace logo" : "Upload logo"}
            </Button>
            <p className="text-xs text-text-hint">{LOGO_RULES} Shown on your PDF reports.</p>
          </div>
        </div>
        <FormError message={logoError} />
      </div>
    </Panel>
  );
}
