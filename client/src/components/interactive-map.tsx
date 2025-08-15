import { useEffect, useRef } from "react";
import type { Restaurant } from "@shared/schema";

// Import Leaflet CSS
const leafletCSS = `
  .leaflet-container {
    height: 100%;
    width: 100%;
    font: 12px/1.5 "Helvetica Neue", Arial, Helvetica, sans-serif;
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
`;

interface InteractiveMapProps {
  restaurants: Restaurant[];
  onRestaurantSelect?: (restaurant: Restaurant) => void;
}

export default function InteractiveMap({ restaurants, onRestaurantSelect }: InteractiveMapProps) {
  const mapRef = useRef<any>(null);
  const leafletMapRef = useRef<any>(null);

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

      // Initialize map centered on US
      const map = L.map(mapRef.current, {
        center: [39.8283, -98.5795],
        zoom: 4,
        scrollWheelZoom: true,
        zoomControl: true
      });

      // Add OpenStreetMap tiles (free)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
        tileSize: 256
      }).addTo(map);

      leafletMapRef.current = map;
      
      // Add markers for restaurants
      addRestaurantMarkers(map, L);
    }

    function addRestaurantMarkers(map: any, L: any) {
      // Clear existing markers
      map.eachLayer((layer: any) => {
        if (layer.options && layer.options.restaurantMarker) {
          map.removeLayer(layer);
        }
      });

      restaurants.forEach((restaurant) => {
        const lat = restaurant.latitude || 39.8283;
        const lng = restaurant.longitude || -98.5795;

        // Create custom orange pizza icon
        const pizzaIcon = L.divIcon({
          className: 'custom-pizza-marker',
          html: `<div style="
            background-color: #ea580c;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            border: 2px solid white;
          ">🍕</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
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
      });

      // Fit map to show all markers if there are restaurants
      if (restaurants.length > 0) {
        const group = new L.featureGroup(
          restaurants.map(r => L.marker([r.latitude || 39.8283, r.longitude || -98.5795]))
        );
        map.fitBounds(group.getBounds().pad(0.1));
      }
    }

    // Update markers when restaurants change
    if (leafletMapRef.current && (window as any).L) {
      addRestaurantMarkers(leafletMapRef.current, (window as any).L);
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [restaurants, onRestaurantSelect]);

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
