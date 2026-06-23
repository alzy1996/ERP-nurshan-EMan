import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Suppliers from "./pages/Suppliers";
import Contracts from "./pages/Contracts";
import Attendance from "./pages/Attendance";
import Offers from "./pages/Offers";
import Settings from "./pages/Settings";
import Materials from "./pages/Materials";
import PurchaseRequests from "./pages/PurchaseRequests";
import Analytics from "./pages/Analytics";
import Notifications from "./pages/Notifications";

function Protected({ children }) {
  const app = useApp();
  if (!app.session) return <Navigate to="/login" replace />;
  return children;
}

function Placeholder({ name }) {
  return <div className="min-h-screen grid place-items-center" style={{ color: "var(--muted)" }}>{name} — coming soon in React</div>;
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/suppliers" element={<Protected><Suppliers /></Protected>} />
          <Route path="/contracts" element={<Protected><Contracts /></Protected>} />
          <Route path="/attendance" element={<Protected><Attendance /></Protected>} />
          <Route path="/offers" element={<Protected><Offers /></Protected>} />
          <Route path="/settings" element={<Protected><Settings /></Protected>} />
          <Route path="/materials" element={<Protected><Materials /></Protected>} />
          <Route path="/purchase-requests" element={<Protected><PurchaseRequests /></Protected>} />
          <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
          <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
