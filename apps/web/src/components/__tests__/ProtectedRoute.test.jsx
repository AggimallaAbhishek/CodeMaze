import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import ProtectedRoute from "../ProtectedRoute";
import { useAuthStore } from "../../store/useAuthStore";

describe("ProtectedRoute", () => {
  afterEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: "",
      refreshToken: "",
      isAuthenticated: false
    });
  });

  it("redirects to login when unauthenticated", () => {
    act(() => {
      useAuthStore.setState({ isAuthenticated: false, accessToken: "" });
    });

    render(
      <MemoryRouter initialEntries={["/levels"]}>
        <Routes>
          <Route
            path="/levels"
            element={
              <ProtectedRoute>
                <div>Secret Levels</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<h1>Login Page</h1>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Login Page" })).toBeInTheDocument();
  });

  it("renders child routes when authenticated", () => {
    act(() => {
      useAuthStore.setState({ isAuthenticated: true, accessToken: "token-1" });
    });

    render(
      <MemoryRouter initialEntries={["/levels"]}>
        <Routes>
          <Route
            path="/levels"
            element={
              <ProtectedRoute>
                <div>Secret Levels</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<h1>Login Page</h1>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Secret Levels")).toBeInTheDocument();
  });
});
