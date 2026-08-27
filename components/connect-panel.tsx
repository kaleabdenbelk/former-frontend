"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Globe, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addOrigin, listOrigins, removeOrigin } from "@/lib/api/collections";
import { API_URL, errorMessage } from "@/lib/api/client";
import { FIELD_TYPE_LABELS } from "@/lib/types";
import { buildSnippet, SNIPPET_LABELS, type SnippetKind } from "@/lib/snippets";
import type { Field } from "@/lib/types";

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(label ? `${label} copied` : "Copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={() => void copy()}>
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export function ConnectPanel({
  projectId,
  collectionId,
  publicId,
  collectionName,
  fields,
}: {
  projectId: string;
  collectionId: string;
  publicId: string;
  collectionName: string;
  fields: Field[];
}) {
  const endpoint = `${API_URL}/v1/collect/${publicId}`;
  const [activeSnippet, setActiveSnippet] = useState<SnippetKind>("html");
  const snippet = buildSnippet(activeSnippet, endpoint, fields);

  // Allowed origins
  const [origins, setOrigins] = useState<string[]>([]);
  const [originInput, setOriginInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listOrigins(projectId, collectionId)
      .then((o) => {
        if (!cancelled) setOrigins(o);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectId, collectionId]);

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
    <div className="space-y-6">
      {/* Endpoint */}
      <section className="space-y-3 rounded-md border border-border bg-card p-4">
        <div>
          <h2 className="text-sm font-semibold">Endpoint</h2>
          <p className="text-xs text-muted-foreground">
            POST JSON to this URL from your website, app, or script.
          </p>
        </div>
        <div className="flex gap-2">
          <Input readOnly value={endpoint} className="font-mono text-xs" />
          <CopyButton text={endpoint} label="Endpoint" />
        </div>
      </section>

      {/* Fields reference */}
      <section className="space-y-3 rounded-md border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Fields</h2>
        <p className="text-xs text-muted-foreground">
          These are the keys your form submits. The generated code below uses
          them automatically.
        </p>
        {fields.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No fields defined yet. Add fields in the Settings tab.
          </p>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-3 py-1.5 font-medium">Key</th>
                  <th className="px-3 py-1.5 font-medium">Label</th>
                  <th className="px-3 py-1.5 font-medium">Type</th>
                  <th className="px-3 py-1.5 font-medium">Required</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f) => (
                  <tr key={f.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-1.5 font-mono">{f.name}</td>
                    <td className="px-3 py-1.5">{f.label || f.name}</td>
                    <td className="px-3 py-1.5">
                      <Badge variant="secondary">
                        {FIELD_TYPE_LABELS[f.type]}
                      </Badge>
                    </td>
                    <td className="px-3 py-1.5">
                      {f.required ? (
                        <Badge variant="default">Required</Badge>
                      ) : (
                        <span className="text-muted-foreground">Optional</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Code snippets */}
      <section className="space-y-3 rounded-md border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Install</h2>
            <p className="text-xs text-muted-foreground">
              Pick your stack and paste the code.
            </p>
          </div>
          <CopyButton text={snippet} label="Code" />
        </div>

        <Tabs
          value={activeSnippet}
          onValueChange={(v) => setActiveSnippet(v as SnippetKind)}
        >
          <TabsList variant="line">
            {(Object.keys(SNIPPET_LABELS) as SnippetKind[]).map((kind) => (
              <TabsTrigger key={kind} value={kind}>
                {SNIPPET_LABELS[kind]}
              </TabsTrigger>
            ))}
          </TabsList>

          {(Object.keys(SNIPPET_LABELS) as SnippetKind[]).map((kind) => (
            <TabsContent key={kind} value={kind}>
              <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs leading-relaxed">
                <code>{buildSnippet(kind, endpoint, fields)}</code>
              </pre>
            </TabsContent>
          ))}
        </Tabs>
      </section>

      {/* Error reference */}
      <section className="space-y-3 rounded-md border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Errors</h2>
        <p className="text-xs text-muted-foreground">
          The API always returns JSON. Handle these status codes in your code.
        </p>
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-3 py-1.5 font-medium">Status</th>
                <th className="px-3 py-1.5 font-medium">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["201", "Submission received"],
                ["400", "Validation error — check field names and types"],
                ["404", "Collection not found, inactive, or archived"],
                ["413", "Payload too large"],
                ["429", "Rate limited — respect the Retry-After header"],
                ["5xx", "Server error — retry with backoff"],
              ].map(([code, desc]) => (
                <tr key={code} className="border-b border-border last:border-0">
                  <td className="px-3 py-1.5 font-mono font-medium">{code}</td>
                  <td className="px-3 py-1.5">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Error response shape:
        </p>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
          <code>{`{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The email field is required."
  }
}`}</code>
        </pre>
      </section>

      <Separator />

      {/* Allowed origins */}
      <section className="space-y-3 rounded-md border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Globe className="size-4" />
          <h2 className="text-sm font-semibold">Allowed origins</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Add the exact origin of every website that should be allowed to
          submit. Browser submissions from unlisted origins are blocked by
          CORS. Your dashboard origin is already trusted automatically.
        </p>
        <div className="flex gap-2">
          <Input
            value={originInput}
            onChange={(e) => setOriginInput(e.target.value)}
            placeholder="https://example.com"
            className="font-mono text-xs"
            aria-label="Origin to allow"
            onKeyDown={(e) => {
              if (e.key === "Enter") void addOriginToList();
            }}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !originInput.trim()}
            onClick={() => void addOriginToList()}
          >
            Add
          </Button>
        </div>
        {origins.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No origins configured — browser submissions are blocked until you
            add at least one.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
            {origins.map((origin) => (
              <li
                key={origin}
                className="flex items-center justify-between gap-2 px-3 py-2"
              >
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
    </div>
  );
}
