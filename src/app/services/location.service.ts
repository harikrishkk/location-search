import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  getStateFipsCode,
  getCountyFipsCode,
  isStateCode,
  isCountyFipsCode,
  isFullFipsCode,
  parseFullFipsCode,
  getFullFipsCode,
  getStateByFipsCode,
  getStateRegion,
  US_REGIONS
} from './region-codes';

export interface RegionBoundary {
  placeId: string;
  name: string;
  regionType: string;  // e.g., 'country', 'administrative_area_level_1', etc.
  fipsCode?: string;   // For US states and counties
}

export interface Location {
  address: string;
  lat: number;
  lng: number;
  // Core location data
  formatted_address: string;
  place_id: string;
  
  // Administrative divisions (from largest to smallest)
  country?: string;
  country_code?: string;
  
  // Level 1 - State/Province/Region
  administrative_area_level_1?: string;
  administrative_area_level_1_code?: string;
  
  // Level 2 - County/District
  administrative_area_level_2?: string;
  
  // Level 3 - Sub-district/City-division
  administrative_area_level_3?: string;
  
  // Level 4 - Neighborhood/Ward/Borough
  administrative_area_level_4?: string;
  
  // Level 5 - Sub-neighborhood/Village
  administrative_area_level_5?: string;
  
  // Additional location details
  locality?: string;           // City/Town
  sublocality?: string;       // District within city
  postal_code?: string;
  
  // Region specific codes
  fips_state?: string;        // US State FIPS code
  fips_county?: string;       // US County FIPS code
  
  // Additional helpful fields for region identification
  political_divisions?: string[];  // All political divisions found
  area_types?: string[];          // All types of areas found
  region_boundaries?: RegionBoundary[];  // Associated region boundaries
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private selectedLocation = new BehaviorSubject<Location | null>(null);
  selectedLocation$ = this.selectedLocation.asObservable();
  private autocompleteService: google.maps.places.AutocompleteService;
  private geocoder: google.maps.Geocoder;

  constructor() {
    this.autocompleteService = new google.maps.places.AutocompleteService();
    this.geocoder = new google.maps.Geocoder();
  }

  setSelectedLocation(location: Location) {
    this.selectedLocation.next(location);
  }

