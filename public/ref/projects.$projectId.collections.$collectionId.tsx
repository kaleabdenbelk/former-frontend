import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Inbox, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, type Column } from "@/components/data-table";
import { SubmissionSheet } from "@/components/submission-sheet";
import { CollectionBuilder } from "@/components/collection-builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  averageFieldsCompleted,
  collectionSubmissions,
  countThisWeek,
  countToday,
  useStore,
} from "@/lib/store";
import { displayValue, downloadCsv, relativeTime, slugify, toCsv } from "@/lib/format";
import type { Field, Submission } from "@/lib/types";

export const Route = createFileRoute("/projects/$projectId/collections/$collectionId")({
  head: () => ({
    meta: [
      { title: "Collection — Fieldbase" },
      {
        name: "description",
        content: "Browse submissions, review collection metrics and manage settings.",
      },
      { property: "og:title", content: "Collection — Fieldbase" },
      { property: "og:description", content: "Submissions, metrics and settings." },
    ],
  }),
  component: CollectionDetail,
});

function CollectionDetail() {
  const { projectId, collectionId } = Route.useParams();
  const store = useStore();
  const navigate = useNavigate();
  const collection = store.collections.find((c) => c.id === collectionId);

  const [selected, setSelected] = useState<string[]>([]);
  const [openRow, setOpenRow] = useState<Submission | null>(null);
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [deleteCollectionOpen, setDeleteCollectionOpen] = useState(false);

  const subs = useMemo(
    () => collectionSubmissions(store, collectionId),
    [store, collectionId],
  );
  const filtered = subs.filter((s) =>
    readFilter === "all" ? true : readFilter === "unread" ? !s.read : s.read,
  );

  const [name, setName] = useState(collection?.name ?? "");
  const [description, setDescription] = useState(collection?.description ?? "");
  const [notify, setNotify] = useState(collection?.notifyEmail ?? "");

  if (!store.ready) return <Skeleton className="h-64 w-full" />;
  if (!collection) {
    return (
      <EmptyState
        icon={Inbox}
        title="Collection not found"
        description="It may have been deleted."
        action={
          <Button size="sm" asChild>
            <Link to="/projects/$projectId/collections" params={{ projectId }}>
              Back to collections
            </Link>
          </Button>
        }
      />
    );
  }

  const columns: Column<Submission>[] = [
    ...collection.fields.slice(0, 4).map<Column<Submission>>((field) => ({
      id: field.id,
      header: field.label,
      sortValue: (s) => displayValue(field, s.values[field.id]),
      cell: (s) => (
        <span className={s.read ? "" : "font-medium"}>
          <span className="line-clamp-1 max-w-[240px]">
            {displayValue(field, s.values[field.id]) || (
              <span className="text-muted-foreground">—</span>
            )}
          </span>
        </span>
      ),
    })),
    {
      id: "createdAt",
      header: "Submitted",
      sortValue: (s) => s.createdAt,
      className: "text-muted-foreground whitespace-nowrap",
      cell: (s) => relativeTime(s.createdAt),
    },
  ];

  const endpoint = `https://api.fieldbase.dev/f/${collection.id}`;
  const snippet = `<form action="${endpoint}" method="POST">
${collection.fields
  .map(
    (f: Field) =>
      `  <label>${f.label}\n    <input name="${f.id}" type="${
        f.type === "email" ? "email" : f.type === "number" ? "number" : "text"
      }"${f.required ? " required" : ""} />\n  </label>`,
  )
  .join("\n")}
  <button type="submit">Send</button>
