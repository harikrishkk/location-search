import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Location {
  address: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  country?: string;
}

interface GeocodingResult {
  address_components: {
    long_name: string;
    short_name: string;
    types: string[];
  }[];
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
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
        types: ['geocode', 'establishment']
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

      const city = result.address_components?.find(
        component => component.types.includes('locality')
      )?.long_name;

      const state = result.address_components?.find(
        component => component.types.includes('administrative_area_level_1')
      )?.long_name;

      const country = result.address_components?.find(
        component => component.types.includes('country')
      )?.long_name;

      return {
        address: result.formatted_address,
        lat: result.geometry.location.lat(),
        lng: result.geometry.location.lng(),
        city,
        state,
        country
      };
    } catch (error) {
      console.error('Error getting location details:', error);
      throw error;
    }
  }
} 