"use client"

import AdminSidebar from "@/components/AdminSidebar"
import AdminHeader from "@/components/AdminHeader"
import {
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiCamera,
  FiMapPin,
  FiCalendar,
  FiActivity,
  FiSettings,
  FiEye,
  FiChevronRight,
  FiPlus,
  FiFilter,
  FiDownload,
  FiMap,
  FiX,
  FiSave,
  FiUpload,
  FiVideo,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import type { JSX } from "react"
import { useAuth } from "@/context/AuthContext"
import MapPicker from "@/components/MapPicker"

const drones: any[] = []

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

const statusStyles: Record<string, string> = {
  Operational: "text-green-700 bg-green-100 border-green-200",
  Maintenance: "text-yellow-800 bg-yellow-100 border-yellow-200",
  Inactive: "text-red-700 bg-red-100 border-red-200",
}

const statusIcons: Record<string, JSX.Element> = {
  Operational: <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>,
  Maintenance: <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></span>,
  Inactive: <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2"></span>,
}

// Remove hardcoded empty array - will use state instead

// Helper: get token
const getToken = () => {
  const TOKEN = typeof window !== "undefined" ? localStorage.getItem("token") : null
  console.log("TOKEN: ", TOKEN)
  return TOKEN
}

const examplePhotos = [
  { src: "/images/drone1.jpg", title: "Clear aerial view", description: "High resolution overhead shot" },
  { src: "/images/drone2.jpg", title: "Detailed inspection", description: "Close-up monitoring" },
  { src: "/images/drone3.jpg", title: "Wide area coverage", description: "Comprehensive surveillance" },
]

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

const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 50,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 50,
    transition: {
      duration: 0.2,
    },
  },
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

