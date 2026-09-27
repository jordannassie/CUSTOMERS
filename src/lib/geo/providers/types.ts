import type {
  VisibilityProviderContext,
  VisibilityProviderId,
  VisibilityProviderResult,
} from "@/types/geo";

export interface VisibilityProviderAdapter {
  id: VisibilityProviderId;
  label: string;
  /** True when the required API key/env var is present. */
  isConfigured(): boolean;
  run(
    prompt: string,
    context: VisibilityProviderContext,
  ): Promise<VisibilityProviderResult>;
}
