"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Copy, KeyRound, Loader2, LogOut, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useStore } from "@/lib/store";
import { errorMessage } from "@/lib/api/client";
import { createApiKey, deleteApiKey, listApiKeys } from "@/lib/api/api-keys";
import type { ApiKeyDto } from "@/lib/api/types";
import { fullTime } from "@/lib/format";

interface CreatedKey {
  name: string;
  secret: string;
}

export function SettingsPage() {
  const store = useStore();
  const router = useRouter();
  const [projectId, setProjectId] = useState("");
  const [keyState, setKeyState] = useState<{ projectId: string; keys: ApiKeyDto[] } | null>(
    null,
  );
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [deletingKey, setDeletingKey] = useState<ApiKeyDto | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  // Fall back to the first project when the picker selection goes stale.
  const effectiveProjectId = store.projects.some((p) => p.id === projectId)
    ? projectId
    : (store.projects[0]?.id ?? "");

  useEffect(() => {
    if (!effectiveProjectId) return;
    let cancelled = false;
    listApiKeys(effectiveProjectId)
      .then((k) => {
        if (!cancelled) setKeyState({ projectId: effectiveProjectId, keys: k });
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load API keys.");
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveProjectId]);

  const keys = keyState?.projectId === effectiveProjectId ? keyState.keys : null;
  const loadingKeys = Boolean(effectiveProjectId) && keys === null;

  async function create() {
    if (!effectiveProjectId || !createName.trim() || creating) return;
    setCreating(true);
    try {
      const created = await createApiKey(effectiveProjectId, { name: createName.trim() });
      setCreatedKey({ name: created.name, secret: created.secret });
      setCreateName("");
      setKeyState((s) => ({
        projectId: effectiveProjectId,
        keys: [created, ...(s?.projectId === effectiveProjectId ? s.keys : [])],
      }));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function remove(key: ApiKeyDto) {
    if (!effectiveProjectId) return;
    try {
      await deleteApiKey(effectiveProjectId, key.id);
      setKeyState((s) =>
        s?.projectId === effectiveProjectId
          ? { projectId: s.projectId, keys: s.keys.filter((x) => x.id !== key.id) }
          : s,
      );
      setDeletingKey(null);
      toast.success("API key revoked");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    await store.signOut();
    router.replace("/sign-in");
  }

  if (!store.ready) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Account and project API keys." />

      <section className="space-y-4 rounded-md border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Account</h2>
        <div className="space-y-1.5">
          <Label htmlFor="account-email">Email</Label>
          <Input id="account-email" readOnly value={store.user?.email ?? ""} />
          <p className="text-xs text-muted-foreground">
            {store.user?.name ? `Signed in as ${store.user.name}.` : "Signed in with email + password."}
          </p>
        </div>
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={signingOut}
            onClick={() => void signOut()}
          >
            {signingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
            Sign out
          </Button>
        </div>
      </section>

      <section className="space-y-4 rounded-md border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4" />
          <h2 className="text-sm font-semibold">API keys</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Project API keys authenticate programmatic access to the management API. The secret is
          shown only once, at creation — treat it like a password.
        </p>

        {store.projects.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No projects yet"
            description="Create a project first — API keys belong to a project."
          />
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="key-project">Project</Label>
              <Select value={effectiveProjectId} onValueChange={(v) => v && setProjectId(v)}>
                <SelectTrigger id="key-project" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {store.projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. CI deploy"
                aria-label="New API key name"
              />
              <Button size="sm" variant="outline" disabled={creating || !createName.trim()} onClick={() => void create()}>
                {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Create
              </Button>
            </div>

            {loadingKeys ? (
              <Skeleton className="h-24 w-full" />
            ) : (keys ?? []).length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                No API keys for this project yet.
              </p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
                {(keys ?? []).map((key) => (
                  <li key={key.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{key.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        Created {fullTime(key.createdAt)}
                        {key.lastUsedAt ? ` · last used ${fullTime(key.lastUsedAt)}` : " · never used"}
                        {key.expiresAt ? ` · expires ${fullTime(key.expiresAt)}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      aria-label={`Revoke ${key.name}`}
                      onClick={() => setDeletingKey(key)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <Separator />
        <p className="text-xs text-muted-foreground">
          Deleting a key immediately breaks anything that uses it.
        </p>
      </section>

      <Dialog open={Boolean(createdKey)} onOpenChange={(o) => !o && setCreatedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API key created</DialogTitle>
            <DialogDescription>
              Copy the secret now — it is shown only once and cannot be retrieved again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="created-secret">Secret for “{createdKey?.name}”</Label>
            <div className="flex gap-2">
              <Input id="created-secret" readOnly value={createdKey?.secret ?? ""} className="font-mono text-xs" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (createdKey) {
                    void navigator.clipboard.writeText(createdKey.secret);
                    toast.success("Secret copied");
                  }
                }}
              >
                <Copy className="size-4" /> Copy
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingKey)} onOpenChange={(o) => !o && setDeletingKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this API key?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deletingKey?.name}” will stop working immediately. Anything using it will break.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingKey) void remove(deletingKey);
              }}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
