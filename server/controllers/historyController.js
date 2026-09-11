import MatchHistory from "../models/MatchHistoryModel.js";

export const getUserHistory = async (req, res) => {
  try {
    const userId = req.userId; // Provided by verifyToken middleware
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const history = await MatchHistory.find({ "players.userId": userId })
      .sort({ playedAt: -1 })
      .limit(50); // Get last 50 matches

    res.json(history);
  } catch (error) {
    console.error("Error fetching user history:", error);
    res.status(500).json({ error: "Failed to fetch match history" });
  }
};
