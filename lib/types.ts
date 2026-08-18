export type FieldType =
  | "text"
  | "email"
  | "phone"
  | "number"
  | "longtext"
  | "select"
  | "multiselect"
  | "checkbox"
  | "date"
  | "url";

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Text",
  email: "Email",
  phone: "Phone",
  number: "Number",
  longtext: "Long text",
  select: "Select",
  multiselect: "Multi-select",
  checkbox: "Checkbox",
  date: "Date",
  url: "URL",
};

export type FieldValue = string | number | boolean | string[] | null;

/**
 * A collection field. Mirrors the backend `FieldDto` (docs/API.md):
 * - `id` is the backend UUID; `name` is the machine key used in submission
 *   payloads (unique per collection, slug-like).
 * - `label` is display text; empty means "show the name".
 * - `options` (SELECT / MULTI_SELECT) and `min`/`max` (NUMBER) map to the
 *   backend `config`. Description/placeholder/default-value are not part of
 *   the backend schema and are intentionally not modelled here.
 */
export interface Field {
  id: string;
  name: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[] | undefined;
  min?: number | null | undefined;
  max?: number | null | undefined;
}

export type CollectionStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export interface Collection {
  id: string;
  projectId: string;
  /** Public routing identifier for POST /v1/collect/{publicId}. */
  publicId: string;
  name: string;
  description?: string | null | undefined;
  status: CollectionStatus;
  /** Joined from the fields API — the backend never embeds them. */
  fields: Field[];
  createdAt: string;
}

export interface Submission {
  id: string;
  collectionId: string;
  /** Derived from the owning collection (not part of the backend DTO). */
  projectId: string;
  /** Field values keyed by field `name`. */
  data: Record<string, FieldValue>;
  /** Client-side only — the backend has no read flag. */
  read: boolean;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  /** Display form of the backend `website` (scheme stripped). */
  domain?: string | undefined;
  createdAt: string;
}

export interface DataState {
  projects: Project[];
  collections: Collection[];
  submissions: Submission[];
}
