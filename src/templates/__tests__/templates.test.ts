import { describe, expect, it } from "vitest";
import {
  generateProgressBar,
  getCurrentDate,
  loadTemplate,
  padNumber,
  replaceTemplateVars,
  TemplateType,
} from "../index.js";

describe("templates", () => {
  describe("loadTemplate", () => {
    it("should load workflow template", async () => {
      const template = await loadTemplate(TemplateType.WORKFLOW);
      expect(template).toContain("# Development Workflow");
      expect(template).toContain("## Cycle-Based Development");
    });

    it("should load cycles template", async () => {
      const template = await loadTemplate(TemplateType.CYCLES);
      expect(template).toContain("# Development Cycles");
      expect(template).toContain("{{CURRENT_CYCLE}}");
    });

    it("should load cycle readme template", async () => {
      const template = await loadTemplate(TemplateType.CYCLE_README);
      expect(template).toContain("# Cycle {{CYCLE_NUMBER}}");
      expect(template).toContain("{{CYCLE_NAME}}");
    });

    it("should load task template", async () => {
      const template = await loadTemplate(TemplateType.TASK);
      expect(template).toContain("# Task {{TASK_NUMBER}}");
      expect(template).toContain("{{TASK_TITLE}}");
    });

    it("should load PR template", async () => {
      const template = await loadTemplate(TemplateType.PR);
      expect(template).toContain("## Task");
      expect(template).toContain("## Changes");
    });
  });

  describe("replaceTemplateVars", () => {
    it("should replace single variable", () => {
      const template = "Hello {{NAME}}!";
      const result = replaceTemplateVars(template, { NAME: "World" });
      expect(result).toBe("Hello World!");
    });

    it("should replace multiple variables", () => {
      const template = "{{GREETING}} {{NAME}}!";
      const result = replaceTemplateVars(template, {
        GREETING: "Hello",
        NAME: "World",
      });
      expect(result).toBe("Hello World!");
    });

    it("should replace repeated variables", () => {
      const template = "{{NAME}} meets {{NAME}}";
      const result = replaceTemplateVars(template, { NAME: "Alice" });
      expect(result).toBe("Alice meets Alice");
    });

    it("should leave unreplaced variables as-is", () => {
      const template = "{{GREETING}} {{NAME}}!";
      const result = replaceTemplateVars(template, { GREETING: "Hello" });
      expect(result).toBe("Hello {{NAME}}!");
    });
  });

  describe("getCurrentDate", () => {
    it("should return date in YYYY-MM-DD format", () => {
      const date = getCurrentDate();
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("padNumber", () => {
    it("should pad single digit to specified length", () => {
      expect(padNumber(1, 2)).toBe("01");
      expect(padNumber(1, 3)).toBe("001");
    });

    it("should not pad if already at length", () => {
      expect(padNumber(10, 2)).toBe("10");
      expect(padNumber(100, 3)).toBe("100");
    });

    it("should handle zero", () => {
      expect(padNumber(0, 2)).toBe("00");
    });
  });

  describe("generateProgressBar", () => {
    it("should show 0% for no completion", () => {
      const bar = generateProgressBar(0, 10);
      expect(bar).toContain("0%");
      expect(bar).toContain("░░░░░░░░░░░░░░░░░░░░");
    });

    it("should show 100% for full completion", () => {
      const bar = generateProgressBar(10, 10);
      expect(bar).toContain("100%");
      expect(bar).toContain("████████████████████");
    });

    it("should show 50% for half completion", () => {
      const bar = generateProgressBar(5, 10);
      expect(bar).toContain("50%");
    });

    it("should handle zero total", () => {
      const bar = generateProgressBar(0, 0);
      expect(bar).toContain("0%");
    });
  });
});
