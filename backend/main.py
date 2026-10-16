import os
from fastapi import FastAPI, Header, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import db, agent
from db import sb

app = FastAPI(title="OnboardHub API")
origins = [o.strip() for o in os.getenv("ALLOWED_ORIGIN", "http://localhost:5173").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)

def hr_only(key):
    if not key or key != os.getenv("HR_KEY"):
        raise HTTPException(401, "Invalid HR key")

class Chat(BaseModel):
    message: str
    history: list = []

class NewEmp(BaseModel):
    name: str
    email: str
    role: str
    department: str
    start_date: str
    manager: str = ""

class Review(BaseModel):
    email: str
    task_title: str
    approve: bool
    note: str = ""

class Info(BaseModel):
    email: str
    phone: str
    address: str
    emergency_name: str
    emergency_phone: str

@app.get("/health")
def health():
    return {"ok": True}

# ---------------- HR ----------------
@app.get("/hr/employees")
def hr_list(x_hr_key: str = Header(None)):
    hr_only(x_hr_key)
    return db.list_employees()

@app.post("/hr/employees")
def hr_register(e: NewEmp, x_hr_key: str = Header(None)):
    hr_only(x_hr_key)
    r = db.register_employee(**e.model_dump())
    if "error" in r:
        raise HTTPException(400, r["error"])
    return r

@app.get("/hr/employee")
def hr_detail(email: str, x_hr_key: str = Header(None)):
    hr_only(x_hr_key)
    emp = db.get_employee(email)
    if not emp:
        raise HTTPException(404, "Employee not found")
    tasks = sb.table("tasks").select("*").eq("employee_id", emp["id"]).order("created_at").execute().data
    for t in tasks:
        if t.get("document_path"):
            s = sb.storage.from_("documents").create_signed_url(t["document_path"], 600)
            t["document_url"] = s.get("signedURL") or s.get("signedUrl")
    return {"employee": emp, "tasks": tasks}

@app.post("/hr/review")
def hr_review(r: Review, x_hr_key: str = Header(None)):
    hr_only(x_hr_key)
    return db.review_task(r.email, r.task_title, r.approve, r.note)

@app.post("/hr/agent")
def hr_agent(c: Chat, x_hr_key: str = Header(None)):
    hr_only(x_hr_key)
    return {"reply": agent.run_agent(c.history[-10:], c.message)}

# ---------------- Employee ----------------
@app.get("/me")
def me(email: str):
    emp = db.get_employee(email)
    if not emp:
        raise HTTPException(404, "No employee found with this email")
    tasks = sb.table("tasks").select("*").eq("employee_id", emp["id"]).order("created_at").execute().data
    return {"employee": emp, "tasks": [t for t in tasks if t["owner"] == "employee"]}

@app.put("/me/info")
def save_info(i: Info):
    emp = db.get_employee(i.email)
    if not emp:
        raise HTTPException(404, "Employee not found")
    sb.table("employees").update({
        "phone": i.phone, "address": i.address,
        "emergency_name": i.emergency_name, "emergency_phone": i.emergency_phone,
    }).eq("id", emp["id"]).execute()
    sb.table("tasks").update({"status": "done"}).eq("employee_id", emp["id"]) \
        .eq("title", "Complete personal information").execute()
    return {"ok": True}

@app.post("/me/upload")
async def upload(email: str = Form(...), task_id: str = Form(...), file: UploadFile = File(...)):
    emp = db.get_employee(email)
    if not emp:
        raise HTTPException(404, "Employee not found")
    if file.content_type not in ("application/pdf", "image/jpeg", "image/png"):
        raise HTTPException(400, "Only PDF, JPG or PNG files are allowed")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 5 MB)")
    task = sb.table("tasks").select("id").eq("id", task_id).eq("employee_id", emp["id"]).execute().data
    if not task:
        raise HTTPException(404, "Task not found")
    path = f"{emp['id']}/{task_id}_{file.filename.replace(' ', '_')}"
    sb.storage.from_("documents").upload(path, data, {"content-type": file.content_type, "upsert": "true"})
    sb.table("tasks").update({"document_path": path, "status": "submitted", "review_note": None}) \
        .eq("id", task_id).execute()
    return {"ok": True}