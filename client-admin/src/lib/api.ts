import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token if available
export function setAuthToken(token?: string) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

// Prediction API functions
export interface PredictionRequest {
  companyId?: string;
  companyLocationId?: string;
  lat: number;
  lon: number;
  userId?: string;
}

export interface HistoricalDataItem {
  date: string;
  cases: number;
}

export interface EnhancedPredictionRequest {
  lat: number;
  lon: number;
  userId?: string;
  historicalData?: HistoricalDataItem[];
  targetDate?: string;
  useModel1Only?: boolean;
}

export interface PredictionResponse {
  success: boolean;
  prediction: {
    id?: string;
    companyId?: string;
    latitude: number;
    longitude: number;
    riskScore: number;
    riskLevel: 'high' | 'medium' | 'low';
    model1Score?: number;
    model2Score?: number;
    model3Score?: number;  // Breeding area detection score (0-1 range)
    combinedScore?: number;  // Combined score from all three models (0-5 range)
    combinedScoreNormalized?: number;  // Combined score in 0-1 range for reference
    createdAt?: string;
    timestamp?: string;
    cached?: boolean;
    // Enhanced features
    historicalFeatures?: {
      cases_lag_1: number;
      cases_lag_7: number;
      cases_lag_30: number;
      cases_avg_7: number;
      cases_avg_30: number;
    };
    isHotspot?: number;
    locationCluster?: number;
    dataQuality?: {
      has_historical_data: boolean;
      data_points_available: number;
      has_lag_1: boolean;
      has_lag_7: boolean;
      has_lag_30: boolean;
    };
    model?: string;
    // Three-model specific fields
    breedingAreaDetections?: any[];  // Breeding area detection results
    model3RiskLevel?: string;  // Model 3 risk level
    imagesProcessed?: number;  // Number of images processed
    modelsUsed?: string[];  // Which models were used
  };
}

export interface HistoricalDataResponse {
  success: boolean;
  historicalData: HistoricalDataItem[];
  dataPoints: number;
  daysBack: number;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface CompanyLocation {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
}

export interface CompanyPredictionsResponse {
  success: boolean;
  predictions: Array<{
    id: string;
    companyLocationId: string;
    companyLocation: CompanyLocation;
    latitude: number;
    longitude: number;
    riskScore: number;
    riskLevel: 'high' | 'medium' | 'low';
    model1Score?: number;
    model2Score?: number;
    createdAt: string;
  }>;
}

// Company prediction (requires authentication)
export async function predictCompany(data: PredictionRequest): Promise<PredictionResponse> {
  const response = await api.post('/api/predict/company', data);
  return response.data;
}

// Three-model prediction for company (requires authentication)
export async function predictCompanyThreeModels(data: PredictionRequest & { imageIds?: string[] }): Promise<PredictionResponse> {
  const response = await api.post('/api/predict/company/three-models', data, {
    timeout: 10 * 60 * 1000 // 10 minutes timeout for object detection
  });
  return response.data;
}

// Get images for a company location
export async function getLocationImages(companyId: string, companyLocationId: string): Promise<{
  success: boolean;
  images: Array<{
    id: string;
    filename: string;
    url: string;
    createdAt: string;
    companyId: string;
    companyLocationId: string;
  }>;
}> {
  const response = await api.get(`/drones/locations/${companyLocationId}/images`);
  return response.data;
}

// Public prediction (no authentication required)
export async function predictPublic(data: Omit<PredictionRequest, 'companyId'>): Promise<PredictionResponse> {
  const response = await api.post('/api/predict/public', data);
  return response.data;
}

// Enhanced public prediction with historical data support
export async function predictPublicEnhanced(data: EnhancedPredictionRequest): Promise<PredictionResponse> {
  const response = await api.post('/api/predict/public/enhanced', data);
  return response.data;
}

// Get historical data for a location
export async function getHistoricalData(
  lat: number, 
  lon: number, 
  daysBack: number = 30
): Promise<HistoricalDataResponse> {
  const response = await api.get(`/api/predict/historical-data?lat=${lat}&lon=${lon}&days_back=${daysBack}`);
  return response.data;
}

// Get company predictions
export async function getCompanyPredictions(
  companyId: string, 
  limit: number = 10, 
  offset: number = 0
): Promise<CompanyPredictionsResponse> {
  const response = await api.get(`/api/predict/company/${companyId}?limit=${limit}&offset=${offset}`);
  return response.data;
}

// Get company locations
export async function getCompanyLocations(companyId: string): Promise<{
  success: boolean;
  locations: CompanyLocation[];
}> {
  const response = await api.get(`/api/predict/company/${companyId}/locations`);
  return response.data;
}

// Health check
export async function checkPredictionHealth(): Promise<{
  success: boolean;
  services: {
    ml_service: string;
    redis: string;
    database: string;
  };
  timestamp: string;
}> {
  const response = await api.get('/api/predict/health');
  return response.data;
}

// Dashboard API functions
export interface DashboardStats {
  riskPredictionsToday: number;
  droneInsightsUploaded: number;
  activeUsers: number;
  totalUsers: number;
  pendingUsers: number;
  adminUsers: number;
  totalRecords: number;
  activeCases: number;
  locationsCovered: number;
  hotspotCount: number;
  avgTemperature: number;
  avgHumidity: number;
  totalRainfall: number;
}

export interface RecentPrediction {
  id: string;
  area: string;
  date: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  riskScore: number;
  latitude: number;
  longitude: number;
  createdAt: string;
  companyLocation?: {
    name: string;
  };
}

// Reverse geocoding API types
export interface ReverseGeocodeResponse {
  display_name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    neighbourhood?: string;
    state_district?: string;
    state?: string;
    county?: string;
    postcode?: string;
  };
}

