import type { Field } from "./types";

export interface CollectionTemplate {
  id: string;
  name: string;
  description: string;
  collectionName: string;
  fields: Omit<Field, "id" | "name">[];
}

export const COLLECTION_TEMPLATES: CollectionTemplate[] = [
  {
    id: "contact",
    name: "Contact request",
    description: "Name, email and message — the standard contact form.",
    collectionName: "Contact requests",
    fields: [
      { type: "text", label: "Full name", required: true },
      { type: "email", label: "Email", required: true },
      { type: "longtext", label: "Message", required: true },
    ],
  },
  {
    id: "email",
    name: "Email signup",
    description: "A single email field with an optional consent checkbox.",
    collectionName: "Email signups",
    fields: [
      { type: "email", label: "Email", required: true },
      { type: "checkbox", label: "Marketing consent", required: false },
    ],
  },
  {
    id: "waitlist",
    name: "Waitlist",
    description: "Email, company and team size for early access.",
    collectionName: "Waitlist",
    fields: [
      { type: "email", label: "Work email", required: true },
      { type: "text", label: "Company", required: false },
      {
        type: "select",
        label: "Team size",
        required: false,
        options: ["1–5", "6–20", "21–100", "100+"],
      },
    ],
  },
  {
    id: "custom",
    name: "Custom",
    description: "Start from an empty collection and add your own fields.",
    collectionName: "New collection",
    fields: [],
  },
];
