/**
 * DISTRICT GHOTKI BLOOD DONORS NETWORK - GOOGLE APPS SCRIPT API INTEGRATION
 * Direct live API connection for Donors & Admin Panel.
 */
import { Donor, UserStatus, AdminStatsData, AdminRecord, DonationRecord } from "./types";

const APPS_SCRIPT_API_URL = "https://script.google.com/macros/s/AKfycbyVoEjpZ6eeEW12S2usyewyOrTwmCFdjLHRgAFM463677O48N7McFGuFugH3De9gzxG/exec";
const FIREBASE_RTDB_PUBLIC_URL = "https://ghotki-blood-donors-2d0eb-default-rtdb.firebaseio.com/public.json";
const API_TOKEN = "GhotkiBlood2026SecureX";
const STORAGE_KEY = "ghotki_blood_donors_live_cache";
export const SUPER_ADMIN_PHONE = "03018597734";

/**
 * Filter an array of donors by status, blood group, and city
 */
export function filterDonorsList(donors: Donor[], bloodGroup: string, city: string): Donor[] {
  return donors.filter((donor) => {
    if (!donor) return false;
    const statusStr = String(donor.status || "").trim().toUpperCase();
    const isActive = statusStr === "ACTIVE" || donor.status === UserStatus.ACTIVE;
    if (!isActive) return false;

    if (bloodGroup && bloodGroup.trim() !== "") {
      if ((donor.bloodGroup || "").trim().toUpperCase() !== bloodGroup.trim().toUpperCase()) {
        return false;
      }
    }

    if (city && city.trim() !== "") {
      if ((donor.city || "").trim().toLowerCase() !== city.trim().toLowerCase()) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Directly fetch the public active donors from Firebase Realtime Database (/public.json).
 * Completely silent background fetch, returns null on failure without throwing.
 */
export async function fetchPublicDonorsFromFirebase(): Promise<Donor[] | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(FIREBASE_RTDB_PUBLIC_URL, {
      method: "GET",
      signal: controller.signal
    });

    clearTimeout(timer);

    if (response.ok) {
      const data = await response.json();
      if (data !== null && data !== undefined) {
        const donorsList = parseFirebaseDonors(data);
        const activeList = filterDonorsList(donorsList, "", "");
        return activeList;
      }
    }
  } catch {
    // Silent fail
  }
  return null;
}

/**
 * Convert Firebase Realtime Database response (object map or array) into a clean Donor array
 */
function parseFirebaseDonors(data: any): Donor[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.filter(Boolean).map((d: any, idx: number) => ({
      ...d,
      id: d.id || String(idx)
    }));
  }
  if (typeof data === "object") {
    return Object.keys(data).map((key) => {
      const item = data[key];
      return {
        ...item,
        id: item?.id || key
      };
    });
  }
  return [];
}

/**
 * Hash function to generate a stable, non-reversible shorter hash code of a string.
 */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Browser fingerprint utility using UserAgent, Screen boundaries and Timezone.
 */
export function generateDeviceFingerprint(): string {
  try {
    const userAgent = navigator.userAgent || "";
    const w = screen.width || 0;
    const h = screen.height || 0;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const rawString = `${userAgent}_${w}_${h}_${timezone}`;
    return hashString(rawString);
  } catch (error) {
    return "dev_" + Math.random().toString(36).substring(2, 10);
  }
}

/**
 * Helper to cache successfully fetched live donors
 */
export function cacheLiveDonors(donors: Donor[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(donors));
  } catch (e) {
    // ignore
  }
}

/**
 * Helper to get cached live donors if network is briefly offline
 */
export function getCachedLiveDonors(): Donor[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return filterDonorsList(parsed, "", "");
      }
    }
  } catch (e) {
    // ignore
  }
  return [];
}

/**
 * Helper to remove a donor from localStorage cache
 */
