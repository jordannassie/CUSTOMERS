export type StatusState = "ok" | "error" | "unknown" | "not_configured";

export type ServiceStatus = {
  id: string;
  name: string;
  group: "ai" | "data" | "payments" | "jobs";
  state: StatusState;
  /** One plain sentence for the admin, never a key or a raw response body. */
  detail: string;
  /** Stripe only: which kind of key is set. */
  mode?: "sandbox" | "live";
};

export type SystemStatus = {
  checkedAt: string;
  services: ServiceStatus[];
};
