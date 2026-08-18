import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Field } from "@/lib/types";

function inputType(field: Field) {
  switch (field.type) {
    case "email":
      return "email";
    case "phone":
      return "tel";
    case "number":
      return "number";
    case "date":
      return "date";
    case "url":
      return "url";
    default:
      return "text";
  }
}

export function FormPreview({
  name,
  description,
  fields,
}: {
  name: string;
  description?: string;
  fields: Field[];
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
      <div className="mt-3 space-y-1">
        <p className="text-sm font-semibold text-foreground">{name || "Untitled collection"}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="mt-4 space-y-4">
        {fields.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
            Add a field to see the form.
          </p>
        ) : (
          fields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <Label className="text-sm">
                {field.label || "Untitled field"}
                {field.required ? <span className="text-muted-foreground"> *</span> : null}
              </Label>
              {field.description ? (
                <p className="text-xs text-muted-foreground">{field.description}</p>
              ) : null}
              {field.type === "longtext" ? (
                <Textarea
                  readOnly
                  rows={3}
                  placeholder={field.placeholder ?? ""}
                  defaultValue={typeof field.defaultValue === "string" ? field.defaultValue : ""}
                />
              ) : field.type === "checkbox" ? (
                <div className="flex items-center gap-2">
                  <Checkbox checked={Boolean(field.defaultValue)} aria-readonly />
                  <span className="text-sm text-muted-foreground">
                    {field.placeholder || "Yes"}
                  </span>
                </div>
              ) : field.type === "select" ? (
                <Select>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={field.placeholder || "Select an option"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options ?? []).map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "multiselect" ? (
                <div className="space-y-1.5 rounded-md border border-border p-2">
                  {(field.options ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No options yet.</p>
                  ) : (
                    (field.options ?? []).map((opt) => (
                      <div key={opt} className="flex items-center gap-2">
                        <Checkbox aria-readonly />
                        <span className="text-sm">{opt}</span>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <Input
                  readOnly
                  type={inputType(field)}
                  placeholder={field.placeholder ?? ""}
                  defaultValue={
                    typeof field.defaultValue === "string" || typeof field.defaultValue === "number"
                      ? String(field.defaultValue)
                      : ""
                  }
                />
              )}
            </div>
          ))
        )}
      </div>
      <Button className="mt-5 w-full" disabled>
        Submit
      </Button>
    </div>
  );
}
