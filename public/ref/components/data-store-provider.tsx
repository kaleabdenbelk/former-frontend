import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createInitialData } from "@/lib/mock-data";
import { DataStoreContext, type DataStore } from "@/lib/store";
import type { Collection, DataState, Field, Project, Submission } from "@/lib/types";

const STORAGE_KEY = "dfp.data.v1";

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function DataStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>(() => createInitialData());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw) as DataState);
    } catch {
      /* ignore corrupt storage */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable */
    }
  }, [state, ready]);

  const createProject = useCallback<DataStore["createProject"]>((input) => {
    const project: Project = {
      id: uid("prj"),
      name: input.name,
      domain: input.domain?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    setState((s) => ({ ...s, projects: [project, ...s.projects] }));
    return project;
  }, []);

  const updateProject = useCallback<DataStore["updateProject"]>((id, patch) => {
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  }, []);

  const duplicateProject = useCallback<DataStore["duplicateProject"]>((id) => {
    let created: Project | undefined;
    setState((s) => {
      const source = s.projects.find((p) => p.id === id);
      if (!source) return s;
      const project: Project = {
        ...source,
        id: uid("prj"),
        name: `${source.name} copy`,
        createdAt: new Date().toISOString(),
      };
      created = project;
      const cols = s.collections
        .filter((c) => c.projectId === id)
        .map((c) => ({ ...c, id: uid("col"), projectId: project.id }));
      return { ...s, projects: [project, ...s.projects], collections: [...s.collections, ...cols] };
    });
    return created;
  }, []);

  const deleteProject = useCallback<DataStore["deleteProject"]>((id) => {
    setState((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      collections: s.collections.filter((c) => c.projectId !== id),
      submissions: s.submissions.filter((x) => x.projectId !== id),
    }));
  }, []);

  const createCollection = useCallback<DataStore["createCollection"]>((input) => {
    const collection: Collection = {
      id: uid("col"),
      projectId: input.projectId,
      name: input.name,
      description: input.description,
      fields: input.fields,
      notifyEmail: input.notifyEmail,
      archived: false,
      createdAt: new Date().toISOString(),
    };
    setState((s) => ({ ...s, collections: [...s.collections, collection] }));
    return collection;
  }, []);

  const updateCollection = useCallback<DataStore["updateCollection"]>((id, patch) => {
    setState((s) => ({
      ...s,
      collections: s.collections.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const duplicateCollection = useCallback<DataStore["duplicateCollection"]>((id) => {
    let created: Collection | undefined;
    setState((s) => {
      const source = s.collections.find((c) => c.id === id);
      if (!source) return s;
      const fields: Field[] = source.fields.map((f) => ({ ...f }));
      created = {
        ...source,
        id: uid("col"),
        name: `${source.name} copy`,
        fields,
        createdAt: new Date().toISOString(),
      };
      return { ...s, collections: [...s.collections, created] };
    });
    return created;
  }, []);

  const deleteCollection = useCallback<DataStore["deleteCollection"]>((id) => {
    setState((s) => ({
      ...s,
      collections: s.collections.filter((c) => c.id !== id),
      submissions: s.submissions.filter((x) => x.collectionId !== id),
    }));
  }, []);

  const updateSubmission = useCallback<DataStore["updateSubmission"]>((id, patch) => {
    setState((s) => ({
      ...s,
      submissions: s.submissions.map((x: Submission) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  }, []);

  const deleteSubmissions = useCallback<DataStore["deleteSubmissions"]>((ids) => {
    const set = new Set(ids);
    setState((s) => ({ ...s, submissions: s.submissions.filter((x) => !set.has(x.id)) }));
  }, []);

  const value = useMemo<DataStore>(
    () => ({
      ...state,
      ready,
      createProject,
      updateProject,
      duplicateProject,
      deleteProject,
      createCollection,
      updateCollection,
      duplicateCollection,
      deleteCollection,
      updateSubmission,
      deleteSubmissions,
    }),
    [
      state,
      ready,
      createProject,
      updateProject,
      duplicateProject,
      deleteProject,
      createCollection,
      updateCollection,
      duplicateCollection,
      deleteCollection,
      updateSubmission,
      deleteSubmissions,
    ],
  );

  return <DataStoreContext.Provider value={value}>{children}</DataStoreContext.Provider>;
}
