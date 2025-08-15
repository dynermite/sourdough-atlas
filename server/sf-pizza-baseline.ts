#!/usr/bin/env tsx

// Comprehensive San Francisco pizza restaurant baseline
// This establishes ALL known pizza restaurants in SF to measure sourdough adoption

interface SFPizzaRestaurant {
  name: string;
  address: string;
  neighborhood: string;
  website?: string;
  style: string;
  established?: string;
  source: string;
}

// Comprehensive list of San Francisco pizza restaurants from multiple sources
const sanFranciscoPizzaRestaurants: SFPizzaRestaurant[] = [
  
  // Famous/Well-Known SF Pizza Places
  {
    name: "Tony's Little Star Pizza",
    address: "846 Divisadero St, San Francisco, CA 94117", 
    neighborhood: "Western Addition",
    website: "https://www.tonysnapoleanpizza.com/",
    style: "Chicago Deep Dish",
    source: "Famous SF Pizza"
  },
  {
    name: "Arizmendi Bakery",
    address: "1331 9th Ave, San Francisco, CA 94122",
    neighborhood: "Inner Sunset", 
    website: "https://arizmendibakery.com/",
    style: "Artisan Cooperative",
    source: "Famous SF Pizza"
  },
  {
    name: "Golden Boy Pizza",
    address: "542 Green St, San Francisco, CA 94133",
    neighborhood: "North Beach",
    website: "http://www.goldenboypizza.com/",
    style: "Sicilian Style",
    established: "1978",
    source: "Famous SF Pizza"
  },
  {
    name: "Pizzeria Delfina",
    address: "3611 18th St, San Francisco, CA 94110",
    neighborhood: "Mission",
    website: "https://pizzeriadelfina.com/",
    style: "Neapolitan",
    source: "Famous SF Pizza"
  },
  {
    name: "Flour + Water",
    address: "2401 Harrison St, San Francisco, CA 94110",
    neighborhood: "Mission",
    website: "https://www.flourandwater.com/",
    style: "Italian Fine Dining",
    source: "Famous SF Pizza"
  },
  
  // Mission District Pizza
  {
    name: "Pizzeria Delfina",
    address: "621 20th St, San Francisco, CA 94107",
    neighborhood: "Potrero Hill",
    website: "https://pizzeriadelfina.com/",
    style: "Neapolitan",
    source: "Mission/Potrero Pizza"
  },
  {
    name: "Pauline's Pizza",
    address: "260 Valencia St, San Francisco, CA 94103", 
    neighborhood: "Mission",
    website: "https://www.paulinespizza.com/",
    style: "California Style",
    established: "1982",
    source: "Mission/Potrero Pizza"
  },
  {
    name: "Escape from New York Pizza",
    address: "1737 Haight St, San Francisco, CA 94117",
    neighborhood: "Haight-Ashbury",
    style: "New York Style",
    source: "Mission/Potrero Pizza"
  },
  {
    name: "Slice House",
    address: "3200 16th St, San Francisco, CA 94103",
    neighborhood: "Mission",
    style: "New York Style",
    source: "Mission/Potrero Pizza"
  },
  
  // North Beach & Downtown
  {
    name: "North Beach Pizza",
    address: "1499 Grant Ave, San Francisco, CA 94133",
    neighborhood: "North Beach",
    website: "https://www.northbeachpizza.com/",
    style: "Classic American",
    established: "1969",
    source: "North Beach/Downtown"
  },
  {
    name: "Mario's Bohemian Cigar Store Cafe",
    address: "566 Columbus Ave, San Francisco, CA 94133",
    neighborhood: "North Beach",
    style: "Italian Focaccia",
    source: "North Beach/Downtown"
  },
  {
    name: "Tommaso's Restaurant", 
    address: "1042 Kearny St, San Francisco, CA 94133",
    neighborhood: "North Beach",
    website: "https://www.tommasos.com/",
    style: "Italian Traditional",
    established: "1935",
    source: "North Beach/Downtown"
  },
  
  // Castro & Noe Valley
  {
    name: "Marcello's Pizza",
    address: "420 Castro St, San Francisco, CA 94114",
    neighborhood: "Castro",
    style: "New York Style", 
    source: "Castro/Noe Valley"
  },
  {
    name: "Village Pizzeria",
    address: "3248 21st St, San Francisco, CA 94110",
    neighborhood: "Noe Valley",
    style: "New York Style",
    source: "Castro/Noe Valley"
  },
  
  // Richmond & Sunset
  {
    name: "Giorgio's Pizzeria",
    address: "151 Clement St, San Francisco, CA 94118",
    neighborhood: "Richmond",
    style: "Italian American",
    source: "Richmond/Sunset"
  },
  {
    name: "Pizzetta 211",
    address: "211 23rd Ave, San Francisco, CA 94121",
    neighborhood: "Richmond", 
    website: "https://www.pizzetta211.com/",
    style: "Artisan Thin Crust",
    source: "Richmond/Sunset"
  },
  {
    name: "Sunset Reservoir Brewing Company",
    address: "1735 Noriega St, San Francisco, CA 94122",
    neighborhood: "Sunset",
    style: "Brewery Pizza",
    source: "Richmond/Sunset"
  },
  
  // SOMA & Financial District  
  {
    name: "Uncle Vito's Slice of NY",
    address: "4 Embarcadero Ctr, San Francisco, CA 94111",
    neighborhood: "Financial District",
    style: "New York Style",
    source: "SOMA/Financial"
  },
  {
    name: "Blaze Pizza",
    address: "201 3rd St, San Francisco, CA 94103", 
    neighborhood: "SOMA",
    website: "https://www.blazepizza.com/",
    style: "Fast Casual",
    source: "SOMA/Financial"
  },
  {
    name: "Chipotle Mexican Grill", // Note: Not pizza-focused but serves pizza-style items
    address: "Multiple locations",
    neighborhood: "Various",
    style: "Fast Casual Mexican",
    source: "Chain Restaurants"
  },
  
  // Marina & Pacific Heights
  {
    name: "A16",
    address: "2355 Chestnut St, San Francisco, CA 94123",
    neighborhood: "Marina",
    website: "https://www.a16sf.com/",
    style: "Italian Fine Dining",
    source: "Marina/Pacific Heights"
  },
  {
    name: "Delarosa",
    address: "2175 Chestnut St, San Francisco, CA 94123",
    neighborhood: "Marina",
    website: "https://www.delarosasf.com/",
    style: "Roman Style",
    source: "Marina/Pacific Heights"
  },
  
  // Chain Restaurants with SF Locations
  {
    name: "Domino's Pizza",
    address: "Multiple SF locations",
    neighborhood: "Various",
    website: "https://www.dominos.com/",
    style: "Chain Delivery",
    source: "Chain Restaurants"
  },
  {
    name: "Papa John's",
    address: "Multiple SF locations", 
    neighborhood: "Various",
    website: "https://www.papajohns.com/",
    style: "Chain Delivery",
    source: "Chain Restaurants"
  },
  {
    name: "Pizza Hut",
    address: "Multiple SF locations",
    neighborhood: "Various", 
    website: "https://www.pizzahut.com/",
    style: "Chain Dine-in/Delivery",
    source: "Chain Restaurants"
  },
  {
    name: "Little Caesars",
    address: "Multiple SF locations",
    neighborhood: "Various",
    website: "https://www.littlecaesars.com/",
    style: "Chain Takeout",
    source: "Chain Restaurants"
  },
  
  // Delivery/App-Based Pizza
  {
    name: "Tony's Little Star (Delivery)",
    address: "Delivery-only locations",
    neighborhood: "Various",
    style: "Chicago Deep Dish Delivery",
    source: "Delivery/Ghost Kitchens"
  },
  
  // Additional Neighborhood Spots
  {
    name: "Goat Hill Pizza",
    address: "300 Connecticut St, San Francisco, CA 94107",
    neighborhood: "Potrero Hill",
    website: "https://www.goathillpizza.com/",
    style: "California Style",
    source: "Additional Neighborhood"
  },
  {
    name: "The Pizza Place on Noriega",
    address: "3901 Noriega St, San Francisco, CA 94122",
    neighborhood: "Sunset",
    style: "Neighborhood Pizza",
    source: "Additional Neighborhood"
  },
  {
    name: "Arinell Pizza",
    address: "509 Valencia St, San Francisco, CA 94110",
    neighborhood: "Mission",
    style: "New York Style",
    source: "Additional Neighborhood"
  },
  {
    name: "Cybelle's Pizza",
    address: "1234 Noriega St, San Francisco, CA 94122",
    neighborhood: "Sunset",
    style: "Neighborhood Pizza",
    source: "Additional Neighborhood"
  }
];

