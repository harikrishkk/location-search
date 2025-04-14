// US State FIPS Codes
export const STATE_FIPS_CODES: { [key: string]: string } = {
  'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06',
  'CO': '08', 'CT': '09', 'DE': '10', 'FL': '12', 'GA': '13',
  'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18', 'IA': '19',
  'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24',
  'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28', 'MO': '29',
  'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33', 'NJ': '34',
  'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39',
  'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45',
  'SD': '46', 'TN': '47', 'TX': '48', 'UT': '49', 'VT': '50',
  'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55', 'WY': '56'
};

// Reverse lookup for state FIPS codes
export const STATE_BY_FIPS: { [key: string]: string } = 
  Object.entries(STATE_FIPS_CODES).reduce((acc, [state, fips]) => {
    acc[fips] = state;
    return acc;
  }, {} as { [key: string]: string });

// County FIPS codes structure
export interface CountyFips {
  state: string;      // State FIPS code
  county: string;     // County FIPS code
  name: string;       // County name
  state_code: string; // State abbreviation
  population?: number; // Population (optional, from latest census)
  region?: string;    // Geographic region (e.g., 'Northeast', 'Midwest', etc.)
}

// Major US Counties (Top counties by population and economic significance)
export const COUNTY_FIPS: CountyFips[] = [
  // New York
  { state: '36', county: '061', name: 'New York County', state_code: 'NY', region: 'Northeast' },
  { state: '36', county: '047', name: 'Kings County', state_code: 'NY', region: 'Northeast' },
  { state: '36', county: '081', name: 'Queens County', state_code: 'NY', region: 'Northeast' },
  { state: '36', county: '005', name: 'Bronx County', state_code: 'NY', region: 'Northeast' },
  
  // California
  { state: '06', county: '037', name: 'Los Angeles County', state_code: 'CA', region: 'West' },
  { state: '06', county: '075', name: 'San Francisco County', state_code: 'CA', region: 'West' },
  { state: '06', county: '085', name: 'Santa Clara County', state_code: 'CA', region: 'West' },
  { state: '06', county: '001', name: 'Alameda County', state_code: 'CA', region: 'West' },
  { state: '06', county: '067', name: 'Sacramento County', state_code: 'CA', region: 'West' },
  
  // Illinois
  { state: '17', county: '031', name: 'Cook County', state_code: 'IL', region: 'Midwest' },
  { state: '17', county: '043', name: 'DuPage County', state_code: 'IL', region: 'Midwest' },
  { state: '17', county: '089', name: 'Kane County', state_code: 'IL', region: 'Midwest' },
  
  // Texas
  { state: '48', county: '201', name: 'Harris County', state_code: 'TX', region: 'South' },
  { state: '48', county: '113', name: 'Dallas County', state_code: 'TX', region: 'South' },
  { state: '48', county: '029', name: 'Bexar County', state_code: 'TX', region: 'South' },
  
  // Florida
  { state: '12', county: '086', name: 'Miami-Dade County', state_code: 'FL', region: 'South' },
  { state: '12', county: '011', name: 'Broward County', state_code: 'FL', region: 'South' },
  { state: '12', county: '095', name: 'Orange County', state_code: 'FL', region: 'South' },
  
  // Additional major metropolitan counties
  { state: '42', county: '101', name: 'Philadelphia County', state_code: 'PA', region: 'Northeast' },
  { state: '04', county: '013', name: 'Maricopa County', state_code: 'AZ', region: 'West' },
  { state: '53', county: '033', name: 'King County', state_code: 'WA', region: 'West' },
  { state: '27', county: '053', name: 'Hennepin County', state_code: 'MN', region: 'Midwest' },
  { state: '26', county: '163', name: 'Wayne County', state_code: 'MI', region: 'Midwest' }
];

// US Geographic Regions
export const US_REGIONS = {
  'Northeast': ['CT', 'ME', 'MA', 'NH', 'RI', 'VT', 'NJ', 'NY', 'PA'],
  'Midwest': ['IL', 'IN', 'MI', 'OH', 'WI', 'IA', 'KS', 'MN', 'MO', 'NE', 'ND', 'SD'],
  'South': ['DE', 'FL', 'GA', 'MD', 'NC', 'SC', 'VA', 'WV', 'AL', 'KY', 'MS', 'TN', 'AR', 'LA', 'OK', 'TX'],
  'West': ['AZ', 'CO', 'ID', 'MT', 'NV', 'NM', 'UT', 'WY', 'AK', 'CA', 'HI', 'OR', 'WA']
};

// Helper functions for FIPS code lookups
export function getStateFipsCode(stateCode: string): string | undefined {
  return STATE_FIPS_CODES[stateCode.toUpperCase()];
}

export function getStateByFipsCode(fipsCode: string): string | undefined {
  return STATE_BY_FIPS[fipsCode];
}

export function getCountyFipsCode(stateFips: string, countyName: string): string | undefined {
  const normalizedCountyName = countyName.toLowerCase().replace(' county', '').trim();
  const county = COUNTY_FIPS.find(c => 
    c.state === stateFips && 
    c.name.toLowerCase().replace(' county', '').trim() === normalizedCountyName
  );
  return county?.county;
}

export function getFullFipsCode(stateFips: string, countyFips: string): string {
  return `${stateFips}${countyFips}`;
}

export function parseFullFipsCode(fullFips: string): { state: string; county: string } | null {
  if (fullFips.length !== 5) return null;
  return {
    state: fullFips.substring(0, 2),
    county: fullFips.substring(2)
  };
}

// Helper functions for region type identification
export function isStateCode(code: string): boolean {
  return code.length === 2 && STATE_FIPS_CODES.hasOwnProperty(code.toUpperCase());
}

export function isCountyFipsCode(code: string): boolean {
  return code.length === 3 && /^\d{3}$/.test(code);
}

export function isFullFipsCode(code: string): boolean {
  return code.length === 5 && /^\d{5}$/.test(code);
}

// Get region for a state
export function getStateRegion(stateCode: string): string | undefined {
  const upperState = stateCode.toUpperCase();
  return Object.entries(US_REGIONS).find(([_, states]) => 
    states.includes(upperState)
  )?.[0];
}

// Get all counties in a region
export function getCountiesByRegion(region: string): CountyFips[] {
  return COUNTY_FIPS.filter(county => county.region === region);
}

// Get all counties in a state
export function getCountiesByState(stateCode: string): CountyFips[] {
  return COUNTY_FIPS.filter(county => county.state_code === stateCode.toUpperCase());
}

// Check if a county is a major metropolitan area
export function isMajorMetroCounty(stateFips: string, countyFips: string): boolean {
  return COUNTY_FIPS.some(county => 
    county.state === stateFips && county.county === countyFips
  );
} 