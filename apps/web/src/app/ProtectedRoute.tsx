import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../stores/auth";
import { Spinner } from "@/components/ui/spinner";
export function ProtectedRoute() {
  const token = useAuth((s) => s.accessToken);

  const isHydrated = useAuth.persist.hasHydrated();

  if (!isHydrated) {
    return <Spinner />;
  }
  if (!token) return <Navigate to="/login" replace />;

  return <Outlet />;
}
