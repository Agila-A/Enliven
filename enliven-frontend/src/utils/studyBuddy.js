// src/utils/studyBuddy.js
export async function updateStudyBuddyContext(partial) {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    await fetch(`${import.meta.env.VITE_API_URL}/api/chatbot/context/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      // IMPORTANT: wrap in { context: ... }
      body: JSON.stringify({ context: partial }),
    });
  } catch (err) {
    console.debug("StudyBuddy context update skipped:", err?.message || err);
  }
}
