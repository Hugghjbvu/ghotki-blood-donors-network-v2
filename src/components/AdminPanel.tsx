import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { 
  ShieldCheck, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  UserX, 
  Search, 
  Filter, 
  RefreshCw, 
  Phone, 
  MessageCircle, 
  Trash2, 
  UserPlus, 
  MapPin, 
  Calendar, 
  ChevronDown, 
  AlertTriangle, 
  LogOut,
  Droplet,
  Heart,
  Shield,
  Activity,
  SlidersHorizontal,
  X,
  KeyRound,
  Eye,
  EyeOff
} from "lucide-react";
import { Donor, UserStatus, AdminRecord, GHOTKI_CITIES, BLOOD_GROUPS } from "../types";
import CustomSelect from "./CustomSelect";
import ModalDialog from "./ModalDialog";
import { 
  adminGetAllDonors, 
  adminApproveDonor, 
  adminRejectDonor, 
  adminSetDonorStatus, 
  adminDeleteDonor, 
  adminListAdmins, 
  adminAddAdmin, 
  adminRemoveAdmin,
  adminResetPassword,
  SUPER_ADMIN_PHONE
} from "../firebase";

// Module-level pure helper functions
function formatDate(timestamp?: number | string): string {
  if (!timestamp) return "N/A";
  try {
    if (typeof timestamp === "number") {
      return new Date(timestamp).toLocaleDateString("en-PK", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    }
    return String(timestamp);
  } catch {
    return String(timestamp);
  }
}

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
      da.fatherName !== db.fatherName ||
      da.bloodGroup !== db.bloodGroup ||
      da.city !== db.city ||
      da.address !== db.address ||
      da.primaryPhone !== db.primaryPhone ||
      da.secondaryPhone !== db.secondaryPhone ||
      da.willingToDonate !== db.willingToDonate ||
      da.status !== db.status ||
      da.lastDonationDate !== db.lastDonationDate ||
      da.isAdmin !== db.isAdmin
    ) {
      return false;
    }
  }
  return true;
}

function sanitizeWhatsAppPhone(phone: any): string {
  if (phone === null || phone === undefined) return "";
  let cleaned = String(phone).replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "92" + cleaned.substring(1);
  }
  return cleaned;
}

function renderStatusBadge(status?: string) {
  const s = (status || "Active").toLowerCase();
  if (s === "active") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Active
      </span>
    );
  }
  if (s === "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        Pending
      </span>
    );
  }
  if (s === "inactive") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wider whitespace-nowrap">
        Inactive
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider whitespace-nowrap">
      Rejected
    </span>
  );
}

// Memoized Admin Donor Row Component
interface AdminDonorCardProps {
  donor: Donor;
  isStatusUpdating: boolean;
  onSetStatus: (donorId: string, status: string, name: string) => void;
  onOpenResetPass: (donor: Donor) => void;
  onOpenDelete: (donor: Donor) => void;
  index?: number;
}