export default function DroneManagementPage() {
  const { companyId } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [selectedDrone, setSelectedDrone] = useState("")
  const [showAddDroneModal, setShowAddDroneModal] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const [editingDrone, setEditingDrone] = useState<any>(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [droneList, setDroneList] = useState<any[]>([])
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [detailsDrone, setDetailsDrone] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDrones, setTotalDrones] = useState(0)
  const dronesPerPage = 10
  const [editArea, setEditArea] = useState("")
  const [editDroneForm, setEditDroneForm] = useState({
    name: '',
    model: '',
    serial: '',
    operationalArea: '',
    companyLocationId: '',
    status: 'Operational'
  })
  const [showAddImagesModal, setShowAddImagesModal] = useState(false)
  const [selectedDroneForImages, setSelectedDroneForImages] = useState<any>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [isProcessingVideo, setIsProcessingVideo] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [extractedFrames, setExtractedFrames] = useState<string[]>([])
  const [companyLocations, setCompanyLocations] = useState<any[]>([])
  const [showNewLocationModal, setShowNewLocationModal] = useState(false)
  const [newLocation, setNewLocation] = useState({ name: '', address: '', latitude: '', longitude: '' })
  const [droneFormData, setDroneFormData] = useState({
    name: '',
    model: '',
    serial: '',
    operationalArea: '',
    status: 'Operational',
    companyLocationId: ''
  })
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [isCreatingDrone, setIsCreatingDrone] = useState(false)
  const [droneImages, setDroneImages] = useState<any[]>([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [loadingDrones, setLoadingDrones] = useState(false)
  const [imagePage, setImagePage] = useState(1)
  const [imageTotalPages, setImageTotalPages] = useState(1)
  const [imageActionLoadingId, setImageActionLoadingId] = useState<string | null>(null)
  const [serialNumberError, setSerialNumberError] = useState<string | null>(null)

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    confirmText: string
    cancelText: string
    onConfirm: () => void
    type: "danger" | "warning" | "info"
  } | null>(null)

  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [successDialogMessage, setSuccessDialogMessage] = useState("")

  // Refresh drones helper
  const refreshDrones = async () => {
    try {
      const data = await fetchAllDrones(currentPage, searchTerm, statusFilter)
      const mappedDrones = data.drones.map((drone: any) => ({
        id: drone.id,
        droneId: drone.droneId,
        name: drone.name,
        model: drone.model,
        serial: drone.serial,
        area: drone.operationalArea,
        date: new Date(drone.createdAt).toLocaleDateString(),
        status: drone.status,
        companyLocation: drone.companyLocation
      }))
      setDroneList(mappedDrones)
      setTotalPages(data.pagination.pages)
      setTotalDrones(data.pagination.total)
    } catch (error) {
      console.error('Failed to refresh drones:', error)
    }
  }

  // Helper function to get image URL (handles both Firebase URLs and legacy local paths)
  const getImageUrl = (image: any): string => {
    if (image.url) {
      // If URL is already absolute (Firebase URL), use it directly
      if (image.url.startsWith('http://') || image.url.startsWith('https://')) {
        return image.url
      }
      // Legacy local path - construct absolute URL
      return `http://localhost:4000${image.url}`
    }
    // Fallback: construct from filename (legacy support)
    return `http://localhost:4000/uploads/drones/${image.filename}`
  }

  const filteredDrones = droneList

  // Fetch company locations and drones on component mount
  useEffect(() => {
    fetchCompanyLocations()
  }, [])

  // Fetch drones when pagination, search, or status filter changes
  useEffect(() => {
    const loadDrones = async () => {
      setLoadingDrones(true)
      try {
        const data = await fetchAllDrones(currentPage, searchTerm, statusFilter)
        const mappedDrones = data.drones.map((drone: any) => ({
          id: drone.id,
          droneId: drone.droneId,
          name: drone.name,
          model: drone.model,
          serial: drone.serial,
          area: drone.operationalArea,
          date: new Date(drone.createdAt).toLocaleDateString(),
          status: drone.status,
          companyLocation: drone.companyLocation
        }))
        setDroneList(mappedDrones)
        setTotalPages(data.pagination.pages)
        setTotalDrones(data.pagination.total)
        
        // Set the first drone as selected if none is selected
        if (mappedDrones.length > 0 && !selectedDrone) {
          setSelectedDrone(mappedDrones[0].id)
        }
      } catch (error) {
        console.error('Failed to load drones:', error)
      } finally {
        setLoadingDrones(false)
      }
    }
    loadDrones()
  }, [currentPage, searchTerm, statusFilter])

  // Reset to first page when search or status filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  // Fetch images when selected drone changes
  useEffect(() => {
    if (selectedDrone && droneList.length > 0) {
      const loadImages = async () => {
        const { images, pagination } = await fetchDroneImages(selectedDrone, 1)
        setDroneImages(images)
        setImagePage(pagination.page)
        setImageTotalPages(pagination.pages)
      }
      loadImages()
    } else {
      setDroneImages([])
      setImagePage(1)
      setImageTotalPages(1)
    }
  }, [selectedDrone, droneList])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }


  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type.startsWith('image/')) {
        setUploadedFile(file)
      } else if (file.type.startsWith('video/')) {
        setUploadedFile(file)
      } else {
        alert('Please upload an image or video file')
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setUploadedFile(file)
      } else {
        alert('Please upload an image or video file')
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Video processing utilities
  const extractFramesFromVideo = async (videoFile: File, fps: number = 1): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const frames: string[] = []
      
      if (!ctx) {
        reject(new Error('Canvas context not available'))
        return
      }

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        
        const duration = video.duration
        const frameInterval = 1 / fps // Extract 1 frame per second
        let currentTime = 0
        let frameCount = 0
        
        const extractFrame = () => {
          if (currentTime >= duration) {
            resolve(frames)
            return
          }
          
          video.currentTime = currentTime
          
          video.onseeked = () => {
            try {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
              const frameData = canvas.toDataURL('image/jpeg', 0.8)
              frames.push(frameData)
              frameCount++
              
              // Update progress
              const progress = Math.round((currentTime / duration) * 100)
              setProcessingProgress(progress)
              
              currentTime += frameInterval
              setTimeout(extractFrame, 100) // Small delay to prevent overwhelming
            } catch (error) {
              reject(error)
            }
          }
          
          video.onerror = () => {
            reject(new Error('Error seeking video'))
          }
        }
        
        extractFrame()
      }
      
      video.onerror = () => {
        reject(new Error('Error loading video'))
      }
      
      video.src = URL.createObjectURL(videoFile)
      video.load()
    })
  }

  const uploadVideoFrames = async (frames: string[], droneId: string) => {
    try {
      const response = await fetch(`${API_URL}/drones/${droneId}/upload-frames`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ frames })
      })

      if (!response.ok) {
        throw new Error('Failed to upload frames')
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }

  const uploadImages = async (files: File[], droneId: string) => {
    try {
      const formData = new FormData()
      files.forEach(file => {
        formData.append('images', file)
      })

      const response = await fetch(`${API_URL}/drones/${droneId}/upload-images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to upload images')
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }

  // Company location functions
  const fetchCompanyLocations = async () => {
    try {
      setLoadingLocations(true)
      console.log('Fetching company locations...')
      
      const response = await fetch(`${API_URL}/drones/locations`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const locations = await response.json()
      console.log('Fetched locations:', locations)
      setCompanyLocations(locations)
      return locations
    } catch (error) {
      console.error('Fetch locations error:', error)
      alert('Failed to fetch company locations. Please check your connection.')
      throw error
    } finally {
      setLoadingLocations(false)
    }
  }

  const createNewLocation = async (locationData: any) => {
    try {
      const response = await fetch(`${API_URL}/drones/locations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(locationData)
      })

      if (!response.ok) {
        throw new Error('Failed to create location')
      }

      const result = await response.json()
      setCompanyLocations(prev => [...prev, result.location])
      return result.location
    } catch (error) {
      console.error('Create location error:', error)
      throw error
    }
  }

  // Create new drone function
  const createNewDrone = async (droneData: any) => {
    try {
      const response = await fetch(`${API_URL}/drones/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(droneData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create drone')
      }

      const result = await response.json()
      return result.drone
    } catch (error) {
      console.error('Create drone error:', error)
      throw error
    }
  }

  // Update drone function
  const updateExistingDrone = async (id: string, droneData: any) => {
    try {
      const response = await fetch(`${API_URL}/drones/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(droneData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update drone')
      }

      const result = await response.json()
      return result.drone
    } catch (error) {
      console.error('Update drone error:', error)
      throw error
    }
  }

  // Delete drone function
  const deleteExistingDrone = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Drone",
      message: "Are you sure you want to delete this drone? This action cannot be undone.",
      confirmText: "Confirm",
      cancelText: "Cancel",
      type: "danger",
      onConfirm: async () => {
        setConfirmDialog(null)
        try {
          const response = await fetch(`${API_URL}/drones/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${getToken()}`
            }
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to delete drone')
          }

          await refreshDrones()
          setSuccessDialogMessage("Drone deleted successfully!")
          setShowSuccessDialog(true)
        } catch (error: any) {
          alert(`Failed to delete drone: ${error.message}`)
        }
      },
    })
  }

  // Fetch all drones function
  const fetchAllDrones = async (page = 1, search = "", status = "") => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: dronesPerPage.toString()
      })
      if (search) params.append("search", search)
      if (status && status !== "All") params.append("status", status)

      const response = await fetch(`${API_URL}/drones?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch drones')
      }

      const data = await response.json()
      return data // Return the whole response including pagination
    } catch (error) {
      console.error('Fetch drones error:', error)
      throw error
    }
  }

  // Fetch drone images function (supports pagination)
  const fetchDroneImages = async (droneId: string, page: number = 1) => {
    try {
      setLoadingImages(true)
      console.log('Fetching drone images for drone:', droneId, 'page:', page)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
      })

      const response = await fetch(`${API_URL}/drones/${droneId}/images?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      })

      if (!response.ok) {
        console.error('Response not ok:', response.status, response.statusText)
        throw new Error('Failed to fetch drone images')
      }

      const data = await response.json()

      return {
        images: data.images || [],
        pagination: data.pagination || {
          page,
          limit: 12,
          total: (data.images || []).length,
          pages: 1,
        },
      }
    } catch (error) {
      console.error('Fetch drone images error:', error)
      return {
        images: [],
        pagination: {
          page,
          limit: 12,
          total: 0,
          pages: 1,
        },
      }
    } finally {
      setLoadingImages(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF7E3] flex flex-row overflow-hidden">
      <AdminSidebar current="Drone Management" />
      <main className="flex-1 flex flex-col">
        <AdminHeader />
        {/* Content */}
        <motion.section className="px-10 py-8" variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-8">
            <h1 className="text-3xl font-bold text-primary-dark mb-1">Drone Management</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent-blue"></div>
              <div className="text-lg text-gray-600">Manage all aspects of the drones and images captured by drone within your company</div>
            </div>
          </motion.div>

          {/* Drone Stats */}
          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: "Total Drones", value: droneList.length, icon: <FiCamera />, color: "bg-blue-500" },
              {
                label: "Operational",
                value: droneList.filter((d) => d.status === "Operational").length,
                icon: <FiActivity />,
                color: "bg-green-500",
              },
              {
                label: "Maintenance",
                value: droneList.filter((d) => d.status === "Maintenance").length,
                icon: <FiSettings />,
                color: "bg-yellow-500",
              },
              { 
                label: "Inactive",
                value: droneList.filter((d) => d.status === "Inactive").length,
                icon: <FiAlertCircle />,
                color: "bg-red-500",
              },
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

          {/* Drone List Table */}
          <motion.div variants={item} className="mb-10">
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-accent-blue/30">
              <div className="bg-accent-blue px-6 py-4 flex items-center gap-4">
                <div className="font-bold text-lg text-white">Drone Fleet</div>
                <div className="flex-1" />
                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      setShowAddDroneModal(true)
                      try {
                        await fetchCompanyLocations()
                      } catch (error) {
                        console.error('Failed to fetch company locations:', error)
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
                  >
                    <FiPlus size={18} />
                    Add Drone
                  </button>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="flex items-center bg-white/10 rounded-lg">
                        <FiFilter className="ml-3 text-white" />
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="bg-transparent border-none text-white px-3 py-2 focus:outline-none appearance-none cursor-pointer"
                        >
                          <option value="All" className="text-primary-dark">All Status</option>
                          <option value="Operational" className="text-primary-dark">Operational</option>
                          <option value="Maintenance" className="text-primary-dark">Maintenance</option>
                          <option value="Inactive" className="text-primary-dark">Inactive</option>
                        </select>
                        <div className="pr-3 pointer-events-none text-white">
                          <FiChevronRight className="rotate-90" size={14} />
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="flex items-center bg-white/10 rounded-lg">
                        <FiSearch className="ml-3 text-white" />
                        <input
                          type="text"
                          placeholder="Search drones..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="bg-transparent border-none text-white placeholder-white/70 px-3 py-2 w-64 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="text-left text-primary-dark font-semibold text-base border-b border-gray-200 bg-light-bg">
                      <th className="py-4 px-6">Drone ID</th>
                      <th className="py-4 px-6">Drone Name</th>
                      <th className="py-4 px-6">Model</th>
                      <th className="py-4 px-6">Registration Date <br /> Operational Area</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6">Add Drone Images</th>
                      <th className="py-4 px-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingDrones ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-4 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin"></div>
                            <span className="text-gray-500 font-medium">Loading drones...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredDrones.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-gray-500 italic">
                          No drones found
                        </td>
                      </tr>
                    ) : (
                      filteredDrones.map((drone, idx) => (
                      <motion.tr
                        key={drone.id}
                        className={`border-b border-gray-100 last:border-0 hover:bg-light-bg/50 transition-colors cursor-pointer ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => setSelectedDrone(drone.id)}
                      >
                        <td className="py-4 px-6 font-medium text-gray-600">
                          {drone.droneId}
                        </td>
                        <td className="py-4 px-6 font-medium text-primary-dark">
                          {drone.name}
                        </td>
                        <td className="py-4 px-6 font-medium text-gray-700">
                          {drone.model}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2 mb-1">
                            <FiCalendar className="text-accent-blue" size={16} />
                            <span className="text-sm">{drone.date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FiMapPin className="text-accent-blue" size={16} />
                            <span className="text-sm text-gray-600">
                              {drone.companyLocation?.name || "No specific location"}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusStyles[drone.status] || "text-gray-600 bg-gray-100 border-gray-200"}`}>
                            {statusIcons[drone.status]}
                            {drone.status}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <button 
                            className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-secondary-blue transition-colors text-sm font-medium"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedDroneForImages(drone)
                              setShowAddImagesModal(true)
                            }}
                          >
                            <FiPlus size={16} />
                            Add Images
                          </button>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2">
                            <button 
                              className="p-2 rounded-lg hover:bg-light-bg/50 text-accent-blue transition-colors"
                              title="View Details"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDetailsDrone(drone)
                                setShowDetailsModal(true)
                              }}
                            >
                              <FiEye size={18} />
                            </button>
                            <button 
                              className="p-2 rounded-lg hover:bg-light-bg/50 text-accent-blue transition-colors"
                              title="Edit Drone"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingDrone(drone)
                                setEditDroneForm({
                                  name: drone.name || '',
                                  model: drone.model || '',
                                  serial: drone.serial || '',
                                  operationalArea: drone.area || '',
                                  companyLocationId: drone.companyLocation?.id || '',
                                  status: drone.status || 'Operational'
                                })
                              }}
                            >
                              <FiEdit2 size={18} />
                            </button>
                            {/* TODO: Implement assign zone functionality */}
                            {/* <button 
                              className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                              title="Assign Zone"
                              onClick={() => setShowMapModal(true)}
                            >
                              <FiMap size={18} />
                            </button> */}
                            <button 
                              className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                              title="Delete Drone"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteExistingDrone(drone.id)
                              }}
                            >
                              <FiTrash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    )))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {filteredDrones.length > 0 && (
                <div className="flex items-center justify-between mt-4 px-6 py-3 bg-gray-50 rounded-b-xl">
                  <div className="text-sm text-gray-600">
                    Showing {Math.min(totalDrones, (currentPage - 1) * dronesPerPage + 1)} to {Math.min(totalDrones, currentPage * dronesPerPage)} of {totalDrones} drones
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
            </div>
          </motion.div>

          {/* Drone Images */}
          <motion.div variants={item}>
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-accent-blue/30">
              <div className="px-6 py-4 bg-light-bg border-b border-accent-blue/30">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <FiCamera className="text-accent-blue" />
                    Drone Images
                  </h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedDrone}
                      onChange={(e) => setSelectedDrone(e.target.value)}
                      className="p-2 bg-accent-blue text-white rounded-lg font-medium text-sm"
                    >
                      {droneList.map((drone) => (
                        <option key={drone.id} value={drone.id}>
                          {drone.name} - {drone.companyLocation?.name || "No Location"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {loadingImages ? (
                    <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading images...</p>
                  </div>
                ) : droneImages.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {droneImages.map((image, idx) => (
                        <motion.div
                          key={image.id}
                          className="group relative rounded-xl overflow-hidden shadow-md bg-gray-100"
                          whileHover={{ y: -5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <div className="relative h-48">
                            <Image
                              src={getImageUrl(image) || "/placeholder.svg"}
                              alt={`Drone capture ${idx + 1}`}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium">
                              {new Date(image.createdAt).toLocaleDateString()}
                            </div>
                            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium">
                              {image.sourceType === 'video_frame' ? 'Video Frame' : 'Image'} #{idx + 1}
                              {image.companyLocation && (
                                <div className="text-xs text-gray-600 mt-1">
                                  📍 {image.companyLocation.name}
                                </div>
                              )}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                className="bg-white/90 backdrop-blur-sm p-3 rounded-full hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!!imageActionLoadingId}
                                onClick={() => {
                                  setSelectedImage(getImageUrl(image))
                                  setShowImageModal(true)
                                }}
                              >
                                <FiEye className="text-accent-blue" size={20} />
                              </button>
                              <button
                                className="bg-white/90 backdrop-blur-sm p-3 rounded-full hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={imageActionLoadingId === image.id}
                                onClick={async () => {
                                  try {
                                    setImageActionLoadingId(image.id)

                                    const imageUrl = getImageUrl(image)
                                    
                                    // If it's a Firebase URL, download directly
                                    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                                      // Check if it's Firebase URL
                                      if (imageUrl.includes('storage.googleapis.com') || imageUrl.includes('firebasestorage.googleapis.com')) {
                                        // Download directly from Firebase URL
                                        const response = await fetch(imageUrl)
                                        if (!response.ok) {
                                          throw new Error('Failed to download image from Firebase')
                                        }
                                        const blob = await response.blob()
                                        const url = window.URL.createObjectURL(blob)
                                        const link = document.createElement('a')
                                        link.href = url
                                        link.download = image.filename || 'drone-image.jpg'
                                        document.body.appendChild(link)
                                        link.click()
                                        link.remove()
                                        window.URL.revokeObjectURL(url)
                                      } else {
                                        // Other HTTP URLs - download directly
                                        const link = document.createElement('a')
                                        link.href = imageUrl
                                        link.download = image.filename || 'drone-image.jpg'
                                        link.target = '_blank'
                                        document.body.appendChild(link)
                                        link.click()
                                        link.remove()
                                      }
                                    } else {
                                      // Local file - use backend download endpoint
                                      const response = await fetch(`${API_URL}/drones/images/${image.id}/download`, {
                                        headers: {
                                          'Authorization': `Bearer ${getToken()}`,
                                        },
                                      })

                                      if (!response.ok) {
                                        const errorData = await response.json().catch(() => ({}))
                                        throw new Error(errorData.error || 'Failed to download image')
                                      }

                                      // Handle redirect or blob response
                                      if (response.redirected) {
                                        // If redirected, open the redirect URL
                                        window.open(response.url, '_blank')
                                      } else {
                                        const blob = await response.blob()
                                        const url = window.URL.createObjectURL(blob)
                                        const link = document.createElement('a')
                                        link.href = url
                                        link.download = image.filename || 'drone-image.jpg'
                                        document.body.appendChild(link)
                                        link.click()
                                        link.remove()
                                        window.URL.revokeObjectURL(url)
                                      }
                                    }
                                  } catch (error: any) {
                                    console.error('Download image error:', error)
                                    alert(`Failed to download image: ${error.message || 'Please try again.'}`)
                                  } finally {
                                    setImageActionLoadingId(null)
                                  }
                                }}
                              >
                                <FiDownload className="text-green-600" size={20} />
                              </button>
                              <button
                                className="bg-white/90 backdrop-blur-sm p-3 rounded-full hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={imageActionLoadingId === image.id}
                                onClick={() => {
                                  setConfirmDialog({
                                    isOpen: true,
                                    title: 'Delete Image',
                                    message: 'Are you sure you want to delete this drone image? This action cannot be undone.',
                                    confirmText: 'Delete',
                                    cancelText: 'Cancel',
                                    type: 'danger',
                                    onConfirm: async () => {
                                      try {
                                        setImageActionLoadingId(image.id)
                                        setConfirmDialog(null)

                                        const response = await fetch(`${API_URL}/drones/images/${image.id}`, {
                                          method: 'DELETE',
                                          headers: {
                                            'Authorization': `Bearer ${getToken()}`,
                                          },
                                        })

                                        if (!response.ok) {
                                          const errorData = await response.json().catch(() => ({}))
                                          throw new Error(errorData.error || 'Failed to delete image')
                                        }

                                        // Remove deleted image from local state immediately
                                        setDroneImages((prev) => prev.filter((img) => img.id !== image.id))

                                        // Refetch current page to ensure pagination is accurate
                                        if (selectedDrone) {
                                          try {
                                            const { images, pagination } = await fetchDroneImages(selectedDrone, imagePage)
                                            setDroneImages(images)
                                            setImagePage(pagination.page)
                                            setImageTotalPages(pagination.pages)
                                          } catch (refetchError) {
                                            console.error('Error refetching images after delete:', refetchError)
                                            // If refetch fails, at least the image is removed from UI
                                          }
                                        }

                                        setSuccessDialogMessage('Image deleted successfully.')
                                        setShowSuccessDialog(true)
                                      } catch (error: any) {
                                        console.error('Delete image error:', error)
                                        alert(`Failed to delete image: ${error.message || 'Please try again.'}`)
                                      } finally {
                                        setImageActionLoadingId(null)
                                      }
                                    },
                                  })
                                }}
                              >
                                <FiTrash2 className="text-red-600" size={20} />
                              </button>
                            </div>
                          </div>
                          <div className="p-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium text-sm">{image.filename}</div>
                                <div className="text-xs text-gray-500">
                                  {image.sourceType === 'video_frame' ? 'Extracted from video' : 'Direct upload'}
                                </div>
                                {image.companyLocation && (
                                  <div className="text-xs text-blue-600 mt-1">
                                    📍 {image.companyLocation.name}
                                    {image.companyLocation.address && ` - ${image.companyLocation.address}`}
                                  </div>
                                )}
                                {image.company && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    🏢 {image.company.name}
                                  </div>
                                )}
                              </div>
                              <button className="text-accent-blue hover:bg-light-bg/50 p-2 rounded-lg transition-colors">
                                <FiChevronRight size={16} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {imagePage < imageTotalPages && (
                      <div className="flex justify-center mt-6">
                        <button
                          className="flex items-center gap-2 px-6 py-3 bg-accent-blue text-white rounded-lg font-medium hover:bg-secondary-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={loadingImages}
                          onClick={async () => {
                            if (!selectedDrone) return
                            const nextPage = imagePage + 1
                            const { images: nextImages, pagination } = await fetchDroneImages(selectedDrone, nextPage)
                            setDroneImages((prev) => [...prev, ...nextImages])
                            setImagePage(pagination.page)
                            setImageTotalPages(pagination.pages)
                          }}
                        >
                          Load More Images
                          <FiChevronRight />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <FiCamera className="text-gray-400 mx-auto mb-4" size={48} />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Images Available</h3>
                    <p className="text-gray-500 mb-4">No drone images have been uploaded yet.</p>
                    <p className="text-sm text-gray-400">Use the "Add Images" button above to upload drone footage or images.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.section>
      </main>

      {/* Drone Details Modal */}
      {showDetailsModal && detailsDrone && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-accent-blue px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Drone Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">Drone Name</div>
                  <div className="font-semibold">{detailsDrone.name || "N/A"}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">Serial Number</div>
                  <div className="font-semibold">{detailsDrone.serial || "N/A"}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">Drone ID</div>
                  <div className="font-semibold">{detailsDrone.droneId}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">Model</div>
                  <div className="font-semibold">{detailsDrone.model}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">Operational Area</div>
                  <div className="font-semibold">{detailsDrone.companyLocation?.name || "No specific location"}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">Registration Date</div>
                  <div className="font-semibold">{detailsDrone.date}</div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <FiCamera className="text-accent-blue" /> Images for {detailsDrone.name || detailsDrone.id}
                </h3>
                {droneImages.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {droneImages.map((image, idx) => (
                      <div key={image.id} className="relative h-36 rounded-lg overflow-hidden bg-gray-100 group">
                        <Image 
                          src={getImageUrl(image)} 
                          alt={`Image ${idx + 1}`} 
                          fill 
                          className="object-cover" 
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="font-medium">{image.filename}</div>
                          {image.companyLocation && (
                            <div className="text-blue-300">📍 {image.companyLocation.name}</div>
                          )}
                          <div className="text-gray-300">
                            {image.sourceType === 'video_frame' ? 'Video Frame' : 'Direct Upload'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <FiCamera className="text-gray-400 mx-auto mb-2" size={32} />
                    <p className="text-gray-500">No images available for this drone</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Drone Modal */}
      {editingDrone && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4"
          >
            <div className="bg-accent-blue px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Edit Drone</h2>
              <button
                onClick={() => setEditingDrone(null)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select 
                  value={editDroneForm.status}
                  onChange={(e) => setEditDroneForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
                >
                  <option value="Operational">Operational</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Operational Area</label>
                <input
                  value={editDroneForm.operationalArea}
                  onChange={(e) => setEditDroneForm(prev => ({ ...prev, operationalArea: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  placeholder="Enter operational area"
                />
              </div> */}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Operational Area</label>
                <div className="flex gap-2">
                  <select 
                    value={editDroneForm.companyLocationId}
                    onChange={(e) => setEditDroneForm(prev => ({ ...prev, companyLocationId: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue max-w-full text-ellipsis"
                    disabled={loadingLocations}
                  >
                    <option value="">No specific location</option>
                    {loadingLocations ? (
                      <option value="" disabled>Loading locations...</option>
                    ) : companyLocations.length === 0 ? (
                      <option value="" disabled>No locations available</option>
                    ) : (
                      companyLocations.map((location) => (
                        <option
                          key={location.id}
                          value={location.id}
                          title={location.address || location.name}
                        >
                          {location.name}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewLocationModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    disabled={loadingLocations}
                  >
                    <FiPlus size={16} />
                  </button>
                </div>
                {companyLocations.length === 0 && !loadingLocations && (
                  <p className="text-sm text-gray-500 mt-1">
                    No company locations found. Click the + button to create one.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setEditingDrone(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await updateExistingDrone(editingDrone.id, editDroneForm)
                      
                      // Refresh the list to keep everything in sync with server-side pagination
                      await refreshDrones()
                      
                      setEditingDrone(null)
                      alert('Drone updated successfully!')
                    } catch (error: any) {
                      alert(`Failed to update drone: ${error.message}`)
                    }
                  }}
                  className="flex items-center gap-2 px-6 py-2 bg-accent-blue text-white rounded-lg hover:bg-secondary-blue transition-colors"
                >
                  <FiSave size={18} />
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {/* Add Drone Modal */}
      {showAddDroneModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-accent-blue px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Add New Drone</h2>
              <button
                onClick={() => {
                  setShowAddDroneModal(false)
                  setSerialNumberError(null)
                }}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="p-6">
              <form 
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault()
                  
                  // Validate required fields
                  if (!droneFormData.name || !droneFormData.model || !droneFormData.serial) {
                    alert('Please fill in all required fields')
                    return
                  }

                  // Check for existing serial number (serial must be unique)
                  const serialExists = droneList.some(d => 
                    d.serial.toLowerCase() === droneFormData.serial.toLowerCase()
                  )

                  if (serialExists) {
                    setSerialNumberError('This serial number is already in use. Please enter a unique serial number.')
                    return
                  }
                  
                  setIsCreatingDrone(true)
                  
                  try {
                    const newDrone = await createNewDrone(droneFormData)
                    
                    // Refresh the list to keep everything in sync with server-side pagination
                    await refreshDrones()
                    
                    // Reset form and close modal
                    setDroneFormData({
                      name: '',
                      model: '',
                      serial: '',
                      operationalArea: '',
                      status: 'Operational',
                      companyLocationId: ''
                    })
                    setSerialNumberError(null)
                    setShowAddDroneModal(false)
                    
                    alert('Drone created successfully!')
                  } catch (error: any) {
                    if (error.message.includes('already exists') || error.message.includes('unique constraint')) {
                      alert('Drone with this serial/name already exists')
                    } else {
                      alert(`Failed to create drone: ${error.message}`)
                    }
                  } finally {
                    setIsCreatingDrone(false)
                  }
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Drone Name</label>
                    <input
                      type="text"
                      value={droneFormData.name}
                      onChange={(e) => setDroneFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
                      placeholder="e.g., Drone Alpha"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                    <input
                      type="text"
                      value={droneFormData.model}
                      onChange={(e) => setDroneFormData(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
                      placeholder="e.g., DJI Phantom 4 Pro"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Serial Number</label>
                    <input
                      type="text"
                      value={droneFormData.serial}
                      onChange={(e) => {
                        const serialValue = e.target.value
                        setDroneFormData(prev => ({ ...prev, serial: serialValue }))
                        
                        // Check if serial number already exists
                        if (serialValue.trim()) {
                          const exists = droneList.some(d => 
                            d.serial.toLowerCase() === serialValue.toLowerCase()
                          )
                          if (exists) {
                            setSerialNumberError('This serial number is already in use. Please enter a unique serial number.')
                          } else {
                            setSerialNumberError(null)
                          }
                        } else {
                          setSerialNumberError(null)
                        }
                      }}
                      onBlur={(e) => {
                        // Re-check on blur to ensure validation
                        const serialValue = e.target.value
                        if (serialValue.trim()) {
                          const exists = droneList.some(d => 
                            d.serial.toLowerCase() === serialValue.toLowerCase()
                          )
                          if (exists) {
                            setSerialNumberError('This serial number is already in use. Please enter a unique serial number.')
                          } else {
                            setSerialNumberError(null)
                          }
                        } else {
                          setSerialNumberError(null)
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        serialNumberError 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-accent-blue'
                      }`}
                      placeholder="e.g., SN123456789"
                    />
                    {serialNumberError && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <FiAlertCircle size={14} />
                        {serialNumberError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select 
                      value={droneFormData.status}
                      onChange={(e) => setDroneFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
                    >
                      <option value="Operational">Operational</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Operational Area</label>
                  <div className="flex gap-2">
                    <select 
                      value={droneFormData.companyLocationId}
                      onChange={(e) => setDroneFormData(prev => ({ ...prev, companyLocationId: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue max-w-full text-ellipsis"
                      disabled={loadingLocations}
                    >
                      <option value="">No specific location</option>
                      {loadingLocations ? (
                        <option value="" disabled>Loading locations...</option>
                      ) : companyLocations.length === 0 ? (
                        <option value="" disabled>No locations available</option>
                      ) : (
                        companyLocations.map((location) => (
                          <option
                            key={location.id}
                            value={location.id}
                            title={location.address || location.name}
                          >
                            {location.name}
                          </option>
                        ))
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewLocationModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      disabled={loadingLocations}
                    >
                      <FiPlus size={16} />
                    </button>
                  </div>
                  {companyLocations.length === 0 && !loadingLocations && (
                    <p className="text-sm text-gray-500 mt-1">
                      No company locations found. Click the + button to create one.
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddDroneModal(false)
                      setSerialNumberError(null)
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingDrone || !!serialNumberError}
                    className={`flex items-center gap-2 px-6 py-2 bg-accent-blue text-white rounded-lg hover:bg-secondary-blue transition-colors ${(isCreatingDrone || serialNumberError) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <FiSave size={18} />
                    {isCreatingDrone ? 'Creating...' : 'Add Drone'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Map Assignment Modal */}
      {showMapModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-accent-blue px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Assign Drone to Monitoring Zone</h2>
              <button
                onClick={() => setShowMapModal(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-600 mb-4">Select a monitoring zone on the map to assign the drone:</p>
                <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
                  <div className="text-center">
                    <FiMap className="text-gray-400 mx-auto mb-2" size={48} />
                    <p className="text-gray-500">Interactive Map Component</p>
                    <p className="text-sm text-gray-400">Map integration will be implemented here</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowMapModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button className="flex items-center gap-2 px-6 py-2 bg-accent-blue text-white rounded-lg hover:bg-secondary-blue transition-colors">
                  <FiSave size={18} />
                  Assign Zone
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Image View Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative max-w-4xl max-h-[90vh] mx-4"
          >
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/30 transition-colors z-10"
            >
              <FiX size={24} />
            </button>
            <div className="flex gap-2 absolute top-4 left-4 z-10">
              <button className="bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/30 transition-colors">
                <FiDownload size={20} />
              </button>
              <button className="bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/30 transition-colors">
                <FiTrash2 size={20} />
              </button>
            </div>
            <Image
              src={selectedImage}
              alt="Drone capture"
              width={800}
              height={600}
              className="rounded-lg object-contain max-h-[80vh]"
            />
          </motion.div>
        </div>
      )}

      {/* Add Images Modal */}
      {showAddImagesModal && selectedDroneForImages && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-accent-blue px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Add Drone Images - {selectedDroneForImages.name}</h2>
              <button
                onClick={() => {
                  setShowAddImagesModal(false)
                  setSelectedDroneForImages(null)
                  setUploadedFile(null)
                }}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Media Requirements */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <FiAlertCircle className="text-blue-600" />
                  Media Requirements
                </h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <div className="flex items-center gap-2">
                    <FiVideo className="text-blue-600" />
                    <span>Videos: Must not be longer than 5 minutes (50MB max)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiCamera className="text-blue-600" />
                    <span>Images: Direct upload (JPEG, PNG, GIF supported)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiClock className="text-blue-600" />
                    <span>Video processing: Extracts 1 frame per second automatically</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiCheckCircle className="text-blue-600" />
                    <span>Supported formats: MP4, MOV, AVI, MKV, JPEG, PNG, GIF</span>
                  </div>
                </div>
              </div>

              {/* Upload Area */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Upload Drone Media</h3>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive 
                      ? 'border-accent-blue bg-accent-blue/5' 
                      : 'border-gray-300 hover:border-accent-blue/50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {uploadedFile ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center">
                        {uploadedFile.type.startsWith('video/') ? (
                          <FiVideo className="text-accent-blue" size={48} />
                        ) : (
                          <FiCamera className="text-accent-blue" size={48} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(uploadedFile.size)} • {uploadedFile.type.startsWith('video/') ? 'Video file' : 'Image file'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setUploadedFile(null)
                          setExtractedFrames([])
                          setProcessingProgress(0)
                        }}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center">
                        <FiUpload className="text-gray-400" size={48} />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-900">Drop your drone media here</p>
                        <p className="text-sm text-gray-500">Images or videos • Click to browse files</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileInput}
                        className="hidden"
                        id="media-upload"
                      />
                      <label
                        htmlFor="media-upload"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-secondary-blue transition-colors cursor-pointer"
                      >
                        <FiUpload size={16} />
                        Choose Media File
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Video Processing Section */}
              {uploadedFile && uploadedFile.type.startsWith('video/') && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-3">Video Processing</h4>
                  {isProcessingVideo ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-blue-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${processingProgress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-blue-700 font-medium">{processingProgress}%</span>
                      </div>
                      <p className="text-sm text-blue-700">Extracting frames from video...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-blue-700">
                        Click "Process Video" to extract frames at 1 frame per second
                      </p>
                      <button
                        onClick={async () => {
                          if (!uploadedFile || !selectedDroneForImages) return
                          
                          setIsProcessingVideo(true)
                          setProcessingProgress(0)
                          
                          try {
                            const frames = await extractFramesFromVideo(uploadedFile, 1)
                            setExtractedFrames(frames)
                            
                            // Upload frames to backend
                            await uploadVideoFrames(frames, selectedDroneForImages.id)
                            
                            // Refresh images for the selected drone
                            const { images, pagination } = await fetchDroneImages(selectedDroneForImages.id, 1)
                            setDroneImages(images)
                            setImagePage(pagination.page)
                            setImageTotalPages(pagination.pages)
                            
                            alert(`Successfully processed ${frames.length} frames from video!`)
                            setUploadedFile(null)
                            setExtractedFrames([])
                          } catch (error) {
                            console.error('Video processing error:', error)
                            alert('Failed to process video. Please try again.')
                          } finally {
                            setIsProcessingVideo(false)
                            setProcessingProgress(0)
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <FiVideo size={16} />
                        Process Video
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Image Upload Section */}
              {uploadedFile && uploadedFile.type.startsWith('image/') && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-3">Image Upload</h4>
                  <p className="text-sm text-green-700 mb-3">
                    Ready to upload this image directly to the drone
                  </p>
                  <button
                    onClick={async () => {
                      if (!uploadedFile || !selectedDroneForImages) return
                      
                      try {
                        await uploadImages([uploadedFile], selectedDroneForImages.id)
                        
                        // Refresh images for the selected drone
                            const { images, pagination } = await fetchDroneImages(selectedDroneForImages.id, 1)
                            setDroneImages(images)
                            setImagePage(pagination.page)
                            setImageTotalPages(pagination.pages)
                        
                        alert('Image uploaded successfully!')
                        setUploadedFile(null)
                      } catch (error) {
                        console.error('Image upload error:', error)
                        alert('Failed to upload image. Please try again.')
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <FiCamera size={16} />
                    Upload Image
                  </button>
                </div>
              )}

              {/* Example Photos */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Example Photos (What to expect)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {examplePhotos.map((photo, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg overflow-hidden">
                      <div className="relative h-32">
                        <Image
                          src={photo.src}
                          alt={photo.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="p-3">
                        <h4 className="font-medium text-sm text-gray-900">{photo.title}</h4>
                        <p className="text-xs text-gray-500">{photo.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Processing Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Processing Information</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>• Videos are processed client-side using HTML5 Canvas</p>
                  <p>• Frames are extracted at 1 frame per second for optimal analysis</p>
                  <p>• Only extracted frames are uploaded to the server (lightweight)</p>
                  <p>• Processing happens instantly in your browser</p>
                  <p>• Images will be analyzed for dengue surveillance patterns</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowAddImagesModal(false)
                    setSelectedDroneForImages(null)
                    setUploadedFile(null)
                    setExtractedFrames([])
                    setProcessingProgress(0)
                    setIsProcessingVideo(false)
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* New Location Modal */}
      {showNewLocationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4"
          >
            <div className="bg-accent-blue px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Add New Operational Area</h2>
              <button
                onClick={() => {
                  setShowNewLocationModal(false)
                  setNewLocation({ name: '', address: '', latitude: '', longitude: '' })
                }}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="p-6">
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Operational Area Name</label>
                  <input
                    type="text"
                    value={newLocation.name}
                    onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
                    placeholder="e.g., KLCC Office"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Operational Area Address</label>
                  <input
                    type="text"
                    value={newLocation.address}
                    onChange={(e) => setNewLocation(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
                    placeholder="e.g., Jalan Ampang, Kuala Lumpur"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pin Exact Location on Map
                  </label>
                  <MapPicker
                    value={(() => {
                      const lat = parseFloat(newLocation.latitude as unknown as string)
                      const lng = parseFloat(newLocation.longitude as unknown as string)
                      return isNaN(lat) || isNaN(lng) ? null : { lat, lng }
                    })()}
                    onChange={async (coords) => {
                      setNewLocation(prev => ({
                        ...prev,
                        latitude: coords.lat.toString(),
                        longitude: coords.lng.toString(),
                      }))

                      try {
                        const res = await fetch(`${API_URL}/geocode/reverse?lat=${coords.lat}&lon=${coords.lng}`, {
                          headers: { Accept: "application/json" },
                        })
                        if (res.ok) {
                          const data = await res.json()
                          const display = data?.display_name || ""
                          if (display) {
                            setNewLocation(prev => ({ ...prev, address: display }))
                          }
                        }
                      } catch {
                        // ignore reverse geocode errors silently
                      }
                    }}
                    height={360}
                  />
                  <p className="text-xs text-gray-500">
                    Selected: {newLocation.latitude || "-"}, {newLocation.longitude || "-"}
                  </p>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewLocationModal(false)
                      setNewLocation({ name: '', address: '', latitude: '', longitude: '' })
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newLocation.name || !newLocation.latitude || !newLocation.longitude) {
                        alert('Please fill in all required fields')
                        return
                      }
                      
                      try {
                        const location = await createNewLocation(newLocation)
                        setDroneFormData(prev => ({ ...prev, companyLocationId: location.id }))
                        setShowNewLocationModal(false)
                        setNewLocation({ name: '', address: '', latitude: '', longitude: '' })
                        alert('Location created successfully!')
                      } catch (error) {
                        alert('Failed to create location. Please try again.')
                      }
                    }}
                  className="flex items-center gap-2 px-6 py-2 bg-accent-blue text-white rounded-lg hover:bg-secondary-blue transition-colors"
                  >
                    <FiSave size={18} />
                    Create Operational Area
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Beautiful Confirmation Modal */}
      <AnimatePresence>
        {confirmDialog && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setConfirmDialog(null)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[80vh] flex flex-col"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                className={`px-6 py-4 ${
                  confirmDialog.type === "danger"
                    ? "bg-gradient-to-r from-red-500 to-red-600"
                    : confirmDialog.type === "warning"
                      ? "bg-gradient-to-r from-yellow-500 to-yellow-600"
                      : "bg-gradient-to-r from-blue-500 to-blue-600"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    {confirmDialog.type === "danger" && <FiTrash2 className="text-white text-lg" />}
                    {confirmDialog.type === "warning" && <FiActivity className="text-white text-lg" />}
                    {confirmDialog.type === "info" && <FiCheckCircle className="text-white text-lg" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{confirmDialog.title}</h2>
                    <p className="text-white/80 text-sm">Please confirm your action</p>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      confirmDialog.type === "danger"
                        ? "bg-red-100"
                        : confirmDialog.type === "warning"
                          ? "bg-yellow-100"
                          : "bg-blue-100"
                    }`}
                  >
                    {confirmDialog.type === "danger" && <FiTrash2 className="text-red-600 text-xl" />}
                    {confirmDialog.type === "warning" && <FiActivity className="text-yellow-600 text-xl" />}
                    {confirmDialog.type === "info" && <FiCheckCircle className="text-blue-600 text-xl" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700 leading-relaxed">{confirmDialog.message}</p>
                    {confirmDialog.type === "danger" && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700 text-sm font-medium">⚠️ This action is irreversible</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 flex gap-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                >
                  {confirmDialog.cancelText}
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className={`flex-1 px-4 py-3 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${
                    confirmDialog.type === "danger"
                      ? "bg-red-600 hover:bg-red-700"
                      : confirmDialog.type === "warning"
                        ? "bg-yellow-600 hover:bg-yellow-700"
                        : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {confirmDialog.type === "danger" && <FiTrash2 size={16} />}
                  {confirmDialog.type === "warning" && <FiActivity size={16} />}
                  {confirmDialog.type === "info" && <FiCheckCircle size={16} />}
                  {confirmDialog.confirmText}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Dialog */}
      <AnimatePresence>
        {showSuccessDialog && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setShowSuccessDialog(false)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FiCheckCircle className="text-green-600 text-4xl" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Success!</h3>
                <p className="text-gray-600 mb-8">{successDialogMessage}</p>
                <button
                  onClick={() => setShowSuccessDialog(false)}
                  className="w-full bg-accent-blue text-white py-3 rounded-xl font-bold hover:bg-secondary-blue transition-colors"
                >
                  Great!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
