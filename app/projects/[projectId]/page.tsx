import type { Metadata } from "next";
import { ProjectOverview } from "@/components/pages/project-overview";

export const metadata: Metadata = {
  title: "Project overview — Fieldbase",
  description: "Submission volume, active collections and recent activity for this project.",
  openGraph: {
    title: "Project overview — Fieldbase",
    description: "Submission volume, active collections and recent activity.",
  },
};

export default function Page() {
  return <ProjectOverview />;
}