const AdminDonorCard = React.memo(function AdminDonorCard({
  donor,
  isStatusUpdating,
  onSetStatus,
  onOpenResetPass,
  onOpenDelete,
  index = 0,
}: AdminDonorCardProps) {
  const donorId = donor.id || `donor_${donor.primaryPhone}`;
  const staggerClass = index < 6 ? `list-stagger-${index}` : "list-stagger-none";

  return (
    <div
      className={`bg-white/95 rounded-3xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-all space-y-4 relative list-item-enter ${staggerClass}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blood to-rose-700 text-white flex flex-col items-center justify-center font-display font-extrabold text-sm shadow-md shadow-blood/20 shrink-0">
            <span>{donor.bloodGroup}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-extrabold text-base text-gray-900 leading-snug break-words">
              {donor.name}
            </h3>
            {donor.fatherName && donor.fatherName.trim() ? (
              <p className="text-xs text-gray-500 mt-1 break-words leading-normal">
                S/O {donor.fatherName.trim()}
              </p>
            ) : null}
          </div>
        </div>

        {renderStatusBadge(donor.status as string)}
      </div>

      {/* Details Info */}
      <div className="space-y-2 text-xs text-gray-600 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100/90">
        {/* Location: City and Address on separate lines */}
        <div className="flex items-start gap-2 text-gray-700 text-left">
          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 flex flex-col items-start text-left">
            <span className="font-bold text-gray-900 leading-snug break-words block w-full text-left">
              {(donor.city || "").trim()}
            </span>
            {donor.address && donor.address.trim() ? (
              <span className="text-gray-500 text-xs leading-relaxed mt-0.5 break-words block w-full text-left">
                {donor.address.trim()}
              </span>
            ) : null}
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-xs">
            <span className="font-bold text-gray-900">{donor.primaryPhone}</span>
            {donor.secondaryPhone && donor.secondaryPhone.trim() ? (
              <span className="text-gray-400 text-[11px]">/ {donor.secondaryPhone.trim()}</span>
            ) : null}
          </div>
        </div>

        {/* Stacked Dates */}
        <div className="pt-1.5 border-t border-gray-200/60 space-y-1 text-[11px] text-gray-500">
          {donor.lastDonationDate && donor.lastDonationDate.trim() ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-400">Last Donation:</span>
              <strong className="text-gray-700 font-medium">
                {donor.lastDonationDate.trim()}
              </strong>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <span className="text-gray-400">Registered:</span>
            <span className="text-gray-600 font-mono text-[10px]">{formatDate(donor.registeredAt)}</span>
          </div>
        </div>
      </div>

      {/* Action Controls: Change Status, Contact, Reset Pass, Delete */}
      <div className="space-y-2.5 pt-1">
        {/* Status Selector */}
        <div className="flex items-center justify-between gap-2 bg-gray-100/80 p-1.5 rounded-xl border border-gray-200/60 relative z-20">
          <span className="text-[10px] font-bold text-gray-500 pl-1.5 uppercase tracking-wider whitespace-nowrap shrink-0">
            Change Status:
          </span>
          <div className="w-36 sm:w-40 min-w-0">
            <CustomSelect
              value={donor.status || UserStatus.ACTIVE}
              disabled={isStatusUpdating}
              onChange={(val) => onSetStatus(donorId, val, donor.name)}
              options={[
                { value: "Active", label: "Active" },
                { value: "Pending", label: "Pending" },
                { value: "Inactive", label: "Inactive" },
                { value: "Rejected", label: "Rejected" },
              ]}
              buttonClassName="px-2.5 py-1.5 text-xs font-bold bg-white rounded-lg border-gray-200 shadow-none"
            />
          </div>
        </div>

        {/* Action buttons: WhatsApp, Call, Reset Pass, Delete */}
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
          <a
            href={`https://wa.me/${sanitizeWhatsAppPhone(donor.primaryPhone)}?text=Assalam%20o%20Alaikum%20${encodeURIComponent(donor.name)}%2C%20Ghotki%20Blood%20Donors%20Network.`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 py-2 px-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap btn-press"
          >
            <MessageCircle className="w-3.5 h-3.5 shrink-0" />
            <span>WhatsApp</span>
          </a>

          <a
            href={`tel:${donor.primaryPhone}`}
            className="flex items-center justify-center gap-1 py-2 px-1 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap btn-press"
          >
            <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <span>Call</span>
          </a>

          <button
            type="button"
            onClick={() => onOpenResetPass(donor)}
            className="flex items-center justify-center gap-1 py-2 px-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer btn-press"
          >
            <KeyRound className="w-3.5 h-3.5 shrink-0" />
            <span>Reset Pass</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenDelete(donor)}
            className="flex items-center justify-center gap-1 py-2 px-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer btn-press"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
});

// Memoized Admin Pending Donor Card Component
interface AdminPendingDonorCardProps {
  donor: Donor;
  isApproving: boolean;
  isRejecting: boolean;
  onApprove: (donorId: string, name: string) => void;
  onReject: (donorId: string, name: string) => void;
  index?: number;
}

const AdminPendingDonorCard = React.memo(function AdminPendingDonorCard({
  donor,
  isApproving,
  isRejecting,
  onApprove,
  onReject,
  index = 0,
}: AdminPendingDonorCardProps) {
  const donorId = donor.id || `pending_${donor.primaryPhone}`;
  const staggerClass = index < 6 ? `list-stagger-${index}` : "list-stagger-none";

  return (
    <div
      className={`bg-white/95 rounded-3xl p-5 border-2 border-amber-200/80 shadow-sm shadow-amber-900/5 hover:border-amber-300 transition-all space-y-4 relative list-item-enter ${staggerClass}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-2xl bg-blood text-white flex flex-col items-center justify-center font-display font-extrabold text-sm shadow-md shadow-blood/20 shrink-0">
            <span>{donor.bloodGroup}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-extrabold text-base text-gray-900 leading-snug break-words">
              {donor.name}
            </h3>
            {donor.fatherName && donor.fatherName.trim() ? (
              <p className="text-xs text-gray-500 mt-1 break-words leading-normal">
                S/O {donor.fatherName.trim()}
              </p>
            ) : null}
          </div>
        </div>

        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wider shrink-0">
          Pending
        </span>
      </div>

      {/* Details list */}
      <div className="space-y-2 text-xs text-gray-600 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100/90">
        {/* City and Address separated on individual lines */}
        <div className="flex items-start gap-2 text-gray-700 text-left">
          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 flex flex-col items-start text-left">
            <span className="font-bold text-gray-900 leading-snug break-words block w-full text-left">
              {(donor.city || "").trim()}
            </span>
            {donor.address && donor.address.trim() ? (
              <span className="text-gray-500 text-xs leading-relaxed mt-0.5 break-words block w-full text-left">
                {donor.address.trim()}
              </span>
            ) : null}
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-xs">
            <span className="font-bold text-gray-900">{donor.primaryPhone}</span>
            {donor.secondaryPhone && donor.secondaryPhone.trim() ? (
              <span className="text-gray-400 text-[11px]">/ {donor.secondaryPhone.trim()}</span>
            ) : null}
          </div>
        </div>

        {/* Clean stacked dates for mobile */}
        <div className="pt-1.5 border-t border-gray-200/60 space-y-1 text-[11px] text-gray-500">
          {donor.lastDonationDate && donor.lastDonationDate.trim() ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-400">Last Donation:</span>
              <strong className="text-gray-700 font-medium">
                {donor.lastDonationDate.trim()}
              </strong>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <span className="text-gray-400">Registered:</span>
            <span className="text-gray-600 font-mono text-[10px]">{formatDate(donor.registeredAt)}</span>
          </div>
        </div>
      </div>

      {/* Quick WhatsApp Link & Action Buttons */}
      <div className="space-y-2">
        <a
          href={`https://wa.me/${sanitizeWhatsAppPhone(donor.primaryPhone)}?text=Assalam%20o%20Alaikum%20${encodeURIComponent(donor.name)}%2C%20Ghotki%20Blood%20Donors%20Network%20admin%20team%20aapki%20registration%20verify%20kar%20rahi%20hai.`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all btn-press"
        >
          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
          <span>WhatsApp per rabta karein</span>
        </a>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onApprove(donorId, donor.name)}
            disabled={isApproving || isRejecting}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-display font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 btn-press"
          >
            {isApproving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle className="w-3.5 h-3.5" />
            )}
            <span>Approve</span>
          </button>

          <button
            onClick={() => onReject(donorId, donor.name)}
            disabled={isApproving || isRejecting}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-display font-extrabold text-xs transition-all disabled:opacity-50 btn-press"
          >
            {isRejecting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
            <span>Reject</span>
          </button>
        </div>
      </div>
    </div>
  );
});

interface AdminPanelProps {
  adminPhone: string;
  adminPassword: string;
  adminName?: string;
  initialDonors?: Donor[] | null;
  onLogout: () => void;
  onUnauthorized?: () => void;
  addToast: (type: "success" | "error" | "info", message: string) => void;
  onModalStateChange?: (isOpen: boolean) => void;
  onDonorsUpdated?: (updatedDonors: Donor[]) => void;
}

export default function AdminPanel({
  adminPhone,
  adminPassword,
  adminName = "Admin",
  initialDonors,
  onLogout,
  onUnauthorized,
  addToast,
  onModalStateChange,
  onDonorsUpdated
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "donors" | "stats" | "admins">("pending");
  
  // Data states - initialized from initialDonors if available to avoid duplicate requests
  const [allDonors, setAllDonors] = useState<Donor[]>(initialDonors || []);
  const allDonorsRef = useRef<Donor[]>(allDonors);
  allDonorsRef.current = allDonors;
  const [adminsList, setAdminsList] = useState<AdminRecord[]>([]);
  const [isLoading, setIsLoading] = useState(!initialDonors || initialDonors.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Filter state for All Donors
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [bloodFilter, setBloodFilter] = useState<string>("ALL");
  const [cityFilter, setCityFilter] = useState<string>("ALL");

  // Debounce search query by 300ms for high performance typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Action Loading states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Delete Confirmation Modal
  const [donorToDelete, setDonorToDelete] = useState<Donor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset Password State
  const [donorToResetPass, setDonorToResetPass] = useState<Donor | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isResettingPass, setIsResettingPass] = useState(false);
  const [resetPassSuccessInfo, setResetPassSuccessInfo] = useState<{ donor: Donor; newPass: string } | null>(null);

  // Add Admin State
  const [newAdminPhone, setNewAdminPhone] = useState("");
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [adminToRemove, setAdminToRemove] = useState<AdminRecord | null>(null);
  const [isRemovingAdmin, setIsRemovingAdmin] = useState(false);

  // Derive if any modal in AdminPanel is currently open (for syncing with parent UI)
  const isAnyModalOpen = Boolean(
    donorToResetPass ||
    resetPassSuccessInfo ||
    donorToDelete ||
    adminToRemove
  );

  // Derive if any administrative action or mutation is currently in progress
  const isActionInProgress = Boolean(
    actionLoadingId !== null ||
    isDeleting ||
    isResettingPass ||
    isAddingAdmin ||
    isRemovingAdmin
  );

  // Synchronize modal open state with parent App (to hide floating action button)
  const onModalStateChangeRef = useRef(onModalStateChange);
  onModalStateChangeRef.current = onModalStateChange;

  const isAnyModalOpenRef = useRef(isAnyModalOpen);
  isAnyModalOpenRef.current = isAnyModalOpen;

  const isActionInProgressRef = useRef(isActionInProgress);
  isActionInProgressRef.current = isActionInProgress;

  const isRefreshingRef = useRef(isRefreshing);
  isRefreshingRef.current = isRefreshing;

  const onUnauthorizedRef = useRef(onUnauthorized);
  onUnauthorizedRef.current = onUnauthorized;

  const onDonorsUpdatedRef = useRef(onDonorsUpdated);
  onDonorsUpdatedRef.current = onDonorsUpdated;

  const isSilentRefreshingRef = useRef(false);

  useEffect(() => {
    onModalStateChangeRef.current?.(isAnyModalOpen);
    return () => {
      onModalStateChangeRef.current?.(false);
    };
  }, [isAnyModalOpen]);

  // Check if current user is super admin
  const cleanAdminPhone = String(adminPhone || "").replace(/[^0-9]/g, "");
  const cleanSuperPhone = String(SUPER_ADMIN_PHONE || "").replace(/[^0-9]/g, "");
  const isSuperAdmin = cleanAdminPhone === cleanSuperPhone;

  // Completely silent background refresh:
  // Re-fetches donor list with adminGetAll, updates donors and derived stats without touching UI loading states or toasts.
  const performSilentRefresh = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) {
      return;
    }

    // Must never interrupt an open modal, an action in progress, or collision with manual refresh
    if (
      isAnyModalOpenRef.current ||
      isActionInProgressRef.current ||
      isRefreshingRef.current ||
      isSilentRefreshingRef.current
    ) {
      return;
    }

    isSilentRefreshingRef.current = true;
    try {
      const donorsRes = await adminGetAllDonors(adminPhone, adminPassword);

      // Handle unauthorized: clear session and return to login screen
      if (!donorsRes) {
        if (typeof navigator !== "undefined" && navigator.onLine) {
          onUnauthorizedRef.current?.();
        }
        return;
      }

      // Check again if modal was opened or an action was started during the async fetch
      if (
        isAnyModalOpenRef.current ||
        isActionInProgressRef.current
      ) {
        return;
      }

      if (Array.isArray(donorsRes)) {
        // Only update state if returned data actually differs from what is already shown
        if (!areDonorListsEqual(allDonorsRef.current, donorsRes)) {
          setAllDonors(donorsRes);
          onDonorsUpdatedRef.current?.(donorsRes);
        }
      }
    } catch {
      // Completely silent — no toasts, no state disruption
    } finally {
      isSilentRefreshingRef.current = false;
    }
  }, [adminPhone, adminPassword]);

  // Silent background refresh:
  // 1. While admin panel is open and browser tab is visible, re-fetch donor list with adminGetAll every 60 seconds.
  // 2. Re-fetch immediately whenever the tab becomes visible again after being hidden.
  // 3. Stop interval when admin leaves panel or tab is hidden.
  useEffect(() => {
    let intervalId: any = null;

    const startPolling = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        if (typeof document !== "undefined" && !document.hidden) {
          performSilentRefresh();
        }
      }, 60000);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (typeof document === "undefined") return;
      if (document.hidden) {
        stopPolling();
      } else {
        // Re-fetch immediately whenever the tab becomes visible again after being hidden
        performSilentRefresh();
        startPolling();
      }
    };

    if (typeof document !== "undefined" && !document.hidden) {
      startPolling();
    }

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      stopPolling();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [performSilentRefresh]);

  // Load all admin data (only calls adminGetAllDonors and adminListAdmins)
  const loadAdminData = async (showToast = false) => {
    setIsRefreshing(true);
    try {
      const donorsRes = await adminGetAllDonors(adminPhone, adminPassword);

      if (!donorsRes && typeof navigator !== "undefined" && navigator.onLine) {
        onUnauthorized?.();
        return;
      }

      if (Array.isArray(donorsRes)) {
        setAllDonors(donorsRes);
        onDonorsUpdated?.(donorsRes);
      }

      // If super admin, also fetch admins list
      if (isSuperAdmin) {
        const adminsRes = await adminListAdmins(adminPhone, adminPassword);
        if (Array.isArray(adminsRes)) {
          setAdminsList(adminsRes);
        }
      }

      if (showToast) {
        addToast("success", "Data refresh ho gaya");
      }
    } catch {
      if (showToast) {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          addToast("error", "Internet connection nahi hai");
        } else {
          addToast("error", "Refresh fail ho gaya");
        }
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (initialDonors && initialDonors.length > 0) {
      setAllDonors(initialDonors);
      setIsLoading(false);
      if (isSuperAdmin && adminsList.length === 0) {
        adminListAdmins(adminPhone, adminPassword).then((res) => {
          if (Array.isArray(res)) setAdminsList(res);
        });
      }
    } else if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadAdminData();
    }
  }, [adminPhone, adminPassword]);

  // Derived: In-memory statistics computation from allDonors
  const computedStats = useMemo(() => {
    const total = allDonors.length;
    let active = 0;
    let pending = 0;
    let inactive = 0;
    let rejected = 0;
    const byBloodGroup: Record<string, number> = {};
    const byCity: Record<string, number> = {};

    BLOOD_GROUPS.forEach((bg) => {
      byBloodGroup[bg] = 0;
    });
    GHOTKI_CITIES.forEach((c) => {
      byCity[c] = 0;
    });

    for (const donor of allDonors) {
      const s = (donor.status || "active").toString().toLowerCase();
      if (s === "active") active++;
      else if (s === "pending") pending++;
      else if (s === "inactive") inactive++;
      else if (s === "rejected") rejected++;

      const bg = (donor.bloodGroup || "").trim().toUpperCase();
      if (bg) {
        byBloodGroup[bg] = (byBloodGroup[bg] || 0) + 1;
      }

      const city = (donor.city || "").trim();
      if (city) {
        const matched = GHOTKI_CITIES.find((c) => c.toLowerCase() === city.toLowerCase()) || city;
        byCity[matched] = (byCity[matched] || 0) + 1;
      }
    }

    return {
      total,
      active,
      pending,
      inactive,
      rejected,
      byBloodGroup,
      byCity
    };
  }, [allDonors]);

  // Derived: Pending donors (memoized)
  const pendingDonors = useMemo(() => {
    return allDonors.filter(
      (d) => (d.status || "").toString().toLowerCase() === "pending"
    );
  }, [allDonors]);

  // Derived: Filtered donors for All Donors view (memoized with debouncing)
  const filteredDonors = useMemo(() => {
    return allDonors.filter((donor) => {
      // Search query (name or phone)
      if (debouncedSearchQuery.trim()) {
        const q = debouncedSearchQuery.toLowerCase().trim();
        const matchName = (donor.name || "").toLowerCase().includes(q);
        const matchFather = (donor.fatherName || "").toLowerCase().includes(q);
        const matchPhone = (donor.primaryPhone || "").includes(q);
        const matchSecPhone = (donor.secondaryPhone || "").includes(q);
        if (!matchName && !matchFather && !matchPhone && !matchSecPhone) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "ALL") {
        if ((donor.status || "").toString().toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      }

      // Blood group filter
      if (bloodFilter !== "ALL") {
        if ((donor.bloodGroup || "").trim().toUpperCase() !== bloodFilter.trim().toUpperCase()) {
          return false;
        }
      }

      // City filter
      if (cityFilter !== "ALL") {
        if ((donor.city || "").trim().toLowerCase() !== cityFilter.trim().toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [allDonors, debouncedSearchQuery, statusFilter, bloodFilter, cityFilter]);

  // Pagination for smooth rendering with large donor lists (renders first 20, appends next 20 on scroll)
  const [visibleAdminDonorsCount, setVisibleAdminDonorsCount] = useState<number>(20);
  const [isLoadingMoreAdminDonors, setIsLoadingMoreAdminDonors] = useState<boolean>(false);
  const adminSentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset back to 20 whenever search filters or active tab change
  useEffect(() => {
    setVisibleAdminDonorsCount(20);
  }, [debouncedSearchQuery, statusFilter, bloodFilter, cityFilter, activeTab]);

  const visibleFilteredDonors = useMemo(() => {
    return filteredDonors.slice(0, visibleAdminDonorsCount);
  }, [filteredDonors, visibleAdminDonorsCount]);

  const hasMoreAdminDonors = visibleAdminDonorsCount < filteredDonors.length;

  useEffect(() => {
    if (!adminSentinelRef.current || !hasMoreAdminDonors) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting && hasMoreAdminDonors && !isLoadingMoreAdminDonors) {
          setIsLoadingMoreAdminDonors(true);
          setTimeout(() => {
            setVisibleAdminDonorsCount((prev) => Math.min(prev + 20, filteredDonors.length));
            setIsLoadingMoreAdminDonors(false);
          }, 100);
        }
      },
      { rootMargin: "250px" }
    );

    observer.observe(adminSentinelRef.current);
    return () => observer.disconnect();
  }, [hasMoreAdminDonors, isLoadingMoreAdminDonors, filteredDonors.length]);

  // Action: Approve Donor (Optimistic update)
  const handleApprove = useCallback(async (donorId: string, _donorName: string) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      addToast("error", "Internet connection nahi hai");
      return;
    }

    setActionLoadingId(`approve_${donorId}`);
    const previousDonors = allDonorsRef.current;
    const target = previousDonors.find((d) => d.id === donorId);
    const previousStatus = target?.status || UserStatus.PENDING;

    // Optimistically update status to ACTIVE
    const optimisticDonors = previousDonors.map((d) =>
      d.id === donorId ? { ...d, status: UserStatus.ACTIVE } : d
    );
    setAllDonors(optimisticDonors);
    onDonorsUpdated?.(optimisticDonors);

    try {
      const ok = await adminApproveDonor(adminPhone, adminPassword, donorId);
      if (ok) {
        addToast("success", "Approve ho gaya");
      } else {
        const rolledBack = allDonorsRef.current.map((d) =>
          d.id === donorId ? { ...d, status: previousStatus } : d
        );
        setAllDonors(rolledBack);
        onDonorsUpdated?.(rolledBack);
        addToast("error", "Approve nahi ho saka");
      }
    } catch {
      const rolledBack = allDonorsRef.current.map((d) =>
        d.id === donorId ? { ...d, status: previousStatus } : d
      );
      setAllDonors(rolledBack);
      onDonorsUpdated?.(rolledBack);
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        addToast("error", "Internet connection nahi hai");
      } else {
        addToast("error", "Server se rabta nahi ho saka");
      }
    } finally {
      setActionLoadingId(null);
    }
  }, [adminPhone, adminPassword, addToast, onDonorsUpdated]);

  // Action: Reject Donor (Optimistic update)
  const handleReject = useCallback(async (donorId: string, _donorName: string) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      addToast("error", "Internet connection nahi hai");
      return;
    }

    setActionLoadingId(`reject_${donorId}`);
    const previousDonors = allDonorsRef.current;
    const target = previousDonors.find((d) => d.id === donorId);
    const previousStatus = target?.status || UserStatus.PENDING;

    // Optimistically update status to REJECTED
    const optimisticDonors = previousDonors.map((d) =>
      d.id === donorId ? { ...d, status: UserStatus.REJECTED } : d
    );
    setAllDonors(optimisticDonors);
    onDonorsUpdated?.(optimisticDonors);

    try {
      const ok = await adminRejectDonor(adminPhone, adminPassword, donorId);
      if (ok) {
        addToast("info", "Reject ho gaya");
      } else {
        const rolledBack = allDonorsRef.current.map((d) =>
          d.id === donorId ? { ...d, status: previousStatus } : d
        );
        setAllDonors(rolledBack);
        onDonorsUpdated?.(rolledBack);
        addToast("error", "Reject nahi ho saka");
      }
    } catch {
      const rolledBack = allDonorsRef.current.map((d) =>
        d.id === donorId ? { ...d, status: previousStatus } : d
      );
      setAllDonors(rolledBack);
      onDonorsUpdated?.(rolledBack);
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        addToast("error", "Internet connection nahi hai");
      } else {
        addToast("error", "Server se rabta nahi ho saka");
      }
    } finally {
      setActionLoadingId(null);
    }
  }, [adminPhone, adminPassword, addToast, onDonorsUpdated]);

  // Action: Set Status (Optimistic update)
  const handleSetStatus = useCallback(async (donorId: string, newStatus: string, _donorName: string) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      addToast("error", "Internet connection nahi hai");
      return;
    }

    setActionLoadingId(`status_${donorId}`);
    const previousDonors = allDonorsRef.current;
    const target = previousDonors.find((d) => d.id === donorId);
    const previousStatus = target?.status || UserStatus.ACTIVE;

    // Optimistically update status
    const optimisticDonors = previousDonors.map((d) =>
      d.id === donorId ? { ...d, status: newStatus as UserStatus } : d
    );
    setAllDonors(optimisticDonors);
    onDonorsUpdated?.(optimisticDonors);

    try {
      const ok = await adminSetDonorStatus(adminPhone, adminPassword, donorId, newStatus);
      if (ok) {
        addToast("success", "Status update ho gaya");
      } else {
        if (previousStatus) {
          const rolledBack = allDonorsRef.current.map((d) =>
            d.id === donorId ? { ...d, status: previousStatus } : d
          );
          setAllDonors(rolledBack);
          onDonorsUpdated?.(rolledBack);
        }
        addToast("error", "Status change nahi ho saka");
      }
    } catch {
      if (previousStatus) {
        const rolledBack = allDonorsRef.current.map((d) =>
          d.id === donorId ? { ...d, status: previousStatus } : d
        );
        setAllDonors(rolledBack);
        onDonorsUpdated?.(rolledBack);
      }
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        addToast("error", "Internet connection nahi hai");
      } else {
        addToast("error", "Server se rabta nahi ho saka");
      }
    } finally {
      setActionLoadingId(null);
    }
  }, [adminPhone, adminPassword, addToast, onDonorsUpdated]);

  const handleOpenResetPass = useCallback((donor: Donor) => {
    setDonorToResetPass(donor);
    setNewPasswordInput("");
    setShowNewPassword(false);
  }, []);

  const handleOpenDelete = useCallback((donor: Donor) => {
    setDonorToDelete(donor);
  }, []);

  // Action: Confirm and Delete Donor (Optimistic immediate removal for safety)
  const handleConfirmDelete = async () => {
    if (!donorToDelete?.id) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      addToast("error", "Internet connection nahi hai");
      return;
    }

    const deletingTarget = donorToDelete;
    const previousDonors = allDonorsRef.current;
    setIsDeleting(true);

    // Visually remove row immediately to prevent mis-clicks or shifted clicks
    const remaining = previousDonors.filter((d) => d.id !== deletingTarget.id);
    setAllDonors(remaining);
    onDonorsUpdated?.(remaining);

    try {
      const ok = await adminDeleteDonor(adminPhone, adminPassword, deletingTarget.id);
      if (ok) {
        addToast("success", "Record delete ho gaya");
        setDonorToDelete(null);
      } else {
        setAllDonors(previousDonors);
        onDonorsUpdated?.(previousDonors);
        addToast("error", "Delete nahi ho saka");
        setDonorToDelete(null);
      }
    } catch {
      setAllDonors(previousDonors);
      onDonorsUpdated?.(previousDonors);
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        addToast("error", "Internet connection nahi hai");
      } else {
        addToast("error", "Server se rabta nahi ho saka");
      }
      setDonorToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Action: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorToResetPass) return;
    if (!newPasswordInput || newPasswordInput.length < 6) {
      addToast("error", "Password kam az kam 6 characters ka ho");
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      addToast("error", "Internet connection nahi hai");
      return;
    }

    setIsResettingPass(true);
    try {
      const res = await adminResetPassword(
        adminPhone,
        adminPassword,
        donorToResetPass.id,
        newPasswordInput
      );

      if (res.success) {
        addToast("success", "Password reset ho gaya");
        setResetPassSuccessInfo({
          donor: donorToResetPass,
          newPass: newPasswordInput
        });
        setDonorToResetPass(null);
        setNewPasswordInput("");
        setShowNewPassword(false);
      } else {
        if (res.unauthorized && onUnauthorized) {
          onUnauthorized();
          return;
        }
        addToast("error", res.message || "Password reset nahi ho saka");
      }
    } catch {
      addToast("error", "Server se rabta nahi ho saka");
    } finally {
      setIsResettingPass(false);
    }
  };

  // Action: Add Admin (Optimistic update)
  const handleAddAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = newAdminPhone.replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      addToast("error", "Mobile number darust karein");
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      addToast("error", "Internet connection nahi hai");
      return;
    }

    setIsAddingAdmin(true);
    const previousAdmins = adminsList;
    const tempAdmin: AdminRecord = {
      id: "admin_" + cleanPhone,
      phone: cleanPhone
    };
    // Optimistic addition
    setAdminsList((prev) => [...prev.filter((a) => a.phone !== cleanPhone), tempAdmin]);

    try {
      const res = await adminAddAdmin(adminPhone, adminPassword, cleanPhone);
      if (res.success) {
        addToast("success", "Admin add ho gaya");
        setNewAdminPhone("");
      } else {
        setAdminsList(previousAdmins);
        addToast("error", res.message || "Admin add nahi ho saka");
      }
    } catch {
      setAdminsList(previousAdmins);
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        addToast("error", "Internet connection nahi hai");
      } else {
        addToast("error", "Server se rabta nahi ho saka");
      }
    } finally {
      setIsAddingAdmin(false);
    }
  };

  // Action: Remove Admin (Optimistic update)
  const handleConfirmRemoveAdmin = async () => {
    if (!adminToRemove?.id) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      addToast("error", "Internet connection nahi hai");
      return;
    }

    const removingTarget = adminToRemove;
    const previousAdmins = adminsList;
    setIsRemovingAdmin(true);
    // Optimistic removal
    setAdminsList((prev) =>
      prev.filter((a) => a.id !== removingTarget.id && a.phone !== removingTarget.phone)
    );

    try {
      const res = await adminRemoveAdmin(adminPhone, adminPassword, removingTarget.id);
      if (res.success) {
        addToast("success", "Admin remove ho gaya");
        setAdminToRemove(null);
      } else {
        setAdminsList(previousAdmins);
        addToast("error", res.message || "Admin remove nahi ho saka");
      }
    } catch {
      setAdminsList(previousAdmins);
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        addToast("error", "Internet connection nahi hai");
      } else {
        addToast("error", "Server se rabta nahi ho saka");
      }
    } finally {
      setIsRemovingAdmin(false);
    }
  };

  // Stats values derived directly from computed in-memory stats
  const totalCount = computedStats.total;
  const activeCount = computedStats.active;
  const pendingCount = computedStats.pending;
  const inactiveCount = computedStats.inactive;
  const rejectedCount = computedStats.rejected;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in pb-16">
      
      {/* Top Admin Header */}
      <div className="bg-gradient-to-r from-gray-900 via-rose-950 to-gray-900 text-white rounded-3xl p-4 sm:p-7 shadow-xl shadow-blood/10 border border-rose-900/40 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-blood/20 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            {/* Header Badge: Single line on mobile */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blood/30 border border-blood/50 text-rose-300 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap max-w-full">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="hidden sm:inline">Ghotki Blood Network • </span>
              <span>Admin Portal</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-display font-extrabold text-white tracking-tight flex items-center gap-2 flex-wrap">
              <span>Admin Console</span>
              {isSuperAdmin && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 uppercase font-mono font-bold tracking-wider whitespace-nowrap">
                  Super Admin
                </span>
              )}
            </h1>
            <p className="text-[11px] sm:text-xs text-rose-200/90 flex flex-wrap items-center gap-1.5 leading-tight">
              <span>Logged in as</span>
              <strong className="text-white font-semibold">{adminName}</strong>
              <span className="font-mono text-rose-200">{adminPhone}</span>
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => loadAdminData(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-rose-100 text-xs font-bold transition-all border border-white/10 disabled:opacity-50 btn-press"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-rose-400" : ""}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition-all border border-rose-500/40 shadow-sm shadow-blood/30 btn-press"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (2-row grid on mobile, flex bar on desktop) */}
      <div className="grid grid-cols-2 md:flex md:items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-gray-200/80 shadow-sm w-full max-w-full overflow-hidden">
        <button
          onClick={() => setActiveTab("pending")}
          className={`tab-pill-btn flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2.5 rounded-xl font-display font-bold text-[11px] sm:text-xs whitespace-nowrap ${
            activeTab === "pending"
              ? "bg-blood text-white shadow-md shadow-blood/25"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70"
          }`}
        >
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span>Pending Approvals</span>
          {pendingCount > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-extrabold shrink-0 ${
              activeTab === "pending" ? "bg-white text-blood" : "bg-amber-500 text-white"
            }`}>
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("donors")}
          className={`tab-pill-btn flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2.5 rounded-xl font-display font-bold text-[11px] sm:text-xs whitespace-nowrap ${
            activeTab === "donors"
              ? "bg-blood text-white shadow-md shadow-blood/25"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70"
          }`}
        >
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span>All Donors</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono shrink-0 ${
            activeTab === "donors" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
          }`}>
            {totalCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("stats")}
          className={`tab-pill-btn flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2.5 rounded-xl font-display font-bold text-[11px] sm:text-xs whitespace-nowrap ${
            !isSuperAdmin ? "col-span-2 md:col-span-1" : ""
          } ${
            activeTab === "stats"
              ? "bg-blood text-white shadow-md shadow-blood/25"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70"
          }`}
        >
          <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span>Overview Stats</span>
        </button>

        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab("admins")}
            className={`tab-pill-btn flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2.5 rounded-xl font-display font-bold text-[11px] sm:text-xs whitespace-nowrap ${
              activeTab === "admins"
                ? "bg-blood text-white shadow-md shadow-blood/25"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70"
            }`}
          >
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Manage Admins</span>
          </button>
        )}
      </div>

      {/* =========================================================================
          SECTION 1: STATS SUMMARY CARDS (Always visible on top of views)
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total Donors */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-500 font-bold uppercase tracking-wider">Total</span>
            <div className="p-1.5 bg-gray-100 rounded-lg text-gray-600">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-display font-extrabold text-gray-900 mt-2">{totalCount}</p>
          <span className="text-[10px] text-gray-400">All registered</span>
        </div>

        {/* Active Donors */}
        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-emerald-700 font-bold uppercase tracking-wider">Active</span>
            <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-display font-extrabold text-emerald-800 mt-2">{activeCount}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Ready in search</span>
        </div>

        {/* Pending Approvals */}
        <div className={`rounded-2xl p-4 border shadow-sm transition-all ${
          pendingCount > 0 
            ? "bg-amber-50 border-amber-300 ring-2 ring-amber-400/30" 
            : "bg-white border-gray-200/80"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-amber-700 font-bold uppercase tracking-wider flex items-center gap-1">
              Pending
              {pendingCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
            </span>
            <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-display font-extrabold text-amber-800 mt-2">{pendingCount}</p>
          <span className="text-[10px] text-amber-700 font-semibold">Needs review</span>
        </div>

        {/* Inactive Donors */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-500 font-bold uppercase tracking-wider">Inactive</span>
            <div className="p-1.5 bg-gray-100 rounded-lg text-gray-500">
              <UserX className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-display font-extrabold text-gray-700 mt-2">{inactiveCount}</p>
          <span className="text-[10px] text-gray-400">Offline / Resting</span>
        </div>

        {/* Rejected */}
        <div className="bg-rose-50 rounded-2xl p-4 border border-rose-200/70 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-rose-700 font-bold uppercase tracking-wider">Rejected</span>
            <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-display font-extrabold text-rose-800 mt-2">{rejectedCount}</p>
          <span className="text-[10px] text-rose-600">Declined entries</span>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: PENDING APPROVALS (SHOW FIRST & MOST IMPORTANT)
          ========================================================================= */}
      {activeTab === "pending" && (
        <div key="pending" className="space-y-4 tab-content-anim">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-display font-extrabold text-gray-900 flex items-center gap-2">
                <span>Pending Approvals</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold font-mono">
                  {pendingDonors.length}
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                New donor registrations requiring verification before appearing in public search.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center bg-white/70 rounded-3xl border border-gray-200/70">
              <RefreshCw className="w-8 h-8 text-blood animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-500 font-medium">Pending approvals load ho rahi hain...</p>
            </div>
          ) : pendingDonors.length === 0 ? (
            <div className="p-8 sm:p-10 text-center bg-emerald-50 rounded-3xl border border-emerald-200/60">
              <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-500 mx-auto mb-2.5" />
              <h4 className="font-display font-extrabold text-sm sm:text-base text-gray-800 whitespace-nowrap">
                Koi pending approval nahi hai
              </h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 whitespace-nowrap">
                Sab registrations verified hain.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingDonors.map((donor, idx) => {
                const donorId = donor.id || `pending_${donor.primaryPhone}`;
                return (
                  <AdminPendingDonorCard
                    key={donorId}
                    donor={donor}
                    index={idx}
                    isApproving={actionLoadingId === `approve_${donorId}`}
                    isRejecting={actionLoadingId === `reject_${donorId}`}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: ALL DONORS DIRECTORY
          ========================================================================= */}
      {activeTab === "donors" && (
        <div key="donors" className="space-y-4 tab-content-anim">
          {/* Filter Bar */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-200/80 shadow-sm space-y-3 relative overflow-visible z-20">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, father name, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 caret-blood focus:outline-none focus:ring-2 focus:ring-blood/20 focus:border-blood transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-2 relative z-30">
              {/* Status Filter */}
              <div>
                <CustomSelect
                  label="Status"
                  labelClassName="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 pl-0.5"
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  options={[
                    { value: "ALL", label: "All Status" },
                    { value: "Active", label: "Active" },
                    { value: "Pending", label: "Pending" },
                    { value: "Inactive", label: "Inactive" },
                    { value: "Rejected", label: "Rejected" },
                  ]}
                  buttonClassName="px-3 py-2.5 sm:py-2 text-xs font-semibold rounded-xl bg-gray-50 border-gray-200"
                />
              </div>

              {/* Blood Filter */}
              <div>
                <CustomSelect
                  label="Blood Group"
                  labelClassName="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 pl-0.5"
                  value={bloodFilter}
                  onChange={(val) => setBloodFilter(val)}
                  options={[
                    { value: "ALL", label: "All Groups" },
                    ...BLOOD_GROUPS.map((bg) => ({ value: bg, label: bg })),
                  ]}
                  buttonClassName="px-3 py-2.5 sm:py-2 text-xs font-semibold rounded-xl bg-gray-50 border-gray-200"
                />
              </div>

              {/* City Filter */}
              <div>
                <CustomSelect
                  label="City"
                  labelClassName="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 pl-0.5"
                  value={cityFilter}
                  onChange={(val) => setCityFilter(val)}
                  options={[
                    { value: "ALL", label: "All Cities" },
                    ...GHOTKI_CITIES.map((c) => ({ value: c, label: c })),
                  ]}
                  buttonClassName="px-3 py-2.5 sm:py-2 text-xs font-semibold rounded-xl bg-gray-50 border-gray-200"
                />
              </div>
            </div>

            {/* Results count & Clear Filters */}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
              <span>Showing <strong>{filteredDonors.length}</strong> of {allDonors.length} {allDonors.length === 1 ? "donor" : "donors"}</span>
              {(searchQuery || statusFilter !== "ALL" || bloodFilter !== "ALL" || cityFilter !== "ALL") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("ALL");
                    setBloodFilter("ALL");
                    setCityFilter("ALL");
                  }}
                  className="text-blood font-bold hover:underline"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Donors Cards List */}
          {isLoading ? (
            <div className="p-12 text-center bg-white/70 rounded-3xl border border-gray-200/70">
              <RefreshCw className="w-8 h-8 text-blood animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-500 font-medium">Donors list load ho rahi hai...</p>
            </div>
          ) : filteredDonors.length === 0 ? (
            <div className="p-10 text-center bg-white/70 rounded-3xl border border-gray-200/70">
              <Search className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <h4 className="font-display font-extrabold text-sm text-gray-700">Koi Donor Nahi Mila</h4>
              <p className="text-xs text-gray-400 mt-1">Filters change karein ya search term clear karein.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleFilteredDonors.map((donor, idx) => {
                  const donorId = donor.id || `donor_${donor.primaryPhone}`;
                  return (
                    <AdminDonorCard
                      key={donorId}
                      donor={donor}
                      index={idx}
                      isStatusUpdating={actionLoadingId === `status_${donorId}`}
                      onSetStatus={handleSetStatus}
                      onOpenResetPass={handleOpenResetPass}
                      onOpenDelete={handleOpenDelete}
                    />
                  );
                })}
              </div>

              {hasMoreAdminDonors && (
                <div ref={adminSentinelRef} className="w-full flex items-center justify-center py-3">
                  {isLoadingMoreAdminDonors && (
                    <p className="text-xs font-semibold text-gray-400">Load ho raha hai</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: DETAILED STATS (BLOOD GROUP & CITY BREAKDOWN)
          ========================================================================= */}
      {activeTab === "stats" && (
        <div key="stats" className="space-y-6 tab-content-anim">
          {/* Blood Groups Distribution */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/80 shadow-sm space-y-4">
            <h3 className="font-display font-extrabold text-base text-gray-900 flex items-center gap-2">
              <Droplet className="w-4 h-4 text-blood" />
              <span>Blood Group Wise Breakdown</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              {BLOOD_GROUPS.map((bg) => {
                const count = computedStats.byBloodGroup[bg] ?? 0;
                return (
                  <div 
                    key={bg}
                    className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-rose-50/70 to-white border border-rose-100 flex items-center justify-between shadow-2xs"
                  >
                    <div>
                      <span className="text-lg sm:text-xl font-display font-black text-blood">{bg}</span>
                      <p className="text-[10px] text-gray-400 font-medium">Blood Group</p>
                    </div>
                    <span className="text-lg sm:text-xl font-mono font-extrabold text-gray-800 bg-white px-2.5 py-1 rounded-xl shadow-xs border border-gray-100">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* City Wise Breakdown: Single-line horizontal cards on mobile */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/80 shadow-sm space-y-4">
            <h3 className="font-display font-extrabold text-base text-gray-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blood" />
              <span>Tehsil & City Wise Breakdown</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {GHOTKI_CITIES.map((city) => {
                const count = computedStats.byCity[city] ?? 0;
                return (
                  <div 
                    key={city}
                    className="p-3.5 sm:p-4 rounded-2xl bg-gray-50/90 border border-gray-200/80 flex items-center justify-between gap-3 hover:border-gray-300 transition-all shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blood shrink-0" />
                        <span className="text-xs sm:text-sm font-display font-bold text-gray-800 truncate whitespace-nowrap">{city}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 pl-5">District Ghotki</p>
                    </div>
                    <span className="text-sm sm:text-base font-mono font-extrabold text-gray-900 bg-white px-2.5 py-1 rounded-xl shadow-xs border border-gray-200 shrink-0">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: MANAGE ADMINS (SUPER ADMIN ONLY)
          ========================================================================= */}
      {activeTab === "admins" && isSuperAdmin && (
        <div key="admins" className="space-y-6 tab-content-anim">
          {/* Add New Admin Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blood/10 text-blood rounded-xl">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-base text-gray-900">Add New Admin</h3>
                <p className="text-xs text-gray-500">
                  Grant administrative access to a registered blood donor.
                </p>
              </div>
            </div>

            <form onSubmit={handleAddAdminSubmit} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="tel"
                  placeholder="e.g. 03001234567"
                  value={newAdminPhone}
                  onChange={(e) => setNewAdminPhone(e.target.value)}
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-900 placeholder-gray-400 caret-blood focus:outline-none focus:ring-2 focus:ring-blood/20 focus:border-blood"
                />
                <button
                  type="submit"
                  disabled={isAddingAdmin || !newAdminPhone.trim()}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blood hover:bg-blood/90 text-white font-display font-extrabold text-xs rounded-xl shadow-md shadow-blood/20 transition-all disabled:opacity-50 whitespace-nowrap btn-press"
                >
                  {isAddingAdmin ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>Add Admin</span>
                </button>
              </div>
              <p className="text-[11px] text-gray-400 italic">
                * Note: Admin bananey ke liye zaroori hai ke yeh number pehle se as a donor registered ho.
              </p>
            </form>
          </div>

          {/* Admins List */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/80 shadow-sm space-y-4">
            <h3 className="font-display font-extrabold text-base text-gray-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blood" />
              <span>Current Authorized Admins</span>
            </h3>

            <div className="space-y-2.5">
              {/* Super Admin Row (Permanent) */}
              <div className="flex items-center justify-between p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-sm text-gray-900">
                        {SUPER_ADMIN_PHONE}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-200 text-amber-900 uppercase tracking-widest">
                        Super Admin
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">Root system administrator (Protected)</p>
                  </div>
                </div>
              </div>

              {/* Other Admins */}
              {adminsList
                .filter((adm) => String(adm.phone || "").replace(/[^0-9]/g, "") !== cleanSuperPhone)
                .map((admin) => (
                  <div 
                    key={admin.id || admin.phone}
                    className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200/70 rounded-2xl hover:border-gray-300 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 text-blood flex items-center justify-center">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-mono font-bold text-sm text-gray-900">
                          {admin.phone}
                        </span>
                        <p className="text-[11px] text-gray-500">Standard Administrator</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setAdminToRemove(admin)}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-200 btn-press"
                      title="Remove Admin"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          RESET PASSWORD MODAL
          ========================================================================= */}
      <ModalDialog
        isOpen={Boolean(donorToResetPass)}
        onClose={() => {
          if (!isResettingPass) {
            setDonorToResetPass(null);
            setNewPasswordInput("");
            setShowNewPassword(false);
          }
        }}
        backdropClassName="bg-black/60 backdrop-blur-xs"
        panelClassName="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4"
      >
        {donorToResetPass && (
          <>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-display font-extrabold text-lg text-gray-900">
                Password Reset
              </h3>
              <p className="text-xs text-gray-600">
                Donor: <strong className="text-gray-900">{donorToResetPass.name}</strong>
              </p>
              <p className="text-xs font-mono text-gray-500">
                {donorToResetPass.primaryPhone}
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 pt-1">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider pl-1">
                  Naya Password (Kam az kam 6 chars)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Naya password likhein..."
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-sans text-gray-900 placeholder-gray-400 caret-blood pr-12 focus:outline-none focus:ring-2 focus:ring-blood/20 focus:border-blood"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDonorToResetPass(null);
                    setNewPasswordInput("");
                    setShowNewPassword(false);
                  }}
                  disabled={isResettingPass}
                  className="py-2.5 rounded-xl border border-gray-200 text-gray-700 font-display font-extrabold text-xs hover:bg-gray-50 transition-all cursor-pointer btn-press"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isResettingPass || newPasswordInput.length < 6}
                  className="py-2.5 rounded-xl bg-blood hover:bg-blood/90 text-white font-display font-extrabold text-xs transition-all shadow-md shadow-blood/20 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer btn-press"
                >
                  {isResettingPass ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                  <span>Reset Karein</span>
                </button>
              </div>
            </form>
          </>
        )}
      </ModalDialog>

      {/* =========================================================================
          RESET PASSWORD SUCCESS & WHATSAPP SHARE MODAL
          ========================================================================= */}
      <ModalDialog
        isOpen={Boolean(resetPassSuccessInfo)}
        onClose={() => setResetPassSuccessInfo(null)}
        backdropClassName="bg-black/60 backdrop-blur-xs"
        panelClassName="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4 text-center"
      >
        {resetPassSuccessInfo && (
          <>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-display font-extrabold text-lg text-gray-900">
                Password Reset Ho Gaya
              </h3>
              <p className="text-xs text-gray-600">
                <strong className="text-gray-900">{resetPassSuccessInfo.donor.name}</strong> ka password kamyabi se update kar diya gaya hai.
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 text-xs font-mono text-gray-800">
              <span className="text-gray-400 block text-[10px] uppercase font-sans font-bold mb-0.5">Naya Password:</span>
              <span className="font-bold text-sm text-blood">{resetPassSuccessInfo.newPass}</span>
            </div>

            <div className="space-y-2 pt-1">
              <a
                href={`https://wa.me/${sanitizeWhatsAppPhone(resetPassSuccessInfo.donor.primaryPhone)}?text=${encodeURIComponent(
                  `Assalam o Alaikum, aapka Ghotki Blood Network ka naya password hai: ${resetPassSuccessInfo.newPass} — Login karke isay badal lein.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setResetPassSuccessInfo(null)}
                className="w-full py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-display font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer btn-press"
              >
                <MessageCircle className="w-4 h-4 fill-white shrink-0" />
                <span>WhatsApp par bhejein</span>
              </a>

              <button
                type="button"
                onClick={() => setResetPassSuccessInfo(null)}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-700 font-display font-bold text-xs hover:bg-gray-50 transition-all cursor-pointer btn-press"
              >
                Band Karein
              </button>
            </div>
          </>
        )}
      </ModalDialog>

      {/* =========================================================================
          DELETE DONOR CONFIRMATION MODAL
          ========================================================================= */}
      <ModalDialog
        isOpen={Boolean(donorToDelete)}
        onClose={() => {
          if (!isDeleting) setDonorToDelete(null);
        }}
        backdropClassName="bg-black/60 backdrop-blur-xs"
        panelClassName="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4"
      >
        {donorToDelete && (
          <>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-blood flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-display font-extrabold text-lg text-gray-900">
                Delete Donor Record?
              </h3>
              <p className="text-xs text-gray-600">
                Kya aap waqai <strong className="text-gray-900">{donorToDelete.name}</strong> ({donorToDelete.primaryPhone}) ka record delete karna chahte hain?
              </p>
              <p className="text-[11px] text-rose-600 font-medium pt-1">
                Yeh action wapas nahi liya ja sakta.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDonorToDelete(null)}
                disabled={isDeleting}
                className="py-2.5 rounded-xl border border-gray-200 text-gray-700 font-display font-extrabold text-xs hover:bg-gray-50 transition-all btn-press"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="py-2.5 rounded-xl bg-blood hover:bg-blood/90 text-white font-display font-extrabold text-xs transition-all shadow-md shadow-blood/20 flex items-center justify-center gap-1.5 btn-press"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </>
        )}
      </ModalDialog>

      {/* =========================================================================
          REMOVE ADMIN CONFIRMATION MODAL
          ========================================================================= */}
      <ModalDialog
        isOpen={Boolean(adminToRemove)}
        onClose={() => {
          if (!isRemovingAdmin) setAdminToRemove(null);
        }}
        backdropClassName="bg-black/60 backdrop-blur-xs"
        panelClassName="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4"
      >
        {adminToRemove && (
          <>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-blood flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-display font-extrabold text-lg text-gray-900">
                Remove Admin Privileges?
              </h3>
              <p className="text-xs text-gray-600">
                Kya aap waqai <strong className="font-mono text-gray-900">{adminToRemove.phone}</strong> se admin access wapas lena chahte hain?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdminToRemove(null)}
                disabled={isRemovingAdmin}
                className="py-2.5 rounded-xl border border-gray-200 text-gray-700 font-display font-extrabold text-xs hover:bg-gray-50 transition-all btn-press"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmRemoveAdmin}
                disabled={isRemovingAdmin}
                className="py-2.5 rounded-xl bg-blood hover:bg-blood/90 text-white font-display font-extrabold text-xs transition-all shadow-md shadow-blood/20 flex items-center justify-center gap-1.5 btn-press"
              >
                {isRemovingAdmin ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Remove Admin</span>
              </button>
            </div>
          </>
        )}
      </ModalDialog>

    </div>
  );
}
