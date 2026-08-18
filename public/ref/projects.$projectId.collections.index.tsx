import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Archive, ArchiveRestore, Copy, MoreHorizontal, Pencil, Plus, Table2, Trash2 } from "lucide-react";
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
import type { Collection } from "@/lib/types";

export const Route = createFileRoute("/projects/$projectId/collections/")({
  head: () => ({
    meta: [
      { title: "Collections — Fieldbase" },
      {
        name: "description",
        content: "Every collection in this project with submission counts and last activity.",
      },
      { property: "og:title", content: "Collections — Fieldbase" },
      { property: "og:description", content: "Every collection in this project." },
    ],
  }),
  component: CollectionsPage,
});

type Row = { collection: Collection; count: number; activity?: string | undefined };

function CollectionsPage() {
  const { projectId } = Route.useParams();
  const store = useStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"active" | "archived" | "all">("active");
  const [renaming, setRenaming] = useState<Collection | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<Collection | null>(null);

  const rows = useMemo<Row[]>(() => {
    return projectCollections(store, projectId)
      .filter((c) => (filter === "all" ? true : filter === "archived" ? c.archived : !c.archived))
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
          {r.collection.archived ? (
            <Badge variant="secondary" className="text-[11px] font-normal">
              Archived
            </Badge>
          ) : null}
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

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Collections"
        description="Each collection defines its own fields and holds its own submissions."
        actions={
          <Button size="sm" asChild>
            <Link to="/projects/$projectId/collections/new" params={{ projectId }}>
              <Plus className="size-4" /> New collection
            </Link>
          </Button>
        }
      />

      {projectCollections(store, projectId).length === 0 ? (
        <EmptyState
          icon={Table2}
          title="No collections yet"
          description="Create a collection to define the fields your site submits."
          action={
            <Button size="sm" asChild>
              <Link to="/projects/$projectId/collections/new" params={{ projectId }}>
                <Plus className="size-4" /> New collection
              </Link>
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
            navigate({
              to: "/projects/$projectId/collections/$collectionId",
              params: { projectId, collectionId: r.collection.id },
            })
          }
          toolbar={
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="h-8 w-[150px]" aria-label="Filter collections">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          }
          rowActions={(r) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7" aria-label="Collection actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => {
                    setRenaming(r.collection);
                    setRenameValue(r.collection.name);
                  }}
                >
                  <Pencil className="size-4" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    const copy = store.duplicateCollection(r.collection.id);
                    if (copy) toast.success(`Duplicated as “${copy.name}”`);
                  }}
                >
                  <Copy className="size-4" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    store.updateCollection(r.collection.id, { archived: !r.collection.archived });
                    toast.success(r.collection.archived ? "Collection restored" : "Collection archived");
                  }}
                >
                  {r.collection.archived ? (
                    <>
                      <ArchiveRestore className="size-4" /> Restore
                    </>
                  ) : (
                    <>
                      <Archive className="size-4" /> Archive
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={() => setDeleting(r.collection)}
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
              disabled={!renameValue.trim()}
              onClick={() => {
                if (renaming) store.updateCollection(renaming.id, { name: renameValue.trim() });
                setRenaming(null);
                toast.success("Collection renamed");
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
              onClick={() => {
                if (deleting) store.deleteCollection(deleting.id);
                setDeleting(null);
                toast.success("Collection deleted");
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
