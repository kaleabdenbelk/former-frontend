import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Inbox, Plus, Table2 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  collectionSubmissions,
  countThisWeek,
  countToday,
  dailySeries,
  lastActivity,
  projectCollections,
  projectSubmissions,
  useStore,
} from "@/lib/store";
import { relativeTime } from "@/lib/format";

export const Route = createFileRoute("/projects/$projectId/")({
  head: () => ({
    meta: [
      { title: "Project overview — Fieldbase" },
      {
        name: "description",
        content: "Submission volume, active collections and recent activity for this project.",
      },
      { property: "og:title", content: "Project overview — Fieldbase" },
      {
        property: "og:description",
        content: "Submission volume, active collections and recent activity.",
      },
    ],
  }),
  component: ProjectOverview,
});

function ProjectOverview() {
  const { projectId } = Route.useParams();
  const store = useStore();
  const project = store.projects.find((p) => p.id === projectId);

  const data = useMemo(() => {
    const subs = projectSubmissions(store, projectId);
    return {
      subs,
      series: dailySeries(subs, 30),
      collections: projectCollections(store, projectId),
    };
  }, [store, projectId]);

  if (!store.ready) return <Skeleton className="h-64 w-full" />;
  if (!project) {
    return (
      <EmptyState
        icon={Inbox}
        title="Project not found"
        description="It may have been deleted."
        action={
          <Button size="sm" asChild>
            <Link to="/">Back to projects</Link>
          </Button>
        }
      />
    );
  }

  const active = data.collections.filter((c) => !c.archived);
  const recent = [...data.subs]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title={project.name}
        description={project.domain ?? "No domain set"}
        actions={
          <Button size="sm" asChild>
            <Link to="/projects/$projectId/collections/new" params={{ projectId }}>
              <Plus className="size-4" /> Create collection
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Submissions" value={data.subs.length} hint="All time" />
        <StatCard label="This week" value={countThisWeek(data.subs)} hint="Last 7 days" />
        <StatCard label="Today" value={countToday(data.subs)} />
        <StatCard
          label="Collections"
          value={active.length}
          hint={`${data.collections.length - active.length} archived`}
        />
      </div>

      <section className="rounded-md border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Submissions over time</h2>
          <span className="text-xs text-muted-foreground">Last 30 days</span>
        </div>
        <div className="mt-4 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.series} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
              <defs>
                <linearGradient id="submissionsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="currentColor" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                cursor={{ stroke: "var(--border)" }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "var(--popover-foreground)",
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="Submissions"
                stroke="currentColor"
                strokeWidth={1.5}
                fill="url(#submissionsFill)"
                className="text-foreground"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Collections</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/projects/$projectId/collections" params={{ projectId }}>
                View all
              </Link>
            </Button>
          </div>
          {data.collections.length === 0 ? (
            <EmptyState
              icon={Table2}
              title="No collections yet"
              description="Collections define the fields your forms submit."
              action={
                <Button size="sm" asChild>
                  <Link to="/projects/$projectId/collections/new" params={{ projectId }}>
                    <Plus className="size-4" /> Create collection
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
              {data.collections.map((collection) => {
                const subs = collectionSubmissions(store, collection.id);
                return (
                  <li key={collection.id}>
                    <Link
                      to="/projects/$projectId/collections/$collectionId"
                      params={{ projectId, collectionId: collection.id }}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium">{collection.name}</span>
                        {collection.archived ? (
                          <Badge variant="secondary" className="text-[11px] font-normal">
                            Archived
                          </Badge>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {subs.length} · {relativeTime(lastActivity(subs))}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Recent submissions</h2>
          {recent.length === 0 ? (
            <EmptyState icon={Inbox} title="Nothing submitted yet" />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
              {recent.map((submission) => {
                const collection = store.collections.find((c) => c.id === submission.collectionId);
                const first = collection?.fields.find((f) => submission.values[f.id]);
                return (
                  <li key={submission.id}>
                    <Link
                      to="/projects/$projectId/collections/$collectionId"
                      params={{ projectId, collectionId: submission.collectionId }}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                    >
                      <span className="min-w-0">
                        <span className="block truncate">
                          {first ? String(submission.values[first.id]) : "Submission"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {collection?.name}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {relativeTime(submission.createdAt)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
