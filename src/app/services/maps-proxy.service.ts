import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MapsProxyService {
  private readonly API_URL = 'YOUR_BACKEND_URL'; // Replace with your backend API URL

  constructor(private http: HttpClient) {}

  getPlacePredictions(input: string): Observable<google.maps.places.AutocompletePrediction[]> {
    // In production, this should call your backend API
    return from(new Promise<google.maps.places.AutocompletePrediction[]>((resolve, reject) => {
      const service = new google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        { input },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            resolve(predictions);
          } else {
            reject(status);
          }
        }
      );
    }));
  }

  getPlaceDetails(placeId: string): Observable<any> {
    // In production, this should call your backend API
    return from(new Promise((resolve, reject) => {
      const map = new google.maps.Map(document.createElement('div'));
      const service = new google.maps.places.PlacesService(map);
      
      service.getDetails(
        { placeId, fields: ['formatted_address', 'geometry'] },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            resolve({
              address: place.formatted_address,
              lat: place.geometry?.location?.lat(),
              lng: place.geometry?.location?.lng()
            });
          } else {
            reject(status);
          }
        }
      );
    }));
  }
} 