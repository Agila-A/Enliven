import Groq          from "groq-sdk"
import ResourceCache from "../models/ResourceCache.js"
import Roadmap       from "../models/Roadmap.js"

function createGroqClient() {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY missing")
  return new Groq({ apiKey: process.env.GROQ_API_KEY })
}

const toSlug  = s => String(s || "").toLowerCase().replace(/\s+/g, "-")
const toLevel = s => String(s || "").replace(/[^a-zA-Z\s]/g, "").toLowerCase().replace(/[^a-z]/g, "")

function extractJSON(raw) {
  if (!raw) throw new Error("Empty response")
  raw = raw.replace(/```json|```/gi, "").trim()
  const start = raw.indexOf("{")
  const end   = raw.lastIndexOf("}")
  if (start === -1 || end === -1) throw new Error("No JSON object found")
  return JSON.parse(
    raw.slice(start, end + 1)
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/[\u0000-\u001F]+/g, " ")
  )
}

async function fetchResourcesForTopic({
  topicTitle,
  domain,
  skillLevel,
  userId,
  courseId,
  moduleId,
  triggerType = "scheduled",
}) {
  // Upsert with pending status immediately
  // so frontend polling finds a doc right away
  await ResourceCache.findOneAndUpdate(
    { userId, courseId, moduleId },
    {
      $set: {
        topicTitle,
        domain,
        skillLevel,
        status:      "pending",
        triggerType,
        fetchedAt:   new Date(),
        expiresAt:   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        resources: {
          articles:      [],
          documentation: [],
          tools:         [],
          practice:      [],
          videos:        [],
        },
      }
    },
    { upsert: true }
  )

  const prompt = `
You are a learning resource curator for an e-learning platform.

Find the best learning resources for a student studying:
Topic: "${topicTitle}"
Domain: ${domain}
Skill Level: ${skillLevel}

Curate EXACTLY the following — choose the single best resource per slot:

IMPORTANT RULES:
- Every URL must be a real, well-known URL that is likely still active
- Prefer official sources: MDN, official docs, W3Schools, freeCodeCamp, roadmap.sh, GeeksForGeeks, LeetCode, HackerRank, Codecademy, YouTube channels (Traversy Media, Fireship, The Net Ninja, Corey Schafer, Sentdex etc.)
- For videos: prefer YouTube URLs from well-known educational channels
- Match difficulty to "${skillLevel}" level
- For each resource write a specific one-sentence description of exactly what it teaches

Output ONLY this JSON object, nothing else:

{
  "articles": [
    {
      "title": "Article title",
      "url": "https://...",
      "description": "What this specific article teaches and why it is useful for this topic",
      "type": "article",
      "isFree": true,
      "difficulty": "${skillLevel}"
    },
    {
      "title": "Second article",
      "url": "https://...",
      "description": "...",
      "type": "article",
      "isFree": true,
      "difficulty": "${skillLevel}"
    }
  ],
  "documentation": [
    {
      "title": "Official documentation title",
      "url": "https://...",
      "description": "What section of the docs this is and what it covers",
      "type": "documentation",
      "isFree": true,
      "difficulty": "all"
    }
  ],
  "tools": [
    {
      "title": "Tool name",
      "url": "https://...",
      "description": "What this tool does and how it helps with ${topicTitle}",
      "type": "tool",
      "isFree": true,
      "difficulty": "all"
    }
  ],
  "practice": [
    {
      "title": "Practice platform or challenge",
      "url": "https://...",
      "description": "What type of practice this offers and why it is relevant",
      "type": "practice",
      "isFree": true,
      "difficulty": "${skillLevel}"
    }
  ],
  "videos": [
    {
      "title": "Video title — Channel Name",
      "url": "https://www.youtube.com/watch?v=...",
      "description": "What this video teaches and approximately how long it is",
      "type": "video",
      "isFree": true,
      "difficulty": "${skillLevel}"
    },
    {
      "title": "Second video",
      "url": "https://www.youtube.com/watch?v=...",
      "description": "...",
      "type": "video",
      "isFree": true,
      "difficulty": "${skillLevel}"
    }
  ]
}

Each category must have at least 1 resource. articles and videos must have exactly 2.
`.trim()

  try {
    const groq       = createGroqClient()
    const completion = await groq.chat.completions.create({
      model:       "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens:  2000,
      messages: [
        {
          role:    "system",
          content: "You are a learning resource curator. Output only valid JSON. Every URL must be from a well-known, reputable source.",
        },
        { role: "user", content: prompt },
      ],
    })

    const raw    = completion.choices?.[0]?.message?.content
    const parsed = extractJSON(raw)

    await ResourceCache.findOneAndUpdate(
      { userId, courseId, moduleId },
      {
        $set: {
          resources: {
            articles:      parsed.articles      || [],
            documentation: parsed.documentation || [],
            tools:         parsed.tools         || [],
            practice:      parsed.practice      || [],
            videos:        parsed.videos        || [],
          },
          status:    "ready",
          fetchedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      }
    )
  } catch (err) {
    console.error(`Resource fetch error for ${topicTitle}:`, err.message)
    await ResourceCache.findOneAndUpdate(
      { userId, courseId, moduleId },
      { $set: { status: "failed" } }
    )
  }
}

export async function runWeeklyJobForUser(userId) {
  try {
    const roadmap = await Roadmap.findOne({ userId }).lean()
    if (!roadmap?.topics?.length) return

    const domainSlug = toSlug(roadmap.domain)
    const levelSlug  = toLevel(roadmap.skillLevel)
    const courseId   = `${domainSlug}-${levelSlug}`

    // Run for each topic sequentially to avoid Groq rate limits
    for (const topic of roadmap.topics) {
      const moduleId = String(topic.sequenceNumber)

      // Check if cache is fresh — skip if updated within last 6 days
      const existing = await ResourceCache.findOne({ userId, courseId, moduleId })
      if (existing?.status === "ready" && existing.fetchedAt) {
        const ageDays = (Date.now() - new Date(existing.fetchedAt)) / (1000 * 60 * 60 * 24)
        if (ageDays < 6) {
          continue // still fresh — skip
        }
      }

      await fetchResourcesForTopic({
        topicTitle:  topic.title,
        domain:      roadmap.domain,
        skillLevel:  roadmap.skillLevel,
        userId,
        courseId,
        moduleId,
        triggerType: "scheduled",
      })

      // 4 second delay between topics to respect Groq rate limits
      await new Promise(resolve => setTimeout(resolve, 4000))
    }
  } catch (err) {
    console.error(`Weekly job error for user ${userId}:`, err.message)
  }
}

/* GET /api/resources/:moduleId?courseId=xxx
   Returns cached resources for a module.
   If cache is missing or stale, triggers a background fetch
   and returns { status: "pending" } immediately.
   Frontend polls until status === "ready".
*/
export const getModuleResources = async (req, res) => {
  try {
    const { moduleId } = req.params
    const { courseId }  = req.query
    const userId = req.userId

    if (!courseId) {
      return res.status(400).json({ success: false, message: "courseId is required" })
    }

    const cache = await ResourceCache.findOne({ userId, courseId, moduleId }).lean()

    // Cache hit and fresh
    if (cache?.status === "ready") {
      const ageDays = (Date.now() - new Date(cache.fetchedAt)) / (1000 * 60 * 60 * 24)
      if (ageDays < 7) {
        return res.json({
          success:     true,
          status:      "ready",
          resources:   cache.resources,
          fetchedAt:   cache.fetchedAt,
          topicTitle:  cache.topicTitle,
        })
      }
    }

    // Cache pending — already being generated
    if (cache?.status === "pending") {
      return res.json({ success: true, status: "pending", resources: null })
    }

    // Cache missing, stale, or failed — need to fetch topic title from roadmap
    // then trigger background fetch
    const roadmap = await Roadmap.findOne({ userId }).lean()
    const topic   = roadmap?.topics?.find(t => String(t.sequenceNumber) === String(moduleId))

    if (!topic) {
      return res.status(404).json({ success: false, message: "Module not found in roadmap" })
    }

    // Trigger background fetch — do not await
    fetchResourcesForTopic({
      topicTitle:  topic.title,
      domain:      roadmap.domain,
      skillLevel:  roadmap.skillLevel,
      userId,
      courseId,
      moduleId,
      triggerType: "manual",
    }).catch(err => console.error("Background resource fetch error:", err.message))

    return res.json({ success: true, status: "pending", resources: null })
  } catch (err) {
    console.error("getModuleResources error:", err)
    res.status(500).json({ success: false, message: "Failed to fetch resources" })
  }
}

/* POST /api/resources/:moduleId/refresh
   Manually trigger a resource refresh for a specific module.
   Ignores cache freshness — always re-runs.
*/
export const refreshModuleResources = async (req, res) => {
  try {
    const { moduleId } = req.params
    const { courseId }  = req.body
    const userId = req.userId

    if (!courseId) {
      return res.status(400).json({ success: false, message: "courseId is required" })
    }

    const roadmap = await Roadmap.findOne({ userId }).lean()
    const topic   = roadmap?.topics?.find(t => String(t.sequenceNumber) === String(moduleId))

    if (!topic) {
      return res.status(404).json({ success: false, message: "Module not found in roadmap" })
    }

    // Set to pending immediately
    await ResourceCache.findOneAndUpdate(
      { userId, courseId, moduleId },
      { $set: { status: "pending" } },
      { upsert: true }
    )

    // Trigger background fetch — always re-runs regardless of freshness
    fetchResourcesForTopic({
      topicTitle:  topic.title,
      domain:      roadmap.domain,
      skillLevel:  roadmap.skillLevel,
      userId,
      courseId,
      moduleId,
      triggerType: "manual",
    }).catch(err => console.error("Manual refresh error:", err.message))

    return res.json({
      success: true,
      status:  "pending",
      message: "Resource refresh started. Check back in about 20 seconds.",
    })
  } catch (err) {
    console.error("refreshModuleResources error:", err)
    res.status(500).json({ success: false, message: "Failed to trigger refresh" })
  }
}

/* GET /api/resources/all?courseId=xxx
   Returns all cached resources for all modules in the course.
   Used by ResourcesPage on initial load to show what is already cached.
*/
export const getAllCachedResources = async (req, res) => {
  try {
    const { courseId } = req.query
    const userId = req.userId

    if (!courseId) {
      return res.status(400).json({ success: false, message: "courseId is required" })
    }

    const caches = await ResourceCache.find({ userId, courseId }).lean()

    const byModule = {}
    for (const c of caches) {
      byModule[c.moduleId] = {
        status:     c.status,
        resources:  c.resources,
        fetchedAt:  c.fetchedAt,
        topicTitle: c.topicTitle,
      }
    }

    return res.json({ success: true, byModule })
  } catch (err) {
    console.error("getAllCachedResources error:", err)
    res.status(500).json({ success: false, message: "Failed to fetch all resources" })
  }
}
