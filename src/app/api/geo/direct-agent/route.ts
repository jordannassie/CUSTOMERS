import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";
import { listConfiguredProviders } from "@/lib/geo/providers";

export async function POST(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let body: { business_id?: unknown; question?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const businessId = typeof body.business_id === "string" ? body.business_id : "";
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 1000) : "";
  if (!businessId || !question) {
    return NextResponse.json({ error: "business_id and question are required." }, { status: 400 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, domain, industry")
    .eq("id", businessId)
    .eq("owner_user_id", user!.id)
    .single();
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  const [{ data: score }, { data: opportunities }, { data: latestRun }] = await Promise.all([
    supabase
      .from("visibility_scores")
      .select("*")
      .eq("business_id", businessId)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("opportunities").select("title, evidence, status, impact").eq("business_id", businessId).eq("status", "open"),
    supabase
      .from("visibility_runs")
      .select("id, provider, status, started_at")
      .eq("business_id", businessId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const evidenceLines: string[] = [];
  if (score) {
    evidenceLines.push(
      `Direct Score: ${score.score}/100 (mention rate ${Math.round((score.mention_rate ?? 0) * 100)}%, ${score.prompts_won}/${score.prompts_tested} prompts won, citation rate ${Math.round((score.citation_rate ?? 0) * 100)}%).`,
    );
  } else {
    evidenceLines.push("No visibility scan has completed yet for this business.");
  }
  if (latestRun) {
    evidenceLines.push(`Latest run: provider=${latestRun.provider}, status=${latestRun.status}, started ${latestRun.started_at}.`);
  }
  if (opportunities && opportunities.length > 0) {
    evidenceLines.push(
      `Open opportunities:\n${opportunities.map((o: { title: string; evidence: string; impact: string }) => `- [${o.impact}] ${o.title}: ${o.evidence}`).join("\n")}`,
    );
  } else {
    evidenceLines.push("No open opportunities on file.");
  }
  const evidence = evidenceLines.join("\n\n");

  const configured = listConfiguredProviders();

  if (configured.length === 0) {
    // Deterministic fallback — no LLM available, so answer only from the raw evidence.
    return NextResponse.json({
      answer:
        `I don't have an AI provider configured to answer open-ended questions yet, but here's what's on file for ${business.name}:\n\n${evidence}`,
      grounded: true,
      providerUsed: null,
    });
  }

  const provider = configured[0];
  const systemPrompt =
    `You are the Direct Agent for ${business.name} (${business.industry ?? "business"}${business.domain ? `, ${business.domain}` : ""}) ` +
    `inside Customers.Direct, an AI search visibility product. Answer the user's question about their AI ` +
    `search visibility using ONLY the evidence below. Clearly distinguish between EVIDENCE (facts pulled ` +
    `directly from stored data) and INFERENCE (your own reasoning about what it might mean) — label which is ` +
    `which. Never invent a reason for a ranking or mention change that isn't supported by the evidence. If the ` +
    `evidence doesn't answer the question, say so plainly instead of guessing.\n\nEVIDENCE:\n${evidence}`;

  try {
    const result = await provider.run(`${systemPrompt}\n\nQUESTION: ${question}`, {
      businessName: business.name,
      domain: business.domain,
      city: null,
      region: null,
      competitorNames: [],
    });
    return NextResponse.json({ answer: result.answerText, grounded: true, providerUsed: provider.id });
  } catch (error) {
    console.error("Direct Agent provider call failed:", error);
    return NextResponse.json({
      answer: `I couldn't reach the AI provider just now. Here's what's on file for ${business.name}:\n\n${evidence}`,
      grounded: true,
      providerUsed: null,
    });
  }
}
