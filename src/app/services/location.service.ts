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
  geometry?: google.maps.LatLngLiteral[];
}

export interface Location {
  address: string;
  formatted_address: string;
  lat: number;
  lng: number;
  place_id: string;
  regions?: RegionBoundary[];
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private selectedLocation = new BehaviorSubject<Location | null>(null);
  selectedLocation$ = this.selectedLocation.asObservable();
  private placesService: google.maps.places.PlacesService;
  private geocoder: google.maps.Geocoder;

  constructor() {
    // Create a dummy div for PlacesService (required by Google Maps API)
    const dummyElement = document.createElement('div');
    this.placesService = new google.maps.places.PlacesService(dummyElement);
    this.geocoder = new google.maps.Geocoder();
  }

  setSelectedLocation(location: Location) {
    this.selectedLocation.next(location);
  }

  async searchAddress(query: string): Promise<google.maps.places.AutocompletePrediction[]> {
    if (!query) return [];

    try {
      const autocompleteService = new google.maps.places.AutocompleteService();
      const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve, reject) => {
        autocompleteService.getPlacePredictions(
          { input: query },
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
        this.placesService.findPlaceFromQuery(
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
  private async findRegionsForLocation(location: google.maps.LatLng): Promise<RegionBoundary[]> {
    try {
      // Get place details directly for the location
      const result = await new Promise<google.maps.GeocoderResult>((resolve, reject) => {
        this.geocoder.geocode(
          { location },
          (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
              resolve(results[0]);
            } else {
              reject(new Error('Geocoding failed'));
            }
          }
        );
      });

      const regions: RegionBoundary[] = [];
      
      // Process each administrative level
      result.address_components?.forEach(component => {
        if (component.types.some(type => 
            type.includes('administrative_area_level_') || 
            type === 'country')) {
          
          // Create a box around the center point for the region boundary
          const center = result.geometry.location;
          const offset = component.types[0] === 'country' ? 2 : // Larger box for country
                        component.types[0] === 'administrative_area_level_1' ? 1 : // Medium box for state
                        0.5; // Smaller box for other regions
          
          const geometry = [
            { lat: center.lat() + offset, lng: center.lng() + offset },
            { lat: center.lat() + offset, lng: center.lng() - offset },
            { lat: center.lat() - offset, lng: center.lng() - offset },
            { lat: center.lat() - offset, lng: center.lng() + offset },
            { lat: center.lat() + offset, lng: center.lng() + offset } // Close the polygon
          ];

          // Add the region with its boundary
          regions.push({
            placeId: result.place_id,
            name: component.long_name,
            regionType: component.types[0],
            geometry: geometry
          });
        }
      });

      return regions;
    } catch (error) {
      console.error('Error finding regions:', error);
      return [];
    }
  }

  async getLocationDetails(placeId: string): Promise<Location> {
    try {
      // First get place details
      const placeResult = await this.getPlaceDetails(placeId);
      
      if (!placeResult.geometry?.location) {
        throw new Error('No geometry found for location');
      }

      const location: Location = {
        address: placeResult.formatted_address || '',
        formatted_address: placeResult.formatted_address || '',
        lat: placeResult.geometry.location.lat(),
        lng: placeResult.geometry.location.lng(),
        place_id: placeId
      };

      // Then get regions that contain this location
      const regions = await this.findRegionsForLocation(new google.maps.LatLng(location.lat, location.lng));
      
      if (regions.length > 0) {
        location.regions = regions;
      }

      return location;
    } catch (error) {
      console.error('Error getting location details:', error);
      throw error;
    }
  }

  private async getPlaceDetails(placeId: string): Promise<google.maps.places.PlaceResult> {
    return new Promise((resolve, reject) => {
      this.placesService.getDetails(
        {
          placeId: placeId,
          fields: ['formatted_address', 'geometry', 'place_id', 'address_components']
        },
        (result, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && result) {
            resolve(result);
          } else {
            reject(new Error('Failed to get place details'));
          }
        }
      );
    });
  }
} 