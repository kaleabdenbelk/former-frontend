import { createContext, useContext } from "react";
import type { Collection, DataState, Field, Project, Submission } from "./types";
import type { SessionUser } from "./api/types";

export interface DataStore extends DataState {
  ready: boolean;
  /** Current signed-in user, or null when signed out. */
  user: SessionUser | null;
  // auth
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signUp: (input: { name?: string; email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  /** Reload projects/collections/fields/submissions from the API. */
  refresh: () => Promise<void>;
  // projects
  createProject: (input: { name: string; domain?: string | undefined }) => Promise<Project>;
  updateProject: (id: string, patch: Partial<Omit<Project, "id" | "createdAt">>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  // collections
  createCollection: (input: {
    projectId: string;
    name: string;
    description?: string | undefined;
    fields: Field[];
  }) => Promise<Collection>;
  updateCollection: (
    id: string,
    patch: Partial<Pick<Collection, "name" | "description" | "status">>,
  ) => Promise<void>;
  /** Replace a collection's joined fields locally (after field CRUD). */
  setCollectionFields: (collectionId: string, fields: Field[]) => void;
  deleteCollection: (id: string) => Promise<void>;
  // submissions
  updateSubmission: (id: string, patch: Partial<Pick<Submission, "read">>) => void;
  deleteSubmissions: (ids: string[]) => Promise<void>;
}

export const DataStoreContext = createContext<DataStore | null>(null);

export function useStore(): DataStore {
  const ctx = useContext(DataStoreContext);
  if (!ctx) throw new Error("useStore must be used inside <DataStoreProvider>");
  return ctx;
}

/* ---------- derived selectors (pure) ---------- */

export function projectCollections(store: DataState, projectId: string) {
  return store.collections.filter((c) => c.projectId === projectId);
}

export function projectSubmissions(store: DataState, projectId: string) {
  return store.submissions.filter((s) => s.projectId === projectId);
}

export function collectionSubmissions(store: DataState, collectionId: string) {
  return store.submissions.filter((s) => s.collectionId === collectionId);
}

export function lastActivity(subs: Submission[]): string | undefined {
  return subs.reduce<string | undefined>(
    (acc, s) => (!acc || s.createdAt > acc ? s.createdAt : acc),
    undefined,
  );
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function countToday(subs: Submission[]) {
  const t = startOfDay().getTime();
  return subs.filter((s) => new Date(s.createdAt).getTime() >= t).length;
}

export function countThisWeek(subs: Submission[]) {
  const d = startOfDay();
  d.setDate(d.getDate() - 6);
  const t = d.getTime();
  return subs.filter((s) => new Date(s.createdAt).getTime() >= t).length;
}

export function dailySeries(subs: Submission[], days = 30) {
  const buckets: { date: string; label: string; count: number }[] = [];
  const index = new Map<string, number>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = startOfDay();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    index.set(key, buckets.length);
    buckets.push({
      date: key,
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      count: 0,
    });
  }
  for (const s of subs) {
    const key = s.createdAt.slice(0, 10);
    const i = index.get(key);
    if (i !== undefined) buckets[i]!.count += 1;
  }
  return buckets;
}

export function averageFieldsCompleted(collection: Collection, subs: Submission[]) {
  if (subs.length === 0) return 0;
  const total = subs.reduce((acc, s) => {
    const filled = collection.fields.filter((field) => {
      const v = s.data[field.name];
      if (v === undefined || v === null || v === "") return false;
      if (Array.isArray(v)) return v.length > 0;
      return true;
    }).length;
    return acc + filled;
  }, 0);
  return Math.round((total / subs.length) * 10) / 10;
}

/* ---------- status helpers ---------- */

export function isArchived(c: Collection) {
  return c.status === "ARCHIVED";
}

export function isPaused(c: Collection) {
  return c.status === "INACTIVE";
}

export function isActive(c: Collection) {
  return c.status === "ACTIVE";
}
