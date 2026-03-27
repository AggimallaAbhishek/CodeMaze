import { toActionableError } from "../errors";

describe("toActionableError", () => {
  it("returns a contextual fallback for generic network failures", () => {
    expect(toActionableError(new Error("Failed to fetch"), "Custom fallback")).toBe("Custom fallback");
    expect(toActionableError("Request failed (503).", "Service fallback")).toBe("Service fallback");
  });

  it("keeps actionable server errors intact", () => {
    expect(toActionableError(new Error("Email: user already exists."), "Fallback")).toBe(
      "Email: user already exists."
    );
  });
});
