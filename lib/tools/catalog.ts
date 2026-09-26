export type ToolKind = "calculator" | "scientific" | "age" | "percentage" | "loan" | "date" | "unit" | "currency" | "tip" | "birthday";

export interface ToolDefinition {
  slug: string;
  kind: ToolKind;
  title: string;
  shortTitle: string;
  description: string;
  intro: string;
  example: string;
  accent: "blue" | "coral" | "mint" | "lilac" | "yellow";
}

export const tools: ToolDefinition[] = [
  { slug: "calculator", kind: "calculator", title: "Online calculator", shortTitle: "Calculator", description: "A free online calculator for quick everyday arithmetic.", intro: "Add, subtract, multiply, divide and work with percentages. Use the buttons or your keyboard.", example: "Example: enter 200 + 10% to calculate 220.", accent: "blue" },
  { slug: "scientific-calculator", kind: "scientific", title: "Scientific calculator", shortTitle: "Scientific", description: "Calculate trigonometry, powers, roots and logarithms online.", intro: "Use scientific functions in degrees or radians without leaving the main calculator.", example: "Example: enter 30, then choose sin to calculate 0.5 in degree mode.", accent: "lilac" },
  { slug: "age-calculator", kind: "age", title: "Age calculator", shortTitle: "Age", description: "Calculate your exact age in years, months and days.", intro: "Choose a birth date and a comparison date to find the exact time between them.", example: "Example: a birth date of 15 January 2000 is 26 years, 8 months and 11 days before 26 September 2026.", accent: "blue" },
  { slug: "percentage-calculator", kind: "percentage", title: "Percentage calculator", shortTitle: "Percentage", description: "Calculate percentages, percentage shares and percentage change.", intro: "Choose the calculation you need, enter two values and get the result immediately.", example: "Example: 20% of 150 is 30.", accent: "coral" },
  { slug: "loan-calculator", kind: "loan", title: "Loan calculator", shortTitle: "Loan", description: "Estimate monthly loan payments, total repayment and interest.", intro: "Enter the loan amount, annual interest rate and term. This estimate uses monthly amortized payments.", example: "Example: a 200,000 loan at 6% for 30 years costs about 1,199.10 per month.", accent: "mint" },
  { slug: "date-calculator", kind: "date", title: "Date calculator", shortTitle: "Date", description: "Add days to a date or count the days between two dates.", intro: "Use one date and an offset, or compare two dates to measure the gap between them.", example: "Example: 10 days after 26 September 2026 is 6 October 2026.", accent: "lilac" },
  { slug: "unit-converter", kind: "unit", title: "Unit converter", shortTitle: "Unit", description: "Convert length, weight, volume and temperature units.", intro: "Select a category and convert between common metric, imperial and US units.", example: "Example: 1 kilometre equals 1,000 metres.", accent: "yellow" },
  { slug: "currency-converter", kind: "currency", title: "Currency converter", shortTitle: "Currency", description: "Convert currencies using the latest available reference exchange rate.", intro: "Rates come from Frankfurter and are based on central-bank reference data. They are not trading quotes.", example: "Example: choose USD and NGN to convert using the latest available published rate.", accent: "mint" },
  { slug: "tip-calculator", kind: "tip", title: "Tip calculator", shortTitle: "Tip", description: "Calculate a tip, the bill total and each person's share.", intro: "Enter the bill, tip percentage and number of people to split the total fairly.", example: "Example: a 20% tip on 100 makes a total of 120, or 30 each for four people.", accent: "blue" },
  { slug: "birthday-countdown", kind: "birthday", title: "Birthday countdown", shortTitle: "Birthday", description: "Count the days until the next birthday.", intro: "Choose a birth date to see the next birthday date and how many days remain.", example: "Example: from 26 September, a 1 October birthday is 5 days away.", accent: "coral" },
];

export const toolBySlug = new Map(tools.map((tool) => [tool.slug, tool]));
