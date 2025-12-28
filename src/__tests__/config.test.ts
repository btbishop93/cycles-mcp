import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultConfig } from "../config.js";

// Mock fs/promises
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  access: vi.fn(),
}));

describe("config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDefaultConfig", () => {
    it("should return default configuration", () => {
      const config = getDefaultConfig();

      expect(config.sizing_mode).toBe("simple");
      expect(config.simple_tier).toBe("mid");
      expect(config.cycle_duration).toEqual({
        unit: "weeks",
        value: 1,
      });
      expect(config.hours_per_cycle).toBe(8);
    });
  });
});