export function removeDonorFromCache(donorId: string): void {
  try {
    const cached = getCachedLiveDonors();
    const filtered = cached.filter((d) => String(d.id) !== String(donorId));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

/**
 * Helper to update a donor's status in localStorage cache.
 * If the new status is not Active, it is removed from the active cache.
 */
export function updateDonorStatusInCache(donorId: string, newStatus: string): void {
  try {
    const cached = getCachedLiveDonors();
    const isNowActive = String(newStatus || "").trim().toUpperCase() === "ACTIVE" || newStatus === UserStatus.ACTIVE;
    if (isNowActive) {
      const updated = cached.map((d) => (String(d.id) === String(donorId) ? { ...d, status: UserStatus.ACTIVE } : d));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } else {
      const filtered = cached.filter((d) => String(d.id) !== String(donorId));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch {
    // ignore
  }
}

/**
 * Safely format or sanitize error messages to avoid leaking technical/internal errors
 * like "signal is aborted without reason" to the end user.
 */
export function cleanErrorMessage(msg: any): string {
  if (!msg) return "Server se rabta nahi ho saka";
  const str = typeof msg === "string" ? msg : String(msg?.message || "");
  const lower = str.toLowerCase();

  if (
    lower.includes("signal is aborted") ||
    lower.includes("aborted without reason") ||
    lower.includes("aborterror") ||
    lower.includes("the user aborted a request") ||
    lower.includes("timeout") ||
    lower.includes("failed to fetch") ||
    lower.includes("network request failed") ||
    lower.includes("load failed") ||
    lower.includes("networkerror")
  ) {
    return "Server der laga raha hai. Thori der baad koshish karein.";
  }

  return str;
}

/**
 * Send request to Google Apps Script Web App.
 * Uses text/plain to avoid CORS preflight (OPTIONS) issues with Google Apps Script.
 */
export async function fetchFromAppsScript(payload: any, timeoutMs: number = 12000): Promise<any> {
  const payloadWithToken = {
    token: API_TOKEN,
    ...payload
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(APPS_SCRIPT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payloadWithToken),
      redirect: "follow",
      signal: controller.signal
    });

    clearTimeout(timer);

    const rawText = await response.text();

    if (!rawText || !rawText.trim()) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawText);
      return parsed;
    } catch {
      return null;
    }
  } catch (err: any) {
    clearTimeout(timer);
    if (
      controller.signal.aborted ||
      err?.name === "AbortError" ||
      String(err?.message || "").toLowerCase().includes("abort") ||
      String(err?.message || "").toLowerCase().includes("signal")
    ) {
      const abortErr: any = new Error("Server der laga raha hai. Thori der baad koshish karein.");
      abortErr.name = "AbortError";
      abortErr.isTimeout = true;
      throw abortErr;
    }
    throw err;
  }
}

/**
 * Fetch total count of active registered donors from live API
 */
export async function getDonorsCount(): Promise<number> {
  try {
    const donors = await searchDonors("", "");
    return Array.isArray(donors) ? donors.length : 0;
  } catch {
    const cached = getCachedLiveDonors();
    return filterDonorsList(cached, "", "").length;
  }
}

/**
 * Query active donors with filters:
 * 1. Primary: Fast direct GET from Firebase Realtime Database (/public.json)
 * 2. Fallback: Google Apps Script Web App API
 * 3. Fallback: LocalStorage offline cache
 */
export async function searchDonors(
  bloodGroup: string,
  city: string
): Promise<Donor[]> {
  // 1. Primary source: Firebase Realtime Database (/public.json)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(FIREBASE_RTDB_PUBLIC_URL, {
      method: "GET",
      signal: controller.signal
    });

    clearTimeout(timer);

    if (response.ok) {
      const data = await response.json();
      if (data !== null && data !== undefined) {
        const donorsList = parseFirebaseDonors(data);
        const activeList = filterDonorsList(donorsList, "", "");
        if (!bloodGroup && !city) {
          // Always completely overwrite cache with fresh active list — never merge
          cacheLiveDonors(activeList);
        }
        return filterDonorsList(donorsList, bloodGroup, city);
      }
    }
  } catch {
    // Primary Firebase fetch failed or timed out, move to Apps Script fallback
  }

  // 2. Backup source: Google Apps Script API
  try {
    const res = await fetchFromAppsScript({
      action: "searchDonors",
      bloodGroup: bloodGroup || "",
      city: city || ""
    }, 10000);

    if (res && res.status === "success" && Array.isArray(res.donors)) {
      const activeList = filterDonorsList(res.donors, "", "");
      if (!bloodGroup && !city) {
        // Always completely overwrite cache with fresh active list — never merge
        cacheLiveDonors(activeList);
      }
      return filterDonorsList(res.donors, bloodGroup, city);
    }
    
    if (res && Array.isArray(res)) {
      return res;
    }
  } catch {
    // Apps Script fallback failed, move to offline localStorage cache
  }

  // 3. Last fallback: Offline localStorage cache
  const cached = getCachedLiveDonors();
  if (cached.length === 0) return [];

  return filterDonorsList(cached, bloodGroup, city);
}

