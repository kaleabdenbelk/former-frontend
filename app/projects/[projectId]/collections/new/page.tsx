import type { Metadata } from "next";
import { NewCollectionPage } from "@/components/pages/new-collection-page";

export const metadata: Metadata = {
  title: "New collection — Fieldbase",
  description: "Build a collection field by field and preview the form as you go.",
  openGraph: {
    title: "New collection — Fieldbase",
    description: "Build a collection and preview the form live.",
  },
};

export default function Page() {
  return <NewCollectionPage />;
}
