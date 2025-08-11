import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Restaurant } from "@shared/schema";
import { Link } from "wouter";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const handleDirections = () => {
    const query = encodeURIComponent(`${restaurant.address}, ${restaurant.city}, ${restaurant.state}`);
    window.open(`https://maps.google.com/?q=${query}`, '_blank');
  };

  const handleCall = () => {
    if (restaurant.phone) {
      window.open(`tel:${restaurant.phone}`);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <img 
        src={restaurant.imageUrl || "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"} 
        alt={`${restaurant.name} pizza`}
        className="w-full h-48 object-cover" 
      />
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <Link href={`/restaurant/${restaurant.id}`}>
            <h3 className="text-xl font-bold text-gray-900 hover:text-warm-orange transition-colors cursor-pointer">
              {restaurant.name}
            </h3>
          </Link>
          {restaurant.sourdoughVerified === 1 && (
            <Badge className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
              <i className="fas fa-check-circle mr-1"></i>
              Verified
            </Badge>
          )}
        </div>
        
        <p className="text-gray-600 mb-3">{restaurant.city}, {restaurant.state}</p>
        
        {restaurant.description && (
          <div className="bg-warm-beige p-3 rounded-lg mb-4">
            <p className="text-sm text-gray-700 line-clamp-3">
              <i className="fas fa-quote-left text-warm-orange mr-1"></i>
              {restaurant.description}
            </p>
          </div>
        )}
        
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          {restaurant.rating && (
            <span>
              <i className="fas fa-star text-yellow-400 mr-1"></i>
              {restaurant.rating} ({restaurant.reviewCount || 0} reviews)
            </span>
          )}
          <span>
            <i className="fas fa-map-marker-alt mr-1"></i>
            {restaurant.city}
          </span>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleDirections}
            className="flex-1 bg-warm-orange text-white py-2 px-4 rounded-lg font-medium hover:bg-opacity-90 transition-colors"
          >
            <i className="fas fa-directions mr-2"></i>
            Directions
          </Button>
          {restaurant.phone && (
            <Button 
              onClick={handleCall}
              variant="outline"
              className="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              <i className="fas fa-phone"></i>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
