"use client";

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
import { toFieldName } from "@/lib/fields";

const NEEDS_OPTIONS: FieldType[] = ["select", "multiselect"];

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
  // Once the user edits the machine key directly, stop re-deriving it from
  // the label.
  const [nameEdited, setNameEdited] = useState(false);

  function onLabelChange(label: string) {
    if (nameEdited) {
      onChange({ label });
    } else {
      onChange({ label, name: toFieldName(label) });
    }
  }

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
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="size-7" aria-label="Field actions" />
            }
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={index === 0} onClick={() => onMove(-1)}>
              <ChevronUp className="size-4" /> Move up
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === count - 1} onClick={() => onMove(1)}>
              <ChevronDown className="size-4" /> Move down
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="size-4" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
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
              placeholder={field.name || "Label shown to visitors"}
              onChange={(e) => onLabelChange(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${field.id}-name`}>Key</Label>
            <Input
              id={`${field.id}-name`}
              value={field.name}
              placeholder="field_key"
              onChange={(e) => {
                setNameEdited(true);
                onChange({ name: e.target.value });
              }}
            />
            <p className="text-xs text-muted-foreground">
              Submission payload key — letters, numbers, underscores; starts with a letter.
            </p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
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
              <p className="text-xs text-muted-foreground">At least one option is required.</p>
            </div>
          ) : null}
          {field.type === "number" ? (
            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${field.id}-min`}>Min (optional)</Label>
                <Input
                  id={`${field.id}-min`}
                  type="number"
                  value={field.min === null || field.min === undefined ? "" : String(field.min)}
                  placeholder="No minimum"
                  onChange={(e) =>
                    onChange({ min: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${field.id}-max`}>Max (optional)</Label>
                <Input
                  id={`${field.id}-max`}
                  type="number"
                  value={field.max === null || field.max === undefined ? "" : String(field.max)}
                  placeholder="No maximum"
                  onChange={(e) =>
                    onChange({ max: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </div>
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
