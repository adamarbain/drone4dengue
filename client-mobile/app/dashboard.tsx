import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Region } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import BottomNav from './components/BottomNav';
import DengueRiskCard from '../components/DengueRiskCard';
import { fetchCurrentUser, getCompanyLocations, getCompanyPredictions, getCompanySettings } from '../utils/userApi';

interface CompanyLocation {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
}

interface CompanyPrediction {
  id: string;
  companyLocationId: string | null;
  companyLocation: CompanyLocation | null;
  latitude: number;
  longitude: number;
  riskScore: number;
  riskLevel: 'high' | 'medium' | 'low';
  model1Score?: number;
  model2Score?: number;
  model3Score?: number;
  createdAt: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'current' | 'organisation'>('current');
  const [hasCompany, setHasCompany] = useState<boolean | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [hasPrediction, setHasPrediction] = useState(false);
  const [showLocationButton, setShowLocationButton] = useState(false);
  const mapRef = useRef<MapView>(null);
  
  // Organisation tab states
  const [companyLocations, setCompanyLocations] = useState<CompanyLocation[]>([]);
  const [companyPredictions, setCompanyPredictions] = useState<CompanyPrediction[]>([]);
  const [loadingOrganisation, setLoadingOrganisation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<CompanyLocation | null>(null);
  const [selectedPrediction, setSelectedPrediction] = useState<CompanyPrediction | null>(null);
  const orgMapRef = useRef<MapView>(null);
  
  // Risk threshold settings
  const [riskThresholds, setRiskThresholds] = useState({ lowThreshold: 1.0, highThreshold: 3.0 });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const user = await fetchCurrentUser();
        if (isMounted) {
          // If companyId is 'comp-999', treated as NO company
          if (user?.companyId === 'comp-999') {
            setHasCompany(false);
            setCompanyId(user?.companyId || null); // Still store the companyId, but indicate "no company"
          } else {
            setHasCompany(Boolean(user?.companyId));
            const cId = user?.companyId || null;
            setCompanyId(cId);
            
            // Fetch company settings for risk thresholds
            if (cId) {
              try {
                const companySettings = await getCompanySettings(cId);
                if (isMounted && companySettings?.predictionModelParameters) {
                  const params = companySettings.predictionModelParameters;
                  setRiskThresholds({
                    lowThreshold: params.lowThreshold || 1.0,
                    highThreshold: params.highThreshold || 3.0
                  });
                }
              } catch (err) {
                console.warn('Failed to fetch company settings, using defaults:', err);
              }
            }
          }
        }
      } catch (e) {
        if (isMounted) {
          setHasCompany(false);
          setCompanyId(null);
        }
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Fetch organisation data when switching to organisation tab
  useEffect(() => {
    if (activeTab === 'organisation' && companyId) {
      fetchOrganisationData();
    }
  }, [activeTab, companyId]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLocationLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) {
            setLocationLoading(false);
            // Don't show alert, just silently fail - user can still use the app
            console.warn('Location permission denied');
          }
          return;
        }

        // Try to get last known location first (faster)
        const lastLocation = await Location.getLastKnownPositionAsync({});
        if (lastLocation && isMounted) {
          setLocation({
            latitude: lastLocation.coords.latitude,
            longitude: lastLocation.coords.longitude,
          });
          setLocationLoading(false);
        }

