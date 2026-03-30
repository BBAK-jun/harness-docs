import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCleanup } from "./useCleanup";
import { useMountEffect } from "./useMountEffect";
import { useUpdateEffect } from "./useUpdateEffect";

describe("lifecycle effect hooks", () => {
  it("useCleanup runs the latest cleanup callback on unmount", () => {
    const firstCleanup = vi.fn();
    const nextCleanup = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ cleanup }) => {
        useCleanup(cleanup);
      },
      {
        initialProps: {
          cleanup: firstCleanup,
        },
      },
    );

    rerender({ cleanup: nextCleanup });
    unmount();

    expect(firstCleanup).not.toHaveBeenCalled();
    expect(nextCleanup).toHaveBeenCalledTimes(1);
  });

  it("useMountEffect runs once on mount", () => {
    const cleanup = vi.fn();
    const effect = vi.fn(() => cleanup);
    const { rerender, unmount } = renderHook(() => {
      useMountEffect(effect);
    });

    rerender();

    expect(effect).toHaveBeenCalledTimes(1);

    unmount();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("useUpdateEffect skips the first render and runs on updates", () => {
    const cleanup = vi.fn();
    const effect = vi.fn(() => cleanup);
    const { rerender, unmount } = renderHook(
      ({ value }) => {
        useUpdateEffect(effect, [value]);
      },
      {
        initialProps: {
          value: 1,
        },
      },
    );

    expect(effect).not.toHaveBeenCalled();

    rerender({ value: 2 });

    expect(effect).toHaveBeenCalledTimes(1);

    unmount();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
