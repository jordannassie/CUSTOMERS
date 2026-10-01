"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldMessage, useFieldErrors, type FieldErrors } from "@/components/ui/field-errors";

// Field-level errors for the account forms (BUG-F), on the shared UI-036 pattern.

export type Fields<K extends string> = ReturnType<typeof useFieldErrors<K>>;

/** Shows a server error under its field when the action names one, else above the buttons. */
export function showFailure<K extends string>(
  result: { error: string; field?: string },
  fields: Fields<K>,
  keys: readonly K[],
  setError: (message: string) => void,
) {
  const field = keys.find((k) => k === result.field);
  if (field) fields.show({ [field]: result.error } as FieldErrors<K>);
  else setError(result.error);
}

export function PasswordInput<K extends string>(props: {
  name: K;
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  onChange: (v: string) => void;
  fields: Fields<K>;
  hint?: string;
  minLength?: number;
}) {
  const { name, id, fields } = props;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{props.label}</Label>
      <Input
        id={id}
        type="password"
        autoComplete={props.autoComplete}
        minLength={props.minLength}
        required
        value={props.value}
        onChange={(e) => {
          props.onChange(e.target.value);
          fields.clear(name);
        }}
        {...fields.fieldProps(name, props.hint ? `${id}-hint` : undefined)}
      />
      {props.hint && (
        <p id={`${id}-hint`} className="text-xs text-text-hint">
          {props.hint}
        </p>
      )}
      <FieldMessage id={fields.idOf(name)} message={fields.errors[name]} />
    </div>
  );
}
