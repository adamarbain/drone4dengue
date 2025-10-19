"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FiX, FiCheckCircle, FiAlertCircle, FiRefreshCw } from "react-icons/fi"

interface ProgressItem {
  id: string
  name: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  error?: string
}

interface ProgressModalProps {
  isOpen: boolean
  onClose: () => void
  onCancel?: () => void
  title: string
  items: ProgressItem[]
  currentIndex: number
  totalItems: number
  isProcessing: boolean
  completedCount: number
  errorCount: number
}

export function ProgressModal({
  isOpen,
  onClose,
  onCancel,
  title,
  items,
  currentIndex,
  totalItems,
  isProcessing,
  completedCount,
  errorCount
}: ProgressModalProps) {
  const [showDetails, setShowDetails] = useState(false)

  const progressPercentage = totalItems > 0 ? (completedCount / totalItems) * 100 : 0
  const isCompleted = completedCount === totalItems && !isProcessing
  const hasErrors = errorCount > 0

  const getStatusIcon = (status: ProgressItem['status']) => {
    switch (status) {
      case 'completed':
        return <FiCheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <FiAlertCircle className="w-4 h-4 text-red-500" />
      case 'processing':
        return <FiRefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
      default:
        return <div className="w-4 h-4 rounded-full bg-gray-300" />
    }
  }

  const getStatusText = (status: ProgressItem['status']) => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'error':
        return 'Failed'
      case 'processing':
        return 'Processing...'
      default:
        return 'Pending'
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isProcessing}
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {/* Progress Overview */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {completedCount}/{totalItems}
                  </div>
                  <div className="text-sm text-gray-600">
                    {isCompleted ? 'All completed!' : isProcessing ? 'Processing...' : 'Ready to start'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Progress</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {progressPercentage.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Status Summary */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-gray-600">Completed: {completedCount}</span>
                </div>
                {errorCount > 0 && (
                  <div className="flex items-center gap-2">
                    <FiAlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-gray-600">Errors: {errorCount}</span>
                  </div>
                )}
                {isProcessing && (
                  <div className="flex items-center gap-2">
                    <FiRefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                    <span className="text-gray-600">Processing...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Details Toggle */}
            <div className="px-6 py-3 border-b">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
            </div>

            {/* Detailed List */}
            {showDetails && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        item.status === 'error' 
                          ? 'bg-red-50 border-red-200' 
                          : item.status === 'completed'
                          ? 'bg-green-50 border-green-200'
                          : item.status === 'processing'
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(item.status)}
                        <div>
                          <div className="font-medium text-sm">{item.name}</div>
                          {item.error && (
                            <div className="text-xs text-red-600 mt-1">{item.error}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {getStatusText(item.status)}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                {isCompleted && !hasErrors && 'All predictions created successfully!'}
                {isCompleted && hasErrors && `${completedCount} predictions created, ${errorCount} failed.`}
                {!isCompleted && isProcessing && 'Creating predictions...'}
                {!isCompleted && !isProcessing && 'Ready to start creating predictions.'}
              </div>
              <div className="flex gap-3">
                {isProcessing && onCancel && (
                  <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={onClose}
                  disabled={isProcessing}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#A21C1C] rounded-lg hover:bg-[#7C1D1D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCompleted ? 'Close' : 'Close'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