/**
 * Securely registers a new donor via Google Apps Script.
 * Default status is 'Pending' awaiting admin approval.
 */
export async function registerDonor(donorData: Omit<Donor, "id"> & { password?: string }): Promise<Donor> {
  const generatedId = "donor_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
  const deviceId = generateDeviceFingerprint();

  const cleanPhone = String(donorData.primaryPhone || (donorData as any).phone || "").replace(/[^0-9]/g, "");

  const payload = {
    action: "register",
    donorId: generatedId,
    name: donorData.name,
    fatherName: donorData.fatherName,
    address: donorData.address,
    city: donorData.city,
    bloodGroup: donorData.bloodGroup,
    primaryPhone: cleanPhone,
    phone: cleanPhone,
    secondaryPhone: donorData.secondaryPhone || "",
    lastDonationDate: donorData.lastDonationDate || "",
    password: donorData.password || "",
    status: UserStatus.PENDING,
    deviceId: deviceId
  };

  const res = await fetchFromAppsScript(payload, 30000);

  if (res && (res.status === "fail" || res.status === "error")) {
    throw new Error(res.message || "Phone number already registered");
  }

  const newDonor: Donor = {
    ...donorData,
    id: (res && res.donorId) ? res.donorId : generatedId,
    status: UserStatus.PENDING,
    willingToDonate: true,
    registeredAt: donorData.registeredAt || Date.now()
  };

  const cached = getCachedLiveDonors();
  cacheLiveDonors([newDonor, ...cached]);

  return newDonor;
}

/**
 * Fetch a single donor record directly with status information
 */
export interface GetDonorResult {
  success: boolean;
  donor?: Donor;
  notFound?: boolean;
  error?: boolean;
}

export async function fetchDonorRecord(donorId: string): Promise<GetDonorResult> {
  if (!donorId) return { success: false, notFound: true };

  try {
    const res = await fetchFromAppsScript({
      action: "getDonor",
      donorId: donorId
    }, 10000);

    if (res && res.status === "success" && res.donor) {
      return {
        success: true,
        donor: {
          id: donorId,
          ...res.donor
        }
      };
    }

    if (
      res &&
      (
        res.status === "not_found" ||
        res.notFound === true ||
        ((res.status === "fail" || res.status === "error") &&
          (
            !res.message ||
            res.message.toLowerCase().includes("not found") ||
            res.message.toLowerCase().includes("no donor") ||
            res.message.toLowerCase().includes("nahi mila") ||
            res.message.toLowerCase().includes("invalid id") ||
            res.message.toLowerCase().includes("record not found")
          )
        )
      )
    ) {
      return { success: false, notFound: true };
    }

    return { success: false, error: true };
  } catch {
    return { success: false, error: true };
  }
}

/**
 * Fetch a single donor by ID
 */
export async function getDonorById(donorId: string): Promise<Donor | null> {
  const recordRes = await fetchDonorRecord(donorId);
  if (recordRes.success && recordRes.donor) {
    return recordRes.donor;
  }
  if (recordRes.notFound) {
    return null;
  }
  const cached = getCachedLiveDonors();
  return cached.find((d) => d.id === donorId) || null;
}

export interface AuthResult {
  success: boolean;
  donor?: Donor & { isAdmin?: boolean; isSuper?: boolean; password?: string };
  reason?: "offline" | "network" | "invalid_credentials" | "server_error";
}

/**
 * Authenticate Donor by phone and password.
 * Distinguishes offline, network timeout, invalid credentials, and server error.
 */