export async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResponse> {
  const response = await api.get(`/geocode/reverse?lat=${lat}&lon=${lon}`);
  return response.data;
}

// Get user summary for dashboard
export async function getUserSummary(): Promise<{
  total: number;
  active: number;
  pending: number;
  admin: number;
}> {
  const response = await api.get('/users/summary/dashboard');
  return response.data;
}

// Get dengue data summary
export async function getDengueDataSummary(): Promise<{
  totalRecords: number;
  activeCases: number;
  locationsCovered: number;
  hotspotCount: number;
}> {
  const response = await api.get('/dengue-data/summary/dengue-data');
  return response.data;
}

// Get weather summary
export async function getWeatherSummary(): Promise<{
  totalRecords: number;
  avgTemperature: number;
  avgHumidity: number;
  totalRainfall: number;
}> {
  const response = await api.get('/weather/summary');
  return response.data;
}

// Get recent predictions for dashboard
export async function getRecentPredictions(companyId: string, limit: number = 6): Promise<{
  success: boolean;
  predictions: RecentPrediction[];
}> {
  const response = await api.get(`/api/predict/company/${companyId}?limit=${limit}&offset=0`);
  return response.data;
}

// Get dashboard historical stats for comparison
export async function getDashboardHistoricalStats(): Promise<{
  riskPredictionsLastWeek: number;
  droneInsightsLastWeek: number;
  activeUsersLastWeek: number;
}> {
  const response = await api.get('/users/dashboard/historical-stats');
  return response.data;
}

