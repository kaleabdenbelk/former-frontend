import { apiFetch, jsonInit } from "./client";
import type { FieldPayload } from "./mappers";
import type { CollectionDto, CollectionStatus, FieldDto } from "./types";

/* ---------- collections ---------- */

export async function listCollections(projectId: string): Promise<CollectionDto[]> {
  const res = await apiFetch<{ collections: CollectionDto[] }>(
    `/projects/${projectId}/collections`,
  );
  return res.collections;
}

export async function createCollection(
  projectId: string,
  input: { name: string; description?: string | null; status?: CollectionStatus },
): Promise<CollectionDto> {
  return apiFetch<CollectionDto>(
    `/projects/${projectId}/collections`,
    jsonInit("POST", input),
  );
}

export async function updateCollection(
  projectId: string,
  collectionId: string,
  patch: { name?: string; description?: string | null; status?: CollectionStatus },
): Promise<CollectionDto> {
  return apiFetch<CollectionDto>(
    `/projects/${projectId}/collections/${collectionId}`,
    jsonInit("PATCH", patch),
  );
}

export async function deleteCollection(
  projectId: string,
  collectionId: string,
): Promise<void> {
  await apiFetch<void>(
    `/projects/${projectId}/collections/${collectionId}`,
    { method: "DELETE" },
  );
}

/* ---------- fields ---------- */

export async function listFields(
  projectId: string,
  collectionId: string,
): Promise<FieldDto[]> {
  const res = await apiFetch<{ fields: FieldDto[] }>(
    `/projects/${projectId}/collections/${collectionId}/fields`,
  );
  return res.fields;
}

export async function createField(
  projectId: string,
  collectionId: string,
  input: FieldPayload,
): Promise<FieldDto> {
  return apiFetch<FieldDto>(
    `/projects/${projectId}/collections/${collectionId}/fields`,
    jsonInit("POST", input),
  );
}

export async function updateField(
  projectId: string,
  collectionId: string,
  fieldId: string,
  patch: Partial<FieldPayload>,
): Promise<FieldDto> {
  return apiFetch<FieldDto>(
    `/projects/${projectId}/collections/${collectionId}/fields/${fieldId}`,
    jsonInit("PATCH", patch),
  );
}

export async function deleteField(
  projectId: string,
  collectionId: string,
  fieldId: string,
): Promise<void> {
  await apiFetch<void>(
    `/projects/${projectId}/collections/${collectionId}/fields/${fieldId}`,
    { method: "DELETE" },
  );
}

export async function reorderFields(
  projectId: string,
  collectionId: string,
  fieldIds: string[],
): Promise<FieldDto[]> {
  const res = await apiFetch<{ fields: FieldDto[] }>(
    `/projects/${projectId}/collections/${collectionId}/fields/reorder`,
    jsonInit("PATCH", { fieldIds }),
  );
  return res.fields;
}

/* ---------- allowed origins ---------- */

export async function listOrigins(
  projectId: string,
  collectionId: string,
): Promise<string[]> {
  const res = await apiFetch<{ origins: string[] }>(
    `/projects/${projectId}/collections/${collectionId}/origins`,
  );
  return res.origins;
}

export async function addOrigin(
  projectId: string,
  collectionId: string,
  origin: string,
): Promise<string> {
  const res = await apiFetch<{ origin: string }>(
    `/projects/${projectId}/collections/${collectionId}/origins`,
    jsonInit("POST", { origin }),
  );
  return res.origin;
}

export async function removeOrigin(
  projectId: string,
  collectionId: string,
  origin: string,
): Promise<void> {
  await apiFetch<void>(
    `/projects/${projectId}/collections/${collectionId}/origins/${encodeURIComponent(origin)}`,
    { method: "DELETE" },
  );
}
