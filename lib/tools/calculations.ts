export interface AgeResult { years: number; months: number; days: number }
export interface LoanResult { monthlyPayment: number; totalPayment: number; totalInterest: number }
export interface TipResult { tip: number; total: number; perPerson: number }

function parseDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function calculateAge(birthValue: string, onValue: string): AgeResult {
  const birth = parseDate(birthValue);
  const on = parseDate(onValue);
  if (birth > on) throw new Error("Birth date must be before the comparison date.");
  let years = on.getUTCFullYear() - birth.getUTCFullYear();
  let months = on.getUTCMonth() - birth.getUTCMonth();
  let days = on.getUTCDate() - birth.getUTCDate();
  if (days < 0) {
    months -= 1;
    days += new Date(Date.UTC(on.getUTCFullYear(), on.getUTCMonth(), 0)).getUTCDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

export type PercentageMode = "percentOf" | "whatPercent" | "change";
export function calculatePercentage(mode: PercentageMode, first: number, second: number): number {
  if (mode === "percentOf") return first / 100 * second;
  if (second === 0 || (mode === "change" && first === 0)) throw new Error("The base value cannot be zero.");
  if (mode === "whatPercent") return first / second * 100;
  return (second - first) / first * 100;
}

export interface PercentageChangeResult {
  percentageChange: number;
  difference: number;
  direction: "increase" | "decrease" | "no-change";
}

export function calculatePercentageChange(original: number, next: number): PercentageChangeResult {
  if (original === 0) throw new Error("Original value cannot be zero.");
  const difference = next - original;
  return {
    percentageChange: difference / Math.abs(original) * 100,
    difference,
    direction: difference > 0 ? "increase" : difference < 0 ? "decrease" : "no-change",
  };
}

export function calculateNewValue(original: number, percentageChange: number): number {
  return original + original * percentageChange / 100;
}

export type PercentageOfMode = "percentOf" | "whatPercent" | "baseFromPercent";

export function calculatePercentageOf(mode: PercentageOfMode, first: number, second: number): number {
  if (mode === "percentOf") return first / 100 * second;
  if (mode === "whatPercent") {
    if (second === 0) throw new Error("Base value cannot be zero.");
    return first / second * 100;
  }
  if (second === 0) throw new Error("Percentage cannot be zero.");
  return first / (second / 100);
}

export interface DiscountResult {
  finalPrice: number;
  amountSaved: number;
  combinedRate: number;
}

export function calculateDiscount(originalPrice: number, discounts: number[]): DiscountResult {
  if (originalPrice < 0) throw new Error("Price cannot be negative.");
  if (discounts.some((discount) => discount < 0 || discount > 100)) {
    throw new Error("Discount must be between 0 and 100.");
  }
  const finalPrice = discounts.reduce((price, discount) => price * (1 - discount / 100), originalPrice);
  const amountSaved = originalPrice - finalPrice;
  const combinedRate = originalPrice === 0 ? 0 : amountSaved / originalPrice * 100;
  return { finalPrice, amountSaved, combinedRate };
}

export function calculateDiscountRate(originalPrice: number, finalPrice: number): number {
  if (originalPrice <= 0) throw new Error("Original price must be greater than zero.");
  if (finalPrice < 0 || finalPrice > originalPrice) {
    throw new Error("Final price must be between zero and the original price.");
  }
  return (originalPrice - finalPrice) / originalPrice * 100;
}

export interface TimeDurationInput {
  startTime: string;
  endTime: string;
  startDate?: string;
  endDate?: string;
  breakMinutes?: number;
}

export interface TimeDurationResult {
  elapsedMinutes: number;
  paidMinutes: number;
  hours: number;
  minutes: number;
  decimalHours: number;
}

function parseClock(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Enter a valid time.");
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new Error("Enter a valid time.");
  return hours * 60 + minutes;
}

export function calculateTimeDuration(input: TimeDurationInput): TimeDurationResult {
  const startMinutes = parseClock(input.startTime);
  const endMinutes = parseClock(input.endTime);
  const hasStartDate = Boolean(input.startDate);
  const hasEndDate = Boolean(input.endDate);
  if (hasStartDate !== hasEndDate) throw new Error("Enter both dates or leave both blank.");

  let elapsedMinutes: number;
  if (input.startDate && input.endDate) {
    elapsedMinutes = daysBetween(input.startDate, input.endDate) * 1440 + endMinutes - startMinutes;
    if (elapsedMinutes < 0) throw new Error("End must be after start.");
  } else {
    elapsedMinutes = endMinutes - startMinutes;
    if (elapsedMinutes < 0) elapsedMinutes += 1440;
  }

  const breakMinutes = input.breakMinutes ?? 0;
  if (!Number.isFinite(breakMinutes) || breakMinutes < 0) throw new Error("Break cannot be negative.");
  if (breakMinutes > elapsedMinutes) throw new Error("Break cannot exceed the duration.");
  const paidMinutes = elapsedMinutes - breakMinutes;
  return {
    elapsedMinutes,
    paidMinutes,
    hours: Math.floor(paidMinutes / 60),
    minutes: paidMinutes % 60,
    decimalHours: paidMinutes / 60,
  };
}

export type WeekendDefinition = "sat-sun" | "fri-sat";

export interface BusinessDayCount {
  totalDays: number;
  workingDays: number;
  weekendDays: number;
}

function isWeekend(date: Date, weekend: WeekendDefinition): boolean {
  const day = date.getUTCDay();
  return weekend === "sat-sun" ? day === 0 || day === 6 : day === 5 || day === 6;
}

export function countBusinessDays(startValue: string, endValue: string, weekend: WeekendDefinition): BusinessDayCount {
  const difference = daysBetween(startValue, endValue);
  if (difference < 0) throw new Error("End date must be on or after start date.");
  const cursor = parseDate(startValue);
  let workingDays = 0;
  let weekendDays = 0;
  for (let offset = 0; offset <= difference; offset += 1) {
    if (isWeekend(cursor, weekend)) weekendDays += 1;
    else workingDays += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return { totalDays: difference + 1, workingDays, weekendDays };
}

export function addBusinessDays(startValue: string, workingDays: number, weekend: WeekendDefinition): string {
  if (!Number.isInteger(workingDays) || workingDays < 0) throw new Error("Working days cannot be negative.");
  if (workingDays === 0) return startValue;
  const cursor = parseDate(startValue);
  let added = 0;
  while (added < workingDays) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (!isWeekend(cursor, weekend)) added += 1;
  }
  return isoDate(cursor);
}

export function calculateLoan(principal: number, annualRate: number, years: number): LoanResult {
  if (principal <= 0 || annualRate < 0 || years <= 0) throw new Error("Enter positive loan values.");
  const payments = years * 12;
  const rate = annualRate / 1200;
  const monthlyPayment = rate === 0 ? principal / payments : principal * rate * (1 + rate) ** payments / ((1 + rate) ** payments - 1);
  const totalPayment = monthlyPayment * payments;
  return { monthlyPayment, totalPayment, totalInterest: totalPayment - principal };
}

export function addToDate(value: string, days: number): string {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

export function daysBetween(first: string, second: string): number {
  return Math.round((parseDate(second).getTime() - parseDate(first).getTime()) / 86_400_000);
}

const linearUnits = {
  length: { metre: 1, kilometre: 1000, centimetre: 0.01, mile: 1609.344, foot: 0.3048, inch: 0.0254 },
  weight: { kilogram: 1, gram: 0.001, pound: 0.45359237, ounce: 0.028349523125 },
  volume: { litre: 1, millilitre: 0.001, gallon: 3.785411784, cup: 0.2365882365 },
} as const;

export type UnitCategory = keyof typeof linearUnits | "temperature";

export function convertUnit(category: UnitCategory, value: number, from: string, to: string): number {
  if (category === "temperature") {
    const celsius = from === "celsius" ? value : from === "fahrenheit" ? (value - 32) * 5 / 9 : value - 273.15;
    return to === "celsius" ? celsius : to === "fahrenheit" ? celsius * 9 / 5 + 32 : celsius + 273.15;
  }
  const units = linearUnits[category] as Record<string, number>;
  if (!(from in units) || !(to in units)) throw new Error("Choose compatible units.");
  return value * units[from] / units[to];
}

export const unitOptions: Record<UnitCategory, string[]> = {
  length: Object.keys(linearUnits.length),
  weight: Object.keys(linearUnits.weight),
  volume: Object.keys(linearUnits.volume),
  temperature: ["celsius", "fahrenheit", "kelvin"],
};

export function calculateTip(bill: number, percentage: number, people: number): TipResult {
  if (bill < 0 || percentage < 0 || people < 1) throw new Error("Enter a valid bill and number of people.");
  const tip = bill * percentage / 100;
  const total = bill + tip;
  return { tip, total, perPerson: total / people };
}

export function daysUntilBirthday(birthValue: string, todayValue: string): { days: number; nextBirthday: string } {
  const birth = parseDate(birthValue);
  const today = parseDate(todayValue);
  let next = new Date(Date.UTC(today.getUTCFullYear(), birth.getUTCMonth(), birth.getUTCDate()));
  if (next < today) next = new Date(Date.UTC(today.getUTCFullYear() + 1, birth.getUTCMonth(), birth.getUTCDate()));
  return { days: daysBetween(todayValue, isoDate(next)), nextBirthday: isoDate(next) };
}
