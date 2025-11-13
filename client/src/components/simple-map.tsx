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

      // Add simple markers
      restaurants.slice(0, 20).forEach((restaurant) => {
        const lat = restaurant.latitude || 39.8283;
        const lng = restaurant.longitude || -98.5795;

        const marker = L.marker([lat, lng]).addTo(map);
        
        marker.bindPopup(`
          <div style="min-width: 200px;">
            <h3 style="margin: 0 0 8px 0;">${restaurant.name}</h3>
            <p style="margin: 4px 0;">${restaurant.city}, ${restaurant.state}</p>
            ${restaurant.description ? `<p style="margin: 4px 0; font-size: 12px;">${restaurant.description}</p>` : ''}
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
            <span>📍</span>
            <span>Showing {Math.min(20, restaurants.length)} restaurants</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🍕</span>
            <span>Click markers for details</span>
          </div>
        </div>
      </div>
    </div>
  );
}