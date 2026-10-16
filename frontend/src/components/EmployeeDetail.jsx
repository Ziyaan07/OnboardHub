import { useState, useEffect, useMemo, useCallback } from "react";
import { apiCall } from "../api";
import { useToast } from "../context/ToastContext";
import Modal from "./shared/Modal";
import StatusBadge from "./shared/StatusBadge";
import Spinner from "./shared/Spinner";
import {
  IconArrowLeft,
  IconCheckCircle,
  IconAlertCircle,
  IconFileText,
  IconClock
} from "./shared/Icons";

export function EmployeeDetail({ hrKey, email, onBack, onRefreshList }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    task: null,
    approve: false,
    note: "",
    noteError: ""
  });
  const [actionBusy, setActionBusy] = useState(false);
  const { addToast } = useToast();

  const loadEmployee = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await apiCall("/hr/employee?email=" + encodeURIComponent(email), {
        hrKey
      });
      setData(res);
    } catch (err) {
      addToast(err.message || "Failed to load employee details", "error");
    } finally {
      setLoading(false);
    }
  }, [email, hrKey, addToast]);

  useEffect(() => {
    loadEmployee();
  }, [loadEmployee]);

  const handleOpenReview = (task, approve) => {
    setReviewModal({
      isOpen: true,
      task,
      approve,
      note: "",
      noteError: ""
    });
  };

  const handleCloseReview = () => {
    if (actionBusy) return;
    setReviewModal({
      isOpen: false,
      task: null,
      approve: false,
      note: "",
      noteError: ""
    });
  };

  const handleConfirmReview = async () => {
    const { task, approve, note } = reviewModal;
    if (!task) return;

    if (!approve && !note.trim()) {
      setReviewModal((prev) => ({
        ...prev,
        noteError: "A reason is required so the employee knows what to fix."
      }));
      return;
    }

    setActionBusy(true);
    try {
      await apiCall("/hr/review", {
        method: "POST",
        hrKey,
        body: {
          email,
          task_title: task.title,
          approve,
          note: note.trim()
        }
      });

      addToast(
        approve
          ? `Task "${task.title}" has been approved.`
          : `Task "${task.title}" was rejected with feedback note.`,
        approve ? "success" : "info"
      );

      handleCloseReview();
      await loadEmployee();
      if (onRefreshList) onRefreshList();
    } catch (err) {
      addToast(err.message || "Failed to submit review", "error");
    } finally {
      setActionBusy(false);
    }
  };

  // Group tasks into the 4 requested categories
  const groupedTasks = useMemo(() => {
    if (!data?.tasks) {
      return { review: [], waiting: [], hr: [], completed: [] };
    }
    const review = [];
    const waiting = [];
    const hr = [];
    const completed = [];

    data.tasks.forEach((t) => {
      if (t.status === "approved" || t.status === "done") {
        completed.push(t);
      } else if (t.status === "submitted") {
        review.push(t);
      } else if (t.owner === "hr") {
        hr.push(t);
      } else {
        waiting.push(t);
      }
    });

    return { review, waiting, hr, completed };
  }, [data]);

  if (loading) {
    return (
      <div className="card loading-card">
        <Spinner size={24} />
        <p className="loading-text">Loading employee details…</p>
      </div>
    );
  }

  if (!data?.employee) {
    return (
      <div className="card empty-state">
        <IconAlertCircle size={32} />
        <h3>Employee not found</h3>
        <p className="mu">The requested employee record could not be loaded.</p>
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const emp = data.employee;
  const totalTasks = data.tasks.length;
  const doneTasks = groupedTasks.completed.length;
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const initials = emp.name
    ? emp.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "EM";

  return (
    <div className="employee-detail-wrap">
      {/* Back button */}
      <div className="detail-top-nav">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          <IconArrowLeft size={16} className="btn-icon-spacing" />
          Back to Dashboard
        </button>
      </div>

      {/* Employee Profile Header Card */}
      <div className="card emp-profile-header-card">
        <div className="profile-main-row">
          <div className="profile-avatar-large">{initials}</div>
          <div className="profile-info-block">
            <div className="profile-name-row">
              <h2 className="profile-name">{emp.name}</h2>
              <span className="dept-pill">{emp.department || "General"}</span>
            </div>
            <p className="profile-role">{emp.role}</p>
            <div className="profile-meta-grid">
              <span className="profile-meta-item">
                <strong>Email:</strong> {emp.email}
              </span>
              <span className="profile-meta-item">
                <strong>Start Date:</strong> {emp.start_date || "—"}
              </span>
              {emp.manager && (
                <span className="profile-meta-item">
                  <strong>Manager:</strong> {emp.manager}
                </span>
              )}
            </div>
            {emp.phone && (
              <div className="profile-contact-row">
                <span><strong>Phone:</strong> {emp.phone}</span>
                {emp.emergency_name && (
                  <span>
                    <strong>Emergency Contact:</strong> {emp.emergency_name} ({emp.emergency_phone || "No phone"})
                  </span>
                )}
                {emp.address && <span><strong>Address:</strong> {emp.address}</span>}
              </div>
            )}
          </div>

          <div className="profile-progress-stat">
            <div className="progress-stat-number">{progressPercent}%</div>
            <div className="progress-stat-label">Onboarding Done</div>
            <div className="progress-bar-bg" style={{ width: 140, marginTop: 8 }}>
              <div
                className={`progress-bar-fill ${progressPercent === 100 ? "fill-complete" : ""}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Group 1: Needs Your Review */}
      {groupedTasks.review.length > 0 && (
        <div className="task-group-section group-urgent">
          <div className="group-header">
            <div className="group-title-wrap">
              <span className="urgent-badge">Needs Action</span>
              <h3 className="group-title">Needs Your Review ({groupedTasks.review.length})</h3>
            </div>
            <p className="group-desc">
              The employee has uploaded documents for these items. Please review and approve or reject.
            </p>
          </div>

          <div className="task-cards-list">
            {groupedTasks.review.map((t) => (
              <div key={t.id} className="card task-card task-card-urgent">
                <div className="task-card-main">
                  <div className="task-title-row">
                    <h4 className="task-title">{t.title}</h4>
                    <StatusBadge status="submitted" label="Awaiting Review" />
                  </div>
                  <div className="task-meta-row">
                    <span className="highlight-doc-tag">
                      <IconFileText size={14} className="inline-icon" />
                      Document uploaded, please review
                    </span>
                    {t.review_note && (
                      <span className="task-note-tag">Previous note: {t.review_note}</span>
                    )}
                  </div>
                </div>

                <div className="task-card-actions">
                  {t.document_url && (
                    <a
                      href={t.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                    >
                      <IconFileText size={15} className="btn-icon-spacing" />
                      View Document ↗
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => handleOpenReview(t, true)}
                  >
                    <IconCheckCircle size={15} className="btn-icon-spacing" />
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleOpenReview(t, false)}
                  >
                    Reject…
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Group 2: HR / IT Tasks */}
      <div className="task-group-section">
        <div className="group-header">
          <h3 className="group-title">HR & IT Setup Tasks ({groupedTasks.hr.length})</h3>
          <p className="group-desc">Internal operational tasks required before the employee starts.</p>
        </div>

        {groupedTasks.hr.length === 0 ? (
          <p className="group-empty-note">All internal HR/IT tasks are completed.</p>
        ) : (
          <div className="task-cards-list">
            {groupedTasks.hr.map((t) => (
              <div key={t.id} className="card task-card">
                <div className="task-card-main">
                  <h4 className="task-title">{t.title}</h4>
                  <span className="task-owner-pill">HR / IT Task</span>
                </div>
                <div className="task-card-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleOpenReview(t, true)}
                  >
                    <IconCheckCircle size={15} className="btn-icon-spacing" />
                    Mark Done
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group 3: Waiting for Employee */}
      <div className="task-group-section">
        <div className="group-header">
          <h3 className="group-title">Waiting for Employee ({groupedTasks.waiting.length})</h3>
          <p className="group-desc">Tasks currently pending action by {emp.name}.</p>
        </div>

        {groupedTasks.waiting.length === 0 ? (
          <p className="group-empty-note">No tasks currently pending from the employee.</p>
        ) : (
          <div className="task-cards-list">
            {groupedTasks.waiting.map((t) => (
              <div key={t.id} className="card task-card">
                <div className="task-card-main">
                  <div className="task-title-row">
                    <h4 className="task-title">{t.title}</h4>
                    <StatusBadge
                      status={t.status === "rejected" ? "rejected" : "pending"}
                      label={t.status === "rejected" ? "Needs fixing" : "Not started"}
                    />
                  </div>
                  <div className="task-meta-row">
                    <span className="meta-hint">
                      {t.requires_document ? "Requires document upload" : "Online form completion"}
                    </span>
                    {t.status === "rejected" && t.review_note && (
                      <span className="rejection-note-badge">
                        Rejected with note: "{t.review_note}"
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group 4: Completed Tasks */}
      <div className="task-group-section">
        <div className="group-header">
          <h3 className="group-title">Completed Tasks ({groupedTasks.completed.length})</h3>
          <p className="group-desc">Tasks successfully verified and approved.</p>
        </div>

        {groupedTasks.completed.length === 0 ? (
          <p className="group-empty-note">No tasks completed yet.</p>
        ) : (
          <div className="task-cards-list">
            {groupedTasks.completed.map((t) => (
              <div key={t.id} className="card task-card task-card-done">
                <div className="task-card-main">
                  <div className="task-title-row">
                    <h4 className="task-title task-title-completed">
                      <IconCheckCircle size={16} className="completed-check-icon" />
                      {t.title}
                    </h4>
                    <StatusBadge status="approved" label="Approved" />
                  </div>
                </div>
                {t.document_url && (
                  <div className="task-card-actions">
                    <a
                      href={t.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-secondary"
                    >
                      View Uploaded Document ↗
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review / Approval Modal */}
      <Modal
        isOpen={reviewModal.isOpen}
        onClose={handleCloseReview}
        title={
          reviewModal.approve
            ? `Approve Task: "${reviewModal.task?.title}"`
            : `Reject Task: "${reviewModal.task?.title}"`
        }
        confirmLabel={reviewModal.approve ? "Confirm Approval" : "Reject Task"}
        confirmVariant={reviewModal.approve ? "success" : "danger"}
        onConfirm={handleConfirmReview}
        isBusy={actionBusy}
      >
        {reviewModal.approve ? (
          <div className="modal-confirm-content">
            <p>
              Are you sure you want to mark <strong>"{reviewModal.task?.title}"</strong> as approved for <strong>{emp.name}</strong>?
            </p>
            <p className="text-muted" style={{ fontSize: 13, marginTop: 8 }}>
              This will update the employee's progress and mark this checklist item as complete.
            </p>
          </div>
        ) : (
          <div className="modal-reject-content">
            <label htmlFor="reject-reason" className="form-label">
              Reason for Rejection <span className="req-star">*</span>
            </label>
            <textarea
              id="reject-reason"
              className={`form-textarea ${reviewModal.noteError ? "input-error" : ""}`}
              rows={4}
              placeholder="e.g. The uploaded document is blurry. Please re-upload a clear copy of your government ID."
              value={reviewModal.note}
              onChange={(e) =>
                setReviewModal((prev) => ({
                  ...prev,
                  note: e.target.value,
                  noteError: ""
                }))
              }
              disabled={actionBusy}
            />
            {reviewModal.noteError && (
              <p className="field-error" style={{ marginTop: 4 }}>
                {reviewModal.noteError}
              </p>
            )}
            <p className="form-helper" style={{ marginTop: 8 }}>
              The employee will see this note directly on their checklist so they know how to fix the issue.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default EmployeeDetail;
