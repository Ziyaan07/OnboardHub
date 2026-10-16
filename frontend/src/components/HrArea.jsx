import { useState, useEffect, useCallback } from "react";
import { apiCall } from "../api";
import { useToast } from "../context/ToastContext";
import Dashboard from "./Dashboard";
import RegisterForm from "./RegisterForm";
import EmployeeDetail from "./EmployeeDetail";
import Assistant from "./Assistant";
import {
  IconDashboard,
  IconUserPlus,
  IconBot,
  IconLogOut
} from "./shared/Icons";

export function HrArea({ hrKey, onLogout }) {
  const [activeTab, setActiveTab] = useState("dash");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { addToast } = useToast();

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiCall("/hr/employees", { hrKey });
      setEmployees(data);
    } catch (err) {
      addToast(err.message || "Failed to load employees list", "error");
    } finally {
      setLoading(false);
    }
  }, [hrKey, addToast]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleOpenDetail = (email) => {
    setSelectedEmail(email);
    setActiveTab("det");
  };

  const navItems = [
    { id: "dash", label: "Dashboard", icon: IconDashboard },
    { id: "reg", label: "Register Employee", icon: IconUserPlus },
    { id: "ai", label: "AI Assistant", icon: IconBot }
  ];

  return (
    <div className="hr-layout">
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div className="brand-logo">
          Onboard<span>Hub</span> <span className="hr-tag">HR</span>
        </div>
        <div className="mobile-header-actions">
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </header>

      {/* Responsive Left Sidebar */}
      <aside className={`hr-sidebar ${mobileMenuOpen ? "sidebar-mobile-open" : ""}`}>
        <div className="sidebar-brand-wrap">
          <div className="brand-logo">
            Onboard<span>Hub</span>
          </div>
          <span className="sidebar-badge">HR Portal</span>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-section-title">MAIN MENU</span>
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive =
              activeTab === item.id || (item.id === "dash" && activeTab === "det");

            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-nav-item ${isActive ? "nav-item-active" : ""}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
              >
                <IconComponent size={20} className="nav-item-icon" />
                <span>{item.label}</span>
                {item.id === "dash" && employees.length > 0 && (
                  <span className="nav-pill-count">{employees.length}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-preview">
            <span className="status-indicator-online" />
            <div className="user-text">
              <span className="user-role-label">Authenticated</span>
              <span className="user-email-label">HR Administrator</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-block btn-logout"
            onClick={onLogout}
          >
            <IconLogOut size={16} className="btn-icon-spacing" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="hr-main-body">
        {activeTab === "dash" && (
          <Dashboard
            list={employees}
            loading={loading}
            open={handleOpenDetail}
            onNavigateRegister={() => setActiveTab("reg")}
          />
        )}

        {activeTab === "reg" && (
          <RegisterForm
            hrKey={hrKey}
            done={() => {
              fetchEmployees();
              setActiveTab("dash");
            }}
            onCancel={() => setActiveTab("dash")}
          />
        )}

        {activeTab === "det" && (
          <EmployeeDetail
            hrKey={hrKey}
            email={selectedEmail}
            onBack={() => setActiveTab("dash")}
            onRefreshList={fetchEmployees}
          />
        )}

        {activeTab === "ai" && <Assistant hrKey={hrKey} />}
      </main>
    </div>
  );
}

export default HrArea;
