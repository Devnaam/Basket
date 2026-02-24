import { useState, useCallback, useRef } from 'react';
import { GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';
import { Search, MapPin, X, Check } from 'lucide-react';
import useGoogleMaps from '@/hooks/useGoogleMaps';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';

// Default: Tirupati city center
const TIRUPATI = { lat: 13.6288, lng: 79.4192 };

const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: 'greedy',
  styles: [
    { featureType: 'poi.business',    stylers: [{ visibility: 'off' }] },
    { featureType: 'transit',         stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative',  stylers: [{ visibility: 'simplified' }] },
  ],
};

const PIN_SVG = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
    <circle cx="20" cy="20" r="18" fill="#16a34a" stroke="white" stroke-width="3"/>
    <circle cx="20" cy="20" r="8" fill="white"/>
    <polygon points="13,35 27,35 20,50" fill="#16a34a"/>
  </svg>
`);

const AddressPicker = ({ onConfirm, onClose }) => {
  const { isLoaded, loadError } = useGoogleMaps();
  const mapRef           = useRef(null);
  const autocompleteRef  = useRef(null);

  const [markerPos,    setMarkerPos]    = useState(TIRUPATI);
  const [addressLine,  setAddressLine]  = useState('');
  const [pincode,      setPincode]      = useState('');
  const [landmark,     setLandmark]     = useState('');
  const [searchValue,  setSearchValue]  = useState('');
  const [isGeocoding,  setIsGeocoding]  = useState(false);

  // ── Reverse geocode coords → address string ──────────────────────
  const reverseGeocode = useCallback(async (coords) => {
    if (!window.google) return;
    setIsGeocoding(true);
    try {
      const geocoder = new window.google.maps.Geocoder();
      const { results } = await geocoder.geocode({ location: coords });
      if (results[0]) {
        const comps     = results[0].address_components;
        const formatted = results[0].formatted_address;

        const pincodeComp = comps.find((c) => c.types.includes('postal_code'));
        if (pincodeComp) setPincode(pincodeComp.short_name);

        const clean = formatted
          .replace(', India', '')
          .replace(', Andhra Pradesh', '')
          .trim();
        setAddressLine(clean);
        setSearchValue(clean);
      }
    } catch (_) {}
    setIsGeocoding(false);
  }, []);

  // ── On map load: try GPS, fallback to Tirupati ───────────────────
  const onMapLoad = useCallback(
    (map) => {
      mapRef.current = map;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setMarkerPos(c);
            map.panTo(c);
            map.setZoom(17);
            reverseGeocode(c);
          },
          () => reverseGeocode(TIRUPATI),
          { timeout: 5000 }
        );
      } else {
        reverseGeocode(TIRUPATI);
      }
    },
    [reverseGeocode]
  );

  const onMarkerDragEnd = (e) => {
    const c = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setMarkerPos(c);
    reverseGeocode(c);
  };

  const onMapClick = (e) => {
    const c = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setMarkerPos(c);
    reverseGeocode(c);
  };

  const onPlaceChanged = () => {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();
    if (!place.geometry) return;
    const c = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };
    setMarkerPos(c);
    mapRef.current?.panTo(c);
    mapRef.current?.setZoom(17);
    reverseGeocode(c);
  };

  const handleConfirm = () => {
    if (!addressLine) return;
    onConfirm({
      addressLine,
      landmark,
      pincode,
      location: { type: 'Point', coordinates: [markerPos.lng, markerPos.lat] },
    });
  };

  // ── Fallback if Maps API fails ────────────────────────────────────
  if (loadError) {
    return (
      <div className="fixed inset-0 z-[60] bg-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-5xl mb-4">🗺️</p>
        <p className="text-base font-bold text-gray-900 mb-1">Maps failed to load</p>
        <p className="text-sm text-gray-500 mb-2">Check <code>VITE_GOOGLE_MAPS_API_KEY</code> in .env</p>
        <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-lg mb-6 font-mono">
          {loadError.message}
        </p>
        <Button onClick={onClose}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0 bg-white">
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100">
          <X size={22} className="text-gray-700" />
        </button>
        <h2 className="text-base font-bold text-gray-900 flex-1">Select Delivery Location</h2>
        {isGeocoding && (
          <div className="w-4 h-4 border-2 border-basket-green border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Search autocomplete */}
      <div className="px-4 py-3 bg-white flex-shrink-0 shadow-sm z-10">
        {isLoaded ? (
          <Autocomplete
            onLoad={(ac) => (autocompleteRef.current = ac)}
            onPlaceChanged={onPlaceChanged}
            options={{ componentRestrictions: { country: 'in' } }}
          >
            <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-3">
              <Search size={16} className="text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search for your area, street..."
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
              />
              {searchValue && (
                <button onClick={() => setSearchValue('')}>
                  <X size={14} className="text-gray-400" />
                </button>
              )}
            </div>
          </Autocomplete>
        ) : (
          <div className="h-12 bg-gray-100 rounded-2xl animate-pulse" />
        )}
      </div>

      {/* Map container */}
      <div className="flex-1 relative overflow-hidden">
        {!isLoaded ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <Spinner size="lg" />
              <p className="text-sm text-gray-500 mt-3">Loading map...</p>
            </div>
          </div>
        ) : (
          <>
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={markerPos}
              zoom={16}
              options={MAP_OPTIONS}
              onLoad={onMapLoad}
              onClick={onMapClick}
            >
              <Marker
                position={markerPos}
                draggable
                onDragEnd={onMarkerDragEnd}
                icon={{
                  url: `data:image/svg+xml;charset=UTF-8,${PIN_SVG}`,
                  scaledSize: new window.google.maps.Size(40, 50),
                  anchor: new window.google.maps.Point(20, 50),
                }}
              />
            </GoogleMap>

            {/* Hint pill */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm
                            text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg">
              📍 Drag pin or tap to adjust location
            </div>
          </>
        )}
      </div>

      {/* Address confirmation panel */}
      <div className="bg-white border-t border-gray-200 px-4 pt-4 pb-6 space-y-3 flex-shrink-0">
        {/* Detected address */}
        <div className="flex items-start gap-3 min-h-[44px]">
          <div className="w-8 h-8 rounded-full bg-basket-green flex items-center justify-center flex-shrink-0 mt-0.5">
            <MapPin size={14} className="text-white" />
          </div>
          <div className="flex-1">
            {isGeocoding ? (
              <div className="space-y-1.5">
                <div className="h-4 bg-gray-100 rounded-lg animate-pulse w-3/4" />
                <div className="h-3 bg-gray-100 rounded-lg animate-pulse w-1/3" />
              </div>
            ) : addressLine ? (
              <>
                <p className="text-sm font-semibold text-gray-900 leading-snug">{addressLine}</p>
                {pincode && <p className="text-xs text-gray-400 mt-0.5">📮 PIN: {pincode}</p>}
              </>
            ) : (
              <p className="text-sm text-gray-400">Tap on map to detect address</p>
            )}
          </div>
        </div>

        {/* Landmark input */}
        <input
          type="text"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          placeholder="Add a landmark (near temple, school...)"
          className="input-field text-sm w-full"
        />

        {/* Confirm button */}
        <Button
          fullWidth
          size="lg"
          onClick={handleConfirm}
          disabled={!addressLine || isGeocoding}
        >
          <Check size={18} /> Confirm This Location
        </Button>
      </div>
    </div>
  );
};

export default AddressPicker;
