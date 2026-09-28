import Link from "next/link";
import { ArrowUpRight, Building2 } from "lucide-react";
import { PageContainer } from "@/components/app/PageContainer";
import { AgencyForm } from "@/components/settings/AgencyForm";
import { BusinessProfileForm } from "@/components/settings/BusinessProfileForm";
import { ScanSettingsForm } from "@/components/settings/ScanSettingsForm";
import { Panel, SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { BILLING_HREF } from "@/modules/workspace";
import { getSettings, saveAgencyName, saveBusinessProfile, saveScanSettings, uploadAgencyLogo } from "@/modules/settings";

export const metadata = { title: "Settings", robots: { index: false } };

// Self-serve deletion (B-77) is not built yet; support does it until then.
const USAGE_HREF = "/settings/usage";
const QUESTIONS_HREF = "/questions";
const SUPPORT_HREF = "/contact?topic=support";

export default async function SettingsPage() {
  const { email, agency, business, activeQuestions, plan } = await getSettings({ next: "/settings" });

  return (
    <PageContainer>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {business ? `${business.name} and your account, in one place.` : "Your account, in one place."}
        </p>
      </header>

      {business ? (
        <>
          <SettingsSection
            id="profile"
            title="Business profile"
            description="What we tell AI about this business when we check its answers. Keep it the same as your website and Google listing."
          >
            <BusinessProfileForm key={business.id} business={business} save={saveBusinessProfile} />
          </SettingsSection>

          <SettingsSection
            id="checks"
            title="AI checks"
            description="Which AI models we ask your questions, and how often. Each question on each model uses 1 credit, so you see the effect before you save."
          >
            <ScanSettingsForm
              key={business.id}
              businessId={business.id}
              models={business.models}
              frequency={business.frequency}
              activeQuestions={activeQuestions}
              plan={plan}
              questionsHref={QUESTIONS_HREF}
              save={saveScanSettings}
            />
          </SettingsSection>
        </>
      ) : (
        <SettingsSection id="profile" title="Business profile" description="Details and AI checks for each business.">
          <Panel className="flex flex-col items-start gap-3">
            <Building2 className="size-5 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm">Add a business to set its profile and AI checks here.</p>
            <Button asChild size="sm">
              <Link href="/dashboard/add-business">Add a business</Link>
            </Button>
          </Panel>
        </SettingsSection>
      )}

      {agency && (
        <SettingsSection id="agency" title="Agency" description="Your agency name and logo appear on PDF reports and share links.">
          <AgencyForm name={agency.name} logoUrl={agency.logoUrl} saveName={saveAgencyName} uploadLogo={uploadAgencyLogo} />
        </SettingsSection>
      )}

      <SettingsSection id="billing" title="Billing and usage" description="Your plan, card, invoices and where your credits went.">
        <Panel className="flex flex-col divide-y divide-border p-0">
          <LinkRow href={BILLING_HREF} title="Billing" text="Change plan, update your card and download invoices." />
          <LinkRow href={USAGE_HREF} title="Usage" text="Credits used this period for each business, and buying more." />
        </Panel>
      </SettingsSection>

      <SettingsSection id="account" title="Account" description="How you sign in.">
        <Panel className="flex flex-col gap-1">
          <p className="text-sm font-medium" data-testid="account-email">
            {email}
          </p>
          <p className="text-[13px] text-muted-foreground">Signed in with email or Google</p>
          <Link href="/forgot-password" className="mt-2 w-fit text-[13px] text-primary underline-offset-2 hover:underline">
            Change password
          </Link>
        </Panel>
      </SettingsSection>

      <SettingsSection
        id="danger"
        title="Danger zone"
        tone="danger"
        description="Deleting cannot be undone."
      >
        <Panel className="flex flex-col gap-3 border-low/40">
          <p className="text-sm">
            To delete {business ? business.name : "a business"} or your whole account, contact support and we will do it
            for you.
          </p>
          <Button asChild variant="outline" size="sm" className="w-fit border-low/50 text-low-text hover:bg-low-bg">
            <Link href={SUPPORT_HREF}>Contact support to delete</Link>
          </Button>
        </Panel>
      </SettingsSection>
    </PageContainer>
  );
}

function LinkRow({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Link href={href} className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted">
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-[13px] text-muted-foreground">{text}</span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
    </Link>
  );
}
