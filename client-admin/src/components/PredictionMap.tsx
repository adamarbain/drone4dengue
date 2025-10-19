"use client"

import { useState, useEffect, useRef } from 'react'
import { predictCompany, getCompanyPredictions, getCompanyLocations, checkPredictionHealth, PredictionResponse, CompanyLocation, reverseGeocode } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { FiRefreshCw, FiAlertTriangle, FiCheckCircle, FiClock, FiMapPin, FiTarget } from 'react-icons/fi'
import { ProgressModal } from '@/components/ui/progress-modal'

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
  createdAt: string
}


interface PredictionMapProps {
  onPredictionUpdate: (predictions: PredictionData[]) => void
}

export default function PredictionMap({ onPredictionUpdate }: PredictionMapProps) {
  const { companyId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [predictions, setPredictions] = useState<PredictionData[]>([])
  const [companyLocations, setCompanyLocations] = useState<CompanyLocation[]>([])
  const [healthStatus, setHealthStatus] = useState<{
    ml_service: string
    redis: string
    database: string
  } | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lon: number, locationId?: string} | null>(null)
  const [autoPredicting, setAutoPredicting] = useState(false)
  
  // Progress modal state
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [progressItems, setProgressItems] = useState<Array<{
    id: string
    name: string
    status: 'pending' | 'processing' | 'completed' | 'error'
    error?: string
  }>>([])
  const [currentProgressIndex, setCurrentProgressIndex] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const cancelRef = useRef(false)

  // Reverse geocoding cache and helpers
  const reverseGeocodeCache = useRef<Map<string, string>>(new Map())
  const getAreaName = async (lat: number, lon: number): Promise<string> => {
    const key = `${lat.toFixed(5)},${lon.toFixed(5)}`
    const cache = reverseGeocodeCache.current
    if (cache.has(key)) return cache.get(key) as string
    try {
      const data = await reverseGeocode(lat, lon)
      const a = data.address || {}
      const label = a.suburb || a.town || a.village || a.city || a.neighbourhood || a.state_district || a.state || a.county || data.display_name || 'Unknown'
      cache.set(key, label)
      return label
    } catch {
      return 'Unknown'
    }
  }

  // Check service health on component mount
  useEffect(() => {
    checkHealth()
    loadCompanyPredictions()
    loadCompanyLocations()
  }, [companyId])

  const checkHealth = async () => {
    try {
      const health = await checkPredictionHealth()
      setHealthStatus(health.services)
    } catch (err) {
      console.error('Health check failed:', err)
    }
  }

  const loadCompanyPredictions = async () => {
    if (!companyId) return
    
    try {
      const response = await getCompanyPredictions(companyId, 20, 0)
      if (response.success) {
        // Enrich predictions with reverse geocoded name when companyLocation is missing
        const enriched = await Promise.all(response.predictions.map(async (p) => {
          if (!p.companyLocation) {
            const name = await getAreaName(p.latitude, p.longitude)
            return { ...p, companyLocation: { id: '', name, address: undefined, latitude: p.latitude, longitude: p.longitude, isActive: true } as any }
          }
          return p
        }))
        setPredictions(enriched)
        onPredictionUpdate(enriched)
      }
    } catch (err) {
      console.error('Failed to load predictions:', err)
    }
  }

  const loadCompanyLocations = async () => {
    if (!companyId) return
    
    try {
      console.log('Loading company locations for companyId:', companyId)
      const response = await getCompanyLocations(companyId)
      
      console.log('Company locations response:', response)
      if (response.success) {
        setCompanyLocations(response.locations || [])
      } else {
        setError('Failed to load company locations')
      }
    } catch (err: any) {
      console.error('Failed to load company locations:', err)
      setError(`Failed to load company locations: ${err.response?.data?.message || err.message}`)
    }
  }

  const createPredictionsForAllLocations = async () => {
    if (!companyId || !isServiceHealthy) {
      setError('Service not available or company ID missing')
      return
    }

    const locationsWithCoords = companyLocations.filter(loc => 
      loc.latitude && loc.longitude && loc.isActive && !hasPredictionToday(loc.id)
    )

    if (locationsWithCoords.length === 0) {
      const totalLocations = companyLocations.length
      const locationsWithoutCoords = companyLocations.filter(loc => !loc.latitude || !loc.longitude)
      const inactiveLocations = companyLocations.filter(loc => !loc.isActive)
      const locationsWithTodayPrediction = companyLocations.filter(loc => 
        loc.latitude && loc.longitude && loc.isActive && hasPredictionToday(loc.id)
      )
      
      let errorMsg = 'No company locations available for prediction. '
      if (totalLocations === 0) {
        errorMsg += 'No company locations found at all.'
      } else {
        errorMsg += `Found ${totalLocations} locations: `
        if (locationsWithoutCoords.length > 0) {
          errorMsg += `${locationsWithoutCoords.length} without coordinates, `
        }
        if (inactiveLocations.length > 0) {
          errorMsg += `${inactiveLocations.length} inactive, `
        }
        if (locationsWithTodayPrediction.length > 0) {
          errorMsg += `${locationsWithTodayPrediction.length} already have predictions for today.`
        }
      }
      setError(errorMsg)
      return
    }

    // Initialize progress modal
    const initialItems = locationsWithCoords.map(location => ({
      id: location.id,
      name: location.name,
      status: 'pending' as const
    }))

    setProgressItems(initialItems)
    setCurrentProgressIndex(0)
    setCompletedCount(0)
    setErrorCount(0)
    setShowProgressModal(true)
    setAutoPredicting(true)
    setError('')
    cancelRef.current = false

    // Process locations one by one with progress updates
    let localCompletedCount = 0
    let localErrorCount = 0
    
    for (let i = 0; i < locationsWithCoords.length; i++) {
      if (cancelRef.current) {
        break
      }

      const location = locationsWithCoords[i]
      
      // Update current item to processing
      setProgressItems(prev => prev.map((item, index) => 
        index === i ? { ...item, status: 'processing' } : item
      ))
      setCurrentProgressIndex(i)

      try {
        const response = await predictCompany({
          companyId,
          companyLocationId: location.id,
          lat: location.latitude!,
          lon: location.longitude!,
        })

        if (response.success) {
          // Update item to completed
          setProgressItems(prev => prev.map((item, index) => 
            index === i ? { ...item, status: 'completed' } : item
          ))
          localCompletedCount++
          setCompletedCount(localCompletedCount)
        } else {
          // Update item to error
          setProgressItems(prev => prev.map((item, index) => 
            index === i ? { 
              ...item, 
              status: 'error',
              error: 'Prediction failed'
            } : item
          ))
          localErrorCount++
          setErrorCount(localErrorCount)
        }
      } catch (err: any) {
        console.error(`Failed to predict for location ${location.name}:`, err)
        // Update item to error
        setProgressItems(prev => prev.map((item, index) => 
          index === i ? { 
            ...item, 
            status: 'error',
            error: err.response?.data?.error || 'Network error'
          } : item
        ))
        localErrorCount++
        setErrorCount(localErrorCount)
      }

      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Reload predictions to show the new ones - always reload if we processed any locations
    if (localCompletedCount > 0 || localErrorCount > 0) {
      console.log('Reloading predictions after batch creation...')
      await loadCompanyPredictions()
    }

    setAutoPredicting(false)
    
    // Show success message and auto-close modal if all predictions completed successfully
    if (localCompletedCount > 0 && localErrorCount === 0) {
      setShowSuccessMessage(true)
      setTimeout(() => {
        setShowProgressModal(false)
        setProgressItems([])
        setCurrentProgressIndex(0)
        setCompletedCount(0)
        setErrorCount(0)
        setShowSuccessMessage(false)
      }, 3000) // Close after 3 seconds
    }
  }

  const handleCancelPrediction = () => {
    cancelRef.current = true
    setAutoPredicting(false)
  }

  const handleCloseProgressModal = () => {
    setShowProgressModal(false)
    setProgressItems([])
    setCurrentProgressIndex(0)
    setCompletedCount(0)
    setErrorCount(0)
  }

  const handleLocationClick = (lat: number, lon: number, locationId?: string) => {
    setSelectedLocation({ lat, lon, locationId })
  }

  const predictLocation = async (lat: number, lon: number, locationId?: string) => {
    if (!companyId) {
      setError('Company ID not available')
      return
    }

    // Check if this location already has a prediction for today
    if (locationId && hasPredictionToday(locationId)) {
      const existingPrediction = getTodayPrediction(locationId)
      setError(`This location already has a prediction for today (${existingPrediction?.riskLevel.toUpperCase()} risk). Only one prediction per location per day is allowed.`)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await predictCompany({
        companyId,
        companyLocationId: locationId,
        lat,
        lon
      })

      if (response.success) {
        // Reload predictions to show the new one
        await loadCompanyPredictions()
        setSelectedLocation(null)
      } else {
        setError('Prediction failed')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Prediction failed')
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getRiskTextColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'text-red-700 bg-red-100'
      case 'medium': return 'text-yellow-800 bg-yellow-100'
      case 'low': return 'text-green-700 bg-green-100'
      default: return 'text-gray-700 bg-gray-100'
    }
  }

  const isServiceHealthy = healthStatus && 
    healthStatus.ml_service === 'healthy' && 
    healthStatus.redis === 'healthy' && 
    healthStatus.database === 'healthy'

  // Helper function to check if a location already has a prediction for today
  const hasPredictionToday = (locationId: string): boolean => {
    const today = new Date().toDateString()
    return predictions.some(prediction => 
      prediction.companyLocationId === locationId && 
      new Date(prediction.createdAt).toDateString() === today
    )
  }

  // Helper function to get today's prediction for a location
  const getTodayPrediction = (locationId: string) => {
    const today = new Date().toDateString()
    return predictions.find(prediction => 
      prediction.companyLocationId === locationId && 
      new Date(prediction.createdAt).toDateString() === today
    )
  }

  return (
    <div className="space-y-6">
      {/* Service Status */}
      <div className="bg-white rounded-xl p-4 shadow">
        <h3 className="font-semibold text-black mb-3">Service Status</h3>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${healthStatus?.ml_service === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm">ML Service</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${healthStatus?.redis === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm">Redis Cache</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${healthStatus?.database === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm">Database</span>
          </div>
        </div>
      </div>

      {/* Prediction Map */}
      <div className="bg-white rounded-xl overflow-hidden shadow">
        <div className="p-4 bg-[#F3EAD8] border-b">
          <h3 className="font-semibold text-black">Prediction Map</h3>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>High Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Medium Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Low Risk</span>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Company Locations Section */}
          {companyLocations.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-black">Company Locations</h4>
                <button
                  onClick={createPredictionsForAllLocations}
                  disabled={autoPredicting || !isServiceHealthy}
                  className="bg-[#A21C1C] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#7C1D1D] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FiTarget className={autoPredicting ? 'animate-spin' : ''} />
                  {autoPredicting 
                    ? `Processing ${currentProgressIndex + 1}/${progressItems.length}...` 
                    : `Predict All Locations (${companyLocations.filter(loc => loc.latitude && loc.longitude && loc.isActive && !hasPredictionToday(loc.id)).length})`
                  }
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {companyLocations.map((location) => {
                  const hasTodayPrediction = hasPredictionToday(location.id)
                  const todayPrediction = getTodayPrediction(location.id)
                  const canPredict = location.latitude && location.longitude && location.isActive && !hasTodayPrediction
                  
                  return (
                    <div 
                      key={location.id} 
                      className={`rounded-lg p-3 border transition-colors ${
                        hasTodayPrediction 
                          ? 'bg-green-50 border-green-200 cursor-default' 
                          : canPredict
                          ? 'bg-gray-50 border-gray-200 cursor-pointer hover:bg-gray-100'
                          : 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                      }`}
                      onClick={() => canPredict && handleLocationClick(location.latitude!, location.longitude!, location.id)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <FiMapPin className={hasTodayPrediction ? "text-green-500" : "text-gray-400"} />
                        <span className="font-medium text-sm">{location.name}</span>
                        {hasTodayPrediction && (
                          <FiCheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      {location.latitude && location.longitude ? (
                        <div className="text-xs text-gray-600">
                          {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                        </div>
                      ) : (
                        <div className="text-xs text-red-600">No coordinates</div>
                      )}
                      {location.address && (
                        <div className="text-xs text-gray-500 mt-1">{location.address}</div>
                      )}
                      {hasTodayPrediction && todayPrediction ? (
                        <div className="text-xs text-green-600 mt-1 font-medium">
                          Today: {todayPrediction.riskLevel.toUpperCase()} Risk ({todayPrediction.riskScore.toFixed(3)})
                        </div>
                      ) : canPredict ? (
                        <div className="text-xs text-blue-600 mt-1">Click to predict</div>
                      ) : !location.isActive ? (
                        <div className="text-xs text-gray-500 mt-1">Inactive</div>
                      ) : (
                        <div className="text-xs text-gray-500 mt-1">No coordinates</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Map Visualization */}
          <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
            <div className="text-center">
              <FiMapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 mb-4">
                {companyLocations.length > 0 
                  ? (() => {
                      const availableForPrediction = companyLocations.filter(loc => 
                        loc.latitude && loc.longitude && loc.isActive && !hasPredictionToday(loc.id)
                      ).length
                      const withTodayPrediction = companyLocations.filter(loc => 
                        loc.latitude && loc.longitude && loc.isActive && hasPredictionToday(loc.id)
                      ).length
                      
                      if (availableForPrediction > 0) {
                        return `Company locations loaded. ${availableForPrediction} available for prediction, ${withTodayPrediction} already predicted today.`
                      } else if (withTodayPrediction > 0) {
                        return `All active locations with coordinates already have predictions for today.`
                      } else {
                        return "Company locations loaded. Click 'Predict All Locations' to create predictions."
                      }
                    })()
                  : "No company locations found. Add locations to create predictions."
                }
              </p>
              {selectedLocation && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Selected Branch: {selectedLocation.locationId ? companyLocations.find(loc => loc.id === selectedLocation.locationId)?.name || 'Unknown Location' : 'Custom Location'}
                  </p>
                  <button
                    onClick={() => predictLocation(selectedLocation.lat, selectedLocation.lon, selectedLocation.locationId)}
                    disabled={loading || !isServiceHealthy || (selectedLocation.locationId ? hasPredictionToday(selectedLocation.locationId) : false)}
                    className={`px-4 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto ${
                      selectedLocation.locationId && hasPredictionToday(selectedLocation.locationId)
                        ? 'bg-gray-500 text-white cursor-not-allowed'
                        : 'bg-[#A21C1C] text-white hover:bg-[#7C1D1D]'
                    }`}
                  >
                    <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                    {selectedLocation.locationId && hasPredictionToday(selectedLocation.locationId)
                      ? 'Already Predicted Today'
                      : loading 
                      ? 'Predicting...' 
                      : 'Predict Risk'
                    }
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <FiAlertTriangle className="text-red-500" />
            <span className="text-red-700 font-semibold">{error}</span>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="bg-green-100 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <FiCheckCircle className="text-green-500" />
            <span className="text-green-700 font-semibold">
              All predictions created successfully! The tables will be updated automatically.
            </span>
          </div>
        </div>
      )}

      {/* Recent Predictions */}
      <div className="bg-white rounded-xl overflow-hidden shadow">
        <div className="p-4 bg-[#F3EAD8] border-b">
          <h3 className="font-semibold text-black">Recent Predictions</h3>
        </div>
        
        <div className="p-4">
          {predictions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FiClock className="w-8 h-8 mx-auto mb-2" />
              <p>No predictions yet. Click on the map to create your first prediction.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {predictions.slice(0, 5).map((prediction) => (
                <div key={prediction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getRiskColor(prediction.riskLevel)}`}></div>
                    <div>
                      <p className="font-medium">
                        {prediction.companyLocation?.name || 'Unknown Location'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {prediction.latitude.toFixed(4)}, {prediction.longitude.toFixed(4)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(prediction.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRiskTextColor(prediction.riskLevel)}`}>
                      {prediction.riskLevel.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium">
                      {prediction.riskScore.toFixed(3)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress Modal */}
      <ProgressModal
        isOpen={showProgressModal}
        onClose={handleCloseProgressModal}
        onCancel={handleCancelPrediction}
        title="Creating Predictions for All Locations"
        items={progressItems}
        currentIndex={currentProgressIndex}
        totalItems={progressItems.length}
        isProcessing={autoPredicting}
        completedCount={completedCount}
        errorCount={errorCount}
      />
    </div>
  )
}
