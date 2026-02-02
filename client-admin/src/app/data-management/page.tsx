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
  FiEye,
  FiX,
} from "react-icons/fi"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect, useRef, useMemo } from "react"
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
  const [dataRows, setDataRows] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false) // Changed to false - don't load on initial
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<string | null>(null)
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

  // Track search trigger - increments when Search button is clicked
  const [searchTrigger, setSearchTrigger] = useState(0)

  // Details modal state
  const [selectedRow, setSelectedRow] = useState<any | null>(null)

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

  // Compute historical trends data from paginatedData
  const historicalData = useMemo(() => {
    if (!paginatedData || paginatedData.length === 0) return [];
    
    // Group by date and aggregate
    const groupedByDate = paginatedData.reduce((acc, row) => {
      const date = row.date ? new Date(row.date).toISOString().split('T')[0] : null;
      if (!date) return acc;
      
      if (!acc[date]) {
        acc[date] = { date, activeCases: 0, hotspotCount: 0 };
      }
      
      acc[date].activeCases += row.activeCases || 0;
      if (row.status === 'Hotspot') {
        acc[date].hotspotCount += 1;
      }
      
      return acc;
    }, {} as Record<string, { date: string; activeCases: number; hotspotCount: number }>);
    
    // Convert to array and sort by date
    const result = Object.values(groupedByDate) as Array<{ date: string; activeCases: number; hotspotCount: number }>;
    return result.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [paginatedData]);

  // Compute map data from paginatedData (unique locations with coordinates)
  const mapData = useMemo(() => {
    if (!paginatedData || paginatedData.length === 0) return [];
    
    // Create a map to store unique locations (by location string)
    const locationMap = new Map<string, any>();
    
    paginatedData.forEach((row) => {
      const locationKey = row.location || row.displayName || '';
      if (!locationKey) return;
      
      // Only add if we have coordinates and haven't seen this location yet
      if (row.latitude && row.longitude && !locationMap.has(locationKey)) {
        locationMap.set(locationKey, {
          id: row.id || locationKey,
          location: locationKey,
          latitude: row.latitude,
          longitude: row.longitude,
          activeCases: row.activeCases || 0,
          totalCases: row.totalCases || row.activeCases || 0,
          status: row.status || 'Active Cases'
        });
      }
    });
    
    return Array.from(locationMap.values());
  }, [paginatedData]);

  // Compute unique locations count from paginatedData
  const uniqueLocations = useMemo(() => {
    if (!paginatedData || paginatedData.length === 0) return [];
    const locations = new Set<string>();
    paginatedData.forEach((row) => {
      const location = row.location || row.displayName;
      if (location) locations.add(location);
    });
    return Array.from(locations);
  }, [paginatedData]);

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
      // Refetch data by triggering search if filters are applied
      if (hasAppliedFilters) {
        setSearchTrigger(prev => prev + 1);
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

  // Details Modal Component
  function DetailsModal({ row, onClose }: { row: any; onClose: () => void }) {
    if (!row) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-primary-dark">Record Details</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Date</label>
                    <div className="mt-1 flex items-center gap-2">
                      <FiCalendar className="text-accent-blue" size={16} />
                      <span className="text-base text-primary-dark">
                        {row.date ? new Date(row.date).toLocaleDateString("en-GB", { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        }) : '-'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Location</label>
                    <div className="mt-1 flex items-start gap-2">
                      <FiMapPin className="text-accent-blue mt-1 flex-shrink-0" size={16} />
                      <span className="text-base text-primary-dark">
                        {row.displayName || row.location || '-'}
                      </span>
                    </div>
                  </div>

                  {row.district && (
                    <div>
                      <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">District</label>
                      <div className="mt-1">
                        <span className="text-base text-primary-dark">{row.district}</span>
                      </div>
                    </div>
                  )}

                  {row.suburb && (
                    <div>
                      <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Suburb</label>
                      <div className="mt-1">
                        <span className="text-base text-primary-dark">{row.suburb}</span>
                      </div>
                    </div>
                  )}

                  {row.road && (
                    <div>
                      <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Road</label>
                      <div className="mt-1">
                        <span className="text-base text-primary-dark">{row.road}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">State</label>
                    <div className="mt-1">
                      <span className="text-base text-primary-dark">{row.state || '-'}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Status/Type</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        row.status === 'Hotspot' ? 'text-red-700 bg-red-100 border border-red-200' :
                        row.status === 'Active Cases' ? 'text-blue-700 bg-blue-100 border border-blue-200' :
                        'text-gray-700 bg-gray-100 border border-gray-200'
                      }`}>
                        {row.status || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Active Cases</label>
                    <div className="mt-1">
                      <span className="text-2xl font-bold text-red-600">{row.activeCases ?? '-'}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total Cases</label>
                    <div className="mt-1">
                      <span className="text-2xl font-bold text-gray-700">{row.totalCases ?? row.activeCases ?? '-'}</span>
                    </div>
                  </div>

                  {row.status !== 'Active Cases' && (
                    <div>
                      <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Cumulative Duration</label>
                      <div className="mt-1">
                        <span className="text-2xl font-bold text-blue-600">{row.days_duration ?? '-'} days</span>
                      </div>
                    </div>
                  )}

                  {(row.latitude && row.longitude) && (
                    <div>
                      <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Coordinates</label>
                      <div className="mt-1">
                        <span className="text-base text-primary-dark">
                          {row.latitude.toFixed(6)}, {row.longitude.toFixed(6)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
              <Button
                onClick={onClose}
                className="bg-accent-blue text-white hover:bg-secondary-blue"
              >
                Close
              </Button>
            </div>
          </motion.div>
        </div>
    );
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
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!hasAppliedFilters ? (
                      <tr>
                        <td colSpan={7} className="py-16 px-6 text-center">
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
                          <td className="py-4 px-6">
                            <div className="h-4 bg-gray-200 rounded w-16 mx-auto" />
                          </td>
                        </tr>
                      ))
                    ) : paginatedData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 px-6 text-center">
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
                          <td className="py-4 px-6">
                            <button
                              onClick={() => setSelectedRow(row)}
                              className="mx-auto flex items-center justify-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-secondary-blue transition-colors text-sm font-medium"
                              title="View Details"
                            >
                              <FiEye size={16} />
                              View
                            </button>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination Controls */}
              {hasAppliedFilters && totalRows > 0 && (
                <div className="flex items-center justify-between mt-4 px-6 py-3 bg-gray-50 rounded-b-xl border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Showing {Math.min(totalRows, (currentPage - 1) * rowsPerPage + 1)} to {Math.min(totalRows, currentPage * rowsPerPage)} of {totalRows} records
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
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
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1 rounded-lg border transition-colors ${
                              currentPage === pageNum
                                ? 'bg-accent-blue text-white border-accent-blue'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Historical Trends & Map - Only show when data exists */}
          {paginatedData.length > 0 && (
            <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl p-8 shadow-md border border-accent-blue/30">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-lg">Historical Trends</h3>
                  <FiTrendingUp className="text-accent-blue" />
                </div>
                <div className="text-center mb-6">
                  <div className="text-4xl font-extrabold text-accent-blue mb-2">{
                    (historicalData as Array<{ date: string; activeCases: number; hotspotCount: number }>).reduce((sum: number, row) => sum + (row.activeCases || 0), 0).toLocaleString()
                  }</div>
                  <div className="text-lg text-gray-500 mb-4">Total Active Cases</div>
                </div>
                {historicalData.length > 0 ? (
                  <HistoricalTrendsChart />
                ) : (
                  <div className="h-40 flex items-center justify-center text-gray-400">
                    No historical data available
                  </div>
                )}
                {/* <button className="w-full bg-accent-blue text-white py-3 rounded-lg font-bold text-base hover:bg-secondary-blue transition-colors">
                  View Detailed Analytics
                </button> */}
              </div>

              <div className="bg-white rounded-xl p-6 shadow-md border border-accent-blue/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">Coverage Map</h3>
                  <FiMapPin className="text-accent-blue" />
                </div>
                <div className="relative rounded-lg overflow-hidden mb-4">
                  {mapData.length > 0 ? (
                    <CoverageMap mapData={mapData} />
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-400 bg-gray-50">
                      No location data available
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-light-bg rounded-lg">
                    <div className="text-lg font-bold text-accent-blue">
                      {uniqueLocations.length}
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
          )}
        </motion.section>
      </main>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedRow && (
          <DetailsModal row={selectedRow} onClose={() => setSelectedRow(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
