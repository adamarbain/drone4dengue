"use client"

import AdminSidebar from "@/components/AdminSidebar"
import AdminHeader from "@/components/AdminHeader"
import {
  FiDownload,
  FiFilter,
  FiCalendar,
  FiMapPin,
  FiFileText,
  FiBarChart2,
  FiTrendingUp,
  FiPieChart,
} from "react-icons/fi"
import { motion } from "framer-motion"
import { useState } from "react"

const areas = ["Universiti Malaya", "Damansara Utama", "Petaling Jaya", "Vista Angkasa"]
const dataTypes = ["Active Cases", "Total Cases", "Coverage Area"]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedLocation, setSelectedLocation] = useState("")
  const [selectedDataType, setSelectedDataType] = useState("")

  return (
    <div className="min-h-screen bg-[#FFF7E3] flex flex-row rounded-[24px] border-[8px] border-[#E2C275] overflow-hidden">
      <AdminSidebar current="Reports" />
      <main className="flex-1 flex flex-col">
        <AdminHeader />
        {/* Content */}
        <motion.section className="px-10 py-8" variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-8">
            <h1 className="text-3xl font-bold text-black mb-1">Report Generation</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#A21C1C]"></div>
              <div className="text-lg text-gray-600">Customize and generate data insights reports</div>
            </div>
          </motion.div>

          {/* Report Stats */}
          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: "Reports Generated", value: "156", icon: <FiFileText />, color: "bg-blue-500" },
              { label: "Data Points", value: "2.4K", icon: <FiBarChart2 />, color: "bg-green-500" },
              { label: "Export Formats", value: "4", icon: <FiDownload />, color: "bg-purple-500" },
              { label: "Accuracy Rate", value: "99.2%", icon: <FiTrendingUp />, color: "bg-orange-500" },
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                className="bg-white rounded-xl shadow-md overflow-hidden border border-[#E2C275]/30"
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 ${stat.color} rounded-lg text-white`}>{stat.icon}</div>
                  </div>
                  <div className="text-3xl font-bold mb-1">{stat.value}</div>
                  <div className="text-gray-500">{stat.label}</div>
                </div>
                <div className={`h-1 ${stat.color}`}></div>
              </motion.div>
            ))}
          </motion.div>

          {/* Filters */}
          <motion.div variants={item} className="mb-8">
            <div className="bg-white rounded-xl p-6 shadow-md border border-[#E2C275]/30">
              <div className="font-bold text-xl mb-4 flex items-center gap-2">
                <FiFilter className="text-[#A21C1C]" />
                Report Filters
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-black text-sm flex items-center gap-2">
                    <FiCalendar className="text-[#A21C1C]" size={16} />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#E2C275] focus:border-transparent"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-black text-sm flex items-center gap-2">
                    <FiCalendar className="text-[#A21C1C]" size={16} />
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#E2C275] focus:border-transparent"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-black text-sm flex items-center gap-2">
                    <FiMapPin className="text-[#A21C1C]" size={16} />
                    Location
                  </label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#E2C275]"
                  >
                    <option value="">Select Area</option>
                    {areas.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-black text-sm flex items-center gap-2">
                    <FiBarChart2 className="text-[#A21C1C]" size={16} />
                    Data Type
                  </label>
                  <select
                    value={selectedDataType}
                    onChange={(e) => setSelectedDataType(e.target.value)}
                    className="rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#E2C275]"
                  >
                    <option value="">Select Type</option>
                    {dataTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <button className="bg-[#A21C1C] text-white px-8 py-3 rounded-lg font-bold text-base hover:bg-[#7C1D1D] transition-all flex items-center gap-2 shadow-md">
                  <FiBarChart2 />
                  Generate Report
                </button>
                <button className="bg-white text-[#A21C1C] border border-[#A21C1C] px-8 py-3 rounded-lg font-bold text-base hover:bg-[#FFF7E3] transition-all">
                  Clear Filters
                </button>
              </div>
            </div>
          </motion.div>

          {/* Preview */}
          <motion.div variants={item} className="mb-8">
            <div className="font-bold text-xl mb-4">Report Preview</div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Overview Card */}
              <motion.div
                className="bg-white rounded-xl p-6 shadow-md border border-[#E2C275]/30"
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FiBarChart2 className="text-[#A21C1C]" />
                    Weekly Overview
                  </h3>
                  <FiTrendingUp className="text-green-500" />
                </div>
                <div className="w-full h-32 mb-4 bg-gradient-to-r from-[#FFF7E3] to-[#F3EAD8] rounded-lg flex items-end p-4">
                  {/* Enhanced bar chart */}
                  <svg width="100%" height="100%" viewBox="0 0 200 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="20" y="40" width="16" height="30" fill="#E2C275" rx="2" />
                    <rect x="44" y="30" width="16" height="40" fill="#E2C275" rx="2" />
                    <rect x="68" y="50" width="16" height="20" fill="#E2C275" rx="2" />
                    <rect x="92" y="20" width="16" height="50" fill="#A21C1C" rx="2" />
                    <rect x="116" y="35" width="16" height="35" fill="#E2C275" rx="2" />
                    <rect x="140" y="45" width="16" height="25" fill="#E2C275" rx="2" />
                  </svg>
                </div>
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-[#A21C1C]">20</div>
                  <div className="text-sm text-gray-500">Active Cases</div>
                  <div className="text-xs text-gray-400">Monday, April 22nd</div>
                </div>
                <button className="w-full bg-[#A21C1C] text-white py-2 rounded-lg font-bold hover:bg-[#7C1D1D] transition-colors">
                  View Details
                </button>
              </motion.div>

              {/* Total Dengue Cases Overview Card */}
              <motion.div
                className="bg-white rounded-xl p-6 shadow-md border border-[#E2C275]/30"
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FiPieChart className="text-[#A21C1C]" />
                    Cases Overview
                  </h3>
                  <FiTrendingUp className="text-green-500" />
                </div>
                <div className="w-full h-32 mb-4 bg-gradient-to-r from-[#FFF7E3] to-[#F3EAD8] rounded-lg flex items-end p-4">
                  {/* Enhanced area chart */}
                  <svg width="100%" height="100%" viewBox="0 0 320 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="80" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#A21C1C" stopOpacity="0.6" />
                        <stop offset="1" stopColor="#A21C1C" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,60 Q40,40 80,50 Q120,70 160,40 Q200,20 240,50 Q280,80 320,40 V80 H0 Z"
                      fill="url(#areaGrad)"
                    />
                    <path
                      d="M0,60 Q40,40 80,50 Q120,70 160,40 Q200,20 240,50 Q280,80 320,40"
                      stroke="#A21C1C"
                      strokeWidth="2"
                      fill="none"
                    />
                    <circle cx="80" cy="50" r="3" fill="#A21C1C" />
                    <circle cx="160" cy="40" r="3" fill="#A21C1C" />
                    <circle cx="240" cy="50" r="3" fill="#A21C1C" />
                  </svg>
                </div>
                <div className="flex justify-center gap-6 text-xs mb-4">
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>
                    Vista Angkasa
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-400"></span>
                    Petaling Jaya
                  </span>
                </div>
                <button className="w-full bg-[#A21C1C] text-white py-2 rounded-lg font-bold hover:bg-[#7C1D1D] transition-colors">
                  View Details
                </button>
              </motion.div>
            </div>
          </motion.div>

          {/* Export Options */}
          <motion.div variants={item} className="mb-8">
            <div className="bg-white rounded-xl p-6 shadow-md border border-[#E2C275]/30">
              <div className="font-bold text-xl mb-4 flex items-center gap-2">
                <FiDownload className="text-[#A21C1C]" />
                Export Options
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { format: "PDF", icon: <FiFileText />, color: "bg-red-500" },
                  { format: "CSV", icon: <FiBarChart2 />, color: "bg-green-500" },
                  { format: "XLSX", icon: <FiFileText />, color: "bg-blue-500" },
                  { format: "JSON", icon: <FiFileText />, color: "bg-purple-500" },
                ].map((option, idx) => (
                  <motion.button
                    key={option.format}
                    className="flex flex-col items-center gap-3 p-6 border border-gray-200 rounded-lg hover:border-[#E2C275] hover:bg-[#FFF7E3]/50 transition-all"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={`p-3 ${option.color} rounded-lg text-white`}>{option.icon}</div>
                    <span className="font-medium">Export as {option.format}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.section>
      </main>
    </div>
  )
}
