import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_TYPE_LABELS, type Field, type FieldType } from "@/lib/types";

const NEEDS_OPTIONS: FieldType[] = ["select", "multiselect"];
const SUPPORTS_PLACEHOLDER: FieldType[] = [
  "text", "email", "phone", "number", "longtext", "url", "select",
];

export function FieldEditorRow({
  field,
  index,
  count,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
}: {
  field: Field;
  index: number;
  count: number;
  onChange: (patch: Partial<Field>) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {open ? (
            <ChevronUp className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate text-sm font-medium">{field.label || "Untitled field"}</span>
          <Badge variant="secondary" className="shrink-0 text-[11px] font-normal">
            {FIELD_TYPE_LABELS[field.type]}
          </Badge>
          {field.required ? (
            <span className="shrink-0 text-xs text-muted-foreground">required</span>
          ) : null}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7" aria-label="Field actions">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={index === 0} onSelect={() => onMove(-1)}>
              <ChevronUp className="size-4" /> Move up
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === count - 1} onSelect={() => onMove(1)}>
              <ChevronDown className="size-4" /> Move down
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDuplicate}>
              <Copy className="size-4" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onSelect={onDelete}>
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {open ? (
        <div className="grid gap-3 border-t border-border px-3 py-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${field.id}-label`}>Label</Label>
            <Input
              id={`${field.id}-label`}
              value={field.label}
              onChange={(e) => onChange({ label: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${field.id}-type`}>Type</Label>
            <Select
              value={field.type}
              onValueChange={(v) => onChange({ type: v as FieldType })}
            >
              <SelectTrigger id={`${field.id}-type`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {FIELD_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={`${field.id}-desc`}>Help text</Label>
            <Input
              id={`${field.id}-desc`}
              value={field.description ?? ""}
              placeholder="Shown under the label"
              onChange={(e) => onChange({ description: e.target.value || undefined })}
            />
          </div>
          {SUPPORTS_PLACEHOLDER.includes(field.type) ? (
            <div className="space-y-1.5">
              <Label htmlFor={`${field.id}-ph`}>Placeholder</Label>
              <Input
                id={`${field.id}-ph`}
                value={field.placeholder ?? ""}
                onChange={(e) => onChange({ placeholder: e.target.value || undefined })}
              />
            </div>
          ) : null}
          {["text", "email", "number", "url", "phone", "select"].includes(field.type) ? (
            <div className="space-y-1.5">
              <Label htmlFor={`${field.id}-default`}>Default value</Label>
              <Input
                id={`${field.id}-default`}
                value={
                  typeof field.defaultValue === "string" || typeof field.defaultValue === "number"
                    ? String(field.defaultValue)
                    : ""
                }
                onChange={(e) => onChange({ defaultValue: e.target.value || undefined })}
              />
            </div>
          ) : null}
          {field.type === "checkbox" ? (
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 sm:col-span-2">
              <Label htmlFor={`${field.id}-checked`}>Checked by default</Label>
              <Switch
                id={`${field.id}-checked`}
                checked={Boolean(field.defaultValue)}
                onCheckedChange={(v) => onChange({ defaultValue: v })}
              />
            </div>
          ) : null}
          {NEEDS_OPTIONS.includes(field.type) ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`${field.id}-options`}>Options</Label>
              <Textarea
                id={`${field.id}-options`}
                rows={3}
                placeholder="One option per line"
                value={(field.options ?? []).join("\n")}
                onChange={(e) =>
                  onChange({
                    options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                  })
                }
              />
            </div>
          ) : null}
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 sm:col-span-2">
            <Label htmlFor={`${field.id}-required`}>Required</Label>
            <Switch
              id={`${field.id}-required`}
              checked={field.required}
              onCheckedChange={(v) => onChange({ required: v })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
