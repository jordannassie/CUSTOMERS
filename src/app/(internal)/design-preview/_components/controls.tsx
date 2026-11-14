"use client";

import { useState } from "react";
import { Copy, Loader2, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Demo } from "./section";

export function Buttons() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Demo label="Variants">
        <div className="flex flex-wrap gap-2">
          <Button>Check my visibility</Button>
          <Button variant="outline">Export report</Button>
          <Button variant="secondary">Edit questions</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="destructive">Delete business</Button>
          <Button variant="link">View all fixes</Button>
        </div>
      </Demo>
      <Demo label="Sizes">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="xs">Extra small</Button>
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Add question">
            <Plus />
          </Button>
        </div>
      </Demo>
      <Demo label="With icon, loading and disabled">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline">
            <Copy data-icon="inline-start" />
            Copy for Claude
          </Button>
          <Button disabled>
            <Loader2 className="animate-spin" data-icon="inline-start" />
            Checking
          </Button>
          <Button disabled variant="outline">
            Save changes
          </Button>
        </div>
      </Demo>
    </div>
  );
}

export function Fields() {
  const [website, setWebsite] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const invalid = submitted && !/^[\w-]+(\.[\w-]+)+/.test(website.trim());

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form
        noValidate
        className="rounded-md border border-border bg-surface p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
        <FieldGroup>
          <Field data-invalid={invalid || undefined}>
            <FieldLabel htmlFor="dp-website">Your website</FieldLabel>
            <Input
              id="dp-website"
              placeholder="yourbusiness.com"
              value={website}
              aria-invalid={invalid || undefined}
              onChange={(e) => setWebsite(e.target.value)}
            />
            {invalid ? (
              <FieldError>Enter a website like yourbusiness.com.</FieldError>
            ) : (
              <FieldDescription>We use it to find your business details.</FieldDescription>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="dp-city">City</FieldLabel>
            <Input id="dp-city" placeholder="Austin, TX" />
          </Field>
          <Button type="submit" className="self-start">
            Check my visibility
          </Button>
        </FieldGroup>
      </form>

      <div className="flex flex-col gap-6">
        <Demo label="Search input">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-hint" />
            <Input aria-label="Search questions" placeholder="Search questions" className="pl-9" />
          </div>
        </Demo>
        <Demo label="Error state">
          <Field data-invalid>
            <FieldLabel htmlFor="dp-phone">Phone</FieldLabel>
            <Input id="dp-phone" defaultValue="555-01" aria-invalid />
            <FieldError>Enter the full phone number, including the area code.</FieldError>
          </Field>
        </Demo>
        <Demo label="Disabled">
          <Field data-disabled>
            <FieldLabel htmlFor="dp-plan">Plan</FieldLabel>
            <Input id="dp-plan" defaultValue="Starter" disabled />
          </Field>
        </Demo>
      </div>
    </div>
  );
}

export function Badges() {
  return (
    <div className="flex flex-col gap-6">
      <Demo label="Status (text shade on its background)">
        <div className="flex flex-wrap gap-2">
          <Badge variant="good">Good</Badge>
          <Badge variant="mid">Needs work</Badge>
          <Badge variant="low">Not visible</Badge>
          <Badge variant="good" className="tabular">
            +8 this week
          </Badge>
          <Badge variant="low">High impact</Badge>
        </div>
      </Demo>
      <Demo label="Neutral and brand">
        <div className="flex flex-wrap gap-2">
          <Badge>Your business</Badge>
          <Badge variant="tint">For agencies</Badge>
          <Badge variant="secondary">Library question</Badge>
          <Badge variant="outline">Custom question</Badge>
        </div>
      </Demo>
    </div>
  );
}
