"use client";

import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { FiSearch } from "react-icons/fi";
import Image from "next/image";

const sidebarLinks = [
  { label: "Dashboard" },
  { label: "User Management" },
  { label: "Drone Management" },
  { label: "Data Management", active: true },
  { label: "Prediction & Alert" },
  { label: "Reports" },
  { label: "Settings" },
];

const dataRows = [
  { date: "13/05/2022", location: "Universiti Malaya", active: 0, total: 2, coverage: "2 KM Radius", status: "Completed" },
  { date: "22/05/2022", location: "Damansara Utama", active: 2, total: 21, coverage: "8 KM Radius", status: "Completed" },
  { date: "15/06/2022", location: "Petaling Jaya", active: 5, total: 30, coverage: "10 KM Radius", status: "Processing" },
  { date: "06/09/2022", location: "Vista Angkasa", active: 6, total: 20, coverage: "1 KM Radius", status: "Processing" },
];

const statusStyles: Record<string, string> = {
  "Completed": "text-green-700 bg-green-100",
  "Processing": "text-yellow-800 bg-yellow-100",
};

export default function DataManagementPage() {
  return (
    <div className="min-h-screen bg-[#FFF7E3] flex flex-row rounded-[24px] border-[8px] border-[#E2C275] overflow-hidden">
      <AdminSidebar current="Data Management" />
      <main className="flex-1 flex flex-col">
        <AdminHeader />
        {/* Content */}
        <section className="px-10 py-6">
          <h1 className="text-3xl font-bold text-black mb-1">Data Management</h1>
          <div className="text-xl text-gray-400 mb-6">Manage data related to dengue cases including resource allocation</div>
          {/* Upload Button */}
          <div className="mb-8">
            <button className="bg-[#A21C1C] text-white px-8 py-3 rounded-lg font-bold text-base hover:bg-[#7C1D1D]">Upload Data</button>
          </div>
          {/* Data Filters */}
          <div className="mb-6">
            <div className="font-bold text-xl mb-3">Data filters</div>
            <input
              type="text"
              placeholder="Search for Data by its location or Date"
              className="rounded-lg border border-gray-400 px-4 py-2 w-full max-w-xl focus:outline-none focus:ring-2 focus:ring-[#E2C275]"
            />
          </div>
          {/* Data Table */}
          <div className="mb-10">
            <table className="min-w-full bg-white rounded-xl">
              <thead>
                <tr className="text-left text-black font-semibold text-base bg-[#F3EAD8]">
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6">Location</th>
                  <th className="py-3 px-6">Active Cases</th>
                  <th className="py-3 px-6">Total Cases</th>
                  <th className="py-3 px-6">Coverage Area</th>
                  <th className="py-3 px-6">Status</th>
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, idx) => (
                  <tr key={row.date + row.location} className={idx % 2 === 0 ? "bg-white" : "bg-[#F9F6F2]"}>
                    <td className="py-3 px-6 font-medium text-black">{row.date}</td>
                    <td className="py-3 px-6 text-black">{row.location}</td>
                    <td className="py-3 px-6 text-black">{row.active}</td>
                    <td className="py-3 px-6 text-black">{row.total}</td>
                    <td className="py-3 px-6 text-black">{row.coverage}</td>
                    <td className="py-3 px-6">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusStyles[row.status]}`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Historical Trends & Map */}
          <div className="flex gap-8">
            <div className="bg-white rounded-xl p-8 flex flex-col items-center w-[400px] shadow">
              <div className="text-4xl font-extrabold text-[#A21C1C] mb-2">1250</div>
              <div className="text-lg text-gray-500 mb-4">Total Dengue Cases</div>
              {/* Placeholder for chart */}
              <div className="w-full h-40 mb-4 flex items-end">
                <svg width="100%" height="100%" viewBox="0 0 320 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0" y="0" width="320" height="120" rx="16" fill="#F3EAD8" />
                  <path d="M0,80 Q40,60 80,70 Q120,90 160,60 Q200,40 240,70 Q280,100 320,60" stroke="#A21C1C" strokeWidth="3" fill="url(#grad)" />
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="120" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#A21C1C" stopOpacity="0.5" />
                      <stop offset="1" stopColor="#A21C1C" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <button className="bg-[#A21C1C] text-white px-8 py-2 rounded-lg font-bold text-base hover:bg-[#7C1D1D]">Details</button>
            </div>
            <div className="flex flex-col items-center">
              <Image
                src="/images/map.png"
                alt="Map"
                width={300}
                height={200}
                className="rounded-xl object-cover mb-2"
              />
              <div className="text-black font-semibold">Area : Kuala Lumpur</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
} 