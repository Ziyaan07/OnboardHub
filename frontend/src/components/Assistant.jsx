import { useState, useRef, useEffect } from "react";
import { apiCall } from "../api";
import { useToast } from "../context/ToastContext";
import { IconBot, IconSparkles, IconAlertCircle } from "./shared/Icons";
import Spinner from "./shared/Spinner";

const EXAMPLE_PROMPTS = [
  "Show everyone's progress",
  "Who has pending documents?",
  "Draft a reminder for the employee with the most pending tasks",
  "What tasks are assigned to Alex Johnson?"
];

export function Assistant({ hrKey }) {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      content:
        "Hello! I am your AI HR Assistant. I can check onboarding statuses, inspect pending documents, register new hires, or draft friendly reminder emails for you. How can I help today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const chatEndRef = useRef(null);
  const { addToast } = useToast();

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, busy]);

  const handleSend = async (customText) => {
    const textToSend = (customText ?? input).trim();
    if (!textToSend || busy) return;

    // Build history for backend agent
    const history = messages.map((m) => ({
      role: m.role === "bot" ? "assistant" : "user",
      content: m.content
    }));

    setMessages((prev) => [...prev, { role: "user", content: textToSend }]);
    if (!customText) setInput("");
    setBusy(true);

    try {
      const res = await apiCall("/hr/agent", {
        method: "POST",
        hrKey,
        body: {
          message: textToSend,
          history: history.slice(-10)
        }
      });

      setMessages((prev) => [
        ...prev,
        { role: "bot", content: res.reply || "Done." }
      ]);
    } catch (err) {
      addToast(err.message || "Failed to reach AI assistant", "error");
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content:
            "Sorry, I encountered an issue connecting to the agent. Please make sure the Groq API key is valid."
        }
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="assistant-content">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="section-title">AI Onboarding Assistant</h2>
          <p className="section-desc">
            Powered by Groq LLM with direct access to your database to inspect progress and automate actions.
          </p>
        </div>
      </div>

      {/* Capabilities Info Callout */}
      <div className="card assistant-help-card">
        <div className="help-icon-wrap">
          <IconSparkles size={20} />
        </div>
        <div className="help-content">
          <h4 className="help-title">What can the assistant do?</h4>
          <p className="help-text">
            Ask questions in plain English like <em>"Who hasn't uploaded their ID?"</em>,{" "}
            <em>"Register a software engineer named Jordan"</em>, or{" "}
            <em>"Draft a polite reminder email for Alex"</em>.
          </p>
        </div>
      </div>

      {/* Chat Container Card */}
      <div className="card chat-card">
        {/* Suggestion Chips */}
        <div className="chat-chips-row">
          <span className="chips-label">Try asking:</span>
          {EXAMPLE_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              className="prompt-chip"
              disabled={busy}
              onClick={() => handleSend(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <div className="chat-thread" role="log" aria-live="polite">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`chat-bubble-row ${m.role === "user" ? "row-user" : "row-bot"}`}
            >
              {m.role === "bot" && (
                <div className="chat-avatar bot-avatar">
                  <IconBot size={16} />
                </div>
              )}
              <div
                className={`chat-bubble ${m.role === "user" ? "bubble-user" : "bubble-bot"}`}
              >
                <div className="bubble-text">{m.content}</div>
              </div>
            </div>
          ))}

          {busy && (
            <div className="chat-bubble-row row-bot">
              <div className="chat-avatar bot-avatar">
                <IconBot size={16} />
              </div>
              <div className="chat-bubble bubble-bot thinking-bubble">
                <span className="thinking-dot" />
                <span className="thinking-dot" />
                <span className="thinking-dot" />
                <span className="thinking-label">AI is thinking…</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="chat-input-bar">
          <input
            type="text"
            className="chat-input"
            placeholder="Type your instruction or question (e.g. 'Show everyone's progress')…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={busy}
          />
          <button
            type="button"
            className="btn btn-primary chat-send-btn"
            disabled={busy || !input.trim()}
            onClick={() => handleSend()}
          >
            {busy ? <Spinner size={16} /> : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Assistant;
