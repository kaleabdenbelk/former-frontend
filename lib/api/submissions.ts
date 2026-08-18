import { apiFetch } from "./client";
import type { SubmissionListDto } from "./types";

export async function listSubmissions(
  projectId: string,
  collectionId: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<SubmissionListDto> {
  const params = new URLSearchParams();
  if (opts.limit !== undefined) params.set("limit", String(opts.limit));
  if (opts.offset !== undefined) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return apiFetch<SubmissionListDto>(
    `/projects/${projectId}/collections/${collectionId}/submissions${qs ? `?${qs}` : ""}`,
  );
}

export async function deleteSubmission(
  projectId: string,
  collectionId: string,
  submissionId: string,
): Promise<void> {
  await apiFetch<void>(
    `/projects/${projectId}/collections/${collectionId}/submissions/${submissionId}`,
    { method: "DELETE" },
  );
}
