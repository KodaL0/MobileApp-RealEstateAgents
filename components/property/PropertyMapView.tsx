// components/property/PropertyMapView.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PropertyMapViewProps {
  latitude: number;
  longitude: number;
  title?: string;
  location?: string;
  email?: string;
}

export default function PropertyMapView({
  latitude,
  longitude,
  title,
  location,
  email,
}: PropertyMapViewProps) {
  const [address, setAddress] = useState('Loading address…');

  // Reverse geocode (safe)
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams({
          format: 'json',
          lat: String(latitude),
          lon: String(longitude),
          addressdetails: '1',
          ...(email ? { email } : {}),
        });

        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`);
        const data = await res.json();
        setAddress(data.display_name || location || 'Address not found');
      } catch {
        setAddress(location || 'Address not found');
      }
    })();
  }, [latitude, longitude, email, location]);

  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <Text style={styles.title}>Location Preview</Text>

        <View style={styles.row}>
          <View style={styles.box}>
            <Text style={styles.label}>Latitude</Text>
            <Text style={styles.value}>{latitude.toFixed(6)}</Text>
          </View>

          <View style={styles.box}>
            <Text style={styles.label}>Longitude</Text>
            <Text style={styles.value}>{longitude.toFixed(6)}</Text>
          </View>
        </View>

        <View style={styles.addressBox}>
          <Text style={styles.label}>Address</Text>
          <Text style={styles.address}>{address}</Text>
        </View>

        <Text style={styles.note}>Map temporarily disabled — UI test mode</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 260,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 12,
  },
  placeholder: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    color: '#0F3460',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  box: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  label: {
    fontSize: 11,
    color: '#777',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F3460',
  },
  addressBox: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EEE',
    marginBottom: 10,
  },
  address: {
    fontSize: 13,
    color: '#333',
  },
  note: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
