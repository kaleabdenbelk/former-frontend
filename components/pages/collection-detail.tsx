"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, ArchiveRestore, Download, Globe, Inbox, Play, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, type Column } from "@/components/data-table";
import { SubmissionSheet } from "@/components/submission-sheet";
import { CollectionFieldsEditor } from "@/components/collection-fields-editor";
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
import {
  buildSnippet,
  displayValue,
  downloadCsv,
  relativeTime,
  slugify,
  toCsv,
} from "@/lib/format";
import { addOrigin, listOrigins, removeOrigin } from "@/lib/api/collections";
import { API_URL, errorMessage } from "@/lib/api/client";
import type { CollectionStatus, Submission } from "@/lib/types";

export function CollectionDetail() {
  const { projectId, collectionId } = useParams<{ projectId: string; collectionId: string }>();
  const store = useStore();
  const router = useRouter();
  const collection = store.collections.find((c) => c.id === collectionId);

  const [selected, setSelected] = useState<string[]>([]);
  const [openRow, setOpenRow] = useState<Submission | null>(null);
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [deleteCollectionOpen, setDeleteCollectionOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // General settings — initialize once when the collection first loads.
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!collection || initializedRef.current) return;
    initializedRef.current = true;
    setName(collection.name);
    setDescription(collection.description ?? "");
  }, [collection]);

  // Allowed origins.
  const [origins, setOrigins] = useState<string[]>([]);
  const [originInput, setOriginInput] = useState("");
  useEffect(() => {
    let cancelled = false;
    listOrigins(projectId, collectionId)
      .then((o) => {
        if (!cancelled) setOrigins(o);
      })
      .catch(() => {
        /* surfaced on the add/remove actions */
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, collectionId]);

  const subs = useMemo(
    () => collectionSubmissions(store, collectionId),
    [store, collectionId],
  );
  const filtered = subs.filter((s) =>
    readFilter === "all" ? true : readFilter === "unread" ? !s.read : s.read,
  );

  if (!store.ready) return <Skeleton className="h-64 w-full" />;
  if (!collection) {
    return (
      <EmptyState
        icon={Inbox}
        title="Collection not found"
        description="It may have been deleted."
        action={
          <Button size="sm" nativeButton={false} render={<Link href={`/projects/${projectId}/collections`} />}>
            Back to collections
          </Button>
        }
      />
    );
  }

  const columns: Column<Submission>[] = [
    ...collection.fields.slice(0, 4).map<Column<Submission>>((field) => ({
      id: field.id,
      header: field.label || field.name,
      sortValue: (s) => displayValue(field, s.data[field.name]),
      cell: (s) => (
        <span className={s.read ? "" : "font-medium"}>
          <span className="line-clamp-1 max-w-[240px]">
            {displayValue(field, s.data[field.name]) || (
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

  const endpoint = `${API_URL}/v1/collect/${collection.publicId}`;
  const snippet = buildSnippet(endpoint, collection.fields);

  async function setStatus(status: CollectionStatus, message: string) {
    try {
      await store.updateCollection(collection!.id, { status });
      toast.success(message);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function saveGeneral() {
    setBusy(true);
    try {
      await store.updateCollection(collection!.id, {
        name: name.trim() || collection!.name,
        description: description.trim() || undefined,
      });
      toast.success("Collection updated");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function addOriginToList() {
    const value = originInput.trim();
    if (!value) return;
    setBusy(true);
    try {
      const normalized = await addOrigin(projectId, collectionId, value);
      setOrigins((o) => [...o, normalized].sort());
      setOriginInput("");
      toast.success("Origin allowed");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeOriginFromList(origin: string) {
    try {
      await removeOrigin(projectId, collectionId, origin);
      setOrigins((o) => o.filter((x) => x !== origin));
      toast.success("Origin removed");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

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
                collection.fields.map((f) => displayValue(f, s.data[f.name])).join(" ")
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
              <Button size="sm" disabled={busy} onClick={() => void saveGeneral()}>
                Save
              </Button>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Fields</h2>
            <CollectionFieldsEditor
              projectId={projectId}
              collectionId={collectionId}
              fields={collection.fields}
              onFieldsChange={(fields) => store.setCollectionFields(collectionId, fields)}
            />
          </section>

          <section className="space-y-3 rounded-md border border-border bg-card p-4">
            <div>
              <h2 className="text-sm font-semibold">Connect it</h2>
              <p className="text-xs text-muted-foreground">
                Point any HTML form at this endpoint. Field names below match the keys on each
                field — a form submits JSON to{" "}
                <code className="rounded bg-muted px-1">POST /v1/collect/{"{publicId}"}</code>.
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
              <Textarea id="snippet" readOnly rows={12} value={snippet} className="font-mono text-xs" />
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
            <div className="flex items-center gap-2">
              <Globe className="size-4" />
              <h2 className="text-sm font-semibold">Allowed origins</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Allow an exact website origin (e.g.{" "}
              <code className="rounded bg-muted px-1">https://example.com</code>) to submit from a
              browser. The browser blocks reading the response unless the origin is listed here.
              Your site is currently at{" "}
              <code className="rounded bg-muted px-1">
                {typeof window !== "undefined" ? window.location.origin : ""}
              </code>{" "}
              — for local testing, allow that exact origin, including the port.
            </p>
            <div className="flex gap-2">
              <Input
                value={originInput}
                onChange={(e) => setOriginInput(e.target.value)}
                placeholder="https://example.com"
                className="font-mono text-xs"
                aria-label="Origin to allow"
              />
              <Button size="sm" variant="outline" disabled={busy || !originInput.trim()} onClick={() => void addOriginToList()}>
                Add
              </Button>
            </div>
            {origins.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No origins allowed yet — browser submissions are blocked until you add one.
              </p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
                {origins.map((origin) => (
                  <li key={origin} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="truncate font-mono text-xs">{origin}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      aria-label={`Remove ${origin}`}
                      onClick={() => void removeOriginFromList(origin)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3 rounded-md border border-destructive/40 p-4">
            <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
            <Separator />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Collection status</p>
                <p className="text-xs text-muted-foreground">
                  {collection.status === "ACTIVE"
                    ? "Public submissions are accepted."
                    : collection.status === "INACTIVE"
                      ? "Paused — public submissions are rejected."
                      : "Archived — readable history, public submissions rejected."}
                </p>
              </div>
              <div className="flex gap-2">
                {collection.status === "ACTIVE" ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void setStatus("INACTIVE", "Collection paused")}
                    >
                      <Play className="size-4 rotate-180" /> Pause
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void setStatus("ARCHIVED", "Collection archived")}
                    >
                      <Archive className="size-4" /> Archive
                    </Button>
                  </>
                ) : collection.status === "INACTIVE" ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void setStatus("ACTIVE", "Collection resumed")}
                    >
                      <Play className="size-4" /> Resume
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void setStatus("ARCHIVED", "Collection archived")}
                    >
                      <Archive className="size-4" /> Archive
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void setStatus("ACTIVE", "Collection restored")}
                  >
                    <ArchiveRestore className="size-4" /> Restore
                  </Button>
                )}
              </div>
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
          void (async () => {
            try {
              await store.deleteSubmissions([openRow.id]);
              setOpenRow(null);
              toast.success("Submission deleted");
            } catch (err) {
              toast.error(errorMessage(err));
            }
          })();
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
                if (confirmDelete) {
                  void (async () => {
                    try {
                      await store.deleteSubmissions(confirmDelete);
                      toast.success("Submissions deleted");
                    } catch (err) {
                      toast.error(errorMessage(err));
                    }
                  })();
                }
                setSelected([]);
                setConfirmDelete(null);
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
                void (async () => {
                  try {
                    await store.deleteCollection(collection.id);
                    setDeleteCollectionOpen(false);
                    toast.success("Collection deleted");
                    router.push(`/projects/${projectId}/collections`);
                  } catch (err) {
                    toast.error(errorMessage(err));
                  }
                })();
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
