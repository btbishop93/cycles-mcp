import { describe, expect, it } from "vitest";
import {
  CycleConfigSchema,
  formatCycleDuration,
  parseDuration,
  simpleTierToGranular,
} from "../types.js";

describe("types", () => {
  describe("parseDuration", () => {
    it("should parse 0.5h", () => {
      expect(parseDuration("0.5h")).toBe(0.5);
    });

    it("should parse 1h", () => {
      expect(parseDuration("1h")).toBe(1);
    });

    it("should parse 2h", () => {
      expect(parseDuration("2h")).toBe(2);
    });

    it("should parse 4h", () => {
      expect(parseDuration("4h")).toBe(4);
    });

    it("should parse 8h", () => {
      expect(parseDuration("8h")).toBe(8);
    });
  });

  describe("formatCycleDuration", () => {
    it("should format 1 week", () => {
      expect(formatCycleDuration({ unit: "weeks", value: 1 })).toBe("1 week");
    });

    it("should format 2 weeks", () => {
      expect(formatCycleDuration({ unit: "weeks", value: 2 })).toBe("2 weeks");
    });

    it("should format 1 month", () => {
      expect(formatCycleDuration({ unit: "months", value: 1 })).toBe("1 month");
    });

    it("should format 2 months", () => {
      expect(formatCycleDuration({ unit: "months", value: 2 })).toBe(
        "2 months",
      );
    });

    it("should format 1 quarter", () => {
      expect(formatCycleDuration({ unit: "quarters", value: 1 })).toBe(
        "1 quarter (3 months)",
      );
    });
  });

  describe("simpleTierToGranular", () => {
    it("should map junior tier", () => {
      const result = simpleTierToGranular("junior");
      expect(result).toEqual({
        difficulty: "junior",
        duration: "1h",
        detailLevel: "high",
      });
    });

    it("should map mid tier", () => {
      const result = simpleTierToGranular("mid");
      expect(result).toEqual({
        difficulty: "mid",
        duration: "2h",
        detailLevel: "medium",
      });
    });

    it("should map senior tier", () => {
      const result = simpleTierToGranular("senior");
      expect(result).toEqual({
        difficulty: "senior",
        duration: "4h",
        detailLevel: "low",
      });
    });
  });

  describe("CycleConfigSchema", () => {
    it("should validate simple mode config", () => {
      const config = {
        sizing_mode: "simple",
        simple_tier: "mid",
        cycle_duration: { unit: "weeks", value: 2 },
        hours_per_cycle: 16,
      };
      const result = CycleConfigSchema.parse(config);
      expect(result.sizing_mode).toBe("simple");
      expect(result.simple_tier).toBe("mid");
    });

    it("should validate granular mode config", () => {
      const config = {
        sizing_mode: "granular",
        difficulty: "senior",
        task_duration: "4h",
        detail_level: "low",
        cycle_duration: { unit: "months", value: 1 },
        hours_per_cycle: 40,
      };
      const result = CycleConfigSchema.parse(config);
      expect(result.sizing_mode).toBe("granular");
      expect(result.difficulty).toBe("senior");
    });

    it("should reject invalid sizing mode", () => {
      const config = {
        sizing_mode: "invalid",
        cycle_duration: { unit: "weeks", value: 2 },
        hours_per_cycle: 16,
      };
      expect(() => CycleConfigSchema.parse(config)).toThrow();
    });

    it("should reject hours_per_cycle over 500", () => {
      const config = {
        sizing_mode: "simple",
        simple_tier: "mid",
        cycle_duration: { unit: "weeks", value: 2 },
        hours_per_cycle: 501,
      };
      expect(() => CycleConfigSchema.parse(config)).toThrow();
    });
  });
});
