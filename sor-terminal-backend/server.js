// server.js
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const cookieParser = require("cookie-parser");

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// LOAD KOS LISTS
// ===============================
const generalKOS = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data/generalKOS.json"), "utf8")
);
const ddosers = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data/ddosers.json"), "utf8")
);

const normalize = s => s.trim().toLowerCase();

// ===============================
// AUTH: START MICROSOFT / OPENXBL LOGIN
// ===============================
// NOTE: Replace loginUrl with your actual provider login URL.
app.get("/auth/start", (req, res) => {
  const redirectUri = encodeURIComponent("https://your-domain.com/auth/callback");
  const loginUrl = `https://xbl.io/auth?redirect_uri=${redirectUri}`;
  res.redirect(loginUrl);
});

// ===============================
// AUTH: CALLBACK AFTER LOGIN
// ===============================
// Provider should redirect here with ?token=USER_TOKEN
app.get("/auth/callback", (req, res) => {
  const userToken = req.query.token;

  if (!userToken) {
    return res.status(400).send("Missing token from auth provider.");
  }

  // Store token in HTTP-only cookie
  res.cookie("xbl_token", userToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax"
  });

  res.redirect("/");
});

// ===============================
// GET AUTHENTICATED USER'S FRIENDS (Xbox API via user token)
// ===============================
app.get("/api/friends", async (req, res) => {
  const userToken = req.cookies.xbl_token;

  if (!userToken) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  try {
    const response = await axios.get("https://api.xbl.io/v2/friends", {
      headers: {
        "X-Authorization": userToken,
        "Accept": "application/json"
      }
    });

    const friends = response.data.people.map(p => p.gamertag);
    res.json({ friends });
  } catch (err) {
    console.error("XBOX API ERROR /api/friends:", err.response?.data || err);
    res.status(500).json({ error: "Failed to fetch friends from Xbox API." });
  }
});

// ===============================
// SCAN A PROVIDED FRIENDS LIST AGAINST KOS/DDOS
// ===============================
app.post("/api/scan", (req, res) => {
  const { gamertag, friends } = req.body;

  if (!friends || !Array.isArray(friends)) {
    return res.status(400).json({ error: "friends must be an array of gamertags." });
  }

  const gtStatus = {
    isGeneralKOS: generalKOS.some(k => normalize(k) === normalize(gamertag || "")),
    isDDOS: ddosers.some(d => normalize(d) === normalize(gamertag || ""))
  };

  const normalizedFriends = friends.map(f => normalize(f));

  const hitsGeneral = normalizedFriends.filter(f =>
    generalKOS.some(k => normalize(k) === f)
  );

  const hitsDDOS = normalizedFriends.filter(f =>
    ddosers.some(d => normalize(d) === f)
  );

  res.json({
    gamertag,
    gtStatus,
    friends,
    generalKOS: hitsGeneral,
    ddosers: hitsDDOS
  });
});

// ===============================
// OPTIONAL: LOG SCAN RESULTS
// ===============================
app.post("/api/logScan", (req, res) => {
  const payload = req.body;
  const logLine = `[${new Date().toISOString()}] ${JSON.stringify(payload)}\n`;

  fs.appendFile(path.join(__dirname, "data/scanLogs.txt"), logLine, err => {
    if (err) {
      console.error("Failed to log scan:", err);
      return res.status(500).json({ error: "Failed to log scan." });
    }
    res.json({ status: "logged" });
  });
});

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SOR backend running on port ${PORT}`);
});
