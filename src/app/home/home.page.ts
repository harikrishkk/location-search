import { Component, ElementRef, ViewChild, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleMap } from '@capacitor/google-maps';
import { environment } from '../../environments/environment';
import { LocationService, Location } from '../services/location.service';
import { SearchbarCustomEvent } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HomePage {
  @ViewChild('map') mapRef!: ElementRef;
  map: GoogleMap | null = null;
  currentMarkerId: string | null = null;
  searchResults: google.maps.places.AutocompletePrediction[] = [];
  searchQuery = '';

  constructor(private locationService: LocationService) {}

  async ionViewDidEnter() {
    await this.createMap();
  }

  async createMap() {
    if (!this.mapRef) return;

    try {
      this.map = await GoogleMap.create({
        id: 'map',
        element: this.mapRef.nativeElement,
        apiKey: environment.googleMapsApiKey,
        config: {
          center: {
            lat: 37.7749,
            lng: -122.4194
          },
          zoom: 12
        }
      });

      // Add a marker for initial position
      const markerId = await this.map.addMarker({
        coordinate: {
          lat: 37.7749,
          lng: -122.4194
        },
        title: 'Initial Location'
      });
      this.currentMarkerId = markerId;
    } catch (error) {
      console.error('Error creating map:', error);
    }
  }

  async onSearchChange(event: SearchbarCustomEvent) {
    const query = event.detail.value;
    if (!query) {
      this.searchResults = [];
      return;
    }

    try {
      this.searchResults = await this.locationService.searchAddress(query);
    } catch (error) {
      console.error('Error searching for address:', error);
    }
  }

  async selectLocation(prediction: google.maps.places.AutocompletePrediction) {
    try {
      const location = await this.locationService.getPlaceDetails(prediction.place_id);
      await this.updateMapLocation(location);
      this.searchResults = [];
      this.searchQuery = prediction.description;
    } catch (error) {
      console.error('Error getting place details:', error);
    }
  }

  private async updateMapLocation(location: Location) {
    if (!this.map) return;

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
        title: location.address
      });
      this.currentMarkerId = markerId;

      // Update camera
      await this.map.setCamera({
        coordinate: {
          lat: location.lat,
          lng: location.lng
        },
        zoom: 15,
        animate: true
      });
    } catch (error) {
      console.error('Error updating map location:', error);
    }
  }
}
