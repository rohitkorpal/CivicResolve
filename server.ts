import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { CommunityIssue, IssueComment, CitizenLeaderboardEntry } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

// Set high transfer limit for base64 image uploads
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

const DB_FILE = path.join(process.cwd(), "db.json");

// Lazy-initialize Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      try {
        aiClient = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });
      } catch (e) {
        console.error("Failed to initialize Gemini Client:", e);
      }
    }
  }
  return aiClient;
}

// Initial Database Seeding
const INITIAL_ISSUES: CommunityIssue[] = [
  {
    id: "issue-1",
    title: "Large Deep Pothole on Maple Avenue",
    description: "A hazardous pothole has developed right in the middle of the driving lane. Cars are forced to swerve into the oncoming traffic lane to avoid it. Extremely dangerous at night.",
    category: "Pothole",
    severity: "High",
    status: "Investigating",
    latitude: 37.7739,
    longitude: -122.4312,
    address: "524 Maple Avenue, Near Community Park",
    upvotes: ["sarah.jones@example.com", "david.kim@example.com", "officer.miller@gov.org"],
    reporterName: "Alex Mercer",
    reporterEmail: "alex.mercer@example.com",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    aiTags: ["road-safety", "pothole", "traffic-hazard", "asphalt"],
    aiSafetyAdvice: "Slow down when approaching. Avoid swerving abruptly into the opposing lane. Use warning hazards if braking quickly.",
    actionTaken: "Municipal road crew has scheduled temporary cold patch repair for Tuesday morning."
  },
  {
    id: "issue-2",
    title: "Ruptured Water Pipe Leakage",
    description: "Fresh water has been bubbling up through the sidewalk cracks for the past 24 hours. The walkway is completely flooded, wasting thousands of gallons of clean water.",
    category: "Water Leakage",
    severity: "High",
    status: "Verified",
    latitude: 37.7850,
    longitude: -122.4180,
    address: "88 Pine Street, Tech Plaza Area",
    upvotes: ["alex.mercer@example.com", "elena.rodriguez@example.com"],
    reporterName: "Sarah Jones",
    reporterEmail: "sarah.jones@example.com",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    aiTags: ["water-waste", "flooding", "utility", "sidewalk"],
    aiSafetyAdvice: "Slippery hazard! Pedetrians should bypass this segment. Avoid splashing vehicles. Report to local Utility Hub."
  },
  {
    id: "issue-3",
    title: "Completely Damaged Streetlight near Bus Stop",
    description: "The street light right next to the busy school bus stop is entirely black. It has been out for a week, making the evening waiting spot completely dark and unsafe.",
    category: "Damaged Streetlight",
    severity: "Medium",
    status: "Resolved",
    latitude: 37.7600,
    longitude: -122.4400,
    address: "12 Sunset Boulevard, West End Corner",
    upvotes: ["sarah.jones@example.com", "community.lead@mail.com"],
    reporterName: "David Kim",
    reporterEmail: "david.kim@example.com",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    aiTags: ["dark-spot", "public-safety", "street-light", "electrical"],
    aiSafetyAdvice: "Stay under lit building commercial awnings while waiting for the bus. Carry a small flashlight or keep phone light handy.",
    actionTaken: "Bulb replaced with modern energy-efficient LED and wiring junction box successfully repaired."
  },
  {
    id: "issue-4",
    title: "Illegal Trash Dumping in Back Alley",
    description: "Someone left several discarded mattresses, wooden pallets, and bags of construction debris right in the narrow residential passage.",
    category: "Waste & Trash",
    severity: "Medium",
    status: "Open",
    latitude: 37.7900,
    longitude: -122.4050,
    address: "349 Commercial Alley, Financial District",
    upvotes: ["alex.mercer@example.com"],
    reporterName: "Elena Rodriguez",
    reporterEmail: "elena.rodriguez@example.com",
    createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), // 10 hours ago
    aiTags: ["refuse", "litter", "blockage", "sanitation"],
    aiSafetyAdvice: "Watch out for nails or rusty splinters extending from the pallets. Keep children and pets away from construction rubbish."
  }
];

