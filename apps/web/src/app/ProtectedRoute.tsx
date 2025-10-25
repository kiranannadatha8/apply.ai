import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./auth";
export function ProtectedRoute() {
  const token = useAuth((s) => s.accessToken);
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}
