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
  'AIzaSyAIi95dchgUrtLmuMCsElW1drwlTIcRGWU';

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

function createSvgPin(color: string, label?: string) {
  const encoded = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
      <defs>
        <filter id="shadow" x="-20%" y="-10%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.35"/>
        </filter>
      </defs>
      <path d="M18 0 C8.06 0 0 8.06 0 18 C0 31.5 18 48 18 48 C18 48 36 31.5 36 18 C36 8.06 27.94 0 18 0 Z" fill="${color}" filter="url(#shadow)"/>
      <circle cx="18" cy="18" r="8" fill="#FFFFFF"/>
      <circle cx="18" cy="18" r="4.5" fill="${color}"/>
    </svg>
  `);
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

const RoadsideMap = forwardRef<WebMapViewRef, MapViewProps>(function RoadsideMap(props, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
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

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const extractedMarkers: {
      coordinate: { latitude: number; longitude: number };
      title?: string;
      description?: string;
      pinColor?: string;
      onPress?: () => void;
    }[] = [];

    React.Children.forEach(props.children, (child) => {
      if (React.isValidElement(child) && child.props && (child.props as any).coordinate) {
        const p = child.props as any;
        extractedMarkers.push({
          coordinate: p.coordinate,
          title: p.title,
          description: p.description,
          pinColor: p.pinColor,
          onPress: p.onPress,
        });
      }
    });

    extractedMarkers.forEach((item) => {
      if (
        item.coordinate &&
        typeof item.coordinate.latitude === 'number' &&
        typeof item.coordinate.longitude === 'number'
      ) {
        const pinColor = item.pinColor || '#38B8E8';
        const marker = new window.google.maps.Marker({
          position: { lat: item.coordinate.latitude, lng: item.coordinate.longitude },
          map: mapInstanceRef.current,
          title: item.title,
          icon: {
            url: createSvgPin(pinColor),
            scaledSize: new window.google.maps.Size(32, 42),
            anchor: new window.google.maps.Point(16, 42),
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
