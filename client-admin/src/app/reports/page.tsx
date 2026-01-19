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
const dataTypes = [
  { value: "Active Cases", label: "Active Dengue Cases" },
  { value: "Total Cases", label: "Cumulative Dengue Cases" },
]

const formatDate = (dateInput?: string | Date | null) => {
  if (!dateInput) return "N/A"
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return "N/A"
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

const getWeekRange = (dateInput?: string | Date | null) => {
  if (!dateInput) return null
  const start = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  if (isNaN(start.getTime())) return null
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start, end }
}

const getRiskLevel = (combinedScore?: number | null): string => {
  if (combinedScore === null || combinedScore === undefined || isNaN(combinedScore)) {
    return "N/A"
  }
  if (combinedScore < 1) {
    return "Low Dengue Risk"
  } else if (combinedScore >= 1 && combinedScore < 3) {
    return "Medium Dengue Risk"
  } else {
    return "High Dengue Risk"
  }
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

export default function ReportsPage() {
  const { companyId, token } = useAuth()
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedDataType, setSelectedDataType] = useState("Active Cases")
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
  const filtersComplete = startDate && endDate

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

      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000) // 120 seconds (2 minutes) timeout

      let response: Response
      try {
        response = await fetch(`${API_URL}/dengue-data/generate-report?${params}`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          signal: controller.signal
        })
      } finally {
        clearTimeout(timeoutId)
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate report")
      }

      const result = await response.json()
      if (result.success) {
        setReportData(result.data)
        console.log("result.data =>>>>>>", result.data);
        setReportGenerated(true)
      } else {
        throw new Error("Report generation failed")
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError("Request timeout: Report generation is taking too long. Please try again or reduce the date range.")
      } else {
        setError(err.message || "Report generation failed. Please try again.")
      }
      setReportGenerated(false)
    } finally {
      setLoading(false)
    }
  }

  const handleClearFilters = () => {
    setStartDate("")
    setEndDate("")
    setSelectedDataType("Active Cases")
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
    <div className="min-h-screen bg-[#FFF7E3] flex flex-row   overflow-hidden">
      <AdminSidebar current="Reports" />
      <main className="flex-1 flex flex-col">
        <AdminHeader />
        {/* Content */}
        <motion.section className="px-10 py-8" variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-8">
            <h1 className="text-3xl font-bold text-primary-dark mb-1">Report Generation</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent-blue"></div>
              <div className="text-lg text-gray-600">Customize and generate data insights reports for your company</div>
            </div>
          </motion.div>

          {/* Report Stats */}
          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: "Reports Generated", value: stats.reportsGenerated.toString(), icon: <FiFileText />, color: "bg-blue-500" },
              { label: "Data Points", value: stats.dataPoints >= 1000 ? `${(stats.dataPoints / 1000).toFixed(1)}K` : stats.dataPoints.toString(), icon: <FiBarChart2 />, color: "bg-green-500" },
              { label: "Export Formats", value: stats.exportFormats.toString(), icon: <FiDownload />, color: "bg-purple-500" }
              // { label: "Accuracy Rate", value: stats.accuracyRate, icon: <FiTrendingUp />, color: "bg-orange-500" },
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                className="bg-white rounded-xl shadow-md overflow-hidden border border-accent-blue/30"
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
            <div className="bg-white rounded-xl p-6 shadow-md border border-accent-blue/30">
              <div className="font-bold text-xl mb-4 flex items-center gap-2">
                <FiFilter className="text-accent-blue" />
                Report Filters
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-primary-dark text-sm flex items-center gap-2">
                    <FiCalendar className="text-accent-blue" size={16} />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={handleFilterChange(setStartDate)}
                    className="rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-primary-dark text-sm flex items-center gap-2">
                    <FiCalendar className="text-accent-blue" size={16} />
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={handleFilterChange(setEndDate)}
                    className="rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent"
                  />
                </div>
              </div>
              {error && (
                <div className="mb-4 text-red-600 font-semibold bg-red-100 rounded-lg px-4 py-2 border border-red-200">
                  {error}
                </div>
              )}
              <div className="flex gap-4">
                <button
                  className={`bg-accent-blue text-white px-8 py-3 rounded-lg font-bold text-base flex items-center gap-2 shadow-md transition-all relative overflow-hidden ${!filtersComplete || loading ? "opacity-60 cursor-not-allowed" : "hover:bg-secondary-blue"}`}
                  onClick={handleGenerateReport}
                  disabled={!filtersComplete || loading}
                >
                  {loading && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" style={{ animation: 'shimmer 1.5s infinite' }}></div>
                  )}
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white relative z-10" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      <span className="relative z-10">Generating...</span>
                    </>
                  ) : (
                    <>
                      <FiBarChart2 />
                      <span>Generate Report</span>
                    </>
                  )}
                </button>
                <button
                  className="bg-white text-accent-blue border border-accent-blue px-8 py-3 rounded-lg font-bold text-base hover:bg-light-bg/50 transition-all"
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
                className={`bg-white rounded-xl p-6 shadow-md border border-accent-blue/30 ${!reportGenerated ? "opacity-60" : ""}`}
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FiBarChart2 className="text-accent-blue" />
                    Weekly Active Dengue Cases Overview
                  </h3>
                  <FiTrendingUp className="text-green-500" />
                </div>
                <div className="w-full h-32 mb-4 bg-gradient-to-r from-light-bg to-light-bg/70 rounded-lg flex items-end p-4">
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
                          fill={idx === generateBarChartData().length - 1 ? "#4988C4" : "#1C4D8D"} 
                          rx="2" 
                        />
                      ))
                    ) : (
                      <>
                        <rect x="20" y="40" width="16" height="30" fill="#1C4D8D" rx="2" />
                        <rect x="44" y="30" width="16" height="40" fill="#1C4D8D" rx="2" />
                        <rect x="68" y="50" width="16" height="20" fill="#1C4D8D" rx="2" />
                        <rect x="92" y="20" width="16" height="50" fill="#4988C4" rx="2" />
                        <rect x="116" y="35" width="16" height="35" fill="#1C4D8D" rx="2" />
                        <rect x="140" y="45" width="16" height="25" fill="#1C4D8D" rx="2" />
                      </>
                    )}
                  </svg>
                </div>
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-accent-blue">
                    {reportGenerated && reportData && reportData.weeklyData && reportData.weeklyData.length > 0
                      ? reportData.weeklyData
                          .reduce(
                            (sum: number, entry: any) =>
                              sum + (typeof entry.value === "number" ? entry.value : 0),
                            0
                          )
                          .toLocaleString()
                      : "-"}
                  </div>
                  <div className="text-sm text-gray-500">
                    Total Dengue Cases
                  </div>
                  <div className="text-xs text-gray-400">
                    {startDate && endDate
                      ? `${formatDate(startDate)} - ${formatDate(endDate)}`
                      : "No date range selected"}
                  </div>
                </div>
                <button
                  className="w-full bg-accent-blue text-white py-2 rounded-lg font-bold hover:bg-secondary-blue transition-colors disabled:cursor-not-allowed"
                  disabled={!reportGenerated}
                  onClick={() => handleViewDetails("weekly")}
                >
                  View Details
                </button>
              </motion.div>

              {/* Total Dengue Cases Overview Card */}
              <motion.div
                className={`bg-white rounded-xl p-6 shadow-md border border-accent-blue/30 ${!reportGenerated ? "opacity-60" : ""}`}
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FiPieChart className="text-accent-blue" />
                    Dengue Prediction Overview
                  </h3>
                  <FiTrendingUp className="text-green-500" />
                </div>
                <div className={`w-full h-32 mb-4 bg-gradient-to-r from-light-bg to-light-bg/70 rounded-lg p-4 ${
                  reportGenerated && reportData && reportData.stats && (
                    Object.keys(reportData.stats).length > 0 && 
                    (reportData.stats.highRiskPredictions > 0 || 
                     reportData.stats.mediumRiskPredictions > 0 || 
                     reportData.stats.lowRiskPredictions > 0)
                  ) ? 'flex items-end' : 'flex items-center justify-center'
                }`}>
                  {reportGenerated && reportData && reportData.stats && (
                    Object.keys(reportData.stats).length > 0 && 
                    (reportData.stats.highRiskPredictions > 0 || 
                     reportData.stats.mediumRiskPredictions > 0 || 
                     reportData.stats.lowRiskPredictions > 0)
                  ) ? (
                    /* Enhanced area chart */
                    <svg width="100%" height="100%" viewBox="0 0 320 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="80" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#4988C4" stopOpacity="0.6" />
                          <stop offset="1" stopColor="#4988C4" stopOpacity="0.1" />
                        </linearGradient>
                      </defs>
                      {reportData.weeklyData && reportData.weeklyData.length > 0 ? (() => {
                        const chartData = generateAreaChartData()
                        return (
                          <>
                            <path
                              d={`${chartData.path} V80 H0 Z`}
                              fill="url(#areaGrad)"
                            />
                            <path
                              d={chartData.path}
                              stroke="#4988C4"
                              strokeWidth="2"
                              fill="none"
                            />
                            {chartData.points.map((point: any, idx: number) => (
                              <circle key={idx} cx={point.x} cy={point.y} r="3" fill="#4988C4" />
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
                            stroke="#4988C4"
                            strokeWidth="2"
                            fill="none"
                          />
                          <circle cx="80" cy="50" r="3" fill="#4988C4" />
                          <circle cx="160" cy="40" r="3" fill="#4988C4" />
                          <circle cx="240" cy="50" r="3" fill="#4988C4" />
                        </>
                      )}
                    </svg>
                  ) : reportGenerated && reportData ? (
                    <div className="text-center text-gray-500 text-sm">
                      No Prediction Data during this time period.
                    </div>
                  ) : (
                    <svg width="100%" height="100%" viewBox="0 0 320 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="80" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#4988C4" stopOpacity="0.6" />
                          <stop offset="1" stopColor="#4988C4" stopOpacity="0.1" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,60 Q40,40 80,50 Q120,70 160,40 Q200,20 240,50 Q280,80 320,40 V80 H0 Z"
                        fill="url(#areaGrad)"
                      />
                      <path
                        d="M0,60 Q40,40 80,50 Q120,70 160,40 Q200,20 240,50 Q280,80 320,40"
                        stroke="#4988C4"
                        strokeWidth="2"
                        fill="none"
                      />
                      <circle cx="80" cy="50" r="3" fill="#4988C4" />
                      <circle cx="160" cy="40" r="3" fill="#4988C4" />
                      <circle cx="240" cy="50" r="3" fill="#4988C4" />
                    </svg>
                  )}
                </div>
                <div className="flex justify-center gap-6 text-xs mb-4">
                  {reportGenerated && reportData && reportData.stats && (
                    Object.keys(reportData.stats).length > 0 && 
                    (reportData.stats.highRiskPredictions > 0 || 
                     reportData.stats.mediumRiskPredictions > 0 || 
                     reportData.stats.lowRiskPredictions > 0)
                  ) ? (
                    <>
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span>
                        High Dengue Risk: {reportData.stats.highRiskPredictions}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full bg-yellow-500"></span>
                        Medium Dengue Risk: {reportData.stats.mediumRiskPredictions}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
                        Low Dengue Risk: {reportData.stats.lowRiskPredictions}
                      </span>
                    </>
                  ) : reportGenerated && reportData ? (
                    <span className="text-gray-400">No prediction data available.</span>
                  ) : (
                    <span className="text-gray-400">Generate a report to view risk insights.</span>
                  )}
                </div>
                <button
                  className="w-full bg-accent-blue text-white py-2 rounded-lg font-bold hover:bg-secondary-blue transition-colors disabled:cursor-not-allowed"
                  disabled={
                    !reportGenerated || 
                    !reportData || 
                    !reportData.stats || 
                    Object.keys(reportData.stats).length === 0 ||
                    (reportData.stats.highRiskPredictions === 0 && 
                     reportData.stats.mediumRiskPredictions === 0 && 
                     reportData.stats.lowRiskPredictions === 0)
                  }
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
                      {detailView === "weekly" ? "Weekly Overview Details" : "Prediction Overview Details"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(startDate || null)} - {formatDate(endDate || null)} ·{" "}
                      {reportData && reportData.weeklyData && reportData.weeklyData.length > 0
                        ? `${reportData.weeklyData.length} week${reportData.weeklyData.length > 1 ? "s" : ""}`
                        : "No weeks"}{" "}
                      · Active Dengue Cases
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
                        {reportData.weeklyData.map((entry: any, idx: number) => {
                          const weekRange = getWeekRange(entry.date)

                          return (
                            <div
                              key={`${entry.date}-${idx}`}
                              className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
                            >
                              <div className="font-medium text-gray-800">
                                <div>{`Week ${idx + 1}`}</div>
                                <div className="text-xs text-gray-500">
                                  {weekRange
                                    ? `${formatDate(weekRange.start)} - ${formatDate(weekRange.end)}`
                                    : formatDate(entry.date)}
                                </div>
                              </div>
                              <div className="text-accent-blue font-semibold">
                                {entry.value !== undefined ? `${entry.value.toLocaleString()} active cases` : "-"}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">No weekly data available for the selected filters.</div>
                    )
                  ) : (
                    <>
                      {reportData.stats ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                            { label: "High Dengue Risk", value: reportData.stats.highRiskPredictions, color: "bg-red-500" },
                            { label: "Medium Dengue Risk", value: reportData.stats.mediumRiskPredictions, color: "bg-yellow-500" },
                            { label: "Low Dengue Risk", value: reportData.stats.lowRiskPredictions, color: "bg-green-500" },
                          ].map((stat) => (
                            <div key={stat.label} className="rounded-xl border border-gray-100 p-4 flex flex-col gap-2">
                              <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                                <span className={`inline-block w-3 h-3 rounded-full ${stat.color}`}></span>
                                {stat.label}
                              </div>
                              <div className="text-2xl font-bold text-accent-blue">
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
                            {reportData.predictions.slice(0, 5).map((prediction: any, idx: number) => {
                              const riskLevel = getRiskLevel(prediction.combinedScore)
                              const riskColor = 
                                riskLevel === "High Risk" ? "text-red-600" :
                                riskLevel === "Medium Risk" ? "text-yellow-600" :
                                riskLevel === "Low Risk" ? "text-green-600" :
                                "text-gray-500"
                              
                              return (
                                <div key={idx} className="rounded-lg border border-gray-100 px-4 py-3">
                                  <div className="flex justify-between text-sm text-gray-500">
                                    <span>{prediction.companyLocation?.address || "Unknown Location"}</span>
                                    <span className={`font-semibold ${riskColor}`}>
                                      {riskLevel}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {prediction.createdAt ? formatDate(prediction.createdAt) : ""}
                                  </div>
                                </div>
                              )
                            })}
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
              <div className="bg-white rounded-xl p-6 shadow-md border border-accent-blue/30">
                <div className="font-bold text-xl mb-4 flex items-center gap-2">
                  <FiDownload className="text-accent-blue" />
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
                      className="flex flex-col items-center gap-3 p-6 border border-gray-200 rounded-lg hover:border-accent-blue hover:bg-light-bg/50 transition-all"
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
