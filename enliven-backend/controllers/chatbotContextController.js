import ChatbotContext from "../models/ChatbotContext.js";

export const updateContext = async (req, res) => {
  try {
    const userId = req.userId;  // ✅ FIXED
    const { event, ...payload } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "Missing userId" });
    }

    let ctx = await ChatbotContext.findOne({ userId });

    if (!ctx) {
      ctx = new ChatbotContext({ userId, context: {} });
    }

    // 🧠 append event to context
    ctx.context = {
      ...ctx.context,
      lastEvent: event,
      ...payload,
    };

    await ctx.save();

    return res.json({ success: true, context: ctx.context });
  } catch (err) {
    console.log("Context update error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
export const getChatHistory = async (req, res) => {
  try {
    const ctx = await ChatbotContext.findOne({ userId: req.userId });

    res.json({
      success: true,
      messages: ctx?.messages || []
    });
  } catch (e) {
    console.error("Get history error:", e);
    res.status(500).json({ success: false });
  }
};
