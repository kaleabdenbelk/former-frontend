import { apiFetch, jsonInit } from "./client";
import type { ProjectDto } from "./types";

export async function listProjects(): Promise<ProjectDto[]> {
  const res = await apiFetch<{ projects: ProjectDto[] }>("/projects");
  return res.projects;
}

export async function createProject(input: {
  name: string;
  website: string | null;
}): Promise<ProjectDto> {
  return apiFetch<ProjectDto>("/projects", jsonInit("POST", input));
}

export async function updateProject(
  projectId: string,
  patch: { name?: string; website?: string | null },
): Promise<ProjectDto> {
  return apiFetch<ProjectDto>(
    `/projects/${projectId}`,
    jsonInit("PATCH", patch),
  );
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiFetch<void>(`/projects/${projectId}`, { method: "DELETE" });
}
