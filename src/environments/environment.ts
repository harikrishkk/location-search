// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // For development, you can hardcode the key here
  // For production, use different environment files
  googleMapsApiKey: 'YOUR_API_KEY_HERE',
  // Add other environment-specific configurations
  apiUrl: 'http://localhost:3000',
  platform: 'web' // 'web' | 'android' | 'ios'
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
