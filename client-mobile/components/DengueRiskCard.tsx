import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { predictDengueRisk, checkPredictionServiceHealth } from '../utils/userApi';
import * as Location from 'expo-location';

/**
 * Helper function to get userId from JWT token stored in AsyncStorage
 */
const getUserIdFromToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) return null;

    // Decode JWT to get userId
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    const { userId } = JSON.parse(jsonPayload);
    return userId || null;
  } catch (error) {
    console.error('Error extracting userId from token:', error);
    return null;
  }
};

interface PredictionResult {
  latitude: number;
  longitude: number;
  riskScore: number;
  riskLevel: 'high' | 'medium' | 'low';
  model1Score?: number;
  model2Score?: number;
  timestamp?: string;
  cached?: boolean;
}

interface DengueRiskCardProps {
  onPredictionUpdate?: (prediction: PredictionResult | null) => void;
}

export default function DengueRiskCard({ onPredictionUpdate }: DengueRiskCardProps) {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [serviceHealthy, setServiceHealthy] = useState(true);
  const [canPredict, setCanPredict] = useState(true);
  const [timeUntilNext, setTimeUntilNext] = useState<number | null>(null);
  const [canRefresh, setCanRefresh] = useState(false);

  useEffect(() => {
    checkServiceHealth();
    getCurrentLocation();
    
    // Check if there's a stored prediction and rate limit
    const initialize = async () => {
      try {
        const storedPrediction = await AsyncStorage.getItem('lastPrediction');
        const lastPredictionTime = await AsyncStorage.getItem('lastPredictionTime');
        console.log('storedPrediction', storedPrediction);
        
        if (storedPrediction) {
          const parsed = JSON.parse(storedPrediction);
          
          // Check if prediction is more than 1 hour old
          if (parsed.timestamp) {
            const predictionTimestamp = new Date(parsed.timestamp).getTime();
            const now = Date.now();
            const oneHourInMs = 60 * 60 * 1000;
            
            if (!isNaN(predictionTimestamp) && (now - predictionTimestamp) >= oneHourInMs) {
              // Prediction is expired - delete it
              await AsyncStorage.removeItem('lastPrediction');
              await AsyncStorage.removeItem('lastPredictionTime');
              // Don't set prediction in state since it's expired
            } else {
              // Prediction is still valid - set it in state
              setPrediction(parsed);
              onPredictionUpdate?.(parsed);
              
              // If lastPredictionTime is missing but prediction has timestamp, restore it
              if (!lastPredictionTime && parsed.timestamp) {
                const predictionTimestamp = new Date(parsed.timestamp).getTime();
                // Only restore if timestamp is valid and not too old (less than 1 hour)
                if (predictionTimestamp && !isNaN(predictionTimestamp)) {
                  await AsyncStorage.setItem('lastPredictionTime', predictionTimestamp.toString());
                }
              }
            }
          } else {
            // No timestamp - set prediction anyway (for backwards compatibility)
            setPrediction(parsed);
            onPredictionUpdate?.(parsed);
          }
        }
        
        // Check rate limit after checking prediction
        await checkRateLimit();
      } catch (error) {
        console.error('Error loading stored prediction:', error);
        // If there's an error loading prediction, still check rate limit
        await checkRateLimit();
      }
    };
    initialize();
    
    // Check rate limit every minute
    const interval = setInterval(() => {
      checkRateLimit();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const checkRateLimit = async () => {
    try {
      const lastPredictionTime = await AsyncStorage.getItem('lastPredictionTime');
      console.log('lastPredictionTime', lastPredictionTime);
      const storedPrediction = await AsyncStorage.getItem('lastPrediction');
      
      // If there's no stored prediction, allow user to predict regardless of rate limit
      if (!storedPrediction) {
        // Clear any old rate limit since there's no prediction to show
        if (lastPredictionTime) {
          await AsyncStorage.removeItem('lastPredictionTime');
        }
        setCanPredict(true);
        setTimeUntilNext(null);
        setCanRefresh(false);
        return;
      }
      
      // If there's a stored prediction, check if it's more than 1 hour old
      let lastTime: number | null = null;
      let predictionTimestamp: number | null = null;
      
      // Try to get lastPredictionTime from AsyncStorage first
      if (lastPredictionTime) {
        lastTime = parseInt(lastPredictionTime, 10);
      } else {
        // Fallback: use timestamp from stored prediction if available
        try {
          const parsed = JSON.parse(storedPrediction);
          if (parsed.timestamp) {
            predictionTimestamp = new Date(parsed.timestamp).getTime();
            lastTime = predictionTimestamp;
          }
        } catch (parseError) {
          console.error('Error parsing stored prediction:', parseError);
        }
      }
      
      // Check if stored prediction timestamp is more than 1 hour old
      if (storedPrediction) {
        try {
          const parsed = JSON.parse(storedPrediction);
          if (parsed.timestamp) {
            const storedTimestamp = new Date(parsed.timestamp).getTime();
            const now = Date.now();
            const oneHourInMs = 60 * 60 * 1000;
            
            if (!isNaN(storedTimestamp) && (now - storedTimestamp) >= oneHourInMs) {
              // Prediction is more than 1 hour old - delete stored prediction and allow new prediction
              await AsyncStorage.removeItem('lastPrediction');
              await AsyncStorage.removeItem('lastPredictionTime');
              setPrediction(null);
              onPredictionUpdate?.(null);
              setCanPredict(true);
              setTimeUntilNext(null);
              setCanRefresh(false);
              return;
            } else {
              setCanRefresh(false);
            }
          }
        } catch (parseError) {
          console.error('Error parsing stored prediction:', parseError);
          setCanRefresh(false);
        }
      }
      
      // If we have a valid lastTime, check if it's within the 1 hour window
      if (lastTime && !isNaN(lastTime)) {
        const now = Date.now();
        const timeSinceLastPrediction = now - lastTime;
        const oneHourInMs = 60 * 60 * 1000; // 1 hour in milliseconds
        
        if (timeSinceLastPrediction < oneHourInMs) {
          // Still within rate limit window
          const remainingTime = oneHourInMs - timeSinceLastPrediction;
          const remainingMinutes = Math.ceil(remainingTime / (60 * 1000));
          setCanPredict(false);
          setTimeUntilNext(remainingMinutes);
          setCanRefresh(false);
        } else {
          // Rate limit expired - more than 1 hour has passed - delete stored prediction
          await AsyncStorage.removeItem('lastPrediction');
          await AsyncStorage.removeItem('lastPredictionTime');
          setPrediction(null);
          onPredictionUpdate?.(null);
          setCanPredict(true);
          setTimeUntilNext(null);
          setCanRefresh(false);
        }
      } else {
        // No valid timestamp found - allow prediction
        setCanPredict(true);
        setTimeUntilNext(null);
        setCanRefresh(false);
      }
    } catch (error) {
      console.error('Error checking rate limit:', error);
      setCanPredict(true);
      setCanRefresh(false);
    }
  };

  const checkServiceHealth = async () => {
    try {
      const health = await checkPredictionServiceHealth();
      setServiceHealthy(
        health.ml_service === 'healthy' && 
        health.redis === 'healthy' && 
        health.database === 'healthy'
      );
    } catch (error) {
      console.error('Health check failed:', error);
      setServiceHealthy(false);
    }
  };

  const getLocationName = async (latitude: number, longitude: number): Promise<string> => {
    try {
      const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
      const response = await fetch(geoUrl, {
        headers: {
          'User-Agent': 'DengueEye-Mobile/1.0',
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }
      
      const data = await response.json();
      
      // Build location name from available address components
      const address = data.address || {};
      const parts = [];
      
      if (data.name && data.name !== address.city && data.name !== address.village) {
        parts.push(data.name);
      }
      if (address.city) {
        parts.push(address.city);
      } else if (address.town) {
        parts.push(address.town);
      } else if (address.village) {
        parts.push(address.village);
      }
      if (address.state) {
        parts.push(address.state);
      }
      if (address.country) {
        parts.push(address.country);
      }
      
      return parts.length > 0 ? parts.join(', ') : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch (error) {
      console.error('Error getting location name:', error);
      // Fallback to coordinates if geocoding fails
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for dengue risk prediction');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      setLocation(locationData);
      
      // Get location name using reverse geocoding
      const name = await getLocationName(locationData.latitude, locationData.longitude);
      setLocationName(name);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Unable to get current location');
    }
  };

  const predictRisk = async () => {
    if (!location) {
      Alert.alert('Location Required', 'Please enable location services to get dengue risk prediction');
      return;
    }

    if (!serviceHealthy) {
      Alert.alert('Service Unavailable', 'Prediction service is currently unavailable. Please try again later.');
      return;
    }

    // Check if stored prediction is more than 1 hour old (allows all users to predict)
    let canPredictBasedOnTime = false;
    try {
      const storedPrediction = await AsyncStorage.getItem('lastPrediction');
      if (!storedPrediction) {
        // No stored prediction - allow prediction
        canPredictBasedOnTime = true;
      } else {
        const parsed = JSON.parse(storedPrediction);
        if (parsed.timestamp) {
          const storedTimestamp = new Date(parsed.timestamp).getTime();
          const now = Date.now();
          const oneHourInMs = 60 * 60 * 1000;
          
          if (!isNaN(storedTimestamp) && (now - storedTimestamp) >= oneHourInMs) {
            // Prediction is more than 1 hour old - allow new prediction
            canPredictBasedOnTime = true;
          }
        }
      }
    } catch (error) {
      console.error('Error checking prediction timestamp:', error);
      // On error, allow prediction
      canPredictBasedOnTime = true;
    }

    if (!canPredict && !canPredictBasedOnTime) {
      Alert.alert(
        'Rate Limit Exceeded', 
        `You can only request a prediction once per hour. Please wait ${timeUntilNext} more minute(s).`
      );
      return;
    }

    setLoading(true);
    try {
      // Get userId from token if available
      const userId = await getUserIdFromToken();
      
      // Call prediction API with userId (pass null if userId is not available)
      // Type assertion needed because predictDengueRisk is a JS function without strict types
      const result = await predictDengueRisk(
        location.latitude, 
        location.longitude, 
        (userId ? userId : null) as any
      );
      setPrediction(result);
      onPredictionUpdate?.(result);
      
      // Store prediction and time for rate limiting
      await AsyncStorage.setItem('lastPrediction', JSON.stringify(result));
      await AsyncStorage.setItem('lastPredictionTime', Date.now().toString());
      setCanPredict(false);
      setTimeUntilNext(60); // 60 minutes
    } catch (error: any) {
      Alert.alert('Prediction Failed', error.message || 'Unable to get dengue risk prediction');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return '#BF3131';
      case 'medium': return '#EAD196';
      case 'low': return '#4CAF50';
      default: return '#9CA3AF';
    }
  };

  const getRiskTextColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return '#1D4ED8';
      case 'medium': return '#1D4ED8';
      case 'low': return '#2E7D32';
      default: return '#374151';
    }
  };

  const getRiskMessage = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 'Dengue Alert! High Dengue Risk Detected Nearby! Dengue cases and breeding sites detected in your area.';
      case 'medium':
        return 'Medium Risk Detected. Stay vigilant and take preventive measures. Monitor for any dengue symptoms.';
      case 'low':
        return 'Low Risk Area. Continue practicing good hygiene and mosquito prevention measures.';
      default:
        return 'Risk assessment unavailable.';
    }
  };

  return (
    <View className="bg-white rounded-3xl p-3 mb-1 shadow-lg border" style={{ borderColor: '#F3F4F6' }}>
      {/* Header with Service Status */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-center" style={{ fontFamily: 'SF Pro', color: '#0F2854' }}>
            Dengue Risk Assessment
          </Text>
          {/* <View className="flex-row items-center">
            <View className={`w-3 h-3 rounded-full mr-2 ${serviceHealthy ? 'bg-green-500' : 'bg-red-500'}`} 
              style={{ shadowColor: serviceHealthy ? '#10B981' : '#EF4444', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 4 }} />
            <Text className="text-xs font-semibold" style={{ color: serviceHealthy ? '#10B981' : '#EF4444' }}>
              {serviceHealthy ? 'Service Online' : 'Service Offline'}
            </Text>
          </View> */}
        </View>
      </View>

      {/* Location Info with Icon */}
      {location && (
        <View className="mb-4 p-3 bg-gray-50 rounded-2xl border border-gray-100">
          <View className="flex-row items-center mb-2">
            <Feather name="map-pin" size={18} color="#4988C4" />
            <Text className="text-sm font-semibold ml-2" style={{ color: '#0F2854' }}>
              Current Location
            </Text>
          </View>
          <Text className="text-base font-extrabold leading-6" style={{ color: '#0F2854' }}>
            {locationName || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
          </Text>
        </View>
      )}

      {/* Prediction Result - Enhanced Design */}
      {prediction && (
        <View className="p-4 rounded-2xl" 
          style={{ 
            backgroundColor: getRiskColor(prediction.riskLevel) + '15',
            borderLeftWidth: 4,
            borderLeftColor: getRiskColor(prediction.riskLevel)
          }}>
          <View className="flex-row items-center mb-3">
            <View 
              className="px-4 py-2 rounded-xl"
              style={{ backgroundColor: getRiskColor(prediction.riskLevel) + '30' }}
            >
              <Text className="text-lg font-extrabold text-[#1C4D8D]" style={{ color: getRiskTextColor(prediction.riskLevel) }}>
                {prediction.riskLevel.toUpperCase()}
              </Text>
            </View>
            {prediction.riskLevel === 'high' && (
              <Feather name="alert-triangle" size={24} color="#BF3131" style={{ marginLeft: '3%' }} />
            )}
            {prediction.riskLevel === 'medium' && (
              <Feather name="info" size={24} color="#EAD196" style={{ marginLeft: '3%' }} />
            )}
            {prediction.riskLevel === 'low' && (
              <Feather name="check-circle" size={24} color="#4CAF50" style={{ marginLeft: '3%' }} />
            )}
          </View>
          
          <Text className="text-sm leading-6 mb-2" style={{ fontFamily: 'SF Pro Rounded', color: '#1C4D8D' }}>
            {getRiskMessage(prediction.riskLevel)}
          </Text>
          
          {/* Refresh button when prediction is more than 1 hour old (for all users) */}
          {canRefresh && (
            <TouchableOpacity
              onPress={predictRisk}
              disabled={loading || !location || !serviceHealthy}
              className={`mt-3 py-3 px-4 rounded-xl flex-row items-center justify-center ${
                loading || !location || !serviceHealthy
                  ? 'bg-gray-300' 
                  : 'bg-[#1C4D8D]'
              }`}
              style={{
                shadowColor: loading || !location || !serviceHealthy ? '#000' : '#1C4D8D',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Feather name="refresh-cw" size={16} color={loading || !location || !serviceHealthy ? '#6B7280' : 'white'} style={{ marginRight: 6 }} />
                  <Text className={`font-semibold text-sm ${loading || !location || !serviceHealthy ? 'text-gray-600' : 'text-white'}`}>
                    Refresh Prediction
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
          
          {/* Disclaimer Note */}
          <Text className="text-xs text-gray-500 mt-3 italic text-center">
            For informational purposes only. Not medical advice.
          </Text>
        </View>
      )}

      {/* Predict Button - Enhanced Design */}
      {!prediction && (
        <TouchableOpacity
          onPress={predictRisk}
          disabled={loading || !location || !serviceHealthy || !canPredict}
          className={`py-4 px-6 rounded-2xl ${
            loading || !location || !serviceHealthy || !canPredict
              ? 'bg-gray-300' 
              : 'bg-[#1C4D8D]'
          }`}
          style={{
            shadowColor: loading || !location || !serviceHealthy || !canPredict ? '#000' : '#1C4D8D',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          {loading ? (
            <View className="flex-row items-center justify-center">
              <ActivityIndicator color="white" size="large" />
              <Text className="text-white font-bold text-base ml-3">
                Analyzing...
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center justify-center">
              <Feather 
                name={!location ? "map-pin" : !serviceHealthy ? "alert-circle" : !canPredict && timeUntilNext ? "clock" : "activity"} 
                size={20} 
                color={loading || !location || !serviceHealthy || !canPredict ? '#6B7280' : 'white'} 
                style={{ marginRight: 8 }}
              />
              <Text className={`font-bold text-base text-center ${loading || !location || !serviceHealthy || !canPredict ? 'text-gray-600' : 'text-white'}`}>
                {!location 
                  ? 'Enable Location to Predict' 
                  : !serviceHealthy
                    ? 'Service Unavailable'
                    : !canPredict && timeUntilNext
                      ? `Wait ${timeUntilNext} min(s)`
                      : 'Get Dengue Risk Prediction'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
