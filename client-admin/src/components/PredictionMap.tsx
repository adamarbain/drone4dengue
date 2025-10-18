"use client"

import { useState, useEffect } from 'react'
import { predictCompany, getCompanyPredictions, checkPredictionHealth, PredictionResponse } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { FiRefreshCw, FiAlertTriangle, FiCheckCircle, FiClock, FiMapPin } from 'react-icons/fi'

interface PredictionData {
  id: string
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
  const [healthStatus, setHealthStatus] = useState<{
    ml_service: string
    redis: string
    database: string
  } | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lon: number} | null>(null)

  // Check service health on component mount
  useEffect(() => {
    checkHealth()
    loadCompanyPredictions()
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
        setPredictions(response.predictions)
        onPredictionUpdate(response.predictions)
      }
    } catch (err) {
      console.error('Failed to load predictions:', err)
    }
  }

  const handleLocationClick = (lat: number, lon: number) => {
    setSelectedLocation({ lat, lon })
  }

  const predictLocation = async (lat: number, lon: number) => {
    if (!companyId) {
      setError('Company ID not available')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await predictCompany({
        companyId,
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
          <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
            <div className="text-center">
              <FiMapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 mb-4">Click on the map to predict dengue risk for a location</p>
              {selectedLocation && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Selected: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lon.toFixed(4)}
                  </p>
                  <button
                    onClick={() => predictLocation(selectedLocation.lat, selectedLocation.lon)}
                    disabled={loading || !isServiceHealthy}
                    className="bg-[#A21C1C] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#7C1D1D] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                  >
                    <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Predicting...' : 'Predict Risk'}
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
                        {prediction.latitude.toFixed(4)}, {prediction.longitude.toFixed(4)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(prediction.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRiskTextColor(prediction.riskLevel)}`}>
                      {prediction.riskLevel.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium">
                      {(prediction.riskScore * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
