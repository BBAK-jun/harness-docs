import * as React from "react";
import { createPortal } from "react-dom";

type FloatingDockItem = {
  id: string;
  order: number;
  panel?: React.ReactNode;
  trigger: React.ReactNode;
};

type FloatingDockContextValue = {
  removeItem: (id: string) => void;
  upsertItem: (item: FloatingDockItem) => void;
};

const FloatingDockContext = React.createContext<FloatingDockContextValue | null>(null);

export function FloatingDockProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Record<string, FloatingDockItem>>({});

  const upsertItem = React.useCallback((item: FloatingDockItem) => {
    setItems((current) => ({
      ...current,
      [item.id]: item,
    }));
  }, []);

  const removeItem = React.useCallback((id: string) => {
    setItems((current) => {
      if (!(id in current)) {
        return current;
      }

      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const orderedItems = React.useMemo(
    () => Object.values(items).sort((left, right) => left.order - right.order),
    [items],
  );
  const contextValue = React.useMemo(
    () => ({
      removeItem,
      upsertItem,
    }),
    [removeItem, upsertItem],
  );

  return (
    <FloatingDockContext.Provider value={contextValue}>
      {children}
      {createPortal(<FloatingDockLayer items={orderedItems} />, window.document.body)}
    </FloatingDockContext.Provider>
  );
}

export function useFloatingDockItem({
  id,
  isVisible = true,
  order,
  panel,
  trigger,
}: {
  id: string;
  isVisible?: boolean;
  order: number;
  panel?: React.ReactNode;
  trigger: React.ReactNode;
}) {
  const context = React.useContext(FloatingDockContext);

  if (!context) {
    throw new Error("useFloatingDockItem must be used within FloatingDockProvider.");
  }

  // Keep portal-backed dock controls in sync before paint so IME composition is not interrupted.
  React.useLayoutEffect(() => {
    if (!isVisible) {
      context.removeItem(id);
      return;
    }

    context.upsertItem({
      id,
      order,
      panel,
      trigger,
    });
  }, [context, id, isVisible, order, panel, trigger]);

  React.useLayoutEffect(() => {
    return () => {
      context.removeItem(id);
    };
  }, [context, id]);
}

function FloatingDockLayer({ items }: { items: FloatingDockItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-y-0 right-0 z-[60] flex max-w-[calc(100vw-2rem)] flex-col items-end justify-end gap-4 px-4 py-6 md:px-6 md:py-8">
      {items.map((item) => (
        <div className="flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3" key={item.id}>
          {item.panel ? <div className="pointer-events-auto">{item.panel}</div> : null}
          <div className="pointer-events-auto">{item.trigger}</div>
        </div>
      ))}
    </div>
  );
}
