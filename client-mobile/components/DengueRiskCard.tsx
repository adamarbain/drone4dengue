import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
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
  const [serviceHealthy, setServiceHealthy] = useState(true);

  useEffect(() => {
    checkServiceHealth();
    getCurrentLocation();
  }, []);

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

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for dengue risk prediction');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
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

    setLoading(true);
    try {
      const result = await predictDengueRisk(location.latitude, location.longitude);
      setPrediction(result);
      onPredictionUpdate?.(result);
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
    <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
      {/* Service Status */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-bold text-black" style={{ fontFamily: 'SF Pro' }}>
          Dengue Risk Assessment
        </Text>
        <View className="flex-row items-center">
          <View className={`w-2 h-2 rounded-full mr-2 ${serviceHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
          <Text className="text-xs text-gray-600">
            {serviceHealthy ? 'Service Online' : 'Service Offline'}
          </Text>
        </View>
      </View>

      {/* Location Info */}
      {location && (
        <View className="mb-4">
          <Text className="text-sm text-gray-600 mb-1">
            Current Location
          </Text>
          <Text className="text-sm font-medium text-black">
            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </Text>
        </View>
      )}

      {/* Prediction Result */}
      {prediction && (
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-lg font-bold text-black" style={{ fontFamily: 'SF Pro' }}>
              Risk Level: {prediction.riskLevel.toUpperCase()}
            </Text>
            <View 
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: getRiskColor(prediction.riskLevel) + '20' }}
            >
              <Text 
                className="text-sm font-bold"
                style={{ color: getRiskTextColor(prediction.riskLevel) }}
              >
                {(prediction.riskScore * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
          
          <Text className="text-sm text-gray-700 mb-2" style={{ fontFamily: 'SF Pro Rounded' }}>
            {getRiskMessage(prediction.riskLevel)}
          </Text>
          
          {prediction.cached && (
            <Text className="text-xs text-gray-500">
              Cached result • Updated: {new Date(prediction.timestamp || '').toLocaleTimeString()}
            </Text>
          )}
        </View>
      )}

      {/* Predict Button */}
      <TouchableOpacity
        onPress={predictRisk}
        disabled={loading || !location || !serviceHealthy}
        className={`py-3 px-4 rounded-xl ${
          loading || !location || !serviceHealthy 
            ? 'bg-gray-300' 
            : 'bg-[#7D0A0A]'
        }`}
      >
        {loading ? (
          <View className="flex-row items-center justify-center">
            <ActivityIndicator color="white" size="small" />
            <Text className="text-white font-bold ml-2">Predicting...</Text>
          </View>
        ) : (
          <Text className="text-white font-bold text-center">
            {!location ? 'Enable Location' : 'Get Dengue Risk Prediction'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Model Scores (if available) */}
      {prediction && (prediction.model1Score || prediction.model2Score) && (
        <View className="mt-4 pt-4 border-t border-gray-200">
          <Text className="text-xs text-gray-500 mb-2">Model Scores:</Text>
          <View className="flex-row justify-between">
            {prediction.model1Score && (
              <Text className="text-xs text-gray-600">
                Historical: {(prediction.model1Score * 100).toFixed(1)}%
              </Text>
            )}
            {prediction.model2Score && (
              <Text className="text-xs text-gray-600">
                Weather: {(prediction.model2Score * 100).toFixed(1)}%
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
