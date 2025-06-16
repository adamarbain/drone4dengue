"use client"

import AdminSidebar from "@/components/AdminSidebar"
import AdminHeader from "@/components/AdminHeader"
import {
  FiSearch,
  FiUpload,
  FiDownload,
  FiFilter,
  FiMapPin,
  FiCalendar,
  FiActivity,
  FiTrendingUp,
  FiDatabase,
} from "react-icons/fi"
import Image from "next/image"
import { motion } from "framer-motion"
import { useState } from "react"
import type { JSX } from "react"

const dataRows = [
  {
    date: "13/05/2022",
    location: "Universiti Malaya",
    active: 0,
    total: 2,
    coverage: "2 KM Radius",
    status: "Completed",
  },
  {
    date: "22/05/2022",
    location: "Damansara Utama",
    active: 2,
    total: 21,
    coverage: "8 KM Radius",
    status: "Completed",
  },
  {
    date: "15/06/2022",
    location: "Petaling Jaya",
    active: 5,
    total: 30,
    coverage: "10 KM Radius",
    status: "Processing",
  },
  {
    date: "06/09/2022",
    location: "Vista Angkasa",
    active: 6,
    total: 20,
    coverage: "1 KM Radius",
    status: "Processing",
  },
]

const statusStyles: Record<string, string> = {
  Completed: "text-green-700 bg-green-100 border-green-200",
  Processing: "text-yellow-800 bg-yellow-100 border-yellow-200",
}

const statusIcons: Record<string, JSX.Element> = {
  Completed: <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>,
  Processing: <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></span>,
}

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

