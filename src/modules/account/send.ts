import "server-only";
import { sendEmail, type SendEmailInput, type SendEmailResult } from "@/modules/email";

/** Sends and logs a deletion email. Never throws: an email problem must not undo or block a deletion. */
export async function sendSafely(
  input: SendEmailInput,
  send: typeof sendEmail = sendEmail,
): Promise<SendEmailResult | null> {
  try {
    const result = await send(input);
    if (result.status === "failed") console.error(`[account] ${input.type} email failed: ${result.error}`);
    return result;
  } catch (error) {
    console.error(`[account] ${input.type} email failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}