export async function authenticateDonor(
  phone: string,
  pass: string
): Promise<AuthResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { success: false, reason: "offline" };
  }

  const cleanTarget = String(phone || "").replace(/[^0-9]/g, "");

  try {
    const res = await fetchFromAppsScript({
      action: "login",
      phone: cleanTarget,
      primaryPhone: cleanTarget,
      password: pass
    }, 10000);

    if (res && res.status === "success") {
      const isSuper = cleanTarget === String(SUPER_ADMIN_PHONE || "").replace(/[^0-9]/g, "");
      const isAdmin = Boolean(res.isAdmin || isSuper);

      let baseDonor: Donor;

      if (res.donor) {
        baseDonor = {
          id: res.donorId || res.donor.id || `donor_${cleanTarget}`,
          ...res.donor
        };
      } else {
        const fetched = res.donorId ? await getDonorById(res.donorId) : null;
        if (fetched) {
          baseDonor = fetched;
        } else {
          baseDonor = {
            id: res.donorId || `donor_${cleanTarget}`,
            name: res.name || (isAdmin ? "Admin User" : "Blood Donor"),
            fatherName: res.fatherName || "",
            address: res.address || "District Ghotki",
            city: res.city || "Ghotki",
            bloodGroup: res.bloodGroup || "O+",
            primaryPhone: cleanTarget,
            secondaryPhone: res.secondaryPhone || "",
            lastDonationDate: res.lastDonationDate || "",
            status: res.status || UserStatus.ACTIVE,
            registeredAt: Date.now(),
            willingToDonate: true
          };
        }
      }

      return {
        success: true,
        donor: {
          ...baseDonor,
          isAdmin: isAdmin,
          isSuper: isSuper,
          password: pass
        }
      };
    } else if (res) {
      const msg = String(res.message || res.error || "").toLowerCase();
      const isCredError =
        res.status === "fail" ||
        res.status === "unauthorized" ||
        msg.includes("password") ||
        msg.includes("auth") ||
        msg.includes("incorrect") ||
        msg.includes("invalid") ||
        msg.includes("ghalat") ||
        msg.includes("not found") ||
        msg.includes("nahi mila");

      if (isCredError) {
        return { success: false, reason: "invalid_credentials" };
      }
      return { success: false, reason: "server_error" };
    } else {
      return { success: false, reason: "network" };
    }
  } catch (error) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return { success: false, reason: "offline" };
    }
    return { success: false, reason: "network" };
  }
}

export interface VerifySessionResult {
  valid: boolean;
  donor?: Donor;
  authFailed?: boolean;
  notFound?: boolean;
  networkError?: boolean;
  message?: string;
}

/**
 * Lightweight authenticated check verifying if a donor's session & password are still valid:
 * 1. Calls fetchDonorRecord: if notFound, returns notFound: true immediately (no fallback).
 * 2. If donor record exists, calls authenticateDonor with saved phone & password.
 *    - If invalid_credentials, returns authFailed: true (password was changed).
 *    - If network/offline/server_error, keeps session intact.
 */
export async function verifyDonorSession(
  donorId: string,
  phone: string,
  password: string
): Promise<VerifySessionResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { valid: false, networkError: true };
  }

  const cleanPhone = String(phone || "").replace(/[^0-9]/g, "");
  if (!cleanPhone || !password) {
    return { valid: false, authFailed: true, message: "Password badal gaya hai, dobara login karein" };
  }

  try {
    // 1. Fetch donor record first
    const recordRes = await fetchDonorRecord(donorId);

    // If donor is not found, honour it directly (account was deleted by admin)
    if (recordRes.notFound) {
      return { valid: false, notFound: true };
    }

    // If there was a network/server issue fetching the record, do nothing and keep the session
    if (!recordRes.success || !recordRes.donor) {
      return { valid: false, networkError: true };
    }

    const liveDonor = recordRes.donor;

    // 2. Since record exists, verify the session credentials with authenticateDonor (login action)
    const authRes = await authenticateDonor(cleanPhone, password);

    if (authRes.success && authRes.donor) {
      return {
        valid: true,
        donor: {
          ...liveDonor,
          ...authRes.donor
        }
      };
    }

    // If login fails specifically due to invalid credentials while record exists, password was changed
    if (authRes.reason === "invalid_credentials") {
      return {
        valid: false,
        authFailed: true,
        message: "Password badal gaya hai, dobara login karein"
      };
    }

    // If it fails for a network or server reason, do nothing and keep the session
    return {
      valid: true,
      donor: liveDonor
    };
  } catch {
    return { valid: false, networkError: true };
  }
}

export interface UpdateProfileResult {
  success: boolean;
  authFailed?: boolean;
  networkError?: boolean;
  message?: string;
  passwordChanged?: boolean;
}

/**
 * Secure profile edit update proxy:
 * 1. Calls updateProfile with profile fields
 * 2. When newPassword is provided, makes a second call to changePassword
 */
