import type { Collection, DataState, Field, Project, Submission } from "./types";

/** Deterministic PRNG so server and client render identical mock data. */
function makeRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const rand = makeRandom(20260816);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoAgo(daysAgo: number, index: number) {
  const d = startOfToday();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(8 + (index % 11), (index * 7) % 60, 0, 0);
  return d.toISOString();
}

const f = (
  id: string,
  type: Field["type"],
  label: string,
  extra: Partial<Field> = {},
): Field => ({ id, type, label, required: false, ...extra });

const projects: Project[] = [
  {
    id: "prj_portfolio",
    name: "My Portfolio",
    domain: "kaleab.dev",
    createdAt: isoAgo(210, 1),
  },
  {
    id: "prj_ledgerbase",
    name: "Ledgerbase",
    domain: "ledgerbase.io",
    createdAt: isoAgo(140, 2),
  },
  {
    id: "prj_northwind",
    name: "Northwind Studio",
    domain: "northwind.studio",
    createdAt: isoAgo(64, 3),
  },
];

const collections: Collection[] = [
  {
    id: "col_contact",
    projectId: "prj_portfolio",
    name: "Contact requests",
    description: "Messages sent from the contact page.",
    archived: false,
    notifyEmail: "hello@kaleab.dev",
    createdAt: isoAgo(200, 4),
    fields: [
      f("fld_name", "text", "Full name", { required: true, placeholder: "Ada Lovelace" }),
      f("fld_email", "email", "Email", { required: true, placeholder: "you@company.com" }),
      f("fld_budget", "select", "Budget", {
        options: ["< $5k", "$5k – $15k", "$15k – $50k", "$50k+"],
      }),
      f("fld_message", "longtext", "Message", {
        required: true,
        description: "What are you trying to build?",
      }),
    ],
  },
  {
    id: "col_newsletter",
    projectId: "prj_portfolio",
    name: "Newsletter signups",
    description: "Footer email capture.",
    archived: false,
    createdAt: isoAgo(150, 5),
    fields: [
      f("fld_ns_email", "email", "Email", { required: true, placeholder: "you@company.com" }),
      f("fld_ns_consent", "checkbox", "Marketing consent", { defaultValue: false }),
    ],
  },
  {
    id: "col_beta",
    projectId: "prj_ledgerbase",
    name: "Beta waitlist",
    description: "Early access requests for the private beta.",
    archived: false,
    notifyEmail: "beta@ledgerbase.io",
    createdAt: isoAgo(130, 6),
    fields: [
      f("fld_bw_email", "email", "Work email", { required: true }),
      f("fld_bw_company", "text", "Company", { placeholder: "Acme Inc." }),
      f("fld_bw_size", "select", "Team size", {
        required: true,
        options: ["1–5", "6–20", "21–100", "100+"],
      }),
      f("fld_bw_stack", "multiselect", "Stack", {
        options: ["Postgres", "MySQL", "Snowflake", "BigQuery", "SQLite"],
      }),
      f("fld_bw_site", "url", "Website"),
    ],
  },
  {
    id: "col_bugs",
    projectId: "prj_ledgerbase",
    name: "Bug reports",
    description: "In-app report widget.",
    archived: false,
    createdAt: isoAgo(90, 7),
    fields: [
      f("fld_br_title", "text", "Title", { required: true }),
      f("fld_br_severity", "select", "Severity", {
        required: true,
        options: ["Low", "Medium", "High", "Critical"],
        defaultValue: "Medium",
      }),
      f("fld_br_steps", "longtext", "Steps to reproduce", { required: true }),
      f("fld_br_version", "text", "App version", { placeholder: "1.4.2" }),
      f("fld_br_email", "email", "Reporter email"),
    ],
  },
  {
    id: "col_legacy",
    projectId: "prj_ledgerbase",
    name: "2024 survey",
    description: "Archived research survey.",
    archived: true,
    createdAt: isoAgo(125, 8),
    fields: [
      f("fld_sv_email", "email", "Email"),
      f("fld_sv_score", "number", "Score", { description: "0 – 10" }),
    ],
  },
  {
    id: "col_booking",
    projectId: "prj_northwind",
    name: "Project inquiries",
    description: "Studio booking requests.",
    archived: false,
    notifyEmail: "studio@northwind.studio",
    createdAt: isoAgo(60, 9),
    fields: [
      f("fld_pi_name", "text", "Name", { required: true }),
      f("fld_pi_email", "email", "Email", { required: true }),
      f("fld_pi_phone", "phone", "Phone", { placeholder: "+254 700 000 000" }),
      f("fld_pi_start", "date", "Preferred start date"),
      f("fld_pi_services", "multiselect", "Services", {
        options: ["Branding", "Web design", "Motion", "Photography"],
      }),
      f("fld_pi_budget", "number", "Budget (USD)"),
      f("fld_pi_brief", "longtext", "Brief"),
    ],
  },
];