</form>`;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title={collection.name}
        description={collection.description ?? "No description"}
        actions={
          <Button
            size="sm"
            variant="outline"
            disabled={subs.length === 0}
            onClick={() =>
              downloadCsv(`${slugify(collection.name)}.csv`, toCsv(collection, subs))
            }
          >
            <Download className="size-4" /> Export CSV
          </Button>
        }
      />

      <Tabs defaultValue="submissions">
        <TabsList>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="submissions" className="mt-4">
          {subs.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No submissions yet"
              description="Connect the form from the Settings tab to start receiving data."
            />
          ) : (
            <DataTable
              rows={filtered}
              columns={columns}
              getRowId={(s) => s.id}
              searchText={(s) =>
                collection.fields.map((f) => displayValue(f, s.values[f.id])).join(" ")
              }
              searchPlaceholder="Search submissions"
              defaultSort={{ columnId: "createdAt", dir: "desc" }}
              selectedIds={selected}
              onSelectedChange={setSelected}
              pageSize={12}
              onRowClick={(s) => {
                setOpenRow(s);
                if (!s.read) store.updateSubmission(s.id, { read: true });
              }}
              toolbar={
                <Select value={readFilter} onValueChange={(v) => setReadFilter(v as typeof readFilter)}>
                  <SelectTrigger className="h-8 w-[140px]" aria-label="Filter submissions">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                  </SelectContent>
                </Select>
              }
              bulkActions={
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7"
                    onClick={() =>
                      downloadCsv(
                        `${slugify(collection.name)}-selection.csv`,
                        toCsv(collection, subs.filter((s) => selected.includes(s.id))),
                      )
                    }
                  >
                    <Download className="size-4" /> Export
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7"
                    onClick={() => setConfirmDelete(selected)}
                  >
                    <Trash2 className="size-4" /> Delete
                  </Button>
                </>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total" value={subs.length} />
            <StatCard label="Today" value={countToday(subs)} />
            <StatCard label="This week" value={countThisWeek(subs)} hint="Last 7 days" />
            <StatCard
              label="Avg. fields filled"
              value={averageFieldsCompleted(collection, subs)}
              hint={`of ${collection.fields.length}`}
            />
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-6">
          <section className="space-y-4 rounded-md border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">General</h2>
            <div className="space-y-1.5">
              <Label htmlFor="settings-name">Name</Label>
              <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-desc">Description</Label>
              <Textarea
                id="settings-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  store.updateCollection(collection.id, {
                    name: name.trim() || collection.name,
                    description: description.trim() || undefined,
                  });
                  toast.success("Collection updated");
                }}
              >
                Save
              </Button>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Fields</h2>
            <CollectionBuilder
              name={collection.name}
              description={collection.description ?? ""}
              fields={collection.fields}
              showMeta={false}
              onNameChange={() => {}}
              onDescriptionChange={() => {}}
              onFieldsChange={(fields) => store.updateCollection(collection.id, { fields })}
            />
          </section>

          <section className="space-y-3 rounded-md border border-border bg-card p-4">
            <div>
              <h2 className="text-sm font-semibold">Connect it</h2>
              <p className="text-xs text-muted-foreground">
                Point any HTML form at this endpoint — field names match the ids below.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endpoint">Endpoint</Label>
              <div className="flex gap-2">
                <Input id="endpoint" readOnly value={endpoint} className="font-mono text-xs" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(endpoint);
                    toast.success("Endpoint copied");
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="snippet">HTML form</Label>
              <Textarea id="snippet" readOnly rows={10} value={snippet} className="font-mono text-xs" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(snippet);
                  toast.success("Snippet copied");
                }}
              >
                Copy snippet
              </Button>
            </div>
          </section>

          <section className="space-y-3 rounded-md border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <div className="space-y-1.5">
              <Label htmlFor="notify">Email destination</Label>
              <Input
                id="notify"
                type="email"
                placeholder="team@example.com"
                value={notify}
                onChange={(e) => setNotify(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  store.updateCollection(collection.id, { notifyEmail: notify.trim() || undefined });
                  toast.success("Notification settings saved");
                }}
              >
                Save
              </Button>
            </div>
          </section>

          <section className="space-y-3 rounded-md border border-destructive/40 p-4">
            <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
            <Separator />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {collection.archived ? "Restore collection" : "Archive collection"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Archived collections stay readable but are hidden by default.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  store.updateCollection(collection.id, { archived: !collection.archived });
                  toast.success(collection.archived ? "Collection restored" : "Collection archived");
                }}
              >
                {collection.archived ? "Restore" : "Archive"}
              </Button>
            </div>
            <Separator />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Delete collection</p>
                <p className="text-xs text-muted-foreground">
                  Permanently removes the collection and its submissions.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setDeleteCollectionOpen(true)}>
                <Trash2 className="size-4" /> Delete
              </Button>
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <SubmissionSheet
        collection={collection}
        submission={openRow}
        open={Boolean(openRow)}
        onOpenChange={(o) => !o && setOpenRow(null)}
        onToggleRead={() => {
          if (!openRow) return;
          store.updateSubmission(openRow.id, { read: !openRow.read });
          setOpenRow({ ...openRow, read: !openRow.read });
        }}
        onDelete={() => {
          if (!openRow) return;
          store.deleteSubmissions([openRow.id]);
          setOpenRow(null);
          toast.success("Submission deleted");
        }}
      />

      <AlertDialog open={Boolean(confirmDelete)} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.length} submissions?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) store.deleteSubmissions(confirmDelete);
                setSelected([]);
                setConfirmDelete(null);
                toast.success("Submissions deleted");
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteCollectionOpen} onOpenChange={setDeleteCollectionOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this collection?</AlertDialogTitle>
            <AlertDialogDescription>
              Its {subs.length} submissions are deleted too.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                store.deleteCollection(collection.id);
                setDeleteCollectionOpen(false);
                toast.success("Collection deleted");
                navigate({ to: "/projects/$projectId/collections", params: { projectId } });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
