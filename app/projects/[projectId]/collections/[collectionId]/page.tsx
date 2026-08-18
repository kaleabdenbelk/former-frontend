import type { Metadata } from "next";
import { CollectionDetail } from "@/components/pages/collection-detail";

export const metadata: Metadata = {
  title: "Collection — Fieldbase",
  description: "Browse submissions, review collection metrics and manage settings.",
  openGraph: {
    title: "Collection — Fieldbase",
    description: "Submissions, metrics and settings.",
  },
};

export default function Page() {
  return <CollectionDetail />;
}
