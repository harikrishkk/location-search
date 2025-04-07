import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MapsLoaderService {
  private static promise: Promise<void>;

  public load(): Promise<void> {
    if (!MapsLoaderService.promise) {
      MapsLoaderService.promise = new Promise<void>((resolve) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          resolve();
        };
        document.body.appendChild(script);
      });
    }
    return MapsLoaderService.promise;
  }
} 