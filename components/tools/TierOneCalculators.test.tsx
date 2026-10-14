import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  BusinessDaysCalculator,
  DiscountCalculator,
  PercentageIncreaseCalculator,
  PercentageOfCalculator,
  TimeDurationCalculator,
} from "./TierOneCalculators";

describe("Tier 1 calculator forms", () => {
  it("updates percentage change live and announces the result", () => {
    render(<PercentageIncreaseCalculator />);

    fireEvent.change(screen.getByLabelText("Original value", { selector: "input" }), { target: { value: "80" } });
    fireEvent.change(screen.getByLabelText("New value"), { target: { value: "100" } });

    const result = screen.getByText("+25% increase").closest("[aria-live]");
    expect(result).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Absolute difference: +20")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /calculate/i })).not.toBeInTheDocument();
  });

  it("shows all three percentage-of calculations together", () => {
    render(<PercentageOfCalculator />);

    expect(screen.getByRole("group", { name: "What is X% of Y?" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "X is what percent of Y?" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "X is Y% of what number?" })).toBeInTheDocument();
  });

  it("adds and removes stacked discount rows", () => {
    render(<DiscountCalculator />);

    expect(screen.getAllByLabelText(/Discount \d+ \(%\)/)).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Add another discount" }));
    expect(screen.getAllByLabelText(/Discount \d+ \(%\)/)).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Remove discount 2" }));
    expect(screen.getAllByLabelText(/Discount \d+ \(%\)/)).toHaveLength(1);
  });

  it("requires either both duration dates or neither date", () => {
    render(<TimeDurationCalculator />);

    fireEvent.change(screen.getByLabelText("Start date (optional)"), { target: { value: "2026-10-14" } });
    expect(screen.getByText("Enter both dates or leave both blank.")).toBeInTheDocument();
  });

  it("changes business-day results with the selected weekend", () => {
    render(<BusinessDaysCalculator />);
    const range = screen.getByRole("group", { name: "Working days between dates" });

    fireEvent.change(within(range).getByLabelText("Start date"), { target: { value: "2026-10-29" } });
    fireEvent.change(within(range).getByLabelText("End date"), { target: { value: "2026-10-31" } });
    expect(within(range).getByText("2 working days")).toBeInTheDocument();

    fireEvent.change(within(range).getByLabelText("Weekend"), { target: { value: "fri-sat" } });
    expect(within(range).getByText("1 working day")).toBeInTheDocument();
  });
});
