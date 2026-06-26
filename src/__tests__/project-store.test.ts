import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createProject,
  getProject,
  updateProject,
  deleteProject,
  getProjectList,
  getActiveProjectId,
  setActiveProjectId,
  renameProject,
} from "#/lib/project-store.ts";

// Mock localStorage
const store = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => store.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    store.delete(key);
  }),
  clear: vi.fn(() => store.clear()),
  get length() {
    return store.size;
  },
  key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

describe("project-store", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  describe("createProject", () => {
    it("creates a project with the given name", () => {
      const project = createProject("Test Project");
      expect(project.name).toBe("Test Project");
      expect(project.id).toBeTruthy();
      expect(project.ddl).toBe("");
      expect(project.databaseType).toBe("postgresql");
      expect(project.createdAt).toBeGreaterThan(0);
    });

    it("creates a project with custom DDL and database type", () => {
      const ddl = "CREATE TABLE test (id INTEGER);";
      const project = createProject("ClickHouse Project", ddl, "clickhouse");
      expect(project.name).toBe("ClickHouse Project");
      expect(project.ddl).toBe(ddl);
      expect(project.databaseType).toBe("clickhouse");
    });

    it("adds the project to the project list", () => {
      const project = createProject("My Project");
      const list = getProjectList();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(project.id);
    });
  });

  describe("getProject", () => {
    it("returns the project by id", () => {
      const created = createProject("Test");
      const retrieved = getProject(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.name).toBe("Test");
    });

    it("returns null for non-existent project", () => {
      expect(getProject("nonexistent")).toBeNull();
    });
  });

  describe("updateProject", () => {
    it("updates project fields", () => {
      const project = createProject("Original");
      const updated = updateProject(project.id, { name: "Updated" });
      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("Updated");
      expect(updated!.updatedAt).toBeGreaterThanOrEqual(project.updatedAt);
    });

    it("returns null for non-existent project", () => {
      expect(updateProject("nonexistent", { name: "Nope" })).toBeNull();
    });

    it("updates DDL content", () => {
      const project = createProject("Test");
      const newDdl = "CREATE TABLE foo (id INTEGER);";
      updateProject(project.id, { ddl: newDdl });
      const retrieved = getProject(project.id);
      expect(retrieved!.ddl).toBe(newDdl);
    });

    it("updates database type", () => {
      const project = createProject("Test");
      updateProject(project.id, { databaseType: "clickhouse" });
      const retrieved = getProject(project.id);
      expect(retrieved!.databaseType).toBe("clickhouse");
    });
  });

  describe("renameProject", () => {
    it("renames a project", () => {
      const project = createProject("Old Name");
      renameProject(project.id, "New Name");
      const retrieved = getProject(project.id);
      expect(retrieved!.name).toBe("New Name");
    });
  });

  describe("deleteProject", () => {
    it("removes the project from storage", () => {
      const project = createProject("To Delete");
      expect(getProjectList()).toHaveLength(1);
      deleteProject(project.id);
      expect(getProjectList()).toHaveLength(0);
      expect(getProject(project.id)).toBeNull();
    });

    it("clears active project if deleting the active one", () => {
      const project = createProject("Active");
      setActiveProjectId(project.id);
      expect(getActiveProjectId()).toBe(project.id);
      deleteProject(project.id);
      expect(getActiveProjectId()).toBeNull();
    });
  });

  describe("active project", () => {
    it("can set and get active project id", () => {
      setActiveProjectId("abc123");
      expect(getActiveProjectId()).toBe("abc123");
    });

    it("returns null when no active project", () => {
      expect(getActiveProjectId()).toBeNull();
    });

    it("can clear active project", () => {
      setActiveProjectId("abc123");
      setActiveProjectId(null);
      expect(getActiveProjectId()).toBeNull();
    });
  });

  describe("getProjectList", () => {
    it("returns empty array when no projects exist", () => {
      expect(getProjectList()).toEqual([]);
    });

    it("returns all projects sorted by creation order", () => {
      const p1 = createProject("First");
      const p2 = createProject("Second");
      const p3 = createProject("Third");
      const list = getProjectList();
      expect(list).toHaveLength(3);
      expect(list[0].id).toBe(p1.id);
      expect(list[1].id).toBe(p2.id);
      expect(list[2].id).toBe(p3.id);
    });
  });
});