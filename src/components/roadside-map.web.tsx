import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { MapMarkerProps, MapViewProps, Region } from 'react-native-maps';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export const PROVIDER_GOOGLE = 'google';

export function Marker(_props: MapMarkerProps) {
  return null;
}

export type MapCircleProps = {
  center: { latitude: number; longitude: number };
  radius: number;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  zIndex?: number;
};

export function Circle(_props: MapCircleProps) {
  return null;
}

export type WebMapViewRef = {
  animateToRegion: (region: Region, duration?: number) => void;
  fitToCoordinates: (
    coordinates: { latitude: number; longitude: number }[],
    options?: { edgePadding?: { top: number; right: number; bottom: number; left: number }; animated?: boolean }
  ) => void;
};

declare global {
  interface Window {
    google?: any;
    gm_authFailure?: () => void;
  }
}

const GOOGLE_MAPS_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  'AIzaSyAn-Efbwn-JnqIOJuYTEdWvm0YmbsCR5xI';

let googleMapsScriptLoading = false;
let googleMapsScriptLoaded = false;
const scriptLoadCallbacks: (() => void)[] = [];

function loadGoogleMapsScript(apiKey: string): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (googleMapsScriptLoaded || window.google?.maps) {
    googleMapsScriptLoaded = true;
    return Promise.resolve(true);
  }
  if (googleMapsScriptLoading) {
    return new Promise((resolve) => {
      scriptLoadCallbacks.push(() => resolve(Boolean(window.google?.maps)));
    });
  }

  googleMapsScriptLoading = true;
  return new Promise((resolve) => {
    const existing = document.querySelector('script[data-google-maps="true"]');
    if (existing) {
      existing.addEventListener('load', () => {
        googleMapsScriptLoaded = true;
        googleMapsScriptLoading = false;
        resolve(true);
        scriptLoadCallbacks.forEach((cb) => cb());
        scriptLoadCallbacks.length = 0;
      });
      existing.addEventListener('error', () => {
        googleMapsScriptLoading = false;
        resolve(false);
        scriptLoadCallbacks.forEach((cb) => cb());
        scriptLoadCallbacks.length = 0;
      });
      return;
    }

    const script = document.createElement('script');
    script.setAttribute('data-google-maps', 'true');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      googleMapsScriptLoaded = true;
      googleMapsScriptLoading = false;
      resolve(true);
      scriptLoadCallbacks.forEach((cb) => cb());
      scriptLoadCallbacks.length = 0;
    };
    script.onerror = () => {
      googleMapsScriptLoading = false;
      resolve(false);
      scriptLoadCallbacks.forEach((cb) => cb());
      scriptLoadCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

function createCustomerPointerSvg() {
  const encoded = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <defs>
        <filter id="cshadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.3"/>
        </filter>
      </defs>
      <circle cx="18" cy="18" r="16" fill="rgba(56, 184, 232, 0.28)" stroke="#38B8E8" stroke-width="1.5"/>
      <circle cx="18" cy="18" r="9" fill="#FFFFFF" filter="url(#cshadow)"/>
      <circle cx="18" cy="18" r="5.5" fill="#38B8E8"/>
    </svg>
  `);
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

function createMechanicWrenchPinSvg(color: string, isSelected?: boolean) {
  const width = isSelected ? 44 : 36;
  const height = isSelected ? 56 : 48;
  const strokeColor = isSelected ? '#FFD52A' : '#FFFFFF';
  const strokeWidth = isSelected ? '3' : '2.5';

  const encoded = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 36 48">
      <defs>
        <filter id="mshadow" x="-30%" y="-20%" width="160%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="3.5" flood-color="#000000" flood-opacity="0.4"/>
        </filter>
      </defs>
      ${isSelected ? '<circle cx="18" cy="18" r="21" fill="rgba(255, 213, 42, 0.4)" stroke="#FFD52A" stroke-width="2"/>' : ''}
      <path d="M18 1 C9.16 1 2 8.16 2 17 C2 28.5 18 47 18 47 C18 47 34 28.5 34 17 C34 8.16 26.84 1 18 1 Z"
            fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" filter="url(#mshadow)"/>
      <!-- White Wrench Vector Icon -->
      <g transform="translate(9, 8) scale(0.75)" fill="#FFFFFF">
        <path d="M22.7 19.3L15.3 11.9C15.8 10.4 15.5 8.7 14.3 7.5C13 6.2 11.1 5.8 9.5 6.4L12.6 9.5L9.5 12.6L6.4 9.5C5.8 11.1 6.2 13 7.5 14.3C8.7 15.5 10.4 15.8 11.9 15.3L19.3 22.7C19.7 23.1 20.3 23.1 20.7 22.7L22.7 20.7C23.1 20.3 23.1 19.7 22.7 19.3Z"/>
      </g>
    </svg>
  `);
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

const RoadsideMap = forwardRef<WebMapViewRef, MapViewProps>(function RoadsideMap(props, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const circlesRef = useRef<any[]>([]);
  const [authFailed, setAuthFailed] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(Boolean(typeof window !== 'undefined' && window.google?.maps));

  const targetRegion = props.region || props.initialRegion || {
    latitude: 24.8607,
    longitude: 67.0011,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };

  const [currentCenter, setCurrentCenter] = useState({
    latitude: targetRegion.latitude,
    longitude: targetRegion.longitude,
  });

  useImperativeHandle(ref, () => ({
    animateToRegion: (region: Region) => {
      setCurrentCenter({ latitude: region.latitude, longitude: region.longitude });
      if (mapInstanceRef.current && window.google?.maps) {
        mapInstanceRef.current.panTo({ lat: region.latitude, lng: region.longitude });
        const delta = Math.max(region.latitudeDelta || 0.05, region.longitudeDelta || 0.05);
        const zoom = Math.round(Math.log(360 / delta) / Math.LN2);
        mapInstanceRef.current.setZoom(Math.max(10, Math.min(18, zoom)));
      }
    },
    fitToCoordinates: (coordinates: { latitude: number; longitude: number }[]) => {
      if (!coordinates.length || !mapInstanceRef.current || !window.google?.maps) return;
      const bounds = new window.google.maps.LatLngBounds();
      coordinates.forEach((c) => bounds.extend({ lat: c.latitude, lng: c.longitude }));
      mapInstanceRef.current.fitBounds(bounds);
    },
  }));

  useEffect(() => {
    let mounted = true;
    if (typeof window !== 'undefined') {
      window.gm_authFailure = () => {
        if (mounted) setAuthFailed(true);
      };
    }

    loadGoogleMapsScript(GOOGLE_MAPS_KEY).then((loaded) => {
      if (mounted) {
        setScriptLoaded(loaded);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Initialize or re-center Google Maps JS API instance
  useEffect(() => {
    if (!scriptLoaded || authFailed || !containerRef.current || !window.google?.maps) return;

    if (!mapInstanceRef.current) {
      const zoom = Math.round(Math.log(360 / (targetRegion.latitudeDelta || 0.08)) / Math.LN2);
      mapInstanceRef.current = new window.google.maps.Map(containerRef.current, {
        center: { lat: targetRegion.latitude, lng: targetRegion.longitude },
        zoom: Math.max(11, Math.min(17, zoom)),
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
      });
    }
  }, [scriptLoaded, authFailed, targetRegion.latitude, targetRegion.longitude, targetRegion.latitudeDelta]);

  // Extract markers from children and sync with map instance
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    // Clear old markers and circles
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];

    const extractedMarkers: {
      coordinate: { latitude: number; longitude: number };
      title?: string;
      description?: string;
      pinColor?: string;
      isCustomer?: boolean;
      isSelected?: boolean;
      isAvailable?: boolean;
      onPress?: () => void;
    }[] = [];

    const extractedCircles: MapCircleProps[] = [];

    React.Children.forEach(props.children, (child) => {
      if (React.isValidElement(child) && child.props) {
        const p = child.props as any;
        if (p.coordinate) {
          const isCustomer =
            p.title === 'Your Location' ||
            p.isCustomer === true ||
            (p.children?.type?.name === 'CustomerMarkerView');
          const isSelected = p.isSelected === true;
          const isAvailable = p.isAvailable !== false;
          extractedMarkers.push({
            coordinate: p.coordinate,
            title: p.title,
            description: p.description,
            pinColor: p.pinColor,
            isCustomer,
            isSelected,
            isAvailable,
            onPress: p.onPress,
          });
        } else if (p.center && p.radius != null) {
          extractedCircles.push(p as MapCircleProps);
        }
      }
    });

    extractedCircles.forEach((item) => {
      if (item.center && typeof item.center.latitude === 'number' && typeof item.center.longitude === 'number') {
        const circle = new window.google.maps.Circle({
          strokeColor: item.strokeColor || '#38B8E8',
          strokeOpacity: 0.8,
          strokeWeight: item.strokeWidth || 2,
          fillColor: item.fillColor || '#38B8E8',
          fillOpacity: 0.15,
          map: mapInstanceRef.current,
          center: { lat: item.center.latitude, lng: item.center.longitude },
          radius: item.radius,
          zIndex: item.zIndex || 1,
        });
        circlesRef.current.push(circle);
      }
    });

    extractedMarkers.forEach((item) => {
      if (
        item.coordinate &&
        typeof item.coordinate.latitude === 'number' &&
        typeof item.coordinate.longitude === 'number'
      ) {
        let iconUrl: string;
        let iconSize: any;
        let iconAnchor: any;

        if (item.isCustomer) {
          iconUrl = createCustomerPointerSvg();
          iconSize = new window.google.maps.Size(36, 36);
          iconAnchor = new window.google.maps.Point(18, 18);
        } else {
          const color = !item.isAvailable ? '#94A3B8' : (item.pinColor || '#38B8E8');
          iconUrl = createMechanicWrenchPinSvg(color, item.isSelected);
          const w = item.isSelected ? 44 : 36;
          const h = item.isSelected ? 56 : 48;
          iconSize = new window.google.maps.Size(w, h);
          iconAnchor = new window.google.maps.Point(w / 2, h);
        }

        const marker = new window.google.maps.Marker({
          position: { lat: item.coordinate.latitude, lng: item.coordinate.longitude },
          map: mapInstanceRef.current,
          title: item.title,
          zIndex: item.isSelected ? 999 : item.isCustomer ? 500 : 100,
          icon: {
            url: iconUrl,
            scaledSize: iconSize,
            anchor: iconAnchor,
          },
        });

        if (item.onPress) {
          marker.addListener('click', () => {
            item.onPress?.();
          });
        }

        if (item.title || item.description) {
          const infoWindow = new window.google.maps.InfoWindow({
            content: `<div style="padding:4px 6px;font-family:sans-serif;">
              ${item.title ? `<strong style="font-size:13px;color:#0F172A;">${item.title}</strong>` : ''}
              ${item.description ? `<p style="margin:2px 0 0;font-size:11px;color:#64748B;">${item.description}</p>` : ''}
            </div>`,
          });
          marker.addListener('mouseover', () => infoWindow.open(mapInstanceRef.current, marker));
          marker.addListener('mouseout', () => infoWindow.close());
        }

        markersRef.current.push(marker);
      }
    });
  }, [props.children, scriptLoaded, authFailed]);

  // If Google Maps JS API script failed or has authorization/billing restrictions:
  // Render the official Google Maps Embed iframe at current coordinates so Google Maps is ALWAYS rendered!
  if (authFailed || (!scriptLoaded && !googleMapsScriptLoading)) {
    const lat = currentCenter.latitude;
    const lng = currentCenter.longitude;
    const embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed`;

    return (
      <View style={[styles.container, props.style as any]}>
        <iframe
          title="Google Maps"
          src={embedUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 14,
          }}
          loading="lazy"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, props.style as any]}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 14,
          overflow: 'hidden',
          backgroundColor: '#E2E8F0',
        }}
      />
      {!scriptLoaded && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#38B8E8" />
          <Text style={styles.loadingText}>Loading Google Maps…</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 280,
    position: 'relative',
    overflow: 'hidden',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(248, 250, 252, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default RoadsideMap;
