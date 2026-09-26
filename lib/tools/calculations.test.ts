import { describe, expect, it } from "vitest";
import {
  addToDate,
  calculateAge,
  calculateLoan,
  calculatePercentage,
  calculateTip,
  convertUnit,
  daysBetween,
  daysUntilBirthday,
} from "./calculations";

describe("supporting calculator functions", () => {
  it("calculates an age with years, months, and days", () => {
    expect(calculateAge("2000-01-15", "2026-09-26")).toEqual({ years: 26, months: 8, days: 11 });
  });

  it("calculates percentage modes", () => {
    expect(calculatePercentage("percentOf", 20, 150)).toBe(30);
    expect(calculatePercentage("whatPercent", 30, 150)).toBe(20);
    expect(calculatePercentage("change", 80, 100)).toBe(25);
  });

  it("calculates amortized monthly loan payments", () => {
    const result = calculateLoan(200000, 6, 30);
    expect(result.monthlyPayment).toBeCloseTo(1199.1, 1);
    expect(result.totalPayment).toBeCloseTo(431676, -1);
  });

  it("adds dates and counts days between dates", () => {
    expect(addToDate("2026-09-26", 10)).toBe("2026-10-06");
    expect(daysBetween("2026-09-26", "2026-10-06")).toBe(10);
  });

  it("converts common units", () => {
    expect(convertUnit("length", 1, "kilometre", "metre")).toBe(1000);
    expect(convertUnit("temperature", 32, "fahrenheit", "celsius")).toBeCloseTo(0);
  });

  it("splits a bill including tip", () => {
    expect(calculateTip(100, 20, 4)).toEqual({ tip: 20, total: 120, perPerson: 30 });
  });

  it("finds the next birthday", () => {
    expect(daysUntilBirthday("1990-10-01", "2026-09-26")).toEqual({ days: 5, nextBirthday: "2026-10-01" });
  });
});
