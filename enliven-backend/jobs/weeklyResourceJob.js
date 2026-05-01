import cron       from "node-cron"
import User       from "../models/User.js"
import { runWeeklyJobForUser } from "../controllers/webExplorerController.js"

/*
  Runs every Sunday at 2:00 AM server time.
  Cron expression: "0 2 * * 0"
  - 0 = minute 0
  - 2 = hour 2 (2 AM)
  - * = every day of month
  - * = every month
  - 0 = Sunday

  For each user with an active roadmap, fetch fresh resources
  for all modules. Runs sequentially across users with a 5-second
  delay between users to avoid Groq rate limits.
*/
export function startWeeklyResourceJob() {
  cron.schedule("0 2 * * 0", async () => {
    console.log("[WeeklyResourceJob] Starting weekly resource refresh —", new Date().toISOString())

    try {
      // Get all student users — skip mentors and admins
      const users = await User.find({ role: "student" }).select("_id").lean()

      console.log(`[WeeklyResourceJob] Processing ${users.length} users`)

      for (const user of users) {
        try {
          await runWeeklyJobForUser(user._id)
          console.log(`[WeeklyResourceJob] Completed user ${user._id}`)
        } catch (err) {
          console.error(`[WeeklyResourceJob] Failed for user ${user._id}:`, err.message)
          // Continue to next user even if one fails
        }

        // 5-second delay between users
        await new Promise(resolve => setTimeout(resolve, 5000))
      }

      console.log("[WeeklyResourceJob] Weekly refresh complete —", new Date().toISOString())
    } catch (err) {
      console.error("[WeeklyResourceJob] Fatal error:", err.message)
    }
  })

  console.log("[WeeklyResourceJob] Scheduled — runs every Sunday at 2:00 AM")
}
