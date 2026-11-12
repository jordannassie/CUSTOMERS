import { requireAdmin } from "@/modules/auth";
import { listFeatureRequests } from "@/modules/feedback";
import AdminPageHeader from "../_components/page-header";
import FeatureRequestsClient from "./FeatureRequestsClient";
import { featureFilter } from "./_components/request-parts";

export const metadata = { title: "Feature requests" };

// listFeatureRequests (modules/feedback) returns the newest 200; a full list means older ones were left out.
const LIST_CAP = 200;

type Props = { searchParams: Promise<{ status?: string | string[] }> };

export default async function AdminFeatureRequestsPage({ searchParams }: Props) {
  await requireAdmin({ next: "/internal/admin/feature-requests" });

  const result = await listFeatureRequests();
  const fetchError = "error" in result ? { message: result.error } : null;

  // Any read error lands here, so the admin gets a plain next step; the database message is folded away for a
  // developer. The table comes from migrations 014 and 016.
  if (fetchError) {
    return (
      <div className="mx-auto flex w-full max-w-[calc(1200px*var(--px,1))] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
        <AdminPageHeader title="Feature requests" subtitle="Ideas people sent with Suggest a feature in the app." />
        <div role="alert" className="flex flex-col gap-2 rounded-md bg-low-bg px-4 py-3 text-[length:calc(13px*var(--px,1))] text-low-text">
          <p className="text-[length:calc(14px*var(--px,1))] font-medium">Feature requests didn&apos;t load</p>
          <p>Refresh the page to try again. If it keeps happening, send the technical details to the developer.</p>
          <details>
            <summary className="w-fit cursor-pointer font-medium">Technical details</summary>
            <p className="mt-1 font-mono text-[length:calc(12px*var(--px,1))] break-all whitespace-pre-wrap">{fetchError.message}</p>
          </details>
        </div>
      </div>
    );
  }

  const requests = "requests" in result ? result.requests : [];

  return (
    <div className="mx-auto flex w-full max-w-[calc(1200px*var(--px,1))] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
      <FeatureRequestsClient
        requests={requests}
        filter={featureFilter((await searchParams).status)}
        capped={requests.length >= LIST_CAP ? LIST_CAP : null}
      />
    </div>
  );
}