  async searchAddress(query: string): Promise<google.maps.places.AutocompletePrediction[]> {
    if (!query) {
      return [];
    }

    try {
      const request: google.maps.places.AutocompletionRequest = {
        input: query,
        types: ['geocode']
      };

      const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve, reject) => {
        this.autocompleteService.getPlacePredictions(
          request,
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              resolve(results);
            } else {
              resolve([]);
            }
          }
        );
      });

      return predictions;
    } catch (error) {
      console.error('Error getting predictions:', error);
      return [];
    }
  }

  // Look up a region by name or FIPS code
  async lookupRegion(query: string, regionType?: string): Promise<RegionBoundary | null> {
    try {
      let searchQuery = query;
      let searchType = regionType;

      // Handle FIPS code lookups
      if (!regionType) {
        if (isStateCode(query)) {
          const fipsCode = getStateFipsCode(query);
          if (fipsCode) {
            searchQuery = `US-${query}`;
            searchType = 'administrative_area_level_1';
          }
        } else if (isFullFipsCode(query)) {
          const parsed = parseFullFipsCode(query);
          if (parsed) {
            const stateCode = getStateByFipsCode(parsed.state);
            if (stateCode) {
              searchQuery = `US-${stateCode}`;
              searchType = 'administrative_area_level_2';
            }
          }
        }
      }

      const request = {
        query: searchQuery,
        regionType: searchType,
        fields: ['place_id', 'name', 'types', 'geometry']
      };

      const response = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
        const service = new google.maps.places.PlacesService(document.createElement('div'));
        service.findPlaceFromQuery(
          request as google.maps.places.FindPlaceFromQueryRequest,
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
              resolve(results[0]);
            } else {
              reject(new Error('Region lookup failed'));
            }
          }
        );
      });

      const boundary: RegionBoundary = {
        placeId: response.place_id!,
        name: response.name!,
        regionType: response.types?.[0] || 'unknown'
      };

      // Add FIPS codes if applicable
      if (isStateCode(query)) {
        boundary.fipsCode = getStateFipsCode(query);
      } else if (isFullFipsCode(query)) {
        boundary.fipsCode = query;
      }

      return boundary;
    } catch (error) {
      console.error('Error looking up region:', error);
      return null;
    }
  }

  // Search for regions containing a specific location
  async findRegionsForLocation(location: google.maps.LatLng | string): Promise<RegionBoundary[]> {
    try {
      const results = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        this.geocoder.geocode(
          typeof location === 'string' ? { address: location } : { location },
          (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results) {
              resolve(results);
            } else {
              reject(new Error('Region search failed'));
            }
          }
        );
      });

      const regions: RegionBoundary[] = [];
      
      results.forEach(result => {
        result.address_components?.forEach(component => {
          if (component.types.some(type => 
              type.includes('administrative_area_level_') || 
              type === 'country' || 
              type === 'locality')) {
            regions.push({
              placeId: result.place_id,
              name: component.long_name,
              regionType: component.types[0]
            });
          }
        });
      });

      return regions;
    } catch (error) {
      console.error('Error finding regions:', error);
      return [];
    }
  }

  async getLocationDetails(placeId: string): Promise<Location> {
    try {
      const result = await new Promise<google.maps.GeocoderResult>((resolve, reject) => {
        this.geocoder.geocode(
          { placeId },
          (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
              resolve(results[0]);
            } else {
              reject(new Error('Geocoding failed'));
            }
          }
        );
      });

      // Collect all political divisions and area types
      const politicalDivisions: string[] = [];
      const areaTypes: string[] = [];
      
      result.address_components?.forEach(component => {
        if (component.types.includes('political')) {
          politicalDivisions.push(component.long_name);
        }
        component.types.forEach(type => {
          if (!areaTypes.includes(type)) {
            areaTypes.push(type);
          }
        });
      });

      // Helper function to find address components
      const findAddressComponent = (types: string[], returnShortName = false): string | undefined => {
        const component = result.address_components?.find(
          component => types.some(type => component.types.includes(type))
        );
        return component ? (returnShortName ? component.short_name : component.long_name) : undefined;
      };

      // Get all administrative levels
      const administrativeLevels: { [key: string]: string | undefined } = {};
      for (let i = 1; i <= 5; i++) {
        const level = `administrative_area_level_${i}`;
        administrativeLevels[level] = findAddressComponent([level]);
      }

      // Get FIPS codes for US locations
      let fips_state: string | undefined;
      let fips_county: string | undefined;
      
      const countryCode = findAddressComponent(['country'], true);
      if (countryCode === 'US') {
        const state = findAddressComponent(['administrative_area_level_1'], true);
        const county = findAddressComponent(['administrative_area_level_2']);
        if (state) {
          fips_state = getStateFipsCode(state);
          if (county && fips_state) {
            fips_county = getCountyFipsCode(fips_state, county);
          }
        }
      }

      // Get associated regions
      const regions = await this.findRegionsForLocation(result.geometry.location);

      // Add FIPS codes to regions where applicable
      regions.forEach(region => {
        if (region.regionType === 'administrative_area_level_1' && countryCode === 'US') {
          const stateCode = findAddressComponent(['administrative_area_level_1'], true);
          if (stateCode) {
            region.fipsCode = getStateFipsCode(stateCode);
          }
        } else if (region.regionType === 'administrative_area_level_2' && countryCode === 'US') {
          const county = findAddressComponent(['administrative_area_level_2']);
          if (county && fips_state) {
            const countyFips = getCountyFipsCode(fips_state, county);
            if (countyFips) {
              region.fipsCode = getFullFipsCode(fips_state, countyFips);
            }
          }
        }
      });

      const location: Location = {
        address: result.formatted_address,
        formatted_address: result.formatted_address,
        lat: result.geometry.location.lat(),
        lng: result.geometry.location.lng(),
        place_id: placeId,

        // Country level
        country: findAddressComponent(['country']),
        country_code: findAddressComponent(['country'], true),

        // Administrative levels
        administrative_area_level_1: administrativeLevels['administrative_area_level_1'],
        administrative_area_level_1_code: findAddressComponent(['administrative_area_level_1'], true),
        administrative_area_level_2: administrativeLevels['administrative_area_level_2'],
        administrative_area_level_3: administrativeLevels['administrative_area_level_3'],
        administrative_area_level_4: administrativeLevels['administrative_area_level_4'],
        administrative_area_level_5: administrativeLevels['administrative_area_level_5'],

        // City/District level
        locality: findAddressComponent(['locality']),
        sublocality: findAddressComponent(['sublocality']),
        postal_code: findAddressComponent(['postal_code']),

        // Region codes
        fips_state,
        fips_county,

        // Store all political divisions and area types
        political_divisions: politicalDivisions,
        area_types: areaTypes,
        region_boundaries: regions
      };

      return location;
    } catch (error) {
      console.error('Error getting location details:', error);
      throw error;
    }
  }

  // Helper method to get a specific administrative level
  getAdministrativeLevel(location: Location, level: number): string | undefined {
    const key = `administrative_area_level_${level}` as keyof Location;
    return location[key] as string | undefined;
  }

  // Helper method to get all political divisions
  getPoliticalDivisions(location: Location): string[] {
    return location.political_divisions || [];
  }

  // Helper method to check if a location has a specific area type
  hasAreaType(location: Location, areaType: string): boolean {
    return location.area_types?.includes(areaType) || false;
  }
} 