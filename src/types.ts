/**
 * Types and interfaces for the Ghotki Blood Donors Network.
 */

export enum UserStatus {
  ACTIVE = "Active",
  PENDING = "Pending",
  INACTIVE = "Inactive",
  REJECTED = "Rejected",
}

export interface Donor {
  id?: string;
  name: string;
  fatherName: string;
  address: string;
  city: string;
  bloodGroup: string;
  primaryPhone: string;
  secondaryPhone?: string;
  lastDonationDate?: string;
  password?: string;
  status: UserStatus | string;
  registeredAt: number;
  willingToDonate?: boolean;
  isAdmin?: boolean;
  isSuper?: boolean;
}

export interface DonationRecord {
  id: string;
  date: string;
  place?: string;
  forWhom?: string;
  notes?: string;
  addedAt?: number | string;
}

export interface AdminStatsData {
  total: number;
  active: number;
  pending: number;
  inactive: number;
  rejected: number;
  byBloodGroup?: Record<string, number>;
  byCity?: Record<string, number>;
}

export interface AdminRecord {
  id?: string;
  phone: string;
  isSuper?: boolean;
}

export type AppView = "LANDING" | "REGISTER" | "LOGIN" | "DASHBOARD" | "ADMIN";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

export const GHOTKI_CITIES = [
  "Ghotki",
  "Mirpur Mathelo",
  "Daharki",
  "Khan Pur Mahar",
  "Ubauro",
  "Other"
];

export const BLOOD_GROUPS = [
  "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"
];
