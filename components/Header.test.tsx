import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Header } from "./Header";

describe("Header navigation", () => {
  it("opens each desktop dropdown and links to its destination pages", () => {
    render(<Header />);

    fireEvent.click(screen.getByRole("button", { name: "Calculators" }));
    expect(screen.getByRole("link", { name: "All calculators" })).toHaveAttribute("href", "/calculators");
    expect(screen.getByRole("link", { name: "Age calculator" })).toHaveAttribute("href", "/age-calculator");

    fireEvent.click(screen.getByRole("button", { name: "Convert" }));
    expect(screen.getByRole("link", { name: "Unit converter" })).toHaveAttribute("href", "/unit-converter");
    expect(screen.getByRole("link", { name: "Currency converter" })).toHaveAttribute("href", "/currency-converter");

    fireEvent.click(screen.getByRole("button", { name: "Learn" }));
    expect(screen.getByRole("link", { name: "Calculator guides" })).toHaveAttribute("href", "/blog");
    expect(screen.getByRole("link", { name: "How calculators work" })).toHaveAttribute("href", "/calculator#how-to-use");
  });

  it("opens a mobile menu with the full calculator directory link", () => {
    render(<Header />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("navigation", { name: "Mobile navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All calculators" })).toHaveAttribute("href", "/calculators");
  });
});