const INITIAL_COMMENTS: IssueComment[] = [
  {
    id: "comment-1",
    issueId: "issue-1",
    citizenName: "Sarah Jones",
    citizenEmail: "sarah.jones@example.com",
    content: "I hit this pothole yesterday! It is extremely deep and dented my tire rims. Everyone please watch out near the corner!",
    isOfficial: false,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "comment-2",
    issueId: "issue-1",
    citizenName: "Elena Rodriguez",
    citizenEmail: "elena.rodriguez@example.com",
    content: "I did community verification on this pothole. It's indeed more than 5 inches deep now.",
    isOfficial: false,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "comment-3",
    issueId: "issue-1",
    citizenName: "Officer Miller (City Roads)",
    citizenEmail: "officer.miller@gov.org",
    content: "Thank you for the detailed report and exact geo-location! A road inspect tech checked the coordinates. Scheduled for rapid temporary patch repair on Tuesday morning.",
    isOfficial: true,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "comment-4",
    issueId: "issue-3",
    citizenName: "Alex Mercer",
    citizenEmail: "alex.mercer@example.com",
    content: "The lights are fully functional now! Walked by this evening and verified the solar lamp works perfectly. Excellent work by the community and utilities team.",
    isOfficial: false,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const INITIAL_LEADERBOARD: CitizenLeaderboardEntry[] = [
  {
    email: "alex.mercer@example.com",
    name: "Alex Mercer",
    points: 340,
    badge: "Community Legend",
    reportsCount: 9,
    verificationsCount: 14
  },
  {
    email: "sarah.jones@example.com",
    name: "Sarah Jones",
    points: 215,
    badge: "Infrastructure Ace",
    reportsCount: 6,
    verificationsCount: 8
  },
  {
    email: "elena.rodriguez@example.com",
    name: "Elena Rodriguez",
    points: 155,
    badge: "Street Guardian",
    reportsCount: 4,
    verificationsCount: 7
  },
  {
    email: "david.kim@example.com",
    name: "David Kim",
    points: 120,
    badge: "Eco Warrior",
    reportsCount: 3,
    verificationsCount: 4
  }
];

// Helper to load database
interface DbData {
  issues: CommunityIssue[];
  comments: IssueComment[];
  leaderboard: CitizenLeaderboardEntry[];
}

function readDb(): DbData {
  if (!fs.existsSync(DB_FILE)) {
    const data = { issues: INITIAL_ISSUES, comments: INITIAL_COMMENTS, leaderboard: INITIAL_LEADERBOARD };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return data;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("Error reading db file, falling back to initial data", error);
    return { issues: INITIAL_ISSUES, comments: INITIAL_COMMENTS, leaderboard: INITIAL_LEADERBOARD };
  }
}

// Helper to save database
function writeDb(data: DbData) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing db file", error);
  }
}

// Award or adjust score helper
function adjustScore(email: string, name: string, change: number, actionType: "report" | "verify") {
  const db = readDb();
  let user = db.leaderboard.find((u) => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    user = {
      email: email,
      name: name || email.split("@")[0],
      points: 0,
      badge: "Novice Solver",
      reportsCount: 0,
      verificationsCount: 0
    };
    db.leaderboard.push(user);
  }

  user.points += change;
  if (user.points < 0) user.points = 0;

  if (actionType === "report") {
    user.reportsCount += 1;
  } else if (actionType === "verify") {
    user.verificationsCount += 1;
  }

  // Recalculate badges based on total points
  if (user.points >= 300) {
    user.badge = "Community Legend";
  } else if (user.points >= 200) {
    user.badge = "Infrastructure Ace";
  } else if (user.points >= 100) {
    user.badge = "Street Guardian";
  } else if (user.points >= 40) {
    user.badge = "Eco Warrior";
  } else {
    user.badge = "Novice Solver";
  }

  writeDb(db);
}

