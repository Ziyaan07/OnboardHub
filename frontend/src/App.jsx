import { useState } from "react";
import { ToastProvider } from "./context/ToastContext";
import Landing from "./components/Landing";
import HrArea from "./components/HrArea";
import EmployeeArea from "./components/EmployeeArea";

export default function App() {
  const [hrKey, setHrKey] = useState("");
  const [email, setEmail] = useState("");

  const handleLogout = () => {
    setHrKey("");
    setEmail("");
  };

  return (
    <ToastProvider>
      <div className="app-root">
        {hrKey ? (
          <HrArea hrKey={hrKey} onLogout={handleLogout} />
        ) : email ? (
          <EmployeeArea email={email} onLogout={handleLogout} />
        ) : (
          <Landing onHr={setHrKey} onEmp={setEmail} />
        )}
      </div>
    </ToastProvider>
  );
}