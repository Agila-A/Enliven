import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import models
import User from '../models/User.js';
import Roadmap from '../models/Roadmap.js';
import ChatbotContext from '../models/ChatbotContext.js';
import ProctorAttempt from '../models/ProctorAttempt.js';

const toSlug = (s = "") => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const toLevel = (s = "") => s.toLowerCase().replace(/[^a-z]/g, "");

async function fixData() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI not found in .env");
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    // 1. Fix Users
    const users = await User.find({});
    console.log(`Checking ${users.length} users...`);
    for (const user of users) {
      let changed = false;
      for (const enr of user.enrollments) {
        const correctDSlug = toSlug(enr.domain);
        const correctLSlug = toLevel(enr.skillLevel);
        const correctCID = `${correctDSlug}-${correctLSlug}`;

        if (enr.courseId !== correctCID || enr.domain !== correctDSlug) {
          console.log(`Fixing user ${user.email} enrollment: ${enr.courseId} -> ${correctCID}`);
          enr.courseId = correctCID;
          enr.domain = correctDSlug;
          changed = true;
        }
      }
      if (changed) await user.save();
    }

    // 2. Fix Roadmaps
    const roadmaps = await Roadmap.find({});
    console.log(`Checking ${roadmaps.length} roadmaps...`);
    for (const rm of roadmaps) {
      const dSlug = toSlug(rm.domain);
      const lSlug = toLevel(rm.skillLevel);
      const cId = `${dSlug}-${lSlug}`;

      if (rm.courseId !== cId || rm.domain !== dSlug) {
        console.log(`Fixing roadmap ${rm._id}: ${rm.courseId} -> ${cId}`);
        try {
          rm.courseId = cId;
          rm.domain = dSlug;
          await rm.save();
        } catch (err) {
          if (err.code === 11000) {
            console.log(`Duplicate roadmap found for ${rm.userId} - ${cId}, deleting old one.`);
            await Roadmap.deleteOne({ _id: rm._id });
          } else {
            console.error(`Error saving roadmap ${rm._id}:`, err.message);
          }
        }
      }
    }

    // 3. Fix ChatbotContexts
    const contexts = await ChatbotContext.find({});
    console.log(`Checking ${contexts.length} contexts...`);
    for (const ctx of contexts) {
      // Try to derive from courseId
      if (!ctx.courseId) continue;
      const parts = ctx.courseId.split('-');
      if (parts.length >= 2) {
        const level = parts.pop();
        const domain = parts.join('-');
        
        const dSlug = toSlug(domain);
        const lSlug = toLevel(level);
        const cId = `${dSlug}-${lSlug}`;

        if (ctx.courseId !== cId) {
          console.log(`Fixing context ${ctx._id}: ${ctx.courseId} -> ${cId}`);
          try {
            ctx.courseId = cId;
            await ctx.save();
          } catch (err) {
            if (err.code === 11000) {
              await ChatbotContext.deleteOne({ _id: ctx._id });
            }
          }
        }
      }
    }

    // 4. Fix ProctorAttempts
    const attempts = await ProctorAttempt.find({});
    console.log(`Checking ${attempts.length} attempts...`);
    for (const att of attempts) {
        const parts = att.courseId.split('-');
        if (parts.length >= 2) {
            const level = parts.pop();
            const domain = parts.join('-');
            const cId = `${toSlug(domain)}-${toLevel(level)}`;
            if (att.courseId !== cId) {
                console.log(`Fixing attempt ${att._id}: ${att.courseId} -> ${cId}`);
                att.courseId = cId;
                await att.save();
            }
        }
    }

    console.log("Fix complete!");
    process.exit(0);
  } catch (err) {
    console.error("Fix failed:", err);
    process.exit(1);
  }
}

fixData();
