import { Injectable } from '@angular/core';
import { GoogleMap } from '@capacitor/google-maps';
import { environment } from '../../environments/environment';
import { PlatformService } from './platform.service';
import { BehaviorSubject } from 'rxjs';

export interface MapLocation {
  address: string;
  lat: number;
  lng: number;
}

@Injectable({
  providedIn: 'root'
})
export class MapsService {
  private map: GoogleMap | null = null;
  private currentMarkerId: string | null = null;
  private mapElement: HTMLElement | null = null;

  private readonly _isMapReady = new BehaviorSubject<boolean>(false);
  isMapReady$ = this._isMapReady.asObservable();

  constructor(private platformService: PlatformService) {}

  async createMap(element: HTMLElement): Promise<void> {
    try {
      this.mapElement = element;
      this.map = await GoogleMap.create({
        id: 'map',
        element: this.mapElement,
        apiKey: environment.googleMapsApiKey,
        config: {
          center: {
            lat: 37.7749,
            lng: -122.4194
          },
          zoom: 12
        }
      });

      // Enable user location if permissions are granted
      if (this.platformService.isNative()) {
        await this.map.enableCurrentLocation(true);
      }

      this._isMapReady.next(true);
    } catch (error) {
      console.error('Error creating map:', error);
      this._isMapReady.next(false);
    }
  }

  async addMarker(location: MapLocation): Promise<string | null> {
    if (!this.map) return null;

    try {
      // Remove existing marker
      if (this.currentMarkerId) {
        await this.map.removeMarker(this.currentMarkerId);
      }

      // Add new marker
      const markerId = await this.map.addMarker({
        coordinate: {
          lat: location.lat,
          lng: location.lng
        },
        title: location.address,
        snippet: location.address // Additional info shown in native apps
      });

      this.currentMarkerId = markerId;
      return markerId;
    } catch (error) {
      console.error('Error adding marker:', error);
      return null;
    }
  }

  async setCamera(location: MapLocation): Promise<void> {
    if (!this.map) return;

    try {
      await this.map.setCamera({
        coordinate: {
          lat: location.lat,
          lng: location.lng
        },
        zoom: 15,
        animate: true
      });
    } catch (error) {
      console.error('Error setting camera:', error);
    }
  }

  async destroy(): Promise<void> {
    if (this.map) {
      this.map.destroy();
      this.map = null;
      this.currentMarkerId = null;
      this._isMapReady.next(false);
    }
  }

  // Additional methods for handling map events, user location, etc.
  async enableCurrentLocation(): Promise<void> {
    if (!this.map || !this.platformService.isNative()) return;

    try {
      await this.map.enableCurrentLocation(true);
    } catch (error) {
      console.error('Error enabling current location:', error);
    }
  }
} 