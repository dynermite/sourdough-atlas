import { useEffect, useRef, useState } from "react";
import type { Restaurant } from "@shared/schema";

// Import Leaflet CSS
const leafletCSS = `
  .leaflet-container {
    height: 100%;
    width: 100%;
    font: 12px/1.5 "Helvetica Neue", Arial, Helvetica, sans-serif;
    cursor: grab !important;
  }
  .leaflet-container:active {
    cursor: grabbing !important;
  }
  .leaflet-dragging .leaflet-container {
    cursor: grabbing !important;
  }
  .leaflet-clickable {
    cursor: pointer !important;
  }
  .leaflet-popup-content-wrapper {
    background: white;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  }
  .leaflet-popup-content {
    margin: 16px;
    max-width: 300px;
  }
  .leaflet-control-zoom a {
    background: white;
    color: #666;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  .leaflet-control-zoom a:hover {
    background: #f0f0f0;
  }
  /* Ensure proper interaction states */
  .leaflet-interactive {
    cursor: pointer !important;
  }
  .leaflet-marker-icon {
    cursor: pointer !important;
  }
  /* Override any conflicting styles */
  .leaflet-container * {
    box-sizing: border-box;
  }
  /* Map container specific styles */
  .map-container {
    cursor: grab !important;
    user-select: none;
  }
  .map-container:active {
    cursor: grabbing !important;
  }
  /* Ensure dragging works properly */
  .leaflet-drag-target {
    cursor: grabbing !important;
  }
  /* Prevent markers from interfering with map cursor */
  .leaflet-marker-pane {
    pointer-events: auto;
  }
  .leaflet-tile-pane {
    cursor: inherit !important;
  }
  .leaflet-overlay-pane {
    cursor: inherit !important;
  }
  /* Ensure map background always shows grab cursor */
  .leaflet-container .leaflet-tile {
    cursor: inherit !important;
  }
`;

interface InteractiveMapProps {
  restaurants: Restaurant[];
  onRestaurantSelect?: (restaurant: Restaurant) => void;
}

