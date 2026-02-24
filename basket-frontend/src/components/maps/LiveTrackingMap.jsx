import { useEffect, useState, useRef, useCallback } from 'react';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import useGoogleMaps from '@/hooks/useGoogleMaps';
import Spinner from '@/components/ui/Spinner';

const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: false,
  gestureHandling: 'cooperative',
  clickableIcons: false,
  styles: [
    { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit',      stylers: [{ visibility: 'off' }] },
  ],
};

// Tirupati dark store — update with actual store coordinates from DB
const STORE_POSITION = { lat: 13.6368, lng: 79.4245 };

const makeCircleIcon = (emoji, bgColor, size = 40) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}"
              fill="${bgColor}" stroke="white" stroke-width="2.5"/>
      <text x="${size / 2}" y="${size / 2 + 5}"
            text-anchor="middle" font-size="${size * 0.42}">${emoji}</text>
    </svg>
  `)}`;

const LiveTrackingMap = ({ order, riderLocation }) => {
  const { isLoaded } = useGoogleMaps();
  const mapRef = useRef(null);
  const [directions, setDirections] = useState(null);
  const prevRiderRef = useRef(null);

  const deliveryCoords = order?.deliveryAddress?.location?.coordinates;
  const deliveryPosition = deliveryCoords
    ? { lat: deliveryCoords[1], lng: deliveryCoords[0] }
    : null;

  const riderPosition = riderLocation
    ? { lat: riderLocation.latitude, lng: riderLocation.longitude }
    : null;

  // ── Fit map bounds to show all markers on first load ─────────────
  const onMapLoad = useCallback(
    (map) => {
      mapRef.current = map;
      if (!window.google) return;
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(STORE_POSITION);
      if (deliveryPosition) bounds.extend(deliveryPosition);
      if (riderPosition) bounds.extend(riderPosition);
      map.fitBounds(bounds, { top: 50, right: 20, bottom: 20, left: 20 });
    },
    [deliveryPosition, riderPosition]
  );

  // ── Fetch directions when rider moves ────────────────────────────
  useEffect(() => {
    if (!isLoaded || !riderPosition || !deliveryPosition) return;

    // Throttle: only re-fetch if rider moved > ~50m
    const prev = prevRiderRef.current;
    if (prev) {
      const dLat = Math.abs(prev.lat - riderPosition.lat);
      const dLng = Math.abs(prev.lng - riderPosition.lng);
      if (dLat < 0.0005 && dLng < 0.0005) return;
    }
    prevRiderRef.current = riderPosition;

    const ds = new window.google.maps.DirectionsService();
    ds.route(
      {
        origin:      riderPosition,
        destination: deliveryPosition,
        travelMode:  window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK') setDirections(result);
      }
    );
  }, [isLoaded, riderPosition?.lat, riderPosition?.lng]);

  // ── Smoothly pan map to rider ─────────────────────────────────────
  useEffect(() => {
    if (mapRef.current && riderPosition) {
      mapRef.current.panTo(riderPosition);
    }
  }, [riderPosition?.lat, riderPosition?.lng]);

  if (!isLoaded) {
    return (
      <div className="h-64 bg-gray-100 rounded-2xl flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const center = riderPosition || deliveryPosition || STORE_POSITION;

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-card">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '260px' }}
        center={center}
        zoom={15}
        options={MAP_OPTIONS}
        onLoad={onMapLoad}
      >
        {/* 🏪 Dark store */}
        <Marker
          position={STORE_POSITION}
          title="Basket Dark Store"
          icon={{
            url: makeCircleIcon('🏪', '#16a34a', 38),
            scaledSize: new window.google.maps.Size(38, 38),
            anchor: new window.google.maps.Point(19, 19),
          }}
        />

        {/* 🏠 Customer delivery point */}
        {deliveryPosition && (
          <Marker
            position={deliveryPosition}
            title="Your Location"
            icon={{
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
                  <circle cx="20" cy="20" r="18" fill="#dc2626" stroke="white" stroke-width="3"/>
                  <text x="20" y="26" text-anchor="middle" font-size="16">🏠</text>
                  <polygon points="13,36 27,36 20,50" fill="#dc2626"/>
                </svg>
              `)}`,
              scaledSize: new window.google.maps.Size(40, 50),
              anchor: new window.google.maps.Point(20, 50),
            }}
          />
        )}

        {/* 🏍️ Rider live marker */}
        {riderPosition && (
          <Marker
            position={riderPosition}
            title="Rider (Live)"
            icon={{
              url: makeCircleIcon('🏍️', '#f97316', 46),
              scaledSize: new window.google.maps.Size(46, 46),
              anchor: new window.google.maps.Point(23, 23),
            }}
          />
        )}

        {/* Route polyline */}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor:   '#16a34a',
                strokeWeight:  4,
                strokeOpacity: 0.85,
              },
            }}
          />
        )}
      </GoogleMap>

      {/* Legend bar */}
      <div className="bg-white px-4 py-2.5 flex items-center gap-5 flex-wrap border-t border-gray-50">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span>🏪</span> Store
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span>🏠</span> You
        </span>
        {riderPosition ? (
          <span className="flex items-center gap-1.5 text-xs text-orange-500 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            🏍️ Rider (Live)
          </span>
        ) : (
          <span className="text-xs text-gray-400">Waiting for rider location...</span>
        )}
      </div>
    </div>
  );
};

export default LiveTrackingMap;
