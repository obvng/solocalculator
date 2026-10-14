import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MediaLibrary } from "./MediaLibrary";

describe("MediaLibrary", () => {
  it("offers only the server-approved image formats", () => {
    render(<MediaLibrary initialItems={[]} />);
    expect(screen.getByLabelText("Upload image")).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
  });
});
