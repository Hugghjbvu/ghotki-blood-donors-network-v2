import React, { useState } from "react";
import { 
  ArrowLeft, 
  Search, 
  MessageCircle, 
  Droplet, 
  Users, 
  RotateCcw
} from "lucide-react";
import { Donor, BLOOD_GROUPS, GHOTKI_CITIES } from "../types";
import CustomSelect from "./CustomSelect";
import FloatingLabelInput from "./FloatingLabelInput";
import DonorCard from "./DonorCard";

interface EmergencyBloodRequestProps {
  donors: Donor[];
  onViewDetails: (donor: Donor) => void;
  onBack: () => void;
  adminWhatsAppPhone?: string;
}

export default function EmergencyBloodRequest({
  donors,
  onViewDetails,
  onBack,
  adminWhatsAppPhone = "923352213351"
}: EmergencyBloodRequestProps) {
  const [bloodGroup, setBloodGroup] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [patientName, setPatientName] = useState<string>("");
  const [hospital, setHospital] = useState<string>("");
  const [bottles, setBottles] = useState<string>("");
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ bloodGroup?: string; city?: string }>({});

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { bloodGroup?: string; city?: string } = {};

    if (!bloodGroup.trim()) {
      newErrors.bloodGroup = "Blood group chunein";
    }
    if (!city.trim()) {
      newErrors.city = "Taluka chunein";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setHasSearched(true);
  };

  const handleResetFilters = () => {
    setBloodGroup("");
    setCity("");
    setPatientName("");
    setHospital("");
    setBottles("");
    setHasSearched(false);
    setErrors({});
  };

  // Filter donors by exact blood group and exact city
  const matchingDonors = donors.filter((donor) => {
    if (!bloodGroup || !city) return false;
    const matchesBlood = donor.bloodGroup.trim().toUpperCase() === bloodGroup.trim().toUpperCase();
    const matchesCity = (donor.city || "").trim().toLowerCase() === city.trim().toLowerCase();
    return matchesBlood && matchesCity;
  });

  // Construct dynamic prefilled WhatsApp message template
  const getCustomWhatsAppText = (donor: Donor) => {
    let msg = `*EMERGENCY BLOOD REQUEST*\n`;
    msg += `Assalam o Alaikum ${donor.name},\n`;
    msg += `Mujhe foran *${bloodGroup}* blood ki sakht zaroorat hai.\n`;
    msg += `Ilaqa: *${city}*\n`;
    if (patientName.trim()) {
      msg += `Mareez: *${patientName.trim()}*\n`;
    }
    if (hospital.trim()) {
      msg += `Hospital / Jagah: *${hospital.trim()}*\n`;
    }
    if (bottles.trim()) {
      msg += `Bottles: *${bottles.trim()}*\n`;
    }
    msg += `\nAap Ghotki Blood Network par registered hain, baraye meherbani foran rabta karein. JazakAllah!`;
    return msg;
  };

  const adminWhatsAppUrl = `https://wa.me/${adminWhatsAppPhone}?text=${encodeURIComponent(
    `*EMERGENCY BLOOD NEEDED*\nBlood Group: ${bloodGroup || "Not specified"}\nTaluka: ${city || "Not specified"}${
      patientName.trim() ? `\nMareez: ${patientName.trim()}` : ""
    }${hospital.trim() ? `\nHospital: ${hospital.trim()}` : ""}${
      bottles.trim() ? `\nBottles: ${bottles.trim()}` : ""
    }\nBaraye meherbani kisi dastyab donor se rabta karwayein.`
  )}`;

  return (
    <div className="max-w-2xl mx-auto view-transition-enter space-y-5">
      {/* Main Request Form Card */}
      <div className="glass-panel p-5 sm:p-7 rounded-3xl border border-white/60 shadow-xl relative overflow-visible">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blood to-gold rounded-t-3xl" />

        {/* Header row: back arrow icon button on left + single-line heading */}
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Wapis"
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-xs flex items-center justify-center shrink-0 transition-all btn-press cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-lg sm:text-xl font-display font-extrabold text-gray-900 tracking-tight whitespace-nowrap">
            Emergency Request
          </h2>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          {/* Required Dropdowns Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <CustomSelect
                label="Blood Group"
                value={bloodGroup}
                onChange={(val) => {
                  setBloodGroup(val);
                  if (errors.bloodGroup) setErrors((prev) => ({ ...prev, bloodGroup: undefined }));
                }}
                options={BLOOD_GROUPS.map((g) => ({ value: g, label: `Group: ${g}` }))}
                placeholder="Blood group chunein"
              />
              {errors.bloodGroup && (
                <p className="text-xs text-blood font-bold mt-1 pl-1">{errors.bloodGroup}</p>
              )}
            </div>

            <div>
              <CustomSelect
                label="Taluka / City"
                value={city}
                onChange={(val) => {
                  setCity(val);
                  if (errors.city) setErrors((prev) => ({ ...prev, city: undefined }));
                }}
                options={GHOTKI_CITIES.map((c) => ({ value: c, label: c }))}
                placeholder="Taluka chunein"
              />
              {errors.city && (
                <p className="text-xs text-blood font-bold mt-1 pl-1">{errors.city}</p>
              )}
            </div>
          </div>

          {/* Optional Details Section */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 pl-1 whitespace-nowrap">
              Mazeed maloomat (Optional)
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FloatingLabelInput
                id="emergencyPatientName"
                label="Mareez ka naam"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
              />

              <FloatingLabelInput
                id="emergencyHospital"
                label="Hospital / Jagah"
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
              />

              <FloatingLabelInput
                id="emergencyBottles"
                label="Bottles"
                value={bottles}
                onChange={(e) => setBottles(e.target.value)}
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-blood to-blood-dark text-white rounded-xl font-display font-extrabold text-sm shadow-md hover:shadow-blood/20 transition-all flex items-center justify-center gap-2 cursor-pointer btn-press whitespace-nowrap"
            >
              <Search className="w-4 h-4 shrink-0" />
              <span>Donors Dhoondein</span>
            </button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      {hasSearched && (
        <div className="space-y-4 pt-2">
          {/* Results Header */}
          <div className="flex items-center justify-between gap-2 border-b border-gray-200/60 pb-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-display font-extrabold text-base text-gray-900 flex items-center gap-1.5 whitespace-nowrap">
                <Droplet className="w-4 h-4 text-blood shrink-0" />
                <span>Matching Donors</span>
              </h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">
                {city}: <strong className="text-gray-800">{bloodGroup}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs bg-rose-50 border border-rose-100 text-blood font-black px-2.5 py-1 rounded-lg whitespace-nowrap">
                {matchingDonors.length} {matchingDonors.length === 1 ? "donor" : "donors"}
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-gray-500 hover:text-blood font-bold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50/50 transition-colors btn-press cursor-pointer whitespace-nowrap"
                title="Reset"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {matchingDonors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {matchingDonors.map((donor, index) => (
                <DonorCard
                  key={donor.id || `emergency_${donor.primaryPhone || index}`}
                  donor={donor}
                  onViewDetails={onViewDetails}
                  index={index}
                  customWhatsAppText={getCustomWhatsAppText(donor)}
                />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="glass-panel p-6 sm:p-7 rounded-2xl sm:rounded-3xl border border-gray-200/80 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Users className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h4 className="font-display font-black text-base text-gray-900 whitespace-nowrap">
                  Koi donor nahi mila
                </h4>
                <p className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed font-medium">
                  {city} mein abhi {bloodGroup} ka koi active donor nahi hai.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCity("");
                    setHasSearched(false);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl font-display font-bold text-xs shadow-xs transition-all btn-press cursor-pointer whitespace-nowrap"
                >
                  Doosra taluka try karein
                </button>

                <a
                  href={adminWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl font-display font-extrabold text-xs shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5 transition-all btn-press whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4 fill-white shrink-0" />
                  <span>Admin se rabta karein</span>
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
