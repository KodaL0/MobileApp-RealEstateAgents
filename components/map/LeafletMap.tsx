import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import ReactLeafletMap from './ReactLeafletMap';

type Property = {
  id: number;
  title: string;
  price: number;
  location: string;
  latitude: number;
  longitude: number;
  bedrooms: number;
  bathrooms: number;
  size: number;
  images: string[];
  property_status?: string;
  forSale?: boolean;
  propertyType?: string;
};

type LeafletMapProps = {
  properties: Property[];
  center: [number, number];
  zoom: number;
  onMarkerClick?: (property: Property) => void;
  onMapMove?: (center: [number, number], zoom: number) => void;
  selectedPropertyId?: number;
};

const LeafletMap: React.FC<LeafletMapProps> = ({
  properties,
  center,
  zoom,
  onMarkerClick,
  onMapMove,
  selectedPropertyId,
}) => {
  const webViewRef = useRef<WebView>(null);

  // Debug logging
  console.log('🗺️ LeafletMap Debug Info:');
  console.log('Platform:', Platform.OS);
  console.log('Properties count:', properties.length);
  console.log('Center:', center);
  console.log('Zoom:', zoom);
  console.log('Properties sample:', properties.slice(0, 2));

  // Cyprus bounds
  const cyprusBounds = {
    north: 35.7,
    south: 34.5,
    east: 34.6,
    west: 32.2,
  };

  // For web, use React Leaflet directly for better performance
  if (Platform.OS === 'web') {
    console.log('🌐 Using web version (ReactLeafletMap)');
    return (
      <View style={styles.container}>
        <ReactLeafletMap
          properties={properties}
          center={center}
          zoom={zoom}
          onMarkerClick={onMarkerClick}
          onMapMove={onMapMove}
          selectedPropertyId={selectedPropertyId}
        />
      </View>
    );
  }

  console.log('📱 Using mobile WebView version');

  // Generate HTML content for the map (mobile WebView version)
  const generateMapHTML = () => {
    const markersData = properties.map(property => ({
      id: property.id,
      lat: property.latitude,
      lng: property.longitude,
      title: property.title,
      price: property.price,
      forSale: property.forSale || property.property_status === 'for_sale',
      image: property.images[0] || '',
      location: property.location,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      size: property.size,
      propertyType: property.propertyType,
    }));

    console.log('📍 Generated markers data:', markersData.length, 'markers');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Property Map</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body { margin: 0; padding: 0; background: #f0f0f0; }
        #map { 
            height: 100vh; 
            width: 100vw;
        }
        #debug {
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            max-width: 300px;
        }
        .custom-marker {
            background: #0F3460;
            color: white;
            border: 2px solid white;
            border-radius: 12px;
            padding: 4px 8px;
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            font-weight: bold;
            text-align: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.4);
            cursor: pointer;
            min-width: 60px;
            transition: all 0.3s ease;
        }
        .custom-marker:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(0,0,0,0.5);
        }
        .custom-marker.selected {
            background: #FF6B6B;
            transform: scale(1.1) translateY(-2px);
            box-shadow: 0 6px 12px rgba(255,107,107,0.4);
        }
        
        /* Property Card in Popup - Mobile Optimized */
        .property-card {
            max-width: 280px;
            font-family: 'Arial', sans-serif;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .property-image {
            width: 100%;
            height: 150px;
            object-fit: cover;
            background: #f0f0f0;
        }
        .property-content {
            padding: 12px;
        }
        .property-status {
            display: inline-block;
            padding: 3px 6px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            color: white;
            margin-bottom: 6px;
        }
        .status-sale { background: #28a745; }
        .status-rent { background: #007bff; }
        .property-title {
            font-weight: bold;
            font-size: 16px;
            color: #0F3460;
            margin-bottom: 4px;
            line-height: 1.3;
        }
        .property-price {
            font-size: 18px;
            font-weight: bold;
            color: #0F3460;
            margin-bottom: 6px;
        }
        .property-location {
            font-size: 13px;
            color: #666;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
        }
        .property-features {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 6px 0;
            border-top: 1px solid #f0f0f0;
            border-bottom: 1px solid #f0f0f0;
        }
        .feature-item {
            text-align: center;
            flex: 1;
        }
        .feature-value {
            font-size: 14px;
            font-weight: bold;
            color: #0F3460;
            display: block;
        }
        .feature-label {
            font-size: 10px;
            color: #666;
            margin-top: 2px;
        }
        .property-type {
            background: #f8f9fa;
            padding: 4px 8px;
            border-radius: 16px;
            font-size: 11px;
            color: #0F3460;
            text-transform: capitalize;
            display: inline-block;
        }
        .view-details-btn {
            background: #0F3460;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            width: 100%;
            margin-top: 10px;
            font-size: 13px;
            transition: background 0.3s ease;
        }
        .view-details-btn:hover {
            background: #1a4d75;
        }
    </style>
</head>
<body>
    <div id="debug">
        🗺️ Map Debug Info:<br/>
        Loading: <span id="loading">true</span><br/>
        Map center: <span id="center">[${center[0]}, ${center[1]}]</span><br/>
        Map zoom: <span id="zoom">${zoom}</span><br/>
        Properties count: <span id="propCount">${markersData.length}</span><br/>
        Selected property: <span id="selected">${selectedPropertyId || 'undefined'}</span>
    </div>
    <div id="map"></div>
    
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        console.log('🗺️ Map script starting...');
        console.log('Leaflet loaded:', typeof L !== 'undefined');
        console.log('Properties data:', ${JSON.stringify(markersData)});
        
        // Cyprus bounds
        const cyprusBounds = ${JSON.stringify(cyprusBounds)};
        
        // Initialize map
        console.log('📍 Initializing map with center:', [${center[0]}, ${center[1]}]);
        const map = L.map('map', {
            center: [${center[0]}, ${center[1]}],
            zoom: ${zoom},
            maxBounds: [[cyprusBounds.south, cyprusBounds.west], [cyprusBounds.north, cyprusBounds.east]],
            maxBoundsViscosity: 1.0,
            minZoom: 8,
            maxZoom: 18
        });
        
        console.log('📍 Map initialized:', map);
        
        // Add tile layer
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        });
        tileLayer.addTo(map);
        console.log('🗺️ Tile layer added');
        
        // Update debug info
        document.getElementById('loading').textContent = 'false';
        
        // Custom marker function - now shows size in sqm instead of price
        function createCustomMarker(size, forSale, isSelected = false) {
            const sizeText = \`\${size}m²\`;
            const className = isSelected ? 'custom-marker selected' : 'custom-marker';
            
            return L.divIcon({
                html: \`<div class="\${className}">\${sizeText}</div>\`,
                className: 'custom-marker-wrapper',
                iconSize: [60, 30],
                iconAnchor: [30, 30]
            });
        }
        
        // Add markers
        const markers = {};
        const properties = ${JSON.stringify(markersData)};
        
        console.log('🎯 Adding markers for properties:', properties.length);
        
        properties.forEach((property, index) => {
            console.log(\`📍 Adding marker \${index + 1}: \${property.title} at [\${property.lat}, \${property.lng}]\`);
            
            const marker = L.marker([property.lat, property.lng], {
                icon: createCustomMarker(property.size, property.forSale, property.id === ${selectedPropertyId})
            }).addTo(map);
            
            markers[property.id] = marker;
            
            // Create detailed property card popup content
            const popupContent = \`
                <div class="property-card">
                    \${property.image ? \`<img src="\${property.image}" alt="\${property.title}" class="property-image" onerror="this.style.display='none'">\` : \`<div class="property-image" style="background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #666; font-size: 12px;">No Image</div>\`}
                    <div class="property-content">
                        <div class="property-status \${property.forSale ? 'status-sale' : 'status-rent'}">
                            \${property.forSale ? 'For Sale' : 'For Rent'}
                        </div>
                        <div class="property-title">\${property.title}</div>
                        <div class="property-price">€\${property.price.toLocaleString()}\${property.forSale ? '' : '/month'}</div>
                        <div class="property-location">
                            📍 \${property.location}
                        </div>
                        <div class="property-features">
                            <div class="feature-item">
                                <span class="feature-value">\${property.bedrooms}</span>
                                <div class="feature-label">Bedrooms</div>
                            </div>
                            <div class="feature-item">
                                <span class="feature-value">\${property.bathrooms}</span>
                                <div class="feature-label">Bathrooms</div>
                            </div>
                            <div class="feature-item">
                                <span class="feature-value">\${property.size}m²</span>
                                <div class="feature-label">Size</div>
                            </div>
                        </div>
                        \${property.propertyType ? \`<div class="property-type">\${property.propertyType}</div>\` : ''}
                        <button class="view-details-btn" onclick="viewPropertyDetails(\${property.id})">
                            View Details
                        </button>
                    </div>
                </div>
            \`;
            
            marker.bindPopup(popupContent, {
                maxWidth: 300,
                className: 'custom-popup'
            });
            
            // Handle marker click
            marker.on('click', () => {
                console.log('🎯 Marker clicked:', property.title);
                window.ReactNativeWebView?.postMessage(JSON.stringify({
                    type: 'markerClick',
                    property: property
                }));
            });
        });
        
        console.log('✅ All markers added successfully');
        
        // Global function for view details button
        window.viewPropertyDetails = function(propertyId) {
            console.log('👁️ View details clicked for property:', propertyId);
            window.ReactNativeWebView?.postMessage(JSON.stringify({
                type: 'viewDetails',
                propertyId: propertyId
            }));
        };

        // Handle map move events
        map.on('moveend', () => {
            const center = map.getCenter();
            const zoom = map.getZoom();
            
            document.getElementById('center').textContent = \`[\${center.lat.toFixed(4)}, \${center.lng.toFixed(4)}]\`;
            document.getElementById('zoom').textContent = zoom;
            
            window.ReactNativeWebView?.postMessage(JSON.stringify({
                type: 'mapMove',
                center: [center.lat, center.lng],
                zoom: zoom
            }));
        });

        // Listen for messages from React Native
        document.addEventListener('message', (event) => {
            console.log('📨 Received message:', event.data);
            const data = JSON.parse(event.data);
            
            if (data.type === 'updateSelectedMarker') {
                const propertyId = data.propertyId;
                document.getElementById('selected').textContent = propertyId || 'undefined';
                
                properties.forEach(property => {
                    const marker = markers[property.id];
                    if (marker) {
                        const isSelected = property.id === propertyId;
                        marker.setIcon(createCustomMarker(property.size, property.forSale, isSelected));
                    }
                });
            } else if (data.type === 'flyToProperty') {
                console.log('🎯 Flying to property:', data);
                map.flyTo([data.lat, data.lng], data.zoom || 16, {
                    duration: 1.5
                });
            }
        });
        
        console.log('🎉 Map setup complete!');
    </script>
</body>
</html>
    `;
  };

  // Handle messages from WebView
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📨 WebView message received:', data);

      if (data.type === 'markerClick' && onMarkerClick) {
        console.log('🎯 Calling onMarkerClick with:', data.property);
        onMarkerClick(data.property);
      } else if (data.type === 'mapMove' && onMapMove) {
        console.log('🗺️ Calling onMapMove with:', data.center, data.zoom);
        onMapMove(data.center, data.zoom);
      } else if (data.type === 'viewDetails') {
        console.log('👁️ View details requested for property:', data.propertyId);
        // Handle view details - you can navigate to property details page here
        const property = properties.find(p => p.id === data.propertyId);
        if (property && onMarkerClick) {
          onMarkerClick(property);
        }
      }
    } catch (error) {
      console.error('❌ Error parsing WebView message:', error);
    }
  };

  // Function to fly to a specific property
  const flyToProperty = (property: Property) => {
    webViewRef.current?.postMessage(JSON.stringify({
      type: 'flyToProperty',
      lat: property.latitude,
      lng: property.longitude,
      zoom: 16
    }));
  };

  // Function to update selected marker
  const updateSelectedMarker = (propertyId: number) => {
    webViewRef.current?.postMessage(JSON.stringify({
      type: 'updateSelectedMarker',
      propertyId: propertyId
    }));
  };

  // Function to set map view
  const setMapView = (center: [number, number], zoom: number) => {
    webViewRef.current?.postMessage(JSON.stringify({
      type: 'setView',
      center: center,
      zoom: zoom
    }));
  };

  // Update selected marker when selectedPropertyId changes
  useEffect(() => {
    if (selectedPropertyId && webViewRef.current) {
      console.log('🎯 Updating selected marker:', selectedPropertyId);
      updateSelectedMarker(selectedPropertyId);
    }
  }, [selectedPropertyId]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: generateMapHTML() }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onError={(syntheticEvent) => {
          console.error('❌ WebView error:', syntheticEvent.nativeEvent);
        }}
        onLoadStart={() => {
          console.log('📱 WebView started loading');
        }}
        onLoadEnd={() => {
          console.log('✅ WebView finished loading');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});

export default LeafletMap; 