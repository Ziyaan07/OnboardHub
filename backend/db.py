import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

def _get(key):
    return os.getenv(key)

sb = create_client(_get("SUPABASE_URL"), _get("SUPABASE_KEY"))

# (title, owner, requires_document)
CHECKLISTS = {
    "General": [
        ("Complete personal information", "employee", False),
        ("Upload government ID", "employee", True),
        ("Upload signed offer letter", "employee", True),
        ("Upload bank details", "employee", True),
        ("Create email and system accounts", "hr", False),
        ("Issue ID badge", "hr", False),
        ("Prepare workstation", "hr", False),
    ],
    "Engineering": [("Sign NDA", "employee", True), ("Set up VPN and GitHub access", "hr", False)],
    "Sales": [("Sign commission plan", "employee", True), ("Grant CRM access", "hr", False)],
}

def register_employee(name, email, role, department, start_date, manager=""):
    email = email.strip().lower()
    if sb.table("employees").select("id").eq("email", email).execute().data:
        return {"error": "An employee with this email already exists"}
    emp = sb.table("employees").insert({
        "name": name, "email": email, "role": role,
        "department": department, "start_date": start_date, "manager": manager,
    }).execute().data[0]
    items = CHECKLISTS["General"] + CHECKLISTS.get(department, [])
    sb.table("tasks").insert([
        {"employee_id": emp["id"], "title": t, "owner": o, "requires_document": d}
        for t, o, d in items
    ]).execute()
    return {"ok": True, "employee": name, "tasks_assigned": len(items)}

def get_employee(email):
    r = sb.table("employees").select("*").eq("email", email.strip().lower()).execute().data
    return r[0] if r else None

def employee_status(email):
    emp = get_employee(email)
    if not emp:
        return {"error": "Employee not found"}
    tasks = sb.table("tasks").select("*").eq("employee_id", emp["id"]).execute().data
    done = [t for t in tasks if t["status"] in ("approved", "done")]
    pending = [t["title"] for t in tasks if t["status"] not in ("approved", "done")]
    return {
        "name": emp["name"], "email": emp["email"], "start_date": emp["start_date"],
        "progress_percent": round(100 * len(done) / len(tasks)) if tasks else 0,
        "pending_tasks": pending,
    }

def list_employees():
    emails = [e["email"] for e in sb.table("employees").select("email").execute().data]
    return [employee_status(e) for e in emails]

def add_task(email, title, requires_document=False):
    emp = get_employee(email)
    if not emp:
        return {"error": "Employee not found"}
    sb.table("tasks").insert({
        "employee_id": emp["id"], "title": title, "requires_document": requires_document,
    }).execute()
    return {"ok": True}

def review_task(email, task_title, approve, note=""):
    emp = get_employee(email)
    if not emp:
        return {"error": "Employee not found"}
    status = "approved" if approve else "rejected"
    r = (sb.table("tasks").update({"status": status, "review_note": note})
         .eq("employee_id", emp["id"]).eq("title", task_title).execute())
    return {"ok": bool(r.data), "status": status}