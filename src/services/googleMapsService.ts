/// <reference types="@types/google.maps" />

export const DEFAULT_GOOGLE_MAPS_KEY = 'AIzaSyBdLry4M4LfOxRCceW8IDx87BamXdHyFLs';
const MAPS_KEY_STORAGE_KEY = 'worksynch_google_maps_api_key';

export const getGoogleMapsApiKey = (): string => {
  const envKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  const storedKey = localStorage.getItem(MAPS_KEY_STORAGE_KEY);
  return (storedKey && storedKey.trim()) || (envKey && envKey.trim()) || DEFAULT_GOOGLE_MAPS_KEY;
};

export const setGoogleMapsApiKey = (key: string): void => {
  if (key && key.trim()) {
    localStorage.setItem(MAPS_KEY_STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(MAPS_KEY_STORAGE_KEY);
  }
};

let googleMapsPromise: Promise<typeof google.maps> | null = null;

export const loadGoogleMapsSdk = (apiKey?: string): Promise<typeof google.maps> => {
  if (typeof window !== 'undefined' && (window as any).google?.maps) {
    return Promise.resolve((window as any).google.maps);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const keyToUse = apiKey || getGoogleMapsApiKey();

  googleMapsPromise = new Promise((resolve, reject) => {

    const existingScript = document.getElementById('google-maps-sdk-script');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.id = 'google-maps-sdk-script';
    script.type = 'text/javascript';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(keyToUse)}&libraries=places,geometry&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if ((window as any).google?.maps) {
        resolve((window as any).google.maps);
      } else {
        reject(new Error('Google Maps SDK loaded but google.maps object is missing.'));
      }
    };

    script.onerror = (err) => {
      googleMapsPromise = null;
      reject(new Error('Failed to load Google Maps SDK script.'));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
};

export const CENTRAL_DEPOT_LOCATION = {
  name: 'worksynch Central Depot & Fleet Staging',
  address: '1000 Mission St, San Francisco, CA 94103',
  lat: 37.7749,
  lng: -122.4194,
};

export const createVehicleIconSvg = (
  status: 'moving' | 'idling' | 'on_site' | 'parked' | 'maintenance',
  heading: number = 0,
  isSelected: boolean = false
): string => {
  let primaryColor = '#2563eb';
  let badgeColor = '#3b82f6';

  if (status === 'on_site') {
    primaryColor = '#107c41';
    badgeColor = '#22c55e';
  } else if (status === 'moving') {
    primaryColor = '#d97706';
    badgeColor = '#f59e0b';
  } else if (status === 'parked' || status === 'idling') {
    primaryColor = '#475569';
    badgeColor = '#64748b';
  } else if (status === 'maintenance') {
    primaryColor = '#dc2626';
    badgeColor = '#ef4444';
  }

  const ringStroke = isSelected ? '#ffffff' : primaryColor;
  const outerBorder = isSelected ? '#1e293b' : 'rgba(0,0,0,0.2)';
  const scale = isSelected ? 1.2 : 1.0;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <g transform="scale(${scale}) translate(${isSelected ? -4 : 0}, ${isSelected ? -4 : 0})">
        <!-- Glow / shadow -->
        <circle cx="24" cy="24" r="22" fill="${outerBorder}" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.3))" />
        <circle cx="24" cy="24" r="20" fill="${primaryColor}" stroke="${ringStroke}" stroke-width="${isSelected ? 3 : 2}" />

        <!-- Heading Indicator Arrow -->
        <g transform="rotate(${heading}, 24, 24)">
          <path d="M 24 6 L 29 14 L 19 14 Z" fill="#ffffff" />
        </g>

        <!-- Van / Truck Icon in Center -->
        <g transform="translate(14, 14)" fill="#ffffff">
          <path d="M17 8h-2V5c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v10h1c0 1.66 1.34 3 3 3s3-1.34 3-3h4c0 1.66 1.34 3 3 3s3-1.34 3-3h1v-4l-3-4zM6 16.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-8.5l2 2.5H15V8h1.5z"/>
        </g>
      </g>
    </svg>
  `)}`;
};
