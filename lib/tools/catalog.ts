import {
  calculateAge,
  calculateDiscount,
  calculatePercentageChange,
  calculatePercentageOf,
  calculateTimeDuration,
  countBusinessDays,
} from "./calculations";

export type ToolKind = "calculator" | "scientific" | "age" | "percentage" | "loan" | "date" | "unit" | "currency" | "tip" | "birthday" | "percentage-increase" | "percentage-of" | "discount" | "time-duration" | "business-days";

export interface ToolDefinition {
  slug: string;
  kind: ToolKind;
  title: string;
  heading: string;
  shortTitle: string;
  description: string;
  intro: string;
  example: (currentDate: string) => string;
  accent: "blue" | "coral" | "mint" | "lilac" | "yellow";
  relatedSlugs: [string, string, string];
}

const catalog: ToolDefinition[] = [
  { slug: "scientific-calculator", kind: "scientific", title: "Scientific calculator", heading: "Scientific calculator", shortTitle: "Scientific", description: "Calculate trigonometry, powers, roots and logarithms online.", intro: "Use scientific functions in degrees or radians without leaving the main calculator.", example: () => "Example: enter 30, then choose sin to calculate 0.5 in degree mode.", accent: "lilac", relatedSlugs: ["unit-converter", "percentage-calculator", "percentage-of-calculator"] },
  { slug: "age-calculator", kind: "age", title: "Age calculator", heading: "Age calculator", shortTitle: "Age", description: "Calculate your exact age in years, months and days.", intro: "Choose a birth date and a comparison date to find the exact time between them.", example: ageExample, accent: "blue", relatedSlugs: ["birthday-countdown", "date-calculator", "business-days-calculator"] },
  { slug: "percentage-calculator", kind: "percentage", title: "Percentage calculator", heading: "Percentage calculator", shortTitle: "Percentage", description: "Calculate percentages, percentage shares and percentage change.", intro: "Choose the calculation you need, enter two values and get the result immediately.", example: () => "Example: 20% of 150 is 30.", accent: "coral", relatedSlugs: ["percentage-of-calculator", "percentage-increase-calculator", "discount-calculator"] },
  { slug: "loan-calculator", kind: "loan", title: "Loan calculator", heading: "Loan calculator", shortTitle: "Loan", description: "Estimate monthly loan payments, total repayment and interest.", intro: "Enter the loan amount, annual interest rate and term. This estimate uses monthly amortized payments.", example: () => "Example: a 200,000 loan at 6% for 30 years costs about 1,199.10 per month.", accent: "mint", relatedSlugs: ["percentage-calculator", "discount-calculator", "tip-calculator"] },
  { slug: "date-calculator", kind: "date", title: "Date calculator", heading: "Date calculator", shortTitle: "Date", description: "Add days to a date or count the days between two dates.", intro: "Use one date and an offset, or compare two dates to measure the gap between them.", example: () => "Example: 10 days after 26 September 2026 is 6 October 2026.", accent: "lilac", relatedSlugs: ["business-days-calculator", "time-duration-calculator", "age-calculator"] },
  { slug: "unit-converter", kind: "unit", title: "Unit converter", heading: "Unit converter", shortTitle: "Unit", description: "Convert length, weight, volume and temperature units.", intro: "Select a category and convert between common metric, imperial and US units.", example: () => "Example: 1 kilometre equals 1,000 metres.", accent: "yellow", relatedSlugs: ["currency-converter", "scientific-calculator", "time-duration-calculator"] },
  { slug: "currency-converter", kind: "currency", title: "Currency converter", heading: "Currency converter", shortTitle: "Currency", description: "Convert currencies using the latest available reference exchange rate.", intro: "Rates come from Frankfurter and are based on central-bank reference data. They are not trading quotes.", example: () => "Example: choose USD and NGN to convert using the latest available published rate.", accent: "mint", relatedSlugs: ["unit-converter", "discount-calculator", "percentage-calculator"] },
  { slug: "tip-calculator", kind: "tip", title: "Tip calculator", heading: "Tip calculator", shortTitle: "Tip", description: "Calculate a tip, the bill total and each person's share.", intro: "Enter the bill, tip percentage and number of people to split the total fairly.", example: () => "Example: a 20% tip on 100 makes a total of 120, or 30 each for four people.", accent: "blue", relatedSlugs: ["percentage-of-calculator", "discount-calculator", "percentage-calculator"] },
  { slug: "birthday-countdown", kind: "birthday", title: "Birthday countdown", heading: "Birthday countdown", shortTitle: "Birthday", description: "Count the days until the next birthday.", intro: "Choose a birth date to see the next birthday date and how many days remain.", example: () => "Example: from 26 September, a 1 October birthday is 5 days away.", accent: "coral", relatedSlugs: ["age-calculator", "date-calculator", "business-days-calculator"] },
  { slug: "percentage-increase-calculator", kind: "percentage-increase", title: "Percentage Increase Calculator: Work Out % Change", heading: "Percentage increase calculator", shortTitle: "Percentage change", description: "Calculate a percentage increase or decrease, find the absolute difference, or apply a percentage change to an original value.", intro: "Compare an original and new value, or start with a value and apply a positive or negative percentage change.", example: percentageIncreaseExample, accent: "coral", relatedSlugs: ["percentage-of-calculator", "percentage-calculator", "discount-calculator"] },
  { slug: "percentage-of-calculator", kind: "percentage-of", title: "Percentage Calculator: What Percent of What Number", heading: "Percentage of calculator", shortTitle: "Percentage of", description: "Find a percentage of a number, what percentage one number is of another, or the whole number behind a percentage.", intro: "Use all three common percentage formulas on one page. Each row updates as soon as its values change.", example: percentageOfExample, accent: "blue", relatedSlugs: ["percentage-increase-calculator", "discount-calculator", "percentage-calculator"] },
  { slug: "discount-calculator", kind: "discount", title: "Discount Calculator: Sale Price and How Much You Save", heading: "Discount calculator", shortTitle: "Discount", description: "Calculate a sale price, amount saved, stacked discount rate, or the discount between an original and final price.", intro: "Enter one discount or stack several reductions to see the true combined rate, final price and total saving.", example: discountExample, accent: "yellow", relatedSlugs: ["percentage-of-calculator", "percentage-increase-calculator", "tip-calculator"] },
  { slug: "time-duration-calculator", kind: "time-duration", title: "Time Duration Calculator: Hours Between Two Times", heading: "Time duration calculator", shortTitle: "Time duration", description: "Calculate hours and minutes between two times, cross midnight, include dates, and subtract an unpaid break.", intro: "Choose start and end times, add dates for longer spans if needed, and deduct an optional unpaid break.", example: timeDurationExample, accent: "lilac", relatedSlugs: ["business-days-calculator", "date-calculator", "scientific-calculator"] },
  { slug: "business-days-calculator", kind: "business-days", title: "Business Days Calculator: Working Days Between Dates", heading: "Business days calculator", shortTitle: "Business days", description: "Count working days and weekend days between dates, or add working days using Saturday-Sunday or Friday-Saturday weekends.", intro: "Count an inclusive date range or find a future date after a chosen number of working days without assuming one weekend pattern.", example: businessDaysExample, accent: "mint", relatedSlugs: ["date-calculator", "time-duration-calculator", "age-calculator"] },
];

