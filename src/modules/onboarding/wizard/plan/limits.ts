// Why a draft can't move to a plan yet, in words (BUG-244). Pure, so the rule is tested without a database.

type PlanLimits = { name: string; max_competitors: number | null; max_questions: number | null };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** What has to go before the draft can move to this plan, or null when it fits. */
export function overLimit(plan: PlanLimits, competitors: number, questions: number): string | null {
  if (plan.max_competitors !== null && competitors > plan.max_competitors) {
    return `${plan.name} checks up to ${plural(plan.max_competitors, "competitor")} and this business has ${competitors}. Remove ${plural(competitors - plan.max_competitors, "competitor")} on the competitors step to move it to ${plan.name}.`;
  }
  if (plan.max_questions !== null && questions > plan.max_questions) {
    return `${plan.name} checks up to ${plural(plan.max_questions, "question")} and this business has ${questions}. Remove ${plural(questions - plan.max_questions, "question")} on the questions step to move it to ${plan.name}.`;
  }
  return null;
}
