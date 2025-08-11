import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Link } from "wouter";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Restaurant } from "@shared/schema";

export default function RestaurantDetail() {
  const [match, params] = useRoute("/restaurant/:id");
  const restaurantId = params?.id;

  const { data: restaurant, isLoading, error } = useQuery<Restaurant>({
    queryKey: [`/api/restaurants/${restaurantId}`],
    enabled: !!restaurantId,
  });

  const handleDirections = () => {
    if (restaurant) {
      const query = encodeURIComponent(`${restaurant.address}, ${restaurant.city}, ${restaurant.state}`);
      window.open(`https://maps.google.com/?q=${query}`, '_blank');
    }
  };

  const handleCall = () => {
    if (restaurant?.phone) {
      window.open(`tel:${restaurant.phone}`);
    }
  };

  const handleWebsite = () => {
    if (restaurant?.website) {
      window.open(restaurant.website, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-warm-white">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-64 w-full mb-8 rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
            </div>
            <div>
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-10 w-full mb-2" />
              <Skeleton className="h-10 w-full mb-2" />
              <Skeleton className="h-10 w-full mb-2" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-warm-white">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <div className="bg-white rounded-2xl shadow-lg p-12">
            <i className="fas fa-exclamation-triangle text-4xl text-gray-400 mb-4"></i>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Restaurant Not Found</h1>
            <p className="text-gray-600 mb-6">The restaurant you're looking for could not be found.</p>
            <Link href="/">
              <Button className="bg-warm-orange text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const parseHours = (hoursStr: string | null) => {
    if (!hoursStr) return null;
    try {
      return JSON.parse(hoursStr);
    } catch {
      return null;
    }
  };

  const hours = parseHours(restaurant.hours);

  return (
    <div className="min-h-screen bg-warm-white">
      <Header />
      
      {/* Breadcrumb */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center text-sm text-gray-600">
          <Link href="/" className="hover:text-warm-orange transition-colors">Home</Link>
          <i className="fas fa-chevron-right mx-2"></i>
          <span className="text-gray-900">{restaurant.name}</span>
        </div>
      </div>

      {/* Restaurant Header */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <img 
            src={restaurant.imageUrl || "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400"} 
            alt={`${restaurant.name} interior`}
            className="w-full h-64 md:h-80 object-cover" 
          />
          
          <div className="p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{restaurant.name}</h1>
                  {restaurant.sourdoughVerified === 1 && (
                    <Badge className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                      <i className="fas fa-check-circle mr-1"></i>
                      Verified Sourdough
                    </Badge>
                  )}
                </div>
                <p className="text-lg text-gray-600">{restaurant.address}, {restaurant.city}, {restaurant.state} {restaurant.zipCode}</p>
                {restaurant.rating && (
                  <div className="flex items-center mt-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <i 
                          key={i} 
                          className={`fas fa-star ${i < Math.floor(restaurant.rating!) ? 'text-yellow-400' : 'text-gray-300'}`}
                        ></i>
                      ))}
                    </div>
                    <span className="ml-2 text-gray-600">{restaurant.rating} ({restaurant.reviewCount} reviews)</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 mt-6 md:mt-0">
                <Button 
                  onClick={handleDirections}
                  className="bg-warm-orange text-white px-6 py-3 rounded-lg font-medium hover:bg-opacity-90 transition-colors"
                >
                  <i className="fas fa-directions mr-2"></i>
                  Get Directions
                </Button>
                {restaurant.phone && (
                  <Button 
                    onClick={handleCall}
                    variant="outline"
                    className="border-warm-orange text-warm-orange px-6 py-3 rounded-lg font-medium hover:bg-warm-orange hover:text-white transition-colors"
                  >
                    <i className="fas fa-phone mr-2"></i>
                    Call
                  </Button>
                )}
                {restaurant.website && (
                  <Button 
                    onClick={handleWebsite}
                    variant="outline"
                    className="border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    <i className="fas fa-globe mr-2"></i>
                    Website
                  </Button>
                )}
              </div>
            </div>
            
            {restaurant.description && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-3">About Our Sourdough</h2>
                <div className="bg-warm-beige p-4 rounded-lg">
                  <p className="text-gray-700 leading-relaxed">
                    <i className="fas fa-quote-left text-warm-orange mr-2"></i>
                    {restaurant.description}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Contact Information */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h2>
                <div className="space-y-3">
                  <div className="flex items-center text-gray-700">
                    <i className="fas fa-map-marker-alt w-5 text-warm-orange mr-3"></i>
                    <span>{restaurant.address}, {restaurant.city}, {restaurant.state} {restaurant.zipCode}</span>
                  </div>
                  {restaurant.phone && (
                    <div className="flex items-center text-gray-700">
                      <i className="fas fa-phone w-5 text-warm-orange mr-3"></i>
                      <a href={`tel:${restaurant.phone}`} className="hover:text-warm-orange transition-colors">
                        {restaurant.phone}
                      </a>
                    </div>
                  )}
                  {restaurant.website && (
                    <div className="flex items-center text-gray-700">
                      <i className="fas fa-globe w-5 text-warm-orange mr-3"></i>
                      <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="hover:text-warm-orange transition-colors">
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Hours */}
              {hours && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Hours</h2>
                  <div className="space-y-2">
                    {Object.entries(hours).map(([day, time]) => (
                      <div key={day} className="flex justify-between text-gray-700">
                        <span className="capitalize font-medium">{day}:</span>
                        <span>{time as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
