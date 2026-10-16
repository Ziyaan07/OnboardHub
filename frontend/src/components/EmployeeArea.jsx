import { useState, useEffect, useCallback, useMemo } from "react";
import { apiCall } from "../api";
import { useToast } from "../context/ToastContext";
import ProgressRing from "./shared/ProgressRing";
import StatusBadge from "./shared/StatusBadge";
import Spinner from "./shared/Spinner";
import {
  IconCheckCircle,
  IconUpload,
  IconChevronDown,
  IconChevronUp,
  IconAlertCircle,
  IconLogOut,
  IconSparkles,
  IconFileText
} from "./shared/Icons";

export function EmployeeArea({ email, onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [personalInfo, setPersonalInfo] = useState({
    phone: "",
    address: "",
    emergency_name: "",
    emergency_phone: ""
  });
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoBusy, setInfoBusy] = useState(false);
  const [uploadingId, setUploadingId] = useState("");
  const { addToast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall("/me?email=" + encodeURIComponent(email));
      setData(res);
      const e = res.employee;
      setPersonalInfo({
        phone: e.phone || "",
        address: e.address || "",
        emergency_name: e.emergency_name || "",
        emergency_phone: e.emergency_phone || ""
      });
      // If personal info is incomplete, open accordion by default
      if (!e.phone || !e.address) {
        setInfoOpen(true);
      }
    } catch (err) {
      addToast(err.message || "Failed to load onboarding checklist", "error");
    } finally {
      setLoading(false);
    }
  }, [email, addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute progress
  const tasks = data?.tasks || [];
  const completedTasks = useMemo(
    () => tasks.filter((t) => ["approved", "done"].includes(t.status)),
    [tasks]
  );
  const progressPercent = tasks.length
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;

  // Determine "Next Step" priority task
  const nextStep = useMemo(() => {
    // Priority 1: Any rejected task needing fixing
    const rejected = tasks.find((t) => t.status === "rejected");
    if (rejected) return { task: rejected, type: "rejected" };

    // Priority 2: Incomplete personal info task
    const infoTask = tasks.find(
      (t) => t.title === "Complete personal information" && t.status !== "done"
    );
    if (infoTask) return { task: infoTask, type: "info" };

    // Priority 3: First pending upload or pending task
    const pending = tasks.find((t) => t.status === "pending");
    if (pending) return { task: pending, type: "pending" };

    return null;
  }, [tasks]);

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (
      !personalInfo.phone.trim() ||
      !personalInfo.address.trim() ||
      !personalInfo.emergency_name.trim() ||
      !personalInfo.emergency_phone.trim()
    ) {
      addToast("Please fill in all contact and emergency fields", "error");
      return;
    }

    setInfoBusy(true);
    try {
      await apiCall("/me/info", {
        method: "PUT",
        body: {
          email,
          ...personalInfo
        }
      });
      addToast("Personal information saved successfully!", "success");
      await loadData();
    } catch (err) {
      addToast(err.message || "Failed to save information", "error");
    } finally {
      setInfoBusy(false);
    }
  };

  const handleFileUpload = async (task, file) => {
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      addToast("Only PDF, JPG, or PNG files are accepted", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast("File size exceeds 5 MB limit", "error");
      return;
    }

    setUploadingId(task.id);
    const form = new FormData();
    form.append("email", email);
    form.append("task_id", task.id);
    form.append("file", file);

    try {
      await apiCall("/me/upload", {
        method: "POST",
        form
      });
      addToast(`Uploaded "${task.title}". Awaiting HR verification.`, "success");
      await loadData();
    } catch (err) {
      addToast(err.message || "Failed to upload file", "error");
    } finally {
      setUploadingId("");
    }
  };

  if (loading) {
    return (
      <div className="employee-layout">
        <div className="loading-card card">
          <Spinner size={24} />
          <p className="loading-text">Loading your onboarding portal…</p>
        </div>
      </div>
    );
  }

  const emp = data?.employee || {};
  const isPersonalSaved = !!(emp.phone && emp.address && emp.emergency_name);

  return (
    <div className="employee-layout">
      {/* Employee Top Navbar */}
      <header className="employee-top-header">
        <div className="brand-logo">
          Onboard<span>Hub</span> <span className="emp-portal-tag">Employee Portal</span>
        </div>
        <div className="emp-nav-right">
          <span className="emp-email-chip">{emp.email}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={onLogout}
          >
            <IconLogOut size={14} className="btn-icon-spacing" />
            Log Out
          </button>
        </div>
      </header>

      <main className="employee-container">
        {/* Welcome Banner with Progress Ring */}
        <div className="card emp-hero-card">
          <div className="emp-hero-left">
            <span className="welcome-tag">
              <IconSparkles size={14} /> New Team Member Onboarding
            </span>
            <h1 className="emp-hero-title">
              Welcome, {emp.name ? emp.name.split(" ")[0] : "there"}! 👋
            </h1>
            <p className="emp-hero-desc">
              We’re excited to have you join as <strong>{emp.role}</strong> in the{" "}
              <strong>{emp.department || "General"}</strong> department.
              {emp.start_date && ` Your official start date is ${emp.start_date}.`}
            </p>
            <div className="hero-status-pill">
              {progressPercent === 100
                ? "🎉 All checklist tasks complete!"
                : `${tasks.length - completedTasks.length} tasks remaining before your first day`}
            </div>
          </div>

          <div className="emp-hero-ring">
            <ProgressRing progress={progressPercent} size={115} strokeWidth={10} />
          </div>
        </div>

        {/* Celebratory Milestone Banner at 100% */}
        {progressPercent === 100 ? (
          <div className="card celebration-card">
            <div className="celebration-icon">🎉</div>
            <div className="celebration-body">
              <h3 className="celebration-title">You're All Set!</h3>
              <p className="celebration-desc">
                Congratulations, you've completed all required onboarding tasks. Your HR manager
                and IT team have verified your documents and accounts. Welcome aboard!
              </p>
            </div>
          </div>
        ) : (
          /* Next Step Spotlight Card */
          nextStep && (
            <div className={`card next-step-card ${nextStep.type === "rejected" ? "card-attention" : ""}`}>
              <div className="next-step-badge">
                <IconSparkles size={14} /> Suggested Next Action
              </div>
              <div className="next-step-content">
                <div>
                  <h3 className="next-step-title">
                    {nextStep.type === "rejected" ? "⚠️ Needs Your Attention: " : ""}
                    {nextStep.task.title}
                  </h3>
                  <p className="next-step-desc">
                    {nextStep.type === "rejected"
                      ? `HR rejected this submission with note: "${nextStep.task.review_note}". Please review and re-upload.`
                      : nextStep.type === "info"
                      ? "Please submit your emergency contact and home address in the form below."
                      : nextStep.task.requires_document
                      ? "Upload a clear PDF, JPG, or PNG document (max 5 MB) for verification."
                      : "Complete this checklist item to move closer to 100%."}
                  </p>
                </div>

                <div className="next-step-action-wrap">
                  {nextStep.type === "info" ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setInfoOpen(true)}
                    >
                      Fill Info Below ↓
                    </button>
                  ) : nextStep.task.requires_document ? (
                    <label className="btn btn-primary file-upload-btn">
                      {uploadingId === nextStep.task.id ? (
                        <>
                          <Spinner size={14} className="btn-spinner-spacing" />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <IconUpload size={14} className="btn-icon-spacing" />
                          {nextStep.type === "rejected" ? "Re-upload Document" : "Upload Document"}
                        </>
                      )}
                      <input
                        type="file"
                        hidden
                        accept=".pdf,image/png,image/jpeg"
                        disabled={!!uploadingId}
                        onChange={(e) =>
                          handleFileUpload(nextStep.task, e.target.files[0])
                        }
                      />
                    </label>
                  ) : null}
                </div>
              </div>
            </div>
          )
        )}

        {/* Collapsible Personal Information Form */}
        <div className="card accordion-card">
          <div
            className="accordion-header"
            onClick={() => setInfoOpen(!infoOpen)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setInfoOpen(!infoOpen)}
          >
            <div className="accordion-title-wrap">
              <span className="step-num-circle">1</span>
              <div>
                <h3 className="accordion-title">Personal & Emergency Contact Details</h3>
                <p className="accordion-subtitle">
                  Required for payroll, benefits enrollment, and emergency communications.
                </p>
              </div>
            </div>

            <div className="accordion-right">
              {isPersonalSaved && (
                <span className="saved-indicator">
                  <IconCheckCircle size={14} className="saved-icon" />
                  Saved
                </span>
              )}
              <button
                type="button"
                className="accordion-toggle-btn"
                aria-label={infoOpen ? "Collapse section" : "Expand section"}
              >
                {infoOpen ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
              </button>
            </div>
          </div>

          {infoOpen && (
            <form onSubmit={handleSaveInfo} className="accordion-body-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="info-phone" className="form-label">
                    Primary Phone Number <span className="req-star">*</span>
                  </label>
                  <input
                    id="info-phone"
                    type="tel"
                    className="form-input"
                    placeholder="e.g. +1 (555) 019-2834"
                    value={personalInfo.phone}
                    onChange={(e) =>
                      setPersonalInfo({ ...personalInfo, phone: e.target.value })
                    }
                    disabled={infoBusy}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="info-address" className="form-label">
                    Home Address <span className="req-star">*</span>
                  </label>
                  <input
                    id="info-address"
                    type="text"
                    className="form-input"
                    placeholder="e.g. 123 Main St, Apt 4B, City, State"
                    value={personalInfo.address}
                    onChange={(e) =>
                      setPersonalInfo({ ...personalInfo, address: e.target.value })
                    }
                    disabled={infoBusy}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="info-emg-name" className="form-label">
                    Emergency Contact Name <span className="req-star">*</span>
                  </label>
                  <input
                    id="info-emg-name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. John Doe (Spouse / Parent)"
                    value={personalInfo.emergency_name}
                    onChange={(e) =>
                      setPersonalInfo({
                        ...personalInfo,
                        emergency_name: e.target.value
                      })
                    }
                    disabled={infoBusy}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="info-emg-phone" className="form-label">
                    Emergency Contact Phone <span className="req-star">*</span>
                  </label>
                  <input
                    id="info-emg-phone"
                    type="tel"
                    className="form-input"
                    placeholder="e.g. +1 (555) 482-9102"
                    value={personalInfo.emergency_phone}
                    onChange={(e) =>
                      setPersonalInfo({
                        ...personalInfo,
                        emergency_phone: e.target.value
                      })
                    }
                    disabled={infoBusy}
                  />
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: 12 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={infoBusy}
                >
                  {infoBusy ? (
                    <>
                      <Spinner size={15} className="btn-spinner-spacing" />
                      Saving…
                    </>
                  ) : (
                    "Save Personal Information"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Numbered Onboarding Checklist */}
        <div className="card checklist-card">
          <div className="checklist-card-header">
            <div>
              <h3 className="section-title">Your Onboarding Checklist</h3>
              <p className="section-desc">
                Complete each required item below. Documents are reviewed and verified by HR.
              </p>
            </div>
            <span className="checklist-counter-pill">
              {completedTasks.length} / {tasks.length} Completed
            </span>
          </div>

          <div className="checklist-items-wrap">
            {tasks.map((task, index) => {
              const isDone = ["approved", "done"].includes(task.status);
              const isWaiting = task.status === "submitted";
              const isRejected = task.status === "rejected";

              return (
                <div
                  key={task.id}
                  className={`checklist-item-row ${
                    isDone
                      ? "item-done"
                      : isRejected
                      ? "item-rejected"
                      : isWaiting
                      ? "item-waiting"
                      : ""
                  }`}
                >
                  <div className="checklist-left">
                    <div
                      className={`checklist-number-badge ${
                        isDone ? "badge-num-done" : ""
                      }`}
                    >
                      {isDone ? <IconCheckCircle size={16} /> : index + 1}
                    </div>

                    <div className="checklist-details">
                      <h4 className={`item-title ${isDone ? "title-done" : ""}`}>
                        {task.title}
                      </h4>
                      <p className="item-meta">
                        {task.requires_document ? (
                          <span className="doc-hint">
                            <IconFileText size={13} className="inline-icon" />
                            PDF, JPG or PNG (max 5 MB)
                          </span>
                        ) : (
                          "Online informational item"
                        )}
                      </p>

                      {isRejected && (
                        <div className="rejection-box" role="alert">
                          <IconAlertCircle size={15} className="rejection-icon" />
                          <span>
                            <strong>HR Feedback:</strong>{" "}
                            {task.review_note || "Please upload a clearer document."}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="checklist-right">
                    <StatusBadge status={task.status} />

                    {task.requires_document &&
                      ["pending", "rejected"].includes(task.status) && (
                        <label className="btn btn-sm btn-primary file-upload-btn">
                          {uploadingId === task.id ? (
                            <>
                              <Spinner size={13} className="btn-spinner-spacing" />
                              Uploading…
                            </>
                          ) : (
                            <>
                              <IconUpload size={13} className="btn-icon-spacing" />
                              {isRejected ? "Re-upload" : "Upload File"}
                            </>
                          )}
                          <input
                            type="file"
                            hidden
                            accept=".pdf,image/png,image/jpeg"
                            disabled={!!uploadingId}
                            onChange={(e) =>
                              handleFileUpload(task, e.target.files[0])
                            }
                          />
                        </label>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

export default EmployeeArea;
