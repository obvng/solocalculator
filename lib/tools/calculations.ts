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
