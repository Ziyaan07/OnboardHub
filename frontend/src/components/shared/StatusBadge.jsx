import React from "react";

export function StatusBadge({ status, label }) {
  const normalized = (status || "").toLowerCase();

  let styleClass = "badge-neutral";
  let defaultLabel = "Pending";

  if (normalized === "approved") {
    styleClass = "badge-success";
    defaultLabel = "Approved";
  } else if (normalized === "done") {
    styleClass = "badge-success";
    defaultLabel = "Completed";
  } else if (normalized === "submitted") {
    styleClass = "badge-warning";
    defaultLabel = "Waiting for HR review";
  } else if (normalized === "rejected") {
    styleClass = "badge-danger";
    defaultLabel = "Needs fixing";
  }

  return (
    <span className={`status-badge ${styleClass}`}>
      <span className="badge-dot" />
      {label || defaultLabel}
    </span>
  );
}

export default StatusBadge;
