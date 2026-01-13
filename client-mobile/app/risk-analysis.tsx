import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Region } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { getNearbyDengueCases } from '../utils/userApi';
import BottomNav from './components/BottomNav';
import { isTablet, getHorizontalPadding, getMapHeight } from '../utils/responsive';
import FullScreenLoader from '../components/FullScreenLoader';
import { useMinimumLoadingTime } from '../utils/useMinimumLoadingTime';

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
  const { prediction: predictionParam } = useLocalSearchParams<{ prediction?: string | string[] }>();
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  // const showLoader = useMinimumLoadingTime(loading || !prediction, 2000);
  const [showReturnButton, setShowReturnButton] = useState(false);
  const [nearbyCasesCount, setNearbyCasesCount] = useState<number | null>(null);
  const [nearbyCasesData, setNearbyCasesData] = useState<Array<{latitude: number; longitude: number; location: string; state: string; totalCases: number}>>([]);
  const [loadingNearbyCases, setLoadingNearbyCases] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    const initialize = async () => {
      // If prediction is passed via navigation params, prefer that
      if (predictionParam) {
        try {
          const paramValue = Array.isArray(predictionParam) ? predictionParam[0] : predictionParam;
          if (paramValue) {
            const parsed = JSON.parse(paramValue);
            setPrediction(parsed);

            // Get location name for the passed prediction
            if (parsed.latitude && parsed.longitude) {
              const name = await getLocationName(parsed.latitude, parsed.longitude);
              setLocationName(name);
            }

            // Sync to AsyncStorage so subsequent visits can still use it
            await AsyncStorage.setItem('lastPrediction', JSON.stringify(parsed));

            setLoading(false);
            return;
          }
        } catch (error) {
          console.warn('Failed to parse prediction from navigation params, falling back to stored prediction', error);
        }
      }

      // Fallback: load from AsyncStorage as before
      await loadPredictionData();
    };

    initialize();
  }, [predictionParam]);

  useEffect(() => {
    if (prediction && prediction.latitude && prediction.longitude) {
      fetchNearbyCases();
      fetchWeatherData();
    }
  }, [prediction]);

  // Fit map to show all markers when nearby cases data is loaded
  useEffect(() => {
    if (prediction && nearbyCasesData.length > 0 && mapRef.current) {
      fitMapToAllMarkers();
    }
  }, [nearbyCasesData, prediction]);

  // Call returnToOriginalLocation when user arrives at the page (after data is loaded)
  useEffect(() => {
    if (prediction && mapRef.current && !loadingNearbyCases) {
      // Small delay to ensure map is fully rendered before fitting to markers
      const timer = setTimeout(() => {
        returnToOriginalLocation();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [prediction, loadingNearbyCases]);

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
      // Store the full data array for map markers
      setNearbyCasesData(result.data || []);
    } catch (error) {
      console.error('Error fetching nearby cases:', error);
      // Fallback to estimated value if API fails
      const fallbackCount = getFallbackNearbyCases(prediction.riskLevel, prediction.model1Score);
      setNearbyCasesCount(fallbackCount);
      setNearbyCasesData([]); // Clear data on error
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

  // Helper functions to determine color level based on actual values
  const getTemperatureLevel = (temp: number): 'high' | 'medium' | 'low' => {
    if (temp >= 30) return 'high';
    if (temp >= 25) return 'medium';
    return 'low';
  };

  const getRainfallLevel = (rain: number): 'high' | 'medium' | 'low' => {
    if (rain >= 10) return 'high';
    if (rain >= 5) return 'medium';
    return 'low';
  };

  const getHumidityLevel = (hum: number): 'high' | 'medium' | 'low' => {
    if (hum >= 80) return 'high';
    if (hum >= 60) return 'medium';
    return 'low';
  };

  // Get card colors based on value level
  const getCardBackgroundColor = (level: 'high' | 'medium' | 'low'): string => {
    if (level === 'high') return '#BF3131';
    if (level === 'medium') return '#EAD196';
    return '#F3F4F6';
  };

  const getCardTextColor = (level: 'high' | 'medium' | 'low'): string => {
    if (level === 'high') return '#FFFFFF';
    if (level === 'medium') return '#7D0A0A';
    return '#000000';
  };

  const getCardSecondaryTextColor = (level: 'high' | 'medium' | 'low'): string => {
    if (level === 'high') return '#FFFFFF';
    if (level === 'medium') return '#7D0A0A';
    return '#6B7280';
  };

  const getCardIconColor = (level: 'high' | 'medium' | 'low'): string => {
    if (level === 'high') return '#FFFFFF';
    if (level === 'medium') return '#7D0A0A';
    return '#6B7280';
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

  // Calculate region that fits all markers (prediction location + all nearby cases)
  const fitMapToAllMarkers = () => {
    if (!prediction || !mapRef.current) return;

    // Collect all coordinates
    const coordinates = [
      { latitude: prediction.latitude, longitude: prediction.longitude },
      ...nearbyCasesData.map(caseData => ({
        latitude: caseData.latitude,
        longitude: caseData.longitude,
      })),
    ];

    if (coordinates.length === 0) return;

    // Calculate min/max latitude and longitude
    const latitudes = coordinates.map(coord => coord.latitude);
    const longitudes = coordinates.map(coord => coord.longitude);
    
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLon = Math.min(...longitudes);
    const maxLon = Math.max(...longitudes);

    // Calculate center
    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;

    // Calculate deltas with padding (add 20% padding on each side)
    const latDelta = (maxLat - minLat) * 1.4; // 1.4 = 1.0 + 0.2 padding on each side
    const lonDelta = (maxLon - minLon) * 1.4;

    // Ensure minimum delta for better visibility
    const minDelta = 0.005;
    const finalLatDelta = Math.max(latDelta, minDelta);
    const finalLonDelta = Math.max(lonDelta, minDelta);

    // Animate to the new region
    mapRef.current.animateToRegion({
      latitude: centerLat,
      longitude: centerLon,
      latitudeDelta: finalLatDelta,
      longitudeDelta: finalLonDelta,
    }, 500);
  };

  const returnToOriginalLocation = () => {
    if (prediction && mapRef.current) {
      // If there are nearby cases, fit to all markers, otherwise just show prediction location
      if (nearbyCasesData.length > 0) {
        fitMapToAllMarkers();
      } else {
        mapRef.current.animateToRegion({
          latitude: prediction.latitude,
          longitude: prediction.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 500);
      }
      setShowReturnButton(false);
    }
  };

  // if (showLoader) {
  //   return (
  //     <FullScreenLoader
  //       title="Loading risk analysis..."
  //       subtitle="Preparing detailed dengue risk information and nearby case data"
  //     />
  //   );
  // }

  if (!prediction) {
    return (
      <FullScreenLoader
        title="Loading risk analysis..."
        subtitle="Preparing detailed dengue risk information and nearby case data"
      />
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
  
  // Calculate levels based on actual values
  const temperatureLevel = getTemperatureLevel(temperature);
  const rainfallLevel = getRainfallLevel(rainfall);
  const humidityLevel = getHumidityLevel(humidity);
  
  // Background color based on risk level
  const backgroundColor = riskLevel === 'high' ? '#BF3131' : riskLevel === 'medium' ? '#EAD196' : '#F3F4F6';
  const tablet = isTablet();

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor }}>
      {/* Header */}
      <View 
        className="flex-row items-center"
        style={{ 
          backgroundColor: headerBg, 
          paddingHorizontal: tablet ? 24 : 16, 
          paddingVertical: tablet ? 16 : 12,
          maxWidth: tablet ? 800 : undefined,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Feather name="arrow-left" size={tablet ? 28 : 24} color={headerTextColor} />
        </TouchableOpacity>
        <View className="flex-1 flex-row items-center justify-center">
          <Text 
            className="font-extrabold"
            style={{ color: headerTextColor, fontFamily: 'SF Pro', fontSize: tablet ? 28 : 24 }}
          >
            {riskLevel === 'high' ? 'High Risk' : riskLevel === 'medium' ? 'Medium Risk' : 'Low Risk'}
          </Text>
          {riskLevel === 'high' && (
            <Text style={{ fontSize: tablet ? 28 : 24, marginLeft: 8 }}>🚨</Text>
          )}
          {riskLevel === 'medium' && (
            <Feather name="alert-circle" size={tablet ? 24 : 20} color={headerTextColor} style={{ marginLeft: 8 }} />
          )}
          {riskLevel === 'low' && (
            <Feather name="info" size={tablet ? 24 : 20} color="#3B82F6" style={{ marginLeft: 8 }} />
          )}
        </View>
        <View style={{ width: tablet ? 40 : 32 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        className="flex-1"
        contentContainerStyle={{ 
          paddingBottom: 100,
          alignItems: tablet ? 'center' : undefined,
        }}
      >
        {/* White Card Container */}
        <View 
          className="bg-white rounded-3xl" 
          style={{ 
            overflow: 'hidden',
            marginHorizontal: tablet ? 0 : 16,
            marginTop: 16,
            marginBottom: 16,
            maxWidth: tablet ? 700 : undefined,
            width: tablet ? '100%' : undefined,
          }}
        >
          {/* Risk Details Title - Above Map */}
          <View style={{ paddingHorizontal: tablet ? 24 : 16, paddingTop: tablet ? 24 : 16 }}>
            <Text 
              className="font-extrabold text-black mb-3" 
              style={{ fontFamily: 'SF Pro', fontSize: tablet ? 24 : 20 }}
            >
              Risk Details
            </Text>
          </View>

          {/* Map Section */}
          <View 
            className="rounded-2xl overflow-hidden" 
            style={{ 
              position: 'relative',
              marginHorizontal: tablet ? 24 : 16,
              height: getMapHeight(),
            }}
          >
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
              zoomEnabled={true}
              zoomControlEnabled={true}
              scrollEnabled={true}
              pitchEnabled={true}
              rotateEnabled={true}
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
              {/* Markers for nearby dengue cases */}
              {nearbyCasesData.map((caseData, index) => (
                <Marker
                  key={`dengue-case-${index}`}
                  coordinate={{
                    latitude: caseData.latitude,
                    longitude: caseData.longitude,
                  }}
                  pinColor="#BF3131"
                  title={caseData.location || 'Dengue Case'}
                  description={`${caseData.totalCases} case${caseData.totalCases !== 1 ? 's' : ''} - ${caseData.state || ''}`}
                />
              ))}
            </MapView>
            
            {/* Floating Nearby Cases Card */}
            <View
              className="absolute bottom-3 left-3 right-3 rounded-2xl flex-row items-center justify-between"
              style={{ 
                backgroundColor: riskLevel === 'high' ? '#BF3131' : riskLevel === 'low' ? '#FEF3C7' : '#EAD196',
                padding: tablet ? 20 : 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <View className="flex-row items-center flex-1">
                <Feather 
                  name={riskLevel === 'high' ? 'activity' : 'alert-circle'} 
                  size={tablet ? 28 : 24} 
                  color={riskLevel === 'high' ? '#FFFFFF' : '#7D0A0A'} 
                />
                <Text 
                  className="ml-3 font-bold"
                  style={{ color: riskLevel === 'high' ? '#FFFFFF' : '#7D0A0A', fontSize: tablet ? 18 : 16 }}
                >
                  {loadingNearbyCases 
                    ? 'Loading...' 
                    : nearbyCases === 0
                      ? 'No Nearby Dengue Cases'
                      : riskLevel === 'high'
                        ? `${nearbyCases} Nearby Dengue Cases` 
                        : riskLevel === 'low' 
                          ? `${nearbyCases} Potential Dengue Cases` 
                          : `${nearbyCases} Nearby Dengue Cases`}
                </Text>
              </View>
            </View>
            
            {/* Return to Original Location Button */}
            {showReturnButton && (
              <TouchableOpacity
                onPress={returnToOriginalLocation}
                className="absolute top-3 left-3 bg-[#7D0A0A] rounded-full shadow-lg"
                style={{
                  padding: tablet ? 16 : 12,
                  shadowColor: '#7D0A0A',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Feather name="navigation" size={tablet ? 24 : 20} color="white" />
              </TouchableOpacity>
            )}
          </View>

          {/* Risk Details Section */}
          <View style={{ paddingHorizontal: tablet ? 24 : 16, marginTop: 16, paddingBottom: 16 }}>
            {/* Location Info */}
            {/* <View className="mb-4">
              <Text className="text-sm text-gray-600 mb-1">Current Location:</Text>
              <Text className="text-base font-semibold text-black">{locationName || `${prediction.latitude.toFixed(4)}, ${prediction.longitude.toFixed(4)}`}</Text>
            </View> */}

            {/* Risk Cards */}
            <View className="gap-3 mb-4">

            {/* Temperature Card */}
            <View
              className="rounded-2xl flex-row items-center justify-between"
              style={{ backgroundColor: getCardBackgroundColor(temperatureLevel), padding: tablet ? 20 : 16 }}
            >
              <View className="flex-1">
                <Text 
                  className="font-extrabold mb-1"
                  style={{ color: getCardTextColor(temperatureLevel), fontSize: tablet ? 28 : 24 }}
                >
                  {temperature}° C
                </Text>
                <Text 
                  style={{ color: getCardSecondaryTextColor(temperatureLevel), fontSize: tablet ? 16 : 14 }}
                >
                  {temperatureLevel === 'high' ? 'High Temperature' : temperatureLevel === 'medium' ? 'Moderate Temperature' : 'Low Temperature'}
                </Text>
              </View>
              <Feather 
                name="droplet" 
                size={tablet ? 28 : 24} 
                color={getCardIconColor(temperatureLevel)} 
              />
            </View>

            {/* Rainfall Card */}
            <View
              className="rounded-2xl flex-row items-center justify-between"
              style={{ backgroundColor: getCardBackgroundColor(rainfallLevel), padding: tablet ? 20 : 16 }}
            >
              <View className="flex-1">
                <Text 
                  className="font-extrabold mb-1"
                  style={{ color: getCardTextColor(rainfallLevel), fontSize: tablet ? 28 : 24 }}
                >
                  {rainfall.toFixed(1)} mm
                </Text>
                <Text 
                  style={{ color: getCardSecondaryTextColor(rainfallLevel), fontSize: tablet ? 16 : 14 }}
                >
                  {rainfallLevel === 'high' ? 'High Rainfall' : rainfallLevel === 'medium' ? 'Moderate Rainfall' : 'Low Rainfall'}
                </Text>
              </View>
              <Feather 
                name="cloud-rain" 
                size={tablet ? 28 : 24} 
                color={getCardIconColor(rainfallLevel)} 
              />
            </View>

            {/* Humidity Card */}
            <View
              className="rounded-2xl flex-row items-center justify-between"
              style={{ backgroundColor: getCardBackgroundColor(humidityLevel), padding: tablet ? 20 : 16 }}
            >
              <View className="flex-1">
                <Text 
                  className="font-extrabold mb-1"
                  style={{ color: getCardTextColor(humidityLevel), fontSize: tablet ? 28 : 24 }}
                >
                  {humidity}%
                </Text>
                <Text 
                  style={{ color: getCardSecondaryTextColor(humidityLevel), fontSize: tablet ? 16 : 14 }}
                >
                  {humidityLevel === 'high' ? 'High Humidity' : humidityLevel === 'medium' ? 'Moderate Humidity' : 'Low Humidity'}
                </Text>
              </View>
              <Feather 
                name="wind" 
                size={tablet ? 28 : 24} 
                color={getCardIconColor(humidityLevel)} 
              />
            </View>
            </View>

            {/* Actions Section */}
            {riskLevel === 'high' ? (
              <>
                <Text 
                  className="font-extrabold text-black mb-3 mt-2" 
                  style={{ fontFamily: 'SF Pro', fontSize: tablet ? 24 : 20 }}
                >
                  Required Actions
                </Text>
                <View className="mb-4">
                  <View className="flex-row items-start mb-3">
                    <View className="w-2 h-2 rounded-full bg-gray-400 mt-2 mr-3" />
                    <Text className="flex-1 text-gray-800" style={{ fontSize: tablet ? 18 : 16 }}>Conduct Immediate Fogging</Text>
                  </View>
                  <View className="flex-row items-start mb-3">
                    <View className="w-2 h-2 rounded-full bg-gray-400 mt-2 mr-3" />
                    <Text className="flex-1 text-gray-800" style={{ fontSize: tablet ? 18 : 16 }}>Clear stagnant water around home</Text>
                  </View>
                  <View className="flex-row items-start mb-3">
                    <View className="w-2 h-2 rounded-full bg-gray-400 mt-2 mr-3" />
                    <Text className="flex-1 text-gray-800" style={{ fontSize: tablet ? 18 : 16 }}>Apply Mosquito repellents frequently</Text>
                  </View>
                  <View className="flex-row items-start mb-3">
                    <View className="w-2 h-2 rounded-full bg-gray-400 mt-2 mr-3" />
                    <Text className="flex-1 text-gray-800" style={{ fontSize: tablet ? 18 : 16 }}>Wear long sleeve shirts and long pants</Text>
                  </View>
                </View>

                {/* Call Local Authority Button - Only for High Risk */}
                <TouchableOpacity
                  onPress={callLocalAuthority}
                  className="bg-[#BF3131] rounded-2xl items-center justify-center"
                  style={{
                    paddingVertical: tablet ? 20 : 16,
                    paddingHorizontal: tablet ? 32 : 24,
                    marginBottom: 24,
                    shadowColor: '#BF3131',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  <Text className="text-white font-bold" style={{ fontSize: tablet ? 20 : 18 }}>Call Local Authority Now</Text>
                </TouchableOpacity>
              </>
            ) : riskLevel === 'medium' ? (
              <>
                <Text 
                  className="font-extrabold text-black mb-3 mt-2" 
                  style={{ fontFamily: 'SF Pro', fontSize: tablet ? 24 : 20 }}
                >
                  Recommended Actions
                </Text>
                <View className="mb-4">
                  <View className="flex-row items-start mb-3">
                    <View className="w-2 h-2 rounded-full bg-gray-400 mt-2 mr-3" />
                    <Text className="flex-1 text-gray-800" style={{ fontSize: tablet ? 18 : 16 }}>Regularly check and remove standing water</Text>
                  </View>
                  <View className="flex-row items-start mb-3">
                    <View className="w-2 h-2 rounded-full bg-gray-400 mt-2 mr-3" />
                    <Text className="flex-1 text-gray-800" style={{ fontSize: tablet ? 18 : 16 }}>Use mosquito nets while sleeping</Text>
                  </View>
                  <View className="flex-row items-start mb-3">
                    <View className="w-2 h-2 rounded-full bg-gray-400 mt-2 mr-3" />
                    <Text className="flex-1 text-gray-800" style={{ fontSize: tablet ? 18 : 16 }}>Apply mosquito repellent when outdoors</Text>
                  </View>
                  <View className="flex-row items-start mb-3">
                    <View className="w-2 h-2 rounded-full bg-gray-400 mt-2 mr-3" />
                    <Text className="flex-1 text-gray-800" style={{ fontSize: tablet ? 18 : 16 }}>Keep windows and doors closed during peak hours</Text>
                  </View>
                  <View className="flex-row items-start mb-3">
                    <View className="w-2 h-2 rounded-full bg-gray-400 mt-2 mr-3" />
                    <Text className="flex-1 text-gray-800" style={{ fontSize: tablet ? 18 : 16 }}>Maintain clean surroundings and proper drainage</Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <Text 
                  className="font-extrabold text-black mb-3 mt-2" 
                  style={{ fontFamily: 'SF Pro', fontSize: tablet ? 24 : 20 }}
                >
                  Preventive Measures
                </Text>
                <View className="mb-6">
                  <View className="flex-row items-start mb-3">
                    <View className="w-2 h-2 rounded-full bg-gray-400 mt-2 mr-3" />
                    <Text className="flex-1 text-gray-800" style={{ fontSize: tablet ? 18 : 16 }}>Maintain cleanliness of home surroundings.</Text>
                  </View>
                  <View className="flex-row items-start mb-3">
                    <View className="w-2 h-2 rounded-full bg-gray-400 mt-2 mr-3" />
                    <Text className="flex-1 text-gray-800" style={{ fontSize: tablet ? 18 : 16 }}>Encourage family and community to stay informed through official channels</Text>
                  </View>
                  <View className="flex-row items-start mb-3">
                    <View className="w-2 h-2 rounded-full bg-gray-400 mt-2 mr-3" />
                    <Text className="flex-1 text-gray-800" style={{ fontSize: tablet ? 18 : 16 }}>Stay Hydrated by drinking 8L water per day.</Text>
                  </View>
                  <View className="flex-row items-start mb-3">
                    <View className="w-2 h-2 rounded-full bg-gray-400 mt-2 mr-3" />
                    <Text className="flex-1 text-gray-800" style={{ fontSize: tablet ? 18 : 16 }}>Check and clean flower pots, roof gutters, and water containers weekly.</Text>
                  </View>
                </View>
              </>
            )}

            {/* Data Sources Section */}
            <View className="mt-4 pt-4 border-t border-gray-200">
              <Text className="font-semibold text-gray-700 mb-2" style={{ fontSize: tablet ? 16 : 14 }}>Data Sources & References</Text>
              <View className="flex-row flex-wrap">
                <TouchableOpacity 
                  onPress={() => Linking.openURL('https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue')}
                  className="bg-blue-50 rounded-lg mr-2 mb-2 flex-row items-center"
                  style={{ paddingHorizontal: tablet ? 12 : 8, paddingVertical: tablet ? 8 : 4 }}
                >
                  <Text className="text-blue-700" style={{ fontSize: tablet ? 14 : 12 }}>WHO</Text>
                  <Feather name="external-link" size={tablet ? 14 : 10} color="#1D4ED8" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => Linking.openURL('https://idengue.mysa.gov.my/')}
                  className="bg-green-50 rounded-lg mr-2 mb-2 flex-row items-center"
                  style={{ paddingHorizontal: tablet ? 12 : 8, paddingVertical: tablet ? 8 : 4 }}
                >
                  <Text className="text-green-700" style={{ fontSize: tablet ? 14 : 12 }}>iDengue (KKM)</Text>
                  <Feather name="external-link" size={tablet ? 14 : 10} color="#15803D" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => Linking.openURL('https://www.cdc.gov/dengue/')}
                  className="bg-red-50 rounded-lg mr-2 mb-2 flex-row items-center"
                  style={{ paddingHorizontal: tablet ? 12 : 8, paddingVertical: tablet ? 8 : 4 }}
                >
                  <Text className="text-red-700" style={{ fontSize: tablet ? 14 : 12 }}>CDC</Text>
                  <Feather name="external-link" size={tablet ? 14 : 10} color="#B91C1C" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => Linking.openURL('https://open-meteo.com/')}
                  className="bg-amber-50 rounded-lg mb-2 flex-row items-center"
                  style={{ paddingHorizontal: tablet ? 12 : 8, paddingVertical: tablet ? 8 : 4 }}
                >
                  <Text className="text-amber-700" style={{ fontSize: tablet ? 14 : 12 }}>Open-Meteo</Text>
                  <Feather name="external-link" size={tablet ? 14 : 10} color="#B45309" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
              <Text className="text-gray-500 mt-2 italic" style={{ fontSize: tablet ? 14 : 12 }}>
                Predictions are for informational purposes only. Consult healthcare professionals for medical advice.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