export async function updateDonorProfile(
  donorId: string,
  password: string,
  profile: any,
  newPassword?: string
): Promise<UpdateProfileResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { success: false, networkError: true, message: "Internet connection nahi hai" };
  }

  // Step 1: Update profile fields
  const payload: any = {
    action: "updateProfile",
    donorId: donorId,
    password: password,
    profile: profile
  };

  try {
    const res = await fetchFromAppsScript(payload, 10000);
    
    if (!res || res.status !== "success") {
      const msg = String(res?.message || res?.error || "").toLowerCase();
      if (
        res &&
        (res.status === "fail" || res.status === "unauthorized" ||
          msg.includes("password") ||
          msg.includes("auth") ||
          msg.includes("unauthorized") ||
          msg.includes("invalid") ||
          msg.includes("incorrect") ||
          msg.includes("ghalat"))
      ) {
        return { success: false, authFailed: true, message: res?.message || "Current password ghalat hai" };
      }

      if (!res) {
        return { success: false, networkError: true, message: "Server se rabta nahi ho saka" };
      }

      return { success: false, message: res?.message || "Profile update nahi ho saka" };
    }

    // Update local cache
    const cached = getCachedLiveDonors();
    const updated = cached.map((d) => (d.id === donorId ? { ...d, ...profile } : d));
    cacheLiveDonors(updated);

    // Step 2: If a new password was provided, make the second call to changePassword
    if (newPassword && newPassword.trim()) {
      const changePassRes = await fetchFromAppsScript({
        action: "changePassword",
        donorId: donorId,
        oldPassword: password,
        newPassword: newPassword.trim()
      }, 10000);

      if (changePassRes && changePassRes.status === "success") {
        return { success: true, passwordChanged: true };
      }

      const passMsg = String(changePassRes?.message || changePassRes?.error || "").toLowerCase();
      const isAuthIssue =
        changePassRes &&
        (changePassRes.status === "fail" ||
          changePassRes.status === "unauthorized" ||
          passMsg.includes("password") ||
          passMsg.includes("auth") ||
          passMsg.includes("incorrect") ||
          passMsg.includes("ghalat"));

      return {
        success: false,
        authFailed: isAuthIssue,
        message: changePassRes?.message || changePassRes?.error || "Password change nahi ho saka"
      };
    }

    return { success: true, passwordChanged: false };
  } catch (error) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return { success: false, networkError: true, message: "Internet connection nahi hai" };
    }
    return { success: false, networkError: true, message: "Server se rabta nahi ho saka" };
  }
}

/* =========================================================================
   ADMIN PANEL API METHODS
   ========================================================================= */

/**
 * Fetch overview statistics for Admin Panel
 */
