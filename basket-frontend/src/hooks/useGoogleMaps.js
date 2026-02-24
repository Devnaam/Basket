import { useLoadScript } from '@react-google-maps/api';

// Must be defined outside component to prevent re-renders
const LIBRARIES = ['places'];

const useGoogleMaps = () => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  return { isLoaded, loadError };
};

export default useGoogleMaps;
