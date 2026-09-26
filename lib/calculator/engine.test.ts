import { describe, expect, it } from "vitest";
import {
  calculatorReducer,
  initialCalculatorState,
  type CalculatorAction,
  type CalculatorState,
} from "./engine";

function run(actions: CalculatorAction[]): CalculatorState {
  return actions.reduce(calculatorReducer, initialCalculatorState);
}

describe("calculator engine", () => {
  it("calculates chained arithmetic", () => {
    const result = run([
      { type: "digit", value: "8" },
      { type: "operator", value: "+" },
      { type: "digit", value: "2" },
      { type: "operator", value: "×" },
      { type: "digit", value: "3" },
      { type: "equals" },
    ]);
    expect(result.display).toBe("30");
    expect(result.expression).toBe("8 + 2 × 3 =");
  });

  it("uses contextual percentages", () => {
    const result = run([
      { type: "digit", value: "2" },
      { type: "digit", value: "0" },
      { type: "digit", value: "0" },
      { type: "operator", value: "+" },
      { type: "digit", value: "1" },
      { type: "digit", value: "0" },
      { type: "percent" },
      { type: "equals" },
    ]);
    expect(result.display).toBe("220");
    expect(result.expression).toBe("200 + 10% =");
  });

  it("shows the expression while input is still in progress", () => {
    const result = run([
      { type: "digit", value: "4" },
      { type: "digit", value: "2" },
      { type: "operator", value: "÷" },
      { type: "digit", value: "7" },
    ]);
    expect(result.expression).toBe("42 ÷ 7");
    expect(result.display).toBe("7");
  });

  it("repeats the previous operation when equals is pressed again", () => {
    const result = run([
      { type: "digit", value: "5" },
      { type: "operator", value: "+" },
      { type: "digit", value: "2" },
      { type: "equals" },
      { type: "equals" },
    ]);
    expect(result.display).toBe("9");
  });

  it("stores, adds, subtracts, and recalls memory", () => {
    const result = run([
      { type: "digit", value: "8" },
      { type: "memory", value: "M+" },
      { type: "clear" },
      { type: "digit", value: "3" },
      { type: "memory", value: "M-" },
      { type: "clear" },
      { type: "memory", value: "MR" },
    ]);
    expect(result.display).toBe("5");
    expect(result.memory).toBe(5);
  });

  it("supports degree-based scientific functions", () => {
    const result = run([
      { type: "digit", value: "3" },
      { type: "digit", value: "0" },
      { type: "scientific", value: "sin" },
    ]);
    expect(result.display).toBe("0.5");
  });

  it("shows an error for division by zero and recovers on digit input", () => {
    const errored = run([
      { type: "digit", value: "8" },
      { type: "operator", value: "÷" },
      { type: "digit", value: "0" },
      { type: "equals" },
    ]);
    expect(errored.display).toBe("Error");

    const recovered = calculatorReducer(errored, { type: "digit", value: "4" });
    expect(recovered.display).toBe("4");
  });
});
