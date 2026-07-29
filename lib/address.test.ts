import { describe, expect, it } from "vitest";
import {
  addressesInRange,
  columnToIndex,
  indexToColumn,
  parseCellAddress,
  parseRangeAddress,
  toCellAddress,
} from "@/lib/address";

describe("cell addresses", () => {
  it("round-trips columns across the Z boundary", () => {
    expect(columnToIndex("A")).toBe(0);
    expect(columnToIndex("AA")).toBe(26);
    expect(indexToColumn(701)).toBe("ZZ");
    expect(toCellAddress(parseCellAddress("BC42"))).toBe("BC42");
  });

  it("normalizes reversed ranges", () => {
    expect(parseRangeAddress("C3:A1")).toEqual({
      start: { row: 0, column: 0 },
      end: { row: 2, column: 2 },
    });
    expect(addressesInRange("A1:B2")).toEqual(["A1", "B1", "A2", "B2"]);
  });

  it("rejects unexpectedly large range expansion", () => {
    expect(() => addressesInRange("A1:Z100", 100)).toThrow(/exceeds/);
  });
});
