import { useState, useEffect } from "react";

export default function StudyBuddyChat() {
  const [messages, setMessages] = useState([]);

  const [input, setInput] = useState("");

  useEffect(() => {
    loadChatHistory();
  }, []);

  async function loadChatHistory() {
    const token = localStorage.getItem("token");

    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/api/chatbot/history`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const data = await res.json();
    if (data.success) {
      setMessages(data.messages); // ⬅️ Save old messages
    }
  }

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "You", text: input };
    setMessages((prev) => [...prev, userMessage]);

    const token = localStorage.getItem("token");

    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/api/chatbot/message`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: input }),
      }
    );

    const data = await res.json();

    const botMsg = { sender: "StudyBuddy", text: data.reply };
    setMessages((prev) => [...prev, botMsg]);

    setInput("");
  };

  return (
    <div className="w-full h-[calc(100vh-4rem)] flex flex-col bg-gray-50">

      {/* Header */}
      <div className="bg-purple-600 text-white px-6 py-4 text-xl font-semibold shadow">
        StudyBuddy
      </div>

      {/* Chat Window */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.sender === "You" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`rounded-2xl px-4 py-3 max-w-[65%] shadow 
                ${msg.sender === "You" ? "bg-purple-200" : "bg-white"}`}
            >
              <p className="text-xs font-bold mb-1">
                {msg.sender}
              </p>
              <p className="text-sm">{msg.text}</p>
            </div>
          </div>
        ))}

      </div>

      {/* Input Bar */}
      <div className="p-4 bg-white border-t flex gap-3">
        <input
          className="flex-1 border px-4 py-2 rounded-lg shadow-sm focus:ring focus:ring-purple-300"
          placeholder="Ask StudyBuddy…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <button
          onClick={sendMessage}
          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow"
        >
          Send
        </button>
      </div>
    </div>
  );
}
