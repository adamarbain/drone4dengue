"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import AdminSidebar from "@/components/AdminSidebar"
import AdminHeader from "@/components/AdminHeader"
import { motion, AnimatePresence } from "framer-motion"
import {
  Cloud,
  CloudRain,
  Thermometer,
  Droplets,
  Upload,
  Plus,
  Edit3,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle,
  Calendar,
  TrendingUp,
  Database,
  RefreshCw,
  X,
} from "lucide-react"
import axios from "axios"
import { useAuth } from "@/context/AuthContext"

interface WeatherRecord {
  id: string
  date: string
  temperature: number
  humidity: number
  rainfall: number
  location: string
  createdAt: string
  updatedAt: string
  createdBy: string
  companyLocationId: string
  companyLocation?: {
    name: string
    address: string
  }
}

interface CompanyLocation {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  isActive: boolean
  companyId: string
}

interface WeatherStats {
  totalRecords: number
  avgTemperature: number
  avgHumidity: number
  totalRainfall: number
  lastUpdated: string
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
  hover: {
    scale: 1.02,
    y: -5,
    transition: {
      duration: 0.2,
      ease: "easeInOut",
    },
  },
}

const statsCardVariants = {
  hidden: { opacity: 0, scale: 0.8, rotateY: -15 },
  visible: {
    opacity: 1,
    scale: 1,
    rotateY: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
  hover: {
    scale: 1.05,
    rotateY: 5,
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
}

const formVariants = {
  hidden: { opacity: 0, height: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    height: "auto",
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    scale: 0.95,
    transition: {
      duration: 0.3,
      ease: "easeIn",
    },
  },
}

const tableRowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (index: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: index * 0.05,
      duration: 0.4,
      ease: "easeOut",
    },
  }),
  hover: {
    backgroundColor: "rgba(59, 130, 246, 0.05)",
    scale: 1.01,
    transition: {
      duration: 0.2,
    },
  },
}

const alertVariants = {
  hidden: { opacity: 0, y: -20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: {
      duration: 0.3,
      ease: "easeIn",
    },
  },
}

const loadingVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
    },
  },
}

const emptyStateVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

