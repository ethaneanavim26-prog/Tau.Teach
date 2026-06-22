import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Plus } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Solve a quadratic equation",
  "Explain integration by parts",
  "Help me with limits",
  "What is the chain rule?",
];

// ─── LaTeX + Markdown Renderer ────────────────────────────────────────────────

function MessageContent({ content, katexReady }) {
  if (!katexReady || !window.katex) {
    return <span style={{ whiteSpace: "pre-wrap" }}>{content}</span>;
  }

  const displayRegex = /\$\$([\s\S]*?)\$\$/g;
  const segments = [];
  let last = 0, m;

  displayRegex.lastIndex = 0;
  while ((m = displayRegex.exec(content)) !== null) {
    if (m.index > last) segments.push({ type: "text", value: content.slice(last, m.index) });
    segments.push({ type: "display", value: m[1] });
    last = m.index + m[0].length;
  }
  if (last < content.length) segments.push({ type: "text", value: content.slice(last) });

  const renderInline = (text) => {
    return text.split(/(\$(?!\$)[^$\n]+?\$)/g).map((p, i) => {
      if (p.startsWith("$") && p.endsWith("$") && p.length > 2) {
        try {
          const html = window.katex.renderToString(p.slice(1, -1), { throwOnError: false });
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch { return <span key={i}>{p}</span>; }
      }
      return p.split(/(\*\*[^*]+\*\*)/g).map((bp, j) =>
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
              <div key={i} style={{ margin: "14px 0", overflowX: "auto" }}
                dangerouslySetInnerHTML={{ __html: html }} />
            );
          } catch { return <code key={i} style={{ color: "#a78bfa" }}>{seg.value}</code>; }
        }
        return <span key={i}>{renderInline(seg.value)}</span>;
      })}
    </>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function Home() {
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

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const newChat = () => {
    const id = Date.now().toString();
    setChats(p => [...p, { id, title: "New Chat", messages: [] }]);
    setCurrentId(id);
    setInput("");
  };

  const send = async (text) => {
    const content = text.trim();
    if (!content || loading) return;

    const userMsg = { role: "user", content, id: Date.now() };
    const updatedMsgs = [...messages, userMsg];

    setChats(p => p.map(c => c.id === currentId
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
      // ── Claude: calls our secure backend, not the API directly ─────────────
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMsgs.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Backend error");
      }

      const reply = data.content?.[0]?.text || "Sorry, something went wrong.";

      // ── Gemini: fetch supplementary resources via our secure backend ────────
      fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: content }),
      })
        .then(r => r.json())
        .then(({ resources }) => {
          if (resources) {
            // TODO: surface resources in UI (video panel, worksheet links)
            console.log("Gemini resources:", resources);
          }
        })
        .catch(err => console.error("Resources fetch failed:", err));

      setChats(p => p.map(c => c.id === currentId
        ? { ...c, messages: [...c.messages, { role: "assistant", content: reply, id: Date.now() + 1 }] }
        : c
      ));
    } catch (err) {
      setChats(p => p.map(c => c.id === currentId
        ? {
            ...c,
            messages: [
              ...c.messages,
              { role: "assistant", content: `Error: ${err.message}. Check that your API key is configured.`, id: Date.now() + 1 },
            ],
          }
        : c
      ));
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const handleChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  // ─── Styles ───────────────────────────────────────────────────────────────

  const S = {
    root: {
      display: "flex", height: "100vh", background: "#0f0f0f", color: "#e2e2e2",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif', overflow: "hidden",
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
    logoText: { fontSize: "14px", fontWeight: "600", letterSpacing: "-0.3px" },
    newBtn: {
      display: "flex", alignItems: "center", gap: "7px", padding: "8px 10px",
      background: "transparent", border: "1px solid #222", borderRadius: "8px",
      color: "#aaa", cursor: "pointer", fontSize: "13px", marginBottom: "10px",
      fontFamily: "inherit", width: "100%",
    },
    histItem: {
      padding: "7px 10px", borderRadius: "6px", cursor: "pointer",
      fontSize: "12px", marginBottom: "1px",
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    },
    main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
    welcome: {
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "40px 24px",
    },
    msgs: { flex: 1, overflowY: "auto", padding: "28px 0" },
    msgsInner: { maxWidth: "660px", margin: "0 auto", padding: "0 20px" },
    row: { display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "22px" },
    avatar: {
      width: "26px", height: "26px", borderRadius: "6px",
      background: "linear-gradient(135deg, #5b5ef4, #818cf8)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "11px", fontWeight: "700", flexShrink: 0, marginTop: "2px",
    },
    inputWrap: { padding: "10px 20px 18px" },
    inputBox: {
      maxWidth: "660px", margin: "0 auto", background: "#161616",
      border: "1px solid #222", borderRadius: "13px", padding: "11px 14px",
    },
    textarea: {
      width: "100%", background: "transparent", border: "none", outline: "none",
      color: "#d8d8d8", fontSize: "14px", resize: "none", fontFamily: "inherit",
      minHeight: "24px", lineHeight: "1.55", display: "block",
    },
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={S.root}>

      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div style={S.logo}>
          <div style={S.logoIcon}>T</div>
          <span style={S.logoText}>TauTeach AI</span>
        </div>
        <button onClick={newChat} style={S.newBtn}
          onMouseEnter={e => e.currentTarget.style.background = "#1e1e1e"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <Plus size={14} strokeWidth={2.5} /> New chat
        </button>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {chats.map(c => (
            <div key={c.id} onClick={() => setCurrentId(c.id)} style={{
              ...S.histItem,
              background: c.id === currentId ? "#1e1e1e" : "transparent",
              color: c.id === currentId ? "#e2e2e2" : "#555",
            }}>
              {c.title}
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main style={S.main}>
        {messages.length === 0 ? (
          <div style={S.welcome}>
            <h1 style={{ fontSize: "28px", fontWeight: "600", marginBottom: "10px", letterSpacing: "-0.5px" }}>
              What can I help with?
            </h1>
            <p style={{ color: "#4a4a4a", fontSize: "14px", textAlign: "center", maxWidth: "340px", lineHeight: "1.55", marginBottom: "32px" }}>
              Ask any math question — from algebra to differential equations.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", maxWidth: "460px" }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} style={{
                  padding: "9px 16px", borderRadius: "20px", border: "1px solid #242424",
                  background: "#161616", color: "#888", cursor: "pointer",
                  fontSize: "13px", fontFamily: "inherit",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#3f3f3f"; e.currentTarget.style.color = "#e2e2e2"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#242424"; e.currentTarget.style.color = "#888"; }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={S.msgs}>
            <div style={S.msgsInner}>
              {messages.map(msg => (
                <div key={msg.id} style={{ ...S.row, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                  {msg.role === "assistant" && <div style={S.avatar}>T</div>}
                  <div style={{
                    maxWidth: "82%", padding: "11px 15px", fontSize: "14px",
                    lineHeight: "1.7", color: "#d8d8d8",
                    background: msg.role === "user" ? "#5b5ef4" : "#1a1a1a",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                  }}>
                    {msg.role === "assistant"
                      ? <MessageContent content={msg.content} katexReady={katexReady} />
                      : msg.content}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div style={{ ...S.row, flexDirection: "row" }}>
                  <div style={S.avatar}>T</div>
                  <div style={{ padding: "14px 16px", background: "#1a1a1a", borderRadius: "4px 16px 16px 16px", display: "flex", gap: "5px", alignItems: "center" }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: "6px", height: "6px", background: "#5b5ef4",
                        borderRadius: "50%", animation: `pulse 1.2s ease-in-out ${i * 0.18}s infinite`,
                      }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        )}

        {/* Input */}
        <div style={S.inputWrap}>
          <div style={S.inputBox}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleChange}
              onKeyDown={handleKey}
              placeholder="Ask a math question..."
              rows={1}
              style={S.textarea}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "9px" }}>
              <Paperclip size={14} style={{ color: "#3a3a3a" }} />
              <button onClick={() => send(input)} disabled={!input.trim() || loading}
                style={{
                  width: "28px", height: "28px", borderRadius: "7px", border: "none",
                  background: input.trim() && !loading ? "#5b5ef4" : "#1f1f1f",
                  cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                <Send size={12} style={{ color: input.trim() && !loading ? "#fff" : "#333" }} />
              </button>
            </div>
          </div>
          <p style={{ textAlign: "center", color: "#252525", fontSize: "11px", marginTop: "10px" }}>
            TauTeach AI · Powered by Claude &amp; Gemini
          </p>
        </div>
      </main>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.25;transform:scale(.75)} 50%{opacity:1;transform:scale(1.1)} }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; }
        textarea::placeholder { color: #383838; }
        .katex { font-size: 1em; }
      `}</style>
    </div>
  );
}
