import { Routes, Route } from "react-router-dom";
import LoginPage from "../pages/login";
import MagicPage from "../pages/magic";
import OnboardingPage from "../pages/onboarding";
import { ProtectedRoute } from "./ProtectedRoute";
import Sessions from "../pages/settings/sessions";
import Devices from "../pages/settings/devices";
import { ConnectExtensionBanner } from "../components/ConnectExtensionBanner";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/magic" element={<MagicPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/settings/sessions" element={<Sessions />} />
        <Route path="/settings/devices" element={<Devices />} />
        <Route
          path="/"
          element={
            <div className="p-6">
              <h1 className="text-2xl mb-4">Dashboard</h1>
              <ConnectExtensionBanner />
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
