import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Heart, 
  Search, 
  MapPin, 
  Phone, 
  Share2, 
  LogOut, 
  LogIn, 
  UserPlus, 
  ArrowRight, 
  User, 
  Calendar, 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  ListFilter,
  Users,
  Edit2,
  Lock,
  Clock,
  MessageCircle,
  X,
  Plus,
  Menu,
  Eye,
  EyeOff,
  Droplet,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Check,
  PlusCircle
} from "lucide-react";

import { 
  AppView, 
  Donor, 
  UserStatus, 
  ToastMessage, 
  GHOTKI_CITIES, 
  BLOOD_GROUPS,
  DonationRecord
} from "./types";
import { forceReleaseAllScrollLocks } from "./utils/scrollLock";

import { 
  searchDonors, 
  registerDonor, 
  authenticateDonor, 
  updateDonorProfile, 
  getDonorById,
  fetchDonorRecord,
  verifyDonorSession,
  adminGetAllDonors,
  getDonationRecords,
  addDonationRecord,
  deleteDonationRecord,
  getCachedLiveDonors,
  cacheLiveDonors,
  filterDonorsList,
  fetchPublicDonorsFromFirebase,
  cleanErrorMessage
} from "./firebase";

import FloatingParticles from "./components/FloatingParticles";
import DrippingBloodIcon from "./components/DrippingBloodIcon";
import Toast from "./components/Toast";
import { SkeletonGrid } from "./components/Skeletons";
import Counter from "./components/Counter";
import FloatingLabelInput from "./components/FloatingLabelInput";
import CustomSelect from "./components/CustomSelect";
import AdminPanel from "./components/AdminPanel";
import SplashScreen from "./components/SplashScreen";
import DonorCard from "./components/DonorCard";
import HeroTypewriter from "./components/HeroTypewriter";
import ModalDialog from "./components/ModalDialog";

// Phone formatter for Pakistan dialers (e.g. 03xx -> 923xx)
function sanitizeWhatsAppPhone(phone: any): string {
  if (phone === null || phone === undefined) return "";
  let cleaned = String(phone).replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "92" + cleaned.substring(1);
  }
  return cleaned;
}

const REG_STEPS = [
  { id: 1, title: "Aap ki maloomat" },
  { id: 2, title: "Blood aur ilaqa" },
  { id: 3, title: "Account banayein" },
];

/**
 * Deep comparison helper to check if two donor arrays are equivalent.
 * Prevents redundant re-renders and layout shifts during silent background polling.
 */
function areDonorListsEqual(a: Donor[], b: Donor[]): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const da = a[i];
    const db = b[i];
    if (
      da.id !== db.id ||
      da.name !== db.name ||
      da.bloodGroup !== db.bloodGroup ||
      da.city !== db.city ||
      da.primaryPhone !== db.primaryPhone ||
      da.secondaryPhone !== db.secondaryPhone ||
      da.willingToDonate !== db.willingToDonate ||
      da.status !== db.status ||
      da.lastDonationDate !== db.lastDonationDate ||
      da.address !== db.address ||
      da.fatherName !== db.fatherName
    ) {
      return false;
    }
  }
  return true;
}

