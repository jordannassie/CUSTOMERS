// The one model that grades AI output (MVP_SPEC 25). The grading client is added with the first
// AI-graded suite (B-51); every suite reads the model from here so it is pinned in one place.
export const JUDGE_MODEL = "claude-haiku-4-5";

// Principle 5: a model never grades its own output.
export function assertNotSelfGrading(modelUnderTest: string, judgeModel: string = JUDGE_MODEL): void {
  if (modelUnderTest === judgeModel) {
    throw new Error(`${judgeModel} cannot grade its own output; pick a different judge model.`);
  }
}
