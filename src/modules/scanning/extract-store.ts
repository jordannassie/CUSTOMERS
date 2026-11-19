import "server-only";
import { saveExtractedNames } from "./dal";
import { toStoredExtraction, type Extraction } from "./extract";

// Kept apart from extract.ts so the eval can run the extractor without database settings.

/** Writes an extraction onto the cached answer it came from (ai_answer_cache.extracted_names, B-23): `cachedAt` is its created_at. */
export async function storeExtraction(cacheKey: string, cachedAt: string, extraction: Extraction): Promise<void> {
  await saveExtractedNames(cacheKey, cachedAt, toStoredExtraction(extraction));
}
