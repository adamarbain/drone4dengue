"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FiX, FiMapPin, FiActivity, FiCalendar } from "react-icons/fi"

interface PredictionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: PredictionFormData) => Promise<void>
  isLoading: boolean
}

export interface PredictionFormData {
  latitude: number
  longitude: number
  useModel1Only: boolean
  targetDate?: string
}

export default function PredictionModal({ isOpen, onClose, onSubmit, isLoading }: PredictionModalProps) {
  const [formData, setFormData] = useState<PredictionFormData>({
    latitude: 0,
    longitude: 0,
    useModel1Only: false,
    targetDate: ""
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.latitude || formData.latitude < -90 || formData.latitude > 90) {
      newErrors.latitude = "Latitude must be between -90 and 90"
    }

    if (!formData.longitude || formData.longitude < -180 || formData.longitude > 180) {
      newErrors.longitude = "Longitude must be between -180 and 180"
    }

    if (formData.targetDate && new Date(formData.targetDate) < new Date()) {
      newErrors.targetDate = "Target date cannot be in the past"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      await onSubmit(formData)
      setFormData({
        latitude: 0,
        longitude: 0,
        useModel1Only: false,
        targetDate: ""
      })
      setErrors({})
    } catch (error) {
      console.error("Error submitting prediction:", error)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        latitude: 0,
        longitude: 0,
        useModel1Only: false,
        targetDate: ""
      })
      setErrors({})
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">New Risk Prediction</h2>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiMapPin className="inline mr-2" />
                  Coordinates
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      step="any"
                      placeholder="Latitude"
                      value={formData.latitude || ""}
                      onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#A21C1C] focus:border-transparent ${
                        errors.latitude ? "border-red-500" : "border-gray-300"
                      }`}
                      disabled={isLoading}
                    />
                    {errors.latitude && (
                      <p className="text-red-500 text-xs mt-1">{errors.latitude}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="number"
                      step="any"
                      placeholder="Longitude"
                      value={formData.longitude || ""}
                      onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#A21C1C] focus:border-transparent ${
                        errors.longitude ? "border-red-500" : "border-gray-300"
                      }`}
                      disabled={isLoading}
                    />
                    {errors.longitude && (
                      <p className="text-red-500 text-xs mt-1">{errors.longitude}</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiCalendar className="inline mr-2" />
                  Target Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#A21C1C] focus:border-transparent ${
                    errors.targetDate ? "border-red-500" : "border-gray-300"
                  }`}
                  disabled={isLoading}
                />
                {errors.targetDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.targetDate}</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="useModel1Only"
                  checked={formData.useModel1Only}
                  onChange={(e) => setFormData({ ...formData, useModel1Only: e.target.checked })}
                  className="h-4 w-4 text-[#A21C1C] focus:ring-[#A21C1C] border-gray-300 rounded"
                  disabled={isLoading}
                />
                <label htmlFor="useModel1Only" className="ml-2 block text-sm text-gray-700">
                  Use Model 1 only (Historical Cases)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-[#A21C1C] text-white rounded-lg hover:bg-[#7C1D1D] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Predicting...
                    </>
                  ) : (
                    <>
                      <FiActivity />
                      Create Prediction
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