export default function InteractiveMap({ restaurants, onRestaurantSelect }: InteractiveMapProps) {
  const mapRef = useRef<any>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [currentZoom, setCurrentZoom] = useState(5);
  const [visibleRestaurants, setVisibleRestaurants] = useState<Restaurant[]>([]);

  // Removed custom navigation controls for better UX

  const updateVisibleRestaurants = async (map: any, zoom: number) => {
    if (!map) return;
    
    const bounds = map.getBounds();
    const mapBounds = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
      zoom: zoom
    };

    try {
      // Fetch restaurants within current map bounds (includes auto-discovery)
      const response = await fetch(`/api/restaurants/bounds?` + new URLSearchParams({
        north: mapBounds.north.toString(),
        south: mapBounds.south.toString(),
        east: mapBounds.east.toString(),
        west: mapBounds.west.toString(),
        zoom: mapBounds.zoom.toString()
      }));
      
      if (response.ok) {
        const boundsRestaurants = await response.json();
        setVisibleRestaurants(boundsRestaurants);
        addRestaurantMarkers(map, boundsRestaurants, zoom);
        
        // Auto-refresh every 5 seconds if discovery is active and few restaurants found
        if (zoom >= 8 && boundsRestaurants.length < 3) {
          setTimeout(async () => {
            try {
              const refreshResponse = await fetch(`/api/restaurants/bounds?` + new URLSearchParams({
                north: mapBounds.north.toString(),
                south: mapBounds.south.toString(),
                east: mapBounds.east.toString(),
                west: mapBounds.west.toString(),
                zoom: mapBounds.zoom.toString()
              }));
              if (refreshResponse.ok) {
                const refreshedRestaurants = await refreshResponse.json();
                if (refreshedRestaurants.length > boundsRestaurants.length) {
                  setVisibleRestaurants(refreshedRestaurants);
                  addRestaurantMarkers(map, refreshedRestaurants, zoom);
                }
              }
            } catch (error) {
              console.error('Auto-refresh failed:', error);
            }
          }, 5000);
        }
      } else {
        // Fallback to client-side filtering
        const visible = restaurants.filter(restaurant => {
          const lat = restaurant.latitude || 39.8283;
          const lng = restaurant.longitude || -98.5795;
          return bounds.contains([lat, lng]);
        });
        setVisibleRestaurants(visible);
        addRestaurantMarkers(map, visible, zoom);
      }
    } catch (error) {
      console.error('Error fetching restaurants by bounds:', error);
      // Fallback to client-side filtering
      const visible = restaurants.filter(restaurant => {
        const lat = restaurant.latitude || 39.8283;
        const lng = restaurant.longitude || -98.5795;
        return bounds.contains([lat, lng]);
      });
      setVisibleRestaurants(visible);
      addRestaurantMarkers(map, visible, zoom);
    }
  };

  const addRestaurantMarkers = (map: any, restaurantsToShow: Restaurant[], zoom: number) => {
    const L = (window as any).L;
    
    // Clear existing markers
    markersRef.current.forEach(marker => map.removeLayer(marker));
    markersRef.current = [];

    // Show markers at lower zoom levels for better initial experience
    if (zoom < 5) {
      // At very low zoom (continent level), don't show restaurants
      return;
    }

    if (!restaurantsToShow || restaurantsToShow.length === 0) {
      return; // Exit early if no restaurants to show
    }

    restaurantsToShow.forEach((restaurant) => {
      const lat = restaurant.latitude || 39.8283;
      const lng = restaurant.longitude || -98.5795;

      // Scale marker size based on zoom (better visibility at all levels)
      const markerSize = Math.max(20, Math.min(36, zoom * 4));

      // Create custom orange pizza icon
      const pizzaIcon = L.divIcon({
        className: 'custom-pizza-marker',
        html: `<div style="
          background-color: #ea580c;
          border-radius: 50%;
          width: ${markerSize}px;
          height: ${markerSize}px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: ${markerSize * 0.5}px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border: 2px solid white;
          transition: all 0.2s ease;
          pointer-events: auto;
          cursor: pointer;
        ">🍕</div>`,
        iconSize: [markerSize + 4, markerSize + 4],
        iconAnchor: [(markerSize + 4) / 2, (markerSize + 4) / 2]
      });

      const marker = L.marker([lat, lng], { 
        icon: pizzaIcon,
        restaurantMarker: true,
        interactive: true,
        bubblingMouseEvents: false // Prevent marker events from bubbling to map
      }).addTo(map);

      // Create popup content
      const popupContent = `
        <div style="min-width: 250px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1f2937; font-size: 16px;">
            ${restaurant.name}
          </h3>
          <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">
            📍 ${restaurant.city}, ${restaurant.state}
          </p>
          ${restaurant.address ? `
            <p style="margin: 4px 0; color: #9ca3af; font-size: 12px;">
              ${restaurant.address}
            </p>
          ` : ''}
          ${restaurant.rating ? `
            <p style="margin: 8px 0; color: #6b7280; font-size: 14px;">
              ⭐ ${restaurant.rating}${restaurant.reviewCount ? ` (${restaurant.reviewCount} reviews)` : ''}
            </p>
          ` : ''}
          ${restaurant.description ? `
            <p style="margin: 8px 0; color: #6b7280; font-size: 12px; line-height: 1.4;">
              ${restaurant.description.length > 150 ? restaurant.description.substring(0, 150) + '...' : restaurant.description}
            </p>
          ` : ''}
          <div style="margin-top: 12px; display: flex; gap: 8px;">
            <button 
              onclick="window.open('https://maps.google.com/?q=${encodeURIComponent(`${restaurant.address || restaurant.name}, ${restaurant.city}, ${restaurant.state}`)}', '_blank')"
              style="
                background-color: #4285F4;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                cursor: pointer;
                flex: 1;
                font-weight: 500;
              "
              title="Opens in Google Maps"
            >
              🗺️ Google Maps
            </button>
            ${restaurant.website ? `
              <button 
                onclick="window.open('${restaurant.website}', '_blank')"
                style="
                  background-color: white;
                  color: #6b7280;
                  border: 1px solid #d1d5db;
                  padding: 8px 12px;
                  border-radius: 6px;
                  font-size: 12px;
                  cursor: pointer;
                "
              >
                🌐 Website
              </button>
            ` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 320,
        closeButton: true
      });

      // Handle marker click
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e); // Prevent map click
        if (onRestaurantSelect) {
          onRestaurantSelect(restaurant);
        }
      });
      
      // Ensure marker hover doesn't interfere with map cursor
      marker.on('mouseover', (e) => {
        marker.getElement().style.cursor = 'pointer';
      });
      
      marker.on('mouseout', (e) => {
        // Reset to map cursor when leaving marker
        const container = map.getContainer();
        if (container && !map.dragging._dragging) {
          container.style.cursor = 'grab';
        }
      });

      markersRef.current.push(marker);
    });
  };

  useEffect(() => {
    // Add CSS
    if (!document.getElementById('leaflet-css')) {
      const style = document.createElement('style');
      style.id = 'leaflet-css';
      style.textContent = leafletCSS;
      document.head.appendChild(style);
      
      // Add Leaflet CSS from CDN
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet from CDN
    if (!(window as any).L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initializeMap;
      document.head.appendChild(script);
    } else {
      initializeMap();
    }

    async function initializeMap() {
      const L = (window as any).L;
      
      if (!mapRef.current || leafletMapRef.current) return;

      // Initialize map centered on US with proper bounds
      const map = L.map(mapRef.current, {
        center: [39.8283, -98.5795],
        zoom: 5,
        minZoom: 3,
        maxZoom: 18,
        scrollWheelZoom: true,
        zoomControl: true,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        tap: false, // Disable tap to prevent conflicts on mobile
        trackResize: true,
        closePopupOnClick: false
      });

      // Set max bounds to focus on US
      const usBounds = L.latLngBounds(
        L.latLng(20.0, -130.0), // Southwest corner
        L.latLng(50.0, -60.0)   // Northeast corner
      );
      map.setMaxBounds(usBounds);
      map.fitBounds(usBounds);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 15,
        bounds: usBounds
      }).addTo(map);

      leafletMapRef.current = map;
      
      // Verify dragging is enabled
      console.log('Map dragging enabled:', map.dragging.enabled());
      
      // Add comprehensive drag event listeners
      map.on('dragstart', () => {
        console.log('Drag started');
        if (mapRef.current) {
          mapRef.current.style.cursor = 'grabbing';
          mapRef.current.style.pointerEvents = 'auto';
        }
        // Ensure all panes show grabbing cursor during drag
        const container = map.getContainer();
        if (container) {
          container.style.cursor = 'grabbing';
        }
      });
      
      map.on('dragend', () => {
        console.log('Drag ended');
        if (mapRef.current) {
          mapRef.current.style.cursor = 'grab';
        }
        // Reset cursor on container
        const container = map.getContainer();
        if (container) {
          container.style.cursor = 'grab';
        }
      });
      
      // Add mouse events to handle cursor properly
      map.on('mouseover', () => {
        if (mapRef.current && !map.dragging._dragging) {
          mapRef.current.style.cursor = 'grab';
        }
      });
      
      // Ensure drag works even when markers are dense
      map.on('drag', () => {
        const container = map.getContainer();
        if (container) {
          container.style.cursor = 'grabbing';
        }
      });
      
      // Add event listeners for dynamic loading
      map.on('zoomend moveend', async () => {
        try {
          const zoom = map.getZoom();
          setCurrentZoom(zoom);
          await updateVisibleRestaurants(map, zoom);
          
          // Ensure cursor is always grab after zoom/move
          setTimeout(() => {
            const container = map.getContainer();
            if (container && mapRef.current) {
              container.style.cursor = 'grab';
              mapRef.current.style.cursor = 'grab';
            }
          }, 100);
        } catch (error) {
          console.error('Error handling map zoom/move:', error);
        }
      });
      
      // Initial load
      await updateVisibleRestaurants(map, 5);
    }

    return () => {
      if (leafletMapRef.current) {
        try {
          markersRef.current.forEach(marker => leafletMapRef.current.removeLayer(marker));
          leafletMapRef.current.remove();
          leafletMapRef.current = null;
          markersRef.current = [];
        } catch (error) {
          console.error('Error cleaning up map:', error);
        }
      }
    };
  }, []);

  // Separate effect for updating markers when restaurants change
  useEffect(() => {
    const updateMap = async () => {
      if (leafletMapRef.current && (window as any).L) {
        await updateVisibleRestaurants(leafletMapRef.current, currentZoom);
      }
    };
    updateMap();
  }, [restaurants, currentZoom]);

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="h-96 md:h-[500px] relative">
        <div ref={mapRef} className="w-full h-full map-container" style={{ cursor: 'grab' }} />
        
        {/* Loading indicator when map is initializing */}
        {!leafletMapRef.current && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-warm-orange mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">Loading interactive map...</p>
            </div>
          </div>
        )}
        
        {/* Map info overlay */}
        {leafletMapRef.current && (
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-30">
            <div className="text-sm text-gray-700">
              <div className="font-medium">🍕 {visibleRestaurants.length} restaurants found</div>
              <div className="text-xs text-gray-500 mt-1">
                {currentZoom < 6 
                  ? 'Zoom in to see restaurants' 
                  : 'Click markers for details & directions'
                }
              </div>
              {currentZoom >= 10 && (
                <div className="text-xs text-blue-600 mt-1">
                  🔍 Auto-discovering more restaurants
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* No restaurants message */}
        {leafletMapRef.current && currentZoom >= 6 && visibleRestaurants.length === 0 && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-40">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4 text-center shadow-xl">
              <div className="text-2xl mb-2">🍕</div>
              <h3 className="font-semibold text-gray-900 mb-2">No restaurants found in this area</h3>
              <p className="text-sm text-gray-600 mb-3">
                Try zooming out or moving to a different location. We're constantly discovering new sourdough pizza places!
              </p>
              <button 
                className="bg-warm-orange text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600 transition-colors"
                onClick={() => {
                  if (leafletMapRef.current) {
                    leafletMapRef.current.setView([39.8283, -98.5795], 5);
                  }
                }}
              >
                Reset View
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Map Legend */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-warm-orange rounded-full"></div>
            <span>Verified Sourdough Pizza</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🗺️</span>
            <span>Click markers for Google Maps directions</span>
          </div>
        </div>
      </div>
    </div>
  );
}
