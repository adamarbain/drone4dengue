"use client"

import { useState, useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { predictCompany, getCompanyPredictions, getCompanyLocations, checkPredictionHealth, PredictionResponse, CompanyLocation, reverseGeocode, predictCompanyThreeModels, getLocationImages } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { FiRefreshCw, FiAlertTriangle, FiCheckCircle, FiClock, FiMapPin, FiTarget } from 'react-icons/fi'
import { ProgressModal } from '@/components/ui/progress-modal'
import {
  Map as MapcnMap,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerLabel,
  MarkerPopup,
  useMap,
} from '@/components/ui/map'

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

// Helper component that runs inside the Map context to auto-fit bounds
function AutoFitBounds({ companyLocations }: { companyLocations: CompanyLocation[] }) {
  const { map, isLoaded } = useMap()

  useEffect(() => {
    if (!map || !isLoaded) return

    const locationsWithCoords = companyLocations.filter(
      (loc) => typeof loc.latitude === 'number' && typeof loc.longitude === 'number'
    )

    if (locationsWithCoords.length === 0) {
      // Nothing to fit; keep whatever default the map has
      return
    }

    if (locationsWithCoords.length === 1) {
      const only = locationsWithCoords[0]
      map.setCenter([only.longitude as number, only.latitude as number])
      map.setZoom(13)
      return
    }

    const bounds = new maplibregl.LngLatBounds()
    locationsWithCoords.forEach((loc) => {
      bounds.extend([loc.longitude as number, loc.latitude as number])
    })

    map.fitBounds(bounds, {
      padding: 40,
      animate: true,
    })
  }, [map, isLoaded, companyLocations])

  return null
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
  
  // Prediction status tracking
  const [predictionStatuses, setPredictionStatuses] = useState<Map<string, 'pending' | 'processing' | 'completed' | 'error'>>(new Map())
  const [predictionErrors, setPredictionErrors] = useState<Map<string, string>>(new Map())

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
        // Use smart prediction logic for batch processing
        // Apply business rules: 50+ images total AND images within last 7 days
        const imagesResponse = await getLocationImages(companyId, location.id)
        const allImages = imagesResponse.images || []
        
        // Calculate date for 7 days ago
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        
        // Filter images to last 7 days
        const recentImages = allImages.filter(img => 
          new Date(img.createdAt) >= sevenDaysAgo
        )
        
        // Check if location qualifies for Model 3 (50+ images total AND recent images available)
        const qualifiesForModel3 = allImages.length >= 50 && recentImages.length > 0
        
        let response
        if (qualifiesForModel3) {
          // Get image IDs from recent images only
          const imageIds = recentImages.map(img => img.id)
          
          // Set status to processing for three-model prediction
          setPredictionStatuses(prev => new Map(prev).set(location.id, 'processing'))
          
          // Use three-model prediction with extended timeout
          response = await predictCompanyThreeModels({
            companyId,
            companyLocationId: location.id,
            lat: location.latitude!,
            lon: location.longitude!,
            imageIds
          })
        } else {
          // Use standard two-model prediction
          response = await predictCompany({
            companyId,
            companyLocationId: location.id,
            lat: location.latitude!,
            lon: location.longitude!,
          })
        }

        if (response.success) {
          // Update item to completed
          setProgressItems(prev => prev.map((item, index) => 
            index === i ? { ...item, status: 'completed' } : item
          ))
          setPredictionStatuses(prev => new Map(prev).set(location.id, 'completed'))
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
          setPredictionStatuses(prev => new Map(prev).set(location.id, 'error'))
          setPredictionErrors(prev => new Map(prev).set(location.id, 'Prediction failed'))
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
        setPredictionStatuses(prev => new Map(prev).set(location.id, 'error'))
        setPredictionErrors(prev => new Map(prev).set(location.id, err.response?.data?.error || 'Network error'))
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
    await performSmartPrediction(lat, lon, locationId)
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

  // Helper function to check if a location has images
  const checkLocationHasImages = async (companyLocationId: string): Promise<boolean> => {
    if (!companyId) return false
    
    try {
      const response = await getLocationImages(companyId, companyLocationId)
      return response.success && response.images && response.images.length > 0
    } catch (error) {
      console.error('Failed to check images for location:', error)
      return false
    }
  }

  // Enhanced prediction function that automatically chooses between 2-model and 3-model
  const performSmartPrediction = async (lat: number, lon: number, locationId?: string) => {
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
      let hasImages = false
      
      // Check if location has images (only for company locations)
      if (locationId) {
        // Get all images for the location
        const imagesResponse = await getLocationImages(companyId, locationId)
        const allImages = imagesResponse.images || []
        
        // Calculate date for 7 days ago
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        
        // Filter images to last 7 days
        const recentImages = allImages.filter(img => 
          new Date(img.createdAt) >= sevenDaysAgo
        )
        
        // Check if location qualifies for Model 3 (50+ images total AND recent images available)
        const qualifiesForModel3 = allImages.length >= 50 && recentImages.length > 0
        
        if (qualifiesForModel3) {
          // Get image IDs from recent images only
          const imageIds = recentImages.map(img => img.id)
          
          // Set status to processing for three-model prediction
          setPredictionStatuses(prev => new Map(prev).set(locationId, 'processing'))
          
          // Use three-model prediction (async - will take longer)
          const response = await predictCompanyThreeModels({
            companyId,
            companyLocationId: locationId,
            lat,
            lon,
            imageIds
          })

          if (response.success) {
            setPredictionStatuses(prev => new Map(prev).set(locationId, 'completed'))
            await loadCompanyPredictions()
            setSelectedLocation(null)
          } else {
            setPredictionStatuses(prev => new Map(prev).set(locationId, 'error'))
            setPredictionErrors(prev => new Map(prev).set(locationId, 'Three-model prediction failed'))
            setError('Three-model prediction failed')
          }
        } else {
          // Use standard two-model prediction
          const response = await predictCompany({
            companyId,
            companyLocationId: locationId,
            lat,
            lon
          })

          if (response.success) {
            await loadCompanyPredictions()
            setSelectedLocation(null)
          } else {
            setError('Prediction failed')
          }
        }
      } else {
        // For custom locations (no company location ID), use standard prediction
        const response = await predictCompany({
          companyId,
          companyLocationId: locationId,
          lat,
          lon
        })

        if (response.success) {
          await loadCompanyPredictions()
          setSelectedLocation(null)
        } else {
          setError('Prediction failed')
        }
      }
    } catch (err: any) {
      if (locationId) {
        setPredictionStatuses(prev => new Map(prev).set(locationId, 'error'))
        setPredictionErrors(prev => new Map(prev).set(locationId, err.response?.data?.error || 'Network error'))
      }
      setError(err.response?.data?.error || 'Prediction failed')
    } finally {
      setLoading(false)
    }
  }

  // Compute a sensible map center based on available company locations (fallback)
  const getMapCenter = (): [number, number] => {
    const locationsWithCoords = companyLocations.filter(
      (loc) => typeof loc.latitude === 'number' && typeof loc.longitude === 'number'
    )

    if (locationsWithCoords.length === 0) {
      // Fallback center (0,0) if no coordinates are available
      return [0, 0]
    }

    const avgLat =
      locationsWithCoords.reduce((sum, loc) => sum + (loc.latitude as number), 0) /
      locationsWithCoords.length
    const avgLon =
      locationsWithCoords.reduce((sum, loc) => sum + (loc.longitude as number), 0) /
      locationsWithCoords.length

    // Map expects [longitude, latitude]
    return [avgLon, avgLat]
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
          {/* Interactive Map with Company Location Markers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-black">Operational Areas</h4>
              <button
                onClick={createPredictionsForAllLocations}
                disabled={autoPredicting || !isServiceHealthy}
                className="bg-accent-blue text-white px-4 py-2 rounded-lg font-semibold hover:bg-secondary-blue disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <FiTarget className={autoPredicting ? 'animate-spin' : ''} />
                {autoPredicting 
                  ? `Processing ${currentProgressIndex + 1}/${progressItems.length}...` 
                  : `Predict All Locations (${companyLocations.filter(loc => loc.latitude && loc.longitude && loc.isActive && !hasPredictionToday(loc.id)).length})`
                }
              </button>
            </div>

            <div className="h-[600px] w-full rounded-lg overflow-hidden bg-gray-100">
              <MapcnMap center={getMapCenter()} zoom={11}>
                <MapControls />
                <AutoFitBounds companyLocations={companyLocations} />
                {companyLocations
                  .filter(
                    (location) =>
                      typeof location.latitude === 'number' &&
                      typeof location.longitude === 'number'
                  )
                  .map((location) => {
                    const todayPrediction = getTodayPrediction(location.id)
                    const hasTodayPrediction = !!todayPrediction
                    const riskLevel = todayPrediction?.riskLevel || ''
                    const markerColor = getRiskColor(riskLevel)

                    return (
                      <MapMarker
                        key={location.id}
                        longitude={location.longitude as number}
                        latitude={location.latitude as number}
                      >
                        <MarkerContent>
                          <div className={`size-5 rounded-full ${markerColor} border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform`} />
                          <MarkerLabel position="bottom">
                            {location.name || 'Location'}
                          </MarkerLabel>
                        </MarkerContent>
                        <MarkerPopup className="p-3 w-64">
                          <div className="space-y-2">
                            <div>
                              <h3 className="font-semibold text-foreground leading-tight">
                                {location.name || 'Operational Area'}
                              </h3>
                              {location.address && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {location.address}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {(location.latitude as number).toFixed(4)},{' '}
                                {(location.longitude as number).toFixed(4)}
                              </p>
                            </div>

                            {hasTodayPrediction && todayPrediction && (
                              <div className="text-xs">
                                <span className="font-medium">
                                  Today:&nbsp;
                                  {todayPrediction.riskLevel.toUpperCase()}
                                </span>
                                <span className="text-muted-foreground">
                                  {' '}
                                  ({todayPrediction.riskScore.toFixed(3)})
                                </span>
                              </div>
                            )}
                          </div>
                        </MarkerPopup>
                      </MapMarker>
                    )
                  })}
              </MapcnMap>
            </div>

            <p className="text-gray-600 text-sm">
              {companyLocations.length > 0 
                ? (() => {
                    const availableForPrediction = companyLocations.filter(loc => 
                      loc.latitude && loc.longitude && loc.isActive && !hasPredictionToday(loc.id)
                    ).length
                    const withTodayPrediction = companyLocations.filter(loc => 
                      loc.latitude && loc.longitude && loc.isActive && hasPredictionToday(loc.id)
                    ).length
                    
                    if (availableForPrediction > 0) {
                      return `Operational Areas loaded. ${availableForPrediction} available for prediction, ${withTodayPrediction} already predicted today.`
                    } else if (withTodayPrediction > 0) {
                      return `All active locations with coordinates already have predictions for today.`
                    } else {
                      return "Operational Areas loaded. Click 'Predict All Locations' to create predictions."
                    }
                  })()
                : "No Operational Areas found. Add Operational Areas to create predictions."
              }
            </p>

            {selectedLocation && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Selected Branch: {selectedLocation.locationId ? companyLocations.find(loc => loc.id === selectedLocation.locationId)?.name || 'Unknown Location' : 'Custom Location'}
                </p>
                {selectedLocation.locationId && predictionStatuses.get(selectedLocation.locationId) === 'processing' && (
                  <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FiRefreshCw className="animate-spin" />
                      <span>Processing with AI detection... This may take several minutes</span>
                    </div>
                  </div>
                )}
                {selectedLocation.locationId && predictionStatuses.get(selectedLocation.locationId) === 'error' && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FiAlertTriangle />
                      <span>Error: {predictionErrors.get(selectedLocation.locationId) || 'Unknown error'}</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => predictLocation(selectedLocation.lat, selectedLocation.lon, selectedLocation.locationId)}
                  disabled={loading || !isServiceHealthy || (selectedLocation.locationId ? hasPredictionToday(selectedLocation.locationId) || predictionStatuses.get(selectedLocation.locationId) === 'processing' : false)}
                  className={`px-4 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto ${
                    selectedLocation.locationId && (hasPredictionToday(selectedLocation.locationId) || predictionStatuses.get(selectedLocation.locationId) === 'processing')
                      ? 'bg-gray-500 text-white cursor-not-allowed'
                      : 'bg-accent-blue text-white hover:bg-secondary-blue'
                  }`}
                >
                  <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                  {selectedLocation.locationId && hasPredictionToday(selectedLocation.locationId)
                    ? 'Already Predicted Today'
                    : selectedLocation.locationId && predictionStatuses.get(selectedLocation.locationId) === 'processing'
                    ? 'Processing...'
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
        <div className="p-4 bg-light-bg border-b">
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
                        {(() => {
                          const d = new Date(prediction.createdAt);
                          const day = d.getDate().toString().padStart(2, '0');
                          const month = (d.getMonth() + 1).toString().padStart(2, '0');
                          const year = d.getFullYear();
                          return `${day}/${month}/${year}`;
                        })()}
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
