import React, { useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';

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

type ReactLeafletMapProps = {
  properties: Property[];
  center: [number, number];
  zoom: number;
  onMarkerClick?: (property: Property) => void;
  onMapMove?: (center: [number, number], zoom: number) => void;
  selectedPropertyId?: number;
};

// Web-only component using HTML/CSS/JS approach instead of React Leaflet
const ReactLeafletMap: React.FC<ReactLeafletMapProps> = ({
  properties,
  center,
  zoom,
  onMarkerClick,
  onMapMove,
  selectedPropertyId,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  // Debug logging
  console.log('🌐 ReactLeafletMap Debug Info:');
  console.log('Platform:', Platform.OS);
  console.log('Properties count:', properties.length);
  console.log('Center:', center);
  console.log('Zoom:', zoom);
  console.log('Map container ref:', mapContainerRef.current);

  // Cyprus bounds
  const cyprusBounds = useMemo(() => ({
    north: 35.7,
    south: 34.5,
    east: 34.6,
    west: 32.2,
  }), []);

  useEffect(() => {
    console.log('🎯 ReactLeafletMap useEffect triggered');
    console.log('Platform check:', Platform.OS);
    console.log('mapContainerRef.current:', mapContainerRef.current);

    if (Platform.OS !== 'web' || !mapContainerRef.current) {
      console.log('❌ Early return - not web or no container');
      return;
    }

    if (mapRef.current) {
      console.log('🧹 Removing previous iframe before creating a new one');
      mapRef.current.remove();
    }

    console.log('✅ Creating map iframe...');

    // Generate HTML content for the map
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

      console.log('📍 Generated markers data for HTML:', markersData.length);

      return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <style>
                body, html { margin: 0; padding: 0; height: 100%; background: #f0f0f0; }
                #map { 
                    height: 100%; 
                    width: 100%;
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
                    transform: translateY(-3px);
                    box-shadow: 0 8px 16px rgba(0,0,0,0.5);
                }
                .custom-marker.selected {
                    background: #FF6B6B;
                    transform: scale(1.15) translateY(-3px);
                    box-shadow: 0 8px 16px rgba(255,107,107,0.5);
                }
                
                /* Property Card in Popup */
                .property-card {
                    max-width: 320px;
                    font-family: 'Arial', sans-serif;
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .property-image {
                    width: 100%;
                    height: 180px;
                    object-fit: cover;
                    background: #f0f0f0;
                }
                .property-content {
                    padding: 16px;
                }
                .property-status {
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 16px;
                    font-size: 12px;
                    font-weight: bold;
                    color: white;
                    margin-bottom: 8px;
                }
                .status-sale { background: #28a745; }
                .status-rent { background: #007bff; }
                .property-title {
                    font-weight: bold;
                    font-size: 18px;
                    color: #0F3460;
                    margin-bottom: 4px;
                    line-height: 1.3;
                }
                .property-price {
                    font-size: 20px;
                    font-weight: bold;
                    color: #0F3460;
                    margin-bottom: 8px;
                }
                .property-location {
                    font-size: 14px;
                    color: #666;
                    margin-bottom: 12px;
                    display: flex;
                    align-items: center;
                }
                .property-features {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 12px;
                    padding: 8px 0;
                    border-top: 1px solid #f0f0f0;
                    border-bottom: 1px solid #f0f0f0;
                }
                .feature-item {
                    text-align: center;
                    flex: 1;
                }
                .feature-value {
                    font-size: 16px;
                    font-weight: bold;
                    color: #0F3460;
                    display: block;
                }
                .feature-label {
                    font-size: 12px;
                    color: #666;
                    margin-top: 2px;
                }
                .property-type {
                    background: #f8f9fa;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    color: #0F3460;
                    text-transform: capitalize;
                    display: inline-block;
                }
                .view-details-btn {
                    background: #0F3460;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: bold;
                    cursor: pointer;
                    width: 100%;
                    margin-top: 12px;
                    transition: background 0.3s ease;
                }
                .view-details-btn:hover {
                    background: #1a4d75;
                }
            </style>
        </head>
        <body>
            <!-- Debug overlay will now also show event counter -->
            <div id="debug">
                🗺️ Map Debug Info:<br/>
                Loading: <span id="loading">true</span><br/>
                Map center: <span id="center">[${center[0]}, ${center[1]}]</span><br/>
                Map zoom: <span id="zoom">${zoom}</span><br/>
                Properties count: <span id="propCount">${markersData.length}</span><br/>
                Selected property: <span id="selected">${selectedPropertyId || 'undefined'}</span><br/>
                Event counter: <span id="evtCounter">0</span>
            </div>
            <div id="map"></div>
            
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <script>
                console.log('🗺️ Map script starting...');
                console.log('Leaflet loaded:', typeof L !== 'undefined');
                console.log('Properties data:', ${JSON.stringify(markersData)});
                
                // Cyprus bounds
                const cyprusBounds = ${JSON.stringify(cyprusBounds)};
                
                // All properties array
                const allProperties = ${JSON.stringify(markersData)};
                const properties = allProperties; // alias for legacy code
                if (allProperties.length === 0) {
                    console.warn('No properties passed in – creating 23 fake listings');
                    for (let i = 1; i <= 23; i++) {
                        allProperties.push({
                            id: i,
                            lat: 35.1 + (Math.random() - 0.5) * 0.2,
                            lng: 33.4 + (Math.random() - 0.5) * 0.4,
                            title: 'Sample Listing #' + i,
                            price: Math.floor(Math.random()*900000)+100000,
                            forSale: Math.random()>0.5,
                            image: '',
                            location: 'Cyprus',
                            bedrooms: Math.floor(Math.random()*4)+1,
                            bathrooms: Math.floor(Math.random()*2)+1,
                            size: Math.floor(Math.random()*150)+50,
                            propertyType: 'apartment'
                        });
                    }
                }

                // update debug overlay with final count once data ready
                document.getElementById && document.getElementById('propCount') && (document.getElementById('propCount').textContent = allProperties.length);

                let eventCounter = 0; // counts marker clicks
                
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
                
                // We will only create TWO markers at fixed positions in Cyprus
                const dummyCoords = [
                    { id: 'cy1', lat: 35.1856, lng: 33.3823 }, // Nicosia
                    { id: 'cy2', lat: 34.6851, lng: 33.0432 }  // Limassol
                ];

                const markers = {};

                // Helper to generate popup HTML for a property (using string concatenation to avoid nested template issues)
                function buildPopupHtml(prop) {
                    return '<div class="property-card">' +
                        (prop.image ? '<img src="' + prop.image + '" class="property-image" onerror="this.style.display=\'none\'">'
                                    : '<div class="property-image" style="background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#666;">No Image</div>') +
                        '<div class="property-content">' +
                            '<div class="property-status ' + (prop.forSale ? 'status-sale' : 'status-rent') + '">' + (prop.forSale ? 'For Sale' : 'For Rent') + '</div>' +
                            '<div class="property-title">' + prop.title + '</div>' +
                            '<div class="property-price">€' + prop.price.toLocaleString() + (prop.forSale ? '' : '/month') + '</div>' +
                            '<div class="property-location">📍 ' + prop.location + '</div>' +
                            '<div class="property-features">' +
                                '<div class="feature-item"><span class="feature-value">' + prop.bedrooms + '</span><div class="feature-label">Bedrooms</div></div>' +
                                '<div class="feature-item"><span class="feature-value">' + prop.bathrooms + '</span><div class="feature-label">Bathrooms</div></div>' +
                                '<div class="feature-item"><span class="feature-value">' + prop.size + 'm²</span><div class="feature-label">Size</div></div>' +
                            '</div>' +
                            (prop.propertyType ? '<div class="property-type">' + prop.propertyType + '</div>' : '') +
                            '<button class="view-details-btn" onclick="viewPropertyDetails(' + prop.id + ')">View Details</button>' +
                        '</div></div>';
                }

                // current property index
                let currentIndex = 0;

                const boundsArray = [];
                dummyCoords.forEach((d, idx) => {
                    // pick initial property
                    const initProp = allProperties[currentIndex % allProperties.length];
                    currentIndex++;

                    // ensure non-zero size
                    if (!initProp.size || initProp.size <= 0) initProp.size = Math.floor(Math.random()*170)+80;

                    const marker = L.marker([d.lat, d.lng], {
                        icon: createCustomMarker(initProp.size || Math.floor(Math.random()*150)+50, initProp.forSale, false)
                    }).addTo(map);

                    markers[d.id] = marker;

                    marker.bindPopup(buildPopupHtml(initProp), { maxWidth: 350 });

                    marker.on('click', () => {
                        eventCounter++;
                        document.getElementById('evtCounter').textContent = eventCounter;

                        const prop = allProperties[eventCounter % allProperties.length];

                        marker.setPopupContent(buildPopupHtml(prop));
                        marker.setIcon(createCustomMarker(prop.size || Math.floor(Math.random()*150)+50, prop.forSale, false));
                        marker.openPopup();

                        window.parent.postMessage({
                            type: 'markerClick',
                            property: prop,
                            eventCounter: eventCounter
                        }, '*');
                    });

                    boundsArray.push([d.lat, d.lng]);
                });

                console.log('✅ Dummy markers added successfully');
                
                // zoom map so both dummy markers are visible
                if (boundsArray.length === dummyCoords.length) {
                    const b = L.latLngBounds(boundsArray);
                    map.fitBounds(b.pad(0.2));
                }

                // Handle map move events
                map.on('moveend', () => {
                    const center = map.getCenter();
                    const zoom = map.getZoom();
                    
                    document.getElementById('center').textContent = \`[\${center.lat.toFixed(4)}, \${center.lng.toFixed(4)}]\`;
                    document.getElementById('zoom').textContent = zoom;
                    
                    window.parent.postMessage({
                        type: 'mapMove',
                        center: [center.lat, center.lng],
                        zoom: zoom
                    }, '*');
                });

                // Listen for messages from parent
                window.addEventListener('message', (event) => {
                    console.log('📨 Received message:', event.data);
                    
                    if (event.data.type === 'updateSelectedMarker') {
                        const propertyId = event.data.propertyId;
                        document.getElementById('selected').textContent = propertyId || 'undefined';
                        
                        properties.forEach(property => {
                            const marker = markers[property.id];
                            if (marker) {
                                const isSelected = property.id === propertyId;
                                marker.setIcon(createCustomMarker(property.size, property.forSale, isSelected));
                            }
                        });
                    } else if (event.data.type === 'flyToProperty') {
                        console.log('🎯 Flying to property:', event.data);
                        map.flyTo([event.data.lat, event.data.lng], event.data.zoom || 16, {
                            duration: 1.5
                        });
                    } else if (event.data.type === 'viewDetails') {
                        console.log('👁️ View details requested for property:', event.data.propertyId);
                        // Handle view details - you can navigate to property details page here
                        const property = properties.find(p => p.id === event.data.propertyId);
                        if (property && onMarkerClick) {
                            onMarkerClick(property);
                        }
                    }
                });
                
                console.log('🎉 Map setup complete!');
            </script>
        </body>
        </html>
      `;
    };

    // Create iframe for the map
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    
    console.log('📄 Setting iframe content...');
    iframe.srcdoc = generateMapHTML();

    // Handle messages from iframe
    const handleMessage = (event: MessageEvent) => {
      console.log('📨 Parent received message:', event.data);
      if (event.data.type === 'markerClick' && onMarkerClick) {
        console.log('🎯 Calling onMarkerClick with:', event.data.property);
        onMarkerClick(event.data.property);
      } else if (event.data.type === 'mapMove' && onMapMove) {
        console.log('🗺️ Calling onMapMove with:', event.data.center, event.data.zoom);
        onMapMove(event.data.center, event.data.zoom);
      } else if (event.data.type === 'viewDetails') {
        console.log('👁️ View details requested for property:', event.data.propertyId);
        // Handle view details - you can navigate to property details page here
        const property = properties.find(p => p.id === event.data.propertyId);
        if (property && onMarkerClick) {
          onMarkerClick(property);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    console.log('🔗 Appending iframe to container...');
    const container = mapContainerRef.current;
    container.appendChild(iframe);
    mapRef.current = iframe;

    console.log('✅ Map setup complete in useEffect');

    return () => {
      console.log('🧹 Cleaning up ReactLeafletMap');
      window.removeEventListener('message', handleMessage);
      if (container && iframe && container.contains(iframe)) {
        container.removeChild(iframe);
      }
    };
  }, [properties, center, zoom, selectedPropertyId, onMarkerClick, onMapMove, cyprusBounds]);

  // Methods to control the map
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    if (mapRef.current && selectedPropertyId) {
      console.log('🎯 Updating selected marker:', selectedPropertyId);
      mapRef.current.contentWindow?.postMessage({
        type: 'updateSelectedMarker',
        propertyId: selectedPropertyId
      }, '*');
    }
  }, [selectedPropertyId]);

  // If not web platform, return null
  if (Platform.OS !== 'web') {
    console.log('❌ Not web platform, returning null');
    return null;
  }

  console.log('🎨 Rendering ReactLeafletMap container');

  return (
    <div 
      ref={mapContainerRef}
      style={{ 
        width: '100%', 
        height: '100%',
        background: '#f0f0f0',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    />
  );
};

export default ReactLeafletMap; 