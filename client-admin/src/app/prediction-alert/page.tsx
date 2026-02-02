"use client"

import AdminSidebar from "@/components/AdminSidebar"
import AdminHeader from "@/components/AdminHeader"
import PredictionMap from "@/components/PredictionMap"
import { FiFilter, FiDownload, FiRefreshCw, FiEye, FiAlertTriangle, FiCheckCircle, FiClock, FiMapPin, FiTarget } from "react-icons/fi"
import Image from "next/image"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@/context/AuthContext"
import { getCompanyPredictions, PredictionResponse, predictPublicEnhanced, getHistoricalData, HistoricalDataItem, EnhancedPredictionRequest, CompanyLocation, reverseGeocode } from "@/lib/api"
import { getLocationImages, checkSystemHealth } from "@/lib/threeModelPredictionApi"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"

interface PredictionData {
  id: string
  companyLocationId?: string
  companyLocation?: CompanyLocation
  latitude: number
  longitude: number
  riskScore: number
  riskLevel: 'high' | 'medium' | 'low'
  model1Score?: number
  model2Score?: number
  model3Score?: number  // NEW: Breeding area detection score
  combinedScore?: number  // NEW: Combined score from all three models
  createdAt: string
  // Enhanced features
  historicalFeatures?: {
    cases_lag_1: number;
    cases_lag_7: number;
    cases_lag_30: number;
    cases_avg_7: number;
    cases_avg_30: number;
  };
  isHotspot?: number;
  locationCluster?: number;
  dataQuality?: {
    has_historical_data: boolean;
    data_points_available: number;
    has_lag_1: boolean;
    has_lag_7: boolean;
    has_lag_30: boolean;
  };
  model?: string;
  // Three-model specific fields
  breedingAreaDetections?: any[];  // NEW: Breeding area detection results
  model3RiskLevel?: string;  // NEW: Model 3 risk level
  imagesProcessed?: number;  // NEW: Number of images processed
  modelsUsed?: string[];  // NEW: Which models were used
  predictionStatus?: 'pending' | 'processing' | 'completed' | 'error';  // NEW: Prediction status
  predictionError?: string;  // NEW: Error message if prediction failed
}

const riskLevelStyles: Record<string, string> = {
  high: "text-red-700 bg-red-100",
  medium: "text-yellow-800 bg-yellow-100",
  low: "text-green-700 bg-green-100",
}

const alertHistory = [
  {
    title: "High Risk Alert - Location Detected",
    date: new Date().toLocaleDateString(),
    status: "Alert system active",
    icon: <FiAlertTriangle className="text-red-500" />,
  },
  {
    title: "Medium Risk Alert - Location Detected",
    date: new Date(Date.now() - 86400000).toLocaleDateString(),
    status: "Alert system active",
    icon: <FiClock className="text-yellow-500" />,
  },
  {
    title: "System Status Report",
    date: new Date(Date.now() - 172800000).toLocaleDateString(),
    status: "All systems operational",
    icon: <FiCheckCircle className="text-green-500" />,
  },
]

const allStates = ["All States", "Malaysia", "Singapore", "Thailand"]
const allCities = ["All Cities", "Kuala Lumpur", "Singapore", "Bangkok"]
const allRiskLevels = ["All Levels", "High", "Medium", "Low"]

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

