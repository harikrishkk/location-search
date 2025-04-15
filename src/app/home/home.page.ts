import { Component, ElementRef, ViewChild, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleMap } from '@capacitor/google-maps';
import { environment } from '../../environments/environment';

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
  currentPolygonId: string | null = null;
  searchQuery = '';
  selectedRegionDetails: {
    formattedAddress: string;
    placeId: string;
    types: string[];
    addressComponents: {
      longName: string;
      shortName: string;
      types: string[];
    }[];
    location: {
      lat: number;
      lng: number;
    };
    viewport: {
      northeast: {
        lat: number;
        lng: number;
      };
      southwest: {
        lat: number;
        lng: number;
      };
    };
  } | null = null;

  constructor() {}

  async ngAfterViewInit() {
    if (!this.mapRef) return;

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
  }

  async searchRegion() {
    if (!this.map || !this.searchQuery.trim()) return;

    try {
      // Get geocoded result
      const geocoder = new google.maps.Geocoder();
      const result = await new Promise<google.maps.GeocoderResult>((resolve, reject) => {
        geocoder.geocode(
          { address: this.searchQuery },
          (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
              resolve(results[0]);
            } else {
              reject(new Error('Region not found'));
            }
          }
        );
      });

      // Remove existing polygon
      if (this.currentPolygonId) {
        await this.map.removePolygons([this.currentPolygonId]);
        this.currentPolygonId = null;
      }

      // Store the region details
      this.selectedRegionDetails = {
        formattedAddress: result.formatted_address,
        placeId: result.place_id,
        types: result.types,
        addressComponents: result.address_components?.map(component => ({
          longName: component.long_name,
          shortName: component.short_name,
          types: component.types
        })) || [],
        location: {
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng()
        },
        viewport: {
          northeast: {
            lat: result.geometry.viewport.getNorthEast().lat(),
            lng: result.geometry.viewport.getNorthEast().lng()
          },
          southwest: {
            lat: result.geometry.viewport.getSouthWest().lat(),
            lng: result.geometry.viewport.getSouthWest().lng()
          }
        }
      };

      // Log the region details
      console.log('Region Details:', {
        address: this.selectedRegionDetails.formattedAddress,
        components: this.selectedRegionDetails.addressComponents,
        location: this.selectedRegionDetails.location,
        viewport: this.selectedRegionDetails.viewport
      });

      // Create a polygon based on the viewport
      const viewport = result.geometry.viewport;
      const ne = viewport.getNorthEast();
      const sw = viewport.getSouthWest();
      
      const geometry = [
        { lat: ne.lat(), lng: ne.lng() },
        { lat: ne.lat(), lng: sw.lng() },
        { lat: sw.lat(), lng: sw.lng() },
        { lat: sw.lat(), lng: ne.lng() },
        { lat: ne.lat(), lng: ne.lng() } // Close the polygon
      ];

      // Add the polygon
      const polygonIds = await this.map.addPolygons([{
        paths: [geometry],
        strokeColor: '#FF0000',
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.1
      }]);
      
      this.currentPolygonId = polygonIds[0];

      // Calculate zoom level based on viewport size
      const latSpan = Math.abs(ne.lat() - sw.lat());
      const lngSpan = Math.abs(ne.lng() - sw.lng());
      const maxSpan = Math.max(latSpan, lngSpan);
      const zoom = Math.floor(14 - Math.log2(maxSpan)); // Simple zoom calculation

      // Center the map on the region
      await this.map.setCamera({
        coordinate: {
          lat: (ne.lat() + sw.lat()) / 2,
          lng: (ne.lng() + sw.lng()) / 2
        },
        zoom: Math.min(Math.max(zoom, 2), 15), // Keep zoom between 2 and 15
        animate: true
      });

    } catch (error) {
      console.error('Error finding region:', error);
    }
  }

  async removeLocation() {
    if (!this.map) return;

    try {
      if (this.currentPolygonId) {
        await this.map.removePolygons([this.currentPolygonId]);
        this.currentPolygonId = null;
      }

      this.searchQuery = '';
      this.selectedRegionDetails = null;
      
      await this.map.setCamera({
        coordinate: {
          lat: 37.7749,
          lng: -122.4194
        },
        zoom: 12,
        animate: true
      });
    } catch (error) {
      console.error('Error removing location:', error);
    }
  }
}