export default function App() {
  // Global pause for CSS animations when tab is hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("tab-hidden", document.hidden);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    handleVisibility();
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Intro Splash Screen State (shows on initial application load)
  const [showSplashScreen, setShowSplashScreen] = useState<boolean>(() => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        return sessionStorage.getItem("ghotki_splash_seen") !== "true";
      }
    } catch {
      // Fallback
    }
    return true;
  });

  const handleSplashFinish = useCallback(() => {
    setShowSplashScreen(false);
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        sessionStorage.setItem("ghotki_splash_seen", "true");
      }
    } catch {
      // Fallback
    }
  }, []);

  // Navigation State
  const [view, setView] = useState<AppView>("LANDING");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileMenuMounted, setIsMobileMenuMounted] = useState(false);
  const [isMobileMenuVisible, setIsMobileMenuVisible] = useState(false);
  const mobileMenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mobile menu smooth animation enter (200ms ease-out) / exit (150ms ease-in) with unmount
  useEffect(() => {
    const isReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isMobileMenuOpen) {
      if (mobileMenuTimeoutRef.current) clearTimeout(mobileMenuTimeoutRef.current);
      setIsMobileMenuMounted(true);
      if (isReduced) {
        setIsMobileMenuVisible(true);
      } else {
        const frame = requestAnimationFrame(() => {
          setIsMobileMenuVisible(true);
        });
        return () => cancelAnimationFrame(frame);
      }
    } else {
      setIsMobileMenuVisible(false);
      if (isReduced) {
        setIsMobileMenuMounted(false);
      } else {
        mobileMenuTimeoutRef.current = setTimeout(() => {
          setIsMobileMenuMounted(false);
        }, 200);
      }
    }

    return () => {
      if (mobileMenuTimeoutRef.current) clearTimeout(mobileMenuTimeoutRef.current);
    };
  }, [isMobileMenuOpen]);
  
  // Current logged in user
  const [currentUser, setCurrentUser] = useState<Donor | null>(null);
  const [savedAdminPassword, setSavedAdminPassword] = useState<string>("");

  // Stats / Metrics & Admin pre-fetch cache
  const [isMetricsLoading, setIsMetricsLoading] = useState<boolean>(() => {
    try {
      const cached = getCachedLiveDonors();
      return !cached || cached.length === 0;
    } catch {
      return true;
    }
  });
  const [initialAdminDonors, setInitialAdminDonors] = useState<Donor[] | null>(null);

  // Search Filters & State
  const [selectedBlood, setSelectedBlood] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Donor[]>(() => {
    try {
      const cached = getCachedLiveDonors();
      return Array.isArray(cached) && cached.length > 0 ? cached : [];
    } catch {
      return [];
    }
  });
  const [isSearching, setIsSearching] = useState<boolean>(() => {
    try {
      const cached = getCachedLiveDonors();
      return !cached || cached.length === 0;
    } catch {
      return true;
    }
  });
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Active filters currently applied to displayed searchResults
  const appliedBloodRef = useRef<string>("");
  const appliedCityRef = useRef<string>("");

  // Pagination for smooth rendering with large lists (initial 20, load next 20 on scroll)
  const [visibleDonorCount, setVisibleDonorCount] = useState<number>(20);
  const [isLoadingMoreDonors, setIsLoadingMoreDonors] = useState<boolean>(false);
  const donorSentinelRef = useRef<HTMLDivElement | null>(null);

  // Selected donor detail popup
  const [viewingDonor, setViewingDonor] = useState<Donor | null>(null);

  // Form states - Registration
  const [regName, setRegName] = useState("");
  const [regFatherName, setRegFatherName] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regCity, setRegCity] = useState(GHOTKI_CITIES[0]);
  const [regBlood, setRegBlood] = useState(BLOOD_GROUPS[0]);
  const [regPrimaryPhone, setRegPrimaryPhone] = useState("");
  const [regSecondaryPhone, setRegSecondaryPhone] = useState("");
  const [regLastDonation, setRegLastDonation] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regFormErrors, setRegFormErrors] = useState<Record<string, string>>({});
  const [regLoading, setRegLoading] = useState(false);

  // Registration Wizard States
  const [regStep, setRegStep] = useState<number>(1);
  const [slideDirection, setSlideDirection] = useState<"forward" | "backward">("forward");
  const [isStepExiting, setIsStepExiting] = useState(false);
  const [isOptionalExpanded, setIsOptionalExpanded] = useState(false);
  const regCardRef = useRef<HTMLDivElement>(null);

  const scrollToCardTop = useCallback(() => {
    if (regCardRef.current) {
      regCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const goToStep = useCallback((nextStep: number, direction: "forward" | "backward") => {
    setSlideDirection(direction);
    setIsStepExiting(true);
    setTimeout(() => {
      setRegStep(nextStep);
      setIsStepExiting(false);
      // Ensure the step DOM is rendered before triggering scroll
      requestAnimationFrame(() => {
        scrollToCardTop();
      });
    }, 180);
  }, [scrollToCardTop]);

  // Form states - Login
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showResetNotice, setShowResetNotice] = useState(false);

  // Dashboard state & Profile management
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editFatherName, setEditFatherName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editBloodGroup, setEditBloodGroup] = useState("");
  const [editSecondaryPhone, setEditSecondaryPhone] = useState("");
  const [editLastDonation, setEditLastDonation] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [editStatus, setEditStatus] = useState<UserStatus>(UserStatus.ACTIVE);
  const [editWillingToDonate, setEditWillingToDonate] = useState(true);
  const [editProfileLoading, setEditProfileLoading] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Donation records state
  const [donationRecords, setDonationRecords] = useState<DonationRecord[]>([]);
  const [isLoadingDonations, setIsLoadingDonations] = useState<boolean>(false);
  const [donationsFetchedForUser, setDonationsFetchedForUser] = useState<string | null>(null);
  const [showAllDonations, setShowAllDonations] = useState<boolean>(false);

  // Add Donation Modal state
  const [showAddDonationModal, setShowAddDonationModal] = useState<boolean>(false);
  const [isAddingDonation, setIsAddingDonation] = useState<boolean>(false);
  const [newDonationDate, setNewDonationDate] = useState<string>("");
  const [newDonationPlace, setNewDonationPlace] = useState<string>("");
  const [newDonationForWhom, setNewDonationForWhom] = useState<string>("");
  const [newDonationNotes, setNewDonationNotes] = useState<string>("");

  // Delete Donation Modal state
  const [recordToDelete, setRecordToDelete] = useState<DonationRecord | null>(null);
  const [isDeletingDonation, setIsDeletingDonation] = useState<boolean>(false);

  // Admin panel modal state tracking (for hiding floating buttons)
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Track if any modal in the app is currently active (used to hide floating action buttons)
  const isAnyModalOpen =
    Boolean(viewingDonor) ||
    isAdminModalOpen ||
    showAddDonationModal ||
    Boolean(recordToDelete);

  // Scroll page instantly to the top whenever the view changes or Edit Profile opens/closes,
  // and ensure any lingering scroll locks are cleanly reset on navigation
  useLayoutEffect(() => {
    forceReleaseAllScrollLocks();
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  }, [view, isEditingProfile]);

  // Toasts list
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Handle Toast triggers with robust guaranteed auto-dismiss
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: "success" | "error" | "info", message: string) => {
    const displayMessage = type === "error" ? cleanErrorMessage(message) : message;
    const id = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    setToasts((prev) => [...prev, { id, type, message: displayMessage }]);

    // Robust timer attached at creation to guarantee dismissal
    setTimeout(() => {
      dismissToast(id);
    }, 3000);
  }, [dismissToast]);

  // Session expired handler - clears session and redirects to login
  const handleSessionExpired = useCallback(() => {
    localStorage.removeItem("ghotki_donor_session");
    setCurrentUser(null);
    setSavedAdminPassword("");
    setDonationRecords([]);
    setDonationsFetchedForUser(null);
    setShowAddDonationModal(false);
    setRecordToDelete(null);
    setView("LOGIN");
    addToast("error", "Session expire ho gaya, dobara login karein");
  }, [addToast]);

  // Mount logic - verify local session, load landing data
  const handleViewDetails = useCallback((donor: Donor) => {
    setViewingDonor(donor);
  }, []);

  // Unified landing page data loader
  const loadLandingData = async () => {
    const cached = getCachedLiveDonors();
    const hasCache = cached.length > 0;

    // If cache exists, do NOT show skeletons - update silently in the background
    // If no cache yet, show existing skeleton placeholders
    if (!hasCache) {
      setIsSearching(true);
      setIsMetricsLoading(true);
    }

    try {
      appliedBloodRef.current = "";
      appliedCityRef.current = "";
      // Single call to fetch donors list and derive metrics count
      const results = await searchDonors("", "");
      if (Array.isArray(results)) {
        cacheLiveDonors(results);
        setSearchResults((prev) => {
          if (areDonorListsEqual(prev, results)) return prev;
          return results;
        });
      }
    } catch {
      // Silently handle
    } finally {
      setIsSearching(false);
      setIsMetricsLoading(false);
    }
  };

  // Reset pagination to 20 whenever search filters change
  useEffect(() => {
    setVisibleDonorCount(20);
  }, [selectedBlood, selectedCity]);

  // Derived visible donors list for landing page
  const visibleDonors = useMemo(() => {
    return searchResults.slice(0, visibleDonorCount);
  }, [searchResults, visibleDonorCount]);

  const hasMoreDonors = visibleDonorCount < searchResults.length;

  // Infinite scroll observer for donor cards (loads next batch of 20)
  useEffect(() => {
    if (!donorSentinelRef.current || !hasMoreDonors) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting && hasMoreDonors && !isLoadingMoreDonors) {
          setIsLoadingMoreDonors(true);
          setTimeout(() => {
            setVisibleDonorCount((prev) => Math.min(prev + 20, searchResults.length));
            setIsLoadingMoreDonors(false);
          }, 100);
        }
      },
      { rootMargin: "250px" }
    );

    observer.observe(donorSentinelRef.current);
    return () => observer.disconnect();
  }, [hasMoreDonors, isLoadingMoreDonors, searchResults.length]);

  useEffect(() => {
    // 1. Session restore & verification
    try {
      const savedUser = localStorage.getItem("ghotki_donor_session");
      if (savedUser) {
        const parsed = JSON.parse(savedUser) as Donor & { adminPass?: string; password?: string };
        setCurrentUser(parsed);
        const storedPass = parsed.password || parsed.adminPass || "";
        if (storedPass) {
          setSavedAdminPassword(storedPass);
        }

        // If stored session is admin, verify with adminGetAllDonors
        if (parsed.isAdmin && storedPass) {
          adminGetAllDonors(parsed.primaryPhone, storedPass)
            .then((donorsRes) => {
              if (!donorsRes) {
                // Unauthorized
                handleSessionExpired();
              } else if (Array.isArray(donorsRes)) {
                setInitialAdminDonors(donorsRes);
              }
            })
            .catch(() => {
              // Keep local state if transient network issue
            });
        }

        // Fetch fresh record for the user's account and verify password validity
        if (parsed.id) {
          if (parsed.primaryPhone && storedPass) {
            verifyDonorSession(parsed.id, parsed.primaryPhone, storedPass)
              .then((res) => {
                if (res.authFailed) {
                  localStorage.removeItem("ghotki_donor_session");
                  setCurrentUser(null);
                  setSavedAdminPassword("");
                  setView("LOGIN");
                  addToast("error", "Password badal gaya hai, dobara login karein");
                } else if (res.notFound) {
                  localStorage.removeItem("ghotki_donor_session");
                  setCurrentUser(null);
                  setSavedAdminPassword("");
                  setView("LOGIN");
                  addToast("error", "Aapka account maujood nahi hai");
                } else if (res.valid && res.donor) {
                  const freshDonor = res.donor;
                  const merged: Donor & { adminPass?: string; password?: string } = {
                    ...parsed,
                    ...freshDonor,
                    password: storedPass,
                    adminPass: storedPass,
                    isAdmin: parsed.isAdmin
                  };
                  setCurrentUser(merged);
                  localStorage.setItem("ghotki_donor_session", JSON.stringify(merged));
                  setEditName(freshDonor.name || "");
                  setEditFatherName(freshDonor.fatherName || "");
                  setEditAddress(freshDonor.address || "");
                  setEditCity(freshDonor.city || "");
                  setEditBloodGroup(freshDonor.bloodGroup || "");
                  setEditSecondaryPhone(freshDonor.secondaryPhone || "");
                  setEditLastDonation(freshDonor.lastDonationDate || "");
                  setEditStatus(freshDonor.status || UserStatus.ACTIVE);
                  setEditWillingToDonate(freshDonor.willingToDonate ?? true);
                }
              })
              .catch(() => {
                // Keep session on network error
              });
          } else {
            fetchDonorRecord(parsed.id)
              .then((res) => {
                if (res.notFound) {
                  localStorage.removeItem("ghotki_donor_session");
                  setCurrentUser(null);
                  setSavedAdminPassword("");
                  setView("LOGIN");
                  addToast("error", "Aapka account maujood nahi hai");
                } else if (res.success && res.donor) {
                  const freshDonor = res.donor;
                  const merged: Donor & { adminPass?: string; password?: string } = {
                    ...parsed,
                    ...freshDonor,
                    password: storedPass,
                    adminPass: storedPass,
                    isAdmin: parsed.isAdmin
                  };
                  setCurrentUser(merged);
                  localStorage.setItem("ghotki_donor_session", JSON.stringify(merged));
                  setEditName(freshDonor.name || "");
                  setEditFatherName(freshDonor.fatherName || "");
                  setEditAddress(freshDonor.address || "");
                  setEditCity(freshDonor.city || "");
                  setEditBloodGroup(freshDonor.bloodGroup || "");
                  setEditSecondaryPhone(freshDonor.secondaryPhone || "");
                  setEditLastDonation(freshDonor.lastDonationDate || "");
                  setEditStatus(freshDonor.status || UserStatus.ACTIVE);
                  setEditWillingToDonate(freshDonor.willingToDonate ?? true);
                }
              })
              .catch(() => {
                // Keep session on network error
              });
          }
        }
      }
    } catch {
      // Local session parsing fallback
    }

    // 2. Single call to load landing page donors and count
    loadLandingData();
  }, [addToast, handleSessionExpired]);

  // Refresh donor record whenever Dashboard is shown or on periodic 30s background interval
  useEffect(() => {
    if (view !== "DASHBOARD" || !currentUser?.id) {
      return;
    }

    const donorId = currentUser.id;

    // Helper to perform silent background refresh and diff updates with password validity check
    const refreshRecordSilently = async () => {
      // Avoid fetching if document is hidden or network is offline
      if (typeof document !== "undefined" && document.hidden) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;

      const storedPass = currentUser.password || currentUser.adminPass || savedAdminPassword;
      const phone = currentUser.primaryPhone;

      try {
        if (storedPass && phone) {
          const verifyRes = await verifyDonorSession(donorId, phone, storedPass);

          if (verifyRes.authFailed) {
            localStorage.removeItem("ghotki_donor_session");
            setCurrentUser(null);
            setSavedAdminPassword("");
            setView("LOGIN");
            addToast("error", "Password badal gaya hai, dobara login karein");
            return;
          }

          if (verifyRes.notFound) {
            localStorage.removeItem("ghotki_donor_session");
            setCurrentUser(null);
            setSavedAdminPassword("");
            setView("LOGIN");
            addToast("error", "Aapka account maujood nahi hai");
            return;
          }

          if (verifyRes.valid && verifyRes.donor) {
            const fresh = verifyRes.donor;
            
            setCurrentUser((prevUser) => {
              if (!prevUser || prevUser.id !== donorId) return prevUser;

              const hasStatusChanged = (prevUser.status || "") !== (fresh.status || "");
              const hasWillingChanged = (prevUser.willingToDonate ?? true) !== (fresh.willingToDonate ?? true);
              const hasNameChanged = (prevUser.name || "") !== (fresh.name || "");
              const hasFatherChanged = (prevUser.fatherName || "") !== (fresh.fatherName || "");
              const hasAddressChanged = (prevUser.address || "") !== (fresh.address || "");
              const hasCityChanged = (prevUser.city || "") !== (fresh.city || "");
              const hasBloodChanged = (prevUser.bloodGroup || "") !== (fresh.bloodGroup || "");
              const hasSecPhoneChanged = (prevUser.secondaryPhone || "") !== (fresh.secondaryPhone || "");
              const hasLastDonationChanged = (prevUser.lastDonationDate || "") !== (fresh.lastDonationDate || "");

              const isDataDifferent =
                hasStatusChanged ||
                hasWillingChanged ||
                hasNameChanged ||
                hasFatherChanged ||
                hasAddressChanged ||
                hasCityChanged ||
                hasBloodChanged ||
                hasSecPhoneChanged ||
                hasLastDonationChanged;

              if (!isDataDifferent) {
                return prevUser;
              }

              const updatedUser: Donor & { adminPass?: string; password?: string } = {
                ...prevUser,
                ...fresh,
                password: storedPass,
                adminPass: storedPass,
                isAdmin: prevUser.isAdmin
              };

              localStorage.setItem("ghotki_donor_session", JSON.stringify(updatedUser));

              // Only update edit form fields if user is not actively editing their profile
              if (!isEditingProfile) {
                setEditName(fresh.name || "");
                setEditFatherName(fresh.fatherName || "");
                setEditAddress(fresh.address || "");
                setEditCity(fresh.city || "");
                setEditBloodGroup(fresh.bloodGroup || "");
                setEditSecondaryPhone(fresh.secondaryPhone || "");
                setEditLastDonation(fresh.lastDonationDate || "");
                setEditStatus(fresh.status || UserStatus.ACTIVE);
                setEditWillingToDonate(fresh.willingToDonate ?? true);
              }

              return updatedUser;
            });
          }
        } else {
          const res = await fetchDonorRecord(donorId);
          if (res.notFound) {
            localStorage.removeItem("ghotki_donor_session");
            setCurrentUser(null);
            setSavedAdminPassword("");
            setView("LOGIN");
            addToast("error", "Aapka account maujood nahi hai");
            return;
          }

          if (res.success && res.donor) {
            const fresh = res.donor;
            
            setCurrentUser((prevUser) => {
              if (!prevUser || prevUser.id !== donorId) return prevUser;

              const hasStatusChanged = (prevUser.status || "") !== (fresh.status || "");
              const hasWillingChanged = (prevUser.willingToDonate ?? true) !== (fresh.willingToDonate ?? true);
              const hasNameChanged = (prevUser.name || "") !== (fresh.name || "");
              const hasFatherChanged = (prevUser.fatherName || "") !== (fresh.fatherName || "");
              const hasAddressChanged = (prevUser.address || "") !== (fresh.address || "");
              const hasCityChanged = (prevUser.city || "") !== (fresh.city || "");
              const hasBloodChanged = (prevUser.bloodGroup || "") !== (fresh.bloodGroup || "");
              const hasSecPhoneChanged = (prevUser.secondaryPhone || "") !== (fresh.secondaryPhone || "");
              const hasLastDonationChanged = (prevUser.lastDonationDate || "") !== (fresh.lastDonationDate || "");

              const isDataDifferent =
                hasStatusChanged ||
                hasWillingChanged ||
                hasNameChanged ||
                hasFatherChanged ||
                hasAddressChanged ||
                hasCityChanged ||
                hasBloodChanged ||
                hasSecPhoneChanged ||
                hasLastDonationChanged;

              if (!isDataDifferent) {
                return prevUser;
              }

              const updatedUser: Donor & { adminPass?: string; password?: string } = {
                ...prevUser,
                ...fresh,
                password: storedPass,
                adminPass: storedPass,
                isAdmin: prevUser.isAdmin
              };

              localStorage.setItem("ghotki_donor_session", JSON.stringify(updatedUser));

              if (!isEditingProfile) {
                setEditName(fresh.name || "");
                setEditFatherName(fresh.fatherName || "");
                setEditAddress(fresh.address || "");
                setEditCity(fresh.city || "");
                setEditBloodGroup(fresh.bloodGroup || "");
                setEditSecondaryPhone(fresh.secondaryPhone || "");
                setEditLastDonation(fresh.lastDonationDate || "");
                setEditStatus(fresh.status || UserStatus.ACTIVE);
                setEditWillingToDonate(fresh.willingToDonate ?? true);
              }

              return updatedUser;
            });
          }
        }
      } catch {
        // Silent error handling for background fetch
      }
    };

    // Run once immediately on dashboard entry / active session
    refreshRecordSilently();

    // 30-second interval timer
    const intervalId = setInterval(refreshRecordSilently, 30000);

    // Visibility change handler - pauses when hidden, immediately runs once when visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshRecordSilently();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [view, currentUser?.id, savedAdminPassword, isEditingProfile, addToast]);

  // Silent background refresh for landing page:
  // Re-fetch public active donors from Firebase every 60 seconds while landing page is visible,
  // and re-fetch immediately whenever browser tab becomes visible again after being hidden.
  useEffect(() => {
    if (view !== "LANDING") {
      return;
    }

    let intervalId: NodeJS.Timeout | null = null;
    let isFetching = false;

    const performSilentRefresh = async () => {
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }
      if (isFetching) return;
      isFetching = true;

      try {
        const freshActiveDonors = await fetchPublicDonorsFromFirebase();
        if (freshActiveDonors && Array.isArray(freshActiveDonors)) {
          // Overwrite the cache with the fresh active list
          cacheLiveDonors(freshActiveDonors);

          // Maintain user's current search filters without disturbing them
          const currentBlood = appliedBloodRef.current;
          const currentCity = appliedCityRef.current;
          const nextList = (currentBlood || currentCity)
            ? filterDonorsList(freshActiveDonors, currentBlood, currentCity)
            : freshActiveDonors;

          // Only update state if the returned data actually differs from what is already shown
          setSearchResults((prev) => {
            if (areDonorListsEqual(prev, nextList)) {
              return prev;
            }
            return nextList;
          });
        }
      } catch {
        // Completely silent on background refresh errors
      } finally {
        isFetching = false;
      }
    };

    const startTimer = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(performSilentRefresh, 60000);
    };

    const stopTimer = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    // If visible on mount, start 60s interval
    if (typeof document !== "undefined" && !document.hidden) {
      startTimer();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Re-fetch immediately whenever browser tab becomes visible again after being hidden
        performSilentRefresh();
        // Restart 60s interval
        startTimer();
      } else {
        // Stop the interval when the tab is hidden
        stopTimer();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [view]);

  // Perform public search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      addToast("error", "Internet connection nahi hai");
      return;
    }

    appliedBloodRef.current = selectedBlood;
    appliedCityRef.current = selectedCity;

    setVisibleDonorCount(20);
    setIsSearching(true);
    setHasSearched(true);
    setSearchResults([]);

    try {
      const results = await searchDonors(selectedBlood, selectedCity);
      setSearchResults(results);
      if (results.length > 0) {
        addToast("success", results.length === 1 ? "1 Donor Mila" : `${results.length} Donors Mile`);
      } else {
        addToast("info", "Koi donor nahi mila");
      }
    } catch {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        addToast("error", "Internet connection nahi hai");
      } else {
        addToast("error", "Server se rabta nahi ho saka");
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Step 1 Validation & Advance
  const handleStep1Next = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const errors: Record<string, string> = {};
    
    if (!regName.trim()) {
      errors.name = "Full Name is required";
    }

    const cleanPhone = regPrimaryPhone.replace(/[^0-9]/g, "");
    if (!cleanPhone) {
      errors.primaryPhone = "WhatsApp / Primary Phone number is required";
    } else if (!/^03[0-9]{9}$/.test(cleanPhone)) {
      errors.primaryPhone = "Mobile number 03XXXXXXXXX format me zaroori hai (11 digits)";
    }

    if (Object.keys(errors).length > 0) {
      setRegFormErrors(errors);
      return;
    }

    setRegFormErrors({});
    goToStep(2, "forward");
  };

  // Step 2 Validation & Advance
  const handleStep2Next = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const errors: Record<string, string> = {};

    if (!regBlood) {
      errors.blood = "Blood Group select karein";
    }
    if (!regCity) {
      errors.city = "Taluka / City select karein";
    }

    if (Object.keys(errors).length > 0) {
      setRegFormErrors(errors);
      return;
    }

    setRegFormErrors({});
    goToStep(3, "forward");
  };

  // Step Go Back
  const handlePrevStep = () => {
    if (regStep === 2) {
      goToStep(1, "backward");
    } else if (regStep === 3) {
      goToStep(2, "backward");
    }
  };

  // Step 3 Validation & Final Registration Submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegFormErrors({});
    
    const errors: Record<string, string> = {};
    if (!regPassword || regPassword.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (regPassword !== regConfirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      setRegFormErrors(errors);
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      addToast("error", "Internet connection nahi hai");
      return;
    }

    setRegLoading(true);

    try {
      const cleanPhone = regPrimaryPhone.replace(/[^0-9]/g, "");
      const userEnteredPass = regPassword;

      // Proceed saving with PENDING status (Admin approval required)
      const submittedData = {
        name: regName.trim(),
        fatherName: regFatherName.trim() || "",
        address: regAddress.trim() || "",
        city: regCity,
        bloodGroup: regBlood,
        primaryPhone: cleanPhone,
        secondaryPhone: regSecondaryPhone.trim() || "",
        lastDonationDate: regLastDonation || "",
        status: UserStatus.PENDING,
        registeredAt: Date.now(),
        willingToDonate: true,
        password: userEnteredPass
      };

      // Helper to establish session and navigate to dashboard
      const establishSessionAndProceed = (donorObj: Donor) => {
        const sessionUser: any = { 
          ...donorObj,
          password: userEnteredPass,
          adminPass: userEnteredPass
        };

        localStorage.setItem("ghotki_donor_session", JSON.stringify(sessionUser));
        setCurrentUser(sessionUser);
        setSavedAdminPassword(userEnteredPass);

        // Pre-populate profile editor fields
        setEditName(sessionUser.name);
        setEditFatherName(sessionUser.fatherName || "");
        setEditAddress(sessionUser.address || "");
        setEditCity(sessionUser.city);
        setEditBloodGroup(sessionUser.bloodGroup);
        setEditSecondaryPhone(sessionUser.secondaryPhone || "");
        setEditLastDonation(sessionUser.lastDonationDate || "");
        setEditStatus(sessionUser.status || UserStatus.PENDING);
        setEditWillingToDonate(sessionUser.willingToDonate ?? true);
        setEditPassword("");
        setCurrentPassword("");

        // Clear login inputs
        setLoginPhone("");
        setLoginPassword("");
        setLoginError("");

        // Clear registration inputs
        setRegName("");
        setRegFatherName("");
        setRegAddress("");
        setRegPrimaryPhone("");
        setRegSecondaryPhone("");
        setRegLastDonation("");
        setRegPassword("");
        setRegConfirmPassword("");
        setRegStep(1);
        setIsOptionalExpanded(false);

        // Refresh counters and landing donors
        loadLandingData();

        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
        }

        // Take user straight to donor dashboard
        setView("DASHBOARD");
        addToast("success", "Registration mukammal — admin approval ka intezar karein");
      };

      let savedDonor: Donor | null = null;
      let registrationAbortedOrTimedOut = false;

      try {
        // Register the donor via secure Apps Script API (30-second timeout specifically for register)
        savedDonor = await registerDonor(submittedData);
      } catch (regErr: any) {
        const errName = String(regErr?.name || "");
        const rawMsg = String(regErr?.message || "");
        const isAbortOrTimeout = 
          Boolean(regErr?.isTimeout) ||
          errName === "AbortError" ||
          /abort|timeout|signal/i.test(rawMsg) ||
          /abort|timeout|signal/i.test(errName);

        if (isAbortOrTimeout) {
          registrationAbortedOrTimedOut = true;
        } else {
          // Re-throw non-timeout errors (e.g. "Phone number already registered") to outer catch
          throw regErr;
        }
      }

      // If registration request timed out or aborted:
      // Do NOT show a raw error. Instead attempt to log the user in with the phone number and password just entered.
      if (registrationAbortedOrTimedOut) {
        try {
          const authResult = await authenticateDonor(cleanPhone, userEnteredPass);
          if (authResult.success && authResult.donor) {
            // Account was created on server! Continue to dashboard as normal.
            establishSessionAndProceed(authResult.donor);
            return;
          }
        } catch (loginErr) {
          console.error("Login attempt after registration timeout failed:", loginErr);
        }

        // Only if that login also fails, show friendly message
        addToast("error", "Server der laga raha hai. Thori der baad login karke dekhein.");
        setLoginPhone(cleanPhone);
        setLoginPassword("");
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
        }
        setView("LOGIN");
        return;
      }

      if (!savedDonor || !savedDonor.id) {
        throw new Error("Registration could not be completed.");
      }

      // If registration completed normally, attempt automatic login
      let autoLoginSuccess = false;
      try {
        const authResult = await authenticateDonor(cleanPhone, userEnteredPass);
        if (authResult.success && authResult.donor) {
          establishSessionAndProceed(authResult.donor);
          autoLoginSuccess = true;
          return;
        }
      } catch (loginErr) {
        console.error("Auto-login error following registration:", loginErr);
        autoLoginSuccess = false;
      }

      // If automatic login fails for any reason, fall back to login screen
      if (!autoLoginSuccess) {
        // Clear registration inputs
        setRegName("");
        setRegFatherName("");
        setRegAddress("");
        setRegPrimaryPhone("");
        setRegSecondaryPhone("");
        setRegLastDonation("");
        setRegPassword("");
        setRegConfirmPassword("");
        setRegStep(1);
        setIsOptionalExpanded(false);

        loadLandingData();

        setLoginPhone(cleanPhone);
        setLoginPassword("");
        addToast("success", "Admin approval ka intezar karein");
        
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
        }

        // Redirect to login page with phone pre-filled
        setView("LOGIN");
      }
    } catch (err: any) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        addToast("error", "Internet connection nahi hai");
      } else {
        const rawMsg = err?.message || "Server se rabta nahi ho saka";
        const errorMsg = cleanErrorMessage(rawMsg);
        addToast("error", errorMsg);
        if (errorMsg.toLowerCase().includes("phone") || errorMsg.toLowerCase().includes("registered")) {
          setRegStep(1);
          setRegFormErrors({ primaryPhone: errorMsg });
        }
      }
    } finally {
      setRegLoading(false);
    }
  };

  // Login Verification
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const cleanPhone = loginPhone.replace(/[^0-9]/g, "");
    if (!cleanPhone) {
      setLoginError("Mobile number zaroori hai");
      return;
    }
    if (!loginPassword) {
      setLoginError("Password zaroori hai");
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      addToast("error", "Internet connection nahi hai");
      setLoginError("Internet connection nahi hai. Check karein.");
      return;
    }

    setLoginLoading(true);

    try {
      const authResult = await authenticateDonor(cleanPhone, loginPassword);

      if (authResult.success && authResult.donor) {
        const donorObj = authResult.donor;
        // Save session object with donor and admin credentials preserved for API calls
        const sessionUser: any = { 
          ...donorObj,
          password: loginPassword,
          adminPass: loginPassword
        };

        localStorage.setItem("ghotki_donor_session", JSON.stringify(sessionUser));
        setCurrentUser(sessionUser);
        setSavedAdminPassword(loginPassword);

        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
        }

        // Check if user is Admin
        if (donorObj.isAdmin) {
          addToast("success", "Khush Amdeed Admin");
          setView("ADMIN");
        } else {
          addToast("success", "Khush Amdeed");
          
          // Load default values into profile editor
          setEditName(sessionUser.name);
          setEditFatherName(sessionUser.fatherName || "");
          setEditAddress(sessionUser.address || "");
          setEditCity(sessionUser.city);
          setEditBloodGroup(sessionUser.bloodGroup);
          setEditSecondaryPhone(sessionUser.secondaryPhone || "");
          setEditLastDonation(sessionUser.lastDonationDate || "");
          setEditStatus(sessionUser.status || UserStatus.PENDING);
          setEditWillingToDonate(sessionUser.willingToDonate ?? true);
          setEditPassword("");
          setCurrentPassword("");

          // Switch to Dashboard Screen
          setView("DASHBOARD");
        }
        
        // Clear login form
        setLoginPhone("");
        setLoginPassword("");
      } else if (authResult.reason === "offline") {
        addToast("error", "Internet connection nahi hai");
        setLoginError("Internet connection nahi hai. Check karein.");
      } else if (authResult.reason === "network") {
        addToast("error", "Server se rabta nahi ho saka");
        setLoginError("Server se rabta nahi ho saka. Dobara koshish karein.");
      } else if (authResult.reason === "server_error") {
        addToast("error", "Server error");
        setLoginError("Server issue. Dobara koshish karein.");
      } else {
        addToast("error", "Login fail");
        setLoginError("Mobile number ya password ghalat hai. Check karein.");
      }
    } catch {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        addToast("error", "Internet connection nahi hai");
        setLoginError("Internet connection nahi hai. Check karein.");
      } else {
        addToast("error", "Server se rabta nahi ho saka");
        setLoginError("Server se rabta nahi ho saka. Dobara koshish karein.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // Donor logs out
  const handleLogout = useCallback(() => {
    localStorage.removeItem("ghotki_donor_session");
    setCurrentUser(null);
    setSavedAdminPassword("");
    setDonationRecords([]);
    setDonationsFetchedForUser(null);
    setShowAddDonationModal(false);
    setRecordToDelete(null);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    }
    addToast("info", "Logout ho gaya");
    setView("LANDING");
  }, [addToast]);

  // Stable callbacks for AdminPanel
  const handleDonorsUpdated = useCallback((updatedDonors: Donor[]) => {
    setInitialAdminDonors(updatedDonors);
    const activeDonors = updatedDonors.filter(
      (d) => String(d.status || "").trim().toUpperCase() === "ACTIVE" || d.status === UserStatus.ACTIVE
    );
    cacheLiveDonors(activeDonors);
    const currentBlood = appliedBloodRef.current;
    const currentCity = appliedCityRef.current;
    const nextList = (currentBlood || currentCity)
      ? filterDonorsList(activeDonors, currentBlood, currentCity)
      : activeDonors;
    setSearchResults((prev) => areDonorListsEqual(prev, nextList) ? prev : nextList);
  }, []);

  const handleAdminUnauthorized = useCallback(() => {
    handleLogout();
    addToast("error", "Session expire ho gaya. Dobara login karein.");
  }, [handleLogout, addToast]);

  // Toggle user's live ready status from dashboard trigger - automatically uses session password
  const handleToggleState = async (value: boolean) => {
    if (!currentUser?.id || isTogglingStatus) return;

    const storedPass = currentUser.password || currentUser.adminPass || savedAdminPassword;
    if (!storedPass) {
      handleSessionExpired();
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      addToast("error", "Internet connection nahi hai");
      return;
    }

    setIsTogglingStatus(true);

    try {
      const newStatus = value ? UserStatus.ACTIVE : UserStatus.INACTIVE;
      
      const profileData: any = {
        name: currentUser.name,
        fatherName: currentUser.fatherName || "",
        address: currentUser.address || "",
        city: currentUser.city,
        bloodGroup: currentUser.bloodGroup,
        primaryPhone: currentUser.primaryPhone,
        secondaryPhone: currentUser.secondaryPhone || "",
        lastDonationDate: currentUser.lastDonationDate || "",
        status: newStatus,
        willingToDonate: value
      };

      const result = await updateDonorProfile(
        currentUser.id,
        storedPass,
        profileData
      );

      if (result.success) {
        const updatedUser = { 
          ...currentUser, 
          status: newStatus,
          willingToDonate: value,
          password: storedPass,
          adminPass: storedPass
        };
        
        setCurrentUser(updatedUser);
        localStorage.setItem("ghotki_donor_session", JSON.stringify(updatedUser));
        
        setEditStatus(newStatus);
        setEditWillingToDonate(value);

        addToast(
          "success",
          value 
            ? "Status active ho gaya" 
            : "Status inactive ho gaya"
        );
        loadLandingData();
      } else if (result.authFailed) {
        handleSessionExpired();
      } else if (result.networkError) {
        addToast("error", "Server se rabta nahi ho saka");
      } else {
        addToast("error", result.message || "Status change nahi ho saka");
      }
    } catch {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        addToast("error", "Internet connection nahi hai");
      } else {
        addToast("error", "Server se rabta nahi ho saka");
      }
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Save changes to profile edits
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;

    if (!editName.trim()) {
      addToast("error", "Full Name zaroori hai");
      return;
    }

    const isChangingPassword = Boolean(editPassword.trim());
    let passwordToUse: string;

    if (isChangingPassword) {
      if (!currentPassword.trim()) {
        addToast("error", "Password change karne ke liye Current Password enter karein");
        return;
      }
      if (editPassword.trim().length < 6) {
        addToast("error", "Naya password kam az kam 6 characters ka hona chahiye");
        return;
      }
      passwordToUse = currentPassword.trim();
    } else {
      passwordToUse = currentUser.password || currentUser.adminPass || savedAdminPassword;
      if (!passwordToUse) {
        handleSessionExpired();
        return;
      }
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      addToast("error", "Internet connection nahi hai");
      return;
    }

    setEditProfileLoading(true);

    try {
      const profileData: any = {
        name: editName.trim(),
        fatherName: editFatherName.trim() || "",
        address: editAddress.trim() || "",
        city: editCity,
        bloodGroup: editBloodGroup,
        primaryPhone: currentUser.primaryPhone,
        secondaryPhone: editSecondaryPhone.trim() || "",
        lastDonationDate: editLastDonation || "",
        status: editStatus,
        willingToDonate: editWillingToDonate
      };

      const result = await updateDonorProfile(
        currentUser.id,
        passwordToUse,
        profileData,
        isChangingPassword ? editPassword.trim() : undefined
      );

      if (result.success) {
        const newStoredPass = isChangingPassword ? editPassword.trim() : passwordToUse;
        
        const updatedUserObj: any = {
          ...currentUser,
          name: editName.trim(),
          fatherName: editFatherName.trim() || undefined,
          address: editAddress.trim() || undefined,
          city: editCity,
          bloodGroup: editBloodGroup,
          secondaryPhone: editSecondaryPhone.trim() || undefined,
          lastDonationDate: editLastDonation || undefined,
          status: editStatus,
          willingToDonate: editWillingToDonate,
          password: newStoredPass,
          adminPass: currentUser.isAdmin ? newStoredPass : currentUser.adminPass
        };

        if (currentUser.isAdmin && isChangingPassword) {
          setSavedAdminPassword(newStoredPass);
        }

        localStorage.setItem("ghotki_donor_session", JSON.stringify(updatedUserObj));
        setCurrentUser(updatedUserObj);

        if (isChangingPassword) {
          addToast("success", "Password badal gaya");
        } else {
          addToast("success", "Profile update ho gaya");
        }

        setIsEditingProfile(false);
        setCurrentPassword("");
        setEditPassword("");
        loadLandingData();
      } else if (result.authFailed) {
        if (isChangingPassword) {
          addToast("error", result.message || "Current password ghalat hai");
        } else {
          handleSessionExpired();
        }
      } else if (result.networkError) {
        addToast("error", result.message || "Server se rabta nahi ho saka");
      } else {
        addToast("error", result.message || (isChangingPassword ? "Password change nahi ho saka" : "Profile update nahi ho saka"));
      }
    } catch {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        addToast("error", "Internet connection nahi hai");
      } else {
        addToast("error", "Server se rabta nahi ho saka");
      }
    } finally {
      setEditProfileLoading(false);
    }
  };

  // Calculated Days Ago helper for donations tracking
  const getDaysAgoText = (dateStr?: string) => {
    if (!dateStr) return "Sabiqa data available nahi hai (Naya Joiner)";
    
    const donationDate = new Date(dateStr);
    const today = new Date();
    
    // Normalize timeparts
    donationDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);

    const diffMs = today.getTime() - donationDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (isNaN(diffDays)) return "Invalid last donation date format";
    if (diffDays < 0) return "Future date setup";
    if (diffDays === 0) return "Aaj hi khoon dia hai (Thank you!) 🩸";
    if (diffDays === 1) return "Kal khoon dia tha (1 Din Pehle)";
    
    return `${diffDays} din pehle (${dateStr})`;
  };

  const getTodayDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDonationDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const cleanStr = String(dateStr).trim().split("T")[0];
      const parts = cleanStr.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        if (!isNaN(year) && monthIndex >= 0 && monthIndex < 12 && !isNaN(day)) {
          return `${day} ${months[monthIndex]} ${year}`;
        }
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric"
        });
      }
    } catch {}
    return String(dateStr);
  };

  // Load donation records once when Dashboard first opens for this donor
  useEffect(() => {
    if (view !== "DASHBOARD" || !currentUser?.id) {
      return;
    }

    const donorId = currentUser.id;
    const storedPass = currentUser.password || currentUser.adminPass || savedAdminPassword;

    if (donationsFetchedForUser === donorId || !storedPass) {
      return;
    }

    setDonationsFetchedForUser(donorId);
    setIsLoadingDonations(true);

    getDonationRecords(donorId, storedPass)
      .then((res) => {
        if (res.authFailed) {
          handleSessionExpired();
        } else if (res.success && Array.isArray(res.donations)) {
          setDonationRecords(res.donations);
        }
      })
      .catch(() => {
        // Keep existing records on network fail
      })
      .finally(() => {
        setIsLoadingDonations(false);
      });
  }, [view, currentUser?.id, savedAdminPassword, donationsFetchedForUser, handleSessionExpired]);

  // Add a new donation record handler
  const handleAddDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id || isAddingDonation) return;

    if (!newDonationDate) {
      addToast("error", "Tareekh zaroori hai");
      return;
    }

    const todayStr = getTodayDateString();
    if (newDonationDate > todayStr) {
      addToast("error", "Future date select nahi kar sakte");
      return;
    }

    const storedPass = currentUser.password || currentUser.adminPass || savedAdminPassword;
    if (!storedPass) {
      handleSessionExpired();
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      addToast("error", "Internet connection nahi hai");
      return;
    }

    setIsAddingDonation(true);

    try {
      const payload = {
        date: newDonationDate,
        place: newDonationPlace.trim() || undefined,
        forWhom: newDonationForWhom.trim() || undefined,
        notes: newDonationNotes.trim() || undefined
      };

      const res = await addDonationRecord(currentUser.id, storedPass, payload);

      if (res.success) {
        const newRecord: DonationRecord = {
          id: res.recordId || `don_${Date.now()}`,
          date: newDonationDate,
          place: newDonationPlace.trim() || undefined,
          forWhom: newDonationForWhom.trim() || undefined,
          notes: newDonationNotes.trim() || undefined,
          addedAt: Date.now()
        };

        setDonationRecords((prev) => [newRecord, ...prev]);

        if (res.lastDonationDate) {
          const updatedUser = {
            ...currentUser,
            lastDonationDate: res.lastDonationDate
          };
          setCurrentUser(updatedUser);
          localStorage.setItem("ghotki_donor_session", JSON.stringify(updatedUser));
          setEditLastDonation(res.lastDonationDate);
        }

        setShowAddDonationModal(false);
        setNewDonationDate(getTodayDateString());
        setNewDonationPlace("");
        setNewDonationForWhom("");
        setNewDonationNotes("");

        addToast("success", "Record add ho gaya");
      } else if (res.authFailed) {
        handleSessionExpired();
      } else {
        addToast("error", res.message || "Record add nahi ho saka");
      }
    } catch {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        addToast("error", "Internet connection nahi hai");
      } else {
        addToast("error", "Server se rabta nahi ho saka");
      }
    } finally {
      setIsAddingDonation(false);
    }
  };

  // Delete a donation record handler
  const handleDeleteDonationConfirm = async () => {
    if (!currentUser?.id || !recordToDelete || isDeletingDonation) return;

    const storedPass = currentUser.password || currentUser.adminPass || savedAdminPassword;
    if (!storedPass) {
      handleSessionExpired();
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      addToast("error", "Internet connection nahi hai");
      return;
    }

    setIsDeletingDonation(true);
    const targetId = recordToDelete.id;

    try {
      const res = await deleteDonationRecord(currentUser.id, storedPass, targetId);

      if (res.success) {
        setDonationRecords((prev) => prev.filter((r) => r.id !== targetId));

        if (typeof res.lastDonationDate === "string") {
          const updatedUser = {
            ...currentUser,
            lastDonationDate: res.lastDonationDate
          };
          setCurrentUser(updatedUser);
          localStorage.setItem("ghotki_donor_session", JSON.stringify(updatedUser));
          setEditLastDonation(res.lastDonationDate);
        }

        setRecordToDelete(null);
        addToast("success", "Record delete ho gaya");
      } else if (res.authFailed) {
        handleSessionExpired();
      } else {
        addToast("error", res.message || "Record delete nahi ho saka");
      }
    } catch {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        addToast("error", "Internet connection nahi hai");
      } else {
        addToast("error", "Server se rabta nahi ho saka");
      }
    } finally {
      setIsDeletingDonation(false);
    }
  };

  return (
    <div className="min-h-screen pink-red-gradient relative overflow-x-hidden flex flex-col font-sans">
      
      {/* First-load Cinematic VIP Splash Screen */}
      {showSplashScreen && <SplashScreen onFinish={handleSplashFinish} />}

      {/* Background Interactive Floating Crimson Cells (Only on Landing view to save mobile GPU) */}
      {view === "LANDING" && <FloatingParticles />}

      {/* Floating Emergency Panel Pulsing Anchor (Continuous Pulse & Glow) - hidden when any modal is open */}
      {!isAnyModalOpen && (
        <a
          href="https://wa.me/923352213351?text=Emergency! Mujhay Ghotki Blood Donors Network se emergency blood chahiye!"
          target="_blank"
          rel="referrer noopener noreferrer"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center justify-center gap-2 p-3.5 sm:px-5 sm:py-4 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full font-display font-bold text-xs sm:text-sm shadow-2xl transition-all duration-300 hover:scale-110 border border-white/20 btn-press"
          title="Emergency Admin WhatsApp Connection"
        >
          <MessageCircle className="w-6 h-6 sm:w-5 sm:h-5 fill-white" />
          <span className="hidden sm:inline shrink-0 text-[11px] sm:text-xs">EMERGENCY WHATSAPP</span>
          <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3">
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-white"></span>
          </span>
        </a>
      )}

      {/* Embedded High-contrast Toast System */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Navigation Header */}
      <header className="sticky top-0 z-30 transition-all duration-300 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Brand Logo with animations */}
          <div 
            onClick={() => { setView("LANDING"); setIsMobileMenuOpen(false); }} 
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group btn-press"
          >
            <DrippingBloodIcon size={30} className="sm:w-[38px] sm:h-[38px]" />
            <div className="flex flex-col min-w-0">
              <span className="font-display font-black text-xs xs:text-[14px] sm:text-[17px] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blood to-blood-dark flex items-center gap-1">
                GHOTKI BLOOD NETWORK
                <span className="text-yellow-600 font-sans text-[8px] sm:text-[10px] font-bold leading-none bg-yellow-50 px-1 py-0.5 rounded border border-yellow-200 shrink-0">SINDH</span>
              </span>
              <span className="text-[8px] sm:text-[10px] text-gray-500 font-mono tracking-wider uppercase truncate">Safe Blood • Save Lives</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setView("LANDING")}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all btn-press ${
                view === "LANDING"
                  ? "bg-blood/10 text-blood"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Donors
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setView(currentUser.isAdmin ? "ADMIN" : "DASHBOARD")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all btn-press ${
                    (view === "DASHBOARD" || view === "ADMIN")
                      ? "bg-blood text-white shadow-md border border-gold/40"
                      : "bg-white border border-gray-100 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{currentUser.isAdmin ? "Admin Panel" : "My Dashboard"}</span>
                </button>
                <button
                  onClick={handleLogout}
                  title="Logout Profile"
                  className="p-2 text-gray-400 hover:text-blood rounded-xl hover:bg-rose-50 transition-colors btn-press"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setView("LOGIN")}
                  className={`flex items-center gap-1 px-4 py-2 text-xs font-bold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all btn-press ${
                    view === "LOGIN" ? "bg-gray-100 text-blood font-extrabold border-blood/20" : "bg-white/80"
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5 shrink-0" />
                  <span>Login</span>
                </button>
                <button
                  onClick={() => setView("REGISTER")}
                  className={`flex items-center gap-1 px-4 py-2 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-blood to-blood-dark shadow-md hover:shadow-blood/20 transition-all btn-press ${
                    view === "REGISTER" ? "ring-2 ring-gold/50" : ""
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5 shrink-0" />
                  <span>Register</span>
                </button>
              </div>
            )}
          </nav>

          {/* Hamburger Icon for Mobile */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl text-gray-600 hover:text-blood hover:bg-rose-50/50 transition-colors focus:outline-none btn-press relative w-10 h-10 flex items-center justify-center cursor-pointer"
              aria-label="Toggle Menu"
            >
              <Menu
                className={`w-6 h-6 absolute hamburger-icon-menu ${
                  isMobileMenuOpen
                    ? "opacity-0 rotate-90 scale-75 pointer-events-none"
                    : "opacity-100 rotate-0 scale-100"
                }`}
              />
              <X
                className={`w-6 h-6 text-blood absolute hamburger-icon-x ${
                  isMobileMenuOpen
                    ? "opacity-100 rotate-0 scale-100"
                    : "opacity-0 -rotate-90 scale-75 pointer-events-none"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Panel */}
        {isMobileMenuMounted && (
          <div
            className={`md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3 shadow-inner mobile-menu-panel ${
              isMobileMenuVisible ? "mobile-menu-visible" : "mobile-menu-hidden"
            }`}
          >
            <button
              onClick={() => {
                setView("LANDING");
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 btn-press mobile-menu-item mobile-menu-item-0 ${
                view === "LANDING"
                  ? "bg-blood/10 text-blood"
                  : "text-gray-800 hover:bg-gray-50 bg-gray-50/50"
              }`}
            >
              <Users className="w-4 h-4 text-blood" />
              Donors List / Search
            </button>

            {currentUser ? (
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="px-4 py-1.5 text-[10px] font-mono uppercase text-gray-400 tracking-wider mobile-menu-item mobile-menu-item-1">
                  Logged in as: <strong className="text-gray-800">{currentUser.name}</strong>
                </div>
                <button
                  onClick={() => {
                    setView(currentUser.isAdmin ? "ADMIN" : "DASHBOARD");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 btn-press mobile-menu-item mobile-menu-item-2 ${
                    (view === "DASHBOARD" || view === "ADMIN")
                      ? "bg-blood text-white"
                      : "bg-white border border-gray-100 text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>{currentUser.isAdmin ? "Admin Panel" : "My Dashboard"}</span>
                </button>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold text-blood bg-rose-50 hover:bg-rose-100/70 transition-colors flex items-center gap-2 btn-press mobile-menu-item mobile-menu-item-3"
                >
                  <LogOut className="w-4 h-4" />
                  Logout Profile
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => {
                    setView("LOGIN");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-3 text-xs font-extrabold rounded-xl border border-gray-200 text-gray-800 hover:bg-gray-50 transition-all btn-press mobile-menu-item mobile-menu-item-1 ${
                    view === "LOGIN" ? "bg-gray-100 text-blood font-black border-blood/20" : "bg-white"
                  }`}
                >
                  <LogIn className="w-4 h-4 text-blood shrink-0" />
                  <span>Login</span>
                </button>
                <button
                  onClick={() => {
                    setView("REGISTER");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-3 text-xs font-extrabold rounded-xl text-white bg-gradient-to-r from-blood to-blood-dark shadow-sm hover:shadow-blood/20 transition-all btn-press mobile-menu-item mobile-menu-item-2 ${
                    view === "REGISTER" ? "ring-2 ring-gold/50" : ""
                  }`}
                >
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span>Register</span>
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10 relative">
        
        {/* ==================== 1. LANDING PAGE ==================== */}
        {view === "LANDING" && (
          <div key="LANDING" className="space-y-12 view-transition-enter">
            
            {/* Tagline / Banner Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-rose-50 border border-rose-100 text-blood max-w-full hero-fade-up hero-delay-0">
                  <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-blood shrink-0" />
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap">District Ghotki Lifesaving Connection</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-gray-900 leading-[1.1]">
                  <span className="block hero-fade-up hero-delay-1">
                    Ghotki Blood
                  </span>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blood via-red-500 to-blood-dark font-black hero-fade-up hero-delay-2">
                    Donors Network
                  </span>
                </h1>

                {/* Isolated typewriter component containing Roman Urdu reminders */}
                <div className="hero-fade-up hero-delay-3">
                  <HeroTypewriter isActive={view === "LANDING"} />
                </div>

                <p className="text-sm text-black font-bold max-w-xl leading-relaxed hero-fade-up hero-delay-4">
                  Ghotki, Mirpur Mathelo, Daharki, Ubauro aur un ke girdonawah ke hospitals, highway accidents aur delivery cases me kisi bhi bemar ya zakhmi insaan ke liye fori khoon ka atia dhoondein. Khoon dain, zindagi bachaen.
                </p>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2 hero-fade-up hero-delay-5">
                  <button
                    onClick={() => setView("REGISTER")}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blood to-blood-dark text-white rounded-xl font-display font-extrabold text-sm shadow-lg hover:shadow-blood/20 transition-all btn-press"
                  >
                    <span>Register as Donor</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <a 
                    href="#search-anchor"
                    className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl font-display font-bold text-sm transition-all btn-press"
                  >
                    Search Blood Groups
                  </a>
                </div>
              </div>

              {/* Counts Bento Box and Dripping Illustration */}
              <div className="lg:col-span-1" />
              <div className="lg:col-span-4 flex flex-col gap-6">
                
                {/* Total registered counter box (Golden / Deep Crimson style) */}
                <div className="glass-panel rounded-3xl p-8 border border-white/50 shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 hero-fade-up hero-delay-6">
                  <div className="absolute top-0 right-0 -tr-y-6 translate-x-6 w-32 h-32 rounded-full bg-blood/5 shrink-0 pointer-events-none" />
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blood/10 rounded-2xl text-blood">
                      <Users className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold text-yellow-600 bg-yellow-100/65 px-2.5 py-0.5 rounded-full border border-yellow-200 uppercase tracking-wider whitespace-nowrap">
                      Verified Database
                    </span>
                  </div>

                  <h3 className="text-gray-500 font-mono text-xs uppercase tracking-widest font-medium">ACTIVE DONORS</h3>
                  <div className="mt-2 text-4xl sm:text-5xl text-blood flex items-baseline gap-1.5 min-h-[48px] hero-count-fade">
                    {isMetricsLoading && searchResults.length === 0 ? (
                      <div className="h-10 w-24 bg-rose-200/50 rounded-xl my-1" />
                    ) : (
                      <>
                        <Counter value={searchResults.length} />
                        <span className="text-gray-400 font-sans text-lg font-bold">+</span>
                      </>
                    )}
                  </div>
                  <p className="mt-3 text-[11px] text-gray-400 font-sans leading-relaxed">
                    Ready to donate donors available right now.
                  </p>
                </div>

                {/* Sub-card: Safe Network Promise */}
                <div className="bg-white/90 border border-gray-100 rounded-2xl p-5 flex items-start gap-4 shadow-sm hero-fade-up hero-delay-7">
                  <div className="p-2.5 bg-green-50 rounded-xl border border-green-100 text-green-600 shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-gray-800">No Broker Network</h4>
                    <p className="text-xs text-gray-500 leading-relaxed mt-1">
                      Direct connection between family of patience & blood donor via WhatsApp/Call. Zero commission, strictly humanitarian effort.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Core SEARCH SECTION Box */}
            <div id="search-anchor" className="scroll-mt-24 relative z-20">
              <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/60 shadow-xl relative overflow-visible z-20">
                <div className="absolute top-0 left-0 h-1.5 bg-gradient-to-r from-blood to-gold w-full rounded-t-3xl" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-display font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                      <ListFilter className="w-6 h-6 text-blood" />
                      Active Donors Khojein
                    </h2>
                    <p className="text-xs text-black font-bold mt-1">
                      Ready to Donate members available right now in Ghotki District Talukas.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  {/* Blood group dropdown container */}
                  <div className="sm:col-span-5">
                    <CustomSelect
                      label="Select Blood Group"
                      value={selectedBlood}
                      onChange={(val) => setSelectedBlood(val)}
                      options={[
                        { value: "", label: "A+, B+, O+, AB+ (Sare Groups)" },
                        ...BLOOD_GROUPS.map((g) => ({ value: g, label: `Group: ${g}` }))
                      ]}
                    />
                  </div>

                  {/* City dropdown container */}
                  <div className="sm:col-span-5">
                    <CustomSelect
                      label="Select Taluka / City"
                      value={selectedCity}
                      onChange={(val) => setSelectedCity(val)}
                      options={[
                        { value: "", label: "District Ghotki (All Locations)" },
                        ...GHOTKI_CITIES.map((c) => ({ value: c, label: c }))
                      ]}
                    />
                  </div>

                  {/* Search triggering action */}
                  <div className="sm:col-span-2 flex flex-col justify-end">
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="w-full py-3 bg-gradient-to-r from-blood to-blood-dark hover:from-blood-dark hover:to-blood text-white rounded-xl font-display font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 btn-press"
                    >
                      <Search className="w-4 h-4" />
                      <span>{isSearching ? "Searching..." : "Search"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Results Grid Container */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200/50 pb-4">
                <h3 className="font-display font-extrabold text-lg sm:text-xl text-gray-900">
                  Search Results
                </h3>
                <span className="text-xs bg-rose-50 border border-rose-100 text-blood font-black px-2.5 py-1 rounded-lg self-start sm:self-auto shrink-0 shadow-sm">
                  Showing {searchResults.length} {searchResults.length === 1 ? "donor" : "donors"}
                </span>
              </div>

              {isSearching ? (
                <SkeletonGrid count={3} />
              ) : searchResults.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {visibleDonors.map((donor, index) => (
                      <DonorCard
                        key={donor.id || `donor_${donor.primaryPhone || index}`}
                        donor={donor}
                        index={index}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                  </div>

                  {hasMoreDonors && (
                    <div ref={donorSentinelRef} className="w-full flex items-center justify-center py-3">
                      {isLoadingMoreDonors && (
                        <p className="text-xs font-semibold text-gray-400">Load ho raha hai</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center p-12 bg-white/90 rounded-3xl border border-gray-200/50">
                  <Heart className="w-12 h-12 text-rose-300 mx-auto stroke-1 mb-3" />
                  <h4 className="font-display font-extrabold text-base sm:text-lg text-gray-800 whitespace-nowrap">
                    Koi Donor Nahi Mila
                  </h4>
                  <p className="text-xs text-gray-400 max-w-md mx-auto mt-1 leading-relaxed">
                    {hasSearched 
                      ? "Aap ki selected criteria par Ghotki me koi active donor register nahi mila. Search filters tabdeel karein ya admin se WhatsApp helpline par rabta karein." 
                      : "Ghotki blood donor network ka data reload karein ya search filter utilize karein."}
                  </p>
                  <button 
                    onClick={() => {
                      setSelectedBlood("");
                      setSelectedCity("");
                      appliedBloodRef.current = "";
                      appliedCityRef.current = "";
                      setHasSearched(false);
                      setVisibleDonorCount(20);
                      loadLandingData();
                    }}
                    className="mt-4 px-4 py-2 bg-rose-50 text-blood font-display font-bold text-xs rounded-xl hover:bg-rose-100 border border-rose-200 btn-press"
                  >
                    Reset & Show All Active Donors
                  </button>
                </div>
              )}
            </div>

            {/* General Information Grid Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
              <div className="bg-white/80 p-6 rounded-2xl border border-gray-100 shadow-sm">
                <span className="text-2xl">🚨</span>
                <h4 className="font-display font-black text-sm text-gray-900 mt-2">Hospitals Emergency Support</h4>
                <p className="text-xs text-black font-bold mt-1 leading-relaxed">
                  District Ghotki ke tamam hospitals me accidents ya emergency operations ke waqt fori help ka platform.
                </p>
              </div>

              <div className="bg-white/80 p-6 rounded-2xl border border-gray-100 shadow-sm">
                <span className="text-2xl">🤰</span>
                <h4 className="font-display font-black text-sm text-gray-900 mt-2">Delivery & Maternity Cases</h4>
                <p className="text-xs text-black font-bold mt-1 leading-relaxed">
                  Ghotki district me delivery cases ke waqt blood na hone ki waja se maao'n ki keemti zindagi khatre me hoti hai, is platform se fori response milega.
                </p>
              </div>

              <div className="bg-white/80 p-6 rounded-2xl border border-gray-100 shadow-sm">
                <span className="text-2xl">🌱</span>
                <h4 className="font-display font-black text-sm text-gray-900 mt-2 font-semibold">100% Free & Sadqa-e-Jariyah</h4>
                <p className="text-xs text-black font-bold mt-1 leading-relaxed">
                  Ubauro aur Khan Pur Mahar samet poore district Ghotki ke jawan is me hissa dain. Khoon daalna insaniyat ki sachi khidmat hai.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* ==================== 2. REGISTRATION PAGE ==================== */}
        {view === "REGISTER" && (
          <div key="REGISTER" className="max-w-2xl mx-auto view-transition-enter">
            <div 
              ref={regCardRef}
              className="glass-panel p-6 sm:p-9 rounded-3xl border border-white/60 shadow-xl relative overflow-visible scroll-mt-24"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blood to-blood-dark rounded-t-3xl" />
              
              <div className="text-center space-y-2 mb-6">
                <DrippingBloodIcon size={40} />
                <h2 className="text-xl sm:text-3xl font-display font-extrabold text-gray-900 tracking-tight whitespace-nowrap">
                  Register as Blood Donor
                </h2>
              </div>

              {/* Progress Indicator: Clean Row of Circles with Connecting Animating Bars + Centred Current Step Label */}
              <div className="mb-6 select-none" id="reg-progress-tracker">
                <div className="max-w-xs sm:max-w-sm mx-auto flex items-center justify-between px-4 sm:px-8 mb-3">
                  {REG_STEPS.map((step, idx) => {
                    const isCompleted = regStep > step.id;
                    const isCurrent = regStep === step.id;

                    return (
                      <React.Fragment key={step.id}>
                        {/* Numbered Step Circle */}
                        <div
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-black shrink-0 transition-all duration-300 ${
                            isCompleted
                              ? "bg-blood text-white shadow-xs"
                              : isCurrent
                              ? "bg-blood text-white ring-4 ring-blood/20 shadow-sm step-circle-active"
                              : "bg-gray-100 text-gray-400 border border-gray-200"
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-4 h-4 stroke-[3] check-mark-animate" />
                          ) : (
                            <span>{step.id}</span>
                          )}
                        </div>

                        {/* Connecting Progress Bar (fills blood-red as step completes, animating over 300ms) */}
                        {idx < REG_STEPS.length - 1 && (
                          <div className="flex-1 mx-2 sm:mx-3 h-1 bg-gray-200 rounded-full overflow-hidden relative">
                            <div
                              className={`h-full bg-gradient-to-r from-blood to-blood-dark rounded-full transition-all duration-300 ease-out ${
                                regStep > step.id ? "w-full" : "w-0"
                              }`}
                            />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Single Centred Line: Current Step Label in Bold Dark Text + Qadam X / 3 in Muted Style */}
                <div className="text-center flex items-center justify-center gap-2">
                  <span className="text-xs sm:text-sm font-extrabold text-gray-900 tracking-tight">
                    {REG_STEPS.find((s) => s.id === regStep)?.title}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-[11px] sm:text-xs font-semibold text-gray-400">
                    Qadam {regStep} / 3
                  </span>
                </div>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (regStep === 1) {
                    handleStep1Next();
                  } else if (regStep === 2) {
                    handleStep2Next();
                  } else if (regStep === 3) {
                    handleRegister(e);
                  }
                }} 
                className="space-y-6"
              >
                <div
                  key={`reg-step-${regStep}`}
                  className={`${
                    isStepExiting
                      ? slideDirection === "forward"
                        ? "step-slide-out-left"
                        : "step-slide-out-right"
                      : slideDirection === "forward"
                      ? "step-slide-in-right"
                      : "step-slide-in-left"
                  }`}
                >
                  {/* STEP 1: Aap ki maloomat */}
                  {regStep === 1 && (
                    <div className="space-y-4">
                      <div className="space-y-1 mb-3">
                        <h3 className="text-base sm:text-lg font-display font-extrabold text-gray-900 leading-snug">
                          Aap ki maloomat
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">
                          Apna poora naam aur WhatsApp rabta number darj karein taake emergency me direct contact ho sake.
                        </p>
                      </div>

                      <FloatingLabelInput
                        label="Full Name"
                        id="regName"
                        value={regName}
                        onChange={(e) => {
                          setRegName(e.target.value);
                          if (regFormErrors.name) setRegFormErrors((prev) => ({ ...prev, name: "" }));
                        }}
                        error={regFormErrors.name}
                      />

                      <FloatingLabelInput
                        label="WhatsApp / Primary Phone Number"
                        id="regPrimaryPhone"
                        type="tel"
                        value={regPrimaryPhone}
                        onChange={(e) => {
                          setRegPrimaryPhone(e.target.value);
                          if (regFormErrors.primaryPhone) setRegFormErrors((prev) => ({ ...prev, primaryPhone: "" }));
                        }}
                        error={regFormErrors.primaryPhone}
                        title="Required for login and direct Emergency WhatsApp chat"
                      />

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => handleStep1Next()}
                          className="w-full py-3.5 bg-gradient-to-r from-blood to-blood-dark text-white rounded-xl font-display font-extrabold text-sm shadow-lg hover:shadow-blood/20 transition-all btn-press flex items-center justify-center gap-2 group"
                        >
                          <span>Aage</span>
                          <ArrowRight className="w-4 h-4 btn-arrow-slide" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Blood aur ilaqa */}
                  {regStep === 2 && (
                    <div className="space-y-4">
                      <div className="space-y-1 mb-3">
                        <h3 className="text-base sm:text-lg font-display font-extrabold text-gray-900 leading-snug">
                          Blood aur ilaqa
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">
                          Apna sahi blood group aur Ghotki district ka taluka muntakhab karein.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <CustomSelect
                            label="Blood Group"
                            value={regBlood}
                            onChange={(val) => {
                              setRegBlood(val);
                              if (regFormErrors.blood) setRegFormErrors((prev) => ({ ...prev, blood: "" }));
                            }}
                            options={BLOOD_GROUPS.map((g) => ({ value: g, label: `Group: ${g}` }))}
                          />
                          {regFormErrors.blood && (
                            <p className="mt-1.5 text-xs text-blood font-semibold tracking-wide pl-2 font-sans">
                              {regFormErrors.blood}
                            </p>
                          )}
                        </div>

                        <div>
                          <CustomSelect
                            label="Taluka / City"
                            value={regCity}
                            onChange={(val) => {
                              setRegCity(val);
                              if (regFormErrors.city) setRegFormErrors((prev) => ({ ...prev, city: "" }));
                            }}
                            options={GHOTKI_CITIES}
                          />
                          {regFormErrors.city && (
                            <p className="mt-1.5 text-xs text-blood font-semibold tracking-wide pl-2 font-sans">
                              {regFormErrors.city}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Collapsed Optional Fields Section */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setIsOptionalExpanded((prev) => !prev)}
                          aria-expanded={isOptionalExpanded}
                          className="w-full flex items-center justify-between p-3.5 rounded-xl border border-gray-200 hover:border-blood/40 bg-gray-50/70 hover:bg-gray-50 text-gray-700 transition-colors btn-press text-left"
                        >
                          <span className="text-xs sm:text-sm font-bold text-gray-700 flex items-center gap-2">
                            <PlusCircle className="w-4 h-4 text-blood shrink-0" />
                            Aur maloomat daalein (Optional)
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-gray-500 transition-transform duration-300 shrink-0 ${
                              isOptionalExpanded ? "rotate-180 text-blood" : "rotate-0"
                            }`}
                          />
                        </button>

                        {isOptionalExpanded && (
                          <div className="mt-4 pt-3 border-t border-gray-100 space-y-4 animate-optional-expand">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <FloatingLabelInput
                                label="Father Name (Optional)"
                                id="regFatherName"
                                value={regFatherName}
                                onChange={(e) => setRegFatherName(e.target.value)}
                              />

                              <FloatingLabelInput
                                label="Secondary Phone (Optional)"
                                id="regSecondaryPhone"
                                type="tel"
                                value={regSecondaryPhone}
                                onChange={(e) => setRegSecondaryPhone(e.target.value)}
                              />
                            </div>

                            <FloatingLabelInput
                              label="Address (Optional)"
                              id="regAddress"
                              value={regAddress}
                              onChange={(e) => setRegAddress(e.target.value)}
                            />

                            <div>
                              <label
                                htmlFor="regLastDonation"
                                className="block text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 pl-2 whitespace-nowrap"
                              >
                                Aakhri Khoon kab dia? (Optional)
                              </label>
                              <input
                                type="date"
                                id="regLastDonation"
                                max={new Date().toISOString().split("T")[0]}
                                value={regLastDonation}
                                onChange={(e) => setRegLastDonation(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 caret-blood focus:outline-none focus:ring-2 focus:ring-blood/40 text-sm font-semibold cursor-pointer"
                              />
                              <p className="text-[10px] text-gray-400 mt-1 pl-2">
                                Agar pehle kabhi blood nahi dia toh isey khali chor dain.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Navigation: Side by Side Peeche and Aage */}
                      <div className="flex items-center gap-3 pt-3">
                        <button
                          type="button"
                          onClick={handlePrevStep}
                          className="flex-1 py-3.5 border-2 border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-display font-extrabold text-sm transition-all btn-press flex items-center justify-center gap-1.5"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Peeche</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStep2Next()}
                          className="flex-1 py-3.5 bg-gradient-to-r from-blood to-blood-dark text-white rounded-xl font-display font-extrabold text-sm shadow-lg hover:shadow-blood/20 transition-all btn-press flex items-center justify-center gap-1.5 group"
                        >
                          <span>Aage</span>
                          <ArrowRight className="w-4 h-4 btn-arrow-slide" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Account banayein */}
                  {regStep === 3 && (
                    <div className="space-y-4">
                      <div className="space-y-1 mb-3">
                        <h3 className="text-base sm:text-lg font-display font-extrabold text-gray-900 leading-snug">
                          Account banayein
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">
                          Login aur profile security ke liye kam az kam 6 characters ka password rakhein.
                        </p>
                      </div>

                      <FloatingLabelInput
                        label="Login Password (Min 6 chars)"
                        id="regPassword"
                        type="password"
                        value={regPassword}
                        onChange={(e) => {
                          setRegPassword(e.target.value);
                          if (regFormErrors.password) setRegFormErrors((prev) => ({ ...prev, password: "" }));
                        }}
                        error={regFormErrors.password}
                      />

                      <FloatingLabelInput
                        label="Confirm Password"
                        id="regConfirmPassword"
                        type="password"
                        value={regConfirmPassword}
                        onChange={(e) => {
                          setRegConfirmPassword(e.target.value);
                          if (regFormErrors.confirmPassword) setRegFormErrors((prev) => ({ ...prev, confirmPassword: "" }));
                        }}
                        error={regFormErrors.confirmPassword}
                      />

                      {/* Compact Read-Only Summary of Steps 1 & 2 (Tap jumps back to edit) */}
                      <div 
                        onClick={() => goToStep(1, "backward")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            goToStep(1, "backward");
                          }
                        }}
                        className="p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/70 hover:bg-gray-100/70 transition-colors cursor-pointer group btn-press"
                        title="Tafseelat tabdeel karne ke liye tap karein"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span className="text-xs font-bold text-gray-700 tracking-tight whitespace-nowrap truncate">
                            Aap ki maloomat
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              goToStep(1, "backward");
                            }}
                            className="w-9 h-9 -my-1.5 -mr-1.5 rounded-lg flex items-center justify-center text-blood hover:bg-rose-50/80 transition-colors btn-press shrink-0 focus:outline-none focus:ring-2 focus:ring-blood/20"
                            title="Tafseelat tabdeel karein"
                            aria-label="Tafseelat tabdeel karein"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                          <div className="min-w-0 overflow-hidden">
                            <span className="text-gray-400 block text-[10px] truncate">Naam</span>
                            <span className="font-bold text-gray-800 truncate block" title={regName || "—"}>{regName || "—"}</span>
                          </div>
                          <div className="min-w-0 overflow-hidden">
                            <span className="text-gray-400 block text-[10px] truncate">Phone / WhatsApp</span>
                            <span className="font-bold text-gray-800 truncate block font-mono" title={regPrimaryPhone || "—"}>{regPrimaryPhone || "—"}</span>
                          </div>
                          <div className="min-w-0 overflow-hidden">
                            <span className="text-gray-400 block text-[10px] truncate">Blood Group</span>
                            <span className="font-bold text-blood truncate block" title={regBlood || "—"}>{regBlood || "—"}</span>
                          </div>
                          <div className="min-w-0 overflow-hidden">
                            <span className="text-gray-400 block text-[10px] truncate">Taluka / City</span>
                            <span className="font-bold text-gray-800 truncate block" title={regCity || "—"}>{regCity || "—"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Navigation: Side by Side Peeche and Register Karein */}
                      <div className="flex items-center gap-3 pt-3">
                        <button
                          type="button"
                          onClick={handlePrevStep}
                          disabled={regLoading}
                          className="flex-1 h-12 px-3 sm:px-4 border-2 border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-display font-extrabold text-sm transition-all btn-press flex items-center justify-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
                        >
                          <ArrowLeft className="w-4 h-4 shrink-0" />
                          <span>Peeche</span>
                        </button>
                        <button
                          type="submit"
                          disabled={regLoading}
                          className={`flex-1 h-12 px-3 sm:px-4 relative overflow-hidden bg-gradient-to-r from-blood to-blood-dark text-white rounded-xl font-display font-extrabold text-sm shadow-lg hover:shadow-blood/20 transition-all disabled:opacity-50 btn-press flex items-center justify-center whitespace-nowrap ${
                            regLoading ? "btn-loading" : ""
                          }`}
                        >
                          {regLoading ? (
                            <>
                              <span className="liquid"></span>
                              <span className="btn-label whitespace-nowrap">Register...</span>
                            </>
                          ) : (
                            <span className="whitespace-nowrap">REGISTER KAREIN</span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Always-visible Login redirect */}
                <p className="text-center text-xs text-gray-500 pt-3">
                  Pehle se account hai?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setView("LOGIN");
                      setRegStep(1);
                    }}
                    className="text-blood font-bold hover:underline btn-press"
                  >
                    Log In karein.
                  </button>
                </p>
              </form>
            </div>
          </div>
        )}

        {/* ==================== 3. LOGIN PAGE ==================== */}
        {view === "LOGIN" && (
          <div key="LOGIN" className="max-w-md mx-auto pt-6 view-transition-enter">
            <div className="glass-panel p-6 sm:p-9 rounded-3xl border border-white/60 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blood to-blood-dark" />
              
              <div className="text-center space-y-2 mb-8">
                <DrippingBloodIcon size={42} />
                <h2 className="text-xl sm:text-2xl font-display font-extrabold text-gray-900 tracking-tight whitespace-nowrap">
                  Welcome Back • Login
                </h2>
                <p className="text-xs text-gray-500 max-w-[280px] sm:max-w-xs mx-auto text-balance">
                  Apne registered primary mobile number se dashboard access karein.
                </p>
              </div>

              {showResetNotice ? (
                <div className="p-4 sm:p-5 mb-6 rounded-2xl bg-gradient-to-br from-rose-50 to-red-50/50 border border-rose-100 text-gray-800 text-xs flex flex-col gap-3.5 animate-scale-up shadow-sm">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-blood shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-display font-extrabold text-sm text-gray-900 leading-tight">
                        Password Reset & Recovery
                      </h4>
                      <p className="text-gray-700 mt-1.5 leading-relaxed font-medium">
                        Password bhool gaye? Admin se WhatsApp par rabta karein.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 pt-1">
                    <a
                      href={`https://wa.me/923352213351?text=${encodeURIComponent(
                        `Assalam-o-Alaikum Admin,\nMain apna password bhool gaya hun.\nMera Registered Mobile: ${loginPhone.trim() || ""}\n\nPlease mera password recover kar de ya new password bana de. Shukriya!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:flex-1 py-2.5 sm:py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-xs transition-all text-center flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/10 whitespace-nowrap btn-press"
                    >
                      <MessageCircle className="w-4 h-4 fill-white shrink-0" />
                      <span>WhatsApp Admin</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowResetNotice(false)}
                      className="w-full sm:flex-1 py-2.5 sm:py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs transition-colors text-center btn-press"
                    >
                      Wapas Jayein
                    </button>
                  </div>
                </div>
              ) : null}

              {loginError && (
                <div className="p-4 mb-5 rounded-xl bg-rose-50 border border-rose-100 text-blood font-semibold text-xs flex items-start gap-2 animate-shake">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <p>{loginError}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-6">
                <FloatingLabelInput
                  label="Register Whatsapp/Mobile"
                  id="loginPhone"
                  type="tel"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                />

                <FloatingLabelInput
                  label="Password"
                  id="loginPassword"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    if (loginError) setLoginError("");
                  }}
                />

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className={`w-full py-3.5 bg-gradient-to-r from-blood to-blood-dark text-white rounded-xl font-display font-extrabold text-sm shadow-md transition-all disabled:opacity-50 btn-press ${
                      loginLoading ? "btn-loading" : ""
                    }`}
                  >
                    {loginLoading ? (
                      <>
                        <span className="liquid"></span>
                        <span className="btn-label">Login ho raha hai</span>
                      </>
                    ) : (
                      "LOG IN NOW"
                    )}
                  </button>
                </div>

                <div className="text-center flex flex-col items-center justify-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowResetNotice(true)}
                    className="text-xs text-blood hover:text-blood-dark font-black hover:underline transition-all flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer btn-press"
                  >
                    🔑 Password Bhool Gaye? Contact Admin
                  </button>

                  <p className="text-xs text-gray-500">
                    Account nahi bana hua?{" "}
                    <button
                      type="button"
                      onClick={() => setView("REGISTER")}
                      className="text-blood font-bold hover:underline btn-press"
                    >
                      REGISTER NOW
                    </button>
                  </p>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================== 4. DONOR DASHBOARD ==================== */}
        {view === "DASHBOARD" && currentUser && (
          <div key="DASHBOARD" className="space-y-8 view-transition-enter">
            
            {/* Status Notification Banners */}
            {(currentUser.status || "").toLowerCase() === "pending" ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 sm:p-5 rounded-2xl flex items-start gap-3 shadow-xs">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm sm:text-base text-amber-950">Approval ka intezar</h4>
                  <p className="text-xs sm:text-sm text-amber-800 leading-relaxed mt-1 font-medium">
                    Aap ka account ban gaya hai. Admin ke approve karne ke baad aap Active donors ki list mein nazar aayenge.
                  </p>
                  <div className="mt-3">
                    <a
                      href={`https://wa.me/923352213351?text=${encodeURIComponent(
                        `Assalam-o-Alaikum Admin,\nMera account Ghotki Blood Donors Network par pending approval hai.\nNaam: ${currentUser.name || ""}\nMobile: ${currentUser.primaryPhone || ""}\nBlood Group: ${currentUser.bloodGroup || ""}\nCity: ${currentUser.city || ""}\n\nBaraye meharbani mera account review / approve kar dein. Shukriya!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-xs transition-all shadow-xs btn-press"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-white shrink-0" />
                      <span>Admin se rabta karein</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : (currentUser.status || "").toLowerCase() === "rejected" ? (
              <div className="bg-rose-50 border border-rose-200 text-rose-900 p-4 sm:p-5 rounded-2xl flex items-start gap-3 shadow-xs">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Aapka account approve nahi hua</h4>
                  <p className="text-xs text-rose-800 leading-relaxed mt-0.5 font-medium">
                    Admin se rabta karein taakay aapki application review ki ja sake.
                  </p>
                </div>
              </div>
            ) : (currentUser.status || "").toLowerCase() === "active" ? (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-900 p-4 rounded-2xl flex items-start gap-3 shadow-xs">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Dashboard is Active!</h4>
                  <p className="text-xs text-emerald-700 leading-relaxed mt-0.5 font-semibold">
                    Aap ab Ghotki Network me live hain. Agar kisi majburi ke tehat aap dastyab na hon, toh niche dia gaya "Ready to Donate" toggle band kar dein. Shukriya.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-100 border border-gray-200 text-gray-800 p-4 rounded-2xl flex items-start gap-3 shadow-xs">
                <AlertTriangle className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Aap is waqt Inactive hain</h4>
                  <p className="text-xs text-gray-600 leading-relaxed mt-0.5 font-semibold">
                    Patients aapko contact nahi kar sakte. Dobara available hone ke liye "Ready to Donate" toggle ON karein.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Profile Card & Readiness Panel (Bento columns) */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                
                {/* Profile panel with glassmorphism */}
                <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/60 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 -tr-y-4 translate-x-4 bg-blood/5 w-40 h-40 rounded-full pointer-events-none" />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-5 uppercase tracking-wide">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      {/* Generous blood badge indicating currently logged group */}
                      <span className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-blood to-blood-dark text-white font-display font-extrabold text-xl sm:text-2xl shadow-lg border border-gold/30 ring-4 ring-rose-100">
                        {currentUser.bloodGroup}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl sm:text-2xl font-display font-extrabold text-gray-900 tracking-tight leading-snug break-words">
                          {currentUser.name}
                        </h2>
                        {currentUser.fatherName && String(currentUser.fatherName).trim() ? (
                          <p className="text-xs text-gray-500 mt-2 font-sans font-medium uppercase tracking-wider break-words leading-normal">
                            S/O {String(currentUser.fatherName).trim()}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm text-gray-600">
                    <div className="flex items-start gap-2.5 min-w-0 text-left">
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1 flex flex-col items-start text-left">
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-bold block w-full text-left">Taluka / City & Address</p>
                        <p className="font-bold text-gray-900 break-words leading-snug mt-0.5 block w-full text-left">{(currentUser.city || "").trim()}</p>
                        {currentUser.address && String(currentUser.address).trim() ? (
                          <p className="text-xs text-gray-500 mt-0.5 break-words leading-relaxed block w-full text-left">{String(currentUser.address).trim()}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 min-w-0">
                      <Phone className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Contact Registers</p>
                        <p className="font-semibold text-gray-800 break-words leading-snug mt-0.5">Primary: {currentUser.primaryPhone}</p>
                        {currentUser.secondaryPhone ? (
                          <p className="text-xs text-gray-500 mt-1 break-words leading-relaxed">Secondary phone: {currentUser.secondaryPhone}</p>
                        ) : (
                          <p className="text-xs text-gray-400 italic mt-1">Koi secondary number nahi diya</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Readiness logic inside profile */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h4 className="font-display font-bold text-sm text-gray-800 flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full inline-block ${
                          (currentUser.status || "").toLowerCase() === "active"
                            ? "bg-emerald-500"
                            : (currentUser.status || "").toLowerCase() === "pending"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`} />
                        Status: {currentUser.status || "Pending"}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {(currentUser.status || "").toLowerCase() === "active"
                          ? "Khoon emergency ke liye aap dastyab hain. Log aapse WhatsApp/Call pe baat kar sakte hain."
                          : (currentUser.status || "").toLowerCase() === "pending"
                          ? "Aapka account abhi verification me hai. Verification ke baad ready status activate hoga."
                          : (currentUser.status || "").toLowerCase() === "rejected"
                          ? "Aapka account rejected hai. Admin se rabta karein."
                          : "Temporarily off the grid. Patients will skip your context call."}
                      </p>
                    </div>

                    {/* Switch Toggle (HIDDEN for Pending and Rejected users) */}
                    {(currentUser.status || "").toLowerCase() !== "pending" && (currentUser.status || "").toLowerCase() !== "rejected" ? (
                      <div className="shrink-0 flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                        <span className="text-xs font-extrabold text-gray-500 tracking-wider">READY TO DONATE</span>
                        <button
                          onClick={() => handleToggleState((currentUser.status || "").toLowerCase() !== "active")}
                          disabled={isTogglingStatus}
                          className={`w-14 h-8 rounded-full p-1 toggle-track relative focus:outline-none focus:ring-2 focus:ring-blood/20 shrink-0 btn-press ${
                            (currentUser.status || "").toLowerCase() === "active" ? "bg-emerald-500" : "bg-gray-300"
                          } ${isTogglingStatus ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full bg-white shadow-md transform toggle-knob ${
                              (currentUser.status || "").toLowerCase() === "active" ? "translate-x-6" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    ) : (
                      <div className="shrink-0 pt-2 sm:pt-0">
                        {(currentUser.status || "").toLowerCase() === "pending" ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-3.5 h-3.5" />
                            Pending Approval
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Rejected
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Mere Donation Records Card */}
                <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/60 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 bg-rose-50 rounded-xl border border-rose-100 text-blood shrink-0">
                        <Droplet className="w-4 h-4 fill-blood/20" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display font-extrabold text-base text-gray-900 leading-snug truncate">
                          Mere Donation Records
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Count line */}
                  <p className="text-xs text-gray-600 font-medium mb-3">
                    {isLoadingDonations ? (
                      "Records load ho rahe hain..."
                    ) : donationRecords.length > 0 ? (
                      `Aap ne ab tak ${donationRecords.length} martaba khoon diya hai.`
                    ) : (
                      "Abhi tak koi record nahi. Pehla record add karein."
                    )}
                  </p>

                  {/* Records List or Skeletons */}
                  {isLoadingDonations ? (
                    <div className="space-y-2.5 my-3">
                      <div className="h-16 bg-rose-50/70 animate-pulse rounded-2xl border border-rose-100/50" />
                      <div className="h-16 bg-rose-50/40 animate-pulse rounded-2xl border border-rose-100/30" />
                    </div>
                  ) : donationRecords.length > 0 ? (
                    <div className="space-y-2.5 my-3">
                      {(showAllDonations ? donationRecords : donationRecords.slice(0, 5)).map((record) => (
                        <div
                          key={record.id}
                          className="p-3 sm:p-3.5 bg-white/80 hover:bg-white rounded-2xl border border-gray-100 shadow-xs flex items-start justify-between gap-3 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-display font-extrabold text-xs sm:text-sm text-gray-900 leading-snug">
                              {formatDonationDate(record.date)}
                            </div>

                            {/* place and forWhom */}
                            {(record.place?.trim() || record.forWhom?.trim()) && (
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 mt-1">
                                {record.place?.trim() && (
                                  <span className="inline-flex items-center gap-1 break-words">
                                    <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                    <span>{record.place.trim()}</span>
                                  </span>
                                )}
                                {record.place?.trim() && record.forWhom?.trim() && (
                                  <span className="text-gray-300">•</span>
                                )}
                                {record.forWhom?.trim() && (
                                  <span className="inline-flex items-center gap-1 break-words">
                                    <User className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span>{record.forWhom.trim()}</span>
                                  </span>
                                )}
                              </div>
                            )}

                            {/* notes */}
                            {record.notes?.trim() && (
                              <p className="text-xs text-gray-600 bg-gray-50/80 px-2.5 py-1 rounded-lg border border-gray-100/80 mt-1.5 break-words italic">
                                {record.notes.trim()}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setRecordToDelete(record)}
                            title="Record delete karein"
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0 btn-press mt-0.5"
                            aria-label="Delete donation record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {donationRecords.length > 5 && (
                        <button
                          type="button"
                          onClick={() => setShowAllDonations(!showAllDonations)}
                          className="w-full py-2 text-xs font-bold text-blood hover:text-blood-dark flex items-center justify-center gap-1 transition-colors btn-press"
                        >
                          <span>{showAllDonations ? "Kam dekhein" : `Sab dekhein (${donationRecords.length})`}</span>
                          {showAllDonations ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  ) : null}

                  {/* Primary button at bottom */}
                  <button
                    type="button"
                    onClick={() => {
                      setNewDonationDate(getTodayDateString());
                      setNewDonationPlace("");
                      setNewDonationForWhom("");
                      setNewDonationNotes("");
                      setShowAddDonationModal(true);
                    }}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 bg-gradient-to-r from-blood to-blood-dark text-white rounded-xl font-display font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all btn-press"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Naya Record Add Karein</span>
                  </button>
                </div>

                {/* Edit Profile Form (conditional block or integrated drawer layout) */}
                {isEditingProfile ? (
                  <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-xl relative view-transition-enter">
                    <div className="flex items-center justify-between border-b pb-4 mb-4">
                      <h3 className="font-display font-extrabold text-lg text-gray-900 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-blood" />
                        Edit Profile Details
                      </h3>
                      <button 
                        onClick={() => setIsEditingProfile(false)}
                        className="text-gray-400 hover:text-gray-600 rounded-lg p-1 btn-press"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveProfile} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FloatingLabelInput
                          label="Full Name"
                          id="editName"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                        <FloatingLabelInput
                          label="Father Name"
                          id="editFatherName"
                          value={editFatherName}
                          onChange={(e) => setEditFatherName(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <CustomSelect
                          label="Taluka / City"
                          value={editCity}
                          onChange={(val) => setEditCity(val)}
                          options={GHOTKI_CITIES}
                        />
                        <CustomSelect
                          label="Blood Group"
                          value={editBloodGroup}
                          onChange={(val) => setEditBloodGroup(val)}
                          options={BLOOD_GROUPS.map((g) => ({ value: g, label: `Group: ${g}` }))}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FloatingLabelInput
                          label="Secondary Phone"
                          id="editSecondaryPhone"
                          value={editSecondaryPhone}
                          onChange={(e) => setEditSecondaryPhone(e.target.value)}
                        />
                        <FloatingLabelInput
                          label="Address Detail"
                          id="editAddress"
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 pl-1 font-sans">
                            Last Donation Date
                          </label>
                          <input
                            type="date"
                            id="editLastDonation"
                            value={editLastDonation}
                            onChange={(e) => setEditLastDonation(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 caret-blood focus:outline-none focus:ring-2 focus:ring-blood/40 focus:border-blood/50 text-sm font-semibold cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Optional Change Password Sub-section */}
                      <div className="pt-3 border-t border-gray-100">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                          Change Password (Optional)
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FloatingLabelInput
                            label="Current Password"
                            id="currentPassword"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Zaroori hai agar password badalna ho"
                          />
                          <FloatingLabelInput
                            label="New Password (Min 6 chars)"
                            id="editPassword"
                            type="password"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="Naya password likhein"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t mt-4">
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="px-4 py-2 border border-gray-200 text-gray-500 text-xs font-display font-bold rounded-xl hover:bg-gray-50 transition-colors btn-press"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={editProfileLoading}
                          className={`px-5 py-2.5 bg-gradient-to-r from-blood to-blood-dark text-white text-xs font-display font-extrabold rounded-xl shadow-md transition-all disabled:opacity-50 btn-press ${
                            editProfileLoading ? "btn-loading" : ""
                          }`}
                        >
                          {editProfileLoading ? (
                            <>
                              <span className="liquid"></span>
                              <span className="btn-label">Save ho raha hai</span>
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => {
                        if (currentUser) {
                          setEditName(currentUser.name || "");
                          setEditFatherName(currentUser.fatherName || "");
                          setEditAddress(currentUser.address || "");
                          setEditCity(currentUser.city || "");
                          setEditBloodGroup(currentUser.bloodGroup || "");
                          setEditSecondaryPhone(currentUser.secondaryPhone || "");
                          setEditLastDonation(currentUser.lastDonationDate || "");
                          setEditStatus(currentUser.status || UserStatus.ACTIVE);
                          setEditWillingToDonate(currentUser.willingToDonate ?? true);
                          setEditPassword("");
                          setCurrentPassword("");
                        }
                        setIsEditingProfile(true);
                      }}
                      className="flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2.5 sm:py-3 border border-gray-200 text-gray-700 bg-white/80 hover:bg-gray-50 hover:text-black rounded-xl font-display font-extrabold text-[11px] sm:text-xs shadow-sm shadow-gray-100 transition-colors whitespace-nowrap btn-press"
                    >
                      <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 shrink-0" />
                      <span className="whitespace-nowrap">Edit My Profile</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        const message = `Main Ghotki Blood Donors Network ka registered member hun. Mera blood group is ${currentUser.bloodGroup} hai. Agr mere blood ki zaroorat ho toh is portal ke zarye dhoondein: ${window.location.origin}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
                        addToast("success", "Share link open ho gaya");
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2.5 sm:py-3 border border-emerald-200 hover:border-emerald-300 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 rounded-xl font-display font-extrabold text-[11px] sm:text-xs shadow-sm transition-colors whitespace-nowrap btn-press"
                    >
                      <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span className="whitespace-nowrap">Share Ready Status on WhatsApp</span>
                    </button>
                  </div>
                )}

              </div>

              {/* Statistics/Days calculation Right Bar Layout */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                
                {/* Last donation counter card */}
                <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-blood" />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-rose-50 rounded-xl border border-rose-100 text-blood">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <h3 className="font-display font-bold text-sm text-gray-800">
                      Donation Ledger
                    </h3>
                  </div>

                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Days since last atia</p>
                  <p className="mt-2 text-xs font-bold text-gray-700 leading-relaxed bg-rose-50/50 p-3 rounded-xl border border-rose-100/50">
                    {getDaysAgoText(currentUser.lastDonationDate)}
                  </p>

                  <p className="mt-4 text-xs text-gray-400 leading-relaxed font-sans">
                    Doctor's reminder: Medical rules ke mutabiq mard 90 din (3 mahine) aur khawateen 120 din ke baad dobara khoon atia karne ke kabil hote hain.
                  </p>
                </div>

                {/* Secure network pledge info */}
                <div className="bg-gradient-to-br from-blood-dark to-blood p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                  <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-white/5" />
                  <h4 className="font-display font-extrabold text-base mb-2 flex items-center gap-1.5 text-yellow-300">
                    Sada-e-Insaanyat
                  </h4>
                  <p className="text-xs text-rose-100 leading-relaxed">
                    Aap ka her aik drop poore Ghotki district ke kisi zakhmi ko bacha sakta hai. Ghotki, Daharki aur Mirpur Mathelo ke hospitals, ya highway accidents, ya deliver cases me aap ka aik response anmol hai. JazakAllah!
                  </p>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ==================== 5. ADMIN PANEL ==================== */}
        {view === "ADMIN" && currentUser && (
          <div key="ADMIN" className="space-y-6 view-transition-enter">
            {currentUser.isAdmin ? (
              <AdminPanel
                adminPhone={currentUser.primaryPhone}
                adminPassword={savedAdminPassword}
                adminName={currentUser.name}
                initialDonors={initialAdminDonors}
                onDonorsUpdated={handleDonorsUpdated}
                onLogout={handleLogout}
                onUnauthorized={handleAdminUnauthorized}
                addToast={addToast}
                onModalStateChange={setIsAdminModalOpen}
              />
            ) : (
              <div className="glass-panel p-8 text-center rounded-3xl max-w-md mx-auto space-y-4">
                <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
                <h3 className="text-lg font-bold text-gray-900">Access Denied</h3>
                <p className="text-xs text-gray-600">Aap is page ko access karne ke authorized nahi hain.</p>
                <button
                  onClick={() => setView("DASHBOARD")}
                  className="px-5 py-2.5 bg-blood text-white rounded-xl text-xs font-bold shadow-md hover:bg-blood-dark transition-all btn-press"
                >
                  Go to My Dashboard
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Floating Detailed view slide-over or Modal drawer */}
      <ModalDialog
        isOpen={Boolean(viewingDonor)}
        onClose={() => setViewingDonor(null)}
        backdropClassName="bg-gray-950/40 backdrop-blur-md"
        panelClassName="glass-panel rounded-2xl sm:rounded-3xl max-w-sm sm:max-w-md w-full overflow-hidden shadow-2xl border border-white/40"
      >
        {viewingDonor && (
          <>
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blood to-gold" />
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-start gap-3 bg-white/60 shrink-0">
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <span className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-blood to-blood-dark text-white font-display font-extrabold text-base sm:text-lg shadow-md shrink-0">
                  {viewingDonor.bloodGroup}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-extrabold text-sm sm:text-base text-gray-900 leading-snug break-words">
                    {viewingDonor.name}
                  </h3>
                  {viewingDonor.fatherName && String(viewingDonor.fatherName).trim() ? (
                    <p className="text-[10px] sm:text-xs text-gray-500 font-medium mt-1 uppercase tracking-wide break-words leading-normal">
                      S/O {String(viewingDonor.fatherName).trim()}
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                onClick={() => setViewingDonor(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0 cursor-pointer btn-press"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-3.5 max-h-[70vh] overflow-y-auto overscroll-contain">
              {/* Location details */}
              <div className="p-3 sm:p-3.5 bg-gray-50/80 border border-gray-100 rounded-xl text-xs space-y-2.5">
                {/* Status badge row on its own at top right */}
                <div className="flex justify-end w-full">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Ready / Active
                  </span>
                </div>

                {/* City & Address taking full width below */}
                <div className="flex items-start gap-2 w-full text-left">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1 flex flex-col items-start text-left">
                    <span className="font-bold text-gray-900 text-xs sm:text-sm leading-snug break-words block w-full text-left">
                      {String(viewingDonor.city || "").trim()}
                    </span>
                    {viewingDonor.address && String(viewingDonor.address).trim() ? (
                      <span className="text-xs text-gray-500 leading-relaxed mt-0.5 break-words block w-full text-left">
                        {String(viewingDonor.address).trim()}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-gray-50/80 border border-gray-100 rounded-xl text-xs space-y-2">
                <span className="text-gray-400 font-bold block uppercase tracking-wider text-[9px] sm:text-[10px] mb-1">Emergency Numbers</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={`tel:${viewingDonor.primaryPhone}`}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-white border border-gray-200/80 rounded-lg hover:bg-rose-50/20 font-display font-semibold text-xs text-gray-700 transition-all truncate btn-press"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Call: {String(viewingDonor.primaryPhone || "")}</span>
                  </a>
                  
                  {viewingDonor.secondaryPhone && (
                    <a
                      href={`tel:${viewingDonor.secondaryPhone}`}
                      className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-white border border-gray-200/80 rounded-lg hover:bg-rose-50/20 font-display font-semibold text-xs text-gray-700 transition-all truncate btn-press"
                    >
                      <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>Call: {String(viewingDonor.secondaryPhone || "")}</span>
                    </a>
                  )}
                </div>
              </div>

              {viewingDonor.lastDonationDate && String(viewingDonor.lastDonationDate).trim() ? (
                <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-gray-500 bg-rose-50/40 p-2.5 rounded-xl border border-rose-100/60 justify-center">
                  <Calendar className="w-3.5 h-3.5 text-blood shrink-0" />
                  <span className="leading-tight text-center">
                    Last donation: <strong className="text-gray-700">{String(viewingDonor.lastDonationDate).trim()}</strong>
                  </span>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-gray-50 border-t border-gray-100 flex gap-2 shrink-0">
              <button
                onClick={() => setViewingDonor(null)}
                className="flex-1 py-2 rounded-lg bg-white hover:bg-gray-100 border border-gray-200 font-display font-bold text-xs text-gray-550 transition-colors btn-press"
              >
                Go Back
              </button>
              
              <a
                href={`https://wa.me/${sanitizeWhatsAppPhone(viewingDonor.primaryPhone)}?text=${encodeURIComponent(
                  `Assalam o Alaikum ${viewingDonor.name}, mujhe Ghotki Blood Donors Network se urgent help chahiye. Hum civil hospital / selected area me hain. Rabta karein.`
                )}`}
                target="_blank"
                rel="referrer noopener noreferrer"
                className="flex-1 py-2 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-white font-display font-extrabold text-xs shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5 transition-colors btn-press"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Urgent WhatsApp</span>
              </a>
            </div>
          </>
        )}
      </ModalDialog>

      {/* Add Donation Record Modal */}
      <ModalDialog
        isOpen={showAddDonationModal}
        onClose={() => {
          if (!isAddingDonation) {
            setShowAddDonationModal(false);
          }
        }}
        backdropClassName="bg-gray-950/40 backdrop-blur-md"
        panelClassName="glass-panel rounded-2xl sm:rounded-3xl max-w-sm sm:max-w-md w-full overflow-hidden shadow-2xl border border-white/40"
      >
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-50 rounded-xl border border-rose-100 text-blood">
                <Droplet className="w-4 h-4 fill-blood/20" />
              </div>
              <h3 className="font-display font-extrabold text-base text-gray-900">
                Naya Record Add Karein
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAddDonationModal(false)}
              disabled={isAddingDonation}
              className="text-gray-400 hover:text-gray-600 rounded-lg p-1 btn-press"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleAddDonationSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 pl-0.5">
                Tareekh <span className="text-blood">*</span>
              </label>
              <input
                type="date"
                required
                max={getTodayDateString()}
                value={newDonationDate}
                onChange={(e) => setNewDonationDate(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 caret-blood focus:outline-none focus:ring-2 focus:ring-blood/40 focus:border-blood/50 text-sm font-semibold cursor-pointer"
              />
            </div>

            <FloatingLabelInput
              label="Kahan diya"
              id="newDonationPlace"
              value={newDonationPlace}
              onChange={(e) => setNewDonationPlace(e.target.value)}
              placeholder="Hospital ya blood bank ka naam"
            />

            <FloatingLabelInput
              label="Kis ke liye"
              id="newDonationForWhom"
              value={newDonationForWhom}
              onChange={(e) => setNewDonationForWhom(e.target.value)}
              placeholder="Mareez ka naam ya rishta"
            />

            <FloatingLabelInput
              label="Notes"
              id="newDonationNotes"
              value={newDonationNotes}
              onChange={(e) => setNewDonationNotes(e.target.value)}
              placeholder="Notes (optional)"
            />

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 mt-5">
              <button
                type="button"
                onClick={() => setShowAddDonationModal(false)}
                disabled={isAddingDonation}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 text-xs font-display font-bold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 btn-press"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAddingDonation}
                className={`px-5 py-2.5 bg-gradient-to-r from-blood to-blood-dark text-white text-xs font-display font-extrabold rounded-xl shadow-md transition-all disabled:opacity-50 btn-press ${
                  isAddingDonation ? "btn-loading" : ""
                }`}
              >
                {isAddingDonation ? (
                  <>
                    <span className="liquid"></span>
                    <span className="btn-label">Add ho raha hai</span>
                  </>
                ) : (
                  "Add Karein"
                )}
              </button>
            </div>
          </form>
        </div>
      </ModalDialog>

      {/* Delete Donation Confirmation Modal */}
      <ModalDialog
        isOpen={Boolean(recordToDelete)}
        onClose={() => {
          if (!isDeletingDonation) {
            setRecordToDelete(null);
          }
        }}
        backdropClassName="bg-gray-950/40 backdrop-blur-md"
        panelClassName="glass-panel rounded-2xl sm:rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-white/40 p-5 sm:p-6 text-center"
      >
        {recordToDelete && (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl border border-rose-100 text-blood flex items-center justify-center mx-auto shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-display font-extrabold text-base text-gray-900">
                Yeh record delete karein?
              </h3>
              <p className="text-xs text-gray-500 mt-1 font-medium break-words">
                Date: <span className="font-bold text-gray-800">{formatDonationDate(recordToDelete.date)}</span>
                {recordToDelete.place && ` • ${recordToDelete.place}`}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                disabled={isDeletingDonation}
                className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-600 text-xs font-display font-bold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 btn-press"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteDonationConfirm}
                disabled={isDeletingDonation}
                className={`flex-1 py-2.5 px-4 bg-gradient-to-r from-rose-600 to-blood text-white text-xs font-display font-extrabold rounded-xl shadow-md transition-all disabled:opacity-50 btn-press ${
                  isDeletingDonation ? "btn-loading" : ""
                }`}
              >
                {isDeletingDonation ? (
                  <>
                    <span className="liquid"></span>
                    <span className="btn-label">Delete ho raha hai</span>
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        )}
      </ModalDialog>

      {/* Footer view */}
      <footer className="w-full bg-white/95 border-t border-gray-100 pt-8 pb-5 sm:pb-6 mt-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center gap-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blood" />
            <h4 className="font-display font-extrabold text-sm tracking-widest uppercase text-gray-800">
              Ghotki Blood Donors Network
            </h4>
          </div>

          <p className="text-xs text-black font-extrabold max-w-md md:max-w-2xl leading-relaxed [text-wrap:balance] text-center">
            Sada-e-Insaanyat — district Ghotki ke awam ke liye baraye-at-teh tahiyyat. Safe blood is key to savings. Join us now and secure Ghotki's kids, mothers and emergency cases.
          </p>

          <div className="flex items-center gap-2 sm:gap-4 text-xs font-mono text-black font-bold">
            <span className="hidden sm:inline">District Ghotki, Sindh, PK</span>
            <span className="hidden sm:inline">•</span>
            <a 
              href="https://wa.me/923352213351?text=Ghotki Blood Donors Network support line!"
              target="_blank"
              rel="referrer noopener noreferrer"
              className="text-blood hover:underline font-black"
            >
              Contact Admin WhatsApp
            </a>
          </div>
        </div>

        {/* Full screen width divider line */}
        <div className="w-full border-t border-gray-150 my-5" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center gap-2.5 text-center">
          <div className="text-xs sm:text-[13px] text-gray-500 font-semibold tracking-wide">
            © {new Date().getFullYear()} Ghotki Blood Donors Network.
          </div>
          <div className="text-xs sm:text-[13px] text-gray-450 font-medium tracking-wide flex flex-col items-center gap-1.5 justify-center mt-0.5">
            <span>Developed By</span>
            <a 
              href="https://wa.me/923352213351?text=Salam Subhan Ali! I saw your name as the developer of Ghotki Blood Donors Network." 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-1.5 bg-gradient-to-r from-rose-50 to-rose-100/60 hover:from-blood hover:to-rose-600 text-blood hover:text-white font-extrabold rounded-xl border border-rose-200/80 hover:border-blood/50 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer hover:scale-105 btn-press"
            >
              <span className="font-bold">Subhan Ali Kalhoro</span>
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
