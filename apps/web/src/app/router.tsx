import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { LoginPage } from "@/pages/login";
import Magic from "@/pages/magic";
import OnboardingPage from "@/pages/onboarding";
import Sessions from "@/pages/settings/sessions";
import Devices from "@/pages/settings/devices";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/magic", element: <Magic /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/", element: <>Dashboard</> },
      { path: "/onboarding", element: <OnboardingPage /> },
      { path: "/settings/sessions", element: <Sessions /> },
      { path: "/settings/devices", element: <Devices /> },
    ],
  },
]);
