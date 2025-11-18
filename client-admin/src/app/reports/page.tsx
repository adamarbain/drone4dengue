"use client"

import AdminSidebar from "@/components/AdminSidebar"
import AdminHeader from "@/components/AdminHeader"
import {
  FiDownload,
  FiFilter,
  FiCalendar,
  FiFileText,
  FiBarChart2,
  FiTrendingUp,
  FiPieChart,
  FiX,
} from "react-icons/fi"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
const dataTypes = ["Active Cases", "Total Cases"]

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
  const { companyId, token } = useAuth()
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedDataType, setSelectedDataType] = useState("")
  const [reportGenerated, setReportGenerated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [detailView, setDetailView] = useState<"weekly" | "cases" | null>(null)
  const [reportData, setReportData] = useState<any>(null)
  const [stats, setStats] = useState({
    reportsGenerated: 0,
    dataPoints: 0,
    exportFormats: 4,
    accuracyRate: "99.2%"
  })

  // Fetch initial stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const [summaryRes, predictionsRes] = await Promise.all([
          fetch(`${API_URL}/dengue-data/summary/dengue-data`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }),
          companyId ? fetch(`${API_URL}/api/predict/company/${companyId}?limit=1000`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }) : null
        ])

        if (summaryRes.ok) {
          const summary = await summaryRes.json()
          setStats(prev => ({
            ...prev,
            dataPoints: summary.totalRecords || 0
          }))
        }

        // Count unique report generations (based on predictions count)
        if (predictionsRes && predictionsRes.ok) {
          const predictions = await predictionsRes.json()
          if (predictions.success && predictions.predictions) {
            // Count unique date-based reports
            const uniqueReports = new Set(
              predictions.predictions.map((p: any) => 
                new Date(p.createdAt).toISOString().split('T')[0]
              )
            )
            setStats(prev => ({
              ...prev,
              reportsGenerated: uniqueReports.size
            }))
          }
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err)
      }
    }
    if (token) {
      fetchStats()
    }
  }, [token, companyId])

  // Helper to check if all filters are filled
  const filtersComplete = startDate && endDate && selectedDataType

  // Reset report state on filter change
  const handleFilterChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setter(e.target.value)
    setReportGenerated(false)
    setReportData(null)
    setError("")
    setDetailView(null)
  }

  const handleGenerateReport = async () => {
    if (!filtersComplete) {
      setError("Please complete all filters before generating the report.")
      return
    }
    setLoading(true)
    setError("")
    
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        dataType: selectedDataType,
        ...(companyId ? { companyId } : {})
      })

      const response = await fetch(`${API_URL}/dengue-data/generate-report?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate report")
      }

      const result = await response.json()
      if (result.success) {
        setReportData(result.data)
        setReportGenerated(true)
      } else {
        throw new Error("Report generation failed")
      }
    } catch (err: any) {
      setError(err.message || "Report generation failed. Please try again.")
      setReportGenerated(false)
    } finally {
      setLoading(false)
    }
  }

  const handleClearFilters = () => {
    setStartDate("")
    setEndDate("")
    setSelectedDataType("")
    setReportGenerated(false)
    setReportData(null)
    setError("")
    setDetailView(null)
  }

  // Export handlers
  const handleExport = async (format: string) => {
    if (!reportData || !reportGenerated) {
      setError("Please generate a report first")
      return
    }

    if (format === "JSON") {
      const dataStr = JSON.stringify(reportData, null, 2)
      const blob = new Blob([dataStr], { type: "application/json" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `dengue_report_${startDate}_${endDate}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      return
    }

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        format: format.toLowerCase(),
        ...(selectedDataType === "Active Cases" ? { status: "Active Cases" } : {})
      })

      const response = await fetch(`${API_URL}/dengue-data/export/generate-report?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      })

      if (!response.ok) {
        let message = `Failed to export ${format}.`
        try {
          const errorPayload = await response.json()
          if (errorPayload?.error) {
            message = errorPayload.error
          }
        } catch {
          const text = await response.text()
          message = text || message
        }
        throw new Error(message)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const extension = format === "PDF" ? "pdf" : format === "XLSX" ? "xlsx" : "csv"
      const a = document.createElement("a")
      a.href = url
      a.download = `dengue_report_${startDate}_${endDate}.${extension}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      setError(`Export failed: ${err.message || "Unknown error"}`)
    }
  }

  // Generate chart data for weekly overview
  const generateBarChartData = () => {
    if (!reportData || !reportData.weeklyData || reportData.weeklyData.length === 0) {
      return []
    }
    const data = reportData.weeklyData.slice(-7) // Last 7 weeks
    const maxValue = Math.max(...data.map((d: any) => d.value), 1)
    return data.map((d: any, idx: number) => ({
      x: 20 + idx * 24,
      y: 80 - (d.value / maxValue) * 60,
      height: (d.value / maxValue) * 60,
      value: d.value
    }))
  }

  // Generate area chart data
  const generateAreaChartData = () => {
    if (!reportData || !reportData.weeklyData || reportData.weeklyData.length === 0) {
      return { path: "M0,60 Q40,40 80,50 Q120,70 160,40 Q200,20 240,50 Q280,80 320,40", points: [] }
    }
    const data = reportData.weeklyData.slice(-8) // Last 8 data points
    const maxValue = Math.max(...data.map((d: any) => d.value), 1)
    const width = 320
    const height = 80
    const stepX = data.length > 1 ? width / (data.length - 1) : 0
    
    const points = data.map((d: any, idx: number) => {
      const x = idx * stepX
      const y = height - (d.value / maxValue) * 60
      return { x, y }
    })
    
    const pathData = points.map((p: { x: number; y: number }, idx: number) => 
      idx === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`
    ).join(" ")
    
    return { path: pathData, points }
  }

  const handleViewDetails = (view: "weekly" | "cases") => {
    if (!reportGenerated || !reportData) return
    setDetailView(view)
  }

  return (
    <div className="min-h-screen bg-[#FFF7E3] flex flex-row  border-[8px] border-[#E2C275] overflow-hidden">
      <AdminSidebar current="Reports" />
      <main className="flex-1 flex flex-col">
        <AdminHeader />
        {/* Content */}
        <motion.section className="px-10 py-8" variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-8">
            <h1 className="text-3xl font-bold text-black mb-1">Report Generation</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#A21C1C]"></div>
              <div className="text-lg text-gray-600">Customize and generate data insights reports for your company</div>
            </div>
          </motion.div>

          {/* Report Stats */}
          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: "Reports Generated", value: stats.reportsGenerated.toString(), icon: <FiFileText />, color: "bg-blue-500" },
              { label: "Data Points", value: stats.dataPoints >= 1000 ? `${(stats.dataPoints / 1000).toFixed(1)}K` : stats.dataPoints.toString(), icon: <FiBarChart2 />, color: "bg-green-500" },
              { label: "Export Formats", value: stats.exportFormats.toString(), icon: <FiDownload />, color: "bg-purple-500" },
              { label: "Accuracy Rate", value: stats.accuracyRate, icon: <FiTrendingUp />, color: "bg-orange-500" },
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-black text-sm flex items-center gap-2">
                    <FiCalendar className="text-[#A21C1C]" size={16} />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={handleFilterChange(setStartDate)}
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
                    onChange={handleFilterChange(setEndDate)}
                    className="rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#E2C275] focus:border-transparent"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-black text-sm flex items-center gap-2">
                    <FiBarChart2 className="text-[#A21C1C]" size={16} />
                    Data Type
                  </label>
                  <select
                    value={selectedDataType}
                    onChange={handleFilterChange(setSelectedDataType)}
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
              {error && (
                <div className="mb-4 text-red-600 font-semibold bg-red-100 rounded-lg px-4 py-2 border border-red-200">
                  {error}
                </div>
              )}
              <div className="flex gap-4">
                <button
                  className={`bg-[#A21C1C] text-white px-8 py-3 rounded-lg font-bold text-base flex items-center gap-2 shadow-md transition-all ${!filtersComplete || loading ? "opacity-60 cursor-not-allowed" : "hover:bg-[#7C1D1D]"}`}
                  onClick={handleGenerateReport}
                  disabled={!filtersComplete || loading}
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                  ) : (
                    <FiBarChart2 />
                  )}
                  {loading ? "Generating..." : "Generate Report"}
                </button>
                <button
                  className="bg-white text-[#A21C1C] border border-[#A21C1C] px-8 py-3 rounded-lg font-bold text-base hover:bg-[#FFF7E3] transition-all"
                  onClick={handleClearFilters}
                  disabled={loading}
                >
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
                className={`bg-white rounded-xl p-6 shadow-md border border-[#E2C275]/30 ${!reportGenerated ? "opacity-60" : ""}`}
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
                    {reportGenerated && reportData && reportData.weeklyData ? (
                      generateBarChartData().map((bar: any, idx: number) => (
                        <rect 
                          key={idx}
                          x={bar.x} 
                          y={bar.y} 
                          width="16" 
                          height={bar.height} 
                          fill={idx === generateBarChartData().length - 1 ? "#A21C1C" : "#E2C275"} 
                          rx="2" 
                        />
                      ))
                    ) : (
                      <>
                        <rect x="20" y="40" width="16" height="30" fill="#E2C275" rx="2" />
                        <rect x="44" y="30" width="16" height="40" fill="#E2C275" rx="2" />
                        <rect x="68" y="50" width="16" height="20" fill="#E2C275" rx="2" />
                        <rect x="92" y="20" width="16" height="50" fill="#A21C1C" rx="2" />
                        <rect x="116" y="35" width="16" height="35" fill="#E2C275" rx="2" />
                        <rect x="140" y="45" width="16" height="25" fill="#E2C275" rx="2" />
                      </>
                    )}
                  </svg>
                </div>
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-[#A21C1C]">
                    {reportGenerated && reportData ? reportData.latestValue : "-"}
                  </div>
                  <div className="text-sm text-gray-500">{selectedDataType || "Data"}</div>
                  <div className="text-xs text-gray-400">
                    {reportGenerated && reportData && reportData.weeklyData && reportData.weeklyData.length > 0
                      ? new Date(reportData.weeklyData[reportData.weeklyData.length - 1].date).toLocaleDateString()
                      : "No data"}
                  </div>
                </div>
                <button
                  className="w-full bg-[#A21C1C] text-white py-2 rounded-lg font-bold hover:bg-[#7C1D1D] transition-colors disabled:cursor-not-allowed"
                  disabled={!reportGenerated}
                  onClick={() => handleViewDetails("weekly")}
                >
                  View Details
                </button>
              </motion.div>

              {/* Total Dengue Cases Overview Card */}
              <motion.div
                className={`bg-white rounded-xl p-6 shadow-md border border-[#E2C275]/30 ${!reportGenerated ? "opacity-60" : ""}`}
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
                    {reportGenerated && reportData && reportData.weeklyData && reportData.weeklyData.length > 0 ? (() => {
                      const chartData = generateAreaChartData()
                      return (
                        <>
                          <path
                            d={`${chartData.path} V80 H0 Z`}
                            fill="url(#areaGrad)"
                          />
                          <path
                            d={chartData.path}
                            stroke="#A21C1C"
                            strokeWidth="2"
                            fill="none"
                          />
                          {chartData.points.map((point: any, idx: number) => (
                            <circle key={idx} cx={point.x} cy={point.y} r="3" fill="#A21C1C" />
                          ))}
                        </>
                      )
                    })() : (
                      <>
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
                      </>
                    )}
                  </svg>
                </div>
                <div className="flex justify-center gap-6 text-xs mb-4">
                  {reportGenerated && reportData && reportData.stats ? (
                    <>
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span>
                        High Risk: {reportData.stats.highRiskPredictions}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full bg-yellow-500"></span>
                        Medium Risk: {reportData.stats.mediumRiskPredictions}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
                        Low Risk: {reportData.stats.lowRiskPredictions}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-400">Generate a report to view risk insights.</span>
                  )}
                </div>
                <button
                  className="w-full bg-[#A21C1C] text-white py-2 rounded-lg font-bold hover:bg-[#7C1D1D] transition-colors disabled:cursor-not-allowed"
                  disabled={!reportGenerated}
                  onClick={() => handleViewDetails("cases")}
                >
                  View Details
                </button>
              </motion.div>
            </div>
          </motion.div>

          {detailView && reportGenerated && reportData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                  <div>
                    <div className="text-lg font-bold">
                      {detailView === "weekly" ? "Weekly Overview Details" : "Cases Overview Details"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {startDate || "N/A"} - {endDate || "N/A"} · {selectedDataType || "All Data"}
                    </div>
                  </div>
                  <button
                    className="text-gray-500 hover:text-gray-900 transition-colors"
                    onClick={() => setDetailView(null)}
                    aria-label="Close details modal"
                  >
                    <FiX size={20} />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                  {detailView === "weekly" ? (
                    reportData.weeklyData && reportData.weeklyData.length > 0 ? (
                      <div className="space-y-3">
                        {reportData.weeklyData.map((entry: any, idx: number) => (
                          <div
                            key={`${entry.date}-${idx}`}
                            className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
                          >
                            <div className="font-medium text-gray-800">
                              {entry.date ? new Date(entry.date).toLocaleDateString() : `Week ${idx + 1}`}
                            </div>
                            <div className="text-[#A21C1C] font-semibold">
                              {entry.value !== undefined ? entry.value.toLocaleString() : "-"}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">No weekly data available for the selected filters.</div>
                    )
                  ) : (
                    <>
                      {reportData.stats ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                            { label: "High Risk", value: reportData.stats.highRiskPredictions, color: "bg-red-500" },
                            { label: "Medium Risk", value: reportData.stats.mediumRiskPredictions, color: "bg-yellow-500" },
                            { label: "Low Risk", value: reportData.stats.lowRiskPredictions, color: "bg-green-500" },
                          ].map((stat) => (
                            <div key={stat.label} className="rounded-xl border border-gray-100 p-4 flex flex-col gap-2">
                              <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                                <span className={`inline-block w-3 h-3 rounded-full ${stat.color}`}></span>
                                {stat.label}
                              </div>
                              <div className="text-2xl font-bold text-[#A21C1C]">
                                {stat.value !== undefined ? stat.value.toLocaleString() : "-"}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No case statistics available for the selected filters.</div>
                      )}
                      {reportData.predictions && reportData.predictions.length > 0 && (
                        <div>
                          <div className="text-sm font-semibold text-gray-600 mb-2">Latest Predictions</div>
                          <div className="space-y-2">
                            {reportData.predictions.slice(0, 5).map((prediction: any, idx: number) => (
                              <div key={idx} className="rounded-lg border border-gray-100 px-4 py-3">
                                <div className="flex justify-between text-sm text-gray-500">
                                  <span>{prediction.location || "Unknown Location"}</span>
                                  <span>{prediction.riskLevel || "N/A"}</span>
                                </div>
                                <div className="text-lg font-semibold text-gray-800">
                                  {prediction.totalCases !== undefined ? `${prediction.totalCases.toLocaleString()} cases` : "-"}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {prediction.date ? new Date(prediction.date).toLocaleDateString() : ""}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Export Options */}
          {reportGenerated && !loading && (
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
                      onClick={() => handleExport(option.format)}
                    >
                      <div className={`p-3 ${option.color} rounded-lg text-white`}>{option.icon}</div>
                      <span className="font-medium">Export as {option.format}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </motion.section>
      </main>
    </div>
  )
}