const firstNames = [
  "Ada", "Malik", "Nadia", "Tom", "Sara", "Jonas", "Amina", "Peter",
  "Lena", "Kofi", "Mei", "Owen", "Ruth", "Ivan", "Zara",
];
const lastNames = [
  "Lovelace", "Ochieng", "Farah", "Berger", "Kim", "Nyathi", "Silva",
  "Weber", "Hassan", "Owusu", "Tanaka", "Fisher",
];
const companies = ["Acme Inc.", "Kestrel Labs", "Northpoint", "Fable", "Cobalt", "Rivet", "Untitled Co."];
const messages = [
  "We need a marketing site rebuilt on a modern stack before Q4.",
  "Loved your last project. Do you take on retainer work?",
  "Looking for help migrating an old WordPress site.",
  "Can you scope a two-week design sprint for our dashboard?",
  "We have designs ready and need implementation only.",
];
const bugTitles = [
  "CSV export drops the last row",
  "Timezone off by one on submission list",
  "Session expires while typing",
  "Chart tooltip renders behind sidebar",
  "Duplicate webhook deliveries",
];

let counter = 0;
function submissionId() {
  counter += 1;
  return `sub_${counter.toString().padStart(4, "0")}`;
}

function makeValues(collection: Collection): Record<string, import("./types").FieldValue> {
  const name = `${pick(firstNames)} ${pick(lastNames)}`;
  const email = `${name.split(" ")[0]!.toLowerCase()}@${pick([
    "gmail.com", "acme.co", "kestrel.dev", "northpoint.io",
  ])}`;
  const out: Record<string, import("./types").FieldValue> = {};
  for (const field of collection.fields) {
    // Leave some optional fields empty so "fields completed" is meaningful.
    if (!field.required && rand() < 0.3) continue;
    switch (field.type) {
      case "email":
        out[field.id] = email;
        break;
      case "phone":
        out[field.id] = `+254 7${Math.floor(rand() * 90 + 10)} ${Math.floor(rand() * 900 + 100)} ${Math.floor(rand() * 900 + 100)}`;
        break;
      case "number":
        out[field.id] = Math.floor(rand() * 40) * 250 + 500;
        break;
      case "longtext":
        out[field.id] = collection.id === "col_bugs" ? "1. Open the dashboard\n2. Export CSV\n3. Compare row counts" : pick(messages);
        break;
      case "select":
        out[field.id] = pick(field.options ?? ["Option"]);
        break;
      case "multiselect": {
        const opts = field.options ?? [];
        out[field.id] = opts.filter(() => rand() < 0.4).slice(0, 3);
        break;
      }
      case "checkbox":
        out[field.id] = rand() < 0.6;
        break;
      case "date": {
        const d = new Date();
        d.setDate(d.getDate() + Math.floor(rand() * 60));
        out[field.id] = d.toISOString().slice(0, 10);
        break;
      }
      case "url":
        out[field.id] = `https://${pick(["acme.co", "kestrel.dev", "northpoint.io"])}`;
        break;
      default:
        out[field.id] =
          field.label.toLowerCase().includes("company")
            ? pick(companies)
            : collection.id === "col_bugs" && field.id === "fld_br_title"
              ? pick(bugTitles)
              : field.label.toLowerCase().includes("version")
                ? `1.${Math.floor(rand() * 6)}.${Math.floor(rand() * 9)}`
                : name;
    }
  }
  return out;
}

const volume: Record<string, number> = {
  col_contact: 64,
  col_newsletter: 118,
  col_beta: 152,
  col_bugs: 43,
  col_legacy: 21,
  col_booking: 37,
};

const submissions: Submission[] = [];
for (const collection of collections) {
  const total = volume[collection.id] ?? 20;
  for (let i = 0; i < total; i += 1) {
    const daysAgo = collection.archived
      ? 40 + Math.floor(rand() * 60)
      : Math.floor(Math.pow(rand(), 1.6) * 45);
    submissions.push({
      id: submissionId(),
      collectionId: collection.id,
      projectId: collection.projectId,
      values: makeValues(collection),
      read: daysAgo > 4 ? rand() < 0.85 : rand() < 0.25,
      createdAt: isoAgo(daysAgo, i),
    });
  }
}

submissions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export function createInitialData(): DataState {
  return {
    projects: structuredClone(projects),
    collections: structuredClone(collections),
    submissions: structuredClone(submissions),
  };
}
