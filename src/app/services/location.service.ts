import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

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
  
  // Additional helpful fields for region identification
  political_divisions?: string[];  // All political divisions found
  area_types?: string[];          // All types of areas found
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

      // Log raw data for debugging
      console.log('Raw geocoding result:', result);

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

        // Store all political divisions and area types
        political_divisions: politicalDivisions,
        area_types: areaTypes
      };

      // Log processed data
      console.log('Processed location details:', {
        political_divisions: location.political_divisions,
        area_types: location.area_types,
        administrative_levels: {
          level1: location.administrative_area_level_1,
          level2: location.administrative_area_level_2,
          level3: location.administrative_area_level_3,
          level4: location.administrative_area_level_4,
          level5: location.administrative_area_level_5
        }
      });

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