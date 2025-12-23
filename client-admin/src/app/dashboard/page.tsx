"use client"

import AdminSidebar from "@/components/AdminSidebar"
import AdminHeader from "@/components/AdminHeader"
import Image from "next/image"
import Link from "next/link"
import {
  FiArrowUp,
  FiArrowDown,
  FiPlus,
  FiUpload,
  FiEye,
  FiDownload,
  FiActivity,
  FiUsers,
  FiCamera,
  FiRefreshCw,
} from "react-icons/fi"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { getDashboardStats, getRecentPredictions, createPrediction, reverseGeocode, DashboardStats, RecentPrediction } from "@/lib/api"
import PredictionModal, { PredictionFormData } from "@/components/PredictionModal"

// Helper function to format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Helper: reverse geocode with simple in-memory cache per session
const reverseGeocodeCache = new Map<string, string>();
const getAreaName = async (lat: number, lon: number): Promise<string> => {
  const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  if (reverseGeocodeCache.has(key)) return reverseGeocodeCache.get(key) as string;
  try {
    const data = await reverseGeocode(lat, lon);
    const a = data.address || {};
    const label = a.suburb || a.town || a.village || a.city || a.neighbourhood || a.state_district || a.state || a.county || data.display_name || 'Unknown';
    reverseGeocodeCache.set(key, label);
    return label;
  } catch {
    return 'Unknown';
  }
};

const statusColors: Record<string, string> = {
  Low: "bg-green-100 text-green-700 border-green-200",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  High: "bg-red-100 text-red-700 border-red-200",
}

// Remove hardcoded images - will use state instead

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

