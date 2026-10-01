import Link from "next/link";
import { Building2, ChevronRight } from "lucide-react";
import { PageContainer } from "@/components/app/PageContainer";
import { AccountForm } from "@/components/settings/AccountForm";
import { AgencyForm } from "@/components/settings/AgencyForm";
import { BusinessProfileForm } from "@/components/settings/BusinessProfileForm";
import { DangerZone } from "@/components/settings/DangerZone";
import { ScanSettingsForm } from "@/components/settings/ScanSettingsForm";
import { Panel, SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { changeEmail, changePassword, deleteAccount, deleteBusiness, getAccountView } from "@/modules/account";
import { BILLING_HREF } from "@/modules/workspace";
import { getSettings, saveAgencyName, saveBusinessProfile, saveScanSettings, uploadAgencyLogo } from "@/modules/settings";

export const metadata = { title: "Settings", robots: { index: false } };

const USAGE_HREF = "/settings/usage";
const QUESTIONS_HREF = "/questions";

export default async function SettingsPage() {
  const [{ agency, business, activeQuestions, plan }, account] = await Promise.all([
    getSettings({ next: "/settings" }),
    getAccountView({ next: "/settings" }),
  ]);

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

      <SettingsSection id="account" title="Account" description="How you log in. Changes to your email need a click on the link we send.">
        <AccountForm
          email={account.email}
          pendingEmail={account.pendingEmail}
          hasPassword={account.hasPassword}
          changeEmail={changeEmail}
          changePassword={changePassword}
        />
      </SettingsSection>

      {(business || account.agencyName) && (
        <SettingsSection
          id="danger"
          title="Delete"
          tone="danger"
          description={`Deleted data is kept for ${account.waitDays} days in case you change your mind, then removed for good.`}
        >
          <DangerZone
            business={business && { id: business.id, name: business.name }}
            agencyName={account.agencyName}
            waitDays={account.waitDays}
            deleteBusiness={deleteBusiness}
            deleteAccount={deleteAccount}
          />
        </SettingsSection>
      )}
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
      <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
    </Link>
  );
}
