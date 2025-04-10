import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Location {
  address: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  country?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private selectedLocation = new BehaviorSubject<Location | null>(null);
  selectedLocation$ = this.selectedLocation.asObservable();

  constructor() {}

  setSelectedLocation(location: Location) {
    this.selectedLocation.next(location);
  }

  async searchAddress(query: string): Promise<google.maps.places.AutocompletePrediction[]> {
    return new Promise((resolve, reject) => {
      const service = new google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        { input: query },
        (predictions: google.maps.places.AutocompletePrediction[] | null, status: google.maps.places.PlacesServiceStatus) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            resolve(predictions);
          } else {
            reject(status);
          }
        }
      );
    });
  }

  async getPlaceDetails(placeId: string): Promise<Location> {
    return new Promise((resolve, reject) => {
      const map = new google.maps.Map(document.createElement('div'));
      const service = new google.maps.places.PlacesService(map);
      
      service.getDetails(
        { 
          placeId, 
          fields: [
            'formatted_address', 
            'geometry',
            'address_components'
          ] 
        },
        (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place && place.formatted_address && place.geometry?.location) {
            const city = place.address_components?.find(
              component => component.types.includes('locality')
            )?.long_name;

            const state = place.address_components?.find(
              component => component.types.includes('administrative_area_level_1')
            )?.long_name;

            const country = place.address_components?.find(
              component => component.types.includes('country')
            )?.long_name;

            resolve({
              address: place.formatted_address,
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              city,
              state,
              country
            });
          } else {
            reject(status);
          }
        }
      );
    });
  }
} 