import type { Metadata } from "next";
import { SignInPage } from "@/components/pages/sign-in-page";

export const metadata: Metadata = {
  title: "Sign in — Fieldbase",
};

export default function Page() {
  return <SignInPage />;
}
