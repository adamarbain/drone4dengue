"use client"

import { motion } from "framer-motion"
import { FiRefreshCw, FiImage, FiTarget } from "react-icons/fi"

interface LazyLoaderModalProps {
  isOpen: boolean
  title: string
  subtitle?: string
  progress?: number
  showImageProcessing?: boolean
  showModelProcessing?: boolean
}

export function LazyLoaderModal({ 
  isOpen, 
  title, 
  subtitle, 
  progress = 0,
  showImageProcessing = false,
  showModelProcessing = false 
}: LazyLoaderModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-8 shadow-lg w-full max-w-md mx-4"
      >
        <div className="text-center">
          {/* Main Icon */}
          <div className="mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 bg-gradient-to-r from-[#4F46E5] to-[#A21C1C] rounded-full flex items-center justify-center mx-auto"
            >
              <FiRefreshCw className="w-8 h-8 text-white" />
            </motion.div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
          
          {/* Subtitle */}
          {subtitle && (
            <p className="text-gray-600 mb-6">{subtitle}</p>
          )}

          {/* Processing Steps */}
          <div className="space-y-4 mb-6">
            {/* Image Processing Step */}
            {showImageProcessing && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                >
                  <FiImage className="w-5 h-5 text-blue-600" />
                </motion.div>
                <div className="text-left">
                  <div className="text-sm font-medium text-blue-900">Processing Images</div>
                  <div className="text-xs text-blue-700">Analyzing drone images for breeding areas...</div>
                </div>
              </motion.div>
            )}

            {/* Model Processing Step */}
            {showModelProcessing && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                >
                  <FiTarget className="w-5 h-5 text-purple-600" />
                </motion.div>
                <div className="text-left">
                  <div className="text-sm font-medium text-purple-900">Running AI Models</div>
                  <div className="text-xs text-purple-700">Historical, Weather & Breeding Area Analysis...</div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Progress Bar */}
          {progress > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div 
                  className="bg-gradient-to-r from-[#4F46E5] to-[#A21C1C] h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}

          {/* Loading Dots */}
          <div className="flex justify-center space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-gray-400 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>

          {/* Status Text */}
          <p className="text-sm text-gray-500 mt-4">
            Please wait while we process your request...
          </p>
        </div>
      </motion.div>
    </div>
  )
}