// Get comprehensive dashboard stats
export async function getDashboardStats(companyId: string): Promise<DashboardStats> {
  try {
    const [userSummary, dengueSummary, weatherSummary, recentPredictions] = await Promise.all([
      getUserSummary(),
      getDengueDataSummary(),
      getWeatherSummary(),
      getRecentPredictions(companyId, 6)
    ]);

    // Count predictions for today
    const today = new Date().toISOString().split('T')[0];
    const riskPredictionsToday = recentPredictions.predictions?.filter(p => 
      p.createdAt.startsWith(today)
    ).length || 0;

    // Get drone images uploaded this week (last 7 days)
    let droneInsightsUploaded = 0;
    try {
      const droneStatsResponse = await api.get('/drones/stats');
      droneInsightsUploaded = droneStatsResponse.data.thisWeekImages || 0;
    } catch (err) {
      console.warn('Failed to fetch drone insights count:', err);
      droneInsightsUploaded = 0;
    }

    return {
      riskPredictionsToday,
      droneInsightsUploaded,
      activeUsers: userSummary.active,
      totalUsers: userSummary.total,
      pendingUsers: userSummary.pending,
      adminUsers: userSummary.admin,
      totalRecords: dengueSummary.totalRecords,
      activeCases: dengueSummary.activeCases,
      locationsCovered: dengueSummary.locationsCovered,
      hotspotCount: dengueSummary.hotspotCount,
      avgTemperature: weatherSummary.avgTemperature,
      avgHumidity: weatherSummary.avgHumidity,
      totalRainfall: weatherSummary.totalRainfall,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
}

// Create new prediction
export async function createPrediction(data: {
  latitude: number;
  longitude: number;
  useModel1Only?: boolean;
  targetDate?: string;
  companyId?: string;
}): Promise<PredictionResponse> {
  const payload: EnhancedPredictionRequest & { companyId?: string } = {
    lat: Number(data.latitude),
    lon: Number(data.longitude),
    useModel1Only: data.useModel1Only,
    ...(data.targetDate ? { targetDate: data.targetDate } : {}),
    ...(data.companyId ? { companyId: data.companyId } : {})
  };
  const response = await api.post('/api/predict/public/enhanced', payload);
  return response.data;
}

// Notification API functions
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'prediction' | 'dengue_case' | 'drone' | 'drone_image' | 'location' | 'daily_prediction';
  userId?: string;
  companyId: string;
  isRead: boolean;
  metadata?: any;
  createdAt: string;
  readAt?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  limit: number;
  offset: number;
}

// Get notifications
export async function getNotifications(
  limit: number = 10,
  offset: number = 0,
  unreadOnly: boolean = false
): Promise<NotificationsResponse> {
  const response = await api.get(
    `/api/notifications?limit=${limit}&offset=${offset}&unreadOnly=${unreadOnly}`
  );
  return response.data;
}

// Get unread notification count
export async function getUnreadNotificationCount(): Promise<number> {
  const response = await api.get('/api/notifications/unread-count');
  return response.data.count;
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string): Promise<Notification> {
  const response = await api.put(`/api/notifications/${notificationId}/read`);
  return response.data;
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(): Promise<{ updated: number }> {
  const response = await api.put('/api/notifications/read-all');
  return response.data;
}

// Delete notification
export async function deleteNotification(notificationId: string): Promise<{ success: boolean }> {
  const response = await api.delete(`/api/notifications/${notificationId}`);
  return response.data;
}

// Prediction Accuracy API functions
export interface PredictionAccuracyRequest {
  latitude: number;
  longitude: number;
  date: string; // YYYY-MM-DD format
}

export interface PredictionAccuracyResponse {
  success: boolean;
  test: {
    location: {
      latitude: number;
      longitude: number;
    };
    date: string;
    toleranceRadius: string;
  };
  prediction: {
    available: boolean;
    combinedScore?: number;
    riskLevel?: string;
    model1Score?: number;
    model2Score?: number;
    isHotspot?: number;
    locationCluster?: number;
    error?: string;
  };
  actualData: {
    found: boolean;
    source: string;
    totalActiveCases: number;
    riskLevel: string;
    recordsCount: number;
    records: Array<{
      id: string;
      location: string;
      date: string;
      activeCases: number;
      totalCases: number;
      status: string;
    }>;
  };
  accuracy: {
    score: number | null;
    riskLevelMatch: boolean | null;
    interpretation: string;
  };
  comparison: {
    predicted?: {
      score: number;
      riskLevel: string;
      model1Score?: number;
      model2Score?: number;
    };
    actual?: {
      totalCases: number;
      riskLevel: string;
      recordsFound: number;
      locations: string[];
    };
    metrics?: {
      riskLevelMatch: boolean;
      scoreDifference: number | null;
      accuracyScore: number | null;
      note?: string;
    };
  };
  timestamp: string;
}

export interface DateRangeResponse {
  success: boolean;
  dateRange: {
    earliest: string | null;
    latest: string | null;
    totalRecords: number;
  };
  filtered: boolean;
}

// Test prediction accuracy (public endpoint)
export async function testPredictionAccuracy(data: PredictionAccuracyRequest): Promise<PredictionAccuracyResponse> {
  const response = await api.post('/api/prediction-accuracy/test', data);
  return response.data;
}

// Get available date range for accuracy testing (public endpoint)
export async function getAccuracyDateRange(latitude?: number, longitude?: number): Promise<DateRangeResponse> {
  let url = '/api/prediction-accuracy/date-range';
  if (latitude !== undefined && longitude !== undefined) {
    url += `?latitude=${latitude}&longitude=${longitude}`;
  }
  const response = await api.get(url);
  return response.data;
} 