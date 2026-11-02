import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeading } from "./page-heading";

describe("PageHeading", () => {
  it("renders a page title and supporting text", () => {
    render(<PageHeading eyebrow="A note" title="Happy birthday">A lovely year ahead.</PageHeading>);
    expect(screen.getByRole("heading", { name: "Happy birthday" })).toBeInTheDocument();
    expect(screen.getByText("A lovely year ahead.")).toBeInTheDocument();
  });
});
