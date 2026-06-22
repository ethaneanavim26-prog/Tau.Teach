import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Paperclip, Plus } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Solve a quadratic equation",
  "Explain integration by parts",
  "Help me with limits",
  "What is the chain rule?",
];

const CLAUDE_SYSTEM_PROMPT = `You are TauTeach AI, a world-class math tutor. Your job is to explain math clearly, step-by-step, adapting to the student.

Formatting rules you must always follow:
- Use $...$ for ALL inline math. Example: The slope is $m = \\frac{rise}{run}$.
- Use $$...$$ on its own line for display math. Example: $$\\int_a^b f(x)\\,dx = F(b) - F(a)$$
- Use **bold** for key terms and step labels like **Step 1:**
- Show every step. Never skip algebra.
- Be encouraging but concise.`;

// ─── Gemini Resource Fetcher (stubbed — plug in your Gemini API key here) ────
// When connected, this returns { videos: [...], worksheets: [...] } for a topic.
async function fetchGeminiResources(topic) {
  // TODO: Replace with real Gemini API call
  // const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_KEY", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ contents: [{ parts: [{ text: `Find 2 YouTube videos and 1 worksheet for: ${topic}` }] }] })
  // });
  // const data = await res.json();
  // return parseGeminiResources(data);
  return null;
}

// ─── LaTeX + Markdown Renderer ────────────────────────────────────────────────

