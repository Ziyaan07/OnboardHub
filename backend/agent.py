import json
from groq import Groq
import db
from db import _get

client = Groq(api_key=_get("GROQ_API_KEY"))
# Check console.groq.com/docs/models if this model name stops working
MODEL = "openai/gpt-oss-120b"

def tool(name, desc, props, required):
    return {"type": "function", "function": {
        "name": name, "description": desc,
        "parameters": {"type": "object", "properties": props, "required": required}}}

S = {"type": "string"}
TOOLS = [
    tool("register_employee", "Register a new employee and assign their onboarding checklist.",
         {"name": S, "email": S, "role": S,
          "department": {"type": "string", "enum": ["Engineering", "Sales", "General"]},
          "start_date": {"type": "string", "description": "YYYY-MM-DD"}, "manager": S},
         ["name", "email", "role", "department", "start_date"]),
    tool("employee_status", "Get progress and pending tasks for one employee by email.",
         {"email": S}, ["email"]),
    tool("list_employees", "List all employees with progress and pending tasks.", {}, []),
    tool("add_task", "Add a custom task to an employee.",
         {"email": S, "title": S, "requires_document": {"type": "boolean"}}, ["email", "title"]),
    tool("review_task", "Approve or reject an employee's task or document.",
         {"email": S, "task_title": S, "approve": {"type": "boolean"}, "note": S},
         ["email", "task_title", "approve"]),
]

FUNCS = {n: getattr(db, n) for n in
         ["register_employee", "employee_status", "list_employees", "add_task", "review_task"]}

SYSTEM = (
    "You are an HR onboarding assistant. Use the tools to read or change data; never invent "
    "employee data. If required details are missing (such as email or start date), ask for them. "
    "Keep replies short and clear. When asked, draft friendly reminder messages using the "
    "employee's real pending tasks."
)

def run_agent(history, user_msg):
    msgs = [{"role": "system", "content": SYSTEM}] + history + [{"role": "user", "content": user_msg}]
    for _ in range(5):  # max 5 tool rounds
        m = client.chat.completions.create(
            model=MODEL, messages=msgs, tools=TOOLS, tool_choice="auto"
        ).choices[0].message
        if not m.tool_calls:
            return m.content
        msgs.append({"role": "assistant", "content": m.content or "", "tool_calls": [
            {"id": c.id, "type": "function",
             "function": {"name": c.function.name, "arguments": c.function.arguments}}
            for c in m.tool_calls]})
        for c in m.tool_calls:
            try:
                out = FUNCS[c.function.name](**json.loads(c.function.arguments or "{}"))
            except Exception as e:
                out = {"error": str(e)}
            msgs.append({"role": "tool", "tool_call_id": c.id,
                         "content": json.dumps(out, default=str)})
    return "Sorry, I couldn't complete that. Please try rephrasing."