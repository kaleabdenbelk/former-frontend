import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COLLECTION_TEMPLATES } from "@/lib/templates";
import { useStore } from "@/lib/store";
import type { Field } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/new")({
  head: () => ({
    meta: [
      { title: "New project — Fieldbase" },
      {
        name: "description",
        content: "Create a project for a website and pick a starting collection template.",
      },
      { property: "og:title", content: "New project — Fieldbase" },
      {
        property: "og:description",
        content: "Create a project and pick a starting collection template.",
      },
    ],
  }),
  component: NewProjectPage,
});

function fieldId() {
  return `fld_${Math.random().toString(36).slice(2, 10)}`;
}

function NewProjectPage() {
  const store = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [template, setTemplate] = useState<string>("contact");

  function finish(withTemplate: boolean) {
    const project = store.createProject({ name: name.trim(), domain: domain.trim() || undefined });
    const tpl = COLLECTION_TEMPLATES.find((t) => t.id === template);
    if (withTemplate && tpl && tpl.fields.length > 0) {
      store.createCollection({
        projectId: project.id,
        name: tpl.collectionName,
        description: tpl.description,
        fields: tpl.fields.map<Field>((f) => ({ ...f, id: fieldId() })),
      });
      toast.success(`Project created with “${tpl.collectionName}”`);
    } else if (withTemplate && tpl?.id === "custom") {
      navigate({ to: "/projects/$projectId/collections/new", params: { projectId: project.id } });
      return;
    } else {
      toast.success("Project created");
    }
    navigate({ to: "/projects/$projectId", params: { projectId: project.id } });
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
            <Button variant="outline" onClick={() => navigate({ to: "/" })}>
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
              <Button variant="ghost" onClick={() => finish(false)}>
                Skip for now
              </Button>
              <Button onClick={() => finish(true)}>Create project</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
