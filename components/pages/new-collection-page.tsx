"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { CollectionBuilder, newField } from "@/components/collection-builder";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { errorMessage } from "@/lib/api/client";
import { validateFields } from "@/lib/fields";
import type { Field } from "@/lib/types";

export function NewCollectionPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const store = useStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState<Field[]>([
    { ...newField(), label: "Email", name: "email", type: "email", required: true },
  ]);

  async function create() {
    if (busy) return;
    const fieldErrors = validateFields(fields);
    if (fieldErrors.length > 0) {
      toast.error(fieldErrors[0]!.message);
      return;
    }
    setBusy(true);
    try {
      const created = await store.createCollection({
        projectId,
        name: name.trim(),
        description: description.trim() || undefined,
        fields,
      });
      toast.success("Collection created");
      router.push(`/projects/${projectId}/collections/${created.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  }

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
              onClick={() => router.push(`/projects/${projectId}/collections`)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!name.trim() || fields.length === 0 || busy}
              onClick={() => void create()}
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