export default function DataManagementPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredData = dataRows.filter(
    (row) => row.location.toLowerCase().includes(searchTerm.toLowerCase()) || row.date.includes(searchTerm),
  )

  return (
    <div className="min-h-screen bg-[#FFF7E3] flex flex-row border-[8px] border-[#E2C275] overflow-hidden">
      <AdminSidebar current="Data Management" />
      <main className="flex-1 flex flex-col">
        <AdminHeader />   
        {/* Content */}
        <motion.section className="px-10 py-8" variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-8">
            <h1 className="text-3xl font-bold text-black mb-1">Data Management</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#A21C1C]"></div>
              <div className="text-lg text-gray-600">
                Manage data related to dengue cases including resource allocation
              </div>
            </div>
          </motion.div>

          {/* Data Overview Cards */}
          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: "Total Records", value: "1,250", icon: <FiDatabase />, color: "bg-blue-500" },
              { label: "Active Cases", value: "13", icon: <FiActivity />, color: "bg-red-500" },
              { label: "Locations Covered", value: "8", icon: <FiMapPin />, color: "bg-green-500" },
              { label: "Data Accuracy", value: "98.5%", icon: <FiTrendingUp />, color: "bg-purple-500" },
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

          {/* Upload Button */}
          <motion.div variants={item} className="mb-8">
            <button className="bg-[#A21C1C] text-white px-8 py-3 rounded-lg font-bold text-base hover:bg-[#7C1D1D] transition-all flex items-center gap-2 shadow-md">
              <FiUpload />
              Upload Data
            </button>
          </motion.div>

          {/* Data Filters */}
          <motion.div variants={item} className="mb-8">
            <div className="bg-white rounded-xl p-6 shadow-md border border-[#E2C275]/30">
              <div className="font-bold text-lg mb-4 flex items-center gap-2">
                <FiFilter className="text-[#A21C1C]" />
                Data Filters
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by location or date"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E2C275] focus:border-transparent"
                  />
                </div>
                <select className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E2C275]">
                  <option>All Locations</option>
                  <option>Universiti Malaya</option>
                  <option>Damansara Utama</option>
                  <option>Petaling Jaya</option>
                </select>
                <select className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E2C275]">
                  <option>All Status</option>
                  <option>Completed</option>
                  <option>Processing</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Data Table */}
          <motion.div variants={item} className="mb-10">
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-[#E2C275]/30">
              <div className="px-6 py-4 bg-[#F3EAD8] border-b border-[#E2C275]/30">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">Data Records</h3>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-[#A21C1C] text-white rounded-lg text-sm font-medium hover:bg-[#7C1D1D] transition-colors flex items-center gap-2">
                      <FiDownload size={16} />
                      Export
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="text-left text-black font-semibold text-base bg-gray-50 border-b border-gray-200">
                      <th className="py-4 px-6">Date</th>
                      <th className="py-4 px-6">Location</th>
                      <th className="py-4 px-6">Active Cases</th>
                      <th className="py-4 px-6">Total Cases</th>
                      <th className="py-4 px-6">Coverage Area</th>
                      <th className="py-4 px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((row, idx) => (
                      <motion.tr
                        key={row.date + row.location}
                        className={`border-b border-gray-100 last:border-0 hover:bg-[#FFF7E3]/50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-[#F9F6F2]"}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <td className="py-4 px-6 font-medium text-black flex items-center gap-2">
                          <FiCalendar className="text-[#A21C1C]" size={16} />
                          {row.date}
                        </td>
                        <td className="py-4 px-6 text-black flex items-center gap-2">
                          <FiMapPin className="text-[#A21C1C]" size={16} />
                          {row.location}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                              <span className="text-red-600 font-bold text-sm">{row.active}</span>
                            </div>
                            <span className="text-black">{row.active}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-bold text-sm">{row.total}</span>
                            </div>
                            <span className="text-black">{row.total}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-black">{row.coverage}</td>
                        <td className="py-4 px-6">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center w-fit ${statusStyles[row.status]}`}
                          >
                            {statusIcons[row.status]}
                            {row.status}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>

          {/* Historical Trends & Map */}
          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-md border border-[#E2C275]/30">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg">Historical Trends</h3>
                <FiTrendingUp className="text-[#A21C1C]" />
              </div>
              <div className="text-center mb-6">
                <div className="text-4xl font-extrabold text-[#A21C1C] mb-2">1,250</div>
                <div className="text-lg text-gray-500 mb-4">Total Dengue Cases</div>
              </div>
              {/* Enhanced chart placeholder */}
              <div className="w-full h-40 mb-6 bg-gradient-to-r from-[#FFF7E3] to-[#F3EAD8] rounded-lg flex items-end p-4">
                <svg width="100%" height="100%" viewBox="0 0 320 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="120" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#A21C1C" stopOpacity="0.8" />
                      <stop offset="1" stopColor="#A21C1C" stopOpacity="0.1" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,80 Q40,60 80,70 Q120,90 160,60 Q200,40 240,70 Q280,100 320,60 V120 H0 Z"
                    fill="url(#chartGrad)"
                  />
                  <path
                    d="M0,80 Q40,60 80,70 Q120,90 160,60 Q200,40 240,70 Q280,100 320,60"
                    stroke="#A21C1C"
                    strokeWidth="3"
                    fill="none"
                  />
                  <circle cx="80" cy="70" r="4" fill="#A21C1C" />
                  <circle cx="160" cy="60" r="4" fill="#A21C1C" />
                  <circle cx="240" cy="70" r="4" fill="#A21C1C" />
                </svg>
              </div>
              <button className="w-full bg-[#A21C1C] text-white py-3 rounded-lg font-bold text-base hover:bg-[#7C1D1D] transition-colors">
                View Detailed Analytics
              </button>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-[#E2C275]/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Coverage Map</h3>
                <FiMapPin className="text-[#A21C1C]" />
              </div>
              <div className="relative rounded-lg overflow-hidden mb-4">
                <Image
                  src="/images/map.png"
                  alt="Coverage Map"
                  width={400}
                  height={250}
                  className="w-full h-64 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg">
                  <div className="text-black font-semibold text-sm">Area: Kuala Lumpur</div>
                  <div className="text-gray-600 text-xs">8 locations monitored</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-[#FFF7E3] rounded-lg">
                  <div className="text-lg font-bold text-[#A21C1C]">85%</div>
                  <div className="text-xs text-gray-600">Coverage Rate</div>
                </div>
                <div className="text-center p-3 bg-[#FFF7E3] rounded-lg">
                  <div className="text-lg font-bold text-[#A21C1C]">24/7</div>
                  <div className="text-xs text-gray-600">Monitoring</div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.section>
      </main>
    </div>
  )
}
