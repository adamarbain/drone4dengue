import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Region } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { getNearbyDengueCases } from '../utils/userApi';
import BottomNav from './components/BottomNav';

interface PredictionResult {
  latitude: number;
  longitude: number;
  riskScore: number;
  riskLevel: 'high' | 'medium' | 'low';
  model1Score?: number;
  model2Score?: number;
  timestamp?: string;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall: number;
}

export default function RiskAnalysisPage() {
  const router = useRouter();
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showReturnButton, setShowReturnButton] = useState(false);
  const [nearbyCasesCount, setNearbyCasesCount] = useState<number | null>(null);
  const [loadingNearbyCases, setLoadingNearbyCases] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    loadPredictionData();
  }, []);

  useEffect(() => {
    if (prediction && prediction.latitude && prediction.longitude) {
      fetchNearbyCases();
      fetchWeatherData();
    }
  }, [prediction]);

  const loadPredictionData = async () => {
    try {
      const storedPrediction = await AsyncStorage.getItem('lastPrediction');
      if (storedPrediction) {
        const parsed = JSON.parse(storedPrediction);
        setPrediction(parsed);
        
        // Get location name
        if (parsed.latitude && parsed.longitude) {
          const name = await getLocationName(parsed.latitude, parsed.longitude);
          setLocationName(name);
        }
      } else {
        Alert.alert('No Prediction', 'No prediction data found. Please go back and generate a prediction first.');
        router.back();
      }
    } catch (error) {
      console.error('Error loading prediction:', error);
      Alert.alert('Error', 'Failed to load prediction data');
      router.back();
    } finally {
      setLoading(false);
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
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
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
      case 'high': return '#FFFFFF';
      case 'medium': return '#7D0A0A';
      case 'low': return '#2E7D32';
      default: return '#374151';
    }
  };

  const getHeaderBgColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return '#BF3131';
      case 'medium': return '#EAD196';
      case 'low': return '#FFFFFF';
      default: return '#FFFFFF';
    }
  };

  const getHeaderTextColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return '#FFFFFF';
      case 'medium': return '#7D0A0A';
      case 'low': return '#000000';
      default: return '#000000';
    }
  };

  // Fetch nearby dengue cases from API
  const fetchNearbyCases = async () => {
    if (!prediction || !prediction.latitude || !prediction.longitude) {
      return;
    }

    setLoadingNearbyCases(true);
    try {
      // Tolerance for 2km radius: 0.018 degrees
      // (0.045 = 5km, so 2km = 0.045 * (2/5) = 0.018)
      const result = await getNearbyDengueCases(
        prediction.latitude,
        prediction.longitude,
        0.018
      );
      // Use totalCases from the API response
      setNearbyCasesCount(result.totalCases || 0);
    } catch (error) {
      console.error('Error fetching nearby cases:', error);
      // Fallback to estimated value if API fails
      const fallbackCount = getFallbackNearbyCases(prediction.riskLevel, prediction.model1Score);
      setNearbyCasesCount(fallbackCount);
    } finally {
      setLoadingNearbyCases(false);
    }
  };

  // Fetch real-time weather data from Open-Meteo API
  const fetchWeatherData = async () => {
    if (!prediction || !prediction.latitude || !prediction.longitude) {
      return;
    }

    setLoadingWeather(true);
    try {
      const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${prediction.latitude}&longitude=${prediction.longitude}&current=temperature_2m,relative_humidity_2m,precipitation&timezone=Asia%2FSingapore&forecast_days=1`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Weather API returned status ${response.status}`);
      }

      const data = await response.json();
      
      if (data.current) {
        setWeatherData({
          temperature: data.current.temperature_2m || 0,
          humidity: data.current.relative_humidity_2m || 0,
          rainfall: data.current.precipitation || 0,
        });
      } else {
        throw new Error('Invalid weather data format');
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
      // Fallback to estimated values if API fails
      setWeatherData(null);
    } finally {
      setLoadingWeather(false);
    }
  };

  // Fallback function to estimate cases if API fails
  const getFallbackNearbyCases = (riskLevel: string, model1Score?: number): number => {
    if (riskLevel === 'high') {
      return model1Score ? Math.round(model1Score * 4) : 12;
    } else if (riskLevel === 'low') {
      return model1Score ? Math.round(model1Score) : 3;
    }
    // Medium risk
    return model1Score ? Math.round(model1Score * 2.5) : 7;
  };

  const getTemperature = (riskLevel: string, model2Score?: number): number => {
    // Use real-time weather data if available
    if (weatherData) {
      return Math.round(weatherData.temperature);
    }
    // Fallback to estimated temperature based on model2Score or default
    if (model2Score) {
      return Math.round(25 + (model2Score * 2.5));
    }
    if (riskLevel === 'high') return 30;
    if (riskLevel === 'medium') return 29;
    return 28;
  };

  const getRainfall = (riskLevel: string): number => {
    // Use real-time weather data if available
    if (weatherData) {
      return weatherData.rainfall;
    }
    // Fallback to estimated rainfall based on risk level
    if (riskLevel === 'high') return 15.5;
    if (riskLevel === 'medium') return 8.2;
    return 3.1;
  };

  const getHumidity = (riskLevel: string): number => {
    // Use real-time weather data if available
    if (weatherData) {
      return Math.round(weatherData.humidity);
    }
    // Fallback to estimated humidity based on risk level
    if (riskLevel === 'high') return 85;
    if (riskLevel === 'medium') return 75;
    return 65;
  };

  const callLocalAuthority = () => {
    // You can replace this with actual emergency number
    const phoneNumber = 'tel:+0388810600';
    Linking.canOpenURL(phoneNumber).then(supported => {
      if (supported) {
        Linking.openURL(phoneNumber);
      } else {
        Alert.alert('Error', 'Unable to make phone call');
      }
    });
  };

  const handleMapRegionChangeComplete = (region: Region) => {
    if (prediction) {
      // Check if the map center is significantly different from original location
      const latDiff = Math.abs(region.latitude - prediction.latitude);
      const lonDiff = Math.abs(region.longitude - prediction.longitude);
      const threshold = 0.002; // approximately 200 meters
      
      if (latDiff > threshold || lonDiff > threshold) {
        setShowReturnButton(true);
      } else {
        setShowReturnButton(false);
      }
    }
  };

  const returnToOriginalLocation = () => {
    if (prediction && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: prediction.latitude,
        longitude: prediction.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
      setShowReturnButton(false);
    }
  };

  if (loading || !prediction) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-600">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const riskLevel = prediction.riskLevel;
  const headerBg = getHeaderBgColor(riskLevel);
  const headerTextColor = getHeaderTextColor(riskLevel);
  const riskColor = getRiskColor(riskLevel);
  // Use API result if available, otherwise use fallback
  const nearbyCases = nearbyCasesCount !== null 
    ? nearbyCasesCount 
    : getFallbackNearbyCases(riskLevel, prediction.model1Score);
  const temperature = getTemperature(riskLevel, prediction.model2Score);
  const rainfall = getRainfall(riskLevel);
  const humidity = getHumidity(riskLevel);
  
  // Background color based on risk level
  const backgroundColor = riskLevel === 'high' ? '#BF3131' : riskLevel === 'medium' ? '#EAD196' : '#F3F4F6';

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor }}>
      {/* Header */}
      <View 
        className="flex-row items-center px-4 py-3"
        style={{ backgroundColor: headerBg }}
      >
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Feather name="arrow-left" size={24} color={headerTextColor} />
        </TouchableOpacity>
        <View className="flex-1 flex-row items-center justify-center">
          <Text 
            className="text-2xl font-extrabold"
            style={{ color: headerTextColor, fontFamily: 'SF Pro' }}
          >
            {riskLevel === 'high' ? 'High Risk' : riskLevel === 'medium' ? 'Medium Risk' : 'Low Risk'}
          </Text>
          {riskLevel === 'high' && (
            <Text style={{ fontSize: 24, marginLeft: 8 }}>🚨</Text>
          )}
          {riskLevel === 'medium' && (
            <Feather name="alert-circle" size={20} color={headerTextColor} style={{ marginLeft: 8 }} />
          )}
          {riskLevel === 'low' && (
            <Feather name="info" size={20} color="#3B82F6" style={{ marginLeft: 8 }} />
          )}
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* White Card Container */}
        <View className="bg-white mx-4 mt-4 mb-4 rounded-3xl" style={{ overflow: 'hidden' }}>
          {/* Map Section */}
          <View className="h-48 mx-4 mt-4 rounded-2xl overflow-hidden" style={{ position: 'relative' }}>
            <MapView
              ref={mapRef}
              style={{ width: '100%', height: '100%' }}
              initialRegion={{
                latitude: prediction.latitude,
                longitude: prediction.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              mapType="standard"
              showsUserLocation={true}
              showsMyLocationButton={false}
              onRegionChangeComplete={handleMapRegionChangeComplete}
            >
              <Marker
                coordinate={{
                  latitude: prediction.latitude,
                  longitude: prediction.longitude,
                }}
                pinColor={riskColor}
                title="Risk Location"
              />
            </MapView>
            
            {/* Return to Original Location Button */}
            {showReturnButton && (
              <TouchableOpacity
                onPress={returnToOriginalLocation}
                className="absolute bottom-2 right-2 bg-[#7D0A0A] rounded-full p-3 shadow-lg"
                style={{
                  shadowColor: '#7D0A0A',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Feather name="navigation" size={20} color="white" />
              </TouchableOpacity>
            )}
          </View>

          {/* Risk Details Section */}
          <View className="px-4 mt-4 pb-4">
            <Text className="text-xl font-extrabold text-black mb-3" style={{ fontFamily: 'SF Pro' }}>
              Risk Details
            </Text>
            
            {/* Location Info */}
            <View className="mb-4">
              <Text className="text-sm text-gray-600 mb-1">Current Location:</Text>
              <Text className="text-base font-semibold text-black">{locationName || `${prediction.latitude.toFixed(4)}, ${prediction.longitude.toFixed(4)}`}</Text>
            </View>

            {/* Risk Cards */}
            <View className="gap-3 mb-4">
            {/* Nearby Cases Card */}
            <TouchableOpacity
              className="rounded-2xl p-4 flex-row items-center justify-between"
              style={{ backgroundColor: riskLevel === 'high' ? '#BF3131' : riskLevel === 'low' ? '#FEF3C7' : '#EAD196' }}
              disabled={loadingNearbyCases}
            >
              <View className="flex-row items-center flex-1">
                <Feather 
                  name={riskLevel === 'high' ? 'activity' : 'alert-circle'} 
                  size={24} 
                  color={riskLevel === 'high' ? '#FFFFFF' : '#7D0A0A'} 
                />
                <Text 
                  className="ml-3 font-bold text-base"
                  style={{ color: riskLevel === 'high' ? '#FFFFFF' : '#7D0A0A' }}
                >
                  {loadingNearbyCases 
                    ? 'Loading...' 
                    : riskLevel === 'high' 
                      ? `${nearbyCases} Nearby Dengue Cases` 
                      : riskLevel === 'low' 
                        ? `${nearbyCases} Potential Dengue Cases` 
                        : `${nearbyCases} Nearby Dengue Cases`}
                </Text>
              </View>
              {/* {!loadingNearbyCases && (
                <Feather 
                  name="chevron-right" 
                  size={20} 
                  color={riskLevel === 'high' ? '#FFFFFF' : '#7D0A0A'} 
                />
              )} */}
            </TouchableOpacity>

            {/* Temperature Card */}
            <View
              className="rounded-2xl p-4 flex-row items-center justify-between"
              style={{ backgroundColor: riskLevel === 'high' ? '#BF3131' : riskLevel === 'medium' ? '#EAD196' : '#F3F4F6' }}
            >
              <View className="flex-1">
                <Text 
                  className="text-2xl font-extrabold mb-1"
                  style={{ color: riskLevel === 'high' ? '#FFFFFF' : riskLevel === 'medium' ? '#7D0A0A' : '#000000' }}
                >
                  {temperature}° C
                </Text>
                <Text 
                  className="text-sm"
                  style={{ color: riskLevel === 'high' ? '#FFFFFF' : riskLevel === 'medium' ? '#7D0A0A' : '#6B7280' }}
                >
                  {riskLevel === 'high' ? 'High dew point' : riskLevel === 'medium' ? 'Moderate Temperature' : 'Low Temperature'}
                </Text>
              </View>
              <Feather 
                name="droplet" 
                size={24} 
                color={riskLevel === 'high' ? '#FFFFFF' : riskLevel === 'medium' ? '#7D0A0A' : '#6B7280'} 
              />
            </View>

            {/* Rainfall Card */}
            <View
              className="rounded-2xl p-4 flex-row items-center justify-between"
              style={{ backgroundColor: riskLevel === 'high' ? '#BF3131' : riskLevel === 'medium' ? '#EAD196' : '#F3F4F6' }}
            >
              <View className="flex-1">
                <Text 
                  className="text-2xl font-extrabold mb-1"
                  style={{ color: riskLevel === 'high' ? '#FFFFFF' : riskLevel === 'medium' ? '#7D0A0A' : '#000000' }}
                >
                  {rainfall.toFixed(1)} mm
                </Text>
                <Text 
                  className="text-sm"
                  style={{ color: riskLevel === 'high' ? '#FFFFFF' : riskLevel === 'medium' ? '#7D0A0A' : '#6B7280' }}
                >
                  {riskLevel === 'high' ? 'High Rainfall' : riskLevel === 'medium' ? 'Moderate Rainfall' : 'Low Rainfall'}
                </Text>
              </View>
              <Feather 
                name="cloud-rain" 
                size={24} 
                color={riskLevel === 'high' ? '#FFFFFF' : riskLevel === 'medium' ? '#7D0A0A' : '#6B7280'} 
              />
            </View>

            {/* Humidity Card */}
            <View
              className="rounded-2xl p-4 flex-row items-center justify-between"
              style={{ backgroundColor: riskLevel === 'high' ? '#BF3131' : riskLevel === 'medium' ? '#EAD196' : '#F3F4F6' }}
            >
              <View className="flex-1">
                <Text 
                  className="text-2xl font-extrabold mb-1"
                  style={{ color: riskLevel === 'high' ? '#FFFFFF' : riskLevel === 'medium' ? '#7D0A0A' : '#000000' }}
                >
                  {humidity}%
                </Text>
                <Text 
                  className="text-sm"
                  style={{ color: riskLevel === 'high' ? '#FFFFFF' : riskLevel === 'medium' ? '#7D0A0A' : '#6B7280' }}
                >
                  {riskLevel === 'high' ? 'High Humidity' : riskLevel === 'medium' ? 'Moderate Humidity' : 'Low Humidity'}
                </Text>
              </View>
              <Feather 
                name="wind" 
                size={24} 
                color={riskLevel === 'high' ? '#FFFFFF' : riskLevel === 'medium' ? '#7D0A0A' : '#6B7280'} 
              />
            </View>
            </View>

            {/* Actions Section */}
            {riskLevel === 'high' || riskLevel === 'medium' ? (
              <>
                <Text className="text-xl font-extrabold text-black mb-3 mt-2" style={{ fontFamily: 'SF Pro' }}>
                  Required Actions
                </Text>
                <View className="mb-4">
                  <View className="flex-row items-start mb-3">
                    <View className="w-2 h-2 rounded-full bg-gray-400 mt-2 mr-3" />
                    <Text className="flex-1 text-base text-gray-800">Conduct Immediate Fogging</Text>
                  </View>
                  <View className="flex-row items-start mb-3">
                    <View className="w-2 h-2 rounded-full bg-gray-400 mt-2 mr-3" />
                    <Text className="flex-1 text-base text-gray-800">Clear stagnant water around home</Text>
                  </View>
                  <View className="flex-row items-start mb-3">
                    <View className="w-2 h-2 rounded-full bg-gray-400 mt-2 mr-3" />
                    <Text className="flex-1 text-base text-gray-800">Apply Mosquito repellents frequently</Text>
                  </View>
                  <View className="flex-row items-start mb-3">
                    <View className="w-2 h-2 rounded-full bg-gray-400 mt-2 mr-3" />
                    <Text className="flex-1 text-base text-gray-800">Wear long sleeve shirts and long pants</Text>
                  </View>
                </View>

                {/* Call Local Authority Button - Only for High Risk */}
                {riskLevel === 'high' && (
                  <TouchableOpacity
                    onPress={callLocalAuthority}
                    className="bg-[#BF3131] rounded-2xl py-4 px-6 mb-6 items-center justify-center"
                    style={{
                      shadowColor: '#BF3131',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 6,
                    }}
                  >
                    <Text className="text-white font-bold text-lg">Call Local Authority Now</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <Text className="text-xl font-extrabold text-black mb-3 mt-2" style={{ fontFamily: 'SF Pro' }}>
                  Preventive Measures
                </Text>
                <View className="mb-6">
                  <View className="flex-row items-start mb-3">
                    <View className="w-2 h-2 rounded-full bg-gray-400 mt-2 mr-3" />
                    <Text className="flex-1 text-base text-gray-800">Maintain cleanliness of home surroundings.</Text>
                  </View>
                  <View className="flex-row items-start mb-3">
                    <View className="w-2 h-2 rounded-full bg-gray-400 mt-2 mr-3" />
                    <Text className="flex-1 text-base text-gray-800">Encourage family and community to stay informed through official channels</Text>
                  </View>
                  <View className="flex-row items-start mb-3">
                    <View className="w-2 h-2 rounded-full bg-gray-400 mt-2 mr-3" />
                    <Text className="flex-1 text-base text-gray-800">Stay Hydrated by drinking 8L water per day.</Text>
                  </View>
                  <View className="flex-row items-start mb-3">
                    <View className="w-2 h-2 rounded-full bg-gray-400 mt-2 mr-3" />
                    <Text className="flex-1 text-base text-gray-800">Check and clean flower pots, roof gutters, and water containers weekly.</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

