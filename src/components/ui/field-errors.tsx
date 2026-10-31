"use client";

import { useState } from "react";

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

/** Red border and ring for native selects and textareas; Input already has it. */
export const INVALID_CLASS = "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";

/**
 * One pattern for field errors (UI-036): the message sits under its field, the field gets aria-invalid and
 * aria-describedby, and focus moves to the first bad field. A form-level alert is only for server errors.
 */
export function useFieldErrors<K extends string>(prefix: string) {
  const [errors, setErrorState] = useState<FieldErrors<K>>({});
  const idOf = (key: K) => `${prefix}-${key}-error`;

  /** Shows the errors and focuses the first bad field (list keys in form order). Returns true when there are any. */
  function show(next: FieldErrors<K>) {
    setErrorState(next);
    const first = (Object.keys(next) as K[]).find((key) => next[key]);
    if (first) {
      // After the re-render, when the field carries aria-invalid and points at its message.
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(`[aria-invalid="true"][aria-describedby~="${idOf(first)}"]`)?.focus(),
      );
    }
    return first !== undefined;
  }

  /** Drops a field's message once the user edits it. */
  function clear(key: K) {
    setErrorState((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }

  /** aria props for the field; pass the id of an existing hint to keep it described too. */
  function fieldProps(key: K, hintId?: string) {
    const described = [hintId, errors[key] ? idOf(key) : undefined].filter(Boolean).join(" ");
    return { "aria-invalid": errors[key] ? true : undefined, "aria-describedby": described || undefined };
  }

  return { errors, show, clear, fieldProps, idOf };
}

export function FieldMessage({ id, message }: { id: string; message?: string | null }) {
  if (!message) return null;
  return (
    <p id={id} className="text-[13px] text-low-text">
      {message}
    </p>
  );
}
