import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React Leaflet
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

interface PropertyMapViewProps {
  latitude: number;
  longitude: number;
  title?: string;
  location?: string;
  email?: string;
}

// Map Panner component - same as web version
const PanTo: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 13, { animate: false });
  }, [lat, lng, map]);
  return null;
};

export default function PropertyMapView({
  latitude,
  longitude,
  title,
  location,
  email,
}: PropertyMapViewProps) {
  const [address, setAddress] = useState('Loading address…');

  // Reverse-geocode current coords - same as web version
  useEffect(() => {
    (async () => {
      const params = new URLSearchParams({
        format: 'json',
        lat: latitude.toString(),
        lon: longitude.toString(),
        addressdetails: '1',
        ...(email ? { email } : {})
      });
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`);
        const data = await res.json();
        setAddress(data.display_name || location || 'Address not found');
      } catch {
        setAddress(location || 'Address not found');
      }
    })();
  }, [latitude, longitude, email, location]);

  // For web platform, use react-leaflet directly
  if (Platform.OS === 'web') {
    return (
      <div style={{ width: '100%', height: '300px', borderRadius: '12px', overflow: 'hidden' }}>
        <MapContainer
          center={[latitude, longitude]}
          zoom={13}
          scrollWheelZoom={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <PanTo lat={latitude} lng={longitude} />
          <Marker position={[latitude, longitude] as [number, number]}>
            <Popup>{address}</Popup>
          </Marker>
        </MapContainer>
      </div>
    );
  }

  // For native platforms, show a placeholder or use a native map component
  // For now, we'll show coordinates as fallback
  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <View style={styles.placeholderContent}>
          <View style={styles.coordinateRow}>
            <View style={styles.coordinateItem}>
              <View style={styles.coordinateLabel}>Latitude</View>
              <View style={styles.coordinateValue}>{latitude.toFixed(6)}</View>
            </View>
            <View style={styles.coordinateItem}>
              <View style={styles.coordinateLabel}>Longitude</View>
              <View style={styles.coordinateValue}>{longitude.toFixed(6)}</View>
            </View>
          </View>
          {address && (
            <View style={styles.addressContainer}>
              <View style={styles.addressLabel}>Address</View>
              <View style={styles.addressValue}>{address}</View>
            </View>
          )}
          <View style={styles.note}>
            Map view available on web platform
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  placeholderContent: {
    width: '100%',
    maxWidth: 400,
  },
  coordinateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  coordinateItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  coordinateLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  coordinateValue: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#0F3460',
  },
  addressContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  addressLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  addressValue: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  note: {
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

