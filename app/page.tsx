import type { Metadata } from "next";
import { ProjectsPage } from "@/components/pages/projects-page";

export const metadata: Metadata = {
  title: "Projects — Fieldbase",
  description:
    "All your website data projects in one place: collections, submissions and recent activity.",
  openGraph: {
    title: "Projects — Fieldbase",
    description: "All your website data projects in one place.",
  },
};

export default function Page() {
  return <ProjectsPage />;
}
