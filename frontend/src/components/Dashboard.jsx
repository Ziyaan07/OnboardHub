import { useState, useMemo } from "react";
import {
  IconUsers,
  IconClock,
  IconCheckCircle,
  IconAlertCircle,
  IconSearch,
  IconUserPlus
} from "./shared/Icons";
import StatusBadge from "./shared/StatusBadge";
import Spinner from "./shared/Spinner";

export function Dashboard({ list = [], loading = false, open, onNavigateRegister }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Metrics computation
  const total = list.length;
  const doneCount = list.filter((e) => e.progress_percent === 100).length;
  const inProgressCount = total - doneCount;
  const totalPendingTasks = list.reduce(
    (acc, e) => acc + (e.pending_tasks?.length || 0),
    0
  );

  // Filtered employees
  const filteredList = useMemo(() => {
    return list.filter((emp) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === "in_progress") {
        return emp.progress_percent < 100;
      }
      if (statusFilter === "completed") {
        return emp.progress_percent === 100;
      }
      return true;
    });
  }, [list, searchTerm, statusFilter]);

  return (
    <div className="dashboard-content">
      {/* Top Action Bar */}
      <div className="section-header">
        <div>
          <h2 className="section-title">Team Overview</h2>
          <p className="section-desc">
            Monitor real-time onboarding checklists and pending review items.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onNavigateRegister}
        >
          <IconUserPlus size={16} className="btn-icon-spacing" />
          Register Employee
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-title">Total Employees</span>
            <div className="stat-card-icon icon-bg-blue">
              <IconUsers size={20} />
            </div>
          </div>
          <div className="stat-card-value">{total}</div>
          <span className="stat-card-sub">Registered team members</span>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-title">In Progress</span>
            <div className="stat-card-icon icon-bg-amber">
              <IconClock size={20} />
            </div>
          </div>
          <div className="stat-card-value">{inProgressCount}</div>
          <span className="stat-card-sub">Checklists actively open</span>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-title">Completed</span>
            <div className="stat-card-icon icon-bg-green">
              <IconCheckCircle size={20} />
            </div>
          </div>
          <div className="stat-card-value">{doneCount}</div>
          <span className="stat-card-sub">100% onboarded</span>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-title">Pending Tasks</span>
            <div className="stat-card-icon icon-bg-purple">
              <IconAlertCircle size={20} />
            </div>
          </div>
          <div className="stat-card-value">{totalPendingTasks}</div>
          <span className="stat-card-sub">Across all employees</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="table-controls-card">
        <div className="search-wrap">
          <IconSearch size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by employee name or email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="filter-tabs">
          <button
            type="button"
            className={`filter-tab ${statusFilter === "all" ? "filter-tab-active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            All ({total})
          </button>
          <button
            type="button"
            className={`filter-tab ${statusFilter === "in_progress" ? "filter-tab-active" : ""}`}
            onClick={() => setStatusFilter("in_progress")}
          >
            In Progress ({inProgressCount})
          </button>
          <button
            type="button"
            className={`filter-tab ${statusFilter === "completed" ? "filter-tab-active" : ""}`}
            onClick={() => setStatusFilter("completed")}
          >
            Completed ({doneCount})
          </button>
        </div>
      </div>

      {/* Main Table / Empty State */}
      <div className="card table-card">
        {loading ? (
          <div className="table-loading-state">
            <Spinner size={24} />
            <p className="loading-text">Loading employee records…</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconUsers size={32} />
            </div>
            <h3 className="empty-state-title">
              {searchTerm || statusFilter !== "all"
                ? "No matching employees found"
                : "No employees registered yet"}
            </h3>
            <p className="empty-state-desc">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search keywords or filter options."
                : "Get started by adding your first employee to assign an onboarding checklist."}
            </p>
            {!(searchTerm || statusFilter !== "all") && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onNavigateRegister}
              >
                <IconUserPlus size={16} className="btn-icon-spacing" />
                Register First Employee
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Start Date</th>
                  <th>Onboarding Progress</th>
                  <th>Pending Tasks</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((emp) => {
                  const isComplete = emp.progress_percent === 100;
                  const initials = emp.name
                    ? emp.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "EM";

                  return (
                    <tr
                      key={emp.email}
                      className="clickable-row"
                      onClick={() => open(emp.email)}
                    >
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">{initials}</div>
                          <div>
                            <div className="user-name">{emp.name}</div>
                            <div className="user-email">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="table-date">{emp.start_date || "—"}</span>
                      </td>
                      <td>
                        <div className="progress-cell">
                          <div className="progress-bar-bg">
                            <div
                              className={`progress-bar-fill ${isComplete ? "fill-complete" : ""}`}
                              style={{ width: `${emp.progress_percent}%` }}
                            />
                          </div>
                          <span className="progress-percent-label">
                            {emp.progress_percent}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="pending-count-chip">
                          {emp.pending_tasks.length}{" "}
                          {emp.pending_tasks.length === 1 ? "task" : "tasks"}
                        </span>
                      </td>
                      <td>
                        <StatusBadge
                          status={isComplete ? "approved" : "submitted"}
                          label={isComplete ? "Completed" : "In Progress"}
                        />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            open(emp.email);
                          }}
                        >
                          View Checklist →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
