"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  FlaskConical, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  Activity,
  Database,
  Cpu,
  Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { testPredictionAccuracy, getAccuracyDateRange, reverseGeocode, PredictionAccuracyResponse } from "@/lib/api"

// Dynamically import MapPicker to avoid SSR issues
const MapPicker = dynamic(() => import("@/components/MapPicker"), { 
  ssr: false,
  loading: () => (
    <div className="h-[400px] bg-white/10 rounded-lg flex items-center justify-center">
      <div className="text-white/70">Loading map...</div>
    </div>
  )
})

type LatLng = { lat: number; lng: number }

export default function PredictionAccuracyPage() {
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<PredictionAccuracyResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<{ earliest: string | null; latest: string | null } | null>(null)
  const [locationLabel, setLocationLabel] = useState<string | null>(null)
  const [locationLabelLoading, setLocationLabelLoading] = useState(false)

  // Fetch available date range on mount
  useEffect(() => {
    async function fetchDateRange() {
      try {
        const response = await getAccuracyDateRange()
        setDateRange(response.dateRange)
      } catch (err) {
        console.error("Failed to fetch date range:", err)
      }
    }
    fetchDateRange()
  }, [])

  // Reverse geocode when location changes
  useEffect(() => {
    let cancelled = false
    async function fetchLabel() {
      if (!selectedLocation) {
        setLocationLabel(null)
        return
      }
      setLocationLabelLoading(true)
      try {
        const data = await reverseGeocode(selectedLocation.lat, selectedLocation.lng)
        if (cancelled) return
        const label =
          data.display_name ||
          data.address?.suburb ||
          data.address?.city ||
          data.address?.state_district ||
          data.address?.state ||
          data.address?.postcode ||
          null
        setLocationLabel(label)
      } catch {
        if (!cancelled) setLocationLabel(null)
      } finally {
        if (!cancelled) setLocationLabelLoading(false)
      }
    }
    fetchLabel()
    return () => {
      cancelled = true
    }
  }, [selectedLocation])

  // Get max date (yesterday)
  const getMaxDate = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }

  // Handle test accuracy
  const handleTestAccuracy = async () => {
    if (!selectedLocation) {
      setError("Please select a location on the map")
      return
    }
    if (!selectedDate) {
      setError("Please select a date")
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await testPredictionAccuracy({
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        date: selectedDate,
      })
      setResult(response)
    } catch (err: any) {
      console.error("Test accuracy error:", err)
      setError(err.response?.data?.error || err.message || "Failed to test prediction accuracy")
    } finally {
      setIsLoading(false)
    }
  }

  // Get risk level color
  const getRiskLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'high':
        return 'text-red-400 bg-red-500/20 border-red-500/30'
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      case 'low':
        return 'text-green-400 bg-green-500/20 border-green-500/30'
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  // Get accuracy score color
  const getAccuracyColor = (score: number | null) => {
    if (score === null) return 'text-gray-400'
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-lime-400'
    if (score >= 40) return 'text-yellow-400'
    if (score >= 20) return 'text-orange-400'
    return 'text-red-400'
  }

  // Get accuracy bar color
  const getAccuracyBarColor = (score: number | null) => {
    if (score === null) return 'bg-gray-500'
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-lime-500'
    if (score >= 40) return 'bg-yellow-500'
    if (score >= 20) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-secondary-blue to-accent-blue relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-light-bg rounded-full transform translate-y-1/2 -translate-x-1/4 opacity-80"></div>
      <div className="absolute top-1/4 right-0 w-80 h-80 bg-accent-blue rounded-full transform translate-x-1/3 -translate-y-1/4 opacity-60"></div>
      <div className="absolute top-0 right-1/4 w-64 h-64 bg-light-bg rounded-full transform -translate-y-1/2 opacity-80"></div>
      <div className="absolute bottom-1/4 left-1/3 w-48 h-48 bg-secondary-blue rounded-full transform translate-y-1/4 opacity-40"></div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Link href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <h1 className="text-white text-4xl font-bold mb-2">
              Prediction Model Accuracy Test
            </h1>
            <p className="text-white/70">
              Test the accuracy of our dengue risk prediction model by comparing predictions with actual historical data
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-6"
            >
              {/* Map Card */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl overflow-hidden rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Select Location
                  </CardTitle>
                  <p className="text-white/60 text-sm">
                    Click on the map or use search to select a location
                  </p>
                </CardHeader>
                <CardContent className="pt-2">
                  <MapPicker
                    value={selectedLocation}
                    onChange={(coords) => {
                      setSelectedLocation(coords)
                      setError(null)
                    }}
                    height={400}
                  />
                  {selectedLocation && (
                    <div className="mt-3 p-3 bg-white/5 rounded-lg">
                      <p className="text-white/80 text-sm font-semibold">
                        {locationLabelLoading
                          ? "Resolving address..."
                          : locationLabel || "Location selected"}
                      </p>
                      {/* <p className="text-white/50 text-xs mt-1">
                        ({selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)})
                      </p> */}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Date Selection Card */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl overflow-hidden rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Select Date
                  </CardTitle>
                  <p className="text-white/60 text-sm">
                    Choose a past date to test the prediction against actual data
                  </p>
                </CardHeader>
                <CardContent className="pt-2">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value)
                      setError(null)
                    }}
                    max={getMaxDate()}
                    min={dateRange?.earliest?.split('T')[0] || undefined}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20"
                  />
                  {dateRange && (
                    <p className="mt-2 text-white/50 text-xs flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Data available from {dateRange.earliest ? new Date(dateRange.earliest).toLocaleDateString() : 'N/A'} to {dateRange.latest ? new Date(dateRange.latest).toLocaleDateString() : 'N/A'}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Test Button */}
              <Button
                onClick={handleTestAccuracy}
                disabled={isLoading || !selectedLocation || !selectedDate}
                className="w-full py-6 text-lg font-semibold bg-[#A21C1C] hover:bg-[#7C1D1D] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Testing Accuracy...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <FlaskConical className="w-5 h-5" />
                    Test Model Accuracy
                  </span>
                )}
              </Button>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg"
                >
                  <p className="text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                  </p>
                </motion.div>
              )}
            </motion.div>

            {/* Right Column - Results */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-6"
            >
              {!result ? (
                <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl overflow-hidden rounded-2xl h-full min-h-[500px] flex items-center justify-center">
                  <CardContent className="text-center">
                    <FlaskConical className="w-16 h-16 text-white/30 mx-auto mb-4" />
                    <h3 className="text-white/50 text-xl font-medium mb-2">No Results Yet</h3>
                    <p className="text-white/40">
                      Select a location and date, then click<br />"Test Model Accuracy" to see results
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Accuracy Score Card */}
                  <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl overflow-hidden rounded-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-white flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Accuracy Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-4">
                        {result.accuracy.score !== null ? (
                          <>
                            <div className={`text-6xl font-bold ${getAccuracyColor(result.accuracy.score)}`}>
                              {result.accuracy.score}%
                            </div>
                            <div className="mt-3 w-full bg-white/10 rounded-full h-3">
                              <div 
                                className={`h-3 rounded-full transition-all duration-500 ${getAccuracyBarColor(result.accuracy.score)}`}
                                style={{ width: `${result.accuracy.score}%` }}
                              ></div>
                            </div>
                            <p className="mt-3 text-white/70 text-sm">
                              {result.accuracy.interpretation}
                            </p>
                            <div className="mt-3 flex items-center justify-center gap-2">
                              {result.accuracy.riskLevelMatch ? (
                                <span className="flex items-center gap-1 text-green-400 text-sm">
                                  <CheckCircle2 className="w-4 h-4" />
                                  Risk Level Match
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-red-400 text-sm">
                                  <XCircle className="w-4 h-4" />
                                  Risk Level Mismatch
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="text-white/50">
                            <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>{result.accuracy.interpretation}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Side-by-Side Comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Predicted */}
                    <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl overflow-hidden rounded-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-white text-base flex items-center gap-2">
                          <Cpu className="w-4 h-4" />
                          ML Prediction
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {result.prediction.available ? (
                          <>
                            <div>
                              <p className="text-white/50 text-xs">Risk Level</p>
                              <span className={`inline-block px-2 py-1 rounded text-sm font-medium border ${getRiskLevelColor(result.prediction.riskLevel || '')}`}>
                                {result.prediction.riskLevel?.toUpperCase() || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <p className="text-white/50 text-xs">Combined Score</p>
                              <p className="text-white text-xl font-bold">
                                {result.prediction.combinedScore?.toFixed(2) || 'N/A'}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <p className="text-white/50">Historical Cases Model</p>
                                <p className="text-white">{result.prediction.model1Score?.toFixed(2) || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-white/50">Weather-Based Model</p>
                                <p className="text-white">{result.prediction.model2Score?.toFixed(2) || 'N/A'}</p>
                              </div>
                            </div>
                            {result.prediction.isHotspot !== undefined && (
                              <div className="text-xs">
                                <p className="text-white/50">Hotspot Status</p>
                                <p className={result.prediction.isHotspot ? 'text-red-400' : 'text-green-400'}>
                                  {result.prediction.isHotspot ? 'Yes' : 'No'}
                                </p>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-red-300 text-sm">
                            <XCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>Prediction unavailable</p>
                            {result.prediction.error && (
                              <p className="text-xs text-red-300/70 mt-1">{result.prediction.error}</p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Actual */}
                    <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl overflow-hidden rounded-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-white text-base flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          Actual Data
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {result.actualData.found ? (
                          <>
                            <div>
                              <p className="text-white/50 text-xs">Risk Level</p>
                              <span className={`inline-block px-2 py-1 rounded text-sm font-medium border ${getRiskLevelColor(result.actualData.riskLevel)}`}>
                                {result.actualData.riskLevel.toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-white/50 text-xs">Active Cases</p>
                              <p className="text-white text-xl font-bold">
                                {result.actualData.totalActiveCases}
                              </p>
                            </div>
                            <div className="text-xs">
                              <p className="text-white/50">Records Found</p>
                              <p className="text-white">{result.actualData.recordsCount}</p>
                            </div>
                            <div className="text-xs">
                              <p className="text-white/50">Data Source</p>
                              <p className="text-white capitalize">{result.actualData.source.replace('_', ' ')}</p>
                            </div>
                          </>
                        ) : (
                          <div className="text-yellow-300 text-sm">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No data found</p>
                            <p className="text-xs text-yellow-300/70 mt-1">
                              No dengue records for this location and date
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Detailed Records */}
                  {result.actualData.found && result.actualData.records.length > 0 && (
                    <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl overflow-hidden rounded-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-white text-base flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Matching Records
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {result.actualData.records.map((record, index) => (
                            <div key={record.id || index} className="p-2 bg-white/5 rounded-lg text-sm">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-white font-medium">{record.location || 'Unknown Location'}</p>
                                  <p className="text-white/50 text-xs">
                                    {new Date(record.date).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-white">
                                    <span className="text-white/50">Active:</span> {record.activeCases || 0}
                                  </p>
                                  <p className="text-white/70 text-xs">
                                    <span className="text-white/50">Total:</span> {record.totalCases || 0}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Test Info */}
                  <div className="text-white/40 text-xs text-center">
                    <p>Test performed at {new Date(result.timestamp).toLocaleString()}</p>
                    <p>Search radius: {result.test.toleranceRadius}</p>
                  </div>
                </>
              )}
            </motion.div>
          </div>

          {/* Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8"
          >
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 rounded-2xl">
              <CardContent className="p-6">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  How This Works
                </h3>
                <div className="grid md:grid-cols-3 gap-4 text-sm text-white/70">
                  <div>
                    <h4 className="text-white font-medium mb-1">1. ML Prediction</h4>
                    <p>We send the selected location and past date to our ML model to get what it would have predicted for that day.</p>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">2. Actual Data</h4>
                    <p>We fetch real dengue case records from our database for the same location and date range.</p>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">3. Comparison</h4>
                    <p>We compare the predicted risk level and score with actual cases to calculate an accuracy percentage.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
