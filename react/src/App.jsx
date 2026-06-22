import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Suppliers from "./pages/Suppliers";
import Contracts from "./pages/Contracts";
import Attendance from "./pages/Attendance";

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
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/suppliers" element={<Protected><Suppliers /></Protected>} />
          <Route path="/contracts" element={<Protected><Contracts /></Protected>} />
          <Route path="/attendance" element={<Protected><Attendance /></Protected>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
