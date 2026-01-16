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
  const [dataRows, setDataRows] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false) // Changed to false - don't load on initial
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<string | null>(null)
  const [mapData, setMapData] = useState<any[]>([])
  const [historicalData, setHistoricalData] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const rowsPerPage = 20;
  
  // Simplified filter state
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [locationSearch, setLocationSearch] = useState<string>("")
  
  // Track if filters have been applied (to show data)
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false)

  // For locations covered count
  const [uniqueLocations, setUniqueLocations] = useState<string[]>([])

  // Fetch locations count on mount
  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch(`${API_URL}/dengue-data/locations`);
        if (res.ok) {
          const locations = await res.json();
          setUniqueLocations(locations);
        }
      } catch (err) {
        console.error("Failed to fetch locations:", err);
      }
    }
    fetchLocations();
  }, []);

  // Track search trigger - increments when Search button is clicked
  const [searchTrigger, setSearchTrigger] = useState(0)

  // Fetch data only when Search button is clicked or pagination changes
  useEffect(() => {
    async function fetchData() {
      // Don't fetch if search hasn't been triggered yet
      if (!hasAppliedFilters) {
        setDataRows([]);
        setTotalRows(0);
        setTotalPages(1);
        return;
      }
      
      setLoading(true)
      setError(null)
      try {
        let url = `${API_URL}/dengue-data?page=${currentPage}&limit=${rowsPerPage}`;
        
        // Add date range filters
        if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
        if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;
        
        // Add status filter
        if (selectedStatus) url += `&status=${encodeURIComponent(selectedStatus)}`;
        
        // Add location search filter
        if (locationSearch) url += `&search=${encodeURIComponent(locationSearch)}`;

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
    // Only trigger on searchTrigger (button click) or currentPage (pagination)
  }, [searchTrigger, currentPage])

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

  // Handle search/filter button click - only fetch data when this is clicked
  const handleSearch = () => {
    setHasAppliedFilters(true);
    setCurrentPage(1);
    setSearchTrigger(prev => prev + 1); // Trigger the data fetch
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedStatus("");
    setLocationSearch("");
    setHasAppliedFilters(false);
    setDataRows([]);
    setTotalRows(0);
    setTotalPages(1);
  };

  const paginatedData = dataRows;

  // Export handler
  const onExport = () => {
    let url = `${API_URL}/dengue-data/export`;
    const params = [];
    if (startDate) params.push(`startDate=${encodeURIComponent(startDate)}`);
    if (endDate) params.push(`endDate=${encodeURIComponent(endDate)}`);
    if (selectedStatus) params.push(`status=${encodeURIComponent(selectedStatus)}`);
    if (locationSearch) params.push(`search=${encodeURIComponent(locationSearch)}`);
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
      if (startDate) params.push(`startDate=${encodeURIComponent(startDate)}`);
      if (endDate) params.push(`endDate=${encodeURIComponent(endDate)}`);
      if (selectedStatus) params.push(`status=${encodeURIComponent(selectedStatus)}`);
      if (locationSearch) params.push(`search=${encodeURIComponent(locationSearch)}`);
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

          {/* Inline error (non-blocking) */}
          {error && (
            <motion.div
              variants={item}
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              Failed to load dengue data: {error}
            </motion.div>
          )}

          {/* Data Overview Cards */}
          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {loading || !summary
              ? Array.from({ length: 4 }).map((_, idx) => (
                  <Card
                    key={idx}
                    className="border-accent-blue/30 bg-white animate-pulse"
                  >
                    <CardHeader className="flex-row items-center justify-between">
                      <div className="p-3 rounded-lg bg-gray-200 w-10 h-10" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-8 bg-gray-200 rounded mb-2 w-1/2" />
                      <div className="h-4 bg-gray-100 rounded w-2/3" />
                    </CardContent>
                  </Card>
                ))
              : [
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
              
              {/* Filter Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Date Start */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Date Start</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                {/* Date End */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Date End</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                {/* Cases Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Cases Type</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="">All Types</option>
                    <option value="Hotspot">Hotspot</option>
                    <option value="Active Cases">Active Cases</option>
                  </select>
                </div>
                
                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Location</label>
                  <div className="relative">
                    <FiMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Enter Country, State, District, City, Suburb, Postcode"
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                <Button
                  onClick={handleSearch}
                  className="bg-accent-blue text-white hover:bg-secondary-blue flex items-center gap-2"
                >
                  <FiSearch size={16} />
                  Search Data
                </Button>
                <Button
                  onClick={handleClearFilters}
                  variant="outline"
                  className="border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Clear Filters
                </Button>
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
                      <th className="py-4 px-6">Date</th>
                      <th className="py-4 px-6">Location</th>
                      <th className="py-4 px-6">Active/Total Cases</th>
                      <th className="py-4 px-6">Cumulative Duration</th>
                      <th className="py-4 px-6">Type</th>
                      <th className="py-4 px-6">State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!hasAppliedFilters ? (
                      <tr>
                        <td colSpan={6} className="py-16 px-6 text-center">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <FiFilter className="text-gray-300 mb-4" size={48} />
                            <p className="text-lg font-medium mb-2">No Data Displayed</p>
                            <p className="text-sm">Please apply filters above and click &quot;Search Data&quot; to view dengue records.</p>
                          </div>
                        </td>
                      </tr>
                    ) : loading ? (
                      Array.from({ length: 8 }).map((_, idx) => (
                        <tr
                          key={idx}
                          className={`border-b border-gray-100 last:border-0 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded-full bg-gray-200" />
                              <div className="h-4 bg-gray-200 rounded w-24" />
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded-full bg-gray-200" />
                              <div className="h-4 bg-gray-200 rounded w-48" />
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="w-8 h-8 bg-gray-200 rounded-full" />
                          </td>
                          <td className="py-4 px-6">
                            <div className="w-8 h-8 bg-gray-200 rounded-full" />
                          </td>
                          <td className="py-4 px-6">
                            <div className="h-4 bg-gray-200 rounded w-20" />
                          </td>
                          <td className="py-4 px-6">
                            <div className="h-4 bg-gray-200 rounded w-24" />
                          </td>
                        </tr>
                      ))
                    ) : paginatedData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 px-6 text-center">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <FiDatabase className="text-gray-300 mb-4" size={48} />
                            <p className="text-lg font-medium mb-2">No Records Found</p>
                            <p className="text-sm">No dengue data matches your current filters. Try adjusting your search criteria.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedData.map((row, idx) => (
                        <motion.tr
                          key={row.id || row.date + row.location}
                          className={`border-b border-gray-100 last:border-0 hover:bg-light-bg/50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                        >
                          <td className="py-4 px-6 font-medium text-primary-dark">
                            <div className="flex items-center gap-2">
                              <FiCalendar className="text-accent-blue" size={16} />
                              {row.date ? new Date(row.date).toLocaleDateString("en-GB") : "-"}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-primary-dark">
                            <div className="flex items-start gap-2">
                              <FiMapPin className="text-accent-blue mt-1 flex-shrink-0" size={16} />
                              <span className="text-sm" title={row.displayName || row.location}>
                                {row.displayName || row.location || '-'}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                              <span className="text-red-600 font-bold text-sm">{row.activeCases ?? '-'}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {row.status === 'Active Cases' ? (
                              <span className="text-gray-500">N/A</span>
                            ) : (
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-bold text-sm">{row.days_duration ?? '-'}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-6 text-primary-dark">{row.status || '-'}</td>
                          <td className="py-4 px-6 text-primary-dark">
                            {row.state || '-'}
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-sm text-gray-600">
                  {hasAppliedFilters && totalRows > 0 ? (
                    <>
                      Showing <span className="font-semibold">{Math.min(totalRows, (currentPage - 1) * rowsPerPage + 1)}</span> to{" "}
                      <span className="font-semibold">{Math.min(totalRows, currentPage * rowsPerPage)}</span> of{" "}
                      <span className="font-semibold">{totalRows}</span> records
                    </>
                  ) : (
                    <span>Apply filters to view records</span>
                  )}
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
