import AdminNotFound from "../../_components/admin-not-found";

export default function AgencyNotFound() {
  return (
    <AdminNotFound
      title="Agency not found"
      text="No agency matches this link. Check the address, or find the agency in the list."
      backHref="/internal/admin/agencies"
      backLabel="Back to agencies"
    />
  );
}
