import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingScreen } from "./UI";

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) {
    const target = user.role === "superadmin" ? "/superadmin/dashboard" : user.role === "sub-admin" ? "/admin/dashboard" : "/dashboard";
    return <Navigate to={target} replace />;
  }
  return <Outlet />;
}
