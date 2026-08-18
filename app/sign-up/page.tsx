import type { Metadata } from "next";
import { SignUpPage } from "@/components/pages/sign-up-page";

export const metadata: Metadata = {
  title: "Create account — Fieldbase",
};

export default function Page() {
  return <SignUpPage />;
}
