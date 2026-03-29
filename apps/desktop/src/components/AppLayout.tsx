import { SidebarProvider } from "@/components/ui/sidebar";

export function AppLayout({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider className="min-h-screen bg-transparent">
      {sidebar}
      <div className="min-w-0 flex-1 overflow-auto">{children}</div>
    </SidebarProvider>
  );
}