export default function WeatherDataPage() {
  const { companyId } = useAuth()
  const [weatherData, setWeatherData] = useState<WeatherRecord[]>([])
  const [companyLocations, setCompanyLocations] = useState<CompanyLocation[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string>("")
  const [stats, setStats] = useState<WeatherStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<WeatherRecord | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [filterDate, setFilterDate] = useState<string>("")
  const [filteredWeatherData, setFilteredWeatherData] = useState<WeatherRecord[]>([])

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Form state for adding/editing records
  const [formData, setFormData] = useState({
    date: "",
    temperature: "",
    humidity: "",
    rainfall: "",
    location: "",
    companyLocationId: "",
  })

  // Helper: get token
  const getToken = () => {
    const TOKEN = typeof window !== "undefined" ? localStorage.getItem("token") : null
    return TOKEN
  }

  // Fetch company locations
  const loadCompanyLocations = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/company-locations`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      setCompanyLocations(res.data)
      // Auto-select first location if available
      if (res.data.length > 0 && !selectedLocationId) {
        setSelectedLocationId(res.data[0].id)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load company locations")
    }
  }

  useEffect(() => {
    // Load company locations first
    loadCompanyLocations()
  }, [])

  useEffect(() => {
    // Fetch weather data when a location is selected and no weather data exists
    if (selectedLocationId && weatherData.length === 0) {
      fetchWeatherForLocation(selectedLocationId)
    } else if (weatherData.length > 0) {
      loadWeatherStats()
    }
  }, [selectedLocationId])

  const fetchWeatherForLocation = async (locationId: string) => {
    const location = companyLocations.find(loc => loc.id === locationId)
    if (!location || !location.latitude || !location.longitude) {
      setError('Selected location does not have valid coordinates')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log("Fetching weather for location:", location.name)
      console.log("Latitude: ", location.latitude)
      console.log("Longitude: ", location.longitude)

      const res = await axios.post(
        `${API_BASE_URL}/weather/fetch-and-store`,
        {
          latitude: location.latitude,
          longitude: location.longitude,
          companyLocationId: locationId,
        },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      )
      setWeatherData(res.data)
      loadWeatherStats()
      loadWeatherData()
    } catch (err) {
      setError('Failed to fetch weather data from Open-Meteo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (filterDate) {
      setFilteredWeatherData(
        weatherData.filter((record) => record.date.split("T")[0] === filterDate)
      );
    } else {
      setFilteredWeatherData(weatherData);
    }
    // Reset to page 1 when filter changes
    setCurrentPage(1)
  }, [filterDate, weatherData]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredWeatherData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedWeatherData = filteredWeatherData.slice(startIndex, endIndex)

  const loadWeatherData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get(`${API_BASE_URL}/weather/data`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      setWeatherData(res.data)
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load weather data")
    } finally {
      setLoading(false)
    }
  }

  const loadWeatherStats = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/weather/summary`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      setStats({ ...res.data, lastUpdated: new Date().toISOString() })
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load weather stats")
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Validate form data
    if (!formData.date || !formData.temperature || !formData.humidity || !formData.rainfall || !formData.location || !formData.companyLocationId) {
      setError("All fields are required")
      return
    }

    const temperature = Number.parseFloat(formData.temperature)
    const humidity = Number.parseFloat(formData.humidity)
    const rainfall = Number.parseFloat(formData.rainfall)

    // Validate ranges
    if (temperature < -50 || temperature > 60) {
      setError("Temperature must be between -50°C and 60°C")
      return
    }
    if (humidity < 0 || humidity > 100) {
      setError("Humidity must be between 0% and 100%")
      return
    }
    if (rainfall < 0) {
      setError("Rainfall cannot be negative")
      return
    }

    try {
      setUploading(true)
      if (editingRecord) {
        // Update existing record
        await axios.put(
          `${API_BASE_URL}/weather/${editingRecord.id}`,
          {
            date: formData.date,
            temperature,
            humidity,
            rainfall,
            location: formData.location,
            companyLocationId: formData.companyLocationId,
          },
          { headers: { Authorization: `Bearer ${getToken()}` } }
        )
        setSuccess("Weather record updated successfully")
        setEditingRecord(null)
        setShowEditModal(false)
      } else {
        // Add new record
        await axios.post(
          `${API_BASE_URL}/weather/`,
          {
            date: formData.date,
            temperature,
            humidity,
            rainfall,
            location: formData.location,
            companyLocationId: formData.companyLocationId,
          },
          { headers: { Authorization: `Bearer ${getToken()}` } }
        )
        setSuccess("Weather record added successfully")
      }
      setFormData({ date: "", temperature: "", humidity: "", rainfall: "", location: "", companyLocationId: "" })
      setShowAddForm(false)
      loadWeatherData()
      loadWeatherStats()
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save weather record")
    } finally {
      setUploading(false)
    }
  }

  const handleCsvUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvFile) {
      setError("Please select a CSV file")
      return
    }
    if (!selectedLocationId) {
      setError("Please select a company location")
      return
    }
    setError(null)
    setSuccess(null)
    setUploading(true)
    try {
      const formDataObj = new FormData()
      formDataObj.append("file", csvFile)
      formDataObj.append("companyLocationId", selectedLocationId)
      await axios.post(`${API_BASE_URL}/weather/upload-csv`, formDataObj, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "multipart/form-data",
        },
      })
      setSuccess(`CSV file "${csvFile.name}" uploaded and processed successfully`)
      setCsvFile(null)
      loadWeatherData()
      loadWeatherStats()
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to process CSV file. Please check the format.")
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (record: WeatherRecord) => {
    setEditingRecord(record)
    setFormData({
      date: record.date.split("T")[0],
      temperature: record.temperature.toString(),
      humidity: record.humidity.toString(),
      rainfall: record.rainfall.toString(),
      location: record.location,
      companyLocationId: record.companyLocationId,
    })
    setShowEditModal(true)
  }

  // Helper function to format date and time
  const formatDateTime = (dateString: string, updatedAtString: string) => {
    const date = new Date(dateString)
    const updatedAt = new Date(updatedAtString)
    
    // Format date as DD/M/YYYY
    const day = date.getDate()
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    const formattedDate = `${day}/${month}/${year}`
    
    // Format time as H.MM.SS AM/PM
    const hours = updatedAt.getHours()
    const minutes = updatedAt.getMinutes()
    const seconds = updatedAt.getSeconds()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    const formattedTime = `${displayHours}.${minutes.toString().padStart(2, '0')}.${seconds.toString().padStart(2, '0')} ${ampm}`
    
    return { formattedDate, formattedTime }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this weather record?")) {
      return
    }
    try {
      await axios.delete(`${API_BASE_URL}/weather/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      setSuccess("Weather record deleted successfully")
      loadWeatherData()
      loadWeatherStats()
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete weather record")
    }
  }

  const exportData = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/weather/export`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement("a")
      a.href = url
      a.download = `weather-data-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError("Failed to export weather data")
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF7E3] flex flex-row  overflow-hidden">
      <AdminSidebar current="Weather Data" />
      <div className="flex-1 flex flex-col">
        <AdminHeader />

        <motion.section className="px-10 py-8" variants={container} initial="hidden" animate="show">
          <motion.div className="max-w-7xl mx-auto" variants={containerVariants} initial="hidden" animate="visible">
            {/* Header */}
            <motion.div className="mb-8" variants={itemVariants}>
              <div className="flex items-center justify-between">
                <div>
                  <motion.h1
                    className="text-3xl font-bold text-primary-dark flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  >
                    Weather Data Management
                  </motion.h1>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent-blue"></div>
                    <div className="text-lg text-gray-600">
                      Manage weather datasets for dengue prediction analysis within your company
                    </div>
                  </div>
                </div>
                <motion.div
                  className="flex gap-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                >
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button onClick={exportData} variant="outline" className="flex items-center gap-2 bg-white">
                      <Download className="h-4 w-4" />
                      Export Data
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={loadWeatherData}
                      variant="outline"
                      className="flex items-center gap-2 bg-white"
                      disabled={loading}
                    >
                      <motion.div
                        animate={loading ? { rotate: 360 } : {}}
                        transition={loading ? { duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" } : {}}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </motion.div>
                      Refresh
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>

            {/* Alerts */}
            <AnimatePresence>
              {error && (
                <motion.div variants={alertVariants} initial="hidden" animate="visible" exit="exit" className="mb-6">
                  <Alert className="border-red-200 bg-red-50">
                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.5, repeat: 2 }}>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    </motion.div>
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}

              {success && (
                <motion.div variants={alertVariants} initial="hidden" animate="visible" exit="exit" className="mb-6">
                  <Alert className="border-green-200 bg-green-50">
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </motion.div>
                    <AlertDescription className="text-green-800">{success}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Location Selector and Date Filter UI */}
            {/* <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="locationSelect">Company Location:</Label>
                <select
                  id="locationSelect"
                  value={selectedLocationId}
                  onChange={(e) => {
                    setSelectedLocationId(e.target.value)
                    setWeatherData([]) // Clear existing data to trigger refetch
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a location</option>
                  {companyLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name} - {location.address}
                    </option>
                  ))}
                </select>
                {selectedLocationId && (
                  <Button
                    variant="outline"
                    onClick={() => fetchWeatherForLocation(selectedLocationId)}
                    disabled={loading}
                    className="ml-2"
                  >
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      "Fetch Weather"
                    )}
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Label htmlFor="dateFilter">Filter by Date:</Label>
                <Input
                  id="dateFilter"
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-48"
                />
                <Button
                  variant="outline"
                  onClick={() => setFilterDate("")}
                  className="ml-2"
                  disabled={!filterDate}
                >
                  Clear Filter
                </Button>
              </div>
            </div> */}

            {/* Statistics Cards */}
            {stats && (
              <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" variants={itemVariants}>
                <motion.div variants={statsCardVariants} whileHover="hover">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-600 text-sm font-medium">Total Records</p>
                          <motion.p
                            className="text-2xl font-bold text-blue-900"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.5, type: "spring" }}
                          >
                            {stats.totalRecords}
                          </motion.p>
                        </div>
                        <motion.div
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                        >
                          <Database className="h-8 w-8 text-blue-600" />
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={statsCardVariants} whileHover="hover">
                  <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-orange-600 text-sm font-medium">Avg Temperature</p>
                          <motion.p
                            className="text-2xl font-bold text-orange-900"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.6, type: "spring" }}
                          >
                            {stats.avgTemperature.toFixed(1)}°C
                          </motion.p>
                        </div>
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                        >
                          <Thermometer className="h-8 w-8 text-orange-600" />
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={statsCardVariants} whileHover="hover">
                  <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200 overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-cyan-600 text-sm font-medium">Avg Humidity</p>
                          <motion.p
                            className="text-2xl font-bold text-cyan-900"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.7, type: "spring" }}
                          >
                            {stats.avgHumidity.toFixed(1)}%
                          </motion.p>
                        </div>
                        <motion.div
                          animate={{ y: [0, -3, 0] }}
                          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                        >
                          <Droplets className="h-8 w-8 text-cyan-600" />
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={statsCardVariants} whileHover="hover">
                  <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-indigo-600 text-sm font-medium">Total Rainfall</p>
                          <motion.p
                            className="text-2xl font-bold text-indigo-900"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.8, type: "spring" }}
                          >
                            {stats.totalRainfall.toFixed(1)}mm
                          </motion.p>
                        </div>
                        <motion.div
                          animate={{ x: [0, 2, -2, 0] }}
                          transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                        >
                          <CloudRain className="h-8 w-8 text-indigo-600" />
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            )}

            {/* Data Upload Section */}
            <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8" variants={itemVariants}>
              {/* CSV Upload */}
              <motion.div variants={cardVariants} whileHover="hover">
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <motion.div
                        animate={{ y: [0, -2, 0] }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                      >
                        <Upload className="h-5 w-5 text-blue-600" />
                      </motion.div>
                      Upload CSV Data
                    </CardTitle>
                    <CardDescription>
                      Upload weather data in CSV format. Required columns: Date, Temperature, Humidity, Rainfall,
                      Location
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCsvUpload} className="space-y-4">
                      <div>
                        <Label htmlFor="csvFile">Select CSV File</Label>
                        <Input
                          id="csvFile"
                          type="file"
                          accept=".csv"
                          onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                          className="mt-1"
                        />
                      </div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button type="submit" disabled={!csvFile || uploading} className="w-full">
                          {uploading ? (
                            <motion.div className="flex items-center gap-2">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </motion.div>
                              Processing...
                            </motion.div>
                          ) : (
                            "Upload CSV"
                          )}
                        </Button>
                      </motion.div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Manual Entry */}
              <motion.div variants={cardVariants} whileHover="hover">
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: [0, 90, 0] }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, repeatDelay: 2 }}
                      >
                        <Plus className="h-5 w-5 text-green-600" />
                      </motion.div>
                      Add Weather Record
                    </CardTitle>
                    <CardDescription>Manually add individual weather data records</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={() => {
                          setShowAddForm(true)
                          setEditingRecord(null)
                          setFormData({
                            date: "",
                            temperature: "",
                            humidity: "",
                            rainfall: "",
                            location: "",
                            companyLocationId: selectedLocationId || "",
                          })
                        }}
                        className="w-full"
                        variant="outline"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Record
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>

            {/* Add/Edit Form */}
            <AnimatePresence>
              {showAddForm && (
                <motion.div variants={formVariants} initial="hidden" animate="visible" exit="exit" className="mb-8">
                  <Card className="border-2 border-blue-200 bg-blue-50/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {editingRecord ? (
                          <>
                            <motion.div
                              animate={{ rotate: [0, 10, -10, 0] }}
                              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                            >
                              <Edit3 className="h-5 w-5 text-blue-600" />
                            </motion.div>
                            Edit Weather Record
                          </>
                        ) : (
                          <>
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                            >
                              <Plus className="h-5 w-5 text-green-600" />
                            </motion.div>
                            Add Weather Record
                          </>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form
                        onSubmit={handleFormSubmit}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                        >
                          <Label htmlFor="date">Date</Label>
                          <Input
                            id="date"
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                            className="mt-1"
                            required
                          />
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <Label htmlFor="temperature">Temperature (°C)</Label>
                          <Input
                            id="temperature"
                            type="number"
                            step="0.1"
                            value={formData.temperature}
                            onChange={(e) => setFormData((prev) => ({ ...prev, temperature: e.target.value }))}
                            className="mt-1"
                            placeholder="28.5"
                            required
                          />
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          <Label htmlFor="humidity">Humidity (%)</Label>
                          <Input
                            id="humidity"
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={formData.humidity}
                            onChange={(e) => setFormData((prev) => ({ ...prev, humidity: e.target.value }))}
                            className="mt-1"
                            placeholder="75"
                            required
                          />
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                        >
                          <Label htmlFor="rainfall">Rainfall (mm)</Label>
                          <Input
                            id="rainfall"
                            type="number"
                            step="0.1"
                            min="0"
                            value={formData.rainfall}
                            onChange={(e) => setFormData((prev) => ({ ...prev, rainfall: e.target.value }))}
                            className="mt-1"
                            placeholder="12.3"
                            required
                          />
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                        >
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                            className="mt-1"
                            placeholder="Kuala Lumpur"
                            required
                          />
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 }}
                        >
                          <Label htmlFor="companyLocationId">Operational Area</Label>
                          <select
                            id="companyLocationId"
                            value={formData.companyLocationId}
                            onChange={(e) => setFormData((prev) => ({ ...prev, companyLocationId: e.target.value }))}
                            className="mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                            required
                          >
                            <option value="">Select a Operational Area</option>
                            {companyLocations.map((location) => (
                              <option key={location.id} value={location.id}>
                                {location.name} - {location.address}
                              </option>
                            ))}
                          </select>
                        </motion.div>
                        <motion.div
                          className="md:col-span-2 lg:col-span-3 flex gap-3"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 }}
                        >
                          <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button type="submit" disabled={uploading} className="w-full">
                              {uploading ? (
                                <motion.div className="flex items-center gap-2">
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </motion.div>
                                  Saving...
                                </motion.div>
                              ) : editingRecord ? (
                                "Update Record"
                              ) : (
                                "Add Record"
                              )}
                            </Button>
                          </motion.div>
                          <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setShowAddForm(false)
                                setEditingRecord(null)
                              }}
                              className="w-full"
                            >
                              Cancel
                            </Button>
                          </motion.div>
                        </motion.div>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Location Selector and Date Filter UI */}
            <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8" variants={itemVariants}>
              {/* Location Selector Card */}
              <motion.div variants={cardVariants} whileHover="hover">
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 overflow-hidden">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: [0, 15, -15, 0] }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                      >
                        <Cloud className="h-5 w-5 text-purple-600" />
                      </motion.div>
                      Weather Location
                    </CardTitle>
                    <CardDescription>
                      Select a operational area to fetch weather data for dengue prediction analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="locationSelect" className="text-purple-700 font-medium">
                          Operational Area
                        </Label>
                        <select
                          id="locationSelect"
                          value={selectedLocationId}
                          onChange={(e) => {
                            setSelectedLocationId(e.target.value)
                            setWeatherData([]) // Clear existing data to trigger refetch
                          }}
                          className="mt-2 w-full px-3 py-2 border border-purple-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                        >
                          <option value="">Select a location</option>
                          {companyLocations.map((location) => (
                            <option key={location.id} value={location.id}>
                              {location.name} - {location.address}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {selectedLocationId && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                              onClick={() => fetchWeatherForLocation(selectedLocationId)}
                              disabled={loading}
                              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              {loading ? (
                                <motion.div className="flex items-center gap-2">
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </motion.div>
                                  Fetching Weather...
                                </motion.div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Cloud className="h-4 w-4" />
                                  Fetch Weather Data
                                </div>
                              )}
                            </Button>
                          </motion.div>
                        </motion.div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Date Filter Card */}
              <motion.div variants={cardVariants} whileHover="hover">
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 overflow-hidden">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                      >
                        <Calendar className="h-5 w-5 text-green-600" />
                      </motion.div>
                      Date Filter
                    </CardTitle>
                    <CardDescription>
                      Filter weather records by specific date for detailed analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="dateFilter" className="text-green-700 font-medium">
                          Filter by Date
                        </Label>
                        <Input
                          id="dateFilter"
                          type="date"
                          value={filterDate}
                          onChange={(e) => setFilterDate(e.target.value)}
                          className="mt-2 border-green-200 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      
                      {filterDate && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                              variant="outline"
                              onClick={() => setFilterDate("")}
                              className="w-full border-green-300 text-green-700 hover:bg-green-50"
                            >
                              <div className="flex items-center gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Clear Filter
                              </div>
                            </Button>
                          </motion.div>
                        </motion.div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>

            {/* Weather Data Table */}
            <motion.div variants={itemVariants}>
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <motion.div
                      animate={{ y: [0, -2, 0] }}
                      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                    >
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </motion.div>
                    Weather Records
                  </CardTitle>
                  <CardDescription>Current weather datasets available for dengue prediction analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <motion.div
                      className="flex items-center justify-center py-12"
                      variants={loadingVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      >
                        <RefreshCw className="h-8 w-8 text-blue-600" />
                      </motion.div>
                      <span className="ml-2 text-gray-600">
                        {companyLocations.length === 0 ? "Loading company locations..." : "Loading weather data..."}
                      </span>
                    </motion.div>
                  ) : filteredWeatherData.length === 0 ? (
                    <motion.div
                      className="text-center py-12"
                      variants={emptyStateVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                      >
                        <Cloud className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      </motion.div>
                      <h3 className="text-lg font-medium text-primary-dark mb-2">
                        {companyLocations.length === 0 ? "No Company Locations" : "No Weather Data"}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {companyLocations.length === 0
                          ? "Please add company locations first before managing weather data"
                          : "Start by selecting a company location and fetching weather data"
                        }
                      </p>
                      {companyLocations.length > 0 && (
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button onClick={() => setShowAddForm(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add First Record
                          </Button>
                        </motion.div>
                      )}
                    </motion.div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-medium text-primary-dark min-w-[180px] w-[180px]">Date & Time</th>
                            <th className="text-left py-3 px-4 font-medium text-primary-dark">Temperature</th>
                            <th className="text-left py-3 px-4 font-medium text-primary-dark">Humidity</th>
                            <th className="text-left py-3 px-4 font-medium text-primary-dark">Rainfall</th>
                            {/* <th className="text-left py-3 px-4 font-medium text-primary-dark">Address</th> */}
                            <th className="text-left py-3 px-4 font-medium text-primary-dark">Operational Area</th>
                            <th className="text-left py-3 px-4 font-medium text-primary-dark">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedWeatherData.map((record, index) => (
                            <motion.tr
                              key={record.id}
                              custom={index}
                              variants={tableRowVariants}
                              initial="hidden"
                              animate="visible"
                              whileHover="hover"
                              className="border-b border-gray-100"
                            >
                              <td className="py-3 px-4 min-w-[180px] w-[180px]">
                                <div className="flex items-start gap-2">
                                  <Calendar className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                                  <div className="flex flex-col">
                                    <span>{formatDateTime(record.date, record.updatedAt).formattedDate}</span>
                                    <span className="text-sm text-gray-600">{formatDateTime(record.date, record.updatedAt).formattedTime}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <Thermometer className="h-4 w-4 text-orange-500" />
                                  <span className="font-medium">{record.temperature}°C</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <Droplets className="h-4 w-4 text-cyan-500" />
                                  <span className="font-medium">{record.humidity}%</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <CloudRain className="h-4 w-4 text-blue-500" />
                                  <span className="font-medium">{record.rainfall}mm</span>
                                </div>
                              </td>
                              {/* <td className="py-3 px-4 text-primary-dark">{record.location}</td> */}
                              <td className="py-3 px-4 text-primary-dark">
                                {record.companyLocation ? (
                                  <div>
                                    <div className="font-medium">{record.companyLocation.name}</div>
                                    <div className="text-sm text-gray-600">{record.companyLocation.address}</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-500">N/A</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex gap-2">
                                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEdit(record)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </Button>
                                  </motion.div>
                                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDelete(record.id)}
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </motion.div>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {/* Pagination Controls */}
                  {filteredWeatherData.length > 0 && (
                    <div className="flex items-center justify-between mt-4 px-6 py-3 bg-gray-50 rounded-b-xl border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredWeatherData.length)} of {filteredWeatherData.length} records
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
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </motion.section>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowEditModal(false)
              setEditingRecord(null)
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <CardTitle className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                  >
                    <Edit3 className="h-5 w-5 text-blue-600" />
                  </motion.div>
                  Edit Weather Record
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingRecord(null)
                  }}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardContent className="p-6">
                <form
                  onSubmit={handleFormSubmit}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Label htmlFor="modal-date">Date</Label>
                    <Input
                      id="modal-date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                      className="mt-1"
                      required
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Label htmlFor="modal-temperature">Temperature (°C)</Label>
                    <Input
                      id="modal-temperature"
                      type="number"
                      step="0.1"
                      value={formData.temperature}
                      onChange={(e) => setFormData((prev) => ({ ...prev, temperature: e.target.value }))}
                      className="mt-1"
                      placeholder="28.5"
                      required
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Label htmlFor="modal-humidity">Humidity (%)</Label>
                    <Input
                      id="modal-humidity"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.humidity}
                      onChange={(e) => setFormData((prev) => ({ ...prev, humidity: e.target.value }))}
                      className="mt-1"
                      placeholder="75"
                      required
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Label htmlFor="modal-rainfall">Rainfall (mm)</Label>
                    <Input
                      id="modal-rainfall"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.rainfall}
                      onChange={(e) => setFormData((prev) => ({ ...prev, rainfall: e.target.value }))}
                      className="mt-1"
                      placeholder="12.3"
                      required
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Label htmlFor="modal-location">Location</Label>
                    <Input
                      id="modal-location"
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                      className="mt-1"
                      placeholder="Kuala Lumpur"
                      required
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Label htmlFor="modal-companyLocationId">Operational Area</Label>
                    <select
                      id="modal-companyLocationId"
                      value={formData.companyLocationId}
                      onChange={(e) => setFormData((prev) => ({ ...prev, companyLocationId: e.target.value }))}
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                      required
                    >
                      <option value="">Select a Operational Area</option>
                      {companyLocations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name} - {location.address}
                        </option>
                      ))}
                    </select>
                  </motion.div>
                  <motion.div
                    className="md:col-span-2 lg:col-span-3 flex gap-3 mt-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button type="submit" disabled={uploading} className="w-full">
                        {uploading ? (
                          <motion.div className="flex items-center gap-2">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </motion.div>
                            Saving...
                          </motion.div>
                        ) : (
                          "Update Record"
                        )}
                      </Button>
                    </motion.div>
                    <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowEditModal(false)
                          setEditingRecord(null)
                        }}
                        className="w-full"
                      >
                        Cancel
                      </Button>
                    </motion.div>
                  </motion.div>
                </form>
              </CardContent>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
