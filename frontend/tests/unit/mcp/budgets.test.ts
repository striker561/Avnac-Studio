import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  MCP_BRIDGE_TIMEOUT_MS,
  MCP_OPERATION_BUDGETS_MS,
  budgetFor,
  isOverBudget,
} from "@/lib/mcp/budgets";

const budgetsJson = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "../scripts/mcp-perf/budgets.json"),
    "utf8",
  ),
) as Record<string, number>;

describe("MCP latency budgets", () => {
  it("keeps the runtime table identical to the harness file", () => {
    expect(budgetsJson).toEqual(MCP_OPERATION_BUDGETS_MS);
  });

  it("has a positive budget below the bridge ceiling for every action", () => {
    for (const [action, budget] of Object.entries(MCP_OPERATION_BUDGETS_MS)) {
      expect(budget, action).toBeGreaterThan(0);
      expect(budget, action).toBeLessThanOrEqual(MCP_BRIDGE_TIMEOUT_MS);
    }
  });

  it("looks budgets up and flags overshoots", () => {
    expect(budgetFor("render_elements")).toBe(2000);
    expect(budgetFor("not_a_tool")).toBeUndefined();
    expect(isOverBudget("render_elements", 1999)).toBe(false);
    expect(isOverBudget("render_elements", 2001)).toBe(true);
    expect(isOverBudget("not_a_tool", 999999)).toBe(false);
  });
});
