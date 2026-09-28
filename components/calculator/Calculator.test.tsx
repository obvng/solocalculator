import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Calculator } from "./Calculator";

describe("Calculator", () => {
  it("starts at zero", () => {
    render(<Calculator />);
    expect(within(screen.getByRole("status")).getByText("0")).toBeVisible();
  });

  it("accepts button input and displays the result", () => {
    render(<Calculator />);
    fireEvent.click(screen.getByRole("button", { name: "7" }));
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByRole("button", { name: "5" }));
    fireEvent.click(screen.getByRole("button", { name: "Equals" }));
    expect(screen.getByRole("status")).toHaveTextContent("12");
  });

  it("accepts keyboard input", () => {
    render(<Calculator />);
    fireEvent.keyDown(window, { key: "9" });
    fireEvent.keyDown(window, { key: "*" });
    fireEvent.keyDown(window, { key: "3" });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByRole("status")).toHaveTextContent("27");
  });

  it("reveals scientific controls", () => {
    render(<Calculator />);
    fireEvent.click(screen.getByRole("switch", { name: "Scientific" }));
    expect(screen.getByRole("button", { name: "Sine" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Angle mode" })).toHaveTextContent("DEG");
  });
});
