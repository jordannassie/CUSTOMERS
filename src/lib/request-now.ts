import { cache } from "react";

/** One "now" per server request, so every part of a page scores the same moment and shares cached reads. */
export const requestNow = cache(() => new Date());
