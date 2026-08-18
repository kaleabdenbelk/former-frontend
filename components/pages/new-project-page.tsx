"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COLLECTION_TEMPLATES } from "@/lib/templates";
import { useStore } from "@/lib/store";
import { errorMessage } from "@/lib/api/client";
import { toFieldName, uniqueFieldName } from "@/lib/fields";
import type { Field } from "@/lib/types";
import { cn } from "@/lib/utils";

function fieldId() {
  return `fld_${Math.random().toString(36).slice(2, 10)}`;
}

/** Give template fields stable machine keys (derived from their labels). */
function templateFields(fields: Omit<Field, "id" | "name">[]): Field[] {
  const names: string[] = [];
  return fields.map((f) => {
    const name = uniqueFieldName(toFieldName(f.label), names);
    names.push(name);
    return { ...f, id: fieldId(), name };
  });
}

export function NewProjectPage() {
  const store = useStore();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [template, setTemplate] = useState<string>("contact");
  const [busy, setBusy] = useState(false);

  async function finish(withTemplate: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      const project = await store.createProject({
        name: name.trim(),
        domain: domain.trim() || undefined,
      });
      const tpl = COLLECTION_TEMPLATES.find((t) => t.id === template);
      if (withTemplate && tpl && tpl.fields.length > 0) {
        await store.createCollection({
          projectId: project.id,
          name: tpl.collectionName,
          description: tpl.description,
          fields: templateFields(tpl.fields),
        });
        toast.success(`Project created with “${tpl.collectionName}”`);
      } else if (withTemplate && tpl?.id === "custom") {
        router.push(`/projects/${project.id}/collections/new`);
        return;
      } else {
        toast.success("Project created");
      }
      router.push(`/projects/${project.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <PageHeader
        title="New project"
        description={step === 1 ? "Step 1 of 2 · Basics" : "Step 2 of 2 · Starting point"}
      />

      {step === 1 ? (
        <div className="space-y-4 rounded-md border border-border bg-card p-4">
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              value={name}
              autoFocus
              placeholder="My Portfolio"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-domain">Website (optional)</Label>
            <Input
              id="project-domain"
              value={domain}
              placeholder="example.com"
              onChange={(e) => setDomain(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Used to label the project. You can change it later.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => router.push("/")}>
              Cancel
            </Button>
            <Button disabled={!name.trim()} onClick={() => setStep(2)}>
              Continue <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {COLLECTION_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setTemplate(tpl.id)}
                className={cn(
                  "rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  template === tpl.id
                    ? "border-foreground/40 bg-accent"
                    : "border-border bg-card hover:border-foreground/20",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{tpl.name}</span>
                  {template === tpl.id ? <Check className="size-4" /> : null}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{tpl.description}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="size-4" /> Back
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" disabled={busy} onClick={() => void finish(false)}>
                Skip for now
              </Button>
              <Button disabled={busy} onClick={() => void finish(true)}>
                Create project
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
