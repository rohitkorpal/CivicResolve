export interface CommunityIssue {
  id: string;
  title: string;
  description: string;
  category: "Pothole" | "Water Leakage" | "Damaged Streetlight" | "Waste & Trash" | "Safety Hazard" | "Public Facility" | "Others";
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "Verified" | "Investigating" | "Resolved";
  latitude: number;
  longitude: number;
  address: string;
  imageUrl?: string;
  upvotes: string[]; // List of user emails who upvoted/verified
  reporterName: string;
  reporterEmail: string;
  createdAt: string;
  aiTags: string[];
  aiSafetyAdvice?: string;
  actionTaken?: string;
}

export interface IssueComment {
  id: string;
  issueId: string;
  citizenName: string;
  citizenEmail: string;
  content: string;
  isOfficial: boolean;
  createdAt: string;
}

export interface CitizenLeaderboardEntry {
  email: string;
  name: string;
  points: number;
  badge: "Novice Solver" | "Street Guardian" | "Eco Warrior" | "Infrastructure Ace" | "Community Legend";
  reportsCount: number;
  verificationsCount: number;
}
