import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingScreen } from "./UI";
import { getPlatformSettings } from "../lib/enterprise";

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [settings, setSettings] = useState(null);
  useEffect(() => {
    getPlatformSettings()
      .then(setSettings)
      .catch(() => setSettings({ maintenanceMode: false }));
  }, []);
  if (loading || !settings) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.status !== "active") return <Navigate to="/login" replace />;
  if (settings.maintenanceMode && user.role !== "superadmin") {
    return (
      <div className="grid min-h-screen place-items-center bg-navy p-6 text-center text-white">
        <div>
          <p className="section-kicker">Scheduled maintenance</p>
          <h1 className="display-title mt-4 text-5xl">Stonehaven will return shortly.</h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-white/50">
            Client and advisor functions are temporarily unavailable while essential platform work is completed.
          </p>
        </div>
      </div>
    );
  }
  if (roles && !roles.includes(user.role)) {
    const target =
      user.role === "superadmin"
        ? "/superadmin/dashboard"
        : user.role === "sub-admin"
        ? "/admin/dashboard"
        : "/dashboard";
    return <Navigate to={target} replace />;
  }
  return <Outlet />;
}
