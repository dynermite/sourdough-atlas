import { useState, useEffect } from "react";
import type { Restaurant } from "@shared/schema";

interface InteractiveMapProps {
  restaurants: Restaurant[];
  onRestaurantSelect?: (restaurant: Restaurant) => void;
}

export default function InteractiveMap({ restaurants, onRestaurantSelect }: InteractiveMapProps) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 39.8283, lng: -98.5795 }); // Center of US
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleMarkerClick = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    if (onRestaurantSelect) {
      onRestaurantSelect(restaurant);
    }
  };

  const handleDirections = (restaurant: Restaurant) => {
    const query = encodeURIComponent(`${restaurant.address || restaurant.name}, ${restaurant.city}, ${restaurant.state}`);
    window.open(`https://maps.google.com/?q=${query}`, '_blank');
  };

  const zoomIn = () => setZoomLevel(prev => Math.min(prev * 1.5, 4));
  const zoomOut = () => setZoomLevel(prev => Math.max(prev / 1.5, 0.5));

  // Convert lat/lng to screen coordinates
  const getScreenPosition = (restaurant: Restaurant) => {
    // Approximate US bounds: lat 24-49, lng -125 to -66
    const lat = restaurant.latitude || 39.8283;
    const lng = restaurant.longitude || -98.5795;
    
    // Convert to percentages relative to US bounds
    const leftPercent = ((lng + 125) / (125 - 66)) * 100;
    const topPercent = ((49 - lat) / (49 - 24)) * 100;
    
    return {
      left: Math.max(2, Math.min(95, leftPercent)),
      top: Math.max(5, Math.min(90, topPercent))
    };
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="h-96 md:h-[500px] relative bg-slate-100">
        {/* Real-looking US Map */}
        <div className="absolute inset-0 overflow-hidden">
          <svg 
            viewBox="0 0 1000 500" 
            className="w-full h-full"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* US Map Shape */}
            <g>
              {/* Background */}
              <rect width="1000" height="500" fill="#f1f5f9" />
              
              {/* Simplified US Outline */}
              <path
                d="M 200 350 L 150 320 L 140 300 L 130 280 L 140 250 L 160 220 L 180 200 L 200 180 L 230 170 L 260 160 L 300 150 L 350 140 L 400 135 L 450 130 L 500 128 L 550 130 L 600 135 L 650 140 L 700 150 L 740 160 L 770 180 L 790 200 L 800 220 L 810 240 L 820 260 L 815 280 L 810 300 L 800 320 L 780 340 L 750 360 L 700 370 L 650 375 L 600 380 L 550 385 L 500 390 L 450 395 L 400 390 L 350 385 L 300 380 L 250 370 L 200 350 Z"
                fill="#e2e8f0"
                stroke="#cbd5e1"
                strokeWidth="2"
              />
              
              {/* State Lines */}
              <g stroke="#cbd5e1" strokeWidth="1" fill="none" opacity="0.5">
                <line x1="300" y1="150" x2="320" y2="380" />
                <line x1="400" y1="135" x2="420" y2="390" />
                <line x1="500" y1="128" x2="520" y2="390" />
                <line x1="600" y1="135" x2="620" y2="380" />
                <line x1="700" y1="150" x2="680" y2="370" />
                <line x1="200" y1="200" x2="750" y2="220" />
                <line x1="180" y1="250" x2="780" y2="270" />
                <line x1="200" y1="300" x2="750" y2="320" />
              </g>
              
              {/* Great Lakes */}
              <ellipse cx="650" cy="200" rx="30" ry="15" fill="#bfdbfe" />
              <ellipse cx="600" cy="180" rx="25" ry="12" fill="#bfdbfe" />
              <ellipse cx="550" cy="190" rx="20" ry="10" fill="#bfdbfe" />
            </g>
          </svg>
          
          {/* Restaurant Markers */}
          {restaurants.map((restaurant) => {
            const position = getScreenPosition(restaurant);
            
            return (
              <div
                key={restaurant.id}
                className="absolute bg-warm-orange hover:bg-orange-600 text-white p-2 rounded-full shadow-lg cursor-pointer hover:scale-110 transition-all duration-200 z-20"
                style={{
                  left: `${position.left}%`,
                  top: `${position.top}%`,
                  transform: `translate(-50%, -50%) scale(${0.8 + (zoomLevel * 0.2)})`
                }}
                onClick={() => handleMarkerClick(restaurant)}
                title={`${restaurant.name} - ${restaurant.city}, ${restaurant.state}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                </svg>
              </div>
            );
          })}
        </div>
        
        {/* Map Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-30">
          <button 
            onClick={zoomIn}
            className="bg-white hover:bg-gray-50 p-2 rounded shadow-md transition-colors"
            title="Zoom In"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <button 
            onClick={zoomOut}
            className="bg-white hover:bg-gray-50 p-2 rounded shadow-md transition-colors"
            title="Zoom Out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>

        {/* Restaurant Info Popup */}
        {selectedRestaurant && (
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-xl p-4 max-w-sm z-30 border">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-gray-900 text-lg pr-4">{selectedRestaurant.name}</h3>
              <button 
                onClick={() => setSelectedRestaurant(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="space-y-2 mb-4">
              <p className="text-gray-600 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                {selectedRestaurant.city}, {selectedRestaurant.state}
              </p>
              
              {selectedRestaurant.address && (
                <p className="text-sm text-gray-500">{selectedRestaurant.address}</p>
              )}
              
              {selectedRestaurant.rating && (
                <p className="text-gray-600 flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  {selectedRestaurant.rating} 
                  {selectedRestaurant.reviewCount && ` (${selectedRestaurant.reviewCount} reviews)`}
                </p>
              )}
              
              {selectedRestaurant.description && (
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                  {selectedRestaurant.description.length > 120 
                    ? selectedRestaurant.description.substring(0, 120) + '...'
                    : selectedRestaurant.description}
                </p>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleDirections(selectedRestaurant)}
                className="flex-1 bg-warm-orange hover:bg-orange-600 text-white py-2 px-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 11l19-9-9 19-2-8-8-2z"></path>
                </svg>
                Get Directions
              </button>
              
              {selectedRestaurant.website && (
                <a
                  href={selectedRestaurant.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                </a>
              )}
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
