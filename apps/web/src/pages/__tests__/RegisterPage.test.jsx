import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import RegisterPage from "../RegisterPage";

const navigateMock = vi.fn();
const setAuthSessionMock = vi.fn();
const registerUserMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock
  };
});

vi.mock("../../store/useAuthStore", () => ({
  useAuthStore: (selector) => selector({ setAuthSession: setAuthSessionMock })
}));

vi.mock("../../lib/apiClient", () => ({
  registerUser: (...args) => registerUserMock(...args)
}));

describe("RegisterPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    setAuthSessionMock.mockReset();
    registerUserMock.mockReset();
  });

  it("creates account and redirects to levels", async () => {
    const user = userEvent.setup();
    registerUserMock.mockResolvedValue({
      access: "access-token",
      user: { id: "u-1", username: "aggimalla" }
    });

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText("Email"), "aggimallaabhishek@gmail.com");
    await user.type(screen.getByLabelText("Username"), "aggimalla");
    await user.type(screen.getByLabelText("Password"), "StrongPass123!");
    await user.click(screen.getByRole("button", { name: /Create Account/i }));

    await waitFor(() => {
      expect(registerUserMock).toHaveBeenCalledWith({
        email: "aggimallaabhishek@gmail.com",
        username: "aggimalla",
        password: "StrongPass123!"
      });
      expect(setAuthSessionMock).toHaveBeenCalledWith({
        user: { id: "u-1", username: "aggimalla" },
        access: "access-token"
      });
      expect(navigateMock).toHaveBeenCalledWith("/levels", { replace: true });
    });
  });

  it("routes backend email errors to the email field feedback", async () => {
    const user = userEvent.setup();
    registerUserMock.mockRejectedValue(new Error("Email: user with this email already exists."));

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText("Email"), "aggimallaabhishek@gmail.com");
    await user.type(screen.getByLabelText("Username"), "aggimalla");
    await user.type(screen.getByLabelText("Password"), "StrongPass123!");
    await user.click(screen.getByRole("button", { name: /Create Account/i }));

    await waitFor(() => {
      expect(screen.getByText("user with this email already exists.")).toBeInTheDocument();
    });
  });
});
