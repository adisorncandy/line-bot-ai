"use client";
import { useState, useRef, useEffect, useCallback } from "react";

type Message = { role: "user" | "bot"; text: string; typing?: boolean };

const AVATAR = (
  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#06C755", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginRight: 8, flexShrink: 0 }}>🏠</div>
);

function Bubble({ m }: { m: Message }) {
  const isUser = m.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", alignItems: "flex-end" }}>
      {!isUser && AVATAR}
      <div style={{
        maxWidth: "75%", padding: "10px 14px",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        background: isUser ? "#06C755" : "#fff",
        color: isUser ? "#fff" : "#222",
        fontSize: 14, lineHeight: 1.7,
        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
        whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>
        {m.text}
        {m.typing && <span style={{ display: "inline-block", width: 6, height: 14, background: "#06C755", marginLeft: 2, borderRadius: 2, animation: "blink 0.7s step-end infinite", verticalAlign: "middle" }} />}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 0 }}>
      {AVATAR}
      <div style={{ background: "#fff", borderRadius: "18px 18px 18px 4px", padding: "12px 18px", boxShadow: "0 1px 2px rgba(0,0,0,0.1)", display: "flex", gap: 5, alignItems: "center" }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#aaa", display: "inline-block", animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

export default function TestChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "สวัสดีค่ะ ยินดีต้อนรับสู่ร้านหลังบ้าน\nของอร่อยจากพัทลุง 😊\n\nมีอะไรให้แอดมินช่วยได้บ้างคะ" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const typeMessage = useCallback((fullText: string) => {
    // add empty typing bubble
    setMessages((prev) => [...prev, { role: "bot", text: "", typing: true }]);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "bot", text: fullText.slice(0, i), typing: i < fullText.length };
        return next;
      });
      if (i >= fullText.length) clearInterval(interval);
    }, 18); // ~18ms per character ≈ natural typing speed
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/test-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      typeMessage(data.reply);
    } catch {
      typeMessage("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งค่ะ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: 480, margin: "0 auto", fontFamily: "sans-serif", background: "#f0f0f0" }}>
        {/* Header */}
        <div style={{ background: "#06C755", color: "#fff", padding: "16px", textAlign: "center", fontWeight: "bold", fontSize: 16 }}>
          🏠 หลังบ้าน - ของอร่อยจากพัทลุง
          <div style={{ fontSize: 11, fontWeight: "normal", opacity: 0.85 }}>ทดสอบระบบ AI Bot</div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.map((m, i) => <Bubble key={i} m={m} />)}
          {loading && <TypingDots />}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "12px 16px", background: "#fff", borderTop: "1px solid #ddd", display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="พิมพ์ข้อความ..."
            disabled={loading}
            style={{ flex: 1, padding: "10px 14px", borderRadius: 24, border: "1px solid #ddd", fontSize: 14, outline: "none" }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{ background: "#06C755", color: "#fff", border: "none", borderRadius: "50%", width: 44, height: 44, fontSize: 18, cursor: "pointer", flexShrink: 0, opacity: loading || !input.trim() ? 0.5 : 1 }}
          >
            ➤
          </button>
        </div>
      </div>
    </>
  );
}
