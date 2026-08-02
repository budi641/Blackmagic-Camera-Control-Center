import { describe, expect, it } from "vitest";
import { StateStore } from "./StateStore.js";

describe("StateStore", () => {
  it("applies changes and reports which ones were applied", () => {
    const store = new StateStore();
    const applied = store.apply([
      { path: "/video/iso", value: { iso: 400 } },
      { path: "/video/whiteBalance", value: { whiteBalance: 5600 } },
    ]);
    expect(applied).toHaveLength(2);
    expect(store.get("/video/iso")).toEqual({ iso: 400 });
  });

  it("skips changes that are deep-equal to current state", () => {
    const store = new StateStore();
    store.apply([{ path: "/video/iso", value: { iso: 400 } }]);
    const applied = store.apply([{ path: "/video/iso", value: { iso: 400 } }]);
    expect(applied).toHaveLength(0);
  });

  it("detects nested changes", () => {
    const store = new StateStore();
    store.apply([{ path: "/a", value: { x: { y: [1, 2, 3] } } }]);
    const applied = store.apply([{ path: "/a", value: { x: { y: [1, 2, 4] } } }]);
    expect(applied).toHaveLength(1);
  });

  it("removes keys on undefined value", () => {
    const store = new StateStore();
    store.apply([{ path: "/a", value: 1 }]);
    const applied = store.apply([{ path: "/a", value: undefined }]);
    expect(applied).toHaveLength(1);
    expect(store.get("/a")).toBeUndefined();
    expect(store.snapshot()).not.toHaveProperty("/a");
  });

  it("snapshot returns a copy", () => {
    const store = new StateStore();
    store.apply([{ path: "/a", value: 1 }]);
    const snap = store.snapshot();
    snap["/b"] = 2;
    expect(store.get("/b")).toBeUndefined();
  });
});
