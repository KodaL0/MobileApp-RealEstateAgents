export const PROPERTIES = [
  {
    id: 1,
    title: 'Modern Apartment with Ocean View',
    description: 'Elegant apartment featuring stunning ocean views, open layout with natural lighting, modern kitchen, spa-like bathrooms, and top-notch amenities. Ideal location near shopping, dining, and entertainment.',
    location: 'Miami Beach, FL',
    latitude: 25.7907,
    longitude: -80.1300,
    price: 450000,
    bedrooms: 2,
    bathrooms: 2,
    size: 1200,
    forSale: true,
    propertyType: 'Apartment',
    features: [
      'Swimming Pool',
      'Fitness Center',
      'Parking Space',
      'Balcony',
      'Air Conditioning',
      'Security System',
      'Elevator',
      'Smart Home Technology'
    ],
    images: [
      'https://images.pexels.com/photos/1918291/pexels-photo-1918291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
    ],
    agent: {
      name: 'Michael Rodriguez',
      photo: 'https://images.pexels.com/photos/5792641/pexels-photo-5792641.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      company: 'Miami Luxury Realty'
    }
  },
  {
    id: 2,
    title: 'Luxury Beachfront Villa',
    description: 'Spectacular beachfront villa with panoramic ocean views, private beach access, infinity pool, and outdoor entertainment area. Features gourmet kitchen, spacious living areas, and luxurious master suite with ocean-view balcony.',
    location: 'Malibu, CA',
    latitude: 25.7617,
    longitude: -80.1918,
    price: 3500000,
    bedrooms: 5,
    bathrooms: 6,
    size: 4500,
    forSale: true,
    propertyType: 'House',
    features: [
      'Private Beach Access',
      'Infinity Pool',
      'Home Theater',
      'Wine Cellar',
      'Outdoor Kitchen',
      'Smart Home System',
      'Private Gym',
      '4-Car Garage'
    ],
    images: [
      'https://images.pexels.com/photos/32870/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/1438832/pexels-photo-1438832.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
    ],
    agent: {
      name: 'Sophia Martinez',
      photo: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      company: 'Coastal Luxury Properties'
    }
  },
  {
    id: 3,
    title: 'Modern Downtown Loft',
    description: 'Stunning industrial loft in the heart of downtown featuring exposed brick walls, high ceilings, and oversized windows with city views. Open concept living space with gourmet kitchen, custom cabinetry, and premium appliances.',
    location: 'New York, NY',
    latitude: 25.7749,
    longitude: -80.1937,
    price: 5500,
    bedrooms: 1,
    bathrooms: 2,
    size: 1800,
    forSale: false,
    propertyType: 'Loft',
    features: [
      'Exposed Brick Walls',
      'High Ceilings',
      'Hardwood Floors',
      'Rooftop Access',
      'In-unit Laundry',
      'Central Air',
      'Building Security',
      'Elevator'
    ],
    images: [
      'https://images.pexels.com/photos/1457847/pexels-photo-1457847.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/1090638/pexels-photo-1090638.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/2251247/pexels-photo-2251247.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
    ],
    agent: {
      name: 'David Chen',
      photo: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      company: 'Urban Living Realty'
    }
  },
  {
    id: 4,
    title: 'Charming Suburban Family Home',
    description: 'Beautiful family home in a quiet suburb featuring spacious living areas, updated kitchen, family room with fireplace, formal dining room, and large backyard with covered patio. Perfect for entertaining and family living.',
    location: 'Austin, TX',
    latitude: 25.7517,
    longitude: -80.1918,
    price: 525000,
    bedrooms: 4,
    bathrooms: 3,
    size: 2800,
    forSale: true,
    propertyType: 'House',
    features: [
      'Large Backyard',
      'Fireplace',
      'Covered Patio',
      'Updated Kitchen',
      'Walk-in Closets',
      'Two-car Garage',
      'Central Heating',
      'Central Air'
    ],
    images: [
      'https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
    ],
    agent: {
      name: 'Jessica Taylor',
      photo: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      company: 'Austin Home Experts'
    }
  },
  {
    id: 5,
    title: 'Waterfront Condo with Marina Views',
    description: 'Luxurious waterfront condo with stunning marina views, modern interior finishes, open floor plan, and private balcony. Community amenities include pool, fitness center, clubhouse, and direct marina access.',
    location: 'San Diego, CA',
    latitude: 25.7817,
    longitude: -80.1818,
    price: 3800,
    bedrooms: 2,
    bathrooms: 2,
    size: 1500,
    forSale: false,
    propertyType: 'Condo',
    features: [
      'Marina Views',
      'Community Pool',
      'Fitness Center',
      'Secured Parking',
      'Private Balcony',
      'Concierge Service',
      'Pet Friendly',
      'Storage Unit'
    ],
    images: [
      'https://images.pexels.com/photos/2121121/pexels-photo-2121121.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/1571459/pexels-photo-1571459.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
    ],
    agent: {
      name: 'Robert Johnson',
      photo: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      company: 'Coastal Property Management'
    }
  },
  {
    id: 6,
    title: 'Modern Mountain Retreat',
    description: 'Stunning contemporary mountain home with breathtaking views, floor-to-ceiling windows, open living concept, gourmet kitchen, and outdoor living spaces. Features include stone fireplace, spa-inspired bathrooms, and heated floors.',
    location: 'Aspen, CO',
    latitude: 25.7717,
    longitude: -80.2018,
    price: 1750000,
    bedrooms: 3,
    bathrooms: 3.5,
    size: 3200,
    forSale: true,
    propertyType: 'House',
    features: [
      'Mountain Views',
      'Hot Tub',
      'Stone Fireplace',
      'Heated Floors',
      'Home Office',
      'Wine Cellar',
      'Ski Storage',
      'Heated Driveway'
    ],
    images: [
      'https://images.pexels.com/photos/731082/pexels-photo-731082.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/1115804/pexels-photo-1115804.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/2724748/pexels-photo-2724748.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
    ],
    agent: {
      name: 'Amanda Winters',
      photo: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      company: 'Mountain Luxury Estates'
    }
  },
  {
    id: 7,
    title: 'Historic Brownstone Townhouse',
    description: 'Beautifully restored historic brownstone townhouse featuring original architectural details, modern updates, and outdoor garden space. Includes high ceilings, hardwood floors, decorative fireplaces, and custom millwork.',
    location: 'Boston, MA',
    latitude: 25.7607,
    longitude: -80.1918,
    price: 2250000,
    bedrooms: 4,
    bathrooms: 3.5,
    size: 3000,
    forSale: true,
    propertyType: 'Townhouse',
    features: [
      'Original Architectural Details',
      'Private Garden',
      'Decorative Fireplaces',
      'Custom Millwork',
      'Renovated Kitchen',
      'Wine Cellar',
      'Custom Lighting',
      'Built-in Bookshelves'
    ],
    images: [
      'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/2089698/pexels-photo-2089698.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
    ],
    agent: {
      name: 'Thomas Sullivan',
      photo: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      company: 'Historic Home Specialists'
    }
  },
  {
    id: 8,
    title: 'Luxury High-Rise Penthouse',
    description: 'Spectacular penthouse apartment with panoramic city views, spacious open floor plan, gourmet kitchen, floor-to-ceiling windows, and private terrace. Building amenities include concierge, pool, spa, and fitness center.',
    location: 'Chicago, IL',
    price: 8500,
    bedrooms: 3,
    bathrooms: 3.5,
    size: 3500,
    forSale: false,
    propertyType: 'Apartment',
    features: [
      'Panoramic Views',
      'Private Terrace',
      'Concierge Service',
      'Fitness Center',
      'Indoor Pool',
      'Wine Storage',
      'Private Elevator',
      '24-hour Security'
    ],
    images: [
      'https://images.pexels.com/photos/1571468/pexels-photo-1571468.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/1643384/pexels-photo-1643384.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/3773582/pexels-photo-3773582.png?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
    ],
    agent: {
      name: 'Emily Zhang',
      photo: 'https://images.pexels.com/photos/789822/pexels-photo-789822.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      company: 'Urban Luxury Properties'
    }
  },
  {
    id: 9,
    title: 'Spacious Contemporary Ranch',
    description: 'Beautifully updated ranch home on a corner lot featuring open concept living, gourmet kitchen with island, spacious primary suite, and finished basement. Includes landscaped yard with patio and firepit area.',
    location: 'Denver, CO',
    price: 685000,
    bedrooms: 4,
    bathrooms: 3,
    size: 2600,
    forSale: true,
    propertyType: 'House',
    features: [
      'Corner Lot',
      'Finished Basement',
      'Outdoor Firepit',
      'Updated Kitchen',
      'New HVAC System',
      'Hardwood Floors',
      'Landscaped Yard',
      'Mudroom'
    ],
    images: [
      'https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/534151/pexels-photo-534151.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
    ],
    agent: {
      name: 'Marcus Williams',
      photo: 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      company: 'Mile High Realty'
    }
  },
  {
    id: 10,
    title: 'Urban Industrial Loft',
    description: 'Stylish industrial loft in converted warehouse featuring exposed brick and timber beams, polished concrete floors, and oversized windows. Open concept space with modern kitchen, custom lighting, and designer finishes.',
    location: 'Portland, OR',
    price: 3200,
    bedrooms: 1,
    bathrooms: 1.5,
    size: 1600,
    forSale: false,
    propertyType: 'Loft',
    features: [
      'Exposed Brick',
      'Timber Beams',
      'Concrete Floors',
      'Custom Lighting',
      'Walk-in Closet',
      'Stainless Appliances',
      'Gas Fireplace',
      'Bike Storage'
    ],
    images: [
      'https://images.pexels.com/photos/1005058/pexels-photo-1005058.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      'https://images.pexels.com/photos/1062269/pexels-photo-1062269.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
    ],
    agent: {
      name: 'Olivia Parker',
      photo: 'https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      company: 'Urban Living Specialists'
    }
  }
];