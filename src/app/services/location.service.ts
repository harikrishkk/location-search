import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Location {
  address: string;
  lat: number;
  lng: number;
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
        { placeId, fields: ['formatted_address', 'geometry'] },
        (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place && place.formatted_address && place.geometry?.location) {
            resolve({
              address: place.formatted_address,
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            });
          } else {
            reject(status);
          }
        }
      );
    });
  }
} 