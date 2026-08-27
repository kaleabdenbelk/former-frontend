"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DataStoreContext, type DataStore } from "@/lib/store";
import type { Collection, DataState, Field, Submission } from "@/lib/types";
import { setUnauthorizedHandler } from "@/lib/api/client";
import { currentUser, signInEmail, signOutRequest, signUpEmail } from "@/lib/api/auth";
import {
  createProject as apiCreateProject,
  deleteProject as apiDeleteProject,
  listProjects,
  updateProject as apiUpdateProject,
} from "@/lib/api/projects";
import {
  createCollection as apiCreateCollection,
  createField,
  deleteCollection as apiDeleteCollection,
  listCollections,
  listFields,
  updateCollection as apiUpdateCollection,
} from "@/lib/api/collections";
import { deleteSubmission, listSubmissions } from "@/lib/api/submissions";
import {
  fromBackendCollection,
  fromBackendField,
  fromBackendProject,
  fromBackendSubmission,
  toBackendFieldInput,
  toBackendWebsite,
} from "@/lib/api/mappers";
import type { SessionUser } from "@/lib/api/types";

/** Client-side read/unread tracking — the backend has no read flag. */
const READ_KEY = "dfp.read.v1";
/** The API caps submission pages at 100; load the first page per collection. */
const SUBMISSION_PAGE_LIMIT = 100;

const EMPTY_STATE: DataState = { projects: [], collections: [], submissions: [] };

