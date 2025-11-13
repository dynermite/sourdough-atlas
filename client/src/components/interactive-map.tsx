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
    cursor: grab !important;
    pointer-events: auto;
  }
  .leaflet-overlay-pane {
    cursor: grab !important;
    pointer-events: auto;
  }
  /* Ensure map background always shows grab cursor */
  .leaflet-container .leaflet-tile {
    cursor: grab !important;
  }
  /* Ensure map panes don't interfere with dragging */
  .leaflet-pane {
    cursor: grab !important;
  }
  .leaflet-container.leaflet-touch-drag {
    cursor: grabbing !important;
  }
  /* Override marker pointer events when dragging */
  .leaflet-dragging .leaflet-marker-pane {
    pointer-events: none !important;
  }
  /* Completely disable marker pointer events to prevent drag interference */
  .leaflet-marker-pane {
    pointer-events: none !important;
  }
  .leaflet-marker-pane * {
    pointer-events: none !important;
  }
  /* Override any inline styles that might re-enable pointer events */
  .leaflet-marker-icon {
    pointer-events: none !important;
  }
  .custom-pizza-marker {
    pointer-events: none !important;
  }
  /* Force map drag to always work */
  .leaflet-container {
    touch-action: manipulation !important;
    cursor: grab !important;
  }
  .leaflet-container:active {
    cursor: grabbing !important;
  }
  /* Ensure the map container always receives mouse events */
  .leaflet-pane {
    pointer-events: auto !important;
  }
  .leaflet-tile-pane {
    pointer-events: auto !important;
  }
  .leaflet-overlay-pane {
    pointer-events: auto !important;
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

    // Show markers at appropriate zoom levels for better drag experience
    if (zoom < 5) {
      // At very low zoom (continent level), don't show restaurants
      return;
    }
    
    if (!restaurantsToShow || restaurantsToShow.length === 0) {
      return; // Exit early if no restaurants to show
    }

    // Use CSS-based markers instead of Leaflet markers to avoid interference
    const mapContainer = map.getContainer();
    
    // Remove any existing CSS markers
    const existingCssMarkers = mapContainer.querySelectorAll('.css-restaurant-marker');
    existingCssMarkers.forEach((marker: Element) => marker.remove());

    restaurantsToShow.forEach((restaurant) => {
      const lat = restaurant.latitude || 39.8283;
      const lng = restaurant.longitude || -98.5795;

      // Convert lat/lng to pixel coordinates
      const point = map.latLngToContainerPoint([lat, lng]);
      
      // Scale marker size based on zoom
      const markerSize = Math.max(20, Math.min(36, zoom * 4));

      // Create CSS-based marker element
      const markerElement = document.createElement('div');
      markerElement.className = 'css-restaurant-marker';
      markerElement.style.cssText = `
        position: absolute;
        left: ${point.x - markerSize / 2}px;
        top: ${point.y - markerSize / 2}px;
        width: ${markerSize}px;
        height: ${markerSize}px;
        background-color: #ea580c;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: ${markerSize * 0.5}px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        border: 2px solid white;
        pointer-events: none;
        z-index: 500;
        user-select: none;
      `;
      markerElement.innerHTML = '🍕';
      
      // Store restaurant data for click handling
      (markerElement as any).restaurantData = restaurant;
      
      mapContainer.appendChild(markerElement);
      markersRef.current.push(markerElement);
    });
    
    // Update marker positions when map moves or zooms
    const updateMarkerPositions = () => {
      const cssMarkers = mapContainer.querySelectorAll('.css-restaurant-marker');
      cssMarkers.forEach((markerElement: any) => {
        const restaurant = markerElement.restaurantData;
        if (restaurant) {
          const lat = restaurant.latitude || 39.8283;
          const lng = restaurant.longitude || -98.5795;
          const point = map.latLngToContainerPoint([lat, lng]);
          const currentZoom = map.getZoom();
          const markerSize = Math.max(20, Math.min(36, currentZoom * 4));
          
          markerElement.style.left = `${point.x - markerSize / 2}px`;
          markerElement.style.top = `${point.y - markerSize / 2}px`;
          markerElement.style.width = `${markerSize}px`;
          markerElement.style.height = `${markerSize}px`;
          markerElement.style.fontSize = `${markerSize * 0.5}px`;
        }
      });
    };
    
    // Store the update function to call it during map events
    (map as any).updateMarkerPositions = updateMarkerPositions;
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
        closePopupOnClick: false,
        attributionControl: false // Simplify interface
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
      
      // Force enable dragging and set aggressive drag options
      if (map.dragging) {
        map.dragging.enable();
        // Make dragging more aggressive - smaller threshold for drag detection
        (map.dragging as any)._dragStartThreshold = 1; // Very small threshold
      }
      
      // Handle map clicks for restaurant selection (since markers are non-interactive CSS elements)
      map.on('click', (e) => {
        const clickPoint = map.latLngToContainerPoint(e.latlng);
        const currentZoom = map.getZoom();
        
        // Find nearest CSS marker within click radius
        let nearestRestaurant = null;
        let minDistance = Infinity;
        const maxClickDistance = Math.max(30, 50 / currentZoom); // Pixel-based distance for CSS markers
        
        const mapContainer = map.getContainer();
        const cssMarkers = mapContainer.querySelectorAll('.css-restaurant-marker');
        
        cssMarkers.forEach((markerElement: any) => {
          if (markerElement.restaurantData) {
            const markerRect = markerElement.getBoundingClientRect();
            const mapRect = mapContainer.getBoundingClientRect();
            
            // Get marker center relative to map container
            const markerCenterX = markerRect.left - mapRect.left + markerRect.width / 2;
            const markerCenterY = markerRect.top - mapRect.top + markerRect.height / 2;
            
            // Calculate distance from click to marker center
            const distance = Math.sqrt(
              Math.pow(clickPoint.x - markerCenterX, 2) + 
              Math.pow(clickPoint.y - markerCenterY, 2)
            );
            
            if (distance < maxClickDistance && distance < minDistance) {
              minDistance = distance;
              nearestRestaurant = markerElement.restaurantData;
            }
          }
        });
        
        if (nearestRestaurant && onRestaurantSelect) {
          onRestaurantSelect(nearestRestaurant);
        }
      });
      
      // Add event listeners for dynamic loading and marker updates
      map.on('zoomend moveend', async () => {
        try {
          const zoom = map.getZoom();
          setCurrentZoom(zoom);
          await updateVisibleRestaurants(map, zoom);
          
          // Update CSS marker positions
          if ((map as any).updateMarkerPositions) {
            (map as any).updateMarkerPositions();
          }
          
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
      
      // Also update marker positions during drag for smooth movement
      map.on('drag', () => {
        if ((map as any).updateMarkerPositions) {
          (map as any).updateMarkerPositions();
        }
      });
      
      // Initial load
      await updateVisibleRestaurants(map, 5);
    }

    return () => {
      if (leafletMapRef.current) {
        try {
          // Clean up CSS markers
          const mapContainer = leafletMapRef.current.getContainer();
          if (mapContainer) {
            const cssMarkers = mapContainer.querySelectorAll('.css-restaurant-marker');
            cssMarkers.forEach((marker: Element) => marker.remove());
          }
          
          // Clean up any remaining Leaflet markers
          markersRef.current.forEach(marker => {
            if (marker && marker.remove) {
              marker.remove();
            } else if (leafletMapRef.current && marker && leafletMapRef.current.removeLayer) {
              leafletMapRef.current.removeLayer(marker);
            }
          });
          
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
