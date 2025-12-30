import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export async function fetchCurrentUser() {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No token found');

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

  const res = await fetch(`${API_URL}/users/${userId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error('Failed to fetch user');
  const data = await res.json();
  return data.user;
}

export async function updateUserProfile(fields) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No token found');

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

  const res = await fetch(`${API_URL}/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to update profile');
  }
  const data = await res.json();
  return data.user;
}

// Prediction API functions
export async function predictDengueRisk(latitude, longitude, userId = null) {
  const res = await fetch(`${API_URL}/api/predict/public`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lat: latitude,
      lon: longitude,
      userId: userId
    }),
  });
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Prediction failed');
  }
  
  const data = await res.json();
  return data.prediction;
}

export async function checkPredictionServiceHealth() {
  const res = await fetch(`${API_URL}/api/predict/health`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
    throw new Error('Health check failed');
  }
  
  const data = await res.json();
  return data.services;
}

// Company API functions
export async function getCompanyLocations(companyId) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No token found');

  const res = await fetch(`${API_URL}/api/predict/company/${companyId}/locations`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch company locations');
  }
  
  const data = await res.json();
  return data.locations;
}

export async function getCompanyPredictions(companyId, companyLocationId = null, limit = 50, offset = 0) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No token found');

  let url = `${API_URL}/api/predict/company/${companyId}?limit=${limit}&offset=${offset}`;
  if (companyLocationId) {
    url += `&companyLocationId=${companyLocationId}`;
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch company predictions');
  }
  
  const data = await res.json();
  return data.predictions;
}

// Get nearby dengue cases within 2km radius
export async function getNearbyDengueCases(latitude, longitude, tolerance = 0.018) {
  const res = await fetch(
    `${API_URL}/dengue-data/nearby?latitude=${latitude}&longitude=${longitude}&tolerance=${tolerance}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch nearby dengue cases');
  }
  
  const data = await res.json();
  return data;
}

// Notification API functions
export async function getNotifications(limit = 50, offset = 0, unreadOnly = false, readStatus = null, type = null) {
  // readStatus can be: 'read', 'unread', null, or undefined
  // type can be: any notification type string, null, or undefined
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No token found');

  let url = `${API_URL}/api/notifications?limit=${limit}&offset=${offset}`;
  if (unreadOnly) {
    url += `&unreadOnly=true`;
  }
  if (readStatus && readStatus !== null && readStatus !== undefined) {
    url += `&readStatus=${readStatus}`;
  }
  if (type && type !== null && type !== undefined) {
    url += `&type=${type}`;
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch notifications');
  }
  
  const data = await res.json();
  return data;
}

export async function getUnreadNotificationCount() {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No token found');

  const res = await fetch(`${API_URL}/api/notifications/unread-count`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch unread count');
  }
  
  const data = await res.json();
  return data.count;
}

export async function markNotificationAsRead(notificationId) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No token found');

  const res = await fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to mark notification as read');
  }
  
  const data = await res.json();
  return data;
}

export async function markAllNotificationsAsRead() {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No token found');

  const res = await fetch(`${API_URL}/api/notifications/read-all`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to mark all notifications as read');
  }
  
  const data = await res.json();
  return data;
}

// Company API functions
export async function getCompanySettings(companyId) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No token found');

  const res = await fetch(`${API_URL}/companies/${companyId}/getcompanybyId`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch company settings');
  }
  
  const data = await res.json();
  return data;
}

// Get company details by ID (for organisation details page)
export async function getCompanyDetails(companyId) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No token found');

  const res = await fetch(`${API_URL}/companies/${companyId}/getcompanybyId`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch company details');
  }
  
  const data = await res.json();
  return data;
}

// Get latest one day dengue cases (activeCases !== 0, totalCases === null)
export async function getLatestDengueCases() {
  try {
    // Get today's date and yesterday's date
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Format dates for API
    const startDate = yesterday.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];
    
    // Fetch data for the last day with a high limit to get all records
    const res = await fetch(
      `${API_URL}/dengue-data?startDate=${startDate}&endDate=${endDate}&limit=1000`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch dengue cases');
    }
    
    const data = await res.json();
    
    // Filter: activeCases !== 0 AND totalCases === null AND has latitude/longitude
    const filteredCases = (data.data || []).filter((case_) => 
      case_.activeCases !== null && 
      case_.activeCases !== 0 && 
      case_.totalCases === null &&
      case_.latitude !== null &&
      case_.longitude !== null
    );
    
    return filteredCases;
  } catch (error) {
    console.error('Error fetching latest dengue cases:', error);
    throw error;
  }
}

// Location Alert API functions
export async function getUserLocationAlerts() {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No token found');

  const res = await fetch(`${API_URL}/api/location-alerts`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch location alerts');
  }
  
  const data = await res.json();
  return data.alerts;
}

export async function createLocationAlert(name, latitude, longitude) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No token found');

  const res = await fetch(`${API_URL}/api/location-alerts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, latitude, longitude }),
  });
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to create location alert');
  }
  
  const data = await res.json();
  return data.alert;
}

export async function deleteLocationAlert(alertId) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No token found');

  const res = await fetch(`${API_URL}/api/location-alerts/${alertId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete location alert');
  }
  
  return true;
}

export async function toggleLocationAlert(alertId, isActive) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No token found');

  const res = await fetch(`${API_URL}/api/location-alerts/${alertId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isActive }),
  });
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to toggle location alert');
  }
  
  const data = await res.json();
  return data.alert;
}