import { apiFetch, jsonInit } from "./client";
import type { ApiKeyCreatedDto, ApiKeyDto } from "./types";

export async function listApiKeys(projectId: string): Promise<ApiKeyDto[]> {
  const res = await apiFetch<{ apiKeys: ApiKeyDto[] }>(
    `/projects/${projectId}/api-keys`,
  );
  return res.apiKeys;
}

export async function createApiKey(
  projectId: string,
  input: { name: string },
): Promise<ApiKeyCreatedDto> {
  return apiFetch<ApiKeyCreatedDto>(
    `/projects/${projectId}/api-keys`,
    jsonInit("POST", input),
  );
}

export async function deleteApiKey(projectId: string, apiKeyId: string): Promise<void> {
  await apiFetch<void>(
    `/projects/${projectId}/api-keys/${apiKeyId}`,
    { method: "DELETE" },
  );
}
