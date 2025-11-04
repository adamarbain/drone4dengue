import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Region } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import BottomNav from './components/BottomNav';
import DengueRiskCard from '../components/DengueRiskCard';
import { fetchCurrentUser } from '../utils/userApi';

export default function Dashboard() {
  const [hasCompany, setHasCompany] = useState<boolean | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [hasPrediction, setHasPrediction] = useState(false);
  const [showLocationButton, setShowLocationButton] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const user = await fetchCurrentUser();
        if (isMounted) setHasCompany(Boolean(user?.companyId));
      } catch (e) {
        if (isMounted) setHasCompany(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

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
          setLocationLoading(false);
          // Don't show alert, just silently fail
        }
      }
    })();
    return () => { isMounted = false; };
  }, []);
  const handlePredictionUpdate = (prediction: any) => {
    setHasPrediction(prediction !== null);
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
        <Text className="text-[36px] font-extrabold text-black mb-4" style={{ fontFamily: 'SF Pro' }}>
          Dashboard
        </Text>
        {/* Tabs: Only show when user has a companyId; show Current and Organisation only */}
        {hasCompany ? (
          <View className="flex-row mb-6 rounded-lg overflow-hidden">
            <TouchableOpacity className="flex-1 bg-[#7D0A0A] py-2">
              <Text className="text-white text-center font-bold text-base">Current</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-[#EAD196] py-2">
              <Text className="text-[#7D0A0A] text-center font-bold text-base">Organisation</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {/* Map */}
        <View className="rounded-2xl overflow-hidden mb-2" style={{ height: 120, position: 'relative' }}>
          {locationLoading ? (
            <View className="w-full h-full bg-gray-200 items-center justify-center">
              <ActivityIndicator size="large" color="#7D0A0A" />
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
                  pinColor="#7D0A0A"
                />
              </MapView>
              
              {/* Return to Location Button */}
              {showLocationButton && (
                <TouchableOpacity
                  onPress={returnToCurrentLocation}
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
          <View className="flex-row gap-1 mt-1">
            <View className="flex-1 bg-[#EAD196] rounded-2xl items-center justify-center" style={{ height: 100 }}>
              <Image source={require('../assets/analysis.png')} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
            </View>
          </View>
        )}
      </View>
      <BottomNav />
    </SafeAreaView>
  );
} 