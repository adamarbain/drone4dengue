import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { predictDengueRisk, checkPredictionServiceHealth } from '../utils/userApi';
import * as Location from 'expo-location';

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
  onPredictionUpdate?: (prediction: PredictionResult) => void;
}

export default function DengueRiskCard({ onPredictionUpdate }: DengueRiskCardProps) {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [serviceHealthy, setServiceHealthy] = useState(true);
  const [canPredict, setCanPredict] = useState(true);
  const [timeUntilNext, setTimeUntilNext] = useState<number | null>(null);

  useEffect(() => {
    checkServiceHealth();
    getCurrentLocation();
    
    // Check if there's a stored prediction and rate limit
    const initialize = async () => {
      try {
        const storedPrediction = await AsyncStorage.getItem('lastPrediction');
        if (storedPrediction) {
          const parsed = JSON.parse(storedPrediction);
          setPrediction(parsed);
          onPredictionUpdate?.(parsed);
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
      const storedPrediction = await AsyncStorage.getItem('lastPrediction');
      
      // If there's no stored prediction, allow user to predict regardless of rate limit
      if (!storedPrediction) {
        // Clear any old rate limit since there's no prediction to show
        if (lastPredictionTime) {
          await AsyncStorage.removeItem('lastPredictionTime');
        }
        setCanPredict(true);
        setTimeUntilNext(null);
        return;
      }
      
      // If there's a stored prediction, check rate limit
      if (lastPredictionTime) {
        const lastTime = parseInt(lastPredictionTime, 10);
        const now = Date.now();
        const timeSinceLastPrediction = now - lastTime;
        const oneHourInMs = 60 * 60 * 1000; // 1 hour in milliseconds
        
        if (timeSinceLastPrediction < oneHourInMs) {
          const remainingTime = oneHourInMs - timeSinceLastPrediction;
          const remainingMinutes = Math.ceil(remainingTime / (60 * 1000));
          setCanPredict(false);
          setTimeUntilNext(remainingMinutes);
        } else {
          // Rate limit expired - clear it
          await AsyncStorage.removeItem('lastPredictionTime');
          setCanPredict(true);
          setTimeUntilNext(null);
        }
      } else {
        setCanPredict(true);
        setTimeUntilNext(null);
      }
    } catch (error) {
      console.error('Error checking rate limit:', error);
      setCanPredict(true);
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

    if (!canPredict) {
      Alert.alert(
        'Rate Limit Exceeded', 
        `You can only request a prediction once per hour. Please wait ${timeUntilNext} more minute(s).`
      );
      return;
    }

    setLoading(true);
    try {
      const result = await predictDengueRisk(location.latitude, location.longitude);
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
      case 'high': return '#7D0A0A';
      case 'medium': return '#7D0A0A';
      case 'low': return '#2E7D32';
      default: return '#374151';
    }
  };

  const getRiskMessage = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 'Dengue Alert! High Risk Detected Nearby! Dengue cases and breeding sites detected in your area. Immediate action required!';
      case 'medium':
        return 'Medium Risk Detected. Stay vigilant and take preventive measures. Monitor for any dengue symptoms.';
      case 'low':
        return 'Low Risk Area. Continue practicing good hygiene and mosquito prevention measures.';
      default:
        return 'Risk assessment unavailable.';
    }
  };

  return (
    <View className="bg-white rounded-3xl p-3 mb-1 shadow-lg" style={{ borderWidth: 1, borderColor: '#F3F4F6' }}>
      {/* Header with Service Status */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-1">
          <Text className="text-xl font-extrabold text-black mb-1" style={{ fontFamily: 'SF Pro', fontSize: 20 }}>
            Dengue Risk Assessment
          </Text>
          <View className="flex-row items-center">
            <View className={`w-3 h-3 rounded-full mr-2 ${serviceHealthy ? 'bg-green-500' : 'bg-red-500'}`} 
              style={{ shadowColor: serviceHealthy ? '#10B981' : '#EF4444', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 4 }} />
            <Text className="text-xs font-semibold" style={{ color: serviceHealthy ? '#10B981' : '#EF4444', fontSize: 12 }}>
              {serviceHealthy ? 'Service Online' : 'Service Offline'}
            </Text>
          </View>
        </View>
      </View>

      {/* Location Info with Icon */}
      {location && (
        <View className="mb-4 p-3 bg-gray-50 rounded-2xl border border-gray-100">
          <View className="flex-row items-center mb-2">
            <Feather name="map-pin" size={18} color="#7D0A0A" />
            <Text className="text-sm font-semibold text-gray-700 ml-2" style={{ fontSize: 14 }}>
              Current Location
            </Text>
          </View>
          <Text className="text-base font-extrabold text-black" style={{ fontSize: 16, lineHeight: 22 }}>
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
              <Text className="text-lg font-extrabold" style={{ color: getRiskTextColor(prediction.riskLevel), fontSize: 18 }}>
                {prediction.riskLevel.toUpperCase()}
              </Text>
            </View>
            {prediction.riskLevel === 'high' && (
              <Feather name="alert-triangle" size={24} color="#BF3131" style={{ marginLeft: 12 }} />
            )}
            {prediction.riskLevel === 'medium' && (
              <Feather name="info" size={24} color="#EAD196" style={{ marginLeft: 12 }} />
            )}
            {prediction.riskLevel === 'low' && (
              <Feather name="check-circle" size={24} color="#4CAF50" style={{ marginLeft: 12 }} />
            )}
          </View>
          
          <Text className="text-sm text-gray-800 leading-6 mb-2" style={{ fontFamily: 'SF Pro Rounded', fontSize: 14, lineHeight: 20 }}>
            {getRiskMessage(prediction.riskLevel)}
          </Text>
          
          {/* {prediction.cached && (
            <View className="flex-row items-center mt-2">
              <Feather name="refresh-cw" size={14} color="#6B7280" />
              <Text className="text-xs text-gray-500 ml-2" style={{ fontSize: 12 }}>
                Cached result • Updated: {new Date(prediction.timestamp || '').toLocaleTimeString()}
              </Text>
            </View>
          )} */}
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
              : 'bg-[#7D0A0A]'
          }`}
          style={{
            shadowColor: loading || !location || !serviceHealthy || !canPredict ? '#000' : '#7D0A0A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          {loading ? (
            <View className="flex-row items-center justify-center">
              <ActivityIndicator color="white" size="large" />
              <Text className="text-white font-bold text-base ml-3" style={{ fontSize: 16 }}>
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
              <Text className={`font-bold text-base text-center ${loading || !location || !serviceHealthy || !canPredict ? 'text-gray-600' : 'text-white'}`} style={{ fontSize: 16 }}>
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
