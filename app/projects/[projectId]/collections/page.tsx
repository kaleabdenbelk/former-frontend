import type { Metadata } from "next";
import { CollectionsPage } from "@/components/pages/collections-page";

export const metadata: Metadata = {
  title: "Collections — Fieldbase",
  description: "Every collection in this project with submission counts and last activity.",
  openGraph: {
    title: "Collections — Fieldbase",
    description: "Every collection in this project.",
  },
};

export default function Page() {
  return <CollectionsPage />;
}
