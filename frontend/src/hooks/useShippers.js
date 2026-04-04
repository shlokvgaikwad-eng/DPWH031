import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Shared hook for fetching and selecting shippers.
 * Eliminates the duplicated ~40-line fetch logic across TrustScore, ShipmentHistory, and ShipmentTracking.
 * Fixes bug #2: no selectedShipper in the dep array, so no infinite re-fetch loop.
 *
 * @param {string|null} initialShipperId - Optional shipper ID to pre-select (e.g. from URL params)
 * @returns {{ shippers: Array, selectedShipper: string|null, setSelectedShipper: Function, loading: boolean }}
 */
export function useShippers(initialShipperId = null) {
  const [shippers, setShippers] = useState([]);
  const [selectedShipper, setSelectedShipper] = useState(initialShipperId);
  const [loading, setLoading] = useState(true);
  const didInit = useRef(false);

  const fetchShippers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/tracking/shippers`);
      setShippers(res.data);
      // Auto-select first shipper ONLY on initial load, and only if nothing is pre-selected
      if (!didInit.current && res.data.length > 0) {
        didInit.current = true;
        setSelectedShipper((prev) => prev || res.data[0].id);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load shippers.');
    } finally {
      setLoading(false);
    }
  }, []); // No selectedShipper dep — this is the bug #2 fix

  useEffect(() => {
    fetchShippers();
  }, [fetchShippers]);

  return { shippers, selectedShipper, setSelectedShipper, loading };
}
