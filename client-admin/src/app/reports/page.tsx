"use client";

import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { FiSearch } from "react-icons/fi";
import Image from "next/image";

const sidebarLinks = [
  { label: "Dashboard" },
  { label: "User Management" },
  { label: "Drone Management" },
  { label: "Data Management" },
  { label: "Prediction & Alert" },
  { label: "Reports", active: true },
  { label: "Settings" },
];

const areas = ["Universiti Malaya", "Damansara Utama", "Petaling Jaya", "Vista Angkasa"];
const dataTypes = ["Active Cases", "Total Cases", "Coverage Area"];

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-[#FFF7E3] flex flex-row rounded-[24px] border-[8px] border-[#E2C275] overflow-hidden">
      <AdminSidebar current="Reports" />
      <main className="flex-1 flex flex-col">
        <AdminHeader />
        {/* Content */}
        <section className="px-10 py-6">
          <h1 className="text-3xl font-bold text-black mb-1">Report Generation</h1>
          <div className="text-xl text-gray-400 mb-6">Customize and report data insights.</div>
          {/* Filters */}
          <div className="mb-8">
            <div className="font-bold text-xl mb-3">Filters</div>
            <div className="flex gap-8 mb-4">
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-black">Start Date</label>
                <input type="text" placeholder="mm/dd/yyyy" className="rounded-lg border border-gray-400 px-4 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-[#E2C275]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-black">End Date</label>
                <input type="text" placeholder="mm/dd/yyyy" className="rounded-lg border border-gray-400 px-4 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-[#E2C275]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-black">Location</label>
                <select className="rounded-lg border border-gray-400 px-4 py-2 w-56 focus:outline-none focus:ring-2 focus:ring-[#E2C275]">
                  <option>Select Area</option>
                  {areas.map((area) => (
                    <option key={area}>{area}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-black">Data Type</label>
                <select className="rounded-lg border border-gray-400 px-4 py-2 w-56 focus:outline-none focus:ring-2 focus:ring-[#E2C275]">
                  <option>Select Type</option>
                  {dataTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-4 mb-6">
              <button className="bg-[#A21C1C] text-white px-8 py-2 rounded-lg font-bold text-base hover:bg-[#7C1D1D]">Generate Report</button>
              <button className="bg-[#E5E7EB] text-black px-8 py-2 rounded-lg font-bold text-base hover:bg-[#F3EAD8]">Clear filters</button>
            </div>
          </div>
          {/* Preview */}
          <div className="mb-8">
            <div className="font-bold text-xl mb-3">Preview</div>
            <div className="flex gap-8">
              {/* Weekly Overview Card */}
              <div className="bg-white rounded-xl p-6 flex flex-col items-center w-[260px] shadow">
                <div className="font-semibold text-black mb-2">Weekly Overview</div>
                <div className="w-full h-32 mb-2 flex items-end">
                  {/* Placeholder bar chart */}
                  <svg width="100%" height="100%" viewBox="0 0 200 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0" y="0" width="200" height="80" rx="12" fill="#F3EAD8" />
                    <rect x="20" y="40" width="16" height="30" fill="#E2C275" />
                    <rect x="44" y="30" width="16" height="40" fill="#E2C275" />
                    <rect x="68" y="50" width="16" height="20" fill="#E2C275" />
                    <rect x="92" y="20" width="16" height="50" fill="#A21C1C" />
                    <rect x="116" y="35" width="16" height="35" fill="#E2C275" />
                    <rect x="140" y="45" width="16" height="25" fill="#E2C275" />
                  </svg>
                </div>
                <div className="text-xs text-gray-500 mb-2">20 Active Cases<br />Monday, April 22nd</div>
                <button className="bg-[#E2C275] text-black px-6 py-2 rounded-lg font-bold text-base hover:bg-[#C9A74B]">Details</button>
              </div>
              {/* Total Dengue Cases Overview Card */}
              <div className="bg-white rounded-xl p-6 flex flex-col items-center w-[320px] shadow">
                <div className="font-semibold text-black mb-2">Total Dengue Cases Overview</div>
                <div className="w-full h-32 mb-2 flex items-end">
                  {/* Placeholder area chart */}
                  <svg width="100%" height="100%" viewBox="0 0 320 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0" y="0" width="320" height="80" rx="12" fill="#F3EAD8" />
                    <path d="M0,60 Q40,40 80,50 Q120,70 160,40 Q200,20 240,50 Q280,80 320,40 V80 H0 Z" fill="#A21C1C" fillOpacity="0.2" />
                    <path d="M0,60 Q40,40 80,50 Q120,70 160,40 Q200,20 240,50 Q280,80 320,40" stroke="#A21C1C" strokeWidth="2" fill="none" />
                  </svg>
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>Vista Angkasa</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-red-400"></span>Petaling Jaya</span>
                </div>
              </div>
            </div>
          </div>
          {/* Export Preview */}
          <div className="mb-8">
            <div className="font-bold text-xl mb-3">Export Preview</div>
            <div className="flex gap-4 flex-wrap">
              <button className="bg-[#A21C1C] text-white px-8 py-2 rounded-lg font-bold text-base hover:bg-[#7C1D1D]">Export as PDF</button>
              <button className="bg-[#E5E7EB] text-black px-8 py-2 rounded-lg font-bold text-base hover:bg-[#F3EAD8]">Export as CSV</button>
              <button className="bg-[#E5E7EB] text-black px-8 py-2 rounded-lg font-bold text-base hover:bg-[#F3EAD8]">Export as XLSX</button>
              <button className="bg-[#E5E7EB] text-black px-8 py-2 rounded-lg font-bold text-base hover:bg-[#F3EAD8]">Other export options</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
} 