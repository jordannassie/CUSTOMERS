import AdminNotFound from "./_components/admin-not-found";

// Inside the admin layout, so the admin menu stays and the admin can move on (UI-033).
export default function AdminPageNotFound() {
  return (
    <AdminNotFound
      title="Page not found"
      text="There is no admin page at this address. Check the link, or pick a page from the menu."
      backHref="/internal/admin"
      backLabel="Back to Overview"
    />
  );
}
