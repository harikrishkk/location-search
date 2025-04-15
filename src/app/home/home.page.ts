import { Component, ElementRef, ViewChild, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleMap } from '@capacitor/google-maps';
import { environment } from '../../environments/environment';
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
  currentPolygonId: string | null = null;
  searchResults: google.maps.places.AutocompletePrediction[] = [];
  searchQuery = '';
  
  // Add a property to store the current region details
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

  // Add helper methods to get specific region information
  getRegionType(): string {
    if (!this.selectedRegionDetails?.types) return 'unknown';
    
    if (this.selectedRegionDetails.types.includes('country')) {
      return 'country';
    } else if (this.selectedRegionDetails.types.includes('administrative_area_level_1')) {
      return 'state';
    } else if (this.selectedRegionDetails.types.includes('locality')) {
      return 'city';
    } else if (this.selectedRegionDetails.types.includes('postal_code')) {
      return 'postal_code';
    }
    return 'unknown';
  }

  getRegionName(): string {
    if (!this.selectedRegionDetails?.addressComponents) return '';

    const regionType = this.getRegionType();
    let component;

    switch (regionType) {
      case 'country':
        component = this.selectedRegionDetails.addressComponents.find(
          comp => comp.types.includes('country')
        );
        break;
      case 'state':
        component = this.selectedRegionDetails.addressComponents.find(
          comp => comp.types.includes('administrative_area_level_1')
        );
        break;
      case 'city':
        component = this.selectedRegionDetails.addressComponents.find(
          comp => comp.types.includes('locality')
        );
        break;
      case 'postal_code':
        component = this.selectedRegionDetails.addressComponents.find(
          comp => comp.types.includes('postal_code')
        );
        break;
    }

    return component?.longName || '';
  }

  getRegionArea(): number {
    if (!this.selectedRegionDetails?.viewport) return 0;
    
    const { northeast, southwest } = this.selectedRegionDetails.viewport;
    const latDiff = Math.abs(northeast.lat - southwest.lat);
    const lngDiff = Math.abs(northeast.lng - southwest.lng);
    
    // Rough approximation of area in square kilometers
    // Note: This is a simplified calculation, not accounting for Earth's curvature
    const areaKm = latDiff * lngDiff * 111.32 * 111.32 * Math.cos(
      (northeast.lat + southwest.lat) / 2 * Math.PI / 180
    );
    
    return Math.round(areaKm);
  }

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

  async onSearchChange(event: SearchbarCustomEvent) {
    const query = event.detail.value;
    if (!query) {
      this.searchResults = [];
      return;
    }

    try {
      const autocompleteService = new google.maps.places.AutocompleteService();
      const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve, reject) => {
        autocompleteService.getPlacePredictions(
          {
            input: query,
            types: ['(regions)'] // This will include countries, states, cities, and postal codes
          },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              resolve(results);
            } else {
              resolve([]);
            }
          }
        );
      });
      this.searchResults = predictions;
    } catch (error) {
      console.error('Error searching for address:', error);
    }
  }

  private calculateZoomLevel(viewport: google.maps.LatLngBounds): number {
    const WORLD_DIM = { height: 256, width: 256 };
    const ZOOM_MAX = 21;

    function latRad(lat: number) {
      const sin = Math.sin(lat * Math.PI / 180);
      const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
      return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
    }

    function zoom(mapPx: number, worldPx: number, fraction: number) {
      return Math.floor(Math.log(mapPx / worldPx / fraction) / Math.LN2);
    }

    const ne = viewport.getNorthEast();
    const sw = viewport.getSouthWest();

    const latFraction = (latRad(ne.lat()) - latRad(sw.lat())) / Math.PI;
    const lngDiff = ne.lng() - sw.lng();
    const lngFraction = ((lngDiff < 0) ? (lngDiff + 360) : lngDiff) / 360;

    const latZoom = zoom(400, WORLD_DIM.height, latFraction);
    const lngZoom = zoom(800, WORLD_DIM.width, lngFraction);

    const calculatedZoom = Math.min(latZoom, lngZoom, ZOOM_MAX);
    // Adjust zoom level slightly to give some padding
    return Math.max(calculatedZoom - 0.5, 0);
  }

  async selectLocation(prediction: google.maps.places.AutocompletePrediction) {
    if (!this.map) return;

    try {
      // Remove existing polygon
      if (this.currentPolygonId) {
        await this.map.removePolygons([this.currentPolygonId]);
        this.currentPolygonId = null;
      }

      // Get geocoded result
      const geocoder = new google.maps.Geocoder();
      const result = await new Promise<google.maps.GeocoderResult>((resolve, reject) => {
        geocoder.geocode(
          { placeId: prediction.place_id },
          (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
              resolve(results[0]);
            } else {
              reject(new Error('Geocoding failed'));
            }
          }
        );
      });

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

      // Log the details and some example usage
      console.log('Region Details:', {
        type: this.getRegionType(),
        name: this.getRegionName(),
        approximateAreaKm2: this.getRegionArea(),
        fullDetails: this.selectedRegionDetails
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

      // Calculate appropriate zoom level based on viewport size
      const zoomLevel = this.calculateZoomLevel(viewport);

      // Center the map on the region with calculated zoom
      await this.map.setCamera({
        coordinate: {
          lat: (ne.lat() + sw.lat()) / 2,
          lng: (ne.lng() + sw.lng()) / 2
        },
        zoom: zoomLevel,
        animate: true
      });

      this.searchResults = [];
      this.searchQuery = prediction.description;
    } catch (error) {
      console.error('Error selecting location:', error);
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
      this.selectedRegionDetails = null;  // Clear the region details
      
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
