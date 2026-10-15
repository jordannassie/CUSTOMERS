// Pure: questions that weigh two options instead of asking for a business (question-rules uses it).

// "Which is better for skin rejuvenation, microneedling or laser resurfacing?" and "Is it better to hire an HVAC
// contractor or try a DIY fix?" weigh two treatments or actions, not two businesses, so AI answers them without naming
// any (2026-10-15). A choice between kinds of business ("a dealership service center or an independent shop") still
// asks for one, so it stays.
const BETTER_HEAD = /^\s*(?:(?:which|what|who)(?:'s| is| one is| are)? better|is it better to)\b/i;
const CHOICE = /^(.+?)\s+(?:or|versus|vs\.?)\s+(.+)$/i;
const BUSINESS_WORD =
  /\b(?:clinic|office|practice|dentist|orthodontist|doctor|physician|med ?spa|spa|salon|studio|barber|shop|store|boutique|restaurant|diner|cafe|café|bakery|bar|spot|place|center|centre|chain|franchise|dealership|garage|mechanic|contractor|company|firm|agency|lawyer|attorney|realtor|agent|brokerage|plumber|electrician|technician|provider|specialist|business|team|service)(?:e?s)?\b/i;

/** True for a "which is better, X or Y" question whose two options are not both kinds of business. */
export function comparesOptions(question: string): boolean {
  if (!BETTER_HEAD.test(question)) return false;
  for (const part of question.replace(/[?.!]+\s*$/, "").split(/\s*[,;:]\s*|\s+-\s+/)) {
    const choice = CHOICE.exec(part.trim());
    if (!choice || /^(?:or|versus|vs)\b/i.test(part.trim())) continue;
    return !(BUSINESS_WORD.test(choice[1]) && BUSINESS_WORD.test(choice[2]));
  }
  return false;
}
