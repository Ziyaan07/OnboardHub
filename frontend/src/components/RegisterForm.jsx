import { useState } from "react";
import { apiCall } from "../api";
import { useToast } from "../context/ToastContext";
import Spinner from "./shared/Spinner";
import { IconUserPlus, IconCheckCircle, IconFileText } from "./shared/Icons";

const DEPARTMENT_CHECKLISTS = {
  General: [
    "Complete personal information",
    "Upload government ID (PDF/JPG)",
    "Upload signed offer letter",
    "Upload bank details",
    "Create email & internal accounts (HR/IT)",
    "Issue office ID badge",
    "Prepare workstation"
  ],
  Engineering: [
    "Sign confidential NDA",
    "Configure secure VPN & GitHub access"
  ],
  Sales: [
    "Sign commission compensation plan",
    "Grant CRM access credentials"
  ]
};

export function RegisterForm({ hrKey, done, onCancel }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    department: "General",
    start_date: "",
    manager: ""
  });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const { addToast } = useToast();

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = "Full name is required";
    if (!formData.email.trim()) {
      errs.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      errs.email = "Please enter a valid email address";
    }
    if (!formData.role.trim()) errs.role = "Job title is required";
    if (!formData.start_date) errs.start_date = "Start date is required";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      addToast("Please correct the highlighted fields", "error");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role.trim(),
        department: formData.department,
        start_date: formData.start_date,
        manager: formData.manager.trim()
      };

      const res = await apiCall("/hr/employees", {
        method: "POST",
        body: payload,
        hrKey
      });

      addToast(
        `Successfully registered ${res.employee}! ${res.tasks_assigned} tasks assigned.`,
        "success"
      );

      setFormData({
        name: "",
        email: "",
        role: "",
        department: "General",
        start_date: "",
        manager: ""
      });

      if (done) done();
    } catch (err) {
      addToast(err.message || "Failed to register employee", "error");
    } finally {
      setBusy(false);
    }
  };

  const currentPreviewTasks = [
    ...DEPARTMENT_CHECKLISTS.General,
    ...(formData.department !== "General" ? (DEPARTMENT_CHECKLISTS[formData.department] || []) : [])
  ];

  return (
    <div className="register-content">
      <div className="section-header">
        <div>
          <h2 className="section-title">Register New Employee</h2>
          <p className="section-desc">
            Add a new team member and automatically assign tailored onboarding tasks based on department.
          </p>
        </div>
      </div>

      <div className="register-layout">
        {/* Form Column */}
        <div className="card register-card">
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="reg-name" className="form-label">
                  Full Name <span className="req-star">*</span>
                </label>
                <input
                  id="reg-name"
                  type="text"
                  className={`form-input ${errors.name ? "input-error" : ""}`}
                  placeholder="e.g. Sarah Connor"
                  value={formData.name}
                  onChange={handleChange("name")}
                  disabled={busy}
                />
                {errors.name && <p className="field-error">{errors.name}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="reg-email" className="form-label">
                  Company Email <span className="req-star">*</span>
                </label>
                <input
                  id="reg-email"
                  type="email"
                  className={`form-input ${errors.email ? "input-error" : ""}`}
                  placeholder="e.g. sarah@company.com"
                  value={formData.email}
                  onChange={handleChange("email")}
                  disabled={busy}
                />
                {errors.email && <p className="field-error">{errors.email}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="reg-role" className="form-label">
                  Job Title <span className="req-star">*</span>
                </label>
                <input
                  id="reg-role"
                  type="text"
                  className={`form-input ${errors.role ? "input-error" : ""}`}
                  placeholder="e.g. Senior Frontend Engineer"
                  value={formData.role}
                  onChange={handleChange("role")}
                  disabled={busy}
                />
                {errors.role && <p className="field-error">{errors.role}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="reg-dept" className="form-label">
                  Department
                </label>
                <select
                  id="reg-dept"
                  className="form-select"
                  value={formData.department}
                  onChange={handleChange("department")}
                  disabled={busy}
                >
                  <option value="General">General (Default)</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Sales">Sales</option>
                </select>
                <span className="form-helper">
                  Select Engineering or Sales to include specialized security/NDA tasks.
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="reg-date" className="form-label">
                  Official Start Date <span className="req-star">*</span>
                </label>
                <input
                  id="reg-date"
                  type="date"
                  className={`form-input ${errors.start_date ? "input-error" : ""}`}
                  value={formData.start_date}
                  onChange={handleChange("start_date")}
                  disabled={busy}
                />
                {errors.start_date && <p className="field-error">{errors.start_date}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="reg-manager" className="form-label">
                  Reporting Manager (Optional)
                </label>
                <input
                  id="reg-manager"
                  type="text"
                  className="form-input"
                  placeholder="e.g. John Doe"
                  value={formData.manager}
                  onChange={handleChange("manager")}
                  disabled={busy}
                />
              </div>
            </div>

            <div className="form-actions">
              {onCancel && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onCancel}
                  disabled={busy}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={busy}
              >
                {busy ? (
                  <>
                    <Spinner size={16} className="btn-spinner-spacing" />
                    Registering & Assigning Tasks…
                  </>
                ) : (
                  <>
                    <IconUserPlus size={16} className="btn-icon-spacing" />
                    Register & Assign Checklist
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Dynamic Checklist Preview Column */}
        <div className="card checklist-preview-card">
          <div className="preview-header">
            <IconFileText size={18} className="preview-icon" />
            <div>
              <h3 className="preview-title">Automated Checklist Preview</h3>
              <p className="preview-sub">
                {currentPreviewTasks.length} tasks will be assigned for {formData.department}
              </p>
            </div>
          </div>

          <ul className="preview-task-list">
            {currentPreviewTasks.map((task, idx) => (
              <li key={idx} className="preview-task-item">
                <IconCheckCircle size={15} className="preview-check-icon" />
                <span>{task}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default RegisterForm;
