export type FieldType =
  | "text"
  | "email"
  | "phone"
  | "number"
  | "longtext"
  | "select"
  | "multiselect"
  | "checkbox"
  | "date"
  | "url";

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Text",
  email: "Email",
  phone: "Phone",
  number: "Number",
  longtext: "Long text",
  select: "Select",
  multiselect: "Multi-select",
  checkbox: "Checkbox",
  date: "Date",
  url: "URL",
};

export type FieldValue = string | number | boolean | string[] | null;

export interface Field {
  id: string;
  type: FieldType;
  label: string;
  description?: string | undefined;
  required: boolean;
  placeholder?: string | undefined;
  defaultValue?: FieldValue | undefined;
  options?: string[] | undefined;
}

export interface Collection {
  id: string;
  projectId: string;
  name: string;
  description?: string | undefined;
  fields: Field[];
  archived: boolean;
  notifyEmail?: string | undefined;
  createdAt: string;
}

export interface Submission {
  id: string;
  collectionId: string;
  projectId: string;
  values: Record<string, FieldValue>;
  read: boolean;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  domain?: string | undefined;
  createdAt: string;
}

export interface DataState {
  projects: Project[];
  collections: Collection[];
  submissions: Submission[];
}
