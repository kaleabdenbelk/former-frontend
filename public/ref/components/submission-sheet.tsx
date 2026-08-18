import { Download, Mail, MailOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { displayValue, downloadCsv, fullTime, isEmptyValue, slugify, toCsv } from "@/lib/format";
import type { Collection, Submission } from "@/lib/types";

function Body({
  collection,
  submission,
  onDelete,
  onToggleRead,
}: {
  collection: Collection;
  submission: Submission;
  onDelete: () => void;
  onToggleRead: () => void;
}) {
  const filled = collection.fields.filter((f) => !isEmptyValue(submission.values[f.id]));

  return (
    <div className="space-y-4 px-4 pb-6 sm:px-6">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onToggleRead}>
          {submission.read ? <Mail className="size-4" /> : <MailOpen className="size-4" />}
          Mark as {submission.read ? "unread" : "read"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCsv(
              `${slugify(collection.name)}-${submission.id}.csv`,
              toCsv(collection, [submission]),
            )
          }
        >
          <Download className="size-4" /> Export
        </Button>
        <Button variant="outline" size="sm" onClick={onDelete}>
          <Trash2 className="size-4" /> Delete
        </Button>
      </div>
      <Separator />
      <dl className="space-y-3">
        {filled.length === 0 ? (
          <p className="text-sm text-muted-foreground">This submission has no values.</p>
        ) : (
          filled.map((field) => (
            <div key={field.id}>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {field.label}
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-foreground">
                {displayValue(field, submission.values[field.id])}
              </dd>
            </div>
          ))
        )}
      </dl>
      <Separator />
      <p className="text-xs text-muted-foreground">Submission ID {submission.id}</p>
    </div>
  );
}

export function SubmissionSheet({
  collection,
  submission,
  open,
  onOpenChange,
  onDelete,
  onToggleRead,
}: {
  collection: Collection | undefined;
  submission: Submission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  onToggleRead: () => void;
}) {
  const isMobile = useIsMobile();
  if (!submission || !collection) return null;

  const title = "Submission";
  const subtitle = `${collection.name} · ${fullTime(submission.createdAt)}`;
  const body = (
    <Body
      collection={collection}
      submission={submission}
      onDelete={onDelete}
      onToggleRead={onToggleRead}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{subtitle}</DrawerDescription>
          </DrawerHeader>
          <div className="max-h-[70vh] overflow-y-auto">{body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{subtitle}</SheetDescription>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  );
}
