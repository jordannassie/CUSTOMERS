// "off": switched off on purpose (scheduled scans for real accounts before launch), not broken and not missing.
export type StatusState = "ok" | "error" | "unknown" | "not_configured" | "off";

export type ServiceStatus = {
  id: string;
  name: string;
  group: "ai" | "data" | "payments" | "jobs";
  state: StatusState;
  /** One plain sentence for the admin, never a key or a raw response body. */
  detail: string;
  /** What to change and where, for whoever runs the site (it may name Netlify, Supabase or a setting). */
  fix?: string;
  /** Stripe only: which kind of key is set. */
  mode?: "sandbox" | "live";
};

export type SystemStatus = {
  checkedAt: string;
  services: ServiceStatus[];
};
