import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { LoginPage } from "@/pages/login";
import Magic from "@/pages/magic";
import OnboardingPage from "@/pages/onboarding";
import Sessions from "@/pages/settings/sessions";
import Devices from "@/pages/settings/devices";
import { Dashboard } from "@/pages/dashboard";
import ResumesPage from "@/pages/resumes";
import ReviewVariantPage from "@/pages/resumes/review";
import JobBoardPage from "@/pages/job-board/page";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/magic", element: <Magic /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "/job-board", element: <JobBoardPage /> },

      { path: "/onboarding", element: <OnboardingPage /> },
      { path: "/settings/sessions", element: <Sessions /> },
      { path: "/settings/devices", element: <Devices /> },
      { path: "/resumes", element: <ResumesPage /> },
      { path: "/resumes/review/:draftId", element: <ReviewVariantPage /> },
    ],
  },
]);