export function DataStoreProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<DataState>(EMPTY_STATE);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(() => {
    // Client-side read/unread tracking persisted in localStorage.
    if (typeof window === "undefined") return new Set<string>();
    try {
      const raw = window.localStorage.getItem(READ_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          return new Set(parsed.filter((x): x is string => typeof x === "string"));
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
    return new Set<string>();
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const readIdsRef = useRef<ReadonlySet<string>>(new Set());
  useEffect(() => {
    readIdsRef.current = readIds;
  }, [readIds]);

  /* ---------- read/unread persistence (client-side only) ---------- */

  useEffect(() => {
    try {
      window.localStorage.setItem(READ_KEY, JSON.stringify([...readIds]));
    } catch {
      /* storage full or unavailable */
    }
  }, [readIds]);

  /* ---------- loading ---------- */

  const loadAll = useCallback(async () => {
    const projects = await listProjects();
    const projectDtos = projects.map(fromBackendProject);
    const collections: Collection[] = [];
    const submissions: Submission[] = [];

    await Promise.all(
      projects.map(async (p) => {
        const collectionDtos = await listCollections(p.id);
        const mapped = await Promise.all(
          collectionDtos.map(async (cd) => {
            const collection = fromBackendCollection(cd);
            const fieldDtos = await listFields(p.id, cd.id);
            collection.fields = fieldDtos.map(fromBackendField);
            const page = await listSubmissions(p.id, cd.id, {
              limit: SUBMISSION_PAGE_LIMIT,
            });
            for (const sdto of page.submissions) {
              submissions.push(
                fromBackendSubmission(sdto, p.id, readIdsRef.current.has(sdto.id)),
              );
            }
            return collection;
          }),
        );
        collections.push(...mapped);
      }),
    );

    setState({ projects: projectDtos, collections, submissions });
  }, []);

  const refresh = useCallback<DataStore["refresh"]>(async () => {
    await loadAll();
  }, [loadAll]);

  /* ---------- boot: session + initial load ---------- */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await currentUser();
        if (cancelled) return;
        if (u) {
          setUser(u);
          try {
            await loadAll();
          } catch {
            // The 401 handler redirects on session expiry; otherwise the page
            // shows an error state via its own calls.
          }
        }
      } catch {
        // Network/auth-service error — treat as signed out rather than crash.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAll]);

  /* ---------- global session-expiry handler ---------- */

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setState(EMPTY_STATE);
      if (typeof window !== "undefined") {
        router.replace("/sign-in");
      }
    });
    return () => setUnauthorizedHandler(null);
  }, [router]);

  /* ---------- auth ---------- */

  const signIn = useCallback<DataStore["signIn"]>(
    async (input) => {
      await signInEmail(input);
      const u = await currentUser();
      if (!u) throw new Error("Signed in, but no session was returned. Please try again.");
      setUser(u);
      await loadAll();
    },
    [loadAll],
  );

  const signUp = useCallback<DataStore["signUp"]>(
    async (input) => {
      // The backend's Better Auth requires `name` on sign-up; default an empty
      // one to the email local part so the field stays optional in the UI.
      await signUpEmail({
        name: input.name?.trim() || input.email.split("@")[0] || "user",
        email: input.email,
        password: input.password,
      });
      // Better Auth signs the user in on sign-up; fall back to a manual
      // sign-in in case the session cookie wasn't set.
      let u = await currentUser();
      if (!u) {
        await signInEmail({ email: input.email, password: input.password });
        u = await currentUser();
      }
      if (!u) throw new Error("Account created, but signing in failed. Please sign in.");
      setUser(u);
      await loadAll();
    },
    [loadAll],
  );

  const signOut = useCallback<DataStore["signOut"]>(async () => {
    try {
      await signOutRequest();
    } catch {
      // Even if the server call fails, clear the client session.
    }
    setUser(null);
    setState(EMPTY_STATE);
  }, []);

  /* ---------- projects ---------- */

  const createProject = useCallback<DataStore["createProject"]>(async (input) => {
    const dto = await apiCreateProject({
      name: input.name,
      website: toBackendWebsite(input.domain),
    });
    const project = fromBackendProject(dto);
    setState((s) => ({ ...s, projects: [project, ...s.projects] }));
    return project;
  }, []);

  const updateProject = useCallback<DataStore["updateProject"]>(async (id, patch) => {
    const dto = await apiUpdateProject(id, {
      name: patch.name,
      website: patch.domain === undefined ? undefined : toBackendWebsite(patch.domain),
    });
    const updated = fromBackendProject(dto);
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) => (p.id === id ? updated : p)),
    }));
  }, []);

  const deleteProject = useCallback<DataStore["deleteProject"]>(async (id) => {
    await apiDeleteProject(id);
    setState((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      collections: s.collections.filter((c) => c.projectId !== id),
      submissions: s.submissions.filter((x) => x.projectId !== id),
    }));
  }, []);

  /* ---------- collections ---------- */

  const createCollection = useCallback<DataStore["createCollection"]>(async (input) => {
    const dto = await apiCreateCollection(input.projectId, {
      name: input.name,
      description: input.description || null,
    });
    const collection = fromBackendCollection(dto);
    // Fields are created one at a time; `position` follows creation order.
    const fields: Field[] = [];
    for (const f of input.fields) {
      const fdto = await createField(input.projectId, dto.id, toBackendFieldInput(f));
      fields.push(fromBackendField(fdto));
    }
    collection.fields = fields;
    setState((s) => ({ ...s, collections: [collection, ...s.collections] }));
    return collection;
  }, []);

  const updateCollection = useCallback<DataStore["updateCollection"]>(async (id, patch) => {
    const current = stateRef.current.collections.find((c) => c.id === id);
    if (!current) return;
    await apiUpdateCollection(current.projectId, id, {
      name: patch.name,
      description: patch.description === undefined ? undefined : patch.description || null,
      status: patch.status,
    });
    setState((s) => ({
      ...s,
      collections: s.collections.map((c) =>
        c.id === id
          ? {
              ...c,
              name: patch.name ?? c.name,
              description:
                patch.description === undefined ? c.description : patch.description || undefined,
              status: patch.status ?? c.status,
            }
          : c,
      ),
    }));
  }, []);

  const setCollectionFields = useCallback<DataStore["setCollectionFields"]>(
    (collectionId, fields) => {
      setState((s) => ({
        ...s,
        collections: s.collections.map((c) =>
          c.id === collectionId ? { ...c, fields } : c,
        ),
      }));
    },
    [],
  );

  const deleteCollection = useCallback<DataStore["deleteCollection"]>(async (id) => {
    const current = stateRef.current.collections.find((c) => c.id === id);
    if (!current) return;
    await apiDeleteCollection(current.projectId, id);
    setState((s) => ({
      ...s,
      collections: s.collections.filter((c) => c.id !== id),
      submissions: s.submissions.filter((x) => x.collectionId !== id),
    }));
  }, []);

  /* ---------- submissions ---------- */

  const updateSubmission = useCallback<DataStore["updateSubmission"]>((id, patch) => {
    if (patch.read !== undefined) {
      setReadIds((prev) => {
        const next = new Set(prev);
        if (patch.read) next.add(id);
        else next.delete(id);
        return next;
      });
    }
    setState((s) => ({
      ...s,
      submissions: s.submissions.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  }, []);

  const deleteSubmissions = useCallback<DataStore["deleteSubmissions"]>(async (ids) => {
    const idSet = new Set(ids);
    const targets = stateRef.current.submissions.filter((x) => idSet.has(x.id));
    const collectionById = new Map(
      stateRef.current.collections.map((c) => [c.id, c] as const),
    );
    await Promise.all(
      targets.map((t) => {
        const collection = collectionById.get(t.collectionId);
        if (!collection) return Promise.resolve();
        return deleteSubmission(collection.projectId, t.collectionId, t.id);
      }),
    );
    setReadIds((prev) => {
      const next = new Set(prev);
      ids.forEach((i) => next.delete(i));
      return next;
    });
    setState((s) => ({
      ...s,
      submissions: s.submissions.filter((x) => !idSet.has(x.id)),
    }));
  }, []);

  const value = useMemo<DataStore>(
    () => ({
      ...state,
      ready,
      user,
      signIn,
      signUp,
      signOut,
      refresh,
      createProject,
      updateProject,
      deleteProject,
      createCollection,
      updateCollection,
      setCollectionFields,
      deleteCollection,
      updateSubmission,
      deleteSubmissions,
    }),
    [
      state,
      ready,
      user,
      signIn,
      signUp,
      signOut,
      refresh,
      createProject,
      updateProject,
      deleteProject,
      createCollection,
      updateCollection,
      setCollectionFields,
      deleteCollection,
      updateSubmission,
      deleteSubmissions,
    ],
  );

  return <DataStoreContext.Provider value={value}>{children}</DataStoreContext.Provider>;
}
