// Test mode (D-61): the check's error when a test business has no sample answers of its own trade and city
// (BUG-072). The scan status turns it into the message the screen shows.
export const NO_SAMPLE_ANSWERS = "No sample answers for this kind of business";

/** A test business's model has no recorded answers at all (an empty or partial fixtures folder). */
export const noRecordedAnswers = (provider: string) => `No recorded ${provider} answers`;

/** A test scan's check that failed for want of sample answers: trying again finds none either. */
export function isMissingSample(error: string): boolean {
  return error.includes(NO_SAMPLE_ANSWERS) || /No recorded \w+ answers/.test(error);
}
