import { useEffect, useRef, useState } from "react";
import type { Restaurant } from "@shared/schema";

// Import Leaflet CSS
const leafletCSS = `
  .leaflet-container {
    height: 100%;
    width: 100%;
    font: 12px/1.5 "Helvetica Neue", Arial, Helvetica, sans-serif;
    cursor: grab;
  }
  .leaflet-container:active {
    cursor: grabbing;
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
  .custom-navigation-controls {
    position: absolute;
    top: 80px;
    right: 10px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .nav-button {
    background: white;
    border: 1px solid #ccc;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    border-radius: 2px;
  }
  .nav-button:hover {
    background: #f0f0f0;
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
  const [currentZoom, setCurrentZoom] = useState(4);
  const [visibleRestaurants, setVisibleRestaurants] = useState<Restaurant[]>([]);

  const addNavigationControls = (map: any) => {
    const L = (window as any).L;
    
    // Custom navigation control
    const NavigationControl = L.Control.extend({
      onAdd: function() {
        const container = L.DomUtil.create('div', 'custom-navigation-controls');
        
        container.innerHTML = `
          <div class="nav-button" id="nav-up">↑</div>
          <div style="display: flex; gap: 2px;">
            <div class="nav-button" id="nav-left">←</div>
            <div class="nav-button" id="nav-right">→</div>
          </div>
          <div class="nav-button" id="nav-down">↓</div>
        `;
        
        // Prevent map events on control
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        
        return container;
      },
      
      onRemove: function() {}
    });
    
    const navControl = new NavigationControl({ position: 'topright' });
    navControl.addTo(map);
    
    // Add event listeners after control is added
    setTimeout(() => {
      const panDistance = 0.5; // degrees
      
      document.getElementById('nav-up')?.addEventListener('click', () => {
        const center = map.getCenter();
        map.panTo([center.lat + panDistance, center.lng]);
      });
      
      document.getElementById('nav-down')?.addEventListener('click', () => {
        const center = map.getCenter();
        map.panTo([center.lat - panDistance, center.lng]);
      });
      
      document.getElementById('nav-left')?.addEventListener('click', () => {
        const center = map.getCenter();
        map.panTo([center.lat, center.lng - panDistance]);
      });
      
      document.getElementById('nav-right')?.addEventListener('click', () => {
        const center = map.getCenter();
        map.panTo([center.lat, center.lng + panDistance]);
      });
    }, 100);
  };

  const updateVisibleRestaurants = (map: any, zoom: number) => {
    if (!map) return;
    
    const bounds = map.getBounds();
    const visible = restaurants.filter(restaurant => {
      const lat = restaurant.latitude || 39.8283;
      const lng = restaurant.longitude || -98.5795;
      return bounds.contains([lat, lng]);
    });
    
    setVisibleRestaurants(visible);
    addRestaurantMarkers(map, visible, zoom);
  };

  const addRestaurantMarkers = (map: any, restaurantsToShow: Restaurant[], zoom: number) => {
    const L = (window as any).L;
    
    // Clear existing markers
    markersRef.current.forEach(marker => map.removeLayer(marker));
    markersRef.current = [];

    // Only show markers at appropriate zoom levels
    if (zoom < 6) {
      // At low zoom, show state-level clustering or major cities only
      const majorCities = restaurantsToShow.filter(r => 
        ['San Francisco', 'Portland', 'Seattle', 'Austin', 'Denver', 'Chicago', 'New York'].includes(r.city)
      );
      restaurantsToShow = majorCities;
    }

    restaurantsToShow.forEach((restaurant) => {
      const lat = restaurant.latitude || 39.8283;
      const lng = restaurant.longitude || -98.5795;

      // Scale marker size based on zoom
      const markerSize = Math.max(16, Math.min(32, zoom * 3));

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
        ">🍕</div>`,
        iconSize: [markerSize + 4, markerSize + 4],
        iconAnchor: [(markerSize + 4) / 2, (markerSize + 4) / 2]
      });

      const marker = L.marker([lat, lng], { 
        icon: pizzaIcon,
        restaurantMarker: true
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
              onclick="window.open('https://maps.google.com/?q=${encodeURIComponent(`${restaurant.address || restaurant.name}, ${restaurant.city}, ${restaurant.state}`)}, '_blank')"
              style="
                background-color: #ea580c;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                cursor: pointer;
                flex: 1;
              "
            >
              📍 Get Directions
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
      marker.on('click', () => {
        if (onRestaurantSelect) {
          onRestaurantSelect(restaurant);
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

    function initializeMap() {
      const L = (window as any).L;
      
      if (!mapRef.current || leafletMapRef.current) return;

      // Initialize map centered on US with proper bounds
      const map = L.map(mapRef.current, {
        center: [39.8283, -98.5795],
        zoom: 4,
        minZoom: 3,
        maxZoom: 15,
        scrollWheelZoom: true,
        zoomControl: true,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true
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
      
      // Add navigation controls
      addNavigationControls(map);
      
      // Add event listeners for dynamic loading
      map.on('zoomend moveend', () => {
        const zoom = map.getZoom();
        setCurrentZoom(zoom);
        updateVisibleRestaurants(map, zoom);
      });
      
      // Initial load
      updateVisibleRestaurants(map, 4);
    }



    // Update markers when restaurants change
    if (leafletMapRef.current && (window as any).L) {
      updateVisibleRestaurants(leafletMapRef.current, currentZoom);
    }

    return () => {
      if (leafletMapRef.current) {
        markersRef.current.forEach(marker => leafletMapRef.current.removeLayer(marker));
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markersRef.current = [];
      }
    };
  }, [restaurants, onRestaurantSelect, currentZoom]);

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="h-96 md:h-[500px] relative">
        <div ref={mapRef} className="w-full h-full" />
        
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
              <div className="font-medium">Zoom Level: {currentZoom}</div>
              <div className="text-xs text-gray-500 mt-1">
                {currentZoom < 6 
                  ? 'Showing major cities only' 
                  : `Showing ${visibleRestaurants.length} restaurants in view`
                }
              </div>
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
            <i className="fas fa-route text-gray-600"></i>
            <span>Click for directions</span>
          </div>
        </div>
      </div>
    </div>
  );
}
