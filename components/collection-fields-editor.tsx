"use client";

import { useEffect, useMemo, useState } from "react";
import { ListPlus, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { FieldEditorRow } from "@/components/field-editor-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import {
  createField,
  deleteField,
  listFields,
  reorderFields,
  updateField,
} from "@/lib/api/collections";
import { fromBackendField, toBackendFieldInput } from "@/lib/api/mappers";
import { errorMessage } from "@/lib/api/client";
import { newField, uniqueFieldName, validateFields } from "@/lib/fields";
import type { Field } from "@/lib/types";

function fieldChanged(a: Field, b: Field): boolean {
  return JSON.stringify({
    name: a.name,
    label: a.label,
    type: a.type,
    required: a.required,
    options: a.options ?? [],
    min: a.min ?? null,
    max: a.max ?? null,
  }) !== JSON.stringify({
    name: b.name,
    label: b.label,
    type: b.type,
    required: b.required,
    options: b.options ?? [],
    min: b.min ?? null,
    max: b.max ?? null,
  });
}

/**
 * Edits a collection's fields and persists each change through the fields
 * endpoints (create/update/delete/reorder). Local edits accumulate in a draft
 * and are pushed to the backend when "Save changes" is pressed.
 */
export function CollectionFieldsEditor({
  projectId,
  collectionId,
  fields,
  onFieldsChange,
}: {
  projectId: string;
  collectionId: string;
  fields: Field[];
  onFieldsChange: (fields: Field[]) => void;
}) {
  const [draft, setDraft] = useState<Field[]>(fields);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [orderDirty, setOrderDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const serverById = useMemo(() => new Map(fields.map((f) => [f.id, f])), [fields]);
  const hasChanges =
    orderDirty ||
    deletedIds.size > 0 ||
    draft.some((f) => !serverById.has(f.id) || fieldChanged(serverById.get(f.id)!, f));

  // Reset the draft whenever the server-side fields change (e.g. after save).
  useEffect(() => {
    setDraft(fields);
    setDeletedIds(new Set());
    setOrderDirty(false);
  }, [fields]);

  function addField() {
    const names = draft.map((f) => f.name);
    const field = { ...newField(), name: uniqueFieldName("new_field", names) };
    setDraft((d) => [...d, field]);
  }

  function patch(index: number, patch: Partial<Field>) {
    setDraft((d) => {
      const next = [...d];
      next[index] = { ...next[index]!, ...patch };
      return next;
    });
  }

  function duplicate(index: number) {
    const source = draft[index]!;
    const names = draft.map((f) => f.name);
    const copy: Field = {
      ...source,
      id: newField().id,
      label: `${source.label} copy`,
      name: uniqueFieldName(source.name || "field", names),
    };
    setDraft((d) => {
      const next = [...d];
      next.splice(index + 1, 0, copy);
      return next;
    });
  }

  function remove(index: number) {
    const target = draft[index]!;
    setDraft((d) => d.filter((_, i) => i !== index));
    if (serverById.has(target.id)) {
      setDeletedIds((s) => new Set(s).add(target.id));
    }
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= draft.length) return;
    setDraft((d) => {
      const next = [...d];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item!);
      return next;
    });
    setOrderDirty(true);
  }

  async function save() {
    if (saving) return;
    const fieldErrors = validateFields(draft);
    if (fieldErrors.length > 0) {
      toast.error(fieldErrors[0]!.message);
      return;
    }
    setSaving(true);
    try {
      for (const f of draft) {
        const original = serverById.get(f.id);
        if (!original) {
          await createField(projectId, collectionId, toBackendFieldInput(f));
        } else if (fieldChanged(original, f)) {
          await updateField(projectId, collectionId, f.id, toBackendFieldInput(f));
        }
      }
      for (const id of deletedIds) {
        await deleteField(projectId, collectionId, id);
      }
      if (orderDirty) {
        await reorderFields(
          projectId,
          collectionId,
          draft.map((f) => f.id),
        );
      }
      const dtos = await listFields(projectId, collectionId);
      onFieldsChange(dtos.map(fromBackendField));
      toast.success("Fields saved");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Field keys are the payload names your form submits. Changes apply when you save.
        </p>
        <Button size="sm" variant="outline" onClick={addField}>
          <Plus className="size-4" /> Add field
        </Button>
      </div>

      {draft.length === 0 ? (
        <EmptyState
          icon={ListPlus}
          title="No fields yet"
          description="Add a field to start shaping the form."
          action={
            <Button size="sm" onClick={addField}>
              <Plus className="size-4" /> Add field
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {draft.map((field, index) => (
            <FieldEditorRow
              key={field.id}
              field={field}
              index={index}
              count={draft.length}
              onChange={(p) => patch(index, p)}
              onMove={(dir) => move(index, dir)}
              onDuplicate={() => duplicate(index)}
              onDelete={() => remove(index)}
            />
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" disabled={!hasChanges || saving} onClick={() => void save()}>
          <Save className="size-4" /> {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
