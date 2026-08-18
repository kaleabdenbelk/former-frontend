import type {
  BackendFieldType,
  CollectionDto,
  CollectionStatus,
  FieldDto,
  ProjectDto,
  SubmissionDto,
} from "./types";
import type { Collection, Field, FieldType, Project, Submission } from "@/lib/types";

export const FIELD_TYPE_TO_BACKEND: Record<FieldType, BackendFieldType> = {
  text: "TEXT",
  email: "EMAIL",
  phone: "PHONE",
  number: "NUMBER",
  longtext: "LONG_TEXT",
  select: "SELECT",
  multiselect: "MULTI_SELECT",
  checkbox: "CHECKBOX",
  date: "DATE",
  url: "URL",
};

export const FIELD_TYPE_FROM_BACKEND: Record<BackendFieldType, FieldType> = {
  TEXT: "text",
  EMAIL: "email",
  PHONE: "phone",
  NUMBER: "number",
  LONG_TEXT: "longtext",
  SELECT: "select",
  MULTI_SELECT: "multiselect",
  CHECKBOX: "checkbox",
  DATE: "date",
  URL: "url",
};

/** The backend requires an http(s) URL for `website`; prepend https:// if missing. */
export function toBackendWebsite(domain: string | undefined | null): string | null {
  const value = (domain ?? "").trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

/** Display form: strip the scheme for a clean "domain" look. */
export function fromBackendWebsite(website: string | null | undefined): string | undefined {
  const value = website ?? "";
  if (!value) return undefined;
  return value.replace(/^https?:\/\//i, "");
}

export function fromBackendProject(dto: ProjectDto): Project {
  return {
    id: dto.id,
    name: dto.name,
    domain: fromBackendWebsite(dto.website),
    createdAt: dto.createdAt,
  };
}

export function fromBackendCollection(dto: CollectionDto): Collection {
  return {
    id: dto.id,
    projectId: dto.projectId,
    publicId: dto.publicId,
    name: dto.name,
    description: dto.description ?? undefined,
    status: dto.status,
    fields: [],
    createdAt: dto.createdAt,
  };
}

export function fromBackendField(dto: FieldDto): Field {
  const field: Field = {
    id: dto.id,
    name: dto.name,
    type: FIELD_TYPE_FROM_BACKEND[dto.type],
    label: dto.label ?? dto.name,
    required: dto.required,
  };
  if (dto.type === "SELECT" || dto.type === "MULTI_SELECT") {
    field.options = dto.config?.options ?? [];
  }
  if (dto.type === "NUMBER") {
    field.min = dto.config?.min ?? undefined;
    field.max = dto.config?.max ?? undefined;
  }
  return field;
}

export interface FieldCreateInput {
  name: string;
  label?: string | null;
  type: FieldType;
  required?: boolean;
  options?: string[] | undefined;
  min?: number | null | undefined;
  max?: number | null | undefined;
}

/** Backend field create/update payload (what the API accepts). */
export interface FieldPayload {
  name: string;
  label: string | null;
  type: BackendFieldType;
  required: boolean;
  config: { options?: string[]; min?: number; max?: number } | null;
}

/** Frontend field → backend field create/update payload. */
export function toBackendFieldInput(field: FieldCreateInput): FieldPayload {
  const { name, label, type, required } = field;
  let config: { options?: string[]; min?: number; max?: number } | null = null;
  if (type === "select" || type === "multiselect") {
    config = { options: field.options ?? [] };
  } else if (type === "number") {
    config = {};
    if (field.min !== undefined && field.min !== null) config.min = field.min;
    if (field.max !== undefined && field.max !== null) config.max = field.max;
  }
  return {
    name: name.trim(),
    label: label?.trim() || null,
    type: FIELD_TYPE_TO_BACKEND[type],
    required: required ?? false,
    config,
  };
}

export function fromBackendSubmission(
  dto: SubmissionDto,
  projectId: string,
  read = false,
): Submission {
  return {
    id: dto.id,
    collectionId: dto.collectionId,
    projectId,
    data: dto.data as Submission["data"],
    read,
    createdAt: dto.createdAt,
  };
}

/** Backend status → frontend status (same values today; kept for symmetry). */
export function toBackendStatus(status: CollectionStatus): CollectionStatus {
  return status;
}
