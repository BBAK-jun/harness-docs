import * as React from "react";
import { Clock3, PanelRightClose, PanelRightOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ClientActivityEntry = {
  id: string;
  action: string;
  description?: string;
  source?: string;
  createdAt: string;
};

export type ClientActivityLogInput = {
  action: string;
  description?: string;
  source?: string;
};

type ClientActivityLogContextValue = {
  entries: ClientActivityEntry[];
  clearEntries: () => void;
  logEvent: (input: ClientActivityLogInput) => void;
};

const fallbackClientActivityLogContext: ClientActivityLogContextValue = {
  entries: [],
  clearEntries: () => {},
  logEvent: () => {},
};

const ClientActivityLogContext = React.createContext<ClientActivityLogContextValue>(
  fallbackClientActivityLogContext,
);

const MAX_ENTRIES = 30;

export function ClientActivityLogProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = React.useState<ClientActivityEntry[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);

  const logEvent = React.useCallback((input: ClientActivityLogInput) => {
    const entry: ClientActivityEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action: input.action,
      description: input.description,
      source: input.source,
      createdAt: new Date().toISOString(),
    };

    setEntries((current) => [entry, ...current].slice(0, MAX_ENTRIES));
    console.info("[client-activity]", entry);
  }, []);

  const clearEntries = React.useCallback(() => {
    setEntries([]);
  }, []);

  const value = React.useMemo<ClientActivityLogContextValue>(
    () => ({
      entries,
      clearEntries,
      logEvent,
    }),
    [clearEntries, entries, logEvent],
  );

  return (
    <ClientActivityLogContext.Provider value={value}>
      {children}
      <ClientActivityDock
        entries={entries}
        isOpen={isOpen}
        onClear={clearEntries}
        onToggle={() => setIsOpen((current) => !current)}
      />
    </ClientActivityLogContext.Provider>
  );
}

export function useClientActivityLog() {
  return React.useContext(ClientActivityLogContext);
}

function ClientActivityDock({
  entries,
  isOpen,
  onClear,
  onToggle,
}: {
  entries: ClientActivityEntry[];
  isOpen: boolean;
  onClear: () => void;
  onToggle: () => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-[min(24rem,calc(100vw-2rem))] flex-col items-end gap-2">
      <div className="pointer-events-auto flex items-center gap-2">
        {isOpen ? (
          <Button
            aria-label="클라이언트 로그 비우기"
            className="h-9 px-3"
            clientLog={{ action: "클라이언트 로그 비우기", source: "client-log-dock" }}
            onClick={onClear}
            size="sm"
            variant="outline"
          >
            <Trash2 />
            비우기
          </Button>
        ) : null}
        <Button
          aria-expanded={isOpen}
          aria-label="클라이언트 로그 패널 열기"
          className="h-10 gap-2 rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.94)] px-4 shadow-lg backdrop-blur"
          clientLog={{ action: isOpen ? "클라이언트 로그 패널 닫기" : "클라이언트 로그 패널 열기", source: "client-log-dock" }}
          onClick={onToggle}
          size="sm"
          variant="outline"
        >
          <Clock3 />
          Client Log
          <span className="rounded-full bg-[var(--secondary)] px-2 py-0.5 text-xs text-[var(--secondary-foreground)]">
            {entries.length}
          </span>
          {isOpen ? <PanelRightClose /> : <PanelRightOpen />}
        </Button>
      </div>

      {isOpen ? (
        <section className="pointer-events-auto w-full overflow-hidden rounded-[calc(var(--radius)+0.35rem)] border border-[var(--border)] bg-[rgba(255,255,255,0.96)] shadow-[0_30px_90px_-60px_rgba(15,23,42,0.7)] backdrop-blur-xl">
          <header className="border-b border-[var(--border)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--foreground)]">클라이언트 활동 로그</p>
            <p className="text-xs leading-5 text-[var(--muted-foreground)]">
              CTA 클릭과 클라이언트 상호작용이 최근순으로 기록됩니다.
            </p>
          </header>

          <div className="max-h-80 overflow-y-auto">
            {entries.length === 0 ? (
              <div className="px-4 py-6 text-sm text-[var(--muted-foreground)]">
                아직 기록된 활동이 없습니다.
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {entries.map((entry) => (
                  <li className="px-4 py-3" key={entry.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)]">{entry.action}</p>
                        {entry.description ? (
                          <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                            {entry.description}
                          </p>
                        ) : null}
                        {entry.source ? (
                          <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                            {entry.source}
                          </p>
                        ) : null}
                      </div>
                      <time
                        className="shrink-0 text-[11px] tabular-nums text-[var(--muted-foreground)]"
                        dateTime={entry.createdAt}
                      >
                        {formatTimestamp(entry.createdAt)}
                      </time>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function formatTimestamp(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}
