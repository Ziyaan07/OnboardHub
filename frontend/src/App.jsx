import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function call(path, { method = "GET", body, hrKey, form } = {}) {
  const headers = {};
  if (hrKey) headers["X-HR-Key"] = hrKey;
  let payload;
  if (form) payload = form;
  else if (body) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
  const res = await fetch(API + path, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Please check the fields and try again");
  return data;
}

const Bar = ({ p }) => <div className="bar"><i className={p === 100 ? "full" : ""} style={{ width: p + "%" }} /></div>;
const statusTag = (s) => ({ approved: "ok", done: "ok", submitted: "wa", rejected: "er" }[s] || "");

/* ---------------- Landing ---------------- */
function Landing({ onHr, onEmp }) {
  const [key, setKey] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const hrLogin = async () => {
    setBusy(true); setErr("");
    try { await call("/hr/employees", { hrKey: key }); onHr(key); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const empLogin = async () => {
    setBusy(true); setErr("");
    try { await call("/me?email=" + encodeURIComponent(email)); onEmp(email.trim().toLowerCase()); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <div className="wrap">
      <h2>Welcome to OnboardHub</h2>
      <p className="mu">Simple, tracked employee onboarding. Choose how you want to continue.</p>
      {err && <div className="err">{err}</div>}
      <div className="grid">
        <div className="card">
          <h3>I'm HR</h3>
          <label>HR access key</label>
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} />
          <p><button className="btn p" disabled={busy || !key} onClick={hrLogin}>Enter HR area</button></p>
        </div>
        <div className="card">
          <h3>I'm a new employee</h3>
          <label>Your work email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          <p><button className="btn p" disabled={busy || !email} onClick={empLogin}>Open my onboarding</button></p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- HR: dashboard ---------------- */
function Dashboard({ list, loading, open }) {
  const total = list.length, done = list.filter((e) => e.progress_percent === 100).length;
  return (
    <>
      <div className="grid" style={{ marginBottom: 16 }}>
        <div className="stat"><b>{total}</b><span className="mu">Total employees</span></div>
        <div className="stat"><b>{total - done}</b><span className="mu">In progress</span></div>
        <div className="stat"><b>{done}</b><span className="mu">Completed</span></div>
      </div>
      <div className="card tw">
        {loading ? <p className="mu">Loading…</p> : !total ? <p className="mu">No employees yet. Use "Register employee".</p> :
          <table>
            <thead><tr><th>Employee</th><th>Start date</th><th>Progress</th><th>Pending</th><th></th></tr></thead>
            <tbody>{list.map((e) => (
              <tr key={e.email}>
                <td><b>{e.name}</b><div className="mu">{e.email}</div></td>
                <td>{e.start_date}</td>
                <td style={{ minWidth: 130 }}><Bar p={e.progress_percent} /><span className="mu">{e.progress_percent}%</span></td>
                <td>{e.pending_tasks.length}</td>
                <td><button className="btn" onClick={() => open(e.email)}>View</button></td>
              </tr>))}
            </tbody>
          </table>}
      </div>
    </>
  );
}

/* ---------------- HR: register ---------------- */
function Register({ hrKey, done }) {
  const [f, setF] = useState({ name: "", email: "", role: "", department: "General", start_date: "", manager: "" });
  const [msg, setMsg] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async () => {
    setErr(""); setMsg("");
    if (!f.name || !f.role || !f.start_date || !/^\S+@\S+\.\S+$/.test(f.email)) return setErr("Fill all required fields with a valid email");
    setBusy(true);
    try {
      const r = await call("/hr/employees", { method: "POST", body: f, hrKey });
      setMsg(`Registered ${r.employee}. ${r.tasks_assigned} tasks assigned.`);
      setF({ name: "", email: "", role: "", department: "General", start_date: "", manager: "" });
      done();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <div className="card">
      <h3>Register new employee</h3>
      {err && <div className="err">{err}</div>}{msg && <div className="okmsg">{msg}</div>}
      <div className="grid">
        <div><label>Full name *</label><input value={f.name} onChange={set("name")} /></div>
        <div><label>Email *</label><input value={f.email} onChange={set("email")} /></div>
        <div><label>Job title *</label><input value={f.role} onChange={set("role")} /></div>
        <div><label>Department</label>
          <select value={f.department} onChange={set("department")}><option>General</option><option>Engineering</option><option>Sales</option></select></div>
        <div><label>Start date *</label><input type="date" value={f.start_date} onChange={set("start_date")} /></div>
        <div><label>Manager</label><input value={f.manager} onChange={set("manager")} /></div>
      </div>
      <p className="mu">A checklist is assigned automatically based on department.</p>
      <button className="btn p" disabled={busy} onClick={submit}>{busy ? "Saving…" : "Register & assign checklist"}</button>
    </div>
  );
}

/* ---------------- HR: employee detail ---------------- */
function Detail({ hrKey, email, refresh }) {
  const [d, setD] = useState(null), [err, setErr] = useState(""), [notes, setNotes] = useState({});
  const load = () => call("/hr/employee?email=" + encodeURIComponent(email), { hrKey }).then(setD).catch((e) => setErr(e.message));
  useEffect(() => { if (email) load(); }, [email]);
  if (!email) return <div className="card mu">Pick an employee from the Dashboard (click View).</div>;
  if (err) return <div className="err">{err}</div>;
  if (!d) return <p className="mu">Loading…</p>;
  const review = async (t, approve) => {
    if (!approve && !(notes[t.id] || "").trim()) return setErr("Please write a reason when rejecting");
    setErr("");
    try { await call("/hr/review", { method: "POST", hrKey, body: { email, task_title: t.title, approve, note: notes[t.id] || "" } }); await load(); refresh(); }
    catch (e) { setErr(e.message); }
  };
  const e = d.employee;
  return (
    <>
      <div className="card"><h2>{e.name}</h2>
        <div className="mu">{e.role} · {e.department} · {e.email} · starts {e.start_date}</div>
        {e.phone && <div className="mu">Phone: {e.phone} · Emergency: {e.emergency_name} ({e.emergency_phone}) · {e.address}</div>}
      </div>
      <div className="card"><h3>Tasks</h3>
        {d.tasks.map((t) => (
          <div className="task" key={t.id}>
            <div className="t"><b>{t.title}</b>
              <div className="mu">{t.owner === "hr" ? "HR / IT task" : "Employee task"}{t.requires_document ? " · document required" : ""}{t.review_note ? " · note: " + t.review_note : ""}</div></div>
            <span className={"tag " + statusTag(t.status)}>{t.status}</span>
            {t.document_url && <a className="btn" href={t.document_url} target="_blank" rel="noreferrer">View document</a>}
            {t.status === "submitted" && <>
              <input style={{ maxWidth: 180 }} placeholder="Note / reason" value={notes[t.id] || ""} onChange={(ev) => setNotes({ ...notes, [t.id]: ev.target.value })} />
              <button className="btn ok" onClick={() => review(t, true)}>Approve</button>
              <button className="btn er" onClick={() => review(t, false)}>Reject</button></>}
            {t.owner === "hr" && t.status === "pending" &&
              <button className="btn" onClick={() => review(t, true)}>Mark done</button>}
          </div>))}
      </div>
    </>
  );
}

/* ---------------- HR: AI assistant ---------------- */
function Assistant({ hrKey }) {
  const [msgs, setMsgs] = useState([]), [text, setText] = useState(""), [busy, setBusy] = useState(false);
  const examples = ["Show everyone's progress", "Who has pending documents?", "Draft a reminder for the employee with the most pending tasks"];
  const send = async (m) => {
    const message = (m ?? text).trim();
    if (!message || busy) return;
    const history = msgs.map((x) => ({ role: x.role === "bot" ? "assistant" : "user", content: x.content }));
    setMsgs((p) => [...p, { role: "user", content: message }]); setText(""); setBusy(true);
    try {
      const r = await call("/hr/agent", { method: "POST", hrKey, body: { message, history } });
      setMsgs((p) => [...p, { role: "bot", content: r.reply }]);
    } catch (e) { setMsgs((p) => [...p, { role: "bot", content: "Error: " + e.message }]); }
    setBusy(false);
  };
  return (
    <div className="card">
      <h3>AI onboarding assistant</h3>
      <p className="mu">It can register employees, check progress, add tasks, approve or reject, and draft reminders.</p>
      <div className="row" style={{ marginBottom: 8 }}>{examples.map((x) => <span key={x} className="chip" onClick={() => send(x)}>{x}</span>)}</div>
      <div className="chat">
        {msgs.map((m, i) => <div key={i} className={"msg " + m.role}>{m.content}</div>)}
        {busy && <div className="msg bot mu">Thinking…</div>}
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <input style={{ flex: 1 }} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="e.g. Register Sara Ahmed, sara@test.com, Sales, start 2026-11-10" />
        <button className="btn p" disabled={busy} onClick={() => send()}>Send</button>
      </div>
    </div>
  );
}

/* ---------------- HR area ---------------- */
function HrArea({ hrKey }) {
  const [tab, setTab] = useState("dash"), [list, setList] = useState([]), [loading, setLoading] = useState(true), [sel, setSel] = useState("");
  const load = () => { setLoading(true); call("/hr/employees", { hrKey }).then(setList).catch(() => { }).finally(() => setLoading(false)); };
  useEffect(load, []);
  const tabs = [["dash", "Dashboard"], ["reg", "Register employee"], ["det", "Employee detail"], ["ai", "AI assistant"]];
  return (
    <div className="wrap">
      <div className="tabs">{tabs.map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === "dash" && <Dashboard list={list} loading={loading} open={(e) => { setSel(e); setTab("det"); }} />}
      {tab === "reg" && <Register hrKey={hrKey} done={load} />}
      {tab === "det" && <Detail hrKey={hrKey} email={sel} refresh={load} />}
      {tab === "ai" && <Assistant hrKey={hrKey} />}
    </div>
  );
}

/* ---------------- Employee area ---------------- */
function EmployeeArea({ email }) {
  const [d, setD] = useState(null), [err, setErr] = useState(""), [msg, setMsg] = useState(""), [tab, setTab] = useState("pending"), [busyId, setBusyId] = useState("");
  const [info, setInfo] = useState({ phone: "", address: "", emergency_name: "", emergency_phone: "" });
  const load = () => call("/me?email=" + encodeURIComponent(email)).then((r) => {
    setD(r); const e = r.employee;
    setInfo({ phone: e.phone || "", address: e.address || "", emergency_name: e.emergency_name || "", emergency_phone: e.emergency_phone || "" });
  }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  if (err && !d) return <div className="wrap"><div className="err">{err}</div></div>;
  if (!d) return <div className="wrap mu">Loading…</div>;

  const tasks = d.tasks, isDone = (t) => ["approved", "done"].includes(t.status);
  const pct = tasks.length ? Math.round(100 * tasks.filter(isDone).length / tasks.length) : 0;
  const shown = tasks.filter((t) => (tab === "pending" ? !isDone(t) : isDone(t)));

  const saveInfo = async () => {
    setErr(""); setMsg("");
    if (Object.values(info).some((v) => !v.trim())) return setErr("Please fill every field");
    try { await call("/me/info", { method: "PUT", body: { email, ...info } }); setMsg("Information saved"); load(); }
    catch (e) { setErr(e.message); }
  };
  const upload = async (t, file) => {
    if (!file) return;
    setErr(""); setMsg(""); setBusyId(t.id);
    const form = new FormData(); form.append("email", email); form.append("task_id", t.id); form.append("file", file);
    try { await call("/me/upload", { method: "POST", form }); setMsg("Uploaded. HR will review it."); await load(); }
    catch (e) { setErr(e.message); }
    setBusyId("");
  };

  return (
    <div className="wrap">
      <div className="card"><h2>Welcome, {d.employee.name.split(" ")[0]}!</h2>
        <div className="mu">{d.employee.role} · starts {d.employee.start_date}</div>
        <div style={{ marginTop: 10 }}><Bar p={pct} /><span className="mu">{pct}% complete</span></div></div>
      {err && <div className="err">{err}</div>}{msg && <div className="okmsg">{msg}</div>}
      <div className="card"><h3>Personal information</h3>
        <div className="grid">
          {[["phone", "Phone"], ["address", "Home address"], ["emergency_name", "Emergency contact name"], ["emergency_phone", "Emergency contact phone"]].map(([k, l]) =>
            <div key={k}><label>{l}</label><input value={info[k]} onChange={(e) => setInfo({ ...info, [k]: e.target.value })} /></div>)}
        </div>
        <p><button className="btn p" onClick={saveInfo}>Save information</button></p></div>
      <div className="tabs">
        <button className={tab === "pending" ? "on" : ""} onClick={() => setTab("pending")}>Pending</button>
        <button className={tab === "done" ? "on" : ""} onClick={() => setTab("done")}>Completed</button></div>
      <div className="card">
        {!shown.length && <p className="mu">{tab === "pending" ? "Nothing pending. Great job!" : "Nothing completed yet."}</p>}
        {shown.map((t) => (
          <div className="task" key={t.id}>
            <div className="t"><b>{t.title}</b>
              <div className="mu">{t.requires_document ? "Upload PDF/JPG/PNG, max 5 MB" : "Fill in the form above"}</div>
              {t.status === "rejected" && <div className="err" style={{ margin: "6px 0 0" }}>Rejected: {t.review_note || "please re-upload"}</div>}</div>
            <span className={"tag " + statusTag(t.status)}>{t.status === "submitted" ? "awaiting HR review" : t.status}</span>
            {t.requires_document && ["pending", "rejected"].includes(t.status) &&
              <label className="btn p" style={{ margin: 0, cursor: "pointer" }}>
                {busyId === t.id ? "Uploading…" : t.status === "rejected" ? "Re-upload" : "Upload"}
                <input type="file" hidden accept=".pdf,image/png,image/jpeg" disabled={!!busyId} onChange={(e) => upload(t, e.target.files[0])} />
              </label>}
          </div>))}
      </div>
    </div>
  );
}

/* ---------------- App ---------------- */
export default function App() {
  const [hrKey, setHrKey] = useState(""), [email, setEmail] = useState("");
  const out = () => { setHrKey(""); setEmail(""); };
  return (
    <>
      <header><div className="logo">Onboard<span>Hub</span></div>
        {(hrKey || email) && <button className="btn" onClick={out}>Log out</button>}</header>
      {hrKey ? <HrArea hrKey={hrKey} /> : email ? <EmployeeArea email={email} /> : <Landing onHr={setHrKey} onEmp={setEmail} />}
    </>
  );
}