        // Then get fresh location
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (isMounted) {
          setLocation({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          });
          setLocationLoading(false);
        }
      } catch (error) {
        console.error('Error getting location:', error);
        if (isMounted) {
          // Show Alert
          Alert.alert('Error', 'Failed to get location');
          setLocationLoading(false);
        }
      }
    })();
    return () => { isMounted = false; };
  }, []);
  const handlePredictionUpdate = (prediction: any) => {
    setHasPrediction(prediction !== null);
  };

  const fetchOrganisationData = async () => {
    if (!companyId) return;
    
    setLoadingOrganisation(true);
    try {
      // Fetch locations and predictions in parallel
      const [locations, predictions] = await Promise.all([
        getCompanyLocations(companyId),
        getCompanyPredictions(companyId)
      ]);
      
      setCompanyLocations(locations);
      setCompanyPredictions(predictions);
      
      // Fit map to show all locations if available
      if (locations.length > 0 && locations.some((loc: CompanyLocation) => loc.latitude && loc.longitude)) {
        const validLocations = locations.filter((loc: CompanyLocation) => loc.latitude && loc.longitude);
        if (validLocations.length > 0 && orgMapRef.current) {
          const lats = validLocations.map((loc: CompanyLocation) => loc.latitude!);
          const lons = validLocations.map((loc: CompanyLocation) => loc.longitude!);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLon = Math.min(...lons);
          const maxLon = Math.max(...lons);
          
          const latDelta = (maxLat - minLat) * 1.5 || 0.01;
          const lonDelta = (maxLon - minLon) * 1.5 || 0.01;
          
          setTimeout(() => {
            orgMapRef.current?.fitToCoordinates(
              validLocations.map((loc: CompanyLocation) => ({
                latitude: loc.latitude!,
                longitude: loc.longitude!,
              })),
              {
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                animated: true,
              }
            );
          }, 100);
        }
      }
    } catch (error: any) {
      console.error('Error fetching organisation data:', error);
      Alert.alert('Error', error.message || 'Failed to load organisation data');
    } finally {
      setLoadingOrganisation(false);
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

  const getRiskLevel = (riskScore: number): 'high' | 'medium' | 'low' => {
    if (riskScore >= riskThresholds.highThreshold) return 'high';
    if (riskScore >= riskThresholds.lowThreshold) return 'medium';
    return 'low';
  };

  const getScoreRiskLevel = (score: number): 'high' | 'medium' | 'low' => {
    if (score >= riskThresholds.highThreshold) return 'high';
    if (score >= riskThresholds.lowThreshold) return 'medium';
    return 'low';
  };

  const handleLocationMarkerPress = (location: CompanyLocation) => {
    setSelectedLocation(location);
    // Find prediction for this location
    const prediction = companyPredictions.find(
      p => p.companyLocationId === location.id
    );
    setSelectedPrediction(prediction || null);
    
    // Center map on location
    if (location.latitude && location.longitude && orgMapRef.current) {
      orgMapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  };

  const handleMapRegionChangeComplete = (region: Region) => {
    if (location) {
      // Check if the map center is significantly different from user location
      const latDiff = Math.abs(region.latitude - location.latitude);
      const lonDiff = Math.abs(region.longitude - location.longitude);
      const threshold = 0.002; // approximately 200 meters
      
      if (latDiff > threshold || lonDiff > threshold) {
        setShowLocationButton(true);
      } else {
        setShowLocationButton(false);
      }
    }
  };

  const returnToCurrentLocation = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
      setShowLocationButton(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-4 pt-2 pb-20">
        {/* Title */}
        <Text className="text-4xl font-extrabold text-black mb-4" style={{ fontFamily: 'SF Pro' }}>
          Dashboard
        </Text>
        {/* Tabs: Only show when user has a companyId; show Current and Organisation only */}
        {hasCompany ? (
          <View className="flex-row mb-6 rounded-lg overflow-hidden border border-gray-200">
            <TouchableOpacity 
              className={`flex-1 py-3 ${activeTab === 'current' ? 'bg-[#1D4ED8]' : 'bg-[#ead196]'}`}
              onPress={() => setActiveTab('current')}
            >
              <Text className={`text-center font-bold text-base ${activeTab === 'current' ? 'text-white' : 'text-white'}`}>
                Current
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className={`flex-1 py-3 ${activeTab === 'organisation' ? 'bg-[#1D4ED8]' : 'bg-[#ead196]'}`}
              onPress={() => setActiveTab('organisation')}
            >
              <Text className={`text-center font-bold text-base ${activeTab === 'organisation' ? 'text-white' : 'text-white'}`}>
                Organisation
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {/* Current Tab Content */}
        {activeTab === 'current' && (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {/* Map */}
            <View
              className="rounded-2xl overflow-hidden mb-2 w-full"
              style={{ aspectRatio: 16 / 8 }}
            >
              {locationLoading ? (
                <View className="w-full h-full bg-gray-200 items-center justify-center">
                  <ActivityIndicator size="large" color="#1D4ED8" />
                  <Text className="text-gray-600 mt-2 text-sm">Loading map...</Text>
                </View>
              ) : location ? (
                <>
                  <MapView
                    ref={mapRef}
                    style={{ width: '100%', height: '100%' }}
                    initialRegion={{
                      latitude: location.latitude,
                      longitude: location.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    onRegionChangeComplete={handleMapRegionChangeComplete}
                    showsUserLocation={true}
                    showsMyLocationButton={false}
                    mapType="standard"
                  >
                    <Marker
                      coordinate={{
                        latitude: location.latitude,
                        longitude: location.longitude,
                      }}
                      title="Your Location"
                      pinColor="#1D4ED8"
                    />
                  </MapView>
                  
                  {/* Return to Location Button */}
                  {showLocationButton && (
                    <TouchableOpacity
                      onPress={returnToCurrentLocation}
                      className="absolute bottom-2 right-2 bg-[#1D4ED8] rounded-full p-3 shadow-lg"
                      style={{
                        shadowColor: '#1D4ED8',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 6,
                      }}
                    >
                      <Feather name="navigation" size={20} color="white" />
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View className="w-full h-full bg-gray-200 items-center justify-center">
                  <Text className="text-gray-600 text-sm text-center px-4">
                    Location unavailable{'\n'}
                    Please enable location services
                  </Text>
                </View>
              )}
            </View>
            
            {/* Dengue Risk Prediction Card */}
            <DengueRiskCard onPredictionUpdate={handlePredictionUpdate} />
            
            {/* Action Cards - Only show when prediction exists */}
            {hasPrediction && (
              <View className="flex-row gap-1 mt-1 mb-8">
                <TouchableOpacity 
                  className="flex-1 bg-[#EAD196] rounded-2xl items-center justify-center" 
                  style={{ height: 100 }}
                  onPress={() => router.push('/risk-analysis')}
                  activeOpacity={0.8}
                >
                  <Image source={require('../assets/analysis.png')} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        {/* Organisation Tab Content */}
        {activeTab === 'organisation' && (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {loadingOrganisation ? (
              <View className="items-center justify-center py-8">
                <ActivityIndicator size="large" color="#1D4ED8" />
                <Text className="text-gray-600 mt-4 text-sm">Loading organisation data...</Text>
              </View>
            ) : companyLocations.length === 0 ? (
              <View className="bg-yellow-50 rounded-2xl p-6 items-center justify-center border border-yellow-200">
                <Feather name="info" size={32} color="#EAD196" />
                <Text className="text-gray-700 text-center mt-4 font-semibold">
                  No company locations found
                </Text>
                <Text className="text-gray-500 text-center mt-2 text-sm">
                  Please contact your administrator to add locations
                </Text>
              </View>
            ) : (
              <>
                {/* Organisation Map */}
                <View
                  className="rounded-2xl overflow-hidden mb-4 w-full"
                  style={{ aspectRatio: 4 / 3 }}
                >
                  <MapView
                    ref={orgMapRef}
                    style={{ width: '100%', height: '100%' }}
                    mapType="standard"
                    showsUserLocation={true}
                    showsMyLocationButton={false}
                  >
                    {companyLocations
                      .filter(loc => loc.latitude && loc.longitude)
                      .map((loc) => {
                        const prediction = companyPredictions.find(
                          p => p.companyLocationId === loc.id
                        );
                        const riskLevel = prediction 
                          ? getRiskLevel(prediction.riskScore)
                          : 'low';
                        const riskColor = getRiskColor(riskLevel);
                        
                        return (
                          <Marker
                            key={loc.id}
                            coordinate={{
                              latitude: loc.latitude!,
                              longitude: loc.longitude!,
                            }}
                            title={loc.name}
                            description={prediction ? `Risk: ${riskLevel.toUpperCase()}` : 'No prediction'}
                            pinColor={riskColor}
                            onPress={() => handleLocationMarkerPress(loc)}
                          />
                        );
                      })}
                  </MapView>
                </View>

                {/* Selected Location Prediction Details - Display below map if location is selected */}
                {selectedLocation && selectedPrediction && (
                  <View 
                    className="bg-white rounded-2xl p-4 mb-4 border-l-4"
                    style={{ 
                      borderLeftColor: getRiskColor(getRiskLevel(selectedPrediction.riskScore)),
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    <Text className="text-lg font-bold text-black mb-3" style={{ fontFamily: 'SF Pro' }}>
                      Prediction Details
                    </Text>
                    <View>
                      <View className="flex-row justify-between items-center py-2 border-b border-gray-100 mb-2">
                        <Text className="text-sm font-semibold text-gray-600">Dengue Risk Level</Text>
                        <View 
                          className="px-3 py-1 rounded-lg"
                          style={{ backgroundColor: getRiskColor(getRiskLevel(selectedPrediction.riskScore)) + '20' }}
                        >
                          <Text 
                            className="text-sm font-bold"
                            style={{ color: getRiskColor(getRiskLevel(selectedPrediction.riskScore)) }}
                          >
                            {getRiskLevel(selectedPrediction.riskScore).toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      {selectedPrediction.model1Score !== null && selectedPrediction.model1Score !== undefined && (
                        <View className="flex-row justify-between items-center py-2 border-b border-gray-100 mb-2">
                          <Text className="text-sm font-semibold text-gray-600">Historical Cases Factor</Text>
                          <View 
                            className="px-3 py-1 rounded-lg"
                            style={{ backgroundColor: getRiskColor(getScoreRiskLevel(selectedPrediction.model1Score)) + '20' }}
                          >
                            <Text 
                              className="text-sm font-bold"
                              style={{ color: getRiskColor(getScoreRiskLevel(selectedPrediction.model1Score)) }}
                            >
                              {getScoreRiskLevel(selectedPrediction.model1Score).toUpperCase()}
                            </Text>
                          </View>
                        </View>
                      )}
                      {selectedPrediction.model2Score !== null && selectedPrediction.model2Score !== undefined && (
                        <View className="flex-row justify-between items-center py-2 border-b border-gray-100 mb-2">
                          <Text className="text-sm font-semibold text-gray-600">Weather-Based Factor</Text>
                          <View 
                            className="px-3 py-1 rounded-lg"
                            style={{ backgroundColor: getRiskColor(getScoreRiskLevel(selectedPrediction.model2Score)) + '20' }}
                          >
                            <Text 
                              className="text-sm font-bold"
                              style={{ color: getRiskColor(getScoreRiskLevel(selectedPrediction.model2Score)) }}
                            >
                              {getScoreRiskLevel(selectedPrediction.model2Score).toUpperCase()}
                            </Text>
                          </View>
                        </View>
                      )}
                      {selectedPrediction.model3Score !== null && 
                       selectedPrediction.model3Score !== undefined && 
                       selectedPrediction.model3Score.toFixed(2) !== '0.00' && (
                        <View className="flex-row justify-between items-center py-2 border-b border-gray-100 mb-2">
                          <Text className="text-sm font-semibold text-gray-600">Breeding Area Detection Factor</Text>
                          <View 
                            className="px-3 py-1 rounded-lg"
                            style={{ backgroundColor: getRiskColor(getScoreRiskLevel(selectedPrediction.model3Score)) + '20' }}
                          >
                            <Text 
                              className="text-sm font-bold"
                              style={{ color: getRiskColor(getScoreRiskLevel(selectedPrediction.model3Score)) }}
                            >
                              {getScoreRiskLevel(selectedPrediction.model3Score).toUpperCase()}
                            </Text>
                          </View>
                        </View>
                      )}
                      <View className="flex-row justify-between items-center py-2">
                        <Text className="text-sm font-semibold text-gray-600">Updated at</Text>
                        <Text className="text-xs text-gray-500">
                          {new Date(selectedPrediction.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* No Prediction Message - Display below map if location is selected but no prediction */}
                {selectedLocation && !selectedPrediction && (
                  <View className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-200">
                    <View className="flex-row items-center">
                      <Feather name="info" size={20} color="#6B7280" />
                      <Text className="text-sm text-gray-600 ml-2">
                        No prediction available for {selectedLocation.name}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Location List */}
                <View className="mb-4">
                  <Text className="text-lg font-bold text-black mb-3" style={{ fontFamily: 'SF Pro' }}>
                    Company Locations
                  </Text>
                  {companyLocations.map((loc) => {
                    const prediction = companyPredictions.find(
                      p => p.companyLocationId === loc.id
                    );
                    const riskLevel = prediction 
                      ? getRiskLevel(prediction.riskScore)
                      : null;
                    const riskColor = riskLevel ? getRiskColor(riskLevel) : '#9CA3AF';
                    
                    return (
                      <TouchableOpacity
                        key={loc.id}
                        onPress={() => handleLocationMarkerPress(loc)}
                        className={`bg-white rounded-2xl p-4 mb-3 border-l-4 ${
                          selectedLocation?.id === loc.id ? 'border-[#1D4ED8]' : 'border-gray-200'
                        }`}
                        style={{
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          elevation: 3,
                        }}
                      >
                        <View className="flex-row items-start justify-between">
                          <View className="flex-1">
                            <View className="flex-row items-center mb-2">
                              <Feather name="map-pin" size={16} color="#1D4ED8" />
                              <Text className="text-base font-bold text-black ml-2" style={{ fontFamily: 'SF Pro' }}>
                                {loc.name}
                              </Text>
                            </View>
                            {loc.address && (
                              <Text className="text-sm text-gray-600 mb-2">{loc.address}</Text>
                            )}
                            {prediction?.createdAt && (
                              <Text className="text-xs text-gray-500">
                                {new Date(prediction.createdAt).toLocaleDateString()}
                              </Text>
                            )}
                          </View>
                          {prediction && (
                            <View 
                              className="px-3 py-1 rounded-lg"
                              style={{ backgroundColor: riskColor + '20' }}
                            >
                              <Text 
                                className="text-xs font-bold"
                                style={{ color: riskColor }}
                              >
                                {riskLevel?.toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>
        )}
      </View>
      <BottomNav />
    </SafeAreaView>
  );
} 