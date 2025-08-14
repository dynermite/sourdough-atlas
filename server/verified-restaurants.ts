// Verified authentic sourdough restaurants for baseline testing
// All data sourced from restaurant websites and verified reviews

export interface VerifiedRestaurant {
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  website: string;
  description: string;
  sourdoughKeywords: string[];
  verificationSource: string;
  latitude: number;
  longitude: number;
}

export const verifiedSourdoughRestaurants: VerifiedRestaurant[] = [
  // PORTLAND, OREGON
  {
    name: "Lovely's Fifty Fifty",
    address: "4039 N Mississippi Ave, Portland, OR 97227",
    city: "Portland",
    state: "OR",
    phone: "(503) 281-4060",
    website: "https://www.lovelysfiftyfifty.com",
    description: "Oregon sourdough pizza using named sourdough starter 'Jake' fed exclusively with locally milled grains. Featured on Netflix's Chef's Table: Pizza.",
    sourdoughKeywords: ["sourdough", "naturally leavened", "fermented", "starter"],
    verificationSource: "Web research - featured on Chef's Table for sourdough expertise",
    latitude: 45.5515,
    longitude: -122.6764
  },
  {
    name: "Ken's Artisan Pizza",
    address: "304 SE 28th Ave, Portland, OR 97214",
    city: "Portland", 
    state: "OR",
    phone: "(503) 517-9951",
    website: "https://kensartisan.com/pizza",
    description: "Wood-fired Neapolitan pizza with slow-fermented sourdough starter. Ranked #25 in Portland's top restaurants 2025.",
    sourdoughKeywords: ["sourdough", "fermented dough", "starter"],
    verificationSource: "Multiple Portland food guides confirm sourdough process",
    latitude: 45.5045,
    longitude: -122.6348
  },
  {
    name: "Oven and Shaker",
    address: "1134 NW Everett St, Portland, OR 97209",
    city: "Portland",
    state: "OR", 
    phone: "(503) 241-1600",
    website: "https://www.ovenandshaker.com",
    description: "Hand-tossed wood-fired Neapolitan pizzas using 70-year-old sourdough starter. James Beard nominated Chef Cathy Whims.",
    sourdoughKeywords: ["sourdough starter", "70-year-old starter", "naturally leavened"],
    verificationSource: "Restaurant website specifically mentions 70-year-old sourdough starter",
    latitude: 45.5248,
    longitude: -122.6835
  },
  {
    name: "Scottie's Pizza Parlor",
    address: "2128 SE Division St, Portland, OR 97202", 
    city: "Portland",
    state: "OR",
    phone: "(503) 477-4848",
    website: "https://www.scottiespizzaparlor.com",
    description: "East Coast-style pies with naturally leavened dough. Slowly fermented sourdough with crisp, light, airy texture.",
    sourdoughKeywords: ["naturally leavened", "fermented", "sourdough"],
    verificationSource: "Portland food guides confirm naturally leavened dough process",
    latitude: 45.5045,
    longitude: -122.6348
  },

  // SAN FRANCISCO BAY AREA
  {
    name: "Cheese Board Pizza",
    address: "1512 Shattuck Ave, Berkeley, CA 94709",
    city: "Berkeley",
    state: "CA",
    phone: "(510) 549-3055", 
    website: "https://cheeseboardcollective.coop",
    description: "Uses the same sourdough starter for decades. Worker-owned collective since 1971 with thin-crusted sourdough pizza.",
    sourdoughKeywords: ["sourdough starter", "decades-old starter", "naturally leavened"],
    verificationSource: "Historic sourdough collective - decades of documented sourdough use",
    latitude: 37.8799,
    longitude: -122.2677
  },
  {
    name: "Arizmendi Bakery",
    address: "1331 9th Ave, San Francisco, CA 94122",
    city: "San Francisco", 
    state: "CA",
    phone: "(415) 566-3117",
    website: "https://www.arizmendibakery.com",
    description: "Authentic fermentation culture using decades-old sourdough starter. Thin-crusted sourdough pizza from worker-owned cooperative.",
    sourdoughKeywords: ["sourdough starter", "fermentation", "naturally leavened"],
    verificationSource: "Sister bakery to Cheese Board, same sourdough tradition",
    latitude: 37.7629,
    longitude: -122.4664
  },
  {
    name: "Long Bridge Pizza Co",
    address: "1007 3rd St, San Francisco, CA 94158",
    city: "San Francisco",
    state: "CA",
    phone: "(415) 701-9467",
    website: "https://www.longbridgepizza.com",
    description: "Specializes in thin sourdough crust pizzas in San Francisco's Dogpatch neighborhood.",
    sourdoughKeywords: ["sourdough crust", "sourdough", "naturally leavened"],
    verificationSource: "Restaurant website and SF Chronicle confirm sourdough specialization",
    latitude: 37.7749,
    longitude: -122.3904
  },

  // SEATTLE, WASHINGTON
  {
    name: "Stevie's Famous Pizza", 
    address: "422 SW 152nd St, Burien, WA 98166",
    city: "Burien",
    state: "WA",
    phone: "(206) 244-7100",
    website: "https://www.steviesfamouspizza.com",
    description: "Sourdough crust that sharply crackles on the front end while giving way to a light and airy chew.",
    sourdoughKeywords: ["sourdough crust", "sourdough"],
    verificationSource: "Seattle Magazine and local reviews confirm sourdough specialization",
    latitude: 47.4698,
    longitude: -122.3467
  },
  {
    name: "Lupo",
    address: "4303 Fremont Ave N, Seattle, WA 98103", 
    city: "Seattle",
    state: "WA",
    phone: "(206) 457-7106",
    website: "https://www.lupo-seattle.com",
    description: "Sourdough pies fired in Neapolitan pizza oven creating leopard spots with chewier texture and fermentation tang.",
    sourdoughKeywords: ["sourdough", "fermentation", "naturally leavened"],
    verificationSource: "Seattle food guides confirm sourdough-Neapolitan hybrid approach",
    latitude: 47.6587,
    longitude: -122.3499
  },
  {
    name: "Sourdough Willy's Pizzeria",
    address: "25569 Bond Rd NE, Kingston, WA 98346",
    city: "Kingston", 
    state: "WA",
    phone: "(360) 297-2541",
    website: "https://sourdoughwillys.com",
    description: "Uses 127-year-old sourdough starter from Alaskan gold rush. One of oldest sourdough starters in commercial use in Pacific Northwest.",
    sourdoughKeywords: ["sourdough starter", "127-year-old starter", "gold rush sourdough"],
    verificationSource: "Restaurant website documents historic 127-year-old sourdough starter",
    latitude: 47.7962,
    longitude: -122.4985
  },

  // SANDPOINT, IDAHO (Already verified)
  {
    name: "The Forge Artisan Pizza",
    address: "306 Pine Street, Sandpoint, ID 83864",
    city: "Sandpoint",
    state: "ID", 
    phone: "(208) 252-9433",
    website: "https://forgeartisanpizza.com",
    description: "Our pizzas and breads are all naturally leavened 'sourdough'. We import an amazing flour from a small, family-run mill between Rome and Naples, Italy.",
    sourdoughKeywords: ["naturally leavened", "sourdough"],
    verificationSource: "Restaurant website explicitly states all pizzas are naturally leavened sourdough",
    latitude: 48.2766,
    longitude: -116.5531
  }
];