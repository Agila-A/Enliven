// src/utils/studyBuddy.js
//
// Calls POST /api/chatbot/context/update to keep Study Buddy's per-course
// context in sync whenever something meaningful happens (module opened,
// video watched, roadmap generated, etc.).
//
// courseId MUST be provided for the update to be persisted.
// If courseId is absent (e.g. during the domain-selection step before a
// course exists), the call is silently skipped — the backend also no-ops,
// but we skip the network round-trip entirely.

export async function updateStudyBuddyContext(partial) {
  const token    = localStorage.getItem("token");
  const courseId = partial.courseId || localStorage.getItem("activeCourseId") || null;

  if (!token)    return;
  if (!courseId) return; // No course context yet — skip silently

  try {
    await fetch(`${import.meta.env.VITE_API_URL}/api/chatbot/context/update`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify({
        courseId,
        event: partial.event || partial.step || "context_update",
        ...partial,
      }),
    });
  } catch (err) {
    console.debug("StudyBuddy context update skipped:", err?.message || err);
  }
}
