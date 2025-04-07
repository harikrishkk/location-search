import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class PlatformService {
  constructor(private platform: Platform) {}

  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  isAndroid(): boolean {
    return this.platform.is('android');
  }

  isIOS(): boolean {
    return this.platform.is('ios');
  }

  isWeb(): boolean {
    return !this.isNative();
  }

  getPlatformString(): string {
    if (this.isAndroid()) return 'android';
    if (this.isIOS()) return 'ios';
    return 'web';
  }
} 