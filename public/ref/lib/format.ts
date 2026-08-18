import type { Collection, Field, FieldValue, Submission } from "./types";

export function relativeTime(iso?: string) {
  if (!iso) return "No activity";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function fullTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isEmptyValue(v: FieldValue | undefined) {
  if (v === undefined || v === null || v === "") return true;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export function displayValue(field: Field, v: FieldValue | undefined): string {
  if (isEmptyValue(v)) return "";
  if (field.type === "checkbox") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function toCsv(collection: Collection, subs: Submission[]) {
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const header = ["Submitted", ...collection.fields.map((f) => f.label)].map(escape).join(",");
  const rows = subs.map((s) =>
    [
      new Date(s.createdAt).toISOString(),
      ...collection.fields.map((f) => displayValue(f, s.values[f.id])),
    ]
      .map((v) => escape(String(v)))
      .join(","),
  );
  return [header, ...rows].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
