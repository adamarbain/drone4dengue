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
import { useState, useEffect, useRef } from "react"
import type { JSX } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import dynamic from 'next/dynamic';

// If you see TypeScript errors for leaflet, run: npm install --save-dev @types/leaflet

const API_URL = "http://localhost:4000"

const statusStyles: Record<string, string> = {
  Completed: "text-green-700 bg-green-100 border-green-200",
  Processing: "text-yellow-800 bg-yellow-100 border-yellow-200",
}

const statusIcons: Record<string, JSX.Element> = {
  Completed: <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>,
  Processing: <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></span>,
}

// Helper: get token
const getToken = () => {
  const TOKEN = typeof window !== "undefined" ? localStorage.getItem("token") : null
  console.log("TOKEN: ", TOKEN)
  return TOKEN
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

const CoverageMap = dynamic(() => import('./CoverageMap'), { ssr: false });

export default function DataManagementPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [dataRows, setDataRows] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string>("All Locations")
  const [selectedStatus, setSelectedStatus] = useState<string>("All Status")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<string | null>(null)
  const [mapData, setMapData] = useState<any[]>([])
  const [historicalData, setHistoricalData] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  // Extract unique locations and statuses
  const uniqueLocations = [
    "All Locations",
    ...Array.from(new Set(dataRows.map((row) => row.location))).filter(Boolean),
  ]
  const uniqueStatuses = [
    "All Status",
    ...Array.from(new Set(dataRows.map((row) => row.status))).filter(Boolean),
  ]

  // Fetch data with filters
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        let url = `${API_URL}/dengue-data`;
        const params = [];
        if (selectedLocation && selectedLocation !== "All Locations") params.push(`location=${encodeURIComponent(selectedLocation)}`);
        if (selectedStatus && selectedStatus !== "All Status") params.push(`status=${encodeURIComponent(selectedStatus)}`);
        if (params.length) url += `?${params.join("&")}`;
        const [recordsRes, summaryRes] = await Promise.all([
          fetch(url),
          fetch(`${API_URL}/dengue-data/summary/dengue-data`, {
            headers: {
              Authorization: `Bearer ${getToken()}`
            }
          })
        ])
        if (!recordsRes.ok || !summaryRes.ok) throw new Error("Failed to fetch data")
        const records = await recordsRes.json()
        const summaryData = await summaryRes.json()
        setDataRows(records)
        setSummary(summaryData)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [selectedLocation, selectedStatus])

  useEffect(() => {
    async function fetchMapData() {
      try {
        const res = await fetch(`${API_URL}/dengue-data/map/location`, {
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        })
        if (res.ok) {
          setMapData(await res.json())
        }
      } catch {}
    }
    fetchMapData()
  }, [])

  useEffect(() => {
    async function fetchHistorical() {
      try {
        const res = await fetch(`${API_URL}/dengue-data/historical/dengue-data`, {
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        })
        if (res.ok) setHistoricalData(await res.json())
      } catch {}
    }
    fetchHistorical()
  }, [])

  const filteredData = dataRows.filter(
    (row) =>
      row.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.date && new Date(row.date).toLocaleDateString().includes(searchTerm))
  )

  // When filters/search change, reset currentPage to 1
  useEffect(() => { setCurrentPage(1); }, [selectedLocation, selectedStatus, searchTerm]);

  const totalRows = filteredData.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Export handler
  const onExport = () => {
    let url = `${API_URL}/dengue-data/export`;
    const params = [];
    if (selectedLocation && selectedLocation !== "All Locations") params.push(`location=${encodeURIComponent(selectedLocation)}`);
    if (selectedStatus && selectedStatus !== "All Status") params.push(`status=${encodeURIComponent(selectedStatus)}`);
    if (params.length) url += `?${params.join("&")}`;
    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'dengue_data_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const onUploadClick = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadMsg(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API_URL}/dengue-data/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      })
      if (!res.ok) throw new Error('Upload failed')
      const result = await res.json()
      setUploadMsg(`Imported: ${result.imported}, Errors: ${result.errors.length}`)
      // Refetch data
      let url = `${API_URL}/dengue-data`;
      const params = [];
      if (selectedLocation && selectedLocation !== "All Locations") params.push(`location=${encodeURIComponent(selectedLocation)}`);
      if (selectedStatus && selectedStatus !== "All Status") params.push(`status=${encodeURIComponent(selectedStatus)}`);
      if (params.length) url += `?${params.join("&")}`;
      const [recordsRes, summaryRes] = await Promise.all([
        fetch(url),
        fetch(`${API_URL}/dengue-data/summary/dengue-data`, {
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        })
      ])
      if (recordsRes.ok && summaryRes.ok) {
        setDataRows(await recordsRes.json())
        setSummary(await summaryRes.json())
      }
    } catch (e: any) {
      setUploadMsg(e.message)
    } finally {
      setUploading(false)
    }
  }

  function HistoricalTrendsChart() {
    return (
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={historicalData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="totalCases" stroke="#A21C1C" strokeWidth={2} name="Total Cases" />
          <Line type="monotone" dataKey="activeCases" stroke="#2563eb" strokeWidth={2} name="Active Cases" />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-600">Error: {error}</div>;
  }

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
            {summary && [
              { label: "Total Records", value: summary.totalRecords, icon: <FiDatabase />, color: "bg-blue-500" },
              { label: "Active Cases", value: summary.activeCases, icon: <FiActivity />, color: "bg-red-500" },
              { label: "Locations Covered", value: summary.locationsCovered, icon: <FiMapPin />, color: "bg-green-500" },
              { label: "Data Accuracy", value: `${summary.dataAccuracy}%`, icon: <FiTrendingUp />, color: "bg-purple-500" },
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
            <button
              className={`bg-[#A21C1C] text-white px-8 py-3 rounded-lg font-bold text-base hover:bg-[#7C1D1D] transition-all flex items-center gap-2 shadow-md ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={onUploadClick}
              disabled={uploading}
            >
              <FiUpload />
              Upload Data
            </button>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={onFileChange}
            />
            {uploadMsg && (
              <div className="mt-2 text-sm text-gray-700">{uploadMsg}</div>
            )}
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
                <select
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E2C275]"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                >
                  {uniqueLocations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
                <select
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E2C275]"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  {uniqueStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
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
                    <button className="px-4 py-2 bg-[#A21C1C] text-white rounded-lg text-sm font-medium hover:bg-[#7C1D1D] transition-colors flex items-center gap-2" onClick={onExport}>
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
                      <th className="py-4 px-6">Active Cases</th>
                      <th className="py-4 px-6">Total Cases</th>
                      <th className="py-4 px-6">Coverage Area</th>
                      <th className="py-4 px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((row, idx) => (
                      <motion.tr
                        key={row.id || row.date + row.location}
                        className={`border-b border-gray-100 last:border-0 hover:bg-[#FFF7E3]/50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-[#F9F6F2]"}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <td className="py-4 px-6 font-medium text-black flex items-center gap-2">
                          <FiCalendar className="text-[#A21C1C]" size={16} />
                          {row.date ? new Date(row.date).toLocaleDateString("en-GB") : "-"}
                        </td>
                        <td className="py-4 px-6 text-black flex items-center gap-2">
                          <FiMapPin className="text-[#A21C1C]" size={16} />
                          {row.location}
                        </td>
                        <td className="py-4 px-6">
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 font-bold text-sm">{row.activeCases}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-sm">{row.totalCases !== null && row.totalCases !== undefined ? row.totalCases : "-"}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-black">{row.coverageArea}</td>
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
              <div className="flex justify-center items-center gap-2 mt-4">
                <button
                  className="px-3 py-1 rounded bg-gray-200"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="px-3 py-1 rounded bg-gray-200"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
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
              <HistoricalTrendsChart />
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
                <CoverageMap mapData={mapData} />
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
