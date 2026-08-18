import type { Field } from "./types";

/** A fresh client-side field with a random id and a placeholder machine key. */
export function newField(): Field {
  return {
    id: `fld_${Math.random().toString(36).slice(2, 10)}`,
    name: "new_field",
    type: "text",
    label: "New field",
    required: false,
  };
}

/**
 * Backend field `name` rules (docs/API.md): slug-like, starts with a letter,
 * letters/numbers/underscores only, 1–100 chars, unique per collection.
 */
const FIELD_NAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{0,99}$/;

/** Derive a machine key from a display label ("Team size" → "team_size"). */
export function toFieldName(label: string): string {
  const base = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+/, "")
    .replace(/_+$/, "");
  return base || "field";
}

/** Make a name unique within a collection ("email" → "email_2", "email_3", …). */
export function uniqueFieldName(name: string, existing: string[]): string {
  if (!existing.includes(name)) return name;
  const base = name.replace(/_\d+$/, "");
  let i = 2;
  while (existing.includes(`${base}_${i}`)) i += 1;
  return `${base}_${i}`;
}

export function isValidFieldName(name: string): boolean {
  return FIELD_NAME_RE.test(name);
}

export interface FieldError {
  index: number;
  message: string;
}

/** Client-side mirror of the backend's per-type validation, for quick feedback. */
export function validateFields(fields: Field[]): FieldError[] {
  const errors: FieldError[] = [];
  const seen = new Set<string>();

  fields.forEach((field, index) => {
    const name = field.name?.trim() ?? "";
    if (!name) {
      errors.push({ index, message: `Field ${index + 1}: a machine key is required.` });
    } else if (!isValidFieldName(name)) {
      errors.push({
        index,
        message: `Field “${field.label || name}”: key must start with a letter and use only letters, numbers and underscores.`,
      });
    } else if (seen.has(name)) {
      errors.push({ index, message: `Field key “${name}” is used more than once.` });
    }
    seen.add(name);

    if (field.type === "select" || field.type === "multiselect") {
      const options = (field.options ?? []).map((o) => o.trim()).filter(Boolean);
      if (options.length === 0) {
        errors.push({
          index,
          message: `Field “${field.label || name}”: ${field.type === "select" ? "Select" : "Multi-select"} fields need at least one option.`,
        });
      }
      if (new Set(options).size !== options.length) {
        errors.push({
          index,
          message: `Field “${field.label || name}”: options must be unique.`,
        });
      }
    }

    if (field.type === "number") {
      if (
        field.min !== undefined &&
        field.min !== null &&
        field.max !== undefined &&
        field.max !== null &&
        field.min > field.max
      ) {
        errors.push({
          index,
          message: `Field “${field.label || name}”: min cannot be greater than max.`,
        });
      }
    }
  });

  return errors;
}
