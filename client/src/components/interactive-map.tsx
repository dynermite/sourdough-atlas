import { useState, useEffect } from "react";
import type { Restaurant } from "@shared/schema";

interface InteractiveMapProps {
  restaurants: Restaurant[];
  onRestaurantSelect?: (restaurant: Restaurant) => void;
}

export default function InteractiveMap({ restaurants, onRestaurantSelect }: InteractiveMapProps) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  const handleMarkerClick = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    if (onRestaurantSelect) {
      onRestaurantSelect(restaurant);
    }
  };

  const handleDirections = (restaurant: Restaurant) => {
    const query = encodeURIComponent(`${restaurant.address}, ${restaurant.city}, ${restaurant.state}`);
    window.open(`https://maps.google.com/?q=${query}`, '_blank');
  };

  // Calculate map bounds based on restaurants
  const getBounds = () => {
    if (restaurants.length === 0) return null;
    
    const lats = restaurants.map(r => r.latitude);
    const lngs = restaurants.map(r => r.longitude);
    
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    };
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="h-96 md:h-[500px] bg-gradient-to-br from-blue-100 to-green-100 relative">
        {/* Mock US Map */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full h-full">
            {/* Mock map background */}
            <div 
              className="absolute inset-4 rounded-lg"
              style={{
                backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 400' fill='%23E5E5E5'><rect width='800' height='400' fill='%23F0F8FF'/><path d='M100 200 Q 200 180 300 200 T 500 200 Q 600 220 700 200 L 700 350 Q 600 330 500 350 T 300 350 Q 200 370 100 350 Z' fill='%23D4D4AA'/></svg>")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
            
            {/* Restaurant Markers */}
            {restaurants.map((restaurant, index) => {
              // Simple positioning based on relative coordinates
              const leftPercent = ((restaurant.longitude + 125) / 60) * 100;
              const topPercent = ((50 - restaurant.latitude) / 25) * 100;
              
              return (
                <div
                  key={restaurant.id}
                  className="absolute bg-warm-orange text-white p-2 rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform z-10"
                  style={{
                    left: `${Math.max(5, Math.min(90, leftPercent))}%`,
                    top: `${Math.max(10, Math.min(85, topPercent))}%`
                  }}
                  onClick={() => handleMarkerClick(restaurant)}
                  title={restaurant.name}
                >
                  <i className="fas fa-pizza-slice"></i>
                </div>
              );
            })}
            
            {/* Map Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <button className="bg-white p-2 rounded shadow hover:bg-gray-50">
                <i className="fas fa-plus text-gray-700"></i>
              </button>
              <button className="bg-white p-2 rounded shadow hover:bg-gray-50">
                <i className="fas fa-minus text-gray-700"></i>
              </button>
            </div>

            {/* Restaurant Info Popup */}
            {selectedRestaurant && (
              <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-xs z-20">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900 text-sm">{selectedRestaurant.name}</h3>
                  <button 
                    onClick={() => setSelectedRestaurant(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <i className="fas fa-times text-xs"></i>
                  </button>
                </div>
                <p className="text-xs text-gray-600 mb-2">
                  {selectedRestaurant.city}, {selectedRestaurant.state}
                </p>
                {selectedRestaurant.rating && (
                  <p className="text-xs text-gray-600 mb-3">
                    <i className="fas fa-star text-yellow-400 mr-1"></i>
                    {selectedRestaurant.rating} ({selectedRestaurant.reviewCount} reviews)
                  </p>
                )}
                <button
                  onClick={() => handleDirections(selectedRestaurant)}
                  className="w-full bg-warm-orange text-white py-1 px-2 rounded text-xs font-medium hover:bg-opacity-90 transition-colors"
                >
                  <i className="fas fa-directions mr-1"></i>
                  Get Directions
                </button>
              </div>
            )}
          </div>
        </div>
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
