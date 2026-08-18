"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FolderPlus, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
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
  DialogDescription,
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
import { lastActivity, projectCollections, projectSubmissions, useStore } from "@/lib/store";
import { relativeTime } from "@/lib/format";
import { errorMessage } from "@/lib/api/client";

type SortKey = "activity" | "name" | "submissions";

export function ProjectsPage() {
  const store = useStore();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("activity");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameDomain, setRenameDomain] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    const list = store.projects.map((project) => {
      const cols = projectCollections(store, project.id);
      const subs = projectSubmissions(store, project.id);
      return {
        project,
        collections: cols.filter((c) => c.status !== "ARCHIVED").length,
        submissions: subs.length,
        activity: lastActivity(subs),
      };
    });
    const q = query.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (r) =>
            r.project.name.toLowerCase().includes(q) ||
            (r.project.domain ?? "").toLowerCase().includes(q),
        )
      : list;
    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.project.name.localeCompare(b.project.name);
      if (sort === "submissions") return b.submissions - a.submissions;
      return (b.activity ?? "").localeCompare(a.activity ?? "");
    });
  }, [store, query, sort]);

  if (!store.ready) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const renamingProject = store.projects.find((p) => p.id === renaming);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Projects"
        description="Each project holds collections of structured submissions from your site."
        actions={
          <Button size="sm" nativeButton={false} render={<Link href="/projects/new" />}>
            <Plus className="size-4" /> New project
          </Button>
        }
      />

      {store.projects.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="No projects yet"
          description="Create a project for a website, then add collections to capture its form data."
          action={
            <Button size="sm" nativeButton={false} render={<Link href="/projects/new" />}>
              <Plus className="size-4" /> New project
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects"
                aria-label="Search projects"
                className="h-8 pl-8"
              />
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-8 w-[170px]" aria-label="Sort projects">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activity">Last activity</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="submissions">Submissions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {rows.length === 0 ? (
            <EmptyState icon={Search} title="No matches" description="Try a different search." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {rows.map(({ project, collections, submissions, activity }) => (
                <div
                  key={project.id}
                  className="group relative rounded-md border border-border bg-card p-4 transition-colors hover:border-foreground/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/projects/${project.id}`}
                        className="truncate text-sm font-semibold text-foreground after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {project.name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {project.domain ?? "No domain set"}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="relative z-10 size-7"
                            aria-label={`Actions for ${project.name}`}
                          />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setRenaming(project.id);
                            setRenameValue(project.name);
                            setRenameDomain(project.domain ?? "");
                          }}
                        >
                          <Pencil className="size-4" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleting(project.id)}
                        >
                          <Trash2 className="size-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Collections</dt>
                      <dd className="mt-0.5 text-sm font-medium tabular-nums">{collections}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Submissions</dt>
                      <dd className="mt-0.5 text-sm font-medium tabular-nums">{submissions}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Last activity</dt>
                      <dd className="mt-0.5 text-sm font-medium">{relativeTime(activity)}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={Boolean(renaming)} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
            <DialogDescription>Update the project name and website.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rename-name">Name</Label>
              <Input
                id="rename-name"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rename-domain">Website</Label>
              <Input
                id="rename-domain"
                value={renameDomain}
                placeholder="example.com"
                onChange={(e) => setRenameDomain(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A scheme is added automatically if missing (example.com → https://example.com).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button
              disabled={!renameValue.trim() || busy}
              onClick={async () => {
                if (!renamingProject) return;
                setBusy(true);
                try {
                  await store.updateProject(renamingProject.id, {
                    name: renameValue.trim(),
                    domain: renameDomain.trim() || undefined,
                  });
                  setRenaming(null);
                  toast.success("Project updated");
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
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              Its collections and submissions are removed too. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return;
                try {
                  await store.deleteProject(deleting);
                  toast.success("Project deleted");
                  router.push("/");
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
