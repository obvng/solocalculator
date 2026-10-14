import { describe, expect, it } from "vitest";
import {
  addToDate,
  addBusinessDays,
  calculateAge,
  calculateDiscount,
  calculateDiscountRate,
  calculateLoan,
  calculateNewValue,
  calculatePercentage,
  calculatePercentageChange,
  calculatePercentageOf,
  calculateTip,
  calculateTimeDuration,
  countBusinessDays,
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

  it("describes percentage increases, decreases, and unchanged values", () => {
    expect(calculatePercentageChange(80, 100)).toEqual({ percentageChange: 25, difference: 20, direction: "increase" });
    expect(calculatePercentageChange(100, 75)).toEqual({ percentageChange: -25, difference: -25, direction: "decrease" });
    expect(calculatePercentageChange(50, 50)).toEqual({ percentageChange: 0, difference: 0, direction: "no-change" });
  });

  it("calculates a new value from a signed percentage change", () => {
    expect(calculateNewValue(200, 15)).toBe(230);
    expect(calculateNewValue(200, -15)).toBe(170);
  });

  it("rejects percentage change when the original value is zero", () => {
    expect(() => calculatePercentageChange(0, 10)).toThrow("Original value cannot be zero");
  });

  it("calculates all three percentage-of formulas", () => {
    expect(calculatePercentageOf("percentOf", 20, 150)).toBe(30);
    expect(calculatePercentageOf("whatPercent", 30, 150)).toBe(20);
    expect(calculatePercentageOf("baseFromPercent", 30, 20)).toBe(150);
  });

  it("rejects zero denominators in percentage-of formulas", () => {
    expect(() => calculatePercentageOf("whatPercent", 30, 0)).toThrow("Base value cannot be zero");
    expect(() => calculatePercentageOf("baseFromPercent", 30, 0)).toThrow("Percentage cannot be zero");
  });

  it("calculates one discount", () => {
    expect(calculateDiscount(100, [20])).toEqual({ finalPrice: 80, amountSaved: 20, combinedRate: 20 });
  });

  it("applies stacked discounts sequentially", () => {
    expect(calculateDiscount(100, [30, 10])).toEqual({ finalPrice: 63, amountSaved: 37, combinedRate: 37 });
  });

  it("calculates a discount rate from original and final prices", () => {
    expect(calculateDiscountRate(250, 187.5)).toBe(25);
  });

  it("rejects invalid discount prices and rates", () => {
    expect(() => calculateDiscount(-1, [10])).toThrow("Price cannot be negative");
    expect(() => calculateDiscount(100, [-1])).toThrow("Discount must be between 0 and 100");
    expect(() => calculateDiscount(100, [101])).toThrow("Discount must be between 0 and 100");
    expect(() => calculateDiscountRate(0, 0)).toThrow("Original price must be greater than zero");
    expect(() => calculateDiscountRate(100, 120)).toThrow("Final price must be between zero and the original price");
  });

  it("calculates a same-day duration and deducts an unpaid break", () => {
    expect(calculateTimeDuration({ startTime: "09:00", endTime: "17:00", breakMinutes: 60 })).toEqual({
      elapsedMinutes: 480,
      paidMinutes: 420,
      hours: 7,
      minutes: 0,
      decimalHours: 7,
    });
  });

  it("treats an earlier undated end time as the following day", () => {
    expect(calculateTimeDuration({ startTime: "22:30", endTime: "01:15" }).paidMinutes).toBe(165);
  });

  it("calculates dated and multi-day durations", () => {
    expect(calculateTimeDuration({
      startTime: "22:00",
      endTime: "02:30",
      startDate: "2026-10-14",
      endDate: "2026-10-15",
    })).toEqual({ elapsedMinutes: 270, paidMinutes: 270, hours: 4, minutes: 30, decimalHours: 4.5 });

    expect(calculateTimeDuration({
      startTime: "09:00",
      endTime: "09:00",
      startDate: "2026-10-14",
      endDate: "2026-10-16",
    }).paidMinutes).toBe(2880);
  });

  it("rejects incomplete or reversed dates and oversized breaks", () => {
    expect(() => calculateTimeDuration({ startTime: "09:00", endTime: "10:00", startDate: "2026-10-14" })).toThrow("Enter both dates or leave both blank");
    expect(() => calculateTimeDuration({ startTime: "09:00", endTime: "10:00", startDate: "2026-10-15", endDate: "2026-10-14" })).toThrow("End must be after start");
    expect(() => calculateTimeDuration({ startTime: "09:00", endTime: "10:00", breakMinutes: 61 })).toThrow("Break cannot exceed the duration");
  });

  it("counts calendar, working, and weekend days inclusively", () => {
    expect(countBusinessDays("2026-10-30", "2026-11-02", "sat-sun")).toEqual({
      totalDays: 4,
      workingDays: 2,
      weekendDays: 2,
    });
  });

  it("supports Friday and Saturday weekends", () => {
    expect(countBusinessDays("2026-10-29", "2026-11-01", "fri-sat")).toEqual({
      totalDays: 4,
      workingDays: 2,
      weekendDays: 2,
    });
  });

  it("handles weekend-only ranges and leap days", () => {
    expect(countBusinessDays("2026-10-31", "2026-11-01", "sat-sun")).toEqual({ totalDays: 2, workingDays: 0, weekendDays: 2 });
    expect(countBusinessDays("2024-02-28", "2024-03-01", "sat-sun")).toEqual({ totalDays: 3, workingDays: 3, weekendDays: 0 });
  });

  it("adds working days while excluding the starting day", () => {
    expect(addBusinessDays("2026-10-30", 0, "sat-sun")).toBe("2026-10-30");
    expect(addBusinessDays("2026-10-30", 1, "sat-sun")).toBe("2026-11-02");
    expect(addBusinessDays("2026-10-30", 2, "sat-sun")).toBe("2026-11-03");
  });

  it("rejects reversed ranges and negative working-day offsets", () => {
    expect(() => countBusinessDays("2026-11-02", "2026-10-30", "sat-sun")).toThrow("End date must be on or after start date");
    expect(() => addBusinessDays("2026-10-30", -1, "sat-sun")).toThrow("Working days cannot be negative");
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
