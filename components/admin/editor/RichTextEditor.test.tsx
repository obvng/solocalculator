import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RichTextEditor } from "./RichTextEditor";

describe("article formula editing", () => {
  it("round-trips sup/sub through HTML, visual mode and submitted document", async () => {
    const { container } = render(<RichTextEditor value={{ type: "doc", content: [] }} html="<p>Start</p>" onChange={vi.fn()} onUploadRequest={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Bold" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "HTML source" }));
    fireEvent.change(screen.getByRole("textbox", { name: "HTML source code" }), { target: { value: '<p>1.005<sup>60</sup> and H<sub>2</sub>O</p>' } });
    // Saving directly from source mode must submit synchronized editor JSON too.
    expect(container.querySelector<HTMLInputElement>('input[name="editorDocument"]')?.value).toContain('"type":"superscript"');
    fireEvent.click(screen.getByRole("button", { name: "HTML source" }));
    expect(container.querySelector("sup")).toHaveTextContent("60");
    expect(container.querySelector("sub")).toHaveTextContent("2");
    fireEvent.click(screen.getByRole("button", { name: "HTML source" }));
    expect(screen.getByRole("textbox", { name: "HTML source code" })).toHaveValue('<p>1.005<sup>60</sup> and H<sub>2</sub>O</p>');
  });
  it("shows a warning before unsupported tags disappear", async () => {
    render(<RichTextEditor value={{ type: "doc", content: [] }} html="<p>Start</p>" onChange={vi.fn()} onUploadRequest={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Bold" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "HTML source" }));
    fireEvent.change(screen.getByRole("textbox", { name: "HTML source code" }), { target: { value: '<p>Safe</p><script>bad()</script>' } });
    expect(screen.getByRole("alert")).toHaveTextContent("script");
    fireEvent.click(screen.getByRole("button", { name: "HTML source" }));
    expect(screen.getByRole("alert")).toHaveTextContent("script");
  });
});