export default function PredictionAlertPage() {
  const { companyId } = useAuth()
  // Filter states
  const [selectedState, setSelectedState] = useState("All States")
  const [selectedCity, setSelectedCity] = useState("All Cities")
  const [selectedRisk, setSelectedRisk] = useState("All Levels")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [modelAvailable, setModelAvailable] = useState(true)
  const [showDetails, setShowDetails] = useState<null | PredictionData>(null)
  const [alertRecipient, setAlertRecipient] = useState("All Health Officials")
  const [savingAlert, setSavingAlert] = useState(false)
  const [alertSaveError, setAlertSaveError] = useState("")
  const [alertSaveSuccess, setAlertSaveSuccess] = useState("")
  const [predictions, setPredictions] = useState<PredictionData[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [showEnhancedPrediction, setShowEnhancedPrediction] = useState(false)
  const [historicalData, setHistoricalData] = useState<HistoricalDataItem[]>([])
  const [loadingHistoricalData, setLoadingHistoricalData] = useState(false)
  const [enhancedPredictionMode, setEnhancedPredictionMode] = useState<'combined' | 'model1'>('combined')
  const [targetDate, setTargetDate] = useState('')
  
  // System health state
  const [systemHealth, setSystemHealth] = useState<any>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Reverse geocoding cache and helpers
  const reverseGeocodeCache = new Map<string, string>()
  const getAreaName = async (lat: number, lon: number): Promise<string> => {
    const key = `${lat.toFixed(5)},${lon.toFixed(5)}`
    if (reverseGeocodeCache.has(key)) return reverseGeocodeCache.get(key) as string
    try {
      const data = await reverseGeocode(lat, lon)
      const a = data.address || {}
      const label = a.suburb || a.town || a.village || a.city || a.neighbourhood || a.state_district || a.state || a.county || data.display_name || 'Unknown'
      reverseGeocodeCache.set(key, label)
      return label
    } catch {
      return 'Unknown'
    }
  }

  const AsyncAreaName = ({ lat, lon, fallback }: { lat: number; lon: number; fallback?: string }) => {
    const [name, setName] = useState<string>(fallback || '')
    useEffect(() => {
      let mounted = true
      const load = async () => {
        if (fallback) { setName(fallback); return }
        const label = await getAreaName(lat, lon)
        if (mounted) setName(label)
      }
      load()
      return () => { mounted = false }
    }, [lat, lon, fallback])
    return <>{name || 'Unknown'}</>
  }

  // Load predictions on component mount
  useEffect(() => {
    if (companyId) {
      loadPredictions()
      checkSystemHealthStatus()
    }
  }, [companyId])

  // Check system health
  const checkSystemHealthStatus = async () => {
    try {
      const health = await checkSystemHealth()
      setSystemHealth(health)
    } catch (error) {
      console.error('Health check failed:', error)
    }
  }


  const loadPredictions = async () => {
    if (!companyId) return
    
    try {
      setRefreshing(true)
      const response = await getCompanyPredictions(companyId, 50, 0)
      if (response.success) {
        setPredictions(response.predictions)
      }
    } catch (err) {
      console.error('Failed to load predictions:', err)
      setError('Failed to load predictions')
    } finally {
      setRefreshing(false)
    }
  }

  // Filter predictions based on selected criteria
  const filteredPredictions = predictions.filter((prediction) => {
    let match = true
    
    // Risk level filter
    if (selectedRisk !== "All Levels" && prediction.riskLevel !== selectedRisk.toLowerCase()) {
      match = false
    }
    
    // Note: State and city filters would need geocoding to work properly
    // For now, we'll keep them as placeholders
    
    return match
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredPredictions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedPredictions = filteredPredictions.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedRisk, dateRange])

  // Handlers

  const handleExport = () => {
    setLoading(true)
    setError("")
    
    // Create CSV data
    const csvData = filteredPredictions.map(prediction => ({
      'Operational Area': prediction.companyLocation?.name || 'Unknown Location',
      'Location Address': prediction.companyLocation?.address || 'N/A',
      'Latitude': prediction.latitude,
      'Longitude': prediction.longitude,
      'Risk Level': prediction.riskLevel.toUpperCase(),
      'Risk Score': prediction.riskScore.toFixed(3),
      'Model 1 Score': prediction.model1Score ? prediction.model1Score.toFixed(3) : 'N/A',
      'Model 2 Score': prediction.model2Score ? prediction.model2Score.toFixed(3) : 'N/A',
      'Model 3 Score': prediction.model3Score ? prediction.model3Score.toFixed(3) : 'N/A',
      'Combined Score': prediction.combinedScore ? prediction.combinedScore.toFixed(3) : 'N/A',
      'Images Processed': prediction.imagesProcessed || 0,
      'Models Used': prediction.modelsUsed ? prediction.modelsUsed.join(', ') : 'Standard',
      'Date': new Date(prediction.createdAt).toLocaleDateString()
    }))
    
    // Convert to CSV
    const headers = Object.keys(csvData[0] || {})
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => row[header as keyof typeof row]).join(','))
    ].join('\n')
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dengue-predictions-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }

  const handleUpdatePrediction = () => {
    loadPredictions()
  }

  const loadHistoricalData = async (lat: number, lon: number, daysBack: number = 30) => {
    try {
      setLoadingHistoricalData(true)
      const response = await getHistoricalData(lat, lon, daysBack)
      if (response.success) {
        setHistoricalData(response.historicalData)
      }
    } catch (err) {
      console.error('Failed to load historical data:', err)
      setError('Failed to load historical data')
    } finally {
      setLoadingHistoricalData(false)
    }
  }

  const handleEnhancedPrediction = async (lat: number, lon: number) => {
    try {
      setLoading(true)
      setError('')
      
      const requestData: EnhancedPredictionRequest = {
        lat,
        lon,
        userId: companyId || undefined,
        historicalData: historicalData.length > 0 ? historicalData : undefined,
        targetDate: targetDate || undefined,
        useModel1Only: enhancedPredictionMode === 'model1'
      }

      const response = await predictPublicEnhanced(requestData)
      
      if (response.success) {
        // Convert to PredictionData format and add to predictions
        const newPrediction: PredictionData = {
          id: `enhanced_${Date.now()}`,
          latitude: response.prediction.latitude,
          longitude: response.prediction.longitude,
          riskScore: response.prediction.riskScore,
          riskLevel: response.prediction.riskLevel,
          model1Score: response.prediction.model1Score,
          model2Score: response.prediction.model2Score,
          model3Score: response.prediction.model3Score,
          combinedScore: response.prediction.combinedScore,
          createdAt: response.prediction.timestamp || new Date().toISOString(),
          historicalFeatures: response.prediction.historicalFeatures,
          isHotspot: response.prediction.isHotspot,
          locationCluster: response.prediction.locationCluster,
          dataQuality: response.prediction.dataQuality,
          model: response.prediction.model,
          breedingAreaDetections: response.prediction.breedingAreaDetections,
          model3RiskLevel: response.prediction.model3RiskLevel,
          imagesProcessed: response.prediction.imagesProcessed,
          modelsUsed: response.prediction.modelsUsed
        }

        setPredictions(prev => [newPrediction, ...prev])
        // Note: onPredictionUpdate is passed as prop to this component
        setShowEnhancedPrediction(false)
      }
    } catch (err) {
      console.error('Enhanced prediction failed:', err)
      setError('Enhanced prediction failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAlertRules = () => {
    setAlertSaveError("")
    setAlertSaveSuccess("")
    if (!alertRecipient) {
      setAlertSaveError("Please select at least one recipient.")
      return
    }
    setSavingAlert(true)
    setTimeout(() => {
      // Simulate save failure randomly
      // if (Math.random() < 0.2) {
      //   setAlertSaveError("Failed to save alert rules. Please retry.")
      //   setSavingAlert(false)
      //   return
      // }
      setAlertSaveSuccess("Alert rules saved successfully.")
      setSavingAlert(false)
    }, 1200)
  }

  return (
    <div className="min-h-screen bg-[#FFF7E3] flex flex-row   overflow-hidden">
      <AdminSidebar current="Prediction & Alert" />
      <main className="flex-1 flex flex-col">
        <AdminHeader />

        {/* Content */}
        <motion.section className="px-10 py-6" variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-8">
            <h1 className="text-3xl font-bold text-primary-dark mb-1">Prediction & Alert</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent-blue"></div>
              <div className="text-lg text-gray-600">Dengue Prediction & Alert System for your company</div>
            </div>
          </motion.div>

          {/* Dengue Predictions Section */}
          <motion.div variants={item} className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-xl">Dengue Predictions</h2>
              <div className="flex gap-3">
                <button className="bg-gray-200 text-primary-dark px-6 py-2 rounded-lg font-bold text-base hover:bg-gray-300 flex items-center gap-2" onClick={handleExport} disabled={loading}>
                  <FiDownload /> {loading ? "Exporting..." : "Export"}
                </button>
                <button className="bg-gray-200 text-primary-dark px-6 py-2 rounded-lg font-bold text-base hover:bg-gray-300 flex items-center gap-2" disabled>
                  <FiFilter /> Filter
                </button>
                {/* <button className="bg-gray-200 text-primary-dark px-6 py-2 rounded-lg font-bold text-base hover:bg-gray-300 flex items-center gap-2" onClick={() => setShowEnhancedPrediction(true)}>
                  <FiTarget /> Enhanced Prediction
                </button> */}
                <button className="bg-accent-blue text-white px-6 py-2 rounded-lg font-bold text-base hover:bg-secondary-blue flex items-center gap-2" onClick={handleUpdatePrediction} disabled={refreshing}>
                  <FiRefreshCw className={refreshing ? 'animate-spin' : ''} /> {refreshing ? "Refreshing..." : "Refresh Predictions"}
                </button>
              </div>
            </div>
            {error && (
              <div className="mb-4 text-red-600 font-semibold bg-red-100 rounded-lg px-4 py-2 border border-red-200">{error}</div>
            )}
            {!modelAvailable && (
              <div className="mb-4 text-red-600 font-semibold bg-red-100 rounded-lg px-4 py-2 border border-red-200">Prediction model unavailable. Please try again later.</div>
            )}
            {/* New Prediction Map Component */}
            <PredictionMap onPredictionUpdate={(newPredictions) => {
              setPredictions(newPredictions)
            }} />

            {/* Filters */}
            <motion.div variants={item} className="my-6">
              <div className="flex gap-4 items-end">
                {/* <div className="flex flex-col gap-2">
                  <label className="font-semibold text-primary-dark text-sm">State</label>
                  <select className="rounded-lg border border-gray-400 px-4 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-accent-blue" value={selectedState} onChange={e => setSelectedState(e.target.value)}>
                    {allStates.map(state => <option key={state}>{state}</option>)}
                  </select>
                </div> */}
                {/* <div className="flex flex-col gap-2">
                  <label className="font-semibold text-primary-dark text-sm">City</label>
                  <select className="rounded-lg border border-gray-400 px-4 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-accent-blue" value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
                    {allCities.map(city => <option key={city}>{city}</option>)}
                  </select>
                </div> */}
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-primary-dark text-sm">Risk Level</label>
                  <select className="rounded-lg border border-gray-400 px-4 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-accent-blue" value={selectedRisk} onChange={e => setSelectedRisk(e.target.value)}>
                    {allRiskLevels.map(risk => <option key={risk}>{risk}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-primary-dark text-sm">Date Range</label>
                  <DateRangePicker
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    placeholder="Select date range"
                    className="w-48"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Predicted Risk Areas Table */}
          <motion.div variants={item} className="mb-10">
            <div className="font-bold text-xl mb-3">Predicted Risk Areas</div>
            <div className="overflow-x-auto rounded-xl">
              <table className="min-w-full bg-white rounded-xl">
                <thead>
                  <tr className="text-left text-primary-dark font-semibold text-base bg-light-bg">
                    <th className="py-3 px-6">Operational Area</th>
                    {/* <th className="py-3 px-6">Coordinates</th> */}
                    <th className="py-3 px-6">Risk Level</th>
                    <th className="py-3 px-6">Risk Score</th>
                    <th className="py-3 px-6">Model Scores</th>
                    {/* <th className="py-3 px-6">Enhanced Features</th> */}
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPredictions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        {predictions.length === 0 ? "No predictions yet. Use the map above to create predictions." : "No predictions match the selected filters."}
                      </td>
                    </tr>
                  ) : (
                    paginatedPredictions.map((prediction, idx) => (
                      <tr key={prediction.id} className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                        <td className="py-3 px-6 font-medium text-primary-dark">
                          <div className="flex items-center gap-2">
                            <FiMapPin className="text-gray-400" />
                            <div>
                              <div className="text-sm font-semibold">
                                {prediction.companyLocation?.name ? (
                                  prediction.companyLocation.name
                                ) : (
                                  <AsyncAreaName lat={prediction.latitude} lon={prediction.longitude} />
                                )}
                              </div>
                              {prediction.companyLocation?.address && (
                                <div className="text-xs text-gray-500">
                                  {prediction.companyLocation.address}
                                </div>
                              )}
                              <div className="text-xs text-gray-500 mt-1">
                                {(() => {
                                  const d = new Date(prediction.createdAt)
                                  const day = d.getDate().toString().padStart(2, '0')
                                  const month = (d.getMonth() + 1).toString().padStart(2, '0')
                                  const year = d.getFullYear()
                                  return `${day}/${month}/${year}`
                                })()}
                              </div>
                            </div>
                          </div>
                        </td>
                        {/* <td className="py-3 px-6 font-medium text-primary-dark">
                          <div className="flex items-center gap-2">
                            <FiMapPin className="text-gray-400" />
                            <div>
                              <div className="text-sm">{prediction.latitude.toFixed(4)}, {prediction.longitude.toFixed(4)}</div>
                            </div>
                          </div>
                        </td> */}
                        <td className="py-3 px-6">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${riskLevelStyles[prediction.riskLevel]} flex items-center gap-2 w-fit`}
                          >
                            <div className={`w-2 h-2 rounded-full ${
                              prediction.riskLevel === 'high' ? 'bg-red-500' : 
                              prediction.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                            }`}></div>
                            {prediction.riskLevel.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-2">
                            {/* <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  prediction.riskLevel === 'high' ? 'bg-red-500' : 
                                  prediction.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${prediction.riskScore * 100}%` }}
                              ></div>
                            </div> */}
                            <span className="text-sm font-medium">{prediction.riskScore.toFixed(3)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-6 text-sm">
                          <div className="space-y-1">
                            <div>Historical Cases Model: {prediction.model1Score ? prediction.model1Score.toFixed(3) : 'N/A'}</div>
                            <div>Weather-Based Model: {prediction.model2Score ? prediction.model2Score.toFixed(3) : 'N/A'}</div>
                            {(prediction.model3Score != null && prediction.model3Score !== 0) && (
                              <div>Breeding Area Detection Model: {prediction.model3Score.toFixed(3)}</div>
                            )}
                            {prediction.combinedScore !== undefined && (
                              <div className="font-semibold text-blue-600">Combined: {prediction.combinedScore.toFixed(3)}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-6">
                          {prediction.predictionStatus ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              prediction.predictionStatus === 'completed' ? 'bg-green-100 text-green-700' :
                              prediction.predictionStatus === 'processing' ? 'bg-blue-100 text-blue-700' :
                              prediction.predictionStatus === 'error' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {prediction.predictionStatus === 'processing' ? 'Processing...' : 
                               prediction.predictionStatus === 'completed' ? 'Completed' :
                               prediction.predictionStatus === 'error' ? 'Error' : 'Pending'}
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                              Completed
                            </span>
                          )}
                          {prediction.predictionError && (
                            <div className="text-xs text-red-600 mt-1">
                              {prediction.predictionError}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-6">
                          <div className="flex gap-2">
                            <button className="text-accent-blue hover:bg-light-bg/50 p-2 rounded-lg" onClick={() => setShowDetails(prediction)}>
                              <FiEye />
                            </button>
                            <button className="text-accent-blue hover:bg-light-bg/50 p-2 rounded-lg" onClick={handleExport} disabled={loading}>
                              <FiDownload />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            {filteredPredictions.length > 0 && (
              <div className="flex items-center justify-between mt-4 px-6 py-3 bg-gray-50 rounded-b-xl">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredPredictions.length)} of {filteredPredictions.length} predictions
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
          </motion.div>

          {/* View Details Modal */}
          {showDetails && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-8 shadow-lg w-full max-w-md relative">
                <button className="absolute top-2 right-2 text-gray-400 hover:text-primary-dark" onClick={() => setShowDetails(null)}>&times;</button>
                <h2 className="text-xl font-bold mb-4">Prediction Details</h2>
                <div className="space-y-3">
                  {showDetails.companyLocation ? (
                    <div className="flex items-center gap-2">
                      <FiMapPin className="text-gray-400" />
                      <div>
                        <span className="font-semibold">Operational Area:</span>
                        <div className="text-sm font-semibold">{showDetails.companyLocation.name}</div>
                        {showDetails.companyLocation.address && (
                          <div className="text-xs text-gray-500">{showDetails.companyLocation.address}</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <FiMapPin className="text-gray-400" />
                      <div>
                        <span className="font-semibold">Nearest Area:</span>
                        <div className="text-sm font-semibold">
                          <AsyncAreaName lat={showDetails.latitude} lon={showDetails.longitude} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <FiMapPin className="text-gray-400" />
                    <div>
                      <span className="font-semibold">Coordinates:</span>
                      <div className="text-sm">{showDetails.latitude.toFixed(6)}, {showDetails.longitude.toFixed(6)}</div>
                    </div>
                  </div>
                  <div><span className="font-semibold">Risk Level:</span> 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${riskLevelStyles[showDetails.riskLevel]}`}>
                      {showDetails.riskLevel.toUpperCase()}
                    </span>
                  </div>
                  <div><span className="font-semibold">Risk Score:</span> {showDetails.riskScore.toFixed(3)}</div>
                  <div><span className="font-semibold">Historical Data Score:</span> {showDetails.model1Score ? showDetails.model1Score.toFixed(3) : 'N/A'}</div>
                  <div><span className="font-semibold">Weather Score:</span> {showDetails.model2Score ? showDetails.model2Score.toFixed(3) : 'N/A'}</div>
                  {showDetails.model3Score != null && (
                    <div><span className="font-semibold">Breeding Area Detection Score:</span> {showDetails.model3Score.toFixed(3)}</div>
                  )}
                  {showDetails.combinedScore !== undefined && (
                    <div><span className="font-semibold">Combined Score:</span> {showDetails.combinedScore.toFixed(3)}</div>
                  )}
                  {showDetails.imagesProcessed !== undefined && (
                    <div><span className="font-semibold">Images Processed:</span> {showDetails.imagesProcessed}</div>
                  )}
                  {showDetails.modelsUsed && (
                    <div><span className="font-semibold">Models Used:</span> {showDetails.modelsUsed.join(', ')}</div>
                  )}
                  {showDetails.breedingAreaDetections && showDetails.breedingAreaDetections.length > 0 && (
                    <div>
                      <span className="font-semibold">Breeding Areas Detected:</span>
                      <div className="ml-4 mt-1 text-sm">
                        <div>Count: {showDetails.breedingAreaDetections.length}</div>
                        {showDetails.model3RiskLevel && (
                          <div>Risk Level: {showDetails.model3RiskLevel}</div>
                        )}
                      </div>
                    </div>
                  )}
                  {showDetails.isHotspot !== undefined && (
                    <div><span className="font-semibold">Hotspot Status:</span> 
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${showDetails.isHotspot ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                        {showDetails.isHotspot ? 'Hotspot Area' : 'Normal Area'}
                      </span>
                    </div>
                  )}
                  {showDetails.locationCluster !== undefined && (
                    <div><span className="font-semibold">Location Cluster:</span> {showDetails.locationCluster}</div>
                  )}
                  {showDetails.historicalFeatures && (
                    <div>
                      <span className="font-semibold">Historical Features:</span>
                      <div className="ml-4 mt-1 text-sm space-y-1">
                        <div>Lag 1: {showDetails.historicalFeatures.cases_lag_1.toFixed(1)}</div>
                        <div>Lag 7: {showDetails.historicalFeatures.cases_lag_7.toFixed(1)}</div>
                        <div>Avg 7: {showDetails.historicalFeatures.cases_avg_7.toFixed(1)}</div>
                      </div>
                    </div>
                  )}
                  {showDetails.dataQuality && (
                    <div>
                      <span className="font-semibold">Data Quality:</span>
                      <div className="ml-4 mt-1 text-sm">
                        <div>Data Points: {showDetails.dataQuality.data_points_available}</div>
                        <div>Has Lag 1: {showDetails.dataQuality.has_lag_1 ? 'Yes' : 'No'}</div>
                        <div>Has Lag 7: {showDetails.dataQuality.has_lag_7 ? 'Yes' : 'No'}</div>
                      </div>
                    </div>
                  )}
                  <div><span className="font-semibold">Prediction Date:</span> {new Date(showDetails.createdAt).toLocaleString()}</div>
                </div>
                <div className="mt-6">
                  <button className="bg-accent-blue text-white px-4 py-2 rounded-lg font-bold hover:bg-secondary-blue" onClick={() => setShowDetails(null)}>Close</button>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Prediction Modal */}
          {showEnhancedPrediction && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-8 shadow-lg w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
                <button className="absolute top-2 right-2 text-gray-400 hover:text-primary-dark text-2xl" onClick={() => setShowEnhancedPrediction(false)}>&times;</button>
                <h2 className="text-2xl font-bold mb-6">Enhanced Prediction</h2>
                
                <div className="space-y-6">
                  {/* Coordinates Input */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Latitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        placeholder="3.1390"
                        className="w-full rounded-lg border border-gray-400 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                        id="enhanced-lat"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Longitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        placeholder="101.6869"
                        className="w-full rounded-lg border border-gray-400 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                        id="enhanced-lon"
                      />
                    </div>
                  </div>

                  {/* Prediction Mode */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Prediction Mode</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="predictionMode"
                          value="combined"
                          checked={enhancedPredictionMode === 'combined'}
                          onChange={(e) => setEnhancedPredictionMode(e.target.value as 'combined' | 'model1')}
                          className="accent-accent-blue"
                        />
                        <span>Combined Models (Historical + Weather)</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="predictionMode"
                          value="model1"
                          checked={enhancedPredictionMode === 'model1'}
                          onChange={(e) => setEnhancedPredictionMode(e.target.value as 'combined' | 'model1')}
                          className="accent-accent-blue"
                        />
                        <span>Model 1 Only (Historical)</span>
                      </label>
                    </div>
                  </div>

                  {/* Target Date */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Target Date (Optional)</label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-400 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                    />
                  </div>

                  {/* Historical Data Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold">Historical Data</label>
                      <button
                        onClick={() => {
                          const lat = (document.getElementById('enhanced-lat') as HTMLInputElement)?.value;
                          const lon = (document.getElementById('enhanced-lon') as HTMLInputElement)?.value;
                          if (lat && lon) {
                            loadHistoricalData(parseFloat(lat), parseFloat(lon));
                          }
                        }}
                        disabled={loadingHistoricalData}
                        className="text-sm bg-accent-blue text-white px-3 py-1 rounded hover:bg-secondary-blue disabled:opacity-50"
                      >
                        {loadingHistoricalData ? 'Loading...' : 'Load Historical Data'}
                      </button>
                    </div>
                    
                    {historicalData.length > 0 ? (
                      <div className="bg-gray-50 rounded-lg p-4 max-h-32 overflow-y-auto">
                        <div className="text-sm text-gray-600 mb-2">Found {historicalData.length} data points</div>
                        <div className="space-y-1 text-xs">
                          {historicalData.slice(0, 5).map((item, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>{item.date}</span>
                              <span>{item.cases} cases</span>
                            </div>
                          ))}
                          {historicalData.length > 5 && (
                            <div className="text-gray-500">... and {historicalData.length - 5} more</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500 text-sm">
                        No historical data loaded. Click "Load Historical Data" to fetch data for the coordinates.
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => {
                        const lat = (document.getElementById('enhanced-lat') as HTMLInputElement)?.value;
                        const lon = (document.getElementById('enhanced-lon') as HTMLInputElement)?.value;
                        if (lat && lon) {
                          handleEnhancedPrediction(parseFloat(lat), parseFloat(lon));
                        } else {
                          setError('Please enter valid coordinates');
                        }
                      }}
                      disabled={loading}
                      className="flex-1 bg-accent-blue text-white px-6 py-3 rounded-lg font-bold hover:bg-secondary-blue disabled:opacity-50"
                    >
                      {loading ? 'Predicting...' : 'Make Enhanced Prediction'}
                    </button>
                    <button
                      onClick={() => setShowEnhancedPrediction(false)}
                      className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* Notification Settings */}
          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            {/* Set Alert Rules */}
            <div className="bg-white rounded-xl p-6 shadow">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <FiAlertTriangle className="text-accent-blue" />
                Set Alert Rules
              </h3>

              <div className="space-y-4">
                <div className="text-sm font-semibold text-primary-dark mb-2">Risk Level Thresholds</div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">High Risk</span>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm">≥ 3</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Medium Risk</span>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">≥ 1</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Low Risk</span>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">≥ 0</span>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-sm font-semibold text-primary-dark mb-2">Notification Recipients</div>
                  <select className="w-full rounded-lg border border-gray-400 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue" value={alertRecipient} onChange={e => setAlertRecipient(e.target.value)}>
                    <option value="">-- Select Recipients --</option>
                    <option>All Health Officials</option>
                  </select>
                </div>

                <div className="mt-4">
                  <div className="text-sm font-semibold text-primary-dark mb-2">Notification Channels</div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="accent-accent-blue" defaultChecked />
                      <span className="text-sm">Email</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="accent-accent-blue" defaultChecked />
                      <span className="text-sm">SMS</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="accent-accent-blue" />
                      <span className="text-sm">Push Notification</span>
                    </label>
                  </div>
                </div>

                {alertSaveError && <div className="text-red-600 bg-red-100 border border-red-200 rounded-lg px-4 py-2 font-semibold">{alertSaveError}</div>}
                {alertSaveSuccess && <div className="text-green-700 bg-green-100 border border-green-200 rounded-lg px-4 py-2 font-semibold">{alertSaveSuccess}</div>}
                <button className="w-full bg-accent-blue text-white py-2 rounded-lg font-bold hover:bg-secondary-blue mt-4 disabled:opacity-60" onClick={handleSaveAlertRules} disabled={savingAlert || !alertRecipient}>
                  {savingAlert ? "Saving..." : "Save Alert Rules"}
                </button>
              </div>
            </div>

            {/* Scheduled Notifications & Alert History */}
            <div className="space-y-6">
              {/* Scheduled Notifications */}
              <div className="bg-white rounded-xl p-6 shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <FiClock className="text-accent-blue" />
                    Scheduled Notifications
                  </h3>
                  <button className="bg-accent-blue text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-secondary-blue">
                    + Create New Alert Schedule
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">Daily High Risk Report</div>
                      <div className="text-xs text-gray-500">Every day at 8:00 AM</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="text-accent-blue hover:bg-white p-1 rounded">
                        <FiEye className="w-4 h-4" />
                      </button>
                      <button className="text-accent-blue hover:bg-white p-1 rounded">
                        <FiAlertTriangle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">Weekly Summary</div>
                      <div className="text-xs text-gray-500">Every Mon at 9:00 AM</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="text-accent-blue hover:bg-white p-1 rounded">
                        <FiEye className="w-4 h-4" />
                      </button>
                      <button className="text-accent-blue hover:bg-white p-1 rounded">
                        <FiAlertTriangle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alert History */}
              <div className="bg-white rounded-xl p-6 shadow">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <FiCheckCircle className="text-accent-blue" />
                  Alert History
                </h3>

                <div className="space-y-3">
                  {alertHistory.map((alert, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {alert.icon}
                        <div>
                          <div className="font-medium text-sm">{alert.title}</div>
                          <div className="text-xs text-gray-500">
                            {alert.date} - {alert.status}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="text-accent-blue hover:bg-white p-1 rounded">
                          <FiEye className="w-4 h-4" />
                        </button>
                        <button className="text-accent-blue hover:bg-white p-1 rounded">
                          <FiDownload className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="w-full text-accent-blue font-semibold text-sm mt-4 hover:bg-light-bg py-2 rounded-lg">
                  View All Alert History
                </button>
              </div>
            </div>
          </motion.div>

          {/* Bottom Actions */}
          {/* <motion.div variants={item} className="flex justify-end gap-4">
            <button className="bg-gray-200 text-primary-dark px-8 py-2 rounded-lg font-bold text-base hover:bg-light-bg">
              Reset to Defaults
            </button>
            <button className="bg-accent-blue text-white px-8 py-2 rounded-lg font-bold text-base hover:bg-secondary-blue">
              Save All Settings
            </button>
          </motion.div> */}
        </motion.section>
      </main>
    </div>
  )
}
