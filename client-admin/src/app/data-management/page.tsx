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
  FiChevronRight,
} from "react-icons/fi"
import Image from "next/image"
import { motion } from "framer-motion"
import { useState, useEffect, useRef } from "react"
import type { JSX } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import dynamic from 'next/dynamic';
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

// If you see TypeScript errors for leaflet, run: npm install --save-dev @types/leaflet

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

const statusStyles: Record<string, string> = {
  Completed: "text-green-700 bg-green-100 border-green-200",
  Processing: "text-yellow-800 bg-yellow-100 border-yellow-200",
  "Active Cases": "text-blue-700 bg-blue-100 border-blue-200",
  Hotspot: "text-red-700 bg-red-100 border-red-200",
}

const statusIcons: Record<string, JSX.Element> = {
  Completed: <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>,
  Processing: <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></span>,
  "Active Cases": <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>,
  Hotspot: <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2"></span>,
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
  const { companyId } = useAuth()
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
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const rowsPerPage = 20;

  // Extract unique locations and statuses from dataRows (now used for filters dropdown)
  // We'll also fetch these separately or keep them updated
  const [uniqueLocations, setUniqueLocations] = useState<string[]>(["All Locations"])
  const uniqueStatuses = ["All Type", "Active Cases", "Hotspot", "Completed", "Processing"];

  // Fetch unique locations for filter
  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const res = await fetch(`${API_URL}/dengue-data/locations`);
        if (res.ok) {
          const locations = await res.json();
          setUniqueLocations(["All Locations", ...locations]);
        }
      } catch (err) {
        console.error("Failed to fetch locations for filter:", err);
      }
    }
    fetchFilterOptions();
  }, []);

  // Fetch data with filters and pagination
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        let url = `${API_URL}/dengue-data?page=${currentPage}&limit=${rowsPerPage}`;
        if (selectedLocation && selectedLocation !== "All Locations") url += `&location=${encodeURIComponent(selectedLocation)}`;
        if (selectedStatus && selectedStatus !== "All Status" && selectedStatus !== "All Type") url += `&status=${encodeURIComponent(selectedStatus)}`;
        if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`; // If backend supports search

        const [recordsRes, summaryRes] = await Promise.all([
          fetch(url, {
            headers: {
              Authorization: `Bearer ${getToken()}`
            }
          }),
          fetch(`${API_URL}/dengue-data/summary/dengue-data`, {
            headers: {
              Authorization: `Bearer ${getToken()}`
            }
          })
        ])
        if (!recordsRes.ok || !summaryRes.ok) throw new Error("Failed to fetch data")
        
        const recordsData = await recordsRes.json()
        const summaryData = await summaryRes.json()
        
        setDataRows(recordsData.data || [])
        setTotalPages(recordsData.pagination?.totalPages || 1)
        setTotalRows(recordsData.pagination?.total || 0)
        setSummary(summaryData)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [selectedLocation, selectedStatus, currentPage, searchTerm])

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

  // When filters/search change, reset currentPage to 1
  useEffect(() => { setCurrentPage(1); }, [selectedLocation, selectedStatus, searchTerm]);

  const paginatedData = dataRows;

  // Export handler
  const onExport = () => {
    let url = `${API_URL}/dengue-data/export`;
    const params = [];
    if (selectedLocation && selectedLocation !== "All Locations") params.push(`location=${encodeURIComponent(selectedLocation)}`);
    if (selectedStatus && selectedStatus !== "All Status" && selectedStatus !== "All Type") params.push(`status=${encodeURIComponent(selectedStatus)}`);
    if (searchTerm) params.push(`search=${encodeURIComponent(searchTerm)}`);
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
        fetch(url, {
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        }),
        fetch(`${API_URL}/dengue-data/summary/dengue-data`, {
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        })
      ])
      if (recordsRes.ok && summaryRes.ok) {
        const recordsData = await recordsRes.json();
        setDataRows(recordsData.data || []);
        setTotalPages(recordsData.pagination?.totalPages || 1);
        setTotalRows(recordsData.pagination?.total || 0);
        setSummary(await summaryRes.json());
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
          <Line type="monotone" dataKey="activeCases" stroke="#2563eb" strokeWidth={2} name="Active Cases" />
          <Line type="monotone" dataKey="hotspotCount" stroke="#4988C4" strokeWidth={2} name="Hotspot Detected" />
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
    <div className="min-h-screen bg-[#FFF7E3] flex flex-row  overflow-hidden">
      <AdminSidebar current="Data Management" />
      <main className="flex-1 flex flex-col">
        <AdminHeader />   
        {/* Content */}
        <motion.section className="px-10 py-8" variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-8">
            <h1 className="text-3xl font-bold text-primary-dark mb-1">Data Management</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent-blue"></div>
              <div className="text-lg text-gray-600">
                View and Analyze data related to dengue cases
              </div>
            </div>
          </motion.div>

          {/* Data Overview Cards */}
          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {summary && [
              { label: "Total Records", value: summary.totalRecords, icon: <FiDatabase />, color: "bg-blue-500" },
              { label: "Active Cases", value: summary.activeCases, icon: <FiActivity />, color: "bg-blue-600" },
              { label: "Dengue Hotspots", value: summary.hotspotCount, icon: <FiTrendingUp />, color: "bg-purple-500" },
              { label: "Locations Covered", value: summary.locationsCovered, icon: <FiMapPin />, color: "bg-green-500" },
            ].map((stat) => (
              <Card key={stat.label} className="border-accent-blue/30 bg-white">
                <CardHeader className="flex-row items-center justify-between">
                  <div className={`p-3 ${stat.color} rounded-lg text-white`}>{stat.icon}</div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-1">{stat.value}</div>
                  <CardTitle className="text-sm font-medium text-gray-500">{stat.label}</CardTitle>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Upload Button */}
          {/* <motion.div variants={item} className="mb-8">
            <button
              className={`bg-accent-blue text-white px-8 py-3 rounded-lg font-bold text-base hover:bg-secondary-blue transition-all flex items-center gap-2 shadow-md ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
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
          </motion.div> */}

          {/* Data Filters */}
          <motion.div variants={item} className="mb-8">
            <div className="bg-white rounded-xl p-6 shadow-md border border-accent-blue/30">
              <div className="font-bold text-lg mb-4 flex items-center gap-2">
                <FiFilter className="text-accent-blue" />
                Data Filters
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by location or date"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
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
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
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
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-accent-blue/30">
              <div className="px-6 py-4 bg-light-bg border-b border-accent-blue/30">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">Data Records</h3>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-secondary-blue transition-colors flex items-center gap-2" onClick={onExport}>
                      <FiDownload size={16} />
                      Export
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="text-left text-primary-dark font-semibold text-base bg-gray-50 border-b border-gray-200">
                      <th className="py-4 px-6">Date & Location</th>
                      <th className="py-4 px-6">Active/Total Cases</th>
                      <th className="py-4 px-6">Cumulative Duration</th>
                      <th className="py-4 px-6">Type</th>
                      <th className="py-4 px-6">Latitude & Longtitude</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((row, idx) => (
                      <motion.tr
                        key={row.id || row.date + row.location}
                        className={`border-b border-gray-100 last:border-0 hover:bg-light-bg/50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}` }
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <td className="py-4 px-6 font-medium text-primary-dark flex items-center gap-2">
                          <FiCalendar className="text-accent-blue" size={16} />
                          {row.date ? new Date(row.date).toLocaleDateString("en-GB") : "-"}
                        </td>
                        <td className="py-4 px-6 text-primary-dark flex items-center gap-2">
                          <FiMapPin className="text-accent-blue" size={16} />
                          {row.location}
                        </td>
                        <td className="py-4 px-6">
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 font-bold text-sm">{row.activeCases}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {row.status === 'Active Cases' ? (
                            <span className="text-gray-500">N/A</span>
                          ) : (
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-bold text-sm">{row.days_duration}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-primary-dark">{row.status || '-'}</td>
                        <td className="py-4 px-6 text-primary-dark">
                          <div className="flex flex-col">
                            <span>{row.latitude !== null && row.latitude !== undefined ? row.latitude : '-'}</span>
                            <span>{row.longitude !== null && row.longitude !== undefined ? row.longitude : '-'}</span>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-semibold">{Math.min(totalRows, (currentPage - 1) * rowsPerPage + 1)}</span> to{" "}
                  <span className="font-semibold">{Math.min(totalRows, currentPage * rowsPerPage)}</span> of{" "}
                  <span className="font-semibold">{totalRows}</span> records
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    title="First Page"
                  >
                    <FiChevronRight className="rotate-180" size={18} />
                    <FiChevronRight className="rotate-180 -ml-3" size={18} />
                  </button>
                  <button
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    title="Previous Page"
                  >
                    <FiChevronRight className="rotate-180" size={18} />
                  </button>
                  
                  <div className="flex items-center gap-1 mx-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          className={`w-10 h-10 rounded-lg border font-medium transition-all ${currentPage === pageNum ? "bg-accent-blue text-white border-accent-blue" : "border-gray-300 hover:bg-gray-100 text-gray-700"}`}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    title="Next Page"
                  >
                    <FiChevronRight size={18} />
                  </button>
                  <button
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    title="Last Page"
                  >
                    <FiChevronRight size={18} />
                    <FiChevronRight className="-ml-3" size={18} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Historical Trends & Map */}
          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-md border border-accent-blue/30">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg">Historical Trends</h3>
                <FiTrendingUp className="text-accent-blue" />
              </div>
              <div className="text-center mb-6">
                <div className="text-4xl font-extrabold text-accent-blue mb-2">{
                  (historicalData || []).reduce((sum, row) => sum + (row.activeCases || 0), 0).toLocaleString()
                }</div>
                <div className="text-lg text-gray-500 mb-4">Total Active Cases</div>
              </div>
              <HistoricalTrendsChart />
              <button className="w-full bg-accent-blue text-white py-3 rounded-lg font-bold text-base hover:bg-secondary-blue transition-colors">
                View Detailed Analytics
              </button>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-accent-blue/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Coverage Map</h3>
                <FiMapPin className="text-accent-blue" />
              </div>
              <div className="relative rounded-lg overflow-hidden mb-4">
                <CoverageMap mapData={mapData} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-light-bg rounded-lg">
                  <div className="text-lg font-bold text-accent-blue">
                    {uniqueLocations.length - 1}
                  </div>
                  <div className="text-xs text-gray-600">Locations Covered</div>
                </div>
                <div className="text-center p-3 bg-light-bg rounded-lg">
                  <div className="text-lg font-bold text-accent-blue">24/7</div>
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