export default function DashboardPage() {
  const { user, company, companyId } = useAuth();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [recentPredictions, setRecentPredictions] = useState<RecentPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);
  const [isCreatingPrediction, setIsCreatingPrediction] = useState(false);
  const [recentDroneImages, setRecentDroneImages] = useState<any[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  // Helper: get token
  const getToken = () => {
    const TOKEN = typeof window !== "undefined" ? localStorage.getItem("token") : null
    return TOKEN
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

  // Fetch recent drone images
  const fetchRecentDroneImages = async () => {
    try {
      setLoadingImages(true)
      const response = await fetch(`${process.env.API_BASE_URL}/drones/recent-images`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch recent drone images')
      }

      const data = await response.json()
      return data.images || []
    } catch (error) {
      console.error('Fetch recent drone images error:', error)
      return []
    } finally {
      setLoadingImages(false)
    }
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!companyId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const [stats, predictions, images] = await Promise.all([
          getDashboardStats(companyId),
          getRecentPredictions(companyId, 6),
          fetchRecentDroneImages()
        ]);
        
        setDashboardStats(stats);
        setRecentPredictions(predictions.predictions || []);
        setRecentDroneImages(images);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [companyId]);

  const handleRefresh = async () => {
    if (!companyId) return;
    
    setIsLoading(true);
    try {
      const [stats, predictions] = await Promise.all([
        getDashboardStats(companyId),
        getRecentPredictions(companyId, 6)
      ]);
      
      setDashboardStats(stats);
      setRecentPredictions(predictions.predictions || []);
    } catch (err) {
      console.error('Error refreshing dashboard data:', err);
      setError('Failed to refresh dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePrediction = async (data: PredictionFormData) => {
    setIsCreatingPrediction(true);
    try {
      const result = await createPrediction({
        ...data,
        companyId: companyId || undefined
      });
      
      if (result.success) {
        // Refresh the dashboard data to show the new prediction
        await handleRefresh();
        setIsPredictionModalOpen(false);
        
        // Show success message (you could add a toast notification here)
        console.log('Prediction created successfully:', result.prediction);
      } else {
        throw new Error('Failed to create prediction');
      }
    } catch (err) {
      console.error('Error creating prediction:', err);
      setError('Failed to create prediction. Please try again.');
    } finally {
      setIsCreatingPrediction(false);
    }
  };

  // Create stats array from dashboard data
  const stats = dashboardStats ? [
    {
      label: "Risk Prediction Today",
      value: dashboardStats.riskPredictionsToday,
      icon: <FiActivity className="text-[#1D4ED8]" />,
      change: 0, // This would need historical data to calculate
      isIncrease: true,
    },
    {
      label: "Drone Insights Uploaded",
      value: dashboardStats.droneInsightsUploaded,
      icon: <FiCamera className="text-[#1D4ED8]" />,
      change: 0, // This would need historical data to calculate
      isIncrease: true,
    },
    {
      label: "Active Users",
      value: dashboardStats.activeUsers,
      icon: <FiUsers className="text-[#1D4ED8]" />,
      change: 0, // This would need historical data to calculate
      isIncrease: false,
    },
  ] : [];

  // Show loading state if companyId is not available
  if (!companyId) {
    return (
      <div className="min-h-screen bg-[#FFF7E3] flex flex-row border-[8px] border-[#E2C275] overflow-hidden">
        <AdminSidebar current="Dashboard" />
        <main className="flex-1 flex flex-col">
          <AdminHeader />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-[#A21C1C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF7E3] flex flex-row border-[8px] border-[#E2C275] overflow-hidden">
      <AdminSidebar current="Dashboard" />
      <main className="flex-1 flex flex-col">
        <AdminHeader />

        {/* Welcome & Stats */}
        <motion.section className="px-10 py-8" variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-black mb-1">
                  Welcome Back, {user?.name || 'Admin'}
                </h1>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#1D4ED8]"></div>
                  <div className="text-lg text-gray-600">
                    Organisation: {company?.name || user?.organization || 'University Malaya'}
                  </div>
                </div>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-[#1D4ED8] text-[#1D4ED8] rounded-lg hover:bg-[#EFF6FF] transition-colors disabled:opacity-50"
              >
                <FiRefreshCw className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </motion.div>

          {error && (
            <motion.div variants={item} className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
              {error}
            </motion.div>
          )}

          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, idx) => (
                <motion.div
                  key={idx}
                  className="bg-white rounded-xl shadow-md overflow-hidden border border-[#E2C275]/30"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-[#FFF7E3] rounded-lg w-12 h-12 animate-pulse"></div>
                      <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="w-16 h-10 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="h-1 bg-gray-200"></div>
                </motion.div>
              ))
            ) : (
              stats.map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  className="bg-white rounded-xl shadow-md overflow-hidden border border-[#E2C275]/30"
                  whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(226, 194, 117, 0.2)" }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-[#FFF7E3] rounded-lg">{stat.icon}</div>
                      <div
                        className={`flex items-center gap-1 text-sm ${stat.isIncrease ? "text-green-600" : "text-red-600"}`}
                      >
                        {stat.isIncrease ? <FiArrowUp size={14} /> : <FiArrowDown size={14} />}
                        <span>{stat.change} from last week</span>
                      </div>
                    </div>
                    <div className="text-4xl font-bold mb-1">{stat.value}</div>
                    <div className="text-gray-500">{stat.label}</div>
                  </div>
                  <div className={`h-1 ${idx === 0 ? "bg-red-500" : idx === 1 ? "bg-yellow-500" : "bg-green-500"}`}></div>
                </motion.div>
              ))
            )}
          </motion.div>

          {/* Quick Action */}
          <motion.div variants={item} className="mb-10">
            <div className="font-bold text-xl mb-4">Quick Action</div>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsPredictionModalOpen(true)}
                className="bg-[#1D4ED8] text-white px-6 py-3 rounded-lg font-bold text-base hover:bg-[#1E3A8A] transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                <FiPlus />
                New Risk Prediction
              </button>
              <Link 
                href="/drone-management"
                className="bg-white text-[#1D4ED8] border border-[#1D4ED8] px-6 py-3 rounded-lg font-bold text-base hover:bg-[#EFF6FF] transition-all flex items-center gap-2"
              >
                <FiUpload />
                Upload New Drone Images
              </Link>
            </div>
          </motion.div>

          {/* Recent Predictions Table */}
          <motion.div variants={item} className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <div className="font-bold text-xl">Recent Predictions</div>
              <button className="text-[#1D4ED8] hover:underline text-sm font-medium flex items-center gap-1">
                View all <FiArrowUp className="rotate-45" size={14} />
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl shadow-md">
              <table className="min-w-full bg-white rounded-xl overflow-hidden">
                <thead>
                  <tr className="text-left text-black font-semibold text-base bg-[#F3EAD8]">
                    <th className="py-4 px-6">Area</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Risk Score</th>
                    <th className="py-4 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    // Loading skeleton for table
                    Array.from({ length: 3 }).map((_, idx) => (
                      <tr key={idx} className={`border-b border-gray-100 last:border-0 ${idx % 2 === 0 ? "bg-white" : "bg-[#F9F6F2]"}`}>
                        <td className="py-4 px-6">
                          <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="w-16 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="w-12 h-4 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2">
                            <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                            <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : recentPredictions.length > 0 ? (
                    recentPredictions.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={`border-b border-gray-100 last:border-0 hover:bg-[#FFF7E3]/50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-[#F9F6F2]"}`}
                      >
                        <td className="py-4 px-6 font-medium text-black">
                          {/* Show cached or async resolved area name */}
                          <AsyncAreaName lat={row.latitude} lon={row.longitude} fallback={row.companyLocation?.name} />
                        </td>
                        <td className="py-4 px-6 text-gray-600">
                          {formatDate(row.createdAt)}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold border ${statusColors[row.riskLevel?.toLowerCase() || '']}`}
                          >
                            <span
                              className={`inline-block w-2 h-2 rounded-full mr-1.5 ${row.riskLevel.toLowerCase() === "low" ? "bg-green-500" : row.riskLevel?.toLowerCase() === "medium" ? "bg-yellow-500" : "bg-red-500"}`}
                            ></span>
                            {row.riskLevel?.toUpperCase() || 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-600">
                          {row.riskScore.toFixed(2)}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2">
                            <button className="p-2 rounded-lg hover:bg-[#EFF6FF] text-[#1D4ED8]">
                              <FiEye size={18} />
                            </button>
                            <button className="p-2 rounded-lg hover:bg-[#EFF6FF] text-[#1D4ED8]">
                              <FiDownload size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 px-6 text-center text-gray-500">
                        No recent predictions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Recent Drone Images */}
          <motion.div variants={item}>
            <div className="font-bold text-xl mb-4">Recent Drone Images</div>
            {loadingImages ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1D4ED8] mx-auto mb-4"></div>
                <p className="text-gray-500">Loading images...</p>
              </div>
            ) : recentDroneImages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {recentDroneImages.slice(0, 6).map((image, idx) => (
                  <motion.div
                    key={image.id}
                    className="rounded-xl overflow-hidden shadow-md bg-white p-3 border border-[#E2C275]/30"
                    whileHover={{ y: -5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="relative h-48 rounded-lg overflow-hidden mb-3">
                      <Image 
                        src={getImageUrl(image)} 
                        alt={`Drone ${idx + 1}`} 
                        fill 
                        className="object-cover" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium">
                        {image.companyLocation ? image.companyLocation.name : `Area ${idx + 1}`}
                      </div>
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium">
                        {new Date(image.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium">{image.filename}</div>
                        <div className="text-xs text-gray-500">
                          {image.sourceType === 'video_frame' ? 'Video Frame' : 'Direct Upload'}
                        </div>
                        {image.companyLocation && (
                          <div className="text-xs text-blue-600 mt-1">
                            📍 {image.companyLocation.name}
                          </div>
                        )}
                      </div>
                      <button className="text-[#1D4ED8] hover:bg-[#EFF6FF] p-1.5 rounded-lg transition-colors">
                        <FiEye size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <FiCamera className="text-gray-400 mx-auto mb-2" size={32} />
                <p className="text-gray-500">No drone images available</p>
                <p className="text-sm text-gray-400">Upload images in the Drone Management section</p>
              </div>
            )}
          </motion.div>
        </motion.section>
      </main>

      {/* Prediction Modal */}
      <PredictionModal
        isOpen={isPredictionModalOpen}
        onClose={() => setIsPredictionModalOpen(false)}
        onSubmit={handleCreatePrediction}
        isLoading={isCreatingPrediction}
      />
    </div>
  )
}

// Small helper component to render area name via reverse geocoding
function AsyncAreaName({ lat, lon, fallback }: { lat: number; lon: number; fallback?: string }) {
  const [name, setName] = useState<string>(fallback || '');
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (fallback) { setName(fallback); return; }
      const label = await getAreaName(lat, lon);
      if (mounted) setName(label);
    };
    load();
    return () => { mounted = false; };
  }, [lat, lon, fallback]);
  return <>{name || 'Unknown'}</>;
}
