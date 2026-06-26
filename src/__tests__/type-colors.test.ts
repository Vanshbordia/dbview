import { describe, it, expect } from "vitest";
import { getTypeColor, simplifyType } from "#/lib/type-colors.ts";

describe("getTypeColor", () => {
  it("returns a color for INTEGER", () => {
    const color = getTypeColor("INTEGER");
    expect(color).toContain("bg-sky-100");
    expect(color).toContain("text-sky-800");
  });

  it("returns a color for VARCHAR", () => {
    const color = getTypeColor("VARCHAR");
    expect(color).toContain("bg-emerald-100");
  });

  it("returns a color for types with parameters", () => {
    const color = getTypeColor("VARCHAR(255)");
    expect(color).toContain("bg-emerald-100");
  });

  it("returns a fallback color for unknown types", () => {
    const color = getTypeColor("CUSTOM_TYPE");
    expect(color).toContain("bg-zinc-100");
  });

  it("is case-insensitive", () => {
    const upper = getTypeColor("INTEGER");
    const lower = getTypeColor("integer");
    expect(upper).toBe(lower);
  });

  it("handles ClickHouse types", () => {
    expect(getTypeColor("UInt64")).toContain("bg-sky-100");
    expect(getTypeColor("String")).toContain("bg-emerald-100");
    expect(getTypeColor("Nullable(String)")).toContain("bg-zinc-100");
  });
});

describe("simplifyType", () => {
  it("returns simple types unchanged", () => {
    expect(simplifyType("INTEGER")).toBe("INTEGER");
    expect(simplifyType("TEXT")).toBe("TEXT");
  });

  it("strips parameterised types", () => {
    expect(simplifyType("VARCHAR(255)")).toBe("VARCHAR");
    expect(simplifyType("DECIMAL(10,2)")).toBe("DECIMAL");
  });

  it("unwraps Nullable wrapper", () => {
    expect(simplifyType("Nullable(String)")).toBe("String");
    expect(simplifyType("Nullable(Int64)")).toBe("Int64");
  });

  it("unwraps LowCardinality wrapper", () => {
    expect(simplifyType("LowCardinality(String)")).toBe("String");
  });

  it("unwraps nested wrappers", () => {
    expect(simplifyType("Nullable(LowCardinality(String))")).toBe("String");
  });
});