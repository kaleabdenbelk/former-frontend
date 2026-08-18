import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { CollectionBuilder, newField } from "@/components/collection-builder";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import type { Field } from "@/lib/types";

export const Route = createFileRoute("/projects/$projectId/collections/new")({
  head: () => ({
    meta: [
      { title: "New collection — Fieldbase" },
      {
        name: "description",
        content: "Build a collection field by field and preview the form as you go.",
      },
      { property: "og:title", content: "New collection — Fieldbase" },
      { property: "og:description", content: "Build a collection and preview the form live." },
    ],
  }),
  component: NewCollectionPage,
});

function NewCollectionPage() {
  const { projectId } = Route.useParams();
  const store = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<Field[]>([
    { ...newField(), label: "Email", type: "email", required: true },
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="New collection"
        description="Fields on the left, live form preview on the right."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/projects/$projectId/collections", params: { projectId } })}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!name.trim() || fields.length === 0}
              onClick={() => {
                const created = store.createCollection({
                  projectId,
                  name: name.trim(),
                  description: description.trim() || undefined,
                  fields,
                });
                toast.success("Collection created");
                navigate({
                  to: "/projects/$projectId/collections/$collectionId",
                  params: { projectId, collectionId: created.id },
                });
              }}
            >
              Create collection
            </Button>
          </>
        }
      />
      <CollectionBuilder
        name={name}
        description={description}
        fields={fields}
        onNameChange={setName}
        onDescriptionChange={setDescription}
        onFieldsChange={setFields}
      />
    </div>
  );
}
