import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChatRoom } from "./chat-room";

describe("ChatRoom", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("saves messages locally and restores them after remounting", async () => {
    const firstRender = render(<ChatRoom />);
    fireEvent.change(await screen.findByLabelText("Choose a nickname"), { target: { value: "Bookworm" } });
    fireEvent.click(screen.getByRole("button", { name: /join the room/i }));
    expect(await screen.findByText("Connected to this browser’s Cozy Corner.")).toBeInTheDocument();

    const input = screen.getByLabelText("Your message");
    fireEvent.change(input, { target: { value: "Happy birthday! 🎂" } });
    const form = input.closest("form");
    if (!form) throw new Error("Chat composer form is missing");
    fireEvent.submit(form);

    expect(await screen.findByText("Happy birthday! 🎂")).toBeInTheDocument();
    expect(localStorage.getItem("amelia-chat-messages")).toContain("Happy birthday! 🎂");

    firstRender.unmount();
    render(<ChatRoom />);
    expect(screen.getByLabelText("Choose a nickname")).toHaveValue("Bookworm");
    fireEvent.click(screen.getByRole("button", { name: /join the room/i }));
    expect(await screen.findByText("Happy birthday! 🎂")).toBeInTheDocument();
  });

  it("deletes a saved message from this browser", async () => {
    render(<ChatRoom />);
    fireEvent.change(await screen.findByLabelText("Choose a nickname"), { target: { value: "Bookworm" } });
    fireEvent.click(screen.getByRole("button", { name: /join the room/i }));

    const input = screen.getByLabelText("Your message");
    fireEvent.change(input, { target: { value: "Remove this note" } });
    const form = input.closest("form");
    if (!form) throw new Error("Chat composer form is missing");
    fireEvent.submit(form);
    expect(await screen.findByText("Remove this note")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete message from Bookworm" }));
    await waitFor(() => expect(screen.queryByText("Remove this note")).not.toBeInTheDocument());
    expect(localStorage.getItem("amelia-chat-messages")).toBe("[]");
  });

  it("offers a small accessible emoji picker to joined visitors", async () => {
    render(<ChatRoom />);
    fireEvent.change(await screen.findByLabelText("Choose a nickname"), { target: { value: "Bookworm" } });
    fireEvent.click(screen.getByRole("button", { name: /join the room/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Choose an emoji" }));
    fireEvent.click(screen.getByRole("button", { name: "Insert 🎂" }));
    expect(screen.getByLabelText("Your message")).toHaveValue("🎂");
  });
});
