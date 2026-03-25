import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import LoginPage from "../LoginPage";

const navigateMock = vi.fn();
const setAuthSessionMock = vi.fn();
const loginUserMock = vi.fn();
const getCurrentUserMock = vi.fn();
const renderGoogleButtonMock = vi.fn();
const useGoogleSignInMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ state: { from: "/levels/next" } })
  };
});

vi.mock("../../store/useAuthStore", () => ({
  useAuthStore: (selector) => selector({ setAuthSession: setAuthSessionMock })
}));

vi.mock("../../hooks/useGoogleSignIn", () => ({
  useGoogleSignIn: (...args) => useGoogleSignInMock(...args)
}));

vi.mock("../../lib/apiClient", () => ({
  loginUser: (...args) => loginUserMock(...args),
  getCurrentUser: (...args) => getCurrentUserMock(...args)
}));

describe("LoginPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    setAuthSessionMock.mockReset();
    loginUserMock.mockReset();
    getCurrentUserMock.mockReset();
    renderGoogleButtonMock.mockReset();
    useGoogleSignInMock.mockReset();
    useGoogleSignInMock.mockReturnValue({
      ready: true,
      renderButton: renderGoogleButtonMock
    });
  });

  it("shows validation errors for empty and invalid fields", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /Enter Arena/i }));

    expect(screen.getByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), "invalid-email");
    await user.type(screen.getByLabelText("Password"), "pass");
    await user.click(screen.getByRole("button", { name: /Enter Arena/i }));

    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument();
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const passwordField = screen.getByLabelText("Password");
    expect(passwordField).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(passwordField).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(passwordField).toHaveAttribute("type", "password");
  });

  it("logs in and redirects after successful authentication", async () => {
    const user = userEvent.setup();

    loginUserMock.mockResolvedValue({ access: "access-token" });
    getCurrentUserMock.mockResolvedValue({ id: "user-1", username: "player" });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText("Email"), "player@example.com");
    await user.type(screen.getByLabelText("Password"), "StrongPass123");
    await user.click(screen.getByRole("button", { name: /Enter Arena/i }));

    await waitFor(() => {
      expect(loginUserMock).toHaveBeenCalledWith({ email: "player@example.com", password: "StrongPass123" });
      expect(getCurrentUserMock).toHaveBeenCalledWith("access-token");
      expect(setAuthSessionMock).toHaveBeenCalledWith({
        user: { id: "user-1", username: "player" },
        access: "access-token"
      });
      expect(navigateMock).toHaveBeenCalledWith("/levels/next", { replace: true });
    });
  });

  it("renders the google sign-in button container through the hook", async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(renderGoogleButtonMock).toHaveBeenCalled();
    });
  });
});
