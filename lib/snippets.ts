import type { Field } from "./types";

export type SnippetKind = "html" | "javascript" | "react" | "nextjs" | "curl";

export const SNIPPET_LABELS: Record<SnippetKind, string> = {
  html: "HTML",
  javascript: "JavaScript",
  react: "React",
  nextjs: "Next.js",
  curl: "cURL",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Return a JSON example object for the collection's fields. */
function examplePayload(fields: Field[]): string {
  const obj: Record<string, unknown> = {};
  for (const f of fields) {
    switch (f.type) {
      case "checkbox":
        obj[f.name] = true;
        break;
      case "number":
        obj[f.name] = 42;
        break;
      case "multiselect":
        obj[f.name] = f.options?.slice(0, 1) ?? ["option"];
        break;
      case "select":
        obj[f.name] = f.options?.[0] ?? "option";
        break;
      default:
        obj[f.name] = `<${f.label || f.name}>`;
    }
  }
  return JSON.stringify(obj, null, 2);
}

/* ------------------------------------------------------------------ */
/*  HTML                                                               */
/* ------------------------------------------------------------------ */

function snippetControl(field: Field): string {
  const req = field.required ? " required" : "";
  switch (field.type) {
    case "longtext":
      return `    <textarea name="${field.name}"${req}></textarea>`;
    case "select":
      return `    <select name="${field.name}"${req}>\n      <option value="">Select…</option>\n${(field.options ?? []).map((o) => `      <option value="${o}">${o}</option>`).join("\n")}\n    </select>`;
    case "multiselect": {
      const opts = field.options ?? [];
      if (opts.length === 0)
        return `    <!-- MULTI_SELECT field "${field.name}" needs at least one option -->`;
      return opts
        .map((o) => `    <label><input type="checkbox" name="${field.name}" value="${o}" /> ${o}</label>`)
        .join("\n");
    }
    case "checkbox":
      return `    <label><input type="checkbox" name="${field.name}" value="true" /> Yes</label>`;
    case "email":
      return `    <input type="email" name="${field.name}"${req} />`;
    case "phone":
      return `    <input type="tel" name="${field.name}"${req} />`;
    case "number": {
      const min = field.min != null ? ` min="${field.min}"` : "";
      const max = field.max != null ? ` max="${field.max}"` : "";
      return `    <input type="number" name="${field.name}"${min}${max}${req} />`;
    }
    case "date":
      return `    <input type="date" name="${field.name}"${req} />`;
    case "url":
      return `    <input type="url" name="${field.name}"${req} />`;
    default:
      return `    <input type="text" name="${field.name}"${req} />`;
  }
}

function buildHtmlSnippet(endpoint: string, fields: Field[]): string {
  const formId = "former-form";
  const body = fields
    .map((f) => `    <label>\n      ${f.label || f.name}\n${snippetControl(f)}\n    </label>`)
    .join("\n\n");
  return `<form id="${formId}">
${body}

  <button type="submit">Submit</button>
</form>

<script>
  document.getElementById("${formId}").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = {};
    for (const [key, value] of new FormData(form).entries()) {
      if (key in data) {
        data[key] = Array.isArray(data[key])
          ? [...data[key], value]
          : [data[key], value];
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
    alert("Submitted!");
  });
</script>`;
}

/* ------------------------------------------------------------------ */
/*  JavaScript (fetch)                                                 */
/* ------------------------------------------------------------------ */

function buildJsSnippet(endpoint: string, fields: Field[]): string {
  const payload = examplePayload(fields);
  return `// Submit a form response to Former
async function submitToFormer(data) {
  const res = await fetch("${endpoint}", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error?.message ?? "Submission failed");
  }

  return res.json();
}

// Example usage:
const payload = ${payload};

submitToFormer(payload)
  .then(() => console.log("Submitted!"))
  .catch((err) => console.error(err.message));`;
}

/* ------------------------------------------------------------------ */
/*  React                                                              */
/* ------------------------------------------------------------------ */

function buildReactSnippet(endpoint: string, fields: Field[]): string {
  const payload = examplePayload(fields);
  return `"use client";

import { useState } from "react";

export function ContactForm() {
  const [status, setStatus] = useState("idle");

  async function handleSubmit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));

    setStatus("sending");

    const res = await fetch("${endpoint}", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const { error } = await res.json();
      setStatus("error");
      alert(error?.message ?? "Submission failed");
      return;
    }

    setStatus("success");
    e.currentTarget.reset();
  }

  if (status === "success") {
    return <p>Thank you!</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Add inputs matching your collection fields */}
${fields.map((f) => `      <label>
        ${f.label || f.name}
        <input name="${f.name}"${f.required ? " required" : ""} />
      </label>`).join("\n")}

      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Submit"}
      </button>
    </form>
  );
}`;
}

/* ------------------------------------------------------------------ */
/*  Next.js (App Router)                                               */
/* ------------------------------------------------------------------ */

function buildNextjsSnippet(endpoint: string, fields: Field[]): string {
  const payload = examplePayload(fields);
  return `"use client";

import { useState } from "react";

/**
 * Client component — submits to the Former public API.
 * The endpoint URL is your collection's ingest URL.
 */
export function FormerForm() {
  const [status, setStatus] = useState("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    setStatus("sending");

    const res = await fetch("${endpoint}", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const { error } = await res.json();
      setStatus("error");
      alert(error?.message ?? "Submission failed");
      return;
    }

    setStatus("success");
    form.reset();
  }

  if (status === "success") {
    return <p>Thank you for your submission!</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
${fields.map((f) => {
  const req = f.required ? " required" : "";
  switch (f.type) {
    case "longtext":
      return `      <label>
        ${f.label || f.name}
        <textarea name="${f.name}"${req} />
      </label>`;
    case "select":
      return `      <label>
        ${f.label || f.name}
        <select name="${f.name}"${req}>
          <option value="">Select…</option>
${(f.options ?? []).map((o) => `          <option value="${o}">${o}</option>`).join("\n")}
        </select>
      </label>`;
    default:
      return `      <label>
        ${f.label || f.name}
        <input type="${f.type === "phone" ? "tel" : f.type}" name="${f.name}"${req} />
      </label>`;
  }
}).join("\n\n")}

      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}`;
}

/* ------------------------------------------------------------------ */
/*  cURL                                                               */
/* ------------------------------------------------------------------ */

function buildCurlSnippet(endpoint: string, fields: Field[]): string {
  const payload = examplePayload(fields);
  return `curl ${endpoint} \\
  -X POST \\
  -H "Content-Type: application/json" \\
  -d '${payload}'`;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function buildSnippet(
  kind: SnippetKind,
  endpoint: string,
  fields: Field[],
): string {
  switch (kind) {
    case "html":
      return buildHtmlSnippet(endpoint, fields);
    case "javascript":
      return buildJsSnippet(endpoint, fields);
    case "react":
      return buildReactSnippet(endpoint, fields);
    case "nextjs":
      return buildNextjsSnippet(endpoint, fields);
    case "curl":
      return buildCurlSnippet(endpoint, fields);
  }
}
