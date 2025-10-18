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
  lat: number;
  lon: number;
  userId?: string;
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
    createdAt?: string;
    timestamp?: string;
    cached?: boolean;
  };
}

export interface CompanyPredictionsResponse {
  success: boolean;
  predictions: Array<{
    id: string;
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

// Public prediction (no authentication required)
export async function predictPublic(data: Omit<PredictionRequest, 'companyId'>): Promise<PredictionResponse> {
  const response = await api.post('/api/predict/public', data);
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