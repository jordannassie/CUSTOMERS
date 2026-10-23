import "server-only";
import { sendEmail, type SendEmailResult } from "@/modules/email";
import { welcomeEmail } from "./emails";

/** Sent when the agency is created (onboarding step 2). Never throws, so signing up never fails over an email. */
export async function sendWelcomeEmail(
  input: { to: string; agencyId: string },
  send: typeof sendEmail = sendEmail,
): Promise<SendEmailResult | null> {
  try {
    const result = await send(welcomeEmail(input));
    if (result.status === "failed") console.error(`welcome email failed for agency ${input.agencyId}: ${result.error}`);
    return result;
  } catch (error) {
    console.error(`welcome email failed for agency ${input.agencyId}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}
