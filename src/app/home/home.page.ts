import { Component, ElementRef, ViewChild, CUSTOM_ELEMENTS_SCHEMA, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocationService } from '../services/location.service';
import { SearchbarCustomEvent } from '@ionic/angular';
import { MapsService, MapLocation } from '../services/maps.service';
import { PlatformService } from '../services/platform.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HomePage implements OnDestroy {
  @ViewChild('map') mapRef!: ElementRef;
  searchResults: google.maps.places.AutocompletePrediction[] = [];
  searchQuery = '';
  private destroy$ = new Subject<void>();

  constructor(
    private locationService: LocationService,
    private mapsService: MapsService,
    private platformService: PlatformService
  ) {}

  async ionViewDidEnter() {
    if (this.mapRef?.nativeElement) {
      await this.mapsService.createMap(this.mapRef.nativeElement);
      
      // Enable location tracking if on mobile
      if (this.platformService.isNative()) {
        await this.mapsService.enableCurrentLocation();
      }
    }
  }

  ionViewWillLeave() {
    this.mapsService.destroy();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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

  private async updateMapLocation(location: MapLocation) {
    try {
      await this.mapsService.addMarker(location);
      await this.mapsService.setCamera(location);
    } catch (error) {
      console.error('Error updating map location:', error);
    }
  }
}
