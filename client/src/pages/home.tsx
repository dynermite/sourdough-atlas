import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import Footer from "@/components/footer";
import SearchBar from "@/components/search-bar";
import RestaurantCard from "@/components/restaurant-card";
import InteractiveMap from "@/components/interactive-map";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Restaurant } from "@shared/schema";

export default function Home() {
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("all");
  
  // Fetch all restaurants
  const { data: allRestaurants = [], isLoading } = useQuery<Restaurant[]>({
    queryKey: ['/api/restaurants'],
  });

  // Filter restaurants based on selected region
  const getFilteredRestaurants = () => {
    const restaurants = isSearching ? searchResults : allRestaurants;
    
    if (selectedRegion === "all") return restaurants;
    
    const regionStates = {
      west: ["CA", "OR", "WA", "NV", "AZ", "UT", "CO", "ID", "MT", "WY"],
      east: ["NY", "NJ", "PA", "CT", "MA", "RI", "VT", "NH", "ME", "MD", "DE", "VA", "NC", "SC", "GA", "FL"],
      midwest: ["IL", "IN", "IA", "KS", "MI", "MN", "MO", "NE", "ND", "OH", "SD", "WI"],
      south: ["AL", "AR", "FL", "GA", "KY", "LA", "MS", "NC", "SC", "TN", "TX", "VA", "WV"]
    };

    return restaurants.filter(restaurant => 
      regionStates[selectedRegion as keyof typeof regionStates]?.includes(restaurant.state)
    );
  };

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(`/api/restaurants/search/${encodeURIComponent(query)}`);
      const results = await response.json();
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    }
  };

  const handleRegionFilter = (region: string) => {
    setSelectedRegion(region);
    setIsSearching(false);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredRestaurants = getFilteredRestaurants();

  return (
    <div className="min-h-screen bg-warm-white">
      <Header />
      
      {/* Hero Section */}
      <section className="relative hero-gradient text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
              HOW TO FIND<br />
              <span className="text-warm-beige">THE BEST PIZZA</span><br />
              IN AMERICA
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto font-light">
              Sourdough pizza is the ultimate quality indicator. Restaurants that choose the complexity of naturally leavened dough don't cut corners anywhere else.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => scrollToSection('map')}
                className="bg-white text-warm-orange px-8 py-4 rounded-lg font-bold text-lg hover:bg-warm-beige transition-colors"
              >
                <i className="fas fa-map-marked-alt mr-2"></i>
                Explore Map
              </Button>
              <Button 
                onClick={() => scrollToSection('search')}
                variant="outline"
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white hover:text-warm-orange transition-colors"
              >
                <i className="fas fa-search mr-2"></i>
                Search by City
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section id="search" className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              FIND SOURDOUGH PIZZA
              <span className="block text-warm-orange">IN YOUR CITY</span>
            </h2>
            <p className="text-lg text-gray-600">Search by city or state to discover authentic sourdough pizzerias</p>
          </div>
          
          <SearchBar onSearch={handleSearch} />
        </div>
      </section>

      {/* Interactive Map Section */}
      <section id="map" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              INTERACTIVE
              <span className="block text-warm-orange">RESTAURANT MAP</span>
            </h2>
            <p className="text-lg text-gray-600">Click on any marker to see restaurant details and get directions</p>
          </div>

          {isLoading ? (
            <Skeleton className="h-96 md:h-[500px] rounded-2xl" />
          ) : (
            <InteractiveMap restaurants={allRestaurants} />
          )}
        </div>
      </section>

      {/* Restaurant Listings */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {isSearching ? 'SEARCH' : 'FEATURED'}
              <span className="block text-warm-orange">SOURDOUGH SPOTS</span>
            </h2>
            <p className="text-lg text-gray-600">
              {isSearching ? 'Your search results' : 'Discover authentic naturally leavened pizza restaurants'}
            </p>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap gap-4 justify-center mb-12">
            <Button
              onClick={() => handleRegionFilter('all')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                selectedRegion === 'all' 
                  ? 'bg-warm-orange text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Regions
            </Button>
            <Button
              onClick={() => handleRegionFilter('west')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                selectedRegion === 'west' 
                  ? 'bg-warm-orange text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              West Coast
            </Button>
            <Button
              onClick={() => handleRegionFilter('east')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                selectedRegion === 'east' 
                  ? 'bg-warm-orange text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              East Coast
            </Button>
            <Button
              onClick={() => handleRegionFilter('midwest')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                selectedRegion === 'midwest' 
                  ? 'bg-warm-orange text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Midwest
            </Button>
            <Button
              onClick={() => handleRegionFilter('south')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                selectedRegion === 'south' 
                  ? 'bg-warm-orange text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              South
            </Button>
          </div>

          {/* Restaurant Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <Skeleton className="w-full h-48" />
                  <div className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-3" />
                    <Skeleton className="h-16 w-full mb-4" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRestaurants.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredRestaurants.map(restaurant => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <i className="fas fa-search text-4xl text-gray-400 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No restaurants found</h3>
              <p className="text-gray-500">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </section>

      {/* Why Sourdough Matters Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              WHY SOURDOUGH
              <span className="block text-warm-orange">MATTERS</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Sourdough is the ultimate quality filter for finding exceptional pizzerias
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="bg-warm-beige p-8 rounded-2xl">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">The Sourdough Challenge</h3>
                <p className="text-gray-700 mb-4 leading-relaxed">
                  Most restaurants avoid sourdough because it adds layers of complexity. Unlike commercial yeast, 
                  maintaining a sourdough starter requires expert-level baking knowledge and constant attention.
                </p>
                <p className="text-gray-700 mb-4 leading-relaxed">
                  It's unpredictable, hard to teach to employees, and demands someone in the kitchen who truly 
                  understands the craft of fermentation and timing.
                </p>
                <p className="text-gray-700 leading-relaxed font-medium">
                  When a restaurant chooses sourdough, they're signaling they don't cut corners anywhere.
                </p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-warm-orange text-white w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-seedling"></i>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Quality Ingredients</h4>
                  <p className="text-gray-600">Restaurants using sourdough typically make similar quality choices with all ingredients</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-warm-orange text-white w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-clock"></i>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Time & Patience</h4>
                  <p className="text-gray-600">Sourdough fermentation takes 24-72 hours, showing commitment to process over profit</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-warm-orange text-white w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-award"></i>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Expert Craftsmanship</h4>
                  <p className="text-gray-600">Requires skilled bakers who understand fermentation, timing, and traditional techniques</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="about" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              HOW WE
              <span className="block text-warm-orange">FIND SOURDOUGH</span>
            </h2>
            <p className="text-lg text-gray-600">Our verification process ensures authentic sourdough pizza</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-warm-orange text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                <i className="fas fa-map-marker-alt"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Google Maps Scan</h3>
              <p className="text-gray-600">We scan restaurant listings across Google Maps to find pizza places</p>
            </div>

            <div className="text-center">
              <div className="bg-warm-orange text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                <i className="fas fa-search"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Keyword Detection</h3>
              <p className="text-gray-600">We analyze reviews, descriptions, and websites for "sourdough" and "naturally leavened"</p>
            </div>

            <div className="text-center">
              <div className="bg-warm-orange text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                <i className="fas fa-check-circle"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Verification</h3>
              <p className="text-gray-600">Restaurants are verified and marked to ensure authenticity for travelers</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
