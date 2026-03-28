export function AppLayout({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-transparent">
      {sidebar}
      <main className="min-w-0 flex-1 overflow-auto">{children}</main>
    </div>
  );
}
