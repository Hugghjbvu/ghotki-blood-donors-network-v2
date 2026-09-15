import React from "react";
import { MapPin, Calendar, MessageCircle } from "lucide-react";
import { Donor, UserStatus } from "../types";

interface DonorCardProps {
  donor: Donor;
  onViewDetails: (donor: Donor) => void;
  index?: number;
}

function sanitizeWhatsAppPhone(phone: any): string {
  if (phone === null || phone === undefined) return "";
  let cleaned = String(phone).replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "92" + cleaned.substring(1);
  }
  return cleaned;
}

const DonorCard = React.memo(function DonorCard({ donor, onViewDetails, index = 0 }: DonorCardProps) {
  const cleanPhone = sanitizeWhatsAppPhone(donor.primaryPhone || (donor as any).phone);
  const isWilling = donor.willingToDonate !== false && donor.status === UserStatus.ACTIVE;
  const fatherName = donor.fatherName ? String(donor.fatherName).trim() : "";
  const address = donor.address ? String(donor.address).trim() : "";
  const lastDonation = donor.lastDonationDate ? String(donor.lastDonationDate).trim() : "";
  const staggerClass = index < 6 ? `list-stagger-${index}` : "list-stagger-none";

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-white/95 p-6 border transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between min-h-[195px] donor-card-contain list-item-enter ${staggerClass} ${
        isWilling ? "border-emerald-100" : "border-gray-200/80"
      }`}
    >
      <div>
        {/* Card Header information */}
        <div className="flex justify-between items-start gap-3 mb-2.5">
          <div className="min-w-0 flex-1 space-y-1">
            {/* Status Badge */}
            <div>
              {isWilling ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 border border-emerald-200 text-emerald-700 whitespace-nowrap shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Ready to Donate
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 border border-gray-200 text-gray-500 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  Busy / Temporary
                </span>
              )}
            </div>

            <h4 className="font-display font-bold text-base text-gray-900 group-hover:text-blood transition-colors break-words leading-snug pt-0.5">
              {donor.name}
            </h4>
            {fatherName ? (
              <p className="text-xs text-gray-400 break-words leading-normal">
                S/O: {fatherName}
              </p>
            ) : null}
          </div>
          
          {/* Blood group indicator */}
          <span className="h-10 w-10 shrink-0 select-none flex items-center justify-center rounded-xl bg-gradient-to-br from-blood to-blood-dark text-white font-display font-extrabold text-base shadow-sm group-hover:scale-105 transition-transform">
            {donor.bloodGroup}
          </span>
        </div>

        {/* Address / Location details */}
        <div className="space-y-1.5 text-xs text-gray-500 mt-2.5">
          <div className="flex items-start gap-1.5 text-left">
            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 flex flex-col items-start text-left">
              <span className="font-bold text-gray-900 leading-snug break-words block w-full text-left">
                {(donor.city || "").trim()}
              </span>
              {address ? (
                <span className="text-gray-500 text-xs leading-relaxed mt-0.5 break-words block w-full text-left">
                  {address}
                </span>
              ) : null}
            </div>
          </div>
          {lastDonation ? (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="break-words leading-normal">Last donation: <strong className="font-medium text-gray-700">{lastDonation}</strong></span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Footer action buttons: side by side in ONE row, equal width */}
      <div className="grid grid-cols-2 gap-2 mt-4 pt-3.5 border-t border-gray-100">
        {/* Detail Drawer Activator */}
        <button
          onClick={() => onViewDetails(donor)}
          className="w-full py-2 px-2.5 font-display text-xs font-bold text-gray-700 hover:text-blood bg-gray-50 hover:bg-rose-50 border border-gray-200 rounded-xl transition-colors cursor-pointer text-center whitespace-nowrap flex items-center justify-center btn-press"
        >
          More Details
        </button>

        {/* Main Contact action button */}
        <a
          href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
            `Assalam o Alaikum ${donor.name}, mujhe Ghotki Blood Donors Network se aapke blood (Group: ${donor.bloodGroup}) ki zaroorat hai. Please rabta karein.`
          )}`}
          target="_blank"
          rel="referrer noopener noreferrer"
          className="w-full py-2 px-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-display font-bold text-xs shadow-sm shadow-emerald-500/10 flex items-center justify-center gap-1.5 transition-transform text-center whitespace-nowrap btn-press"
        >
          <MessageCircle className="w-3.5 h-3.5 fill-white shrink-0" />
          <span>WhatsApp</span>
        </a>
      </div>
    </div>
  );
});

export default DonorCard;