const consolidatedPercentageSlugs = new Set(["percentage-of-calculator", "percentage-increase-calculator"]);
export const tools: ToolDefinition[] = catalog.filter((tool) => !consolidatedPercentageSlugs.has(tool.slug)).map((tool) => ({
  ...tool,
  relatedSlugs: [...new Set(tool.relatedSlugs.map((slug) => consolidatedPercentageSlugs.has(slug) ? "percentage-calculator" : slug))]
    .filter((slug) => slug !== tool.slug)
    .concat(["discount-calculator", "tip-calculator", "scientific-calculator"].filter((slug) => slug !== tool.slug && !tool.relatedSlugs.includes(slug)))
    .filter((slug, index, all) => all.indexOf(slug) === index).slice(0, 3) as [string, string, string],
}));
export const toolBySlug = new Map(tools.map((tool) => [tool.slug, tool]));

function ageExample(currentDate: string): string {
  const birthDate = "2000-01-15";
  const result = calculateAge(birthDate, currentDate);
  const formattedDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${currentDate}T00:00:00Z`));
  return `Example: a birth date of 15 January 2000 is ${result.years} years, ${result.months} months and ${result.days} days before ${formattedDate}.`;
}

function percentageIncreaseExample(): string {
  const result = calculatePercentageChange(80, 100);
  return `Example: moving from 80 to 100 is a ${result.percentageChange}% increase, with an absolute difference of ${result.difference}.`;
}

function percentageOfExample(): string {
  return `Example: 20% of 150 is ${calculatePercentageOf("percentOf", 20, 150)}.`;
}

function discountExample(): string {
  const result = calculateDiscount(100, [30, 10]);
  return `Example: discounts of 30% then 10% reduce 100 to ${result.finalPrice}, a true combined discount of ${result.combinedRate}%.`;
}

function timeDurationExample(): string {
  const result = calculateTimeDuration({ startTime: "22:30", endTime: "01:15" });
  return `Example: 22:30 to 01:15 crosses midnight and lasts ${Math.floor(result.paidMinutes / 60)} hours ${result.paidMinutes % 60} minutes.`;
}

function businessDaysExample(): string {
  const result = countBusinessDays("2026-10-12", "2026-10-16", "sat-sun");
  return `Example: 12 to 16 October 2026 contains ${result.totalDays} total days and ${result.workingDays} working days with a Saturday-Sunday weekend.`;
}
