import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToolCalculator } from "./ToolCalculators";

describe("currency-neutral amounts", () => {
  it("keeps every loan result in the input currency without assuming dollars", () => {
    const { container } = render(<ToolCalculator kind="loan" />);
    fireEvent.change(screen.getByLabelText("Loan amount"), { target: { value: "10000" } });
    fireEvent.change(screen.getByLabelText("Annual interest (%)"), { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("Term (years)"), { target: { value: "5" } });
    expect(container).toHaveTextContent("193.33");
    expect(container).toHaveTextContent("11,599.68");
    expect(container).toHaveTextContent("1,599.68");
    expect(container.textContent).not.toContain("$");
  });
});
