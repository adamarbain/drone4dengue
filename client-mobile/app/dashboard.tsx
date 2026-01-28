import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Modal, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Region } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import BottomNav from './components/BottomNav';
import DengueRiskCard from '../components/DengueRiskCard';
import { fetchCurrentUser, getCompanyLocations, getCompanyPredictions, getCompanySettings, getLatestDengueCases, getUserLocationAlerts, createLocationAlert, deleteLocationAlert, toggleLocationAlert } from '../utils/userApi';
import { Ionicons } from '@expo/vector-icons';
import { isTablet, getMapHeight, getHorizontalPadding, moderateScale } from '../utils/responsive';
import FullScreenLoader from '../components/FullScreenLoader';
import { useMinimumLoadingTime } from '../utils/useMinimumLoadingTime';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

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
  const [latestPrediction, setLatestPrediction] = useState<any | null>(null);
  const [showLocationButton, setShowLocationButton] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Organisation tab states
  const [companyLocations, setCompanyLocations] = useState<CompanyLocation[]>([]);
  const [companyPredictions, setCompanyPredictions] = useState<CompanyPrediction[]>([]);
  const [loadingOrganisation, setLoadingOrganisation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<CompanyLocation | null>(null);
  const [selectedPrediction, setSelectedPrediction] = useState<CompanyPrediction | null>(null);
  const [showFactorDetails, setShowFactorDetails] = useState(false);
  const orgMapRef = useRef<MapView>(null);
  
  // Dengue Cases tab states (for comp-999)
  interface DengueCase {
    id: string;
    location: string;
    date: string;
    activeCases: number;
    latitude: number;
    longitude: number;
    totalCases?: number | null;
    status?: string | null;
    coverageArea?: string | null;
    source?: string | null;
    displayName?: string | null;
    state?: string | null;
    city?: string | null;
    road?: string | null;
    suburb?: string | null;
    district?: string | null;
  }
  const [dengueCases, setDengueCases] = useState<DengueCase[]>([]);
  const [loadingDengueCases, setLoadingDengueCases] = useState(false);
  const [selectedDengueCase, setSelectedDengueCase] = useState<DengueCase | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showLocationButtonDengue, setShowLocationButtonDengue] = useState(false);
  const searchAbortControllerRef = useRef<AbortController | null>(null);
  
  // Location Alert states
  interface LocationAlert {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    boundingBox: number[];
    address: string | null;
    isActive: boolean;
    createdAt: string;
  }
  const [locationAlerts, setLocationAlerts] = useState<LocationAlert[]>([]);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showCreateAlertModal, setShowCreateAlertModal] = useState(false);
  const [showViewAlertsModal, setShowViewAlertsModal] = useState(false);
  const [newAlertName, setNewAlertName] = useState('');
  const [newAlertLocation, setNewAlertLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [newAlertLocationName, setNewAlertLocationName] = useState<string>('');
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const alertMapRef = useRef<MapView>(null);
  const [alertSearchQuery, setAlertSearchQuery] = useState('');
  const [alertSearchResults, setAlertSearchResults] = useState<any[]>([]);
  const [isAlertSearching, setIsAlertSearching] = useState(false);
  const [hasAlertSearched, setHasAlertSearched] = useState(false);
  const alertSearchAbortControllerRef = useRef<AbortController | null>(null);
  
  // Risk threshold settings
  const [riskThresholds, setRiskThresholds] = useState({ lowThreshold: 1.0, highThreshold: 3.0 });
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  // const showLoader = useMinimumLoadingTime(isInitialLoading, 2000);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const user = await fetchCurrentUser();
        if (isMounted) {
          // If companyId is 'comp-999', show Dengue Cases tab instead of Organisation tab
          if (user?.companyId === 'comp-999') {
            setHasCompany(true); // Set to true to show tabs
            setCompanyId(user?.companyId || null);
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

  // Determine when the dashboard has finished its initial load
  useEffect(() => {
    // Initial load is considered done once we know the company status
    // and location loading has either succeeded or failed.
    if (hasCompany !== null && !locationLoading) {
      setIsInitialLoading(false);
    }
  }, [hasCompany, locationLoading]);

  // Fetch organisation data when switching to organisation tab
  useEffect(() => {
    if (activeTab === 'organisation' && companyId) {
      if (companyId === 'comp-999') {
        fetchDengueCases();
      } else {
        fetchOrganisationData();
      }
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
    setLatestPrediction(prediction);
  };

  const fetchDengueCases = async () => {
    setLoadingDengueCases(true);
    try {
      const cases = await getLatestDengueCases();
      setDengueCases(cases);
      
      // Fit map to show all dengue cases if available
      if (cases.length > 0 && orgMapRef.current) {
        setTimeout(() => {
          orgMapRef.current?.fitToCoordinates(
            cases.map((case_: DengueCase) => ({
              latitude: case_.latitude,
              longitude: case_.longitude,
            })),
            {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true,
            }
          );
        }, 100);
      }
    } catch (error: any) {
      console.error('Error fetching dengue cases:', error);
      Alert.alert('Error', error.message || 'Failed to load dengue cases');
    } finally {
      setLoadingDengueCases(false);
    }
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

  // Calculate initial region from company locations
  const getInitialRegionFromCompanyLocations = (): Region | null => {
    const validLocations = companyLocations.filter(
      loc => loc.latitude && loc.longitude
    );

    if (validLocations.length === 0) {
      // Fallback to user location if available
      if (location) {
        return {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
      }
      return null;
    }

    // Calculate bounds from all company locations
    const latitudes = validLocations.map(loc => loc.latitude!);
    const longitudes = validLocations.map(loc => loc.longitude!);
    
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLon = Math.min(...longitudes);
    const maxLon = Math.max(...longitudes);

    // Calculate center
    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;

    // Calculate deltas with padding (add 40% padding on each side)
    const latDelta = Math.max((maxLat - minLat) * 1.4, 0.01);
    const lonDelta = Math.max((maxLon - minLon) * 1.4, 0.01);

    return {
      latitude: centerLat,
      longitude: centerLon,
      latitudeDelta: latDelta,
      longitudeDelta: lonDelta,
    };
  };

  const handleLocationMarkerPress = (location: CompanyLocation) => {
    setSelectedLocation(location);
    // Find prediction for this location
    const prediction = companyPredictions.find(
      p => p.companyLocationId === location.id
    );
    setSelectedPrediction(prediction || null);
    setShowFactorDetails(false);
    
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

  const handleCloseDetails = () => {
    setSelectedLocation(null);
    setSelectedPrediction(null);
    setShowFactorDetails(false);
  };

  // Get locations with predictions for navigation
  const getLocationsWithPredictions = (): CompanyLocation[] => {
    return companyLocations.filter(loc => 
      companyPredictions.some(p => p.companyLocationId === loc.id)
    );
  };

  const handleNavigateLocation = (direction: 'prev' | 'next') => {
    const locationsWithPredictions = getLocationsWithPredictions();
    if (!selectedLocation || locationsWithPredictions.length === 0) return;

    const currentIndex = locationsWithPredictions.findIndex(
      loc => loc.id === selectedLocation.id
    );

    if (currentIndex === -1) return;

    let newIndex: number;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % locationsWithPredictions.length;
    } else {
      newIndex = currentIndex === 0 
        ? locationsWithPredictions.length - 1 
        : currentIndex - 1;
    }

    const newLocation = locationsWithPredictions[newIndex];
    handleLocationMarkerPress(newLocation);
  };

  const getCurrentLocationIndex = (): { current: number; total: number } => {
    const locationsWithPredictions = getLocationsWithPredictions();
    if (!selectedLocation || locationsWithPredictions.length === 0) {
      return { current: 0, total: 0 };
    }
    const currentIndex = locationsWithPredictions.findIndex(
      loc => loc.id === selectedLocation.id
    );
    return {
      current: currentIndex + 1,
      total: locationsWithPredictions.length
    };
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

  const handleDengueMapRegionChangeComplete = (region: Region) => {
    if (location) {
      // Check if the map center is significantly different from user location
      const latDiff = Math.abs(region.latitude - location.latitude);
      const lonDiff = Math.abs(region.longitude - location.longitude);
      const threshold = 0.002; // approximately 200 meters
      
      if (latDiff > threshold || lonDiff > threshold) {
        setShowLocationButtonDengue(true);
      } else {
        setShowLocationButtonDengue(false);
      }
    }
  };

  const searchLocation = async (query: string, signal?: AbortSignal) => {
    if (!query || query.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`${API_URL}/geocode/search?q=${encodeURIComponent(query)}&limit=5`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal, // Pass abort signal to cancel request if needed
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResults(data);
    } catch (error: any) {
      // Don't show error if request was aborted (user typed again)
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Error searching location:', error);
      Alert.alert('Error', 'Failed to search location');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchResultSelect = (result: any) => {
    if (orgMapRef.current) {
      // Cancel any pending search request
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
      }
      
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);
      
      orgMapRef.current.animateToRegion({
        latitude: lat,
        longitude: lon,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 500);
      
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
    }
  };

  // Search location for alert modal
  const searchAlertLocation = async (query: string, signal?: AbortSignal) => {
    if (!query || query.trim().length === 0) {
      setAlertSearchResults([]);
      return;
    }

    setIsAlertSearching(true);
    try {
      const response = await fetch(`${API_URL}/geocode/search?q=${encodeURIComponent(query)}&limit=5`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal, // Pass abort signal to cancel request if needed
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setAlertSearchResults(data);
    } catch (error: any) {
      // Don't show error if request was aborted (user typed again)
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Error searching location:', error);
      setAlertSearchResults([]);
    } finally {
      setIsAlertSearching(false);
    }
  };

  const handleAlertSearchResultSelect = (result: any) => {
    // Cancel any pending search request
    if (alertSearchAbortControllerRef.current) {
      alertSearchAbortControllerRef.current.abort();
    }
    
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    // Set the selected location and name
    setNewAlertLocation({ latitude: lat, longitude: lon });
    setNewAlertLocationName(result.display_name || '');
    
    // Animate map to the selected location
    if (alertMapRef.current) {
      alertMapRef.current.animateToRegion({
        latitude: lat,
        longitude: lon,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 500);
    }
    
    // Clear search
    setAlertSearchQuery('');
    setAlertSearchResults([]);
    setHasAlertSearched(false);
  };

  // Reverse geocode to get location name from coordinates
  const reverseGeocodeAlertLocation = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
        {
          headers: {
            'User-Agent': 'DengueEye-Mobile/1.0',
            'Accept': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }
      
      const data = await response.json();
      return data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  };

  const handleDengueCaseMarkerPress = (case_: DengueCase) => {
    setSelectedDengueCase(case_);
  };

  // Location Alert functions
  const fetchLocationAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const alerts = await getUserLocationAlerts();
      setLocationAlerts(alerts);
    } catch (error: any) {
      console.error('Error fetching location alerts:', error);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleCreateAlert = async () => {
    if (!newAlertName.trim()) {
      Alert.alert('Error', 'Please enter a name for the alert');
      return;
    }
    if (!newAlertLocation) {
      Alert.alert('Error', 'Please pin a location on the map');
      return;
    }

    setIsCreatingAlert(true);
    try {
      await createLocationAlert(newAlertName.trim(), newAlertLocation.latitude, newAlertLocation.longitude);
      Alert.alert('Success', 'Location alert created successfully');
      setShowCreateAlertModal(false);
      setNewAlertName('');
      setNewAlertLocation(null);
      setNewAlertLocationName('');
      fetchLocationAlerts();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create location alert');
    } finally {
      setIsCreatingAlert(false);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    Alert.alert(
      'Delete Alert',
      'Are you sure you want to delete this location alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLocationAlert(alertId);
              setLocationAlerts(prev => prev.filter(a => a.id !== alertId));
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete alert');
            }
          }
        }
      ]
    );
  };

  const handleToggleAlert = async (alertId: string, currentStatus: boolean) => {
    try {
      const updated = await toggleLocationAlert(alertId, !currentStatus);
      setLocationAlerts(prev => prev.map(a => a.id === alertId ? { ...a, isActive: updated.isActive } : a));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to toggle alert');
    }
  };

  const handleMapPressForAlert = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setNewAlertLocation({ latitude, longitude });
    
    // Get location name via reverse geocoding
    const locationName = await reverseGeocodeAlertLocation(latitude, longitude);
    setNewAlertLocationName(locationName);
  };

  const returnToCurrentLocationDengue = () => {
    if (location && orgMapRef.current) {
      orgMapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }, 500);
      setShowLocationButtonDengue(false);
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

  // if (showLoader) {
  //   return (
  //     <FullScreenLoader
  //       title="Loading your dashboard..."
  //       subtitle="Fetching your location, organisation data, and latest dengue predictions"
  //     />
  //   );
  // }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View 
        className="flex-1 pt-2 pb-20"
        style={{ 
          paddingHorizontal: isTablet() ? getHorizontalPadding() : 16,
          maxWidth: isTablet() ? 800 : undefined,
          alignSelf: isTablet() ? 'center' : undefined,
          width: '100%',
        }}
      >
        {/* Title */}
        <View className="mb-4">
          <Text 
            className="font-extrabold" 
            style={{ 
              fontFamily: 'SF Pro', 
              color: '#0F2854',
              fontSize: isTablet() ? 42 : 36,
            }}
          >
            Dashboard
          </Text>
          <Text 
            className="mt-1" 
            style={{ 
              color: 'rgba(15, 40, 84, 0.75)',
              fontSize: isTablet() ? 16 : 14,
            }}
          >
            Monitor dengue risk predictions and case data in your area
          </Text>
        </View>
        {/* Tabs: Only show when user has a companyId; show Current and Organisation only */}
        {hasCompany ? (
          <View className="flex-row mb-6 rounded-lg overflow-hidden border" style={{ borderColor: '#4988C4' }}>
            <TouchableOpacity 
              className={`flex-1 ${activeTab === 'current' ? 'bg-[#1C4D8D]' : 'bg-[#BDE8F5]'}`}
              style={{ paddingVertical: isTablet() ? 16 : 12 }}
              onPress={() => setActiveTab('current')}
            >
              <Text 
                className="text-center font-bold" 
                style={{ 
                  color: activeTab === 'current' ? '#FFFFFF' : '#0F2854',
                  fontSize: isTablet() ? 18 : 16,
                }}
              >
                Current
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className={`flex-1 ${activeTab === 'organisation' ? 'bg-[#1C4D8D]' : 'bg-[#BDE8F5]'}`}
              style={{ paddingVertical: isTablet() ? 16 : 12 }}
              onPress={() => setActiveTab('organisation')}
            >
              <Text 
                className="text-center font-bold" 
                style={{ 
                  color: activeTab === 'organisation' ? '#FFFFFF' : '#0F2854',
                  fontSize: isTablet() ? 18 : 16,
                }}
              >
                {companyId === 'comp-999' ? 'Dengue Cases' : 'Organisation'}
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
              style={{ height: getMapHeight() }}
            >
              {locationLoading ? (
                <View className="w-full h-full bg-gray-200 items-center justify-center">
                  <ActivityIndicator size="large" color="#1C4D8D" />
                  <Text className="mt-2 text-sm" style={{ color: 'rgba(15, 40, 84, 0.75)' }}>Loading map...</Text>
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
                    zoomEnabled={true}
                    zoomControlEnabled={true}
                    scrollEnabled={true}
                    pitchEnabled={true}
                    rotateEnabled={true}
                  >
                    <Marker
                      coordinate={{
                        latitude: location.latitude,
                        longitude: location.longitude,
                      }}
                      title="Your Location"
                      pinColor="#4988C4"
                    />
                  </MapView>
                  
                  {/* Return to Location Button */}
                  {showLocationButton && (
                    <TouchableOpacity
                      onPress={returnToCurrentLocation}
                      className="absolute bottom-2 right-2 bg-[#1C4D8D] rounded-full p-3 shadow-lg"
                      style={{
                        shadowColor: '#1C4D8D',
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
            {hasPrediction && latestPrediction && (
              <View className="flex-row gap-1 mt-1 mb-8">
                <TouchableOpacity 
                  className="flex-1 bg-[#EAD196] rounded-2xl items-center justify-center" 
                  style={{ height: 100 }}
                  onPress={() => {
                    router.push({
                      pathname: '/risk-analysis',
                      params: {
                        prediction: JSON.stringify(latestPrediction),
                      },
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <Image source={require('../assets/analysis.png')} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        {/* Organisation Tab Content / Dengue Cases Tab Content */}
        {activeTab === 'organisation' && (
          <View className="flex-1">
            {companyId === 'comp-999' ? (
              <View className="flex-1">
                {loadingDengueCases ? (
                  <View className="flex-1 items-center justify-center py-8">
                    <ActivityIndicator size="large" color="#1C4D8D" />
                    <Text className="mt-4 text-sm" style={{ color: 'rgba(15, 40, 84, 0.75)' }}>Loading dengue cases...</Text>
                  </View>
                ) : dengueCases.length === 0 ? (
                  <View className="bg-yellow-50 rounded-2xl p-6 items-center justify-center border border-yellow-200">
                    <Feather name="info" size={32} color="#EAD196" />
                    <Text className="text-gray-700 text-center mt-4 font-semibold">
                      No dengue cases found
                    </Text>
                    <Text className="text-gray-500 text-center mt-2 text-sm">
                      No active cases in the last 24 hours
                    </Text>
                  </View>
                ) : (
                  <View className="flex-1">
                    {/* Location Search - Positioned absolutely on top of map */}
                    <View className="absolute top-0 left-0 right-0 z-10 px-2 pt-2">
                      <View className="flex-row items-center bg-white rounded-xl border px-3 py-2 shadow-md" style={{ borderColor: '#4988C4' }}>
                        <Feather name="search" size={20} color="#4988C4" />
                        <TextInput
                          className="flex-1 ml-2 py-2 text-md"
                          placeholder="Search location in Malaysia..."
                          placeholderTextColor="rgba(15, 40, 84, 0.55)"
                          style={{ color: '#0F2854' }}
                          value={searchQuery}
                          onChangeText={(text) => {
                            setSearchQuery(text);
                            // Only update state - search will be triggered on Enter press
                          }}
                          onSubmitEditing={() => {
                            // Search only when user presses Enter/Submit
                            if (!searchQuery.trim()) {
                              setSearchResults([]);
                              setHasSearched(false);
                              return;
                            }
                            
                            // Cancel any pending request
                            if (searchAbortControllerRef.current) {
                              searchAbortControllerRef.current.abort();
                            }
                            
                            setHasSearched(true);
                            const abortController = new AbortController();
                            searchAbortControllerRef.current = abortController;
                            searchLocation(searchQuery.trim(), abortController.signal);
                          }}
                        />
                        {searchQuery.length > 0 && (
                          <TouchableOpacity
                            onPress={() => {
                              // Cancel any pending search request
                              if (searchAbortControllerRef.current) {
                                searchAbortControllerRef.current.abort();
                              }
                              setSearchQuery('');
                              setSearchResults([]);
                              setHasSearched(false);
                            }}
                            className="ml-2"
                          >
                            <Feather name="x" size={20} color="#4988C4" />
                          </TouchableOpacity>
                        )}
                      </View>
                      
                      {/* Search Results Dropdown */}
                      {searchResults.length > 0 && (
                        <View className="mt-1 bg-white rounded-xl border border-gray-200 shadow-lg max-h-48">
                          <ScrollView>
                            {searchResults.map((result, index) => (
                              <TouchableOpacity
                                key={index}
                                onPress={() => handleSearchResultSelect(result)}
                                className="px-4 py-3 border-b border-gray-100"
                                activeOpacity={0.7}
                              >
                                <Text className="text-base font-semibold text-black">
                                  {result.display_name?.split(',')[0] || result.name || 'Unknown'}
                                </Text>
                                <Text className="text-sm text-gray-600 mt-1" numberOfLines={1}>
                                  {result.display_name || `${result.lat}, ${result.lon}`}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                      
                      {/* No Results Message */}
                      {hasSearched && !isSearching && searchResults.length === 0 && searchQuery.trim().length > 0 && (
                        <View className="mt-1 bg-white rounded-xl border border-gray-200 shadow-lg px-4 py-3">
                          <Text className="text-sm text-gray-600 text-center">
                            Location "{searchQuery}" not found. Please try a different search term.
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Dengue Cases Map - Full height */}
                    <View className="flex-1 rounded-2xl overflow-hidden">
                      <MapView
                        ref={orgMapRef}
                        style={{ width: '100%', height: '100%' }}
                        mapType="standard"
                        showsUserLocation={true}
                        showsMyLocationButton={false}
                        onRegionChangeComplete={handleDengueMapRegionChangeComplete}
                        initialRegion={location ? {
                          latitude: location.latitude,
                          longitude: location.longitude,
                          latitudeDelta: 0.1,
                          longitudeDelta: 0.1,
                        } : {
                          latitude: 0,
                          longitude: 0,
                          latitudeDelta: 0.01,
                          longitudeDelta: 0.01,
                        }}
                      >
                        {dengueCases.map((case_: DengueCase) => (
                          <Marker
                            key={case_.id}
                            coordinate={{
                              latitude: case_.latitude,
                              longitude: case_.longitude,
                            }}
                            title={case_.location}
                            description={`Active Dengue Cases: ${case_.activeCases}`}
                            pinColor="#BF3131"
                            onPress={() => handleDengueCaseMarkerPress(case_)}
                          />
                        ))}
                      </MapView>
                      
                      {/* Floating Button - Create Location-based Alert (Bottom Left) */}
                      <TouchableOpacity
                        onPress={() => {
                          fetchLocationAlerts();
                          setShowAlertModal(true);
                        }}
                        className="absolute bottom-4 left-4 bg-[#1C4D8D] rounded-full px-4 py-3 flex-row items-center shadow-lg"
                        style={{
                          shadowColor: '#1C4D8D',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                          elevation: 8,
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="notifications-outline" size={20} color="white" />
                        <Text className="text-white font-bold text-sm ml-2">Location Alert</Text>
                      </TouchableOpacity>
                      
                      {/* Return to Location Button (Bottom Right) */}
                      {showLocationButtonDengue && (
                        <TouchableOpacity
                          onPress={returnToCurrentLocationDengue}
                          className="absolute bottom-4 right-4 bg-[#1C4D8D] rounded-full p-3 shadow-lg"
                          style={{
                            shadowColor: '#1C4D8D',
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

                    {/* Selected Dengue Case Details Modal */}
                    <Modal
                      visible={selectedDengueCase !== null}
                      transparent={true}
                      animationType="slide"
                      onRequestClose={() => setSelectedDengueCase(null)}
                    >
                      <View className="flex-1 bg-black/50 justify-end">
                        <TouchableOpacity
                          className="flex-1"
                          activeOpacity={1}
                          onPress={() => setSelectedDengueCase(null)}
                        />
                        <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
                          <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-2xl font-bold text-black" style={{ fontFamily: 'SF Pro' }}>
                              Dengue Case Details
                            </Text>
                            <TouchableOpacity
                              onPress={() => setSelectedDengueCase(null)}
                              className="p-2"
                              activeOpacity={0.7}
                            >
                              <Feather name="x" size={24} color="#6B7280" />
                            </TouchableOpacity>
                          </View>
                          
                          {selectedDengueCase && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                              <View className="mb-4">
                                <Text className="text-sm font-semibold text-gray-600 mb-1">Location</Text>
                                <Text className="text-base text-black font-semibold">{selectedDengueCase.displayName}</Text>
                              </View>
                              
                              {selectedDengueCase.state !== null && selectedDengueCase.state !== undefined && (
                                <View className="mb-4">
                                  <Text className="text-sm font-semibold text-gray-600 mb-1">State</Text>
                                  <Text className="text-base text-black">{selectedDengueCase.state}</Text>
                                </View>
                              )}
                              
                              {selectedDengueCase.city !== null && selectedDengueCase.city !== undefined && (
                                <View className="mb-4">
                                  <Text className="text-sm font-semibold text-gray-600 mb-1">City</Text>
                                  <Text className="text-base text-black">{selectedDengueCase.city}</Text>
                                </View>
                              )}
                              
                              {selectedDengueCase.road !== null && selectedDengueCase.road !== undefined && (
                                <View className="mb-4">
                                  <Text className="text-sm font-semibold text-gray-600 mb-1">Road</Text>
                                  <Text className="text-base text-black">{selectedDengueCase.road}</Text>
                                </View>
                              )}
                              
                              {selectedDengueCase.suburb !== null && selectedDengueCase.suburb !== undefined && (
                                <View className="mb-4">
                                  <Text className="text-sm font-semibold text-gray-600 mb-1">Suburb</Text>
                                  <Text className="text-base text-black">{selectedDengueCase.suburb}</Text>
                                </View>
                              )}
                              
                              {selectedDengueCase.district !== null && selectedDengueCase.district !== undefined && (
                                <View className="mb-4">
                                  <Text className="text-sm font-semibold text-gray-600 mb-1">District</Text>
                                  <Text className="text-base text-black">{selectedDengueCase.district}</Text>
                                </View>
                              )}
                              
                              <View className="mb-4">
                                <Text className="text-sm font-semibold text-gray-600 mb-1">Date</Text>
                                <Text className="text-base text-black">
                                  {selectedDengueCase.date
                                    ? (() => {
                                        const dateObj = new Date(selectedDengueCase.date);
                                        const day = dateObj.getDate();
                                        const month = dateObj.toLocaleString('en-US', { month: 'long' });
                                        const year = dateObj.getFullYear();
                                        return `${day} ${month} ${year}`;
                                      })()
                                    : 'N/A'}
                                </Text>
                              </View>
                              
                              <View className="mb-4">
                                <Text className="text-sm font-semibold text-gray-600 mb-1">Active Cases</Text>
                                <Text className="text-base text-black font-semibold" style={{ color: '#BF3131' }}>
                                  {selectedDengueCase.activeCases} Dengue cases
                                </Text>
                              </View>
                              
                              {selectedDengueCase.totalCases !== null && selectedDengueCase.totalCases !== undefined && (
                                <View className="mb-4">
                                  <Text className="text-sm font-semibold text-gray-600 mb-1">Total Cases</Text>
                                  <Text className="text-base text-black">{selectedDengueCase.totalCases} Dengue cases</Text>
                                </View>
                              )}
                              
                              {/* {selectedDengueCase.status && (
                                <View className="mb-4">
                                  <Text className="text-sm font-semibold text-gray-600 mb-1">Status</Text>
                                  <Text className="text-base text-black">{selectedDengueCase.status}</Text>
                                </View>
                              )} */}
                              
                              {selectedDengueCase.coverageArea && (
                                <View className="mb-4">
                                  <Text className="text-sm font-semibold text-gray-600 mb-1">Coverage Area</Text>
                                  <Text className="text-base text-black">{selectedDengueCase.coverageArea}</Text>
                                </View>
                              )}
                              
                              {/* {selectedDengueCase.source && (
                                <View className="mb-4">
                                  <Text className="text-sm font-semibold text-gray-600 mb-1">Source</Text>
                                  <Text className="text-base text-black">{selectedDengueCase.source}</Text>
                                </View>
                              )} */}
                              
                              {/* <View className="mb-4">
                                <Text className="text-sm font-semibold text-gray-600 mb-1">Coordinates</Text>
                                <Text className="text-base text-black">
                                  {selectedDengueCase.latitude.toFixed(6)}, {selectedDengueCase.longitude.toFixed(6)}
                                </Text>
                              </View> */}
                              
                              <TouchableOpacity
                                onPress={() => {
                                  if (orgMapRef.current) {
                                    orgMapRef.current.animateToRegion({
                                      latitude: selectedDengueCase.latitude,
                                      longitude: selectedDengueCase.longitude,
                                      latitudeDelta: 0.01,
                                      longitudeDelta: 0.01,
                                    }, 500);
                                    setSelectedDengueCase(null);
                                  }
                                }}
                                className="bg-[#1C4D8D] rounded-xl py-3 px-4 items-center mt-4"
                                activeOpacity={0.8}
                              >
                                <Text className="text-white font-bold text-base">View on Map</Text>
                              </TouchableOpacity>
                            </ScrollView>
                          )}
                        </View>
                      </View>
                    </Modal>

                    {/* Alert Options Modal */}
                    <Modal
                      visible={showAlertModal}
                      transparent={true}
                      animationType="fade"
                      onRequestClose={() => setShowAlertModal(false)}
                    >
                      <View className="flex-1 bg-black/50 items-center justify-center px-6">
                        <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
                          <View className="items-center mb-4">
                            <View className="w-16 h-16 rounded-full bg-[#4988C4]/10 items-center justify-center mb-3">
                              <Ionicons name="location-outline" size={32} color="#4988C4" />
                            </View>
                            <Text className="text-xl font-bold text-center" style={{ color: '#0F2854' }}>Location-based Alerts</Text>
                            <Text className="text-sm text-center mt-2" style={{ color: 'rgba(15, 40, 84, 0.75)' }}>
                              Get notified when dengue cases are detected near your saved locations
                            </Text>
                          </View>
                          
                          <TouchableOpacity
                            onPress={() => {
                              setShowAlertModal(false);
                              setShowViewAlertsModal(true);
                            }}
                            className="flex-row items-center bg-[#BDE8F5] rounded-xl p-4 mb-3"
                            activeOpacity={0.7}
                          >
                            <View className="w-10 h-10 rounded-full bg-[#4988C4]/10 items-center justify-center mr-3">
                              <Ionicons name="list-outline" size={22} color="#4988C4" />
                            </View>
                            <View className="flex-1">
                              <Text className="text-base font-semibold" style={{ color: '#0F2854' }}>View Existing Alerts</Text>
                              <Text className="text-xs" style={{ color: 'rgba(15, 40, 84, 0.75)' }}>{locationAlerts.length} alert(s) saved</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#ABABAB" />
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            onPress={async () => {
                              setShowAlertModal(false);
                              setNewAlertLocation(location);
                              setShowCreateAlertModal(true);
                              if (location) {
                                const locationName = await reverseGeocodeAlertLocation(location.latitude, location.longitude);
                                setNewAlertLocationName(locationName);
                              }
                            }}
                            className="flex-row items-center bg-[#1C4D8D] rounded-xl p-4 mb-4"
                            activeOpacity={0.7}
                          >
                            <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3">
                              <Ionicons name="add" size={22} color="white" />
                            </View>
                            <View className="flex-1">
                              <Text className="text-base font-semibold text-white">Create New Alert</Text>
                              <Text className="text-xs text-white/70">Pin a location to monitor</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="white" />
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            onPress={() => setShowAlertModal(false)}
                            className="py-3"
                          >
                            <Text className="text-center font-semibold" style={{ color: 'rgba(15, 40, 84, 0.75)' }}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Modal>

                    {/* View Existing Alerts Modal */}
                    <Modal
                      visible={showViewAlertsModal}
                      transparent={true}
                      animationType="slide"
                      onRequestClose={() => setShowViewAlertsModal(false)}
                    >
                      <View className="flex-1 bg-black/50 justify-end">
                        <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
                          <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-2xl font-bold" style={{ color: '#0F2854' }}>My Location Alerts</Text>
                            <TouchableOpacity onPress={() => setShowViewAlertsModal(false)} className="p-2">
                              <Feather name="x" size={24} color="#6B7280" />
                            </TouchableOpacity>
                          </View>
                          
                          {loadingAlerts ? (
                            <View className="items-center justify-center py-8">
                              <ActivityIndicator size="large" color="#1C4D8D" />
                            </View>
                          ) : locationAlerts.length === 0 ? (
                            <View className="items-center justify-center py-8">
                              <Ionicons name="notifications-off-outline" size={48} color="#9CA3AF" />
                              <Text className="text-gray-500 mt-4 text-center">No location alerts yet</Text>
                              <TouchableOpacity
                                onPress={async () => {
                                  setShowViewAlertsModal(false);
                                  setNewAlertLocation(location);
                                  setShowCreateAlertModal(true);
                                  if (location) {
                                    const locationName = await reverseGeocodeAlertLocation(location.latitude, location.longitude);
                                    setNewAlertLocationName(locationName);
                                  }
                                }}
                                className="mt-4 bg-[#1C4D8D] rounded-xl px-6 py-3"
                              >
                                <Text className="text-white font-semibold">Create Your First Alert</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <ScrollView showsVerticalScrollIndicator={false}>
                              {locationAlerts.map((alert) => (
                                <View
                                  key={alert.id}
                                  className={`bg-[#BDE8F5] rounded-xl p-4 mb-3 border-l-4 ${alert.isActive ? 'border-[#4988C4]' : 'border-gray-300'}`}
                                >
                                  <View className="flex-row items-start justify-between">
                                    <View className="flex-1 mr-3">
                                      <Text className="text-base font-bold" style={{ color: '#0F2854' }}>{alert.name}</Text>
                                      {alert.address && (
                                        <Text className="text-xs mt-1" style={{ color: 'rgba(15, 40, 84, 0.75)' }} numberOfLines={2}>{alert.address}</Text>
                                      )}
                                      <Text className="text-xs text-[#9CA3AF] mt-1">
                                        Created {new Date(alert.createdAt).toLocaleDateString()}
                                      </Text>
                                    </View>
                                    <View className="flex-row items-center">
                                      <TouchableOpacity
                                        onPress={() => handleToggleAlert(alert.id, alert.isActive)}
                                        className={`px-3 py-1 rounded-full mr-2 ${alert.isActive ? 'bg-green-100' : 'bg-gray-200'}`}
                                      >
                                        <Text className={`text-xs font-semibold ${alert.isActive ? 'text-green-700' : 'text-gray-500'}`}>
                                          {alert.isActive ? 'Active' : 'Paused'}
                                        </Text>
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                        onPress={() => handleDeleteAlert(alert.id)}
                                        className="p-2"
                                      >
                                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                </View>
                              ))}
                            </ScrollView>
                          )}
                          
                          {locationAlerts.length > 0 && (
                            <TouchableOpacity
                              onPress={async () => {
                                setShowViewAlertsModal(false);
                                setNewAlertLocation(location);
                                setShowCreateAlertModal(true);
                                if (location) {
                                  const locationName = await reverseGeocodeAlertLocation(location.latitude, location.longitude);
                                  setNewAlertLocationName(locationName);
                                }
                              }}
                              className="bg-[#1C4D8D] rounded-xl py-3 mt-4"
                            >
                              <Text className="text-white font-bold text-center">Create New Alert</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </Modal>

                    {/* Create New Alert Modal */}
                    <Modal
                      visible={showCreateAlertModal}
                      transparent={true}
                      animationType="slide"
                      onRequestClose={() => {
                        // Cancel any pending search request
                        if (alertSearchAbortControllerRef.current) {
                          alertSearchAbortControllerRef.current.abort();
                        }
                        setShowCreateAlertModal(false);
                        setNewAlertName('');
                        setNewAlertLocation(null);
                        setNewAlertLocationName('');
                        setAlertSearchQuery('');
                        setAlertSearchResults([]);
                        setHasAlertSearched(false);
                      }}
                    >
                      <View className="flex-1 bg-black/50 justify-end">
                        <View className="bg-white rounded-t-3xl p-6" style={{ height: '85%' }}>
                          <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-2xl font-bold text-black">Create Location Alert</Text>
                            <TouchableOpacity
                              onPress={() => {
                                // Cancel any pending search request
                                if (alertSearchAbortControllerRef.current) {
                                  alertSearchAbortControllerRef.current.abort();
                                }
                                setShowCreateAlertModal(false);
                                setNewAlertName('');
                                setNewAlertLocation(null);
                                setNewAlertLocationName('');
                                setAlertSearchQuery('');
                                setAlertSearchResults([]);
                                setHasAlertSearched(false);
                              }}
                              className="p-2"
                            >
                              <Feather name="x" size={24} color="#6B7280" />
                            </TouchableOpacity>
                          </View>
                          
                          {/* Alert Name Input */}
                          <View className="mb-4">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Alert Name</Text>
                            <TextInput
                              className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 text-base"
                              placeholder="e.g., Home, Office, School"
                              placeholderTextColor="#9CA3AF"
                              value={newAlertName}
                              onChangeText={setNewAlertName}
                              style={{ color: '#181D27' }}
                            />
                          </View>
                          
                          {/* Map for pinning location */}
                          <View className="mb-4">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Pin Location</Text>
                            <Text className="text-xs text-gray-500 mb-2">Search for a location or tap on the map to select</Text>
                            
                            {/* Search Bar */}
                            <View className="mb-3">
                              <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-2 border border-gray-200">
                                <Feather name="search" size={18} color="#6B7280" />
                                <TextInput
                                  className="flex-1 ml-2 text-base"
                                  placeholder="Search location..."
                                  placeholderTextColor="rgba(15, 40, 84, 0.55)"
                                  value={alertSearchQuery}
                                  onChangeText={(text) => {
                                    setAlertSearchQuery(text);
                                    // Only update state - search will be triggered on Enter press
                                  }}
                                  onSubmitEditing={() => {
                                    // Search only when user presses Enter/Submit
                                    if (!alertSearchQuery.trim()) {
                                      setAlertSearchResults([]);
                                      setHasAlertSearched(false);
                                      return;
                                    }
                                    
                                    // Cancel any pending request
                                    if (alertSearchAbortControllerRef.current) {
                                      alertSearchAbortControllerRef.current.abort();
                                    }
                                    
                                    setHasAlertSearched(true);
                                    const abortController = new AbortController();
                                    alertSearchAbortControllerRef.current = abortController;
                                    searchAlertLocation(alertSearchQuery.trim(), abortController.signal);
                                  }}
                                  style={{ color: '#0F2854' }}
                                />
                                {alertSearchQuery.length > 0 && (
                                  <TouchableOpacity
                                    onPress={() => {
                                      // Cancel any pending search request
                                      if (alertSearchAbortControllerRef.current) {
                                        alertSearchAbortControllerRef.current.abort();
                                      }
                                      setAlertSearchQuery('');
                                      setAlertSearchResults([]);
                                      setHasAlertSearched(false);
                                    }}
                                    className="ml-2"
                                  >
                                    <Feather name="x" size={18} color="#4988C4" />
                                  </TouchableOpacity>
                                )}
                                {isAlertSearching && (
                                  <ActivityIndicator size="small" color="#1C4D8D" className="ml-2" />
                                )}
                              </View>
                              
                              {/* Search Results */}
                              {alertSearchResults.length > 0 && (
                                <View className="bg-white rounded-xl border border-gray-200 mt-2 max-h-40 overflow-hidden">
                                  <ScrollView nestedScrollEnabled={true}>
                                    {alertSearchResults.map((result, index) => (
                                      <TouchableOpacity
                                        key={index}
                                        onPress={() => handleAlertSearchResultSelect(result)}
                                        className="px-4 py-3 border-b border-gray-100"
                                      >
                                        <Text className="text-sm text-gray-800" numberOfLines={2}>
                                          {result.display_name}
                                        </Text>
                                      </TouchableOpacity>
                                    ))}
                                  </ScrollView>
                                </View>
                              )}
                              
                              {/* No Results Message */}
                              {hasAlertSearched && !isAlertSearching && alertSearchResults.length === 0 && alertSearchQuery.trim().length > 0 && (
                                <View className="bg-white rounded-xl border border-gray-200 mt-2 px-4 py-3">
                                  <Text className="text-sm text-gray-600 text-center">
                                    Location "{alertSearchQuery}" not found. Please try a different search term.
                                  </Text>
                                </View>
                              )}
                            </View>
                            
                            <View className="rounded-xl overflow-hidden" style={{ height: 250 }}>
                              <MapView
                                ref={alertMapRef}
                                style={{ width: '100%', height: '100%' }}
                                initialRegion={location ? {
                                  latitude: location.latitude,
                                  longitude: location.longitude,
                                  latitudeDelta: 0.05,
                                  longitudeDelta: 0.05,
                                } : {
                                  latitude: 3.139,
                                  longitude: 101.6869,
                                  latitudeDelta: 0.1,
                                  longitudeDelta: 0.1,
                                }}
                                onPress={handleMapPressForAlert}
                                showsUserLocation={true}
                                showsMyLocationButton={false}
                                zoomEnabled={true}
                                zoomControlEnabled={true}
                                scrollEnabled={true}
                              >
                                {newAlertLocation && (
                                  <Marker
                                    coordinate={newAlertLocation}
                                    title="Alert Location"
                                    pinColor="#4988C4"
                                  />
                                )}
                              </MapView>
                            </View>
                          </View>
                          
                          {/* Selected Location Info */}
                          {newAlertLocation && (
                            <View className="bg-white rounded-xl p-3 mb-4" style={{ borderColor: '#4988C4', borderWidth: 1 }}>
                              <View className="flex-row items-start">
                                <Ionicons name="location" size={18} color="#4988C4" style={{ marginTop: 2 }} />
                                <Text className="text-sm ml-2 flex-1" style={{ color: '#0F2854' }} numberOfLines={2}>
                                  {newAlertLocationName || `${newAlertLocation.latitude.toFixed(4)}, ${newAlertLocation.longitude.toFixed(4)}`}
                                </Text>
                              </View>
                            </View>
                          )}
                          
                          {/* Info Note */}
                          <View className="bg-yellow-50 rounded-xl p-3 mb-4 border border-yellow-200">
                            <View className="flex-row items-start">
                              <Ionicons name="information-circle" size={18} color="#F59E0B" />
                              <Text className="text-xs text-yellow-800 ml-2 flex-1">
                                You will receive notifications when dengue cases are detected within approximately 500m of your pinned location.
                              </Text>
                            </View>
                          </View>
                          
                          {/* Create Button */}
                          <TouchableOpacity
                            onPress={handleCreateAlert}
                            disabled={isCreatingAlert || !newAlertName.trim() || !newAlertLocation}
                            className={`rounded-xl py-4 ${(!newAlertName.trim() || !newAlertLocation || isCreatingAlert) ? 'bg-gray-300' : 'bg-[#1C4D8D]'}`}
                            activeOpacity={0.8}
                          >
                            {isCreatingAlert ? (
                              <ActivityIndicator size="small" color="white" />
                            ) : (
                              <Text className="text-white font-bold text-center text-base">Create Alert</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Modal>
                  </View>
                )}
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                {loadingOrganisation ? (
                  <View className="items-center justify-center py-8">
                    <ActivityIndicator size="large" color="#1C4D8D" />
                    <Text className="mt-4 text-sm" style={{ color: 'rgba(15, 40, 84, 0.75)' }}>Loading organisation data...</Text>
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
                        onRegionChangeComplete={handleMapRegionChangeComplete}
                        initialRegion={getInitialRegionFromCompanyLocations() || {
                          latitude: location?.latitude || 0,
                          longitude: location?.longitude || 0,
                          latitudeDelta: 0.01,
                          longitudeDelta: 0.01,
                        }}
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
                {selectedLocation && selectedPrediction && (() => {
                  const locationIndex = getCurrentLocationIndex();
                  const locationsWithPredictions = getLocationsWithPredictions();
                  const canNavigate = locationsWithPredictions.length > 1;
                  
                  return (
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
                      {/* Header with close button and navigation */}
                      <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-1">
                          <Text className="text-lg font-bold text-black mb-1" style={{ fontFamily: 'SF Pro' }}>
                            {selectedLocation.name}
                          </Text>
                          {canNavigate && (
                            <Text className="text-xs text-gray-500">
                              Location {locationIndex.current} of {locationIndex.total}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          onPress={handleCloseDetails}
                          className="ml-2 p-2"
                          activeOpacity={0.7}
                        >
                          <Feather name="x" size={20} color="#6B7280" />
                        </TouchableOpacity>
                      </View>

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

                      {showFactorDetails && selectedPrediction.model1Score !== null && selectedPrediction.model1Score !== undefined && (
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
                      {showFactorDetails && selectedPrediction.model2Score !== null && selectedPrediction.model2Score !== undefined && (
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
                      {showFactorDetails && selectedPrediction.model3Score !== null && 
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

                      {!showFactorDetails && (
                        <TouchableOpacity
                          onPress={() => setShowFactorDetails(true)}
                          className="py-2 mt-2"
                          activeOpacity={0.7}
                        >
                          <Text className="text-sm font-extrabold text-[#1C4D8D] text-right">
                            <Text style={{ fontWeight: 'bold' }}>Display Factor Details</Text>
                          </Text>
                        </TouchableOpacity>
                      )}

                    {/* Navigation buttons */}
                    {canNavigate && (
                      <View className="flex-row items-center justify-center mt-4 pt-3 border-t border-gray-200">
                        <TouchableOpacity
                          onPress={() => handleNavigateLocation('prev')}
                          className="flex-row items-center px-4 py-2 bg-gray-100 rounded-lg mr-2"
                          activeOpacity={0.7}
                        >
                          <Feather name="chevron-left" size={18} color="#4988C4" />
                          <Text className="text-sm font-semibold ml-1" style={{ color: '#1C4D8D' }}>Previous</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleNavigateLocation('next')}
                          className="flex-row items-center px-4 py-2 bg-gray-100 rounded-lg"
                          activeOpacity={0.7}
                        >
                          <Text className="text-sm font-semibold mr-1" style={{ color: '#1C4D8D' }}>Next</Text>
                          <Feather name="chevron-right" size={18} color="#4988C4" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  );
                })()}

                {/* No Prediction Message - Display below map if location is selected but no prediction */}
                {selectedLocation && !selectedPrediction && (
                  <View className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-200">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <Feather name="info" size={20} color="#6B7280" />
                        <Text className="text-sm text-gray-600 ml-2">
                          No prediction available for {selectedLocation.name}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={handleCloseDetails}
                        className="ml-2 p-2"
                        activeOpacity={0.7}
                      >
                        <Feather name="x" size={20} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Location List */}
                <View className="mb-4">
                  <Text className="text-lg font-bold mb-3" style={{ fontFamily: 'SF Pro', color: '#0F2854' }}>
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
                          selectedLocation?.id === loc.id ? 'border-[#4988C4]' : 'border-gray-200'
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
                              <Feather name="map-pin" size={16} color="#4988C4" />
                              <Text className="text-base font-bold ml-2" style={{ fontFamily: 'SF Pro', color: '#0F2854' }}>
                                {loc.name}
                              </Text>
                            </View>
                            {loc.address && (
                              <Text className="text-sm mb-2" style={{ color: 'rgba(15, 40, 84, 0.75)' }}>{loc.address}</Text>
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
        )}
      </View>
      <BottomNav />
    </SafeAreaView>
  );
} 