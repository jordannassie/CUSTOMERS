import "server-only";
import { saveExtractedNames } from "./dal";
import { toStoredExtraction, type Extraction } from "./extract";

// Kept apart from extract.ts so the eval can run the extractor without database settings.

/** Writes an extraction onto its cached answer (ai_answer_cache.extracted_names, B-23). */
export async function storeExtraction(cacheKey: string, extraction: Extraction): Promise<void> {
  await saveExtractedNames(cacheKey, toStoredExtraction(extraction));
}