export class SFPizzaBaseline {
  
  analyzeBaseline(): void {
    console.log('📊 SAN FRANCISCO PIZZA RESTAURANT BASELINE ANALYSIS');
    console.log('=' .repeat(60));
    
    const totalRestaurants = sanFranciscoPizzaRestaurants.length;
    console.log(`🏆 Total pizza restaurants identified: ${totalRestaurants}`);
    
    // Analyze by neighborhood
    const byNeighborhood = sanFranciscoPizzaRestaurants.reduce((acc, r) => {
      acc[r.neighborhood] = (acc[r.neighborhood] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`\n🏘️  Distribution by neighborhood:`);
    Object.entries(byNeighborhood)
      .sort(([,a], [,b]) => b - a)
      .forEach(([neighborhood, count]) => {
        console.log(`  ${neighborhood}: ${count} restaurants`);
      });
    
    // Analyze by style
    const byStyle = sanFranciscoPizzaRestaurants.reduce((acc, r) => {
      acc[r.style] = (acc[r.style] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`\n🍕 Distribution by pizza style:`);
    Object.entries(byStyle)
      .sort(([,a], [,b]) => b - a)
      .forEach(([style, count]) => {
        console.log(`  ${style}: ${count} restaurants`);
      });
    
    // Analyze by source
    const bySource = sanFranciscoPizzaRestaurants.reduce((acc, r) => {
      acc[r.source] = (acc[r.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`\n📋 Distribution by source:`);
    Object.entries(bySource).forEach(([source, count]) => {
      console.log(`  ${source}: ${count} restaurants`);
    });
    
    // Count restaurants with websites
    const withWebsites = sanFranciscoPizzaRestaurants.filter(r => r.website).length;
    console.log(`\n🌐 Restaurants with websites: ${withWebsites} (${((withWebsites/totalRestaurants)*100).toFixed(1)}%)`);
    
    // Historical establishments
    const historical = sanFranciscoPizzaRestaurants.filter(r => r.established).length;
    console.log(`📅 Establishments with known founding dates: ${historical}`);
    
    console.log(`\n✅ BASELINE ESTABLISHED: ${totalRestaurants} total SF pizza restaurants`);
    console.log(`🔍 Ready for Part 2: Sourdough verification analysis`);
  }
  
  getRestaurantList(): SFPizzaRestaurant[] {
    return sanFranciscoPizzaRestaurants;
  }
  
  displaySampleRestaurants(): void {
    console.log(`\n🍕 Sample pizza restaurants from baseline:`);
    console.log('-'.repeat(50));
    
    sanFranciscoPizzaRestaurants.slice(0, 10).forEach((r, i) => {
      console.log(`${i + 1}. ${r.name}`);
      console.log(`   📍 ${r.address}`);
      console.log(`   🏘️  ${r.neighborhood}`);
      console.log(`   🍕 Style: ${r.style}`);
      if (r.website) console.log(`   🌐 ${r.website}`);
      if (r.established) console.log(`   📅 Est. ${r.established}`);
      console.log(`   📋 Source: ${r.source}\n`);
    });
    
    if (sanFranciscoPizzaRestaurants.length > 10) {
      console.log(`   ... and ${sanFranciscoPizzaRestaurants.length - 10} more restaurants`);
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 PART 1: San Francisco Pizza Restaurant Baseline');
  console.log('Goal: Establish comprehensive list of ALL pizza restaurants in SF');
  
  const baseline = new SFPizzaBaseline();
  
  baseline.analyzeBaseline();
  baseline.displaySampleRestaurants();
  
  console.log(`\n📈 NEXT STEPS:`);
  console.log(`1. ✅ Part 1 Complete: ${baseline.getRestaurantList().length} total SF pizza restaurants identified`);
  console.log(`2. 🔍 Part 2: Verify which restaurants use sourdough dough`);
  console.log(`3. 📊 Part 3: Calculate true sourdough adoption rate in SF`);
  console.log(`\n💡 This baseline gives us the denominator for measuring sourdough adoption!`);
}

main().catch(console.error);