import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { MapsProxyService } from './maps-proxy.service';

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

  constructor(private mapsProxy: MapsProxyService) {}

  setSelectedLocation(location: Location) {
    this.selectedLocation.next(location);
  }

  async searchAddress(query: string): Promise<google.maps.places.AutocompletePrediction[]> {
    return firstValueFrom(this.mapsProxy.getPlacePredictions(query));
  }

  async getPlaceDetails(placeId: string): Promise<Location> {
    return firstValueFrom(this.mapsProxy.getPlaceDetails(placeId));
  }
} 