export async function adminGetStats(
  adminPhone: string,
  adminPassword: string
): Promise<AdminStatsData | null> {
  try {
    const res = await fetchFromAppsScript({
      action: "adminStats",
      adminPhone: String(adminPhone || "").replace(/[^0-9]/g, ""),
      adminPassword: adminPassword
    }, 12000);

    if (res && res.status === "success" && res.stats) {
      return res.stats;
    } else if (res && res.total !== undefined) {
      return res as AdminStatsData;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch all registered donors in database
 */
export async function adminGetAllDonors(
  adminPhone: string,
  adminPassword: string
): Promise<Donor[] | null> {
  try {
    const res = await fetchFromAppsScript({
      action: "adminGetAll",
      adminPhone: String(adminPhone || "").replace(/[^0-9]/g, ""),
      adminPassword: adminPassword
    }, 15000);

    if (res && res.status === "success" && Array.isArray(res.donors)) {
      return res.donors;
    } else if (Array.isArray(res)) {
      return res;
    }

    const msg = String(res?.message || res?.error || "").toLowerCase();
    const isUnauth =
      res?.status === "unauthorized" ||
      msg.includes("unauthorized") ||
      (res?.status === "fail" && (msg.includes("admin") || msg.includes("credential") || msg.includes("auth") || msg.includes("password")));

    if (isUnauth) {
      return null;
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Approve a pending donor
 */
export async function adminApproveDonor(
  adminPhone: string,
  adminPassword: string,
  donorId: string
): Promise<boolean> {
  try {
    const res = await fetchFromAppsScript({
      action: "adminApprove",
      adminPhone: String(adminPhone || "").replace(/[^0-9]/g, ""),
      adminPassword: adminPassword,
      donorId: donorId
    }, 10000);

    if (res && res.status === "success") {
      updateDonorStatusInCache(donorId, UserStatus.ACTIVE);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Reject a donor registration
 */
export async function adminRejectDonor(
  adminPhone: string,
  adminPassword: string,
  donorId: string
): Promise<boolean> {
  try {
    const res = await fetchFromAppsScript({
      action: "adminReject",
      adminPhone: String(adminPhone || "").replace(/[^0-9]/g, ""),
      adminPassword: adminPassword,
      donorId: donorId
    }, 10000);

    if (res && res.status === "success") {
      updateDonorStatusInCache(donorId, UserStatus.REJECTED);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Set custom status for a donor (Active, Inactive, Pending, Rejected)
 */
export async function adminSetDonorStatus(
  adminPhone: string,
  adminPassword: string,
  donorId: string,
  newStatus: string
): Promise<boolean> {
  try {
    const res = await fetchFromAppsScript({
      action: "adminSetStatus",
      adminPhone: String(adminPhone || "").replace(/[^0-9]/g, ""),
      adminPassword: adminPassword,
      donorId: donorId,
      newStatus: newStatus
    }, 10000);

    if (res && res.status === "success") {
      updateDonorStatusInCache(donorId, newStatus);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Permanently delete a donor record
 */
export async function adminDeleteDonor(
  adminPhone: string,
  adminPassword: string,
  donorId: string
): Promise<boolean> {
  try {
    const res = await fetchFromAppsScript({
      action: "adminDelete",
      adminPhone: String(adminPhone || "").replace(/[^0-9]/g, ""),
      adminPassword: adminPassword,
      donorId: donorId
    }, 10000);

    if (res && res.status === "success") {
      removeDonorFromCache(donorId);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * List all registered admin accounts
 */
export async function adminListAdmins(
  adminPhone: string,
  adminPassword: string
): Promise<AdminRecord[]> {
  try {
    const res = await fetchFromAppsScript({
      action: "adminListAdmins",
      adminPhone: String(adminPhone || "").replace(/[^0-9]/g, ""),
      adminPassword: adminPassword
    }, 10000);

    if (res && res.status === "success" && Array.isArray(res.admins)) {
      return res.admins;
    } else if (Array.isArray(res)) {
      return res;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Add a new admin by phone number
 */
export async function adminAddAdmin(
  adminPhone: string,
  adminPassword: string,
  newAdminPhone: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetchFromAppsScript({
      action: "adminAddAdmin",
      adminPhone: String(adminPhone || "").replace(/[^0-9]/g, ""),
      adminPassword: adminPassword,
      newAdminPhone: String(newAdminPhone || "").replace(/[^0-9]/g, "")
    }, 10000);

    if (res && res.status === "success") {
      return { success: true, message: res.message || "Admin successfully add hogaya!" };
    }
    return { success: false, message: res?.message || "Admin add karne me issue aaya. Check karein ke number pehle se registered donor hai." };
  } catch (err: any) {
    return { success: false, message: cleanErrorMessage(err?.message) };
  }
}

/**
 * Remove an admin account
 */
export async function adminRemoveAdmin(
  adminPhone: string,
  adminPassword: string,
  removeAdminId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetchFromAppsScript({
      action: "adminRemoveAdmin",
      adminPhone: String(adminPhone || "").replace(/[^0-9]/g, ""),
      adminPassword: adminPassword,
      removeAdminId: removeAdminId
    }, 10000);

    if (res && res.status === "success") {
      return { success: true, message: res.message || "Admin remove hogaya." };
    }
    return { success: false, message: res?.message || "Admin remove nahi ho saka." };
  } catch (err: any) {
    return { success: false, message: cleanErrorMessage(err?.message) };
  }
}

/**
 * Reset a donor's password (Admin only)
 */
export async function adminResetPassword(
  adminPhone: string,
  adminPassword: string,
  donorId: string,
  newPassword: string
): Promise<{ success: boolean; message?: string; unauthorized?: boolean }> {
  try {
    const res = await fetchFromAppsScript({
      action: "adminResetPassword",
      adminPhone: String(adminPhone || "").replace(/[^0-9]/g, ""),
      adminPassword: adminPassword,
      donorId: donorId,
      newPassword: newPassword
    }, 12000);

    if (res && res.status === "success") {
      return { success: true, message: res.message || "Password reset ho gaya" };
    }

    const isUnauth = res?.status === "unauthorized" || 
      (typeof res?.message === "string" && res.message.toLowerCase().includes("unauthorized"));

    return {
      success: false,
      message: res?.message || "Password reset nahi ho saka",
      unauthorized: Boolean(isUnauth)
    };
  } catch {
    return { success: false, message: "Server se rabta nahi ho saka" };
  }
}

/**
 * Check if an Apps Script response indicates a password/auth error
 */
function isDonationAuthError(res: any): boolean {
  if (!res) return false;
  const msg = String(res.message || res.error || "").toLowerCase();
  return (
    res.status === "unauthorized" ||
    (res.status === "fail" &&
      (msg.includes("password") ||
        msg.includes("auth") ||
        msg.includes("unauthorized") ||
        msg.includes("incorrect") ||
        msg.includes("ghalat") ||
        msg.includes("invalid") ||
        msg.includes("login") ||
        msg.includes("session"))) ||
    msg.includes("password incorrect") ||
    msg.includes("password ghalat") ||
    msg.includes("unauthorized")
  );
}

/**
 * Load donation records for a donor
 * { action: "getDonations", donorId, password }
 */
export async function getDonationRecords(
  donorId: string,
  password: string
): Promise<{ success: boolean; donations?: DonationRecord[]; authFailed?: boolean; message?: string }> {
  try {
    const res = await fetchFromAppsScript({
      action: "getDonations",
      donorId,
      password
    }, 12000);

    if (res && res.status === "success") {
      const list = Array.isArray(res.donations) ? res.donations : [];
      return { success: true, donations: list };
    }

    if (isDonationAuthError(res)) {
      return { success: false, authFailed: true, message: res?.message || "Session expire ho gaya, dobara login karein" };
    }

    return { success: false, message: res?.message || "Donation records load nahi ho sake" };
  } catch {
    return { success: false, message: "Server se rabta nahi ho saka" };
  }
}

/**
 * Add a donation record for a donor
 * { action: "addDonation", donorId, password, date: "YYYY-MM-DD", place, forWhom, notes }
 */
export async function addDonationRecord(
  donorId: string,
  password: string,
  record: { date: string; place?: string; forWhom?: string; notes?: string }
): Promise<{ success: boolean; recordId?: string; lastDonationDate?: string; authFailed?: boolean; message?: string }> {
  try {
    const payload: any = {
      action: "addDonation",
      donorId,
      password,
      date: record.date
    };
    if (record.place && record.place.trim()) payload.place = record.place.trim();
    if (record.forWhom && record.forWhom.trim()) payload.forWhom = record.forWhom.trim();
    if (record.notes && record.notes.trim()) payload.notes = record.notes.trim();

    const res = await fetchFromAppsScript(payload, 12000);

    if (res && res.status === "success") {
      return {
        success: true,
        recordId: res.recordId,
        lastDonationDate: res.lastDonationDate || record.date
      };
    }

    if (isDonationAuthError(res)) {
      return { success: false, authFailed: true, message: res?.message || "Session expire ho gaya, dobara login karein" };
    }

    return { success: false, message: res?.message || "Record add nahi ho saka" };
  } catch {
    return { success: false, message: "Server se rabta nahi ho saka" };
  }
}

/**
 * Delete a donation record
 * { action: "deleteDonation", donorId, password, recordId }
 */
export async function deleteDonationRecord(
  donorId: string,
  password: string,
  recordId: string
): Promise<{ success: boolean; lastDonationDate?: string; authFailed?: boolean; message?: string }> {
  try {
    const res = await fetchFromAppsScript({
      action: "deleteDonation",
      donorId,
      password,
      recordId
    }, 12000);

    if (res && res.status === "success") {
      return {
        success: true,
        lastDonationDate: res.lastDonationDate
      };
    }

    if (isDonationAuthError(res)) {
      return { success: false, authFailed: true, message: res?.message || "Session expire ho gaya, dobara login karein" };
    }

    return { success: false, message: res?.message || "Record delete nahi ho saka" };
  } catch {
    return { success: false, message: "Server se rabta nahi ho saka" };
  }
}

