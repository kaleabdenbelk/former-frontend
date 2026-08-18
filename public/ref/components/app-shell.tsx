import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronsUpDown, Database, LayoutGrid, Settings as SettingsIcon, Table2 } from "lucide-react";
import type { ReactNode } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useStore } from "@/lib/store";

function usePathContext() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const parts = pathname.split("/").filter(Boolean);
  const projectId = parts[0] === "projects" && parts[1] && parts[1] !== "new" ? parts[1] : undefined;
  const collectionId =
    projectId && parts[2] === "collections" && parts[3] && parts[3] !== "new" ? parts[3] : undefined;
  return { pathname, projectId, collectionId, parts };
}

function AppSidebar() {
  const store = useStore();
  const { pathname, projectId } = usePathContext();
  const project = store.projects.find((p) => p.id === projectId);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Database className="size-4 shrink-0" />
          <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
            Fieldbase
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/"} tooltip="Projects">
                  <Link to="/">
                    <LayoutGrid />
                    <span>Projects</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/settings"}
                  tooltip="Settings"
                >
                  <Link to="/settings">
                    <SettingsIcon />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {project ? (
          <SidebarGroup>
            <SidebarGroupLabel>Project</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton tooltip={project.name}>
                        <Database />
                        <span className="truncate">{project.name}</span>
                        <ChevronsUpDown className="ml-auto size-3.5 opacity-60" />
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuLabel>Switch project</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {store.projects.map((p) => (
                        <DropdownMenuItem key={p.id} asChild>
                          <Link to="/projects/$projectId" params={{ projectId: p.id }}>
                            {p.name}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === `/projects/${project.id}`}
                    tooltip="Overview"
                  >
                    <Link to="/projects/$projectId" params={{ projectId: project.id }}>
                      <LayoutGrid />
                      <span>Overview</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(`/projects/${project.id}/collections`)}
                    tooltip="Collections"
                  >
                    <Link to="/projects/$projectId/collections" params={{ projectId: project.id }}>
                      <Table2 />
                      <span>Collections</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <p className="px-2 py-1 text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          Mock data · no backend
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}

function Crumbs() {
  const store = useStore();
  const { pathname, projectId, collectionId, parts } = usePathContext();
  const project = store.projects.find((p) => p.id === projectId);
  const collection = store.collections.find((c) => c.id === collectionId);

  const items: { label: string; to?: ReactNode }[] = [];
  if (pathname === "/settings") items.push({ label: "Settings" });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {pathname === "/" ? (
            <BreadcrumbPage>Projects</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link to="/">Projects</Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {items.map((i) => (
          <span key={i.label} className="contents">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{i.label}</BreadcrumbPage>
            </BreadcrumbItem>
          </span>
        ))}
        {parts[0] === "projects" && parts[1] === "new" ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>New project</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
        {project ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {collection || parts[2] === "collections" ? (
                <BreadcrumbLink asChild>
                  <Link to="/projects/$projectId" params={{ projectId: project.id }}>
                    {project.name}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{project.name}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </>
        ) : null}
        {project && parts[2] === "collections" ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {collection || parts[3] === "new" ? (
                <BreadcrumbLink asChild>
                  <Link to="/projects/$projectId/collections" params={{ projectId: project.id }}>
                    Collections
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>Collections</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </>
        ) : null}
        {collection ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{collection.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
        {project && parts[2] === "collections" && parts[3] === "new" ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>New collection</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
          <SidebarTrigger className="-ml-1" />
          <div className="h-4 w-px bg-border" />
          <Crumbs />
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
