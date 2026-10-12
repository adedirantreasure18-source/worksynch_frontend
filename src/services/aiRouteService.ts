import { apiFetch } from '../config/api';


export interface FleetInsightRequest {
  vehicleId?: string;
  vehicleName?: string;
  plate?: string;
  driverName?: string;
  originAddress?: string;
  destinationAddress?: string;
  currentStatus?: string;
  currentLat?: number;
  currentLng?: number;
  speedKmh?: number;
}

export interface FleetInsightResult {
  success: boolean;
  insight: string;
  groundingMetadata?: any;
  error?: string;
}

export const fetchFleetAiInsight = async (params: FleetInsightRequest): Promise<FleetInsightResult> => {
  try {
    const res = await apiFetch('/api/ai/fleet-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        insight: '',
        error: errData.error || `Server returned status ${res.status}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      insight: data.insight || 'No insight text returned.',
      groundingMetadata: data.groundingMetadata,
    };
  } catch (err: any) {
    return {
      success: false,
      insight: '',
      error: err.message || 'Network error connecting to AI fleet service.',
    };
  }
};