// GET Issues
app.get("/api/issues", (req, res) => {
  const db = readDb();
  res.json(db.issues);
});

// GET Leaderboard
app.get("/api/leaderboard", (req, res) => {
  const db = readDb();
  // Sort leaderboard by points descending
  const sorted = [...db.leaderboard].sort((a, b) => b.points - a.points);
  res.json(sorted);
});

// GET Comments by Issue ID
app.get("/api/issues/:id/comments", (req, res) => {
  const db = readDb();
  const issueComments = db.comments.filter((c) => c.issueId === req.params.id);
  res.json(issueComments);
});

// POST Comment on Issue
app.post("/api/issues/:id/comments", (req, res) => {
  const { citizenName, citizenEmail, content } = req.body;
  if (!citizenName || !citizenEmail || !content) {
    return res.status(400).json({ error: "Missing required parameters for comment." });
  }

  const db = readDb();
  const issue = db.issues.find((i) => i.id === req.params.id);
  if (!issue) {
    return res.status(404).json({ error: "Issue not found." });
  }

  const isOfficial = citizenEmail.endsWith(".gov") || citizenEmail.endsWith(".gov.org") || citizenEmail.includes("municipal") || citizenEmail.includes("officer");

  const newComment: IssueComment = {
    id: `comment-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    issueId: req.params.id,
    citizenName,
    citizenEmail,
    content,
    isOfficial,
    createdAt: new Date().toISOString()
  };

  db.comments.push(newComment);
  writeDb(db);

  // Award engaged participation points (+5 points for writing high utility comments)
  adjustScore(citizenEmail, citizenName, 5, "verify");

  res.status(201).json(newComment);
});

// Toggle Vote (Upvote/Verify)
app.post("/api/issues/:id/vote", (req, res) => {
  const { citizenEmail, citizenName } = req.body;
  if (!citizenEmail) {
    return res.status(400).json({ error: "User email required to upvote." });
  }

  const db = readDb();
  const index = db.issues.findIndex((i) => i.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Issue not found." });
  }

  const issue = db.issues[index];
  const list = issue.upvotes || [];
  const hadVoted = list.includes(citizenEmail);

  if (hadVoted) {
    // Remove vote
    issue.upvotes = list.filter((e) => e !== citizenEmail);
    // Deduct points
    adjustScore(citizenEmail, citizenName, -8, "verify");
    adjustScore(issue.reporterEmail, issue.reporterName, -10, "verify");
  } else {
    // Add vote
    issue.upvotes = [...list, citizenEmail];
    // Auto-verify if votes exceed a threshold (e.g. 3)
    if (issue.upvotes.length >= 3 && issue.status === "Open") {
      issue.status = "Verified";
    }
    // Award points (+8 to voter, +10 to reporter for registering valid problem!)
    adjustScore(citizenEmail, citizenName, 8, "verify");
    adjustScore(issue.reporterEmail, issue.reporterName, 10, "verify");
  }

  writeDb(db);
  res.json(issue);
});

// Admin / Reporter Status Update (e.g. mark as investigating or resolve)
app.post("/api/issues/:id/resolve", (req, res) => {
  const { actionTaken, status, citizenEmail, citizenName } = req.body;
  if (!status) {
    return res.status(400).json({ error: "Status must be provided." });
  }

  const db = readDb();
  const issue = db.issues.find((i) => i.id === req.params.id);
  if (!issue) {
    return res.status(404).json({ error: "Issue not found." });
  }

  issue.status = status;
  if (actionTaken) {
    issue.actionTaken = actionTaken;
  }

  // Create an automatic system comment highlighting status transition
  const systemComment: IssueComment = {
    id: `comment-sys-${Date.now()}`,
    issueId: req.params.id,
    citizenName: "System Assistant",
    citizenEmail: "system@communityhero.org",
    content: `Status updated to [${status}] by ${citizenName || "representative"}. ${actionTaken ? "Remediation note: " + actionTaken : ""}`,
    isOfficial: true,
    createdAt: new Date().toISOString()
  };
  db.comments.push(systemComment);
  writeDb(db);

  // Heavy points reward for resolving an issue! (+40 to resolver and +40 to original reporter)
  if (status === "Resolved") {
    adjustScore(issue.reporterEmail, issue.reporterName, 40, "verify");
    adjustScore(citizenEmail, citizenName, 30, "verify");
  }

  res.json(issue);
});

// POST Issue (With AI processing!)
app.post("/api/issues", async (req, res) => {
  const {
    title,
    description,
    latitude,
    longitude,
    address,
    reporterName,
    reporterEmail,
    imageBase64,
    category: manualCategory,
    severity: manualSeverity
  } = req.body;

  if (!title || !description || !reporterName || !reporterEmail) {
    return res.status(400).json({ error: "Required fields are missing." });
  }

  let finalCategory = manualCategory || "Others";
  let finalSeverity = manualSeverity || "Medium";
  let aiSafetyAdvice = "Be careful around this hazardous area and report immediate updates if conditions worsen.";
  let extractedTags = ["community", "reported-issue"];

  const ai = getGeminiClient();

  if (ai) {
    try {
      console.log("Analyzing report with Gemini AI...");
      let promptText = `You are an expert citizen service dispatcher assistant. Real estate / city engineers need urgent structured dispatch parameters based on this resident report.
Report Title: "${title}"
Report Description: "${description}"

Generate critical parameters for sorting and dispatch.
Your output must be a valid JSON object matching the following fields:
1. category: String, must be exactly one of: "Pothole", "Water Leakage", "Damaged Streetlight", "Waste & Trash", "Safety Hazard", "Public Facility", "Others".
2. severity: String, must be exactly one of: "Low", "Medium", "High", "Critical".
3. advice: String, 1-2 sentences of brief, actionable immediate protective public safety advice for near-by citizens.
4. tags: String[], 3-4 short search tags.

Return ONLY raw JSON, with no markdown formatting tags.`;

      let response;
      if (imageBase64) {
        // Multi-modal processing with provided image
        console.log("Processing associated base64 image with Gemini...");
        const imgPart = {
          inlineData: {
            data: imageBase64,
            mimeType: "image/jpeg"
          }
        };

        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [
            imgPart,
            { text: promptText }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                severity: { type: Type.STRING },
                advice: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["category", "severity", "advice", "tags"]
            }
          }
        });
      } else {
        // Text-only analysis
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptText,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                severity: { type: Type.STRING },
                advice: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["category", "severity", "advice", "tags"]
            }
          }
        });
      }

      if (response && response.text) {
        const payload = JSON.parse(response.text.trim());
        console.log("Gemini response payload:", payload);
        
        if (payload.category) finalCategory = payload.category;
        if (payload.severity) finalSeverity = payload.severity;
        if (payload.advice) aiSafetyAdvice = payload.advice;
        if (payload.tags && Array.isArray(payload.tags)) extractedTags = payload.tags;
      }
    } catch (e) {
      console.error("Gemini automatic analysis failed, falling back to manual: ", e);
      // Fallback tags based on simple word matching if Gemini fails
      if (title.toLowerCase().includes("water")) {
        finalCategory = "Water Leakage";
        finalSeverity = "High";
        extractedTags = ["utility", "flooding", "water-dept"];
      } else if (title.toLowerCase().includes("light")) {
        finalCategory = "Damaged Streetlight";
        extractedTags = ["electrical", "dark-spot"];
      } else if (title.toLowerCase().includes("hole")) {
        finalCategory = "Pothole";
        extractedTags = ["asphalt", "highway-safety"];
      }
    }
  } else {
    console.log("No Gemini API key available. Running in local analysis fallback mode.");
    // Fallback logic of basic categorizers
    if (title.toLowerCase().includes("leak") || description.toLowerCase().includes("water")) {
      finalCategory = "Water Leakage";
      finalSeverity = "High";
      extractedTags = ["water-utility", "leakage"];
    } else if (title.toLowerCase().includes("light") || description.toLowerCase().includes("bulb")) {
      finalCategory = "Damaged Streetlight";
      extractedTags = [" streetlight", "dark-alley"];
    } else if (title.toLowerCase().includes("hole") || description.toLowerCase().includes("paving")) {
      finalCategory = "Pothole";
      finalSeverity = "High";
      extractedTags = ["asphalt", "roadway"];
    } else if (title.toLowerCase().includes("trash") || description.toLowerCase().includes("dump")) {
      finalCategory = "Waste & Trash";
      extractedTags = ["dumping", "refuse-collection"];
    }
  }

  const db = readDb();
  
  // Custom mock address lat-long if coordinates not fully set
  const lat = parseFloat(latitude) || (37.75 + Math.random() * 0.05);
  const lng = parseFloat(longitude) || (-122.45 + Math.random() * 0.05);

  const newIssue: CommunityIssue = {
    id: `issue-${Date.now()}`,
    title,
    description,
    category: finalCategory as any,
    severity: finalSeverity as any,
    status: imageBase64 ? "Verified" : "Open", // Auto-verify with physical image proof!
    latitude: lat,
    longitude: lng,
    address: address || "Hyperscale Local Area, District 1",
    imageUrl: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : undefined,
    upvotes: [reporterEmail], // Reporter automatically upvotes/verifies their report
    reporterName,
    reporterEmail,
    createdAt: new Date().toISOString(),
    aiTags: extractedTags,
    aiSafetyAdvice: aiSafetyAdvice
  };

  db.issues.push(newIssue);
  writeDb(db);

  // Award reporting points (+20 points for submission and +10 for providing photographic proof!)
  let scoreReward = 20;
  if (imageBase64) scoreReward += 15;
  adjustScore(reporterEmail, reporterName, scoreReward, "report");

  res.status(201).json(newIssue);
});

// GET /api/issues/:id/blueprint - Generates civic action blueprint & eco-impact forecast
app.get("/api/issues/:id/blueprint", async (req, res) => {
  const db = readDb();
  const issue = db.issues.find((i) => i.id === req.params.id);
  if (!issue) {
    return res.status(404).json({ error: "Civic issue not found." });
  }

  const category = issue.category;
  const title = issue.title;
  const description = issue.description;

  // Static fallback definitions for extreme reliability and pristine speed
  const fallbacks: Record<string, { actionPlan: string[], impactForecast: any, summary: string }> = {
    "Pothole": {
      actionPlan: [
        "Mark the hazard using reflective safety cones or temporary eco-friendly traffic chalk around the perimeter.",
        "Coordinate with neighbors to submit duplicate reports via CivicResolve to elevate municipal repair priority ranking.",
        "Drive at lower speeds (under 15mph) and alert local school buses or transit operations of the exact lane obstruction.",
        "Prepare clean gravel or cold patch as a team volunteer effort if city logistics delay beyond 14 days."
      ],
      impactForecast: { waterSaved: 0, carbonOffset: 45, safetyGain: 90, walkabilityBoost: 15, communityCohesion: 25 },
      summary: "Mending this roadway safeguards transit vehicles, school buses, and pedestrians, boosting local travel safety index by 90%."
    },
    "Water Leakage": {
      actionPlan: [
        "Locate parent water main bypass valves if safely accessible to residential boundaries.",
        "Assemble a volunteer drainage team to divert water buildup away from walkpaths and into gardens / tree wells.",
        "Post warning flags or small caution markers on surrounding slick sidewalk concrete to protect senior citizens.",
        "Initiate collective contact to the Municipal Water Authority with precise volume metrics for instant dispatch."
      ],
      impactForecast: { waterSaved: 8500, carbonOffset: 12, safetyGain: 45, walkabilityBoost: 30, communityCohesion: 30 },
      summary: "Stopping this leak immediately preserves precious municipal water resources, saving up to 8,500 gallons of treated drinking water!"
    },
    "Damaged Streetlight": {
      actionPlan: [
        "Organize a 'Bright Walk' volunteer rotation to accompany neighbors arriving home after twilight hours.",
        "Politely request surrounding merchant stores to activate external storefront lights or awning lamps overnight.",
        "Report details to municipal grid inspectors to replace legacy high-pressure sodium bulbs with modern green LED.",
        "Clean surrounding light-blocking branches or vine overgrowth from private property access lines."
      ],
      impactForecast: { waterSaved: 0, carbonOffset: 65, safetyGain: 80, walkabilityBoost: 55, communityCohesion: 40 },
      summary: "Reactivating this neighborhood beacon establishes high safety visibility, increasing active walkability by 55% during twilight."
    },
    "Waste & Trash": {
      actionPlan: [
        "Schedule a 1-hour community clean sweep weekend meeting with biological/thick gloves and heavy-duty refuse bags.",
        "Distribute biodegradable, secured trash bins and place educational signage regarding anti-littering penalties.",
        "Sort recyclables, timber pallets, and electronic scrap to donate directly to regional materials upcycling depots.",
        "Request solar-powered CCTV cameras or light-activated deterrents from district security boards."
      ],
      impactForecast: { waterSaved: 0, carbonOffset: 80, safetyGain: 50, walkabilityBoost: 45, communityCohesion: 60 },
      summary: "Restoring this corridor prevents hazardous environmental decay, reclaiming beautiful shared public walk space for residents."
    },
    "Safety Hazard": {
      actionPlan: [
        "Place obvious visible high-contrast hazard ribbon markings around the structural/unsafe area immediately.",
        "Alert parents, local schools, and kindergarten boards to divert children's play corridors.",
        "Liaise with local civil defense block captains to coordinate rapid temporary blocking board constructs.",
        "Escalate reporting to county safety code enforcement with direct photos to accelerate mandatory dispatch."
      ],
      impactForecast: { waterSaved: 0, carbonOffset: 15, safetyGain: 95, walkabilityBoost: 25, communityCohesion: 40 },
      summary: "Defusing this structural hazard builds an infallible safe-zone corridor, elevating public school-walk safety by 95%."
    },
    "Public Facility": {
      actionPlan: [
        "Submit structured civic petitions using CivicResolve records to secure municipal upgrading budget priority.",
        "Plan a shared cleanup or decoration community day to raise general visual care and prevent urban blight.",
        "Introduce low-maintenance native street flower planters to enhance environmental appeal and air metrics.",
        "Host a mini local meeting to design a sustainable citizen-led facility caretaking rota."
      ],
      impactForecast: { waterSaved: 0, carbonOffset: 20, safetyGain: 60, walkabilityBoost: 40, communityCohesion: 75 },
      summary: "Revitalizing our community hubs cultivates shared civic pride, skyrocketing local social cohesion rates by +75 points."
    },
    "Others": {
      actionPlan: [
        "Rally 3 adjacent neighbors to confirm secondary validation via their CivicResolve portal.",
        "Draft a localized solution message detailing physical symptoms and post it in the community discussion log.",
        "Organize a bi-weekly neighborhood advisory check-in to trace environmental updates.",
        "Compile photographic progression changes to share with county dispatch inspectors."
      ],
      impactForecast: { waterSaved: 0, carbonOffset: 10, safetyGain: 40, walkabilityBoost: 20, communityCohesion: 50 },
      summary: "Collaboratively addressing this request forms local action guidelines, bolstering neighborhood resilience indicator levels."
    }
  };

  const selectedFallback = fallbacks[category] || fallbacks["Others"];

  const ai = getGeminiClient();
  if (ai) {
    try {
      console.log(`Rerouting to Gemini to generate custom civic blueprint for issue: ${title}`);
      const promptText = `
        You are an elite, highly creative civic engineer and ecological micro-impact assessor.
        Analyze this citizen-reported hyper-local problem:
        Title: "${title}"
        Category: "${category}"
        Description: "${description}"
        
        Generate a highly targeted community-led physical action blueprint of 4 action steps,
        and project realistic hyperlocal environmental/social impact forecasts if resolved successfully.
        
        Provide the output in strict JSON layout using this schema structure:
        {
          "actionPlan": [
            "Step 1: physical active step for residents",
            "Step 2: neighborhood team coordination step",
            "Step 3: temporary risk mitigation step",
            "Step 4: institutional alignment or escalation step"
          ],
          "impactForecast": {
            "waterSaved": number (estimate gallons of water saved if leakage, default to 0),
            "carbonOffset": number (estimate kg CO2 emission saved based on transport/organic waste, default to 15),
            "safetyGain": number (percent improvement in local security / risk reduction, 10 to 95),
            "walkabilityBoost": number (walkability improvement point indicator, 5 to 60),
            "communityCohesion": number (community cohesion bonding index, 10 to 80)
          },
          "summary": "1-2 sentence inspiring summary highlighting the unique neighborhood ecological or community cohesion gain."
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              actionPlan: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              impactForecast: {
                type: Type.OBJECT,
                properties: {
                  waterSaved: { type: Type.INTEGER },
                  carbonOffset: { type: Type.INTEGER },
                  safetyGain: { type: Type.INTEGER },
                  walkabilityBoost: { type: Type.INTEGER },
                  communityCohesion: { type: Type.INTEGER }
                },
                required: ["waterSaved", "carbonOffset", "safetyGain", "walkabilityBoost", "communityCohesion"]
              },
              summary: { type: Type.STRING }
            },
            required: ["actionPlan", "impactForecast", "summary"]
          }
        }
      });

      if (response && response.text) {
        const result = JSON.parse(response.text.trim());
        return res.json({
          issueId: req.params.id,
          actionPlan: result.actionPlan || selectedFallback.actionPlan,
          impactForecast: result.impactForecast || selectedFallback.impactForecast,
          summary: result.summary || selectedFallback.summary,
          generatedByAI: true
        });
      }
    } catch (e) {
      console.warn("Gemini dynamic blueprint generator failed, deploying static premium fallback:", e);
    }
  }

  // Fallback response triggers if Gemini client is not initialized or errors
  return res.json({
    issueId: req.params.id,
    actionPlan: selectedFallback.actionPlan,
    impactForecast: selectedFallback.impactForecast,
    summary: selectedFallback.summary,
    generatedByAI: false
  });
});

// GET statistics for impact dashboard
app.get("/api/stats", (req, res) => {
  const db = readDb();
  const total = db.issues.length;
  const resolved = db.issues.filter((i) => i.status === "Resolved").length;
  const openCount = db.issues.filter((i) => i.status === "Open" || i.status === "Verified" || i.status === "Investigating").length;
  const totalUpvotes = db.issues.reduce((acc, curr) => acc + (curr.upvotes?.length || 0), 0);
  const totalComments = db.comments.length;
  
  res.json({
    total,
    resolved,
    openCount,
    totalUpvotes,
    totalComments,
    resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
    activeVoters: db.leaderboard.length
  });
});

// Configure Vite middleware in development or public statically in production
(async () => {
  if (process.env.NODE_ENV !== "production") {
    console.log("Configuring Vite Development Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving Static production build of Vite...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server successfully initialized on http://0.0.0.0:${PORT}`);
  });
})();
