import { useState } from "react";
import { apiCall } from "../api";
import { useToast } from "../context/ToastContext";
import Spinner from "./shared/Spinner";
import { IconShield, IconUsers, IconSparkles } from "./shared/Icons";

export function Landing({ onHr, onEmp }) {
  const [hrKey, setHrKey] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [hrError, setHrError] = useState("");
  const [empError, setEmpError] = useState("");
  const [hrBusy, setHrBusy] = useState(false);
  const [empBusy, setEmpBusy] = useState(false);
  const { addToast } = useToast();

  const handleHrLogin = async (e) => {
    e?.preventDefault();
    if (!hrKey.trim()) {
      setHrError("Please enter your HR access key.");
      return;
    }
    setHrBusy(true);
    setHrError("");
    try {
      await apiCall("/hr/employees", { hrKey: hrKey.trim() });
      addToast("Successfully verified HR access", "success");
      onHr(hrKey.trim());
    } catch (err) {
      setHrError("Invalid HR key. Please check your password and try again.");
    } finally {
      setHrBusy(false);
    }
  };

  const handleEmpLogin = async (e) => {
    e?.preventDefault();
    const cleanEmail = empEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setEmpError("Please enter your work email.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setEmpError("Please enter a valid email address (e.g. name@company.com).");
      return;
    }
    setEmpBusy(true);
    setEmpError("");
    try {
      await apiCall("/me?email=" + encodeURIComponent(cleanEmail));
      addToast(`Welcome back, ${cleanEmail}!`, "success");
      onEmp(cleanEmail);
    } catch (err) {
      setEmpError("No onboarding record found for this email. Please check with your HR manager.");
    } finally {
      setEmpBusy(false);
    }
  };

  return (
    <div className="landing-wrap">
      {/* Friendly Hero Banner */}
      <div className="landing-hero">
        <div className="hero-tag">
          <IconSparkles size={14} /> Simplified Team Onboarding
        </div>
        <h1 className="hero-title">Welcome to OnboardHub</h1>
        <p className="hero-subtitle">
          Track employee onboarding checklists, review submitted documents, and automate new hire workflows with ease.
        </p>
      </div>

      {/* Two Clear Login Cards */}
      <div className="landing-grid">
        {/* HR Login Card */}
        <div className="landing-card">
          <div className="landing-card-header">
            <div className="landing-icon-badge badge-primary">
              <IconShield size={22} />
            </div>
            <div>
              <h2 className="landing-card-title">HR Portal</h2>
              <p className="landing-card-desc">Access team progress, assign checklists, and review submissions.</p>
            </div>
          </div>

          <form onSubmit={handleHrLogin} className="landing-form">
            <div className="form-group">
              <label htmlFor="hr-key-input" className="form-label">
                HR Access Key
              </label>
              <input
                id="hr-key-input"
                type="password"
                className={`form-input ${hrError ? "input-error" : ""}`}
                value={hrKey}
                onChange={(e) => {
                  setHrKey(e.target.value);
                  if (hrError) setHrError("");
                }}
                placeholder="Enter HR access password"
                autoComplete="current-password"
                disabled={hrBusy}
              />
              <span className="form-helper">
                Use the confidential HR security key configured in your environment.
              </span>
              {hrError && <p className="field-error" role="alert">{hrError}</p>}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={hrBusy || !hrKey.trim()}
            >
              {hrBusy ? (
                <>
                  <Spinner size={16} className="btn-spinner-spacing" />
                  Verifying Key…
                </>
              ) : (
                "Enter HR Area →"
              )}
            </button>
          </form>
        </div>

        {/* Employee Login Card */}
        <div className="landing-card">
          <div className="landing-card-header">
            <div className="landing-icon-badge badge-employee">
              <IconUsers size={22} />
            </div>
            <div>
              <h2 className="landing-card-title">Employee Portal</h2>
              <p className="landing-card-desc">Complete your personalized tasks, upload documents, and track progress.</p>
            </div>
          </div>

          <form onSubmit={handleEmpLogin} className="landing-form">
            <div className="form-group">
              <label htmlFor="emp-email-input" className="form-label">
                Work Email Address
              </label>
              <input
                id="emp-email-input"
                type="email"
                className={`form-input ${empError ? "input-error" : ""}`}
                value={empEmail}
                onChange={(e) => {
                  setEmpEmail(e.target.value);
                  if (empError) setEmpError("");
                }}
                placeholder="you@company.com"
                autoComplete="email"
                disabled={empBusy}
              />
              <span className="form-helper">
                Use the exact email address registered for you by your HR manager.
              </span>
              {empError && <p className="field-error" role="alert">{empError}</p>}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={empBusy || !empEmail.trim()}
            >
              {empBusy ? (
                <>
                  <Spinner size={16} className="btn-spinner-spacing" />
                  Opening Onboarding…
                </>
              ) : (
                "Open My Checklist →"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Landing;
