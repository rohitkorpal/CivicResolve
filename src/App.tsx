import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  MapPin,
  Flame,
  Award,
  Plus,
  Send,
  MessageSquare,
  ThumbsUp,
  Search,
  Filter,
  CheckCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Zap,
  Sparkles,
  RefreshCw,
  Eye,
  Camera,
  X,
  UserCheck,
  Locate,
  Bell,
  Volume2,
  ShieldAlert,
  Sun,
  Moon,
  Leaf
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CommunityIssue, IssueComment, CitizenLeaderboardEntry } from "./types";

const CATEGORIES = [
  "Pothole",
  "Water Leakage",
  "Damaged Streetlight",
  "Waste & Trash",
  "Safety Hazard",
  "Public Facility",
  "Others"
];

const SEVERITIES = ["Low", "Medium", "High", "Critical"];

const STATUSES = ["Open", "Verified", "Investigating", "Resolved"];

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : true; // Default to dark mode for immediate dark presentation or light. Let's make it easy to start in dark mode!
  });

  // Toggle dark class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  // Simulator State
  const [currentUserEmail, setCurrentUserEmail] = useState("alex.mercer@example.com");
  const [currentUserName, setCurrentUserName] = useState("Alex Mercer");

  // Staff notification alerts
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [activeStaffNotification, setActiveStaffNotification] = useState<CommunityIssue | null>(null);

  // Core Data State
  const [issues, setIssues] = useState<CommunityIssue[]>([]);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>("issue-1");
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [leaderboard, setLeaderboard] = useState<CitizenLeaderboardEntry[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    resolved: 0,
    openCount: 0,
    totalUpvotes: 0,
    totalComments: 0,
    resolutionRate: 0,
    activeVoters: 0
  });

  // UI States
  const [activeTab, setActiveTab] = useState<"map" | "leaderboard" | "all">("map");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // AI Community Action Blueprint & Gamification States
  const [blueprints, setBlueprints] = useState<Record<string, any>>({});
  const [loadingBlueprintIds, setLoadingBlueprintIds] = useState<string[]>([]);
  const [committedSteps, setCommittedSteps] = useState<Record<string, string[]>>({}); 
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);
  const [certificateIssueId, setCertificateIssueId] = useState<string | null>(null);

  // New Issue Form Inputs
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newSeverity, setNewSeverity] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [selectedLat, setSelectedLat] = useState<number>(37.77);
  const [selectedLng, setSelectedLng] = useState<number>(-122.42);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Leaflet Map Refs
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const activeSelectorMarkerRef = useRef<L.Marker | null>(null);

  // Resolution Notes (for resolving issue)
  const [resolutionNote, setResolutionNote] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Quick state reload
  const refreshAllData = async () => {
    try {
      const issuesRes = await fetch("/api/issues");
      const iData = await issuesRes.json();
      setIssues(iData);

      const lRes = await fetch("/api/leaderboard");
      const lData = await lRes.json();
      setLeaderboard(lData);

      const sRes = await fetch("/api/stats");
      const sData = await sRes.json();
      setStats(sData);

      // Reload comments for currently selected issue if any
      if (selectedIssueId) {
        const cRes = await fetch(`/api/issues/${selectedIssueId}/comments`);
        const cData = await cRes.json();
        setComments(cData);
      }
    } catch (e) {
      console.error("Error refreshing core data:", e);
    }
  };

  // Initial load
  useEffect(() => {
    refreshAllData();
  }, []);

  // Sync comments when selected issue changes
  useEffect(() => {
    if (selectedIssueId) {
      fetch(`/api/issues/${selectedIssueId}/comments`)
        .then((r) => r.json())
        .then((data) => setComments(data))
        .catch((e) => console.error(e));
    } else {
      setComments([]);
    }
  }, [selectedIssueId]);

  // Sync crowdsourced AI resolution blueprint and impact details on selection
  useEffect(() => {
    if (!selectedIssueId) return;
    if (blueprints[selectedIssueId]) return;

    setLoadingBlueprintIds(prev => [...prev, selectedIssueId]);
    fetch(`/api/issues/${selectedIssueId}/blueprint`)
      .then((r) => r.json())
      .then((data) => {
        setBlueprints(prev => ({
          ...prev,
          [selectedIssueId]: data
        }));
      })
      .catch((e) => console.error("Blueprint synthesis failure:", e))
      .finally(() => {
        setLoadingBlueprintIds(prev => prev.filter(id => id !== selectedIssueId));
      });
  }, [selectedIssueId]);

  // Toast helper
  const triggerNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3800);
  };

  // Toggle active commitment to a civic action blueprint step
  const toggleStepCommit = (issueId: string, stepText: string) => {
    setCommittedSteps(prev => {
      const list = prev[issueId] || [];
      const isCommitted = list.includes(stepText);
      const updated = isCommitted 
        ? list.filter(item => item !== stepText) 
        : [...list, stepText];

      if (!isCommitted) {
        triggerNotification(`Active Pledge Verified: "${stepText.substring(0, 45)}..." +5 Rep Points rewarded!`, "success");
        if (currentUserEmail) {
          setLeaderboard(prevLeader => 
            prevLeader.map(entry => 
              entry.email === currentUserEmail 
                ? { ...entry, points: entry.points + 5 }
                : entry
            )
          );
        }
      } else {
        triggerNotification(`Withdrew checkpoint pledge block.`, "success");
        if (currentUserEmail) {
          setLeaderboard(prevLeader => 
            prevLeader.map(entry => 
              entry.email === currentUserEmail 
                ? { ...entry, points: Math.max(0, entry.points - 5) }
                : entry
            )
          );
        }
      }
      return {
        ...prev,
        [issueId]: updated
      };
    });
  };

  // Image Upload handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      setImageBase64(base64);
      setImagePreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle reporting submit
  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) {
      triggerNotification("Please fill in the title and description.", "error");
      return;
    }

    setIsSubmitting(true);
    setIsAnalyzing(true);
    triggerNotification("Dispatching parameters. Gemini AI is analyzing and classifying the issue report...", "success");

    try {
      const response = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          latitude: selectedLat,
          longitude: selectedLng,
          address: newAddress || "Unassigned Location, Sector 4",
          reporterName: currentUserName,
          reporterEmail: currentUserEmail,
          category: newCategory || undefined,
          severity: newSeverity || undefined,
          imageBase64: imageBase64 || undefined
        })
      });

      if (!response.ok) {
        throw new Error("Failed to report issue");
      }

      const created: CommunityIssue = await response.json();
      triggerNotification(`Issue successfully registered! Earned Points: ${imageBase64 ? "35 reputation points" : "20 reputation points"}.`, "success");
      
      // Reset form variables
      setNewTitle("");
      setNewDescription("");
      setNewCategory("");
      setNewSeverity("");
      setNewAddress("");
      setImageBase64(null);
      setImagePreviewUrl(null);
      setShowAddForm(false);
      setSelectedIssueId(created.id);
      
      // Reload
      await refreshAllData();
    } catch (err) {
      console.error(err);
      triggerNotification("Failed to submit issue. Please check network connection.", "error");
    } finally {
      setIsSubmitting(false);
      setIsAnalyzing(false);
    }
  };

  // Handle Comment Submission
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !selectedIssueId) return;

    try {
      const response = await fetch(`/api/issues/${selectedIssueId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          citizenName: currentUserName,
          citizenEmail: currentUserEmail,
          content: commentInput
        })
      });

      if (!response.ok) throw new Error("Failed to submit comment");
      const savedComment = await response.json();
      setComments((prev) => [...prev, savedComment]);
      setCommentInput("");
      triggerNotification("Engagement comment published! +5 Participation Points.", "success");
      
      await refreshAllData();
    } catch (err) {
      console.error(err);
      triggerNotification("Unable to post comment.", "error");
    }
  };

  // Toggle upvote/verification
  const handleVoteToggle = async (id: string) => {
    try {
      const res = await fetch(`/api/issues/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          citizenEmail: currentUserEmail,
          citizenName: currentUserName
        })
      });

      if (!res.ok) throw new Error();
      const updatedIssue: CommunityIssue = await res.json();
      
      setIssues((prev) => prev.map((i) => (i.id === id ? updatedIssue : i)));
      triggerNotification("Verification logged! Score updated.", "success");
      await refreshAllData();
    } catch (e) {
      console.error(e);
      triggerNotification("Failed to cast vote.", "error");
    }
  };

  // Update Status / Solve Issue
  const handleStatusChange = async (id: string, nextStatus: string) => {
    setUpdatingStatus(nextStatus);
    try {
      const res = await fetch(`/api/issues/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          actionTaken: nextStatus === "Resolved" ? resolutionNote : undefined,
          citizenEmail: currentUserEmail,
          citizenName: currentUserName
        })
      });

      if (!res.ok) throw new Error();
      
      setResolutionNote("");
      triggerNotification(`Status updated to ${nextStatus}! ${nextStatus === "Resolved" ? "Awarded heavyweight solution badge points." : ""}`, "success");
      await refreshAllData();
    } catch (e) {
      console.error(e);
      triggerNotification("Failed to update status", "error");
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Filter Issues
  const filteredIssues = issues.filter((issue) => {
    const matchCategory = categoryFilter === "All" || issue.category === categoryFilter;
    const matchStatus = statusFilter === "All" || issue.status === statusFilter;
    const matchQuery =
      searchQuery.trim() === "" ||
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.aiTags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchCategory && matchStatus && matchQuery;
  });

  const selectedIssue = issues.find((i) => i.id === selectedIssueId);

  // Synthesize custom dual-tone alert sound using browser Web Audio API (cross-iframe compatible)
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const primaryOsc = audioCtx.createOscillator();
      const primaryGain = audioCtx.createGain();

      primaryOsc.type = "sine";
      primaryOsc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      primaryOsc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5

      primaryGain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      primaryGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.55);

      primaryOsc.connect(primaryGain);
      primaryGain.connect(audioCtx.destination);

      primaryOsc.start();
      primaryOsc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      console.warn("AudioContext tone blocked or unsupported by browser:", e);
    }
  };

  // Automated Alert trigger for Municipal Staff viewing the dashboard
  useEffect(() => {
    const isMunicipalStaff =
      currentUserEmail.endsWith(".gov") ||
      currentUserEmail.endsWith(".gov.org") ||
      currentUserEmail === "officer.miller@gov.org";

    if (!isMunicipalStaff) {
      setActiveStaffNotification(null);
      return;
    }

    // Find first active unresolved critical issue that hasn't been dismissed by the staff in this session
    const unresolvedCriticals = issues.filter(
      (issue) => issue.severity === "Critical" && issue.status !== "Resolved" && !dismissedAlertIds.includes(issue.id)
    );

    if (unresolvedCriticals.length > 0) {
      const topAlert = unresolvedCriticals[0];
      // Only set and sound if it's not already showing the exact same one
      if (activeStaffNotification?.id !== topAlert.id) {
        setActiveStaffNotification(topAlert);
        playNotificationSound();
      }
    } else {
      setActiveStaffNotification(null);
    }
  }, [currentUserEmail, issues, dismissedAlertIds]);

  // Get User Geolocation Location Access
  const getUserLocation = (silent: boolean = false) => {
    if (!navigator.geolocation) {
      if (!silent) {
        triggerNotification("Geolocation is not supported by your browser.", "error");
      }
      return;
    }

    if (!silent) {
      triggerNotification("Accessing GPS device for current coordinates...", "success");
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const lat = parseFloat(latitude.toFixed(6));
        const lng = parseFloat(longitude.toFixed(6));

        setSelectedLat(lat);
        setSelectedLng(lng);
        setNewAddress(`Coordinates: [${lat}, ${lng}]`);

        // Fly map to user location
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 15);
        }

        if (!silent) {
          triggerNotification(`Located accurately! Centered map on current position.`, "success");
        }
      },
      (error) => {
        console.warn("Geolocation access error:", error);
        if (!silent) {
          let errorMsg = "Unable to retrieve your location. Check browser frame permissions.";
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg = "Location permission denied. Using default metropolitan center.";
          }
          triggerNotification(errorMsg, "error");
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (activeTab !== "map") {
      // Switched away, clean up any previous instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersGroupRef.current = null;
      activeSelectorMarkerRef.current = null;
      return;
    }

    const container = document.getElementById("leaflet-map");
    if (!container) return;

    // Safety clean up of previous map block if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize map centering on selectedLat, selectedLng
    const map = L.map(container, {
      zoomControl: false,
    }).setView([selectedLat || 37.77, selectedLng || -122.42], 13);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Voyager or Dark Matter style map tiles based on active mode
    const tileUrl = isDarkMode
      ? "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Add map click listener
    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      const targetLat = parseFloat(lat.toFixed(6));
      const targetLng = parseFloat(lng.toFixed(6));

      setSelectedLat(targetLat);
      setSelectedLng(targetLng);
      setNewAddress(`Coordinates: [${targetLat}, ${targetLng}]`);
      setShowAddForm(true);
      triggerNotification(`Selected location: [${targetLat}, ${targetLng}]. Opened dispatch report.`, "success");
    });

    // Auto locate once on map view load
    getUserLocation(true);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersGroupRef.current = null;
      activeSelectorMarkerRef.current = null;
    };
  }, [activeTab, isDarkMode]);

  // Dynamically update Leaflet map markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Create marker layers group if it doesn't exist
    if (!markersGroupRef.current) {
      markersGroupRef.current = L.layerGroup().addTo(map);
    }
    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();

    // Render active/filtered issues
    filteredIssues.forEach((issue) => {
      const isSelected = selectedIssueId === issue.id;

      // Determine distinct categoric visual coloring
      let colorHex = "#f97316"; // Orange default
      if (issue.category === "Water Leakage") colorHex = "#3b82f6"; // Blue
      if (issue.category === "Damaged Streetlight") colorHex = "#eab308"; // Amber
      if (issue.category === "Waste & Trash") colorHex = "#10b981"; // Emerald
      if (issue.category === "Safety Hazard") colorHex = "#ef4444"; // Red
      if (issue.category === "Public Facility") colorHex = "#6366f1"; // Indigo
      if (issue.category === "Pothole") colorHex = "#f97316";

      const htmlContent = `
        <div class="relative flex items-center justify-center">
          ${
            isSelected || issue.category === "Safety Hazard"
              ? `<span class="absolute inline-flex h-8 w-8 rounded-full opacity-75 animate-ping" style="background-color: ${colorHex}"></span>`
              : ""
          }
          <div class="relative flex items-center justify-center w-6 h-6 rounded-full border-2 border-white shadow-lg text-white font-sans text-[10px]" style="background-color: ${colorHex}">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: htmlContent,
        className: "custom-leaflet-marker",
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marker = L.marker([issue.latitude, issue.longitude], {
        icon: customIcon,
      });

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedIssueId(issue.id);
      });

      marker.bindTooltip(
        `
        <div class="p-1.5 font-sans">
          <div class="font-bold text-slate-900 text-xs">${issue.title}</div>
          <div class="text-[10px] text-slate-500 mt-0.5">${issue.category} • ${issue.status}</div>
        </div>
        `,
        {
          direction: "top",
          offset: [0, -10],
          opacity: 0.95,
        }
      );

      marker.addTo(markersGroup);

      // If issue is clicked, center map view smoothly
      if (isSelected && selectedIssueId) {
        // Only pan if it's not already close to center to prevent infinite loops the moment selectedIssueId stays same
        const center = map.getCenter();
        const dist = Math.sqrt(Math.pow(center.lat - issue.latitude, 2) + Math.pow(center.lng - issue.longitude, 2));
        if (dist > 0.005) {
          map.panTo([issue.latitude, issue.longitude]);
        }
      }
    });

    // Render/Move the pink "Reporting Marker"
    if (showAddForm && selectedLat && selectedLng) {
      const activeHtml = `
        <div class="relative flex items-center justify-center">
          <span class="absolute inline-flex h-10 w-10 bg-pink-500 rounded-full opacity-75 animate-ping"></span>
          <div class="relative flex items-center justify-center w-7 h-7 rounded-full bg-pink-605 border-2 border-white shadow-xl text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
        </div>
      `;

      const activeIcon = L.divIcon({
        html: activeHtml,
        className: "active-leaflet-marker",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      if (activeSelectorMarkerRef.current) {
        activeSelectorMarkerRef.current.setLatLng([selectedLat, selectedLng]);
      } else {
        activeSelectorMarkerRef.current = L.marker([selectedLat, selectedLng], {
          icon: activeIcon,
        }).addTo(map);
      }
    } else {
      if (activeSelectorMarkerRef.current) {
        activeSelectorMarkerRef.current.remove();
        activeSelectorMarkerRef.current = null;
      }
    }
  }, [filteredIssues, selectedIssueId, showAddForm, selectedLat, selectedLng]);

  // Simulator Users Config
  const SIMULATOR_PEOPLE = [
    { name: "Alex Mercer", email: "alex.mercer@example.com" },
    { name: "Sarah Jones", email: "sarah.jones@example.com" },
    { name: "Elena Rodriguez", email: "elena.rodriguez@example.com" },
    { name: "David Kim", email: "david.kim@example.com" },
    { name: "Officer Miller (City Roads)", email: "officer.miller@gov.org" }
  ];

  const changeSimulatedUser = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const email = e.target.value;
    const name = SIMULATOR_PEOPLE.find((p) => p.email === email)?.name || "Citizen";
    setCurrentUserEmail(email);
    setCurrentUserName(name);
    triggerNotification(`Switched active profile simulator to: ${name}`, "success");
  };

  const activeLeaderboardUser = leaderboard.find(
    (l) => l.email.toLowerCase() === currentUserEmail.toLowerCase()
  );

  return (
    <div className={`min-h-screen font-sans selection:bg-blue-600 selection:text-white transition-colors duration-300 ${
      isDarkMode ? "bg-slate-950 text-slate-100 dark" : "bg-slate-50 text-slate-800"
    }`}>
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-md border text-sm font-medium ${
              notification.type === "success"
                ? "bg-emerald-50 border-emerald-250 text-emerald-800 shadow-emerald-100"
                : "bg-rose-50 border-rose-250 text-rose-850 shadow-rose-100"
            }`}
          >
            {notification.type === "success" ? (
              <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simulated Browser Push Notification for Municipal Staff */}
      <AnimatePresence>
        {activeStaffNotification && (
          <motion.div
            initial={{ opacity: 0, x: 200, y: 100, scale: 0.85 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9, transition: { duration: 0.25 } }}
            className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 overflow-hidden font-sans pr-1"
          >
            {/* Window title bar */}
            <div className="bg-slate-950/80 px-4 py-2 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-[10px] text-slate-400 font-mono font-bold tracking-tight pl-2">SYSTEM WEB NOTIFICATION</span>
              </div>
              <button
                onClick={() => setDismissedAlertIds(prev => [...prev, activeStaffNotification.id])}
                className="text-slate-400 hover:text-white transition-colors"
                title="Dismiss Notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notification Core Content */}
            <div className="p-4 space-y-3.5">
              <div className="flex items-start gap-3.5">
                <div className="bg-red-500/10 p-2.5 rounded-xl border border-red-500/30 text-red-500 shrink-0 relative animate-pulse">
                  <Bell className="w-5 h-5 text-red-550" />
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-450 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase font-mono font-black tracking-widest text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                      CRITICAL DISPATCH
                    </span>
                    <span className="text-[9px] font-mono font-semibold text-slate-400">
                      Just Now
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-100 leading-snug line-clamp-1">
                    {activeStaffNotification.title}
                  </h3>
                  <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
                    Urgent assistance required at <strong>{activeStaffNotification.address}</strong>. Severe hazard reported.
                  </p>
                </div>
              </div>

              {/* Action grid buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-850">
                <button
                  onClick={() => {
                    setSelectedIssueId(activeStaffNotification.id);
                    setActiveTab("all"); // Switch to directory/all tab to show details
                    triggerNotification(`Focused map on Critical Incident: ${activeStaffNotification.title}`, "success");
                    setTimeout(() => {
                      const el = document.getElementById(`card-${activeStaffNotification.id}`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 300);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-[11px] font-extrabold uppercase py-2 px-3 rounded-lg transition-all shadow-md hover:shadow-blue-900/30 font-mono tracking-tight text-center"
                >
                  Locate & Inspect
                </button>
                <button
                  onClick={() => {
                    setDismissedAlertIds(prev => [...prev, activeStaffNotification.id]);
                    triggerNotification("Incident dispatch warning acknowledged.", "success");
                  }}
                  className="bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 text-[11px] font-extrabold uppercase py-2 px-3 rounded-lg transition-all font-mono tracking-tight text-center"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header / Navigation */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-40 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl shadow-sm">
              <Flame className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                CivicResolve <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 font-extrabold px-2 py-0.5 rounded-full font-mono">Enterprise AI</span>
              </h1>
              <p className="text-xs text-slate-500">Collaborative platform for hyperlocal civic action & rapid resolution</p>
            </div>
          </div>

          {/* Interactive Profile Simulator & Theme Toggle switch */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 w-full sm:w-auto">
              <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="text-left shrink-0">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 font-mono">Citizen Simulator</p>
                <select
                  id="user-simulator"
                  value={currentUserEmail}
                  onChange={changeSimulatedUser}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-4"
                >
                  {SIMULATOR_PEOPLE.map((p) => (
                    <option key={p.email} value={p.email} className="bg-white text-slate-800">
                      {p.name} ({p.email.includes("gov") ? "City" : "User"})
                    </option>
                  ))}
                </select>
              </div>
              <div className="h-8 w-px bg-slate-200 mx-1"></div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-slate-400 font-mono block font-sans">Badge & Rep</span>
                <span className="text-xs font-bold text-blue-600 flex items-center justify-end gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  {activeLeaderboardUser?.points || 0} pts
                </span>
              </div>
            </div>

            {/* Dark Mode Theme Toggle Button */}
            <button
              onClick={() => {
                setIsDarkMode(!isDarkMode);
                triggerNotification(`Switched display mode to: ${!isDarkMode ? "Midnight Dark Mode 🌙" : "Daylight Light Theme ☀️"}`, "success");
              }}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-sm hover:scale-105 active:scale-95 shrink-0"
              title={isDarkMode ? "Activate Light Mode" : "Activate Dark Mode"}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-amber-500 animate-spin-slow" />
              ) : (
                <Moon className="w-5 h-5 text-indigo-600" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Stats Dashboard Strip */}
      <section className="bg-slate-50 border-b border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4 shadow-sm">
            <div className="bg-blue-50 p-3 rounded-xl">
              <Plus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Reported Issues</span>
              <span className="text-lg font-bold text-slate-900">{stats.total}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4 shadow-sm">
            <div className="bg-emerald-50 p-3 rounded-xl">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Total Resolved</span>
              <span className="text-lg font-bold text-emerald-700">{stats.resolved}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4 shadow-sm">
            <div className="bg-amber-50 p-3 rounded-xl">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Resolution Rate</span>
              <span className="text-lg font-bold text-amber-700">{stats.resolutionRate}%</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4 shadow-sm col-span-1">
            <div className="bg-indigo-50 p-3 rounded-xl">
              <ThumbsUp className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Upvotes Cast</span>
              <span className="text-lg font-bold text-indigo-700">{stats.totalUpvotes}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl hidden md:flex items-center gap-4 shadow-sm">
            <div className="bg-rose-50 p-3 rounded-xl">
              <MessageSquare className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Comments Cast</span>
              <span className="text-lg font-bold text-rose-700">{stats.totalComments}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT 5 COLUMNS: Navigation tabs, Interactive Map & Leaderboard list */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* View Switcher Controls */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
              <button
                id="tab-map"
                onClick={() => setActiveTab("map")}
                className={`flex-1 py-2 rounded-lg justify-center text-xs font-bold flex items-center gap-2 transition-all ${
                  activeTab === "map"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <MapPin className="w-4 h-4 text-teal-400" />
                Interactive Map
              </button>
              
              <button
                id="tab-leaderboard"
                onClick={() => setActiveTab("leaderboard")}
                className={`flex-1 py-2 rounded-lg justify-center text-xs font-bold flex items-center gap-2 transition-all ${
                  activeTab === "leaderboard"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Award className="w-4 h-4 text-amber-500" />
                Hero Leaderboard
              </button>

              <button
                id="tab-all"
                onClick={() => setActiveTab("all")}
                className={`flex-1 py-2 rounded-lg justify-center text-xs font-bold flex items-center gap-2 transition-all ${
                  activeTab === "all"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Search className="w-4 h-4 text-blue-600" />
                All Reports
              </button>
            </div>

            {/* TAB CONTENT: Interactive Map */}
            {activeTab === "map" && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">District Map Navigator</h3>
                    <p className="text-xs text-slate-500">Click/tap anywhere on the map to pin and dispatch a new report. Drag map to navigate.</p>
                  </div>
                  <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-mono font-extrabold animate-pulse">
                    Leaflet Map Engine
                  </span>
                </div>

                {/* Leaflet Street Map Container */}
                <div className="relative w-full aspect-square rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden shadow-inner group">
                  <div id="leaflet-map" className="w-full h-full z-0" />
                  
                  {/* Floating Geolocation GPS Button */}
                  <button
                    onClick={() => getUserLocation(false)}
                    className="absolute bottom-4 left-4 z-[500] bg-white hover:bg-slate-50 text-slate-800 p-3 rounded-full shadow-lg border border-slate-200 transition-all flex items-center justify-center hover:scale-105 active:scale-95 group cursor-pointer"
                    title="Sync with my GPS Location"
                  >
                    <Locate className="w-4 h-4 text-blue-600 animate-pulse group-hover:rotate-12 transition-transform" />
                  </button>
                </div>

                {/* Map Helpers / Legend */}
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono block mb-2">Category Legend</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                      <span>Potholes</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      <span>Water Leaks</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                      <span>Streetlights</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span>Waste / Trash</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Hero Leaderboards */}
            {activeTab === "leaderboard" && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Active Civic Resolver Leaderboard</h3>
                  <p className="text-xs text-slate-500">Earn points by reporting legitimate issues and verifying others</p>
                </div>

                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {leaderboard.map((user, index) => {
                    const isCurrentUser = user.email.toLowerCase() === currentUserEmail.toLowerCase();
                    const rank = index + 1;

                    let rankBadge = `${rank}th`;
                    let rankBg = "bg-slate-50 text-slate-500 border-slate-200";
                    if (rank === 1) {
                      rankBadge = "🏆";
                      rankBg = "bg-amber-50 border-amber-200 text-amber-700";
                    } else if (rank === 2) {
                      rankBadge = "🥈";
                      rankBg = "bg-slate-100 border-slate-200 text-slate-600";
                    } else if (rank === 3) {
                      rankBadge = "🥉";
                      rankBg = "bg-orange-50 border-orange-200 text-orange-700";
                    }

                    return (
                      <div
                        key={user.email}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                          isCurrentUser
                            ? "bg-blue-50/50 border-blue-300 shadow-sm"
                            : "bg-slate-50/30 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Rank indicator */}
                          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0 ${rankBg}`}>
                            {rankBadge}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-slate-800">{user.name}</span>
                              {isCurrentUser && (
                                <span className="text-[9px] bg-blue-100 text-blue-700 font-mono px-1.5 rounded uppercase font-bold">You</span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 block font-mono">
                              {user.badge}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-bold text-blue-600 block font-mono">
                            {user.points} pts
                          </span>
                          <span className="text-[9px] text-slate-400 block font-mono">
                            {user.reportsCount} Reports • {user.verificationsCount} Verifs
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Gamified point structures */}
                <div className="bg-slate-900 p-4 rounded-xl text-xs space-y-2 border border-slate-800 text-white shadow-sm">
                  <span className="font-mono text-slate-400 uppercase tracking-widest block text-[9.5px] font-bold">Reputation Point System</span>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>📝 Submit Issue: <span className="text-emerald-400 font-bold">+20 pts</span></div>
                    <div>📸 Image upload: <span className="text-emerald-400 font-bold">+15 pts</span></div>
                    <div>✅ Give Verification: <span className="text-blue-400 font-bold">+8 pts</span></div>
                    <div>🛠️ Resolve Issue: <span className="text-amber-400 font-bold">+40 pts</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Fallback List/All Tab */}
            {activeTab === "all" && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-base">District Master Directory</h3>
                  <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    {filteredIssues.length} items
                  </span>
                </div>
                <p className="text-xs text-slate-500">Use the filter selectors to narrow down items.</p>
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {filteredIssues.length === 0 ? (
                    <div className="text-center p-8 text-slate-400">
                      No reported issues matched your currently active criteria. Try adjusting queries.
                    </div>
                  ) : (
                    filteredIssues.map((issue) => (
                      <button
                        key={issue.id}
                        onClick={() => setSelectedIssueId(issue.id)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                          selectedIssueId === issue.id
                            ? "bg-blue-50/50 border-blue-300"
                            : "bg-slate-5.0 bg-slate-50/40 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-xs text-slate-800 line-clamp-1">{issue.title}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full shrink-0 uppercase font-black status-pill ${
                            issue.status === "Resolved"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {issue.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1.5">{issue.description}</p>
                        <div className="flex items-center justify-between mt-3 text-[10px] text-slate-400 font-mono">
                          <span>{issue.category}</span>
                          <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* MIDDLE COLUMN: Primary Filter, Issue Cards Grid */}
          <div className="lg:col-span-7 space-y-6">

            {/* Quick Filter Panel & Search */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3.5">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search issues, tags, or locations..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Submit Trigger Button */}
                <button
                  id="btn-trigger-post"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm shrink-0"
                >
                  <Plus className="w-4 h-4 text-white" />
                  Report Problem
                </button>
              </div>

              {/* Advanced Filter Pills */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1.5 border-t border-slate-100">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1.5 pr-1 shrink-0">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  Filter By:
                </span>

                {/* Dropdown for category filters */}
                <select
                  id="category-filter"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {/* Dropdown for status filters */}
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  <option value="All">All Statuses</option>
                  {STATUSES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dynamic Report Issue Form Modal overlay block */}
            <AnimatePresence>
              {showAddForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden"
                >
                  {/* Subtle Background gradient light */}
                  <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-tr from-blue-50/50 to-indigo-50/50 rounded-full blur-2xl pointer-events-none"></div>

                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-slate-900 text-base">New Hyperlocal Problem Dispatch</h3>
                    </div>
                    <button
                      id="close-add-form"
                      onClick={() => setShowAddForm(false)}
                      className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateIssue} className="space-y-4 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Metadata Form */}
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="issue-title" className="text-[11px] font-semibold text-slate-500 block mb-1">Issue Title / What did you find? *</label>
                          <input
                            id="issue-title"
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="e.g. Broken water mains bubble"
                            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-850"
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor="issue-description" className="text-[11px] font-semibold text-slate-500 block mb-1">Problem Description & Context *</label>
                          <textarea
                            id="issue-description"
                            rows={3}
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            placeholder="State exactly how it's affecting your neighborhood. Let citizens know details."
                            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl px-3 py-2 text-xs focus:outline-none resize-none text-slate-850"
                            required
                          ></textarea>
                        </div>
                      </div>

                      {/* Right: Picture Proof & Coordinates parameters */}
                      <div className="space-y-4">
                        <div>
                          <span className="text-[11px] font-semibold text-slate-500 block mb-1">Upload Photo Proof (Auto-Verify with Gemini AI)</span>
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-200 hover:border-blue-500/50 bg-slate-50 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors relative aspect-[16/9] group overflow-hidden"
                          >
                            {imagePreviewUrl ? (
                              <>
                                <img
                                  src={imagePreviewUrl}
                                  alt="Report proof"
                                  className="absolute inset-0 w-full h-full object-cover rounded-xl"
                                />
                                <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Camera className="w-6 h-6 text-white" />
                                </div>
                              </>
                            ) : (
                              <div className="text-center space-y-1">
                                <Camera className="w-7 h-7 text-slate-400 mx-auto group-hover:text-blue-500" />
                                <p className="text-[11px] font-semibold text-slate-700">Drag/Select Camera Photo</p>
                                <p className="text-[9px] text-slate-400">Supports JPG, PNG; analyzed immediately by Gemini</p>
                              </div>
                            )}
                          </div>
                          <input
                            id="photo-upload-input"
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </div>

                        <div>
                          <label htmlFor="issue-address" className="text-[11px] font-semibold text-slate-500 block mb-1">Pin Location Info (Set via map click or type)</label>
                          <div className="flex gap-2">
                            <input
                              id="issue-address"
                              type="text"
                              value={newAddress}
                              onChange={(e) => setNewAddress(e.target.value)}
                              placeholder="e.g. Near corner of Pine / Elm streets"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-850"
                            />
                            <span className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs shrink-0 text-blue-600 font-mono">
                              {selectedLat.toFixed(2)}, {selectedLng.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Manual classification configuration parameters if they want (Gemini override fallback) */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap gap-4 justify-between items-center">
                      <div className="flex gap-3">
                        <div>
                          <label htmlFor="manual-category" className="text-[9px] font-semibold text-slate-500 block mb-1">Manual Cat (Optional)</label>
                          <select
                            id="manual-category"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg py-1 px-2 text-[11px] text-slate-700 focus:outline-none focus:border-blue-500"
                          >
                            <option value="">Let AI Autofill</option>
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="manual-severity" className="text-[9px] font-semibold text-slate-500 block mb-1">Manual Severity (Optional)</label>
                          <select
                            id="manual-severity"
                            value={newSeverity}
                            onChange={(e) => setNewSeverity(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg py-1 px-2 text-[11px] text-slate-700 focus:outline-none focus:border-blue-500"
                          >
                            <option value="">Let AI Autofill</option>
                            {SEVERITIES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          id="submit-form-cancel"
                          type="button"
                          onClick={() => {
                            setNewTitle("");
                            setNewDescription("");
                            setImagePreviewUrl(null);
                            setImageBase64(null);
                            setShowAddForm(false);
                          }}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          id="submit-form-dispatch"
                          type="submit"
                          disabled={isSubmitting}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                              Processing AI...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-white" />
                              Dispatch Report
                            </>
                          )
                          }
                        </button>
                      </div>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Split layout: Visual issue select or Details content */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* PRIMARY MASTER LIST: left 5 grid spaces */}
              <div className="md:col-span-12 lg:col-span-5 space-y-4 max-h-[700px] overflow-y-auto pr-1">
                <span className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Filtered Issues Directory ({filteredIssues.length})</span>
                {filteredIssues.map((issue) => {
                  const isSelected = selectedIssueId === issue.id;
                  
                  let severityColor = "bg-orange-50 text-orange-700 border-orange-200";
                  if (issue.severity === "Low") severityColor = "bg-slate-100 text-slate-600 border-slate-200";
                  if (issue.severity === "Medium") severityColor = "bg-amber-50 text-amber-700 border-amber-200";
                  if (issue.severity === "High") severityColor = "bg-orange-100 text-orange-850 border-orange-200";
                  if (issue.severity === "Critical") severityColor = "bg-red-50 text-red-700 border-red-200 animate-pulse";

                  // Count comments dynamically
                  const issueComments = selectedIssueId === issue.id && selectedIssue ? comments : [];

                  return (
                    <div
                      key={issue.id}
                      id={`card-${issue.id}`}
                      onClick={() => setSelectedIssueId(issue.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer select-none relative overflow-hidden group ${
                        isSelected
                          ? "bg-blue-50/50 border-blue-300 shadow-sm"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {/* Visual marker ribbon */}
                      <span className={`absolute top-0 left-0 w-1 h-full ${
                        issue.category === "Water Leakage"
                          ? "bg-blue-500"
                          : issue.category === "Damaged Streetlight"
                          ? "bg-amber-400"
                          : issue.category === "Safety Hazard"
                          ? "bg-red-500"
                          : issue.category === "Waste & Trash"
                          ? "bg-emerald-500"
                          : "bg-orange-500"
                      }`}></span>

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] bg-slate-100 text-slate-650 border border-slate-200 px-2 py-0.5 rounded-full font-bold">
                            {issue.category}
                          </span>
                          <div className="flex items-center gap-1">
                            {issue.severity === "Critical" && issue.status !== "Resolved" && (
                              <span className="text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black font-mono animate-pulse shrink-0">
                                🆘 URGENT
                              </span>
                            )}
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-black border ${severityColor}`}>
                              {issue.severity}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">{issue.title}</h4>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-sans">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {issue.address.substring(0, 32)}...
                          </span>
                        </div>

                        {/* Smart AI Tags */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {issue.aiTags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold font-mono border border-emerald-100">
                              #{tag}
                            </span>
                          ))}
                        </div>

                        {/* Votes & Community indicators */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 mt-1">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                              <ThumbsUp className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              {issue.upvotes?.length || 0}
                            </span>
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {issueComments.length || (issue.id === 1 ? 2 : 1)}
                            </span>
                          </div>

                          <span className={`text-[10px] font-sans uppercase font-extrabold flex items-center gap-1 ${
                            issue.status === "Resolved"
                              ? "text-emerald-600"
                              : issue.status === "Verified"
                              ? "text-blue-600"
                              : "text-amber-600"
                          }`}>
                            {issue.status === "Resolved" && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                            {issue.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DETAILS AND CONTEXT COLUMN: right 7 grid spaces */}
              <div className="md:col-span-12 lg:col-span-7">
                {selectedIssue ? (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm relative overflow-hidden">
                    {/* Visual Card Hero Header if there is a preview image */}
                    {selectedIssue.imageUrl && (
                      <div className="relative w-full h-48 bg-slate-100 border-b border-slate-200">
                        <img
                          src={selectedIssue.imageUrl}
                          alt="reported visual evidence"
                          className="w-full h-full object-cover opacity-90"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
                        <span className="absolute bottom-3 left-4 bg-blue-600 hover:bg-blue-705 text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
                          <ShieldCheck className="w-3.5 h-3.5 text-white" />
                          Photo Verified Evidence
                        </span>
                      </div>
                    )}

                    {/* Description & Core Title metadata block */}
                    <div className="p-6 space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-full font-bold">
                            {selectedIssue.category}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded font-mono uppercase font-black border ${
                            selectedIssue.severity === "Critical"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}>
                            {selectedIssue.severity} priority
                          </span>
                        </div>

                        <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(selectedIssue.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {selectedIssue.severity === "Critical" && selectedIssue.status !== "Resolved" && (
                        <div className="bg-red-50 border-2 border-red-250 rounded-xl p-4 flex gap-3.5 items-start animate-pulse shadow-sm">
                          <div className="bg-red-100 p-2 rounded-lg text-red-650 shrink-0">
                            <ShieldAlert className="w-5 h-5 text-red-600" />
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-black uppercase font-mono tracking-wider text-red-800 flex items-center gap-1.5">
                              🆘 URGENT ASSISTANCE REQUIRED
                            </h4>
                            <p className="text-[11px] text-red-700 leading-relaxed font-sans">
                              This incident has been categorized as <strong>Critical</strong> severity. Emergency response escalation/rapid dispatch is active for this hyperlocal zone.
                            </p>
                          </div>
                        </div>
                      )}

                      <div>
                        <h2 className="font-extrabold text-slate-900 text-lg tracking-tight leading-tight">{selectedIssue.title}</h2>
                        <div className="flex items-center gap-1.5 mt-2 text-slate-600 text-xs">
                          <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                          <span>{selectedIssue.address}</span>
                          <span className="text-slate-400 font-mono">({selectedIssue.latitude.toFixed(3)}, {selectedIssue.longitude.toFixed(3)})</span>
                        </div>
                      </div>

                      {/* Interactive Resolution Progress Bar */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3.5 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold flex items-center gap-1.5">
                            <span className="flex h-2 w-2 relative">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${selectedIssue.status === "Resolved" ? "bg-emerald-400" : "bg-blue-400"}`}></span>
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${selectedIssue.status === "Resolved" ? "bg-emerald-500" : "bg-blue-600"}`}></span>
                            </span>
                            Resolution Progress Profile
                          </span>
                          <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-md ${selectedIssue.status === "Resolved" ? "bg-emerald-100 text-emerald-800" : "bg-blue-105 text-blue-900"}`}>
                            {selectedIssue.status === "Open" ? "25%" : selectedIssue.status === "Investigating" ? "50%" : selectedIssue.status === "Verified" ? "75%" : "100%"}
                          </span>
                        </div>
                        
                        {/* Interactive custom track */}
                        <div className="relative w-full py-1">
                          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 bg-slate-200 rounded-full" />
                          <div
                            className={`absolute left-0 top-1/2 -translate-y-1/2 h-2 rounded-full transition-all duration-700 ease-out ${
                              selectedIssue.status === "Resolved" ? "bg-emerald-500" : "bg-blue-600"
                            }`}
                            style={{
                              width:
                                selectedIssue.status === "Open"
                                  ? "25%"
                                  : selectedIssue.status === "Investigating"
                                  ? "50%"
                                  : selectedIssue.status === "Verified"
                                  ? "75%"
                                  : "100%",
                            }}
                          />
                          
                          {/* Segment node markers */}
                          <div className="relative flex justify-between z-10 w-full pointer-events-none px-1">
                            {[
                              { label: "Open", val: "Open" },
                              { label: "Investigating", val: "Investigating" },
                              { label: "Verified", val: "Verified" },
                              { label: "Resolved", val: "Resolved" }
                            ].map((step, idx) => {
                              const statuses = ["Open", "Investigating", "Verified", "Resolved"];
                              const currentIdx = statuses.indexOf(selectedIssue.status);
                              const stepIdx = statuses.indexOf(step.val);
                              const isPastOrCurrent = stepIdx <= currentIdx;
                              const isCurrent = step.val === selectedIssue.status;
                              
                              let dotColor = "bg-slate-300";
                              if (isPastOrCurrent) {
                                dotColor = selectedIssue.status === "Resolved" ? "bg-emerald-500 animate-pulse" : "bg-blue-600";
                              }
                              
                              return (
                                <div key={idx} className="flex flex-col items-center">
                                  <div className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-md ${dotColor} ${isCurrent ? 'scale-125' : ''} transition-all duration-500`} />
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Status label grid aligned to the nodes */}
                        <div className="grid grid-cols-4 text-[9px] font-mono font-bold uppercase tracking-tight text-center">
                          {[
                            { label: "Open", val: "Open" },
                            { label: "Investigating", val: "Investigating" },
                            { label: "Verified", val: "Verified" },
                            { label: "Resolved", val: "Resolved" }
                          ].map((step, idx) => {
                            const isCurrent = step.val === selectedIssue.status;
                            let textColor = "text-slate-400";
                            if (isCurrent) {
                              textColor = selectedIssue.status === "Resolved" ? "text-emerald-700 font-extrabold" : "text-blue-700 font-extrabold";
                            }
                            return (
                              <div key={idx} className={`${textColor} transition-colors duration-500`}>
                                {step.label}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* AI Community Blueprint & Joint Civic Impact Section */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 transition-all hover:shadow-md relative overflow-hidden group">
                        {/* Shimmer background accent */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-tr from-emerald-500/5 via-blue-500/5 to-transparent rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500 pointer-events-none" />

                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
                            <h3 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-1.5 flex-nowrap">
                              CivicImpact AI Blueprint & Forecast
                            </h3>
                          </div>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-mono font-bold shrink-0">
                            Gemini Connected
                          </span>
                        </div>

                        {loadingBlueprintIds.includes(selectedIssue.id) ? (
                          <div className="py-8 text-center space-y-2.5">
                            <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin mx-auto text-center" />
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-800 font-mono tracking-tight animate-pulse uppercase">Synthesizing expert localized blueprint...</p>
                              <p className="text-[10px] text-slate-500 max-w-xs mx-auto leading-relaxed">Evaluating community alignment patterns, safety advisory bounds, and green ecological indicators with Gemini AI.</p>
                            </div>
                          </div>
                        ) : blueprints[selectedIssue.id] ? (
                          <div className="space-y-4 text-left">
                            {/* Summary callout card */}
                            <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50 border-l-4 border-emerald-500 px-3.5 py-3 rounded-r-xl rounded-l-none font-medium">
                              "{blueprints[selectedIssue.id].summary}"
                            </p>

                            {/* Impact Stats grid */}
                            <div className="space-y-2">
                              <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 font-bold block">Estimated Hyperlocal Gains</span>
                              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 select-none">
                                {blueprints[selectedIssue.id].impactForecast.waterSaved > 0 && (
                                  <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-100 flex flex-col justify-between h-16 shadow-xs">
                                    <span className="text-[9px] text-blue-600 font-mono font-bold tracking-tight uppercase">💦 Water Saved</span>
                                    <span className="text-xs font-black text-blue-850 font-mono">{blueprints[selectedIssue.id].impactForecast.waterSaved.toLocaleString()} Gals</span>
                                  </div>
                                )}
                                <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 flex flex-col justify-between h-16 shadow-xs">
                                  <span className="text-[9px] text-emerald-600 font-mono font-bold tracking-tight uppercase">🍃 CO2 Mitigated</span>
                                  <span className="text-xs font-black text-emerald-850 font-mono">{blueprints[selectedIssue.id].impactForecast.carbonOffset} kg CO2</span>
                                </div>
                                <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100 flex flex-col justify-between h-16 shadow-xs">
                                  <span className="text-[9px] text-indigo-600 font-mono font-bold tracking-tight uppercase">🛡️ Safety Upgrade</span>
                                  <span className="text-xs font-black text-indigo-850 font-mono">+{blueprints[selectedIssue.id].impactForecast.safetyGain}% Match</span>
                                </div>
                                <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-100 flex flex-col justify-between h-16 shadow-xs">
                                  <span className="text-[9px] text-amber-600 font-mono font-bold tracking-tight uppercase">🚶 Walkability</span>
                                  <span className="text-xs font-black text-amber-850 font-mono">+{blueprints[selectedIssue.id].impactForecast.walkabilityBoost} pts</span>
                                </div>
                                <div className={`bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 flex flex-col justify-between h-16 shadow-xs ${blueprints[selectedIssue.id].impactForecast.waterSaved > 0 ? "col-span-1" : "col-span-2"}`}>
                                  <span className="text-[9px] text-rose-600 font-mono font-bold tracking-tight uppercase">🤝 Collective Bond</span>
                                  <span className="text-xs font-black text-rose-850 font-mono">+{blueprints[selectedIssue.id].impactForecast.communityCohesion} Index</span>
                                </div>
                              </div>
                            </div>

                            {/* Citizen Action Checklist */}
                            <div className="space-y-2.5 pt-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 font-bold block">Community Action Plan Checklist</span>
                                <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  Pledge for +5 pts
                                </span>
                              </div>
                              <div className="space-y-2">
                                {blueprints[selectedIssue.id].actionPlan.map((step: string, index: number) => {
                                  const isCommitted = (committedSteps[selectedIssue.id] || []).includes(step);
                                  return (
                                    <div
                                      key={index}
                                      onClick={() => toggleStepCommit(selectedIssue.id, step)}
                                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer font-sans select-none ${
                                        isCommitted
                                          ? "bg-emerald-500/5 border-emerald-300 text-slate-900 shadow-xs"
                                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                                      }`}
                                    >
                                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                        isCommitted ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-300"
                                      }`}>
                                        {isCommitted ? (
                                          <CheckCircle className="w-3.5 h-3.5 text-white" />
                                        ) : (
                                          <span className="text-[10px] font-mono font-black text-slate-400">{index + 1}</span>
                                        )}
                                      </div>
                                      <div className="space-y-1">
                                        <p className={`text-xs font-medium leading-relaxed ${isCommitted ? 'text-slate-900 line-through opacity-85' : 'text-slate-800'}`}>
                                          {step}
                                        </p>
                                        {isCommitted && (
                                          <span className="text-[9px] text-emerald-600 font-mono font-extrabold tracking-tight uppercase flex items-center gap-1">
                                            🌟 Pledge Active: Committed to Hyperlocal Resolution
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Certificate Export button */}
                            <div className="pt-2">
                              <button
                                onClick={() => {
                                  setCertificateIssueId(selectedIssue.id);
                                  setShowCertificateModal(true);
                                  triggerNotification("Community action certificate prepared successfully!", "success");
                                }}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 active:from-emerald-800 active:to-indigo-800 text-white py-2.5 px-4 rounded-xl text-xs font-extrabold uppercase font-mono tracking-tight transition-all shadow-md hover:shadow-indigo-500/20 active:scale-98 cursor-pointer border-0"
                              >
                                <Award className="w-4 h-4 text-amber-300" />
                                Generate Eco-Community Impact Certificate
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="py-6 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-2xl">
                            Could not load localized impact metrics for this segment.
                          </div>
                        )}
                      </div>

                      {/* Chronological Event Timeline */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Issue Activity Timeline
                        </span>

                        <div className="relative pl-6 space-y-5">
                          {/* Vertical timeline connector */}
                          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200" />

                          {[
                            {
                              title: "Reported",
                              time: new Date(selectedIssue.createdAt),
                              description: `Issue submitted by resident ${selectedIssue.reporterName}. Classification: ${selectedIssue.category}.`,
                              completed: true,
                              icon: MessageSquare,
                              color: "text-blue-600 bg-blue-50 border-blue-200",
                            },
                            {
                              title: "Verified",
                              time: new Date(new Date(selectedIssue.createdAt).getTime() + 2 * 60 * 60 * 1000),
                              description: (selectedIssue.status === "Verified" || selectedIssue.status === "Investigating" || selectedIssue.status === "Resolved" || (selectedIssue.upvotes && selectedIssue.upvotes.length > 0))
                                ? `Upvoted & verified by local citizens. Count: ${selectedIssue.upvotes?.length || 1} residents.`
                                : "Pending sufficient citizen verifications.",
                              completed: (selectedIssue.status === "Verified" || selectedIssue.status === "Investigating" || selectedIssue.status === "Resolved" || (selectedIssue.upvotes && selectedIssue.upvotes.length > 0)),
                              icon: UserCheck,
                              color: (selectedIssue.status === "Verified" || selectedIssue.status === "Investigating" || selectedIssue.status === "Resolved" || (selectedIssue.upvotes && selectedIssue.upvotes.length > 0))
                                ? "text-indigo-600 bg-indigo-50 border-indigo-200"
                                : "text-slate-400 bg-slate-100 border-slate-200 opacity-60",
                            },
                            {
                              title: "Investigating",
                              time: new Date(new Date(selectedIssue.createdAt).getTime() + 12 * 60 * 60 * 1000),
                              description: (selectedIssue.status === "Investigating" || selectedIssue.status === "Resolved")
                                ? "Official inspection completed. Dispatch unit scheduled for remedial intervention."
                                : "Municipal dispatch scheduled.",
                              completed: (selectedIssue.status === "Investigating" || selectedIssue.status === "Resolved"),
                              icon: Eye,
                              color: (selectedIssue.status === "Investigating" || selectedIssue.status === "Resolved")
                                ? "text-amber-600 bg-amber-50 border-amber-200"
                                : "text-slate-400 bg-slate-100 border-slate-200 opacity-60",
                            },
                            {
                              title: "Resolved",
                              time: new Date(new Date(selectedIssue.createdAt).getTime() + 36 * 60 * 60 * 1000),
                              description: selectedIssue.status === "Resolved"
                                ? (selectedIssue.actionTaken || "Repairs successfully completed and verified in the municipal system.")
                                : "Awaiting response crew completion.",
                              completed: selectedIssue.status === "Resolved",
                              icon: CheckCircle,
                              color: selectedIssue.status === "Resolved"
                                ? "text-emerald-600 bg-emerald-50 border-emerald-200 font-semibold"
                                : "text-slate-400 bg-slate-100 border-slate-200 opacity-60",
                            },
                          ].map((evt, idx) => {
                            const IconCmp = evt.icon;
                            // format timestamp
                            const formattedTime = evt.completed
                              ? evt.time.toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Pending";

                            return (
                              <div key={idx} className={`relative flex items-start gap-4 transition-all duration-300 ${!evt.completed ? "opacity-70" : ""}`}>
                                {/* Icon container as the dot */}
                                <div className={`absolute -left-[24px] flex items-center justify-center w-6 h-6 rounded-full border shadow-sm z-10 ${evt.color}`}>
                                  <IconCmp className="w-3.5 h-3.5" />
                                </div>

                                {/* Content box */}
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className={`text-xs font-bold ${evt.completed ? "text-slate-800" : "text-slate-400"}`}>
                                      {evt.title}
                                    </h4>
                                    <span className="text-[9px] font-mono font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                      {formattedTime}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-600 font-sans leading-relaxed">
                                    {evt.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Problem Statement Details container */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold block mb-1">Citizen Statement Log</span>
                        <p className="text-xs text-slate-700 leading-relaxed font-sans">{selectedIssue.description}</p>
                        
                        {/* Reporter Identification line */}
                        <div className="flex items-center justify-between pt-3.5 mt-3.5 border-t border-slate-250 text-[10px] text-slate-400 font-mono">
                          <span>Verified Submitter: {selectedIssue.reporterName}</span>
                          <span>{selectedIssue.reporterEmail}</span>
                        </div>
                      </div>

                      {/* AI-Powered Recommendations alert advice box (Gemini Feature element) */}
                      {selectedIssue.aiSafetyAdvice && (
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl rounded-l-none flex items-start gap-3 relative overflow-hidden">
                          {/* Ambient sparkle element */}
                          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-tr from-amber-500/10 to-transparent rounded-full blur-xl"></div>
                          
                          <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                          <div className="space-y-1 z-10 relative">
                            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider font-mono flex items-center gap-1">
                              Immediate Safety Advice (AI-Generated)
                            </span>
                            <p className="text-xs text-slate-700 leading-relaxed">{selectedIssue.aiSafetyAdvice}</p>
                          </div>
                        </div>
                      )}

                      {/* Remediation Note action block */}
                      {selectedIssue.actionTaken && (
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider font-mono">
                              Remediation / Works Action Logged
                            </span>
                            <p className="text-xs text-slate-700 leading-relaxed">{selectedIssue.actionTaken}</p>
                          </div>
                        </div>
                      )}

                      {/* Verification (VOTING) & Status Controls Dashboard */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="space-y-1 leading-none text-center sm:text-left">
                          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold block">Community Verification Score</span>
                          <span className="text-sm text-slate-700 mt-1 flex items-center gap-1 justify-center sm:justify-start">
                            <ThumbsUp className="w-4 h-4 text-blue-500 inline" />
                            <strong>{selectedIssue.upvotes?.length || 0} Citizens</strong> have verified this issue
                          </span>
                        </div>

                        {/* Interactive Upvote/Verif Action buttons */}
                        <div className="flex gap-2">
                          <button
                            id="btn-upvote"
                            onClick={() => handleVoteToggle(selectedIssue.id)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all outline-none ${
                              selectedIssue.upvotes?.includes(currentUserEmail)
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-white border border-slate-200 hover:border-slate-300 text-slate-700 active:scale-95 shadow-sm"
                            }`}
                          >
                            <ThumbsUp className="w-4 h-4" />
                            {selectedIssue.upvotes?.includes(currentUserEmail) ? "Verified" : "Verify Issue"}
                          </button>
                        </div>
                      </div>

                      {/* Municipal Action Control Center (Only let municipal staff or verified solvers advance state) */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
                        <span className="text-[10px] font-bold tracking-widest text-slate-500 block uppercase">Municipal Action Desk</span>
                        
                        {/* Status transition controller */}
                        {selectedIssue.status !== "Resolved" ? (
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                id="btn-status-investigate"
                                onClick={() => handleStatusChange(selectedIssue.id, "Investigating")}
                                disabled={updatingStatus !== null}
                                className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-705 shadow-sm transition-colors"
                              >
                                Mark as Investigating
                              </button>
                              
                              <button
                                id="btn-status-verify"
                                onClick={() => handleStatusChange(selectedIssue.id, "Verified")}
                                disabled={updatingStatus !== null}
                                className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-705 shadow-sm transition-colors"
                              >
                                Force Status (Verified)
                              </button>
                            </div>

                            {/* Resolution logging text form */}
                            <div className="space-y-2 pt-2.5 border-t border-slate-200">
                              <label htmlFor="resolver-notes" className="text-[10px] font-semibold text-slate-500 block">Remediation actions taken to resolve (Required for Resolution) *</label>
                              <div className="flex gap-2">
                                <input
                                  id="resolver-notes"
                                  type="text"
                                  value={resolutionNote}
                                  onChange={(e) => setResolutionNote(e.target.value)}
                                  placeholder="e.g. Cleared rubbish. / Paved immediate hole segments."
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                                />
                                <button
                                  id="btn-status-resolved"
                                  type="button"
                                  disabled={!resolutionNote.trim() || updatingStatus !== null}
                                  onClick={() => handleStatusChange(selectedIssue.id, "Resolved")}
                                  className="px-4 py-2 bg-blue-600 disabled:bg-slate-200 text-white disabled:text-slate-400 font-extrabold rounded-xl text-xs transition-all flex items-center justify-center shrink-0 shadow-sm"
                                >
                                  Mark Solved!
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-2 text-emerald-700 text-xs font-bold font-mono border border-dashed border-emerald-300 rounded-xl flex items-center justify-center gap-2 bg-emerald-50/50">
                            <CheckCircle className="w-4 h-4 text-emerald-500" /> This dispatch problem has been successfully resolved and archived!
                          </div>
                        )}
                      </div>

                      {/* Discussion Comment Forum */}
                      <div className="space-y-4 pt-4 border-t border-slate-150">
                        <span className="text-[10px] font-sans text-slate-500 font-bold uppercase tracking-widest block">Communication Feed ({comments.length})</span>
                        
                        {/* List comments */}
                        <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                          {comments.length === 0 ? (
                            <p className="text-xs text-slate-500 py-3 italic text-center">No community posts yet. Start the dialogue below.</p>
                          ) : (
                            comments.map((comment) => (
                              <div
                                key={comment.id}
                                className={`p-3 rounded-xl text-xs space-y-1.5 ${
                                  comment.isOfficial
                                    ? "bg-blue-50/50 border border-blue-200 shadow-sm ml-3"
                                    : "bg-slate-50/50 border border-slate-200"
                                }`}
                              >
                                <div className="flex items-center justify-between text-[10px] font-sans">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-slate-800">{comment.citizenName}</span>
                                    {comment.isOfficial && (
                                      <span className="text-[8px] font-mono uppercase bg-blue-600 text-white px-1.5 rounded font-black tracking-wider shadow">Official</span>
                                    )}
                                  </div>
                                  <span className="text-slate-400">{new Date(comment.createdAt).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-slate-700 leading-relaxed">{comment.content}</p>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Leave Comment input field */}
                        <form onSubmit={handleCommentSubmit} className="flex gap-2">
                          <input
                            id="comment-input"
                            type="text"
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                            placeholder="Add coordinates updates, damage check remarks, or helpful notes..."
                            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none text-slate-850"
                            required
                          />
                          <button
                            id="btn-comment-submit"
                            type="submit"
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl px-4 py-2.5 flex items-center justify-center shrink-0 active:scale-95 transition-transform border border-slate-200"
                          >
                            <Send className="w-4 h-4 text-blue-600" />
                          </button>
                        </form>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 space-y-3.5 shadow-sm">
                    <MapPin className="w-12 h-12 text-blue-500 mx-auto animate-bounce" />
                    <div>
                      <h4 className="text-slate-900 font-bold text-base">Select Hyperlocal Incident Pin</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Click on issues around the Left map visualizer, filter search keys, or drop new marker flags directly on the coordinates system grid board.
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      </main>

      {/* Humble craft credit page footer */}
      <footer className="border-t border-slate-200 bg-slate-50 text-slate-500 text-xs py-8 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <div>
            <p className="font-semibold text-slate-850">CivicResolve — Hyperlocal Problem Solver</p>
            <p className="text-[11px] text-slate-500 mt-1">Harnessing collaborative civic participation and Gemini AI categorization for municipal transparency.</p>
          </div>
          <p className="text-[11px] font-mono text-slate-400">Built in Google AI Studio • React & Vite Framework © 2026</p>
        </div>
      </footer>

      {/* Hyperlocal Eco-Community Impact Certificate Modal */}
      {showCertificateModal && certificateIssueId && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-amber-300 dark:border-amber-400 max-w-2xl w-full rounded-2xl shadow-2xl p-8 relative overflow-hidden transition-all duration-300">
            {/* Stamp decoration */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full flex items-center justify-center border-4 border-dashed border-amber-500/20 rotate-12">
              <span className="text-[10px] font-black font-mono text-amber-600 tracking-widest uppercase">Verified Civic Guild</span>
            </div>

            <button
              onClick={() => {
                setShowCertificateModal(false);
                setCertificateIssueId(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Certificate Header */}
            <div className="text-center space-y-3 pb-6 border-b border-slate-100">
              <Award className="w-12 h-12 text-amber-500 mx-auto animate-pulse" />
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-slate-900 font-serif uppercase tracking-wider">CIVIC CERTIFICATE</h2>
                <p className="text-[10px] text-amber-700 font-mono font-extrabold tracking-widest uppercase">Eco-Community Action Certificate</p>
              </div>
            </div>

            {/* Certificate Content */}
            <div className="py-6 space-y-5 text-center">
              <p className="text-xs text-slate-600 italic">
                This document honors the collective actions, pledges, and verifications committed by District 1 community members toward repairing, safeguarding, and green-restoring our shared neighborhoods.
              </p>

              {(() => {
                const certIssue = issues.find(i => i.id === certificateIssueId);
                const certBlueprint = blueprints[certificateIssueId];
                if (!certIssue || !certBlueprint) return null;
                
                return (
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl space-y-1.5">
                      <span className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-widest block">Hyperlocal Incident Tracked</span>
                      <h3 className="font-extrabold text-slate-800 text-sm leading-tight">{certIssue.title}</h3>
                      <p className="text-[10px] text-slate-500 font-mono font-bold">{certIssue.category} • {certIssue.address}</p>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] font-black font-mono text-slate-400 uppercase tracking-widest block">Collective Environmental & Safety Gains</span>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 text-center">
                          <span className="text-[8px] text-blue-500 font-mono font-bold block">Water Preserved</span>
                          <span className="text-xs font-black text-blue-700 font-mono">
                            {certBlueprint.impactForecast.waterSaved > 0 ? `${certBlueprint.impactForecast.waterSaved.toLocaleString()} Gals` : "0 Gals"}
                          </span>
                        </div>
                        <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 text-center">
                          <span className="text-[8px] text-emerald-500 font-mono font-bold block">CO2 Mitigated</span>
                          <span className="text-xs font-black text-emerald-700 font-mono">{certBlueprint.impactForecast.carbonOffset} kg CO2</span>
                        </div>
                        <div className="bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100 text-center">
                          <span className="text-[8px] text-indigo-500 font-mono font-bold block">Safety Upgrade</span>
                          <span className="text-xs font-black text-indigo-700 font-mono">+{certBlueprint.impactForecast.safetyGain}%</span>
                        </div>
                        <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-100 text-center">
                          <span className="text-[8px] text-amber-500 font-mono font-bold block">Walkability Index</span>
                          <span className="text-xs font-black text-amber-700 font-mono">+{certBlueprint.impactForecast.walkabilityBoost} pts</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-700 leading-relaxed italic max-w-lg mx-auto font-medium">
                      "{certBlueprint.summary}"
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Signatures */}
            <div className="flex justify-between items-end border-t border-slate-100 pt-6 mt-2 text-left">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 font-mono font-bold block uppercase">Representative Signoff</span>
                <p className="text-xs font-serif font-semibold text-slate-700 italic border-b border-slate-200 pb-1 pr-6 tracking-wide">Citizen Group Lead</p>
                <span className="text-[8px] font-mono text-slate-500 block">District 1 Block Captain</span>
              </div>

              <div className="space-y-1 text-right">
                <span className="text-[9px] text-slate-400 font-mono font-bold block uppercase">Validation Token</span>
                <span className="text-[9px] font-mono font-extrabold text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-block uppercase shadow-xs">
                  AISTUDIO-BUILD-#{certificateIssueId?.toUpperCase()}
                </span>
                <span className="text-[8px] font-mono text-slate-400 block">Verified on Proof-of-Action Protocol</span>
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex gap-3.5 mt-6">
              <button
                onClick={() => {
                  triggerNotification("Impact Ledger saved successfully to county blockchain indexes!", "success");
                  setShowCertificateModal(false);
                }}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold uppercase tracking-tight py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md select-none border-0"
              >
                💾 Save to Ledger
              </button>
              <button
                onClick={() => {
                  setShowCertificateModal(false);
                  setCertificateIssueId(null);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold uppercase tracking-tight py-2.5 px-6 rounded-xl text-xs transition-colors cursor-pointer border border-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
