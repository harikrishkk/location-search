import { Component, ElementRef, ViewChild, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleMap } from '@capacitor/google-maps';
import { environment } from '../../environments/environment';
import { LocationService, Location, RegionBoundary } from '../services/location.service';
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
  currentRegionPolygons: string[] = [];
  searchResults: google.maps.places.AutocompletePrediction[] = [];
  searchQuery = '';
  selectedLocation: Location | null = null;

  constructor(private locationService: LocationService) {}

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
      this.searchResults = await this.locationService.searchAddress(query);
    } catch (error) {
      console.error('Error searching for address:', error);
    }
  }

  async selectLocation(prediction: google.maps.places.AutocompletePrediction) {
    try {
      const location = await this.locationService.getLocationDetails(prediction.place_id);
      this.selectedLocation = location;
      
      await this.updateMapLocation(location);
      if (location.regions) {
        await this.displayRegionBoundaries(location.regions);
      }
      
      this.searchResults = [];
      this.searchQuery = location.address;
    } catch (error) {
      console.error('Error getting location details:', error);
    }
  }

  async removeLocation() {
    try {
      if (this.currentMarkerId && this.map) {
        await this.map.removeMarker(this.currentMarkerId);
        this.currentMarkerId = null;
      }
      
      await this.removeRegionBoundaries();
      
      this.selectedLocation = null;
      this.searchQuery = '';
      
      if (this.map) {
        await this.map.setCamera({
          coordinate: {
            lat: 37.7749,
            lng: -122.4194
          },
          zoom: 12,
          animate: true
        });
      }
    } catch (error) {
      console.error('Error removing location:', error);
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
        zoom: 12,
        animate: true
      });
    } catch (error) {
      console.error('Error updating map location:', error);
    }
  }

  private async displayRegionBoundaries(regions: RegionBoundary[]) {
    if (!this.map) return;

    try {
      // Remove existing polygons
      await this.removeRegionBoundaries();

      // Colors for different region types
      const regionColors = {
        country: '#FF0000',
        administrative_area_level_1: '#00FF00',
        administrative_area_level_2: '#0000FF',
        locality: '#FFA500'
      };

      // Add new polygons for each region
      for (const region of regions) {
        if (!region.geometry) continue;

        try {
          const color = regionColors[region.regionType as keyof typeof regionColors] || '#FF0000';
          
          const polygonOptions = {
            paths: [region.geometry],
            strokeColor: color,
            strokeWeight: 3,
            fillColor: color,
            fillOpacity: 0.15
          };

          console.log(`Adding polygon for ${region.regionType} ${region.name}`, polygonOptions);
          
          const polygonIds = await this.map.addPolygons([polygonOptions]);
          this.currentRegionPolygons.push(...polygonIds);
          
          // Add a marker at the center of the polygon to label the region
          const center = this.calculatePolygonCenter(region.geometry);
          await this.map.addMarker({
            coordinate: center,
            title: `${region.name} (${region.regionType.replace(/_/g, ' ')})`,
            snippet: region.name
          });
        } catch (error) {
          console.error(`Error displaying boundary for region ${region.name}:`, error);
        }
      }

      // Adjust the zoom to fit all polygons
      if (regions.length > 0 && regions[0].geometry) {
        const bounds = this.calculateBounds(regions);
        await this.map.setCamera({
          coordinate: {
            lat: (bounds.north + bounds.south) / 2,
            lng: (bounds.east + bounds.west) / 2
          },
          zoom: 10,
          animate: true
        });
      }
    } catch (error) {
      console.error('Error displaying region boundaries:', error);
    }
  }

  private calculatePolygonCenter(points: google.maps.LatLngLiteral[]): google.maps.LatLngLiteral {
    const lat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
    const lng = points.reduce((sum, point) => sum + point.lng, 0) / points.length;
    return { lat, lng };
  }

  private calculateBounds(regions: RegionBoundary[]): {north: number; south: number; east: number; west: number} {
    let north = -90, south = 90, east = -180, west = 180;
    
    regions.forEach(region => {
      if (!region.geometry) return;
      
      region.geometry.forEach(point => {
        north = Math.max(north, point.lat);
        south = Math.min(south, point.lat);
        east = Math.max(east, point.lng);
        west = Math.min(west, point.lng);
      });
    });

    return { north, south, east, west };
  }

  private async removeRegionBoundaries() {
    if (!this.map || !this.currentRegionPolygons.length) return;

    try {
      console.log('Removing polygons:', this.currentRegionPolygons);
      await this.map.removePolygons(this.currentRegionPolygons);
      this.currentRegionPolygons = [];
    } catch (error) {
      console.error('Error removing region boundaries:', error);
    }
  }
}
