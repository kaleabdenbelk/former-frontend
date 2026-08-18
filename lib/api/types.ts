/**
 * Backend DTOs — the shapes the NestJS API returns (see docs/API.md in the
 * repo root). Frontend types in `lib/types.ts` are derived from these via the
 * mappers in `lib/api/mappers.ts`.
 */

export type BackendFieldType =
  | "TEXT"
  | "EMAIL"
  | "PHONE"
  | "NUMBER"
  | "LONG_TEXT"
  | "SELECT"
  | "MULTI_SELECT"
  | "CHECKBOX"
  | "DATE"
  | "URL";

export type CollectionStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export interface FieldConfig {
  options?: string[];
  min?: number;
  max?: number;
}

export interface ProjectDto {
  id: string;
  name: string;
  website: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionDto {
  id: string;
  projectId: string;
  publicId: string;
  name: string;
  description: string | null;
  status: CollectionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FieldDto {
  id: string;
  collectionId: string;
  name: string;
  label: string | null;
  type: BackendFieldType;
  required: boolean;
  position: number;
  config: FieldConfig | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionDto {
  id: string;
  collectionId: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface ApiKeyDto {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
}

export interface ApiKeyCreatedDto extends ApiKeyDto {
  /** The raw secret — returned exactly once, at creation. */
  secret: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

export interface BetterAuthSessionResponse {
  session: {
    id: string;
    userId: string;
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  user: SessionUser | null;
}

export interface PaginationDto {
  total: number;
  limit: number;
  offset: number;
}

export interface SubmissionListDto {
  submissions: SubmissionDto[];
  pagination: PaginationDto;
}
