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
      ...collection.fields.map((f) => displayValue(f, s.data[f.name])),
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

function snippetControl(field: Field): string {
  const required = field.required ? " required" : "";
  switch (field.type) {
    case "longtext":
      return `    <textarea name="${field.name}"${required}></textarea>`;
    case "select":
      return `    <select name="${field.name}"${required}>
      <option value="">Select…</option>
${(field.options ?? [])
  .map((o) => `      <option value="${o}">${o}</option>`)
  .join("\n")}
    </select>`;
    case "multiselect": {
      const options = field.options ?? [];
      if (options.length === 0) {
        return `    <!-- MULTI_SELECT field “${field.name}” needs at least one option -->`;
      }
      return options
        .map(
          (o) =>
            `    <label><input type="checkbox" name="${field.name}" value="${o}" /> ${o}</label>`,
        )
        .join("\n");
    }
    case "checkbox":
      return `    <label><input type="checkbox" name="${field.name}" value="true" /> Yes</label>`;
    case "email":
      return `    <input type="email" name="${field.name}"${required} />`;
    case "phone":
      return `    <input type="tel" name="${field.name}"${required} />`;
    case "number": {
      const min = field.min !== undefined && field.min !== null ? ` min="${field.min}"` : "";
      const max = field.max !== undefined && field.max !== null ? ` max="${field.max}"` : "";
      return `    <input type="number" name="${field.name}"${min}${max}${required} />`;
    }
    case "date":
      return `    <input type="date" name="${field.name}"${required} />`;
    case "url":
      return `    <input type="url" name="${field.name}"${required} />`;
    default:
      return `    <input type="text" name="${field.name}"${required} />`;
  }
}

/**
 * HTML form + fetch wrapper for POST /v1/collect/{publicId}. The public API is
 * JSON-only, so the snippet collects FormData and posts JSON. Repeating names
 * (MULTI_SELECT checkboxes) are grouped into arrays.
 */
export function buildSnippet(endpoint: string, fields: Field[]): string {
  const formId = "fieldbase-form";
  const body = fields.map((f) => `    <label>${f.label || f.name}\n${snippetControl(f)}\n    </label>`).join("\n");
  return `<form id="${formId}">
${body}
  <button type="submit">Submit</button>
</form>

<script>
  document.getElementById("${formId}").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = {};
    for (const [key, value] of new FormData(form).entries()) {
      if (key in data) {
        data[key] = Array.isArray(data[key]) ? [...data[key], value] : [data[key], value];
      } else {
        data[key] = value;
      }
    }
    const res = await fetch("${endpoint}", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const { error } = await res.json();
      alert(error?.message ?? "Submission failed.");
      return;
    }
    form.reset();
    alert("Thank you!");
  });
</script>`;
}
