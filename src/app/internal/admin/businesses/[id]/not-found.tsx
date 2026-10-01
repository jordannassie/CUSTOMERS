import AdminNotFound from "../../_components/admin-not-found";

export default function BusinessNotFound() {
  return (
    <AdminNotFound
      title="Business not found"
      text="No business matches this link. Check the address, or find the business in the list."
      backHref="/internal/admin/businesses"
      backLabel="Back to businesses"
    />
  );
}
