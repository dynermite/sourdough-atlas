import { useEffect, useRef, useState } from "react";
import type { Restaurant } from "@shared/schema";

interface SimpleMapProps {
  restaurants: Restaurant[];
  onRestaurantSelect?: (restaurant: Restaurant) => void;
}

export default function SimpleMap({ restaurants, onRestaurantSelect }: SimpleMapProps) {
  const mapRef = useRef<any>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    // Load Leaflet CSS and JS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
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

      // Create simple map
      const map = L.map(mapRef.current, {
        center: [39.8283, -98.5795],
        zoom: 5,
        zoomControl: true,
        scrollWheelZoom: true,
        dragging: true
      });

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      leafletMapRef.current = map;

      // Add markers for restaurants
      addMarkers();
    }

    function addMarkers() {
      const L = (window as any).L;
      const map = leafletMapRef.current;
      if (!map) return;

      // Clear existing markers
      markersRef.current.forEach(marker => map.removeLayer(marker));
      markersRef.current = [];

      // Show all available restaurants with pizza icons
      restaurants.forEach((restaurant) => {
        const lat = restaurant.latitude || 39.8283;
        const lng = restaurant.longitude || -98.5795;

        // Create custom pizza icon
        const pizzaIcon = L.divIcon({
          className: 'pizza-marker',
          html: `<div style="
            background-color: #ea580c;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            border: 2px solid white;
          ">🍕</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const marker = L.marker([lat, lng], { icon: pizzaIcon }).addTo(map);
        
        marker.bindPopup(`
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
        `);

        marker.on('click', () => {
          if (onRestaurantSelect) {
            onRestaurantSelect(restaurant);
          }
        });

        markersRef.current.push(marker);
      });
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markersRef.current = [];
      }
    };
  }, [restaurants, onRestaurantSelect]);

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="h-96 md:h-[500px] relative">
        <div ref={mapRef} className="w-full h-full" />
      </div>
      
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
            <span>🍕 {restaurants.length} verified sourdough pizza restaurants</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🗺️</span>
            <span>Click markers for Google Maps directions</span>
          </div>
        </div>
      </div>
    </div>
  );
}