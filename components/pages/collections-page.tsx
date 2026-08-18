"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Play, Plus, Table2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { collectionSubmissions, lastActivity, projectCollections, useStore } from "@/lib/store";
import { relativeTime } from "@/lib/format";
import { errorMessage } from "@/lib/api/client";
import type { Collection, CollectionStatus } from "@/lib/types";

type Row = { collection: Collection; count: number; activity?: string | undefined };
type Filter = "active" | "paused" | "archived" | "all";

function StatusBadge({ status }: { status: CollectionStatus }) {
  if (status === "ARCHIVED") {
    return (
      <Badge variant="secondary" className="text-[11px] font-normal">
        Archived
      </Badge>
    );
  }
  if (status === "INACTIVE") {
    return (
      <Badge variant="outline" className="text-[11px] font-normal">
        Paused
      </Badge>
    );
  }
  return null;
}

export function CollectionsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const store = useStore();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("active");
  const [renaming, setRenaming] = useState<Collection | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<Collection | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo<Row[]>(() => {
    return projectCollections(store, projectId)
      .filter((c) => {
        if (filter === "all") return true;
        if (filter === "archived") return c.status === "ARCHIVED";
        if (filter === "paused") return c.status === "INACTIVE";
        return c.status === "ACTIVE";
      })
      .map((collection) => {
        const subs = collectionSubmissions(store, collection.id);
        return { collection, count: subs.length, activity: lastActivity(subs) };
      });
  }, [store, projectId, filter]);

  if (!store.ready) return <Skeleton className="h-64 w-full" />;

  const columns: Column<Row>[] = [
    {
      id: "name",
      header: "Name",
      sortValue: (r) => r.collection.name,
      cell: (r) => (
        <span className="flex items-center gap-2">
          <span className="font-medium">{r.collection.name}</span>
          <StatusBadge status={r.collection.status} />
          <span className="text-xs text-muted-foreground">
            {r.collection.fields.length} fields
          </span>
        </span>
      ),
    },
    {
      id: "count",
      header: "Submissions",
      sortValue: (r) => r.count,
      className: "tabular-nums",
      cell: (r) => r.count,
    },
    {
      id: "activity",
      header: "Last activity",
      sortValue: (r) => r.activity ?? "",
      className: "text-muted-foreground",
      cell: (r) => relativeTime(r.activity),
    },
  ];

  async function setStatus(collection: Collection, status: CollectionStatus, message: string) {
    try {
      await store.updateCollection(collection.id, { status });
      toast.success(message);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Collections"
        description="Each collection defines its own fields and holds its own submissions."
        actions={
          <Button size="sm" nativeButton={false} render={<Link href={`/projects/${projectId}/collections/new`} />}>
            <Plus className="size-4" /> New collection
          </Button>
        }
      />

      {projectCollections(store, projectId).length === 0 ? (
        <EmptyState
          icon={Table2}
          title="No collections yet"
          description="Create a collection to define the fields your site submits."
          action={
            <Button size="sm" nativeButton={false} render={<Link href={`/projects/${projectId}/collections/new`} />}>
              <Plus className="size-4" /> New collection
            </Button>
          }
        />
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(r) => r.collection.id}
          searchText={(r) => r.collection.name}
          searchPlaceholder="Search collections"
          defaultSort={{ columnId: "activity", dir: "desc" }}
          onRowClick={(r) =>
            router.push(`/projects/${projectId}/collections/${r.collection.id}`)
          }
          toolbar={
            <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <SelectTrigger className="h-8 w-[150px]" aria-label="Filter collections">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          }
          rowActions={(r) => (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="size-7" aria-label="Collection actions" />
                }
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setRenaming(r.collection);
                    setRenameValue(r.collection.name);
                  }}
                >
                  <Pencil className="size-4" /> Rename
                </DropdownMenuItem>
                {r.collection.status === "ACTIVE" ? (
                  <>
                    <DropdownMenuItem
                      onClick={() => setStatus(r.collection, "INACTIVE", "Collection paused")}
                    >
                      <Play className="size-4 rotate-180" /> Pause
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setStatus(r.collection, "ARCHIVED", "Collection archived")}
                    >
                      <Archive className="size-4" /> Archive
                    </DropdownMenuItem>
                  </>
                ) : r.collection.status === "INACTIVE" ? (
                  <>
                    <DropdownMenuItem
                      onClick={() => setStatus(r.collection, "ACTIVE", "Collection resumed")}
                    >
                      <Play className="size-4" /> Resume
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setStatus(r.collection, "ARCHIVED", "Collection archived")}
                    >
                      <Archive className="size-4" /> Archive
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem
                    onClick={() => setStatus(r.collection, "ACTIVE", "Collection restored")}
                  >
                    <ArchiveRestore className="size-4" /> Restore
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setDeleting(r.collection)}
                >
                  <Trash2 className="size-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      <Dialog open={Boolean(renaming)} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="collection-rename">Name</Label>
            <Input
              id="collection-rename"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button
              disabled={!renameValue.trim() || busy}
              onClick={async () => {
                if (!renaming) return;
                setBusy(true);
                try {
                  await store.updateCollection(renaming.id, { name: renameValue.trim() });
                  setRenaming(null);
                  toast.success("Collection renamed");
                } catch (err) {
                  toast.error(errorMessage(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this collection?</AlertDialogTitle>
            <AlertDialogDescription>
              Its submissions are deleted too. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return;
                try {
                  await store.deleteCollection(deleting.id);
                  toast.success("Collection deleted");
                } catch (err) {
                  toast.error(errorMessage(err));
                }
                setDeleting(null);
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