function MessageContent({ content, katexReady }) {
  if (!katexReady || !window.katex) {
    return <span style={{ whiteSpace: "pre-wrap" }}>{content}</span>;
  }

  // Split on display math $$...$$
  const displayRegex = /\$\$([\s\S]*?)\$\$/g;
  const segments = [];
  let last = 0;
  let m;

  displayRegex.lastIndex = 0;
  while ((m = displayRegex.exec(content)) !== null) {
    if (m.index > last) segments.push({ type: "text", value: content.slice(last, m.index) });
    segments.push({ type: "display", value: m[1] });
    last = m.index + m[0].length;
  }
  if (last < content.length) segments.push({ type: "text", value: content.slice(last) });

  const renderInline = (text, key) => {
    const parts = text.split(/(\$(?!\$)[^$\n]+?\$)/g);
    return parts.map((p, i) => {
      // Inline math
      if (p.startsWith("$") && p.endsWith("$") && p.length > 2) {
        try {
          const html = window.katex.renderToString(p.slice(1, -1), { throwOnError: false });
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <span key={i}>{p}</span>;
        }
      }
      // Bold **text**
      const boldParts = p.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((bp, j) =>
        bp.startsWith("**") && bp.endsWith("**")
          ? <strong key={j} style={{ color: "#e2e2e2" }}>{bp.slice(2, -2)}</strong>
          : <span key={j} style={{ whiteSpace: "pre-wrap" }}>{bp}</span>
      );
    });
  };

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === "display") {
          try {
            const html = window.katex.renderToString(seg.value, { throwOnError: false, displayMode: true });
            return (
              <div key={i} style={{ margin: "14px 0", overflowX: "auto", padding: "4px 0" }}
                dangerouslySetInnerHTML={{ __html: html }} />
            );
          } catch {
            return <code key={i} style={{ display: "block", margin: "10px 0", color: "#a78bfa" }}>{seg.value}</code>;
          }
        }
        return <span key={i}>{renderInline(seg.value, i)}</span>;
      })}
    </>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function TauTeachAI() {
  const [chats, setChats] = useState([{ id: "1", title: "New Chat", messages: [] }]);
  const [currentId, setCurrentId] = useState("1");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [katexReady, setKatexReady] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const current = chats.find(c => c.id === currentId) || chats[0];
  const messages = current.messages;

  // Load KaTeX from CDN
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
    script.onload = () => setKatexReady(true);
    document.head.appendChild(script);
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const newChat = () => {
    const id = Date.now().toString();
    setChats(prev => [...prev, { id, title: "New Chat", messages: [] }]);
    setCurrentId(id);
    setInput("");
  };

  const send = async (text) => {
    const content = text.trim();
    if (!content || loading) return;

    const userMsg = { role: "user", content, id: Date.now() };
    const updatedMsgs = [...messages, userMsg];

    setChats(prev => prev.map(c =>
      c.id === currentId
        ? {
            ...c,
            messages: updatedMsgs,
            title: messages.length === 0
              ? (content.length > 38 ? content.slice(0, 38) + "…" : content)
              : c.title,
          }
        : c
    ));
    setInput("");
    setLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = "24px";

    try {
      // ── Claude: core math tutoring ─────────────────────────────────────────
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: CLAUDE_SYSTEM_PROMPT,
          messages: updatedMsgs.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      const reply = data.content?.[0]?.text || "Sorry, something went wrong.";

      // ── Gemini: supplementary resources (YouTube, worksheets) ─────────────
      // Runs in parallel — results can be attached to the message when ready.
      fetchGeminiResources(content).then(resources => {
        if (resources) {
          // TODO: surface resources in UI (videos panel, worksheet links)
          console.log("Gemini resources:", resources);
        }
      });

      const assistantMsg = { role: "assistant", content: reply, id: Date.now() + 1 };

      setChats(prev => prev.map(c =>
        c.id === currentId
          ? { ...c, messages: [...c.messages, assistantMsg] }
          : c
      ));
    } catch {
      setChats(prev => prev.map(c =>
        c.id === currentId
          ? { ...c, messages: [...c.messages, { role: "assistant", content: "Something went wrong. Please try again.", id: Date.now() + 1 }] }
          : c
      ));
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={styles.root}>

      {/* ── Sidebar ── */}
      <aside style={styles.sidebar}>
        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoIcon}>T</div>
          <span style={styles.logoText}>TauTeach AI</span>
        </div>

        {/* New Chat */}
        <button onClick={newChat} style={styles.newChatBtn}
          onMouseEnter={e => e.currentTarget.style.background = "#1e1e1e"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <Plus size={14} strokeWidth={2.5} />
          New chat
        </button>

        {/* History */}
        <div style={styles.history}>
          {chats.map(chat => (
            <div key={chat.id} onClick={() => setCurrentId(chat.id)} style={{
              ...styles.historyItem,
              background: chat.id === currentId ? "#1e1e1e" : "transparent",
              color: chat.id === currentId ? "#e2e2e2" : "#555",
            }}
              onMouseEnter={e => { if (chat.id !== currentId) e.currentTarget.style.color = "#888"; }}
              onMouseLeave={e => { if (chat.id !== currentId) e.currentTarget.style.color = "#555"; }}>
              {chat.title}
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={styles.main}>

        {messages.length === 0 ? (
          /* Welcome screen */
          <div style={styles.welcome}>
            <h1 style={styles.welcomeTitle}>What can I help with?</h1>
            <p style={styles.welcomeSub}>
              Ask any math question — from algebra to differential equations.
            </p>
            <div style={styles.chips}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} style={styles.chip}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#3f3f3f"; e.currentTarget.style.color = "#e2e2e2"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#242424"; e.currentTarget.style.color = "#888"; }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages */
          <div style={styles.messages}>
            <div style={styles.messagesInner}>
              {messages.map(msg => (
                <div key={msg.id} style={{
                  ...styles.msgRow,
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                }}>
                  {msg.role === "assistant" && <div style={styles.avatar}>T</div>}
                  <div style={{
                    ...styles.bubble,
                    background: msg.role === "user" ? "#5b5ef4" : "#1a1a1a",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                    marginLeft: msg.role === "user" ? 0 : 0,
                  }}>
                    {msg.role === "assistant"
                      ? <MessageContent content={msg.content} katexReady={katexReady} />
                      : msg.content}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div style={{ ...styles.msgRow, flexDirection: "row" }}>
                  <div style={styles.avatar}>T</div>
                  <div style={{ ...styles.bubble, background: "#1a1a1a", borderRadius: "4px 16px 16px 16px" }}>
                    <div style={styles.dots}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ ...styles.dot, animationDelay: `${i * 0.18}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>
        )}

        {/* ── Input area ── */}
        <div style={styles.inputWrap}>
          <div style={styles.inputBox}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKey}
              placeholder="Ask a math question..."
              rows={1}
              style={styles.textarea}
            />
            <div style={styles.inputRow}>
              <Paperclip size={14} style={{ color: "#3a3a3a", cursor: "pointer" }} />
              <button onClick={() => send(input)} disabled={!input.trim() || loading}
                style={{
                  ...styles.sendBtn,
                  background: input.trim() && !loading ? "#5b5ef4" : "#1f1f1f",
                  cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                }}>
                <Send size={12} style={{ color: input.trim() && !loading ? "#fff" : "#333" }} />
              </button>
            </div>
          </div>
          <p style={styles.footer}>TauTeach AI · Powered by Claude &amp; Gemini</p>
        </div>
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: .25; transform: scale(.75); }
          50%       { opacity: 1;   transform: scale(1.1);  }
        }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; }
        textarea::placeholder { color: #383838; }
        .katex { font-size: 1em; }
      `}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  root: {
    display: "flex", height: "100vh", background: "#0f0f0f", color: "#e2e2e2",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
    overflow: "hidden",
  },
  sidebar: {
    width: "215px", background: "#111", borderRight: "1px solid #1a1a1a",
    display: "flex", flexDirection: "column", padding: "16px 10px", flexShrink: 0,
  },
  logo: { display: "flex", alignItems: "center", gap: "9px", padding: "4px 8px", marginBottom: "18px" },
  logoIcon: {
    width: "28px", height: "28px", borderRadius: "7px",
    background: "linear-gradient(135deg, #5b5ef4, #818cf8)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "12px", fontWeight: "700", flexShrink: 0,
  },
  logoText: { fontSize: "14px", fontWeight: "600", letterSpacing: "-0.3px", color: "#e2e2e2" },
  newChatBtn: {
    display: "flex", alignItems: "center", gap: "7px", padding: "8px 10px",
    background: "transparent", border: "1px solid #222", borderRadius: "8px",
    color: "#aaa", cursor: "pointer", fontSize: "13px", marginBottom: "10px",
    transition: "background 0.15s", fontFamily: "inherit",
  },
  history: { flex: 1, overflowY: "auto" },
  historyItem: {
    padding: "7px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px",
    marginBottom: "1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    transition: "color 0.15s",
  },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  welcome: {
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", padding: "40px 24px",
  },
  welcomeTitle: { fontSize: "28px", fontWeight: "600", marginBottom: "10px", letterSpacing: "-0.5px", color: "#e8e8e8" },
  welcomeSub: { color: "#4a4a4a", fontSize: "14px", textAlign: "center", maxWidth: "340px", lineHeight: "1.55", marginBottom: "32px" },
  chips: { display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", maxWidth: "460px" },
  chip: {
    padding: "9px 16px", borderRadius: "20px", border: "1px solid #242424",
    background: "#161616", color: "#888", cursor: "pointer", fontSize: "13px",
    fontFamily: "inherit", transition: "all 0.15s",
  },
  messages: { flex: 1, overflowY: "auto", padding: "28px 0" },
  messagesInner: { maxWidth: "660px", margin: "0 auto", padding: "0 20px" },
  msgRow: { display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "22px" },
  avatar: {
    width: "26px", height: "26px", borderRadius: "6px",
    background: "linear-gradient(135deg, #5b5ef4, #818cf8)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "11px", fontWeight: "700", flexShrink: 0, marginTop: "2px",
  },
  bubble: { maxWidth: "82%", padding: "11px 15px", fontSize: "14px", lineHeight: "1.7", color: "#d8d8d8" },
  dots: { display: "flex", gap: "4px", alignItems: "center", padding: "2px 0" },
  dot: { width: "6px", height: "6px", background: "#5b5ef4", borderRadius: "50%", animation: "pulse 1.2s ease-in-out infinite" },
  inputWrap: { padding: "10px 20px 18px" },
  inputBox: {
    maxWidth: "660px", margin: "0 auto", background: "#161616",
    border: "1px solid #222", borderRadius: "13px", padding: "11px 14px",
  },
  textarea: {
    width: "100%", background: "transparent", border: "none", outline: "none",
    color: "#d8d8d8", fontSize: "14px", resize: "none", fontFamily: "inherit",
    minHeight: "24px", maxHeight: "120px", lineHeight: "1.55", display: "block",
  },
  inputRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "9px" },
  sendBtn: {
    width: "28px", height: "28px", borderRadius: "7px", border: "none",
    display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s",
  },
  footer: { textAlign: "center", color: "#252525", fontSize: "11px", marginTop: "10px" },
};
