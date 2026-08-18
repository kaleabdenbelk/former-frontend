import type { Metadata } from "next";
import { NewProjectPage } from "@/components/pages/new-project-page";

export const metadata: Metadata = {
  title: "New project — Fieldbase",
  description: "Create a project for a website and pick a starting collection template.",
  openGraph: {
    title: "New project — Fieldbase",
    description: "Create a project and pick a starting collection template.",
  },
};

export default function Page() {
  return <NewProjectPage />;
}
