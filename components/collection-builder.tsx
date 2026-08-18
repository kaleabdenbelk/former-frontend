import { Plus, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldEditorRow } from "@/components/field-editor-row";
import { FormPreview } from "@/components/form-preview";
import { EmptyState } from "@/components/empty-state";
import { newField, uniqueFieldName } from "@/lib/fields";
import type { Field } from "@/lib/types";

export { newField };

export function CollectionBuilder({
  name,
  description,
  fields,
  onNameChange,
  onDescriptionChange,
  onFieldsChange,
  showMeta = true,
}: {
  name: string;
  description: string;
  fields: Field[];
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onFieldsChange: (fields: Field[]) => void;
  showMeta?: boolean;
}) {
  function addField() {
    const names = fields.map((f) => f.name);
    onFieldsChange([...fields, { ...newField(), name: uniqueFieldName("new_field", names) }]);
  }

  function patchField(index: number, patch: Partial<Field>) {
    onFieldsChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    onFieldsChange(next);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        {showMeta ? (
          <div className="space-y-4 rounded-md border border-border bg-card p-4">
            <div className="space-y-1.5">
              <Label htmlFor="collection-name">Collection name</Label>
              <Input
                id="collection-name"
                value={name}
                placeholder="Contact requests"
                onChange={(e) => onNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="collection-description">Description</Label>
              <Textarea
                id="collection-description"
                rows={2}
                value={description}
                placeholder="What is this collection for?"
                onChange={(e) => onDescriptionChange(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Fields</h2>
            <Button size="sm" variant="outline" onClick={addField}>
              <Plus className="size-4" /> Add field
            </Button>
          </div>
          {fields.length === 0 ? (
            <EmptyState
              icon={ListPlus}
              title="No fields yet"
              description="Add your first field to start shaping the form."
              action={
                <Button size="sm" onClick={addField}>
                  <Plus className="size-4" /> Add field
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {fields.map((field, index) => (
                <FieldEditorRow
                  key={field.id}
                  field={field}
                  index={index}
                  count={fields.length}
                  onChange={(patch) => patchField(index, patch)}
                  onMove={(dir) => move(index, dir)}
                  onDuplicate={() => {
                    const names = fields.map((f) => f.name);
                    const copy: Field = {
                      ...field,
                      id: newField().id,
                      label: `${field.label} copy`,
                      name: uniqueFieldName(field.name || "field", names),
                    };
                    const next = [...fields];
                    next.splice(index + 1, 0, copy);
                    onFieldsChange(next);
                  }}
                  onDelete={() => onFieldsChange(fields.filter((_, i) => i !== index))}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <FormPreview name={name} description={description} fields={fields} />
      </div>
    </div>
  );
}
