import { apiFetch } from '../config/api';
/// <reference types="@types/google.maps" />
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FleetVehicle, Job, Worker } from '../types';
import {
  loadGoogleMapsSdk,
  CENTRAL_DEPOT_LOCATION,
  createVehicleIconSvg,
  getGoogleMapsApiKey,
  setGoogleMapsApiKey,
} from '../services/googleMapsService';
import { fetchFleetAiInsight, FleetInsightResult } from '../services/aiRouteService';
import {
  Truck,
  Navigation,
  MapPin,
  Compass,
  Gauge,
  BatteryCharging,
  Layers,
  Sparkles,
  RefreshCw,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  ExternalLink,
  Phone,
  User,
  Building2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  Radio,
  Sliders,
  ChevronRight,
  Info,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface LiveVehicleTrackerMapProps {
  initialSelectedVehicleId?: string;
  onSelectJob?: (job: Job) => void;
  className?: string;
  isCompact?: boolean;
}

export const LiveVehicleTrackerMap: React.FC<LiveVehicleTrackerMapProps> = ({
  initialSelectedVehicleId,
  onSelectJob,
  className = '',
  isCompact = false,
}) => {
  const {
    vehicles,
    jobs,
    workers,
    selectedDate,
    dateScope,
    updateVehicleStatus,
    setInteractingJob,
  } = useApp();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const jobMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const depotMarkerRef = useRef<google.maps.Marker | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);

  const [mapsLoaded, setMapsLoaded] = useState<boolean>(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    initialSelectedVehicleId || (vehicles && vehicles[0]?.id) || null
  );
  const [isLiveSimulating, setIsLiveSimulating] = useState<boolean>(true);
  const [isTrafficEnabled, setIsTrafficEnabled] = useState<boolean>(false);
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');
  const [statusFilter, setStatusFilter] = useState<'all' | 'moving' | 'on_site' | 'parked' | 'maintenance'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  
  const [aiInsight, setAiInsight] = useState<FleetInsightResult | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>(getGoogleMapsApiKey());
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);

  
  const activeJobs = useMemo(() => {
    return dateScope === 'all' ? jobs : jobs.filter((j) => j.scheduledDate === selectedDate);
  }, [jobs, selectedDate, dateScope]);

  
  const selectedVehicle = useMemo(() => {
    return (vehicles || []).find((v) => v.id === selectedVehicleId) || (vehicles && vehicles[0]) || null;
  }, [vehicles, selectedVehicleId]);

  
  const selectedDriver = useMemo(() => {
    if (!selectedVehicle) return null;
    return workers.find(
      (w) => w.id === selectedVehicle.assignedDriverId || (w.vehicleInfo && w.vehicleInfo.plate === selectedVehicle.plate)
    );
  }, [selectedVehicle, workers]);

  const selectedJob = useMemo(() => {
    if (!selectedVehicle) return null;
    return jobs.find((j) => {
      if (selectedVehicle.currentJobId && j.id === selectedVehicle.currentJobId) return true;
      if (selectedDriver && (j.driverId === selectedDriver.id || (j.driverIds && j.driverIds.includes(selectedDriver.id)))) return true;
      return false;
    });
  }, [selectedVehicle, selectedDriver, jobs]);

  
  const filteredVehicles = useMemo(() => {
    return (vehicles || []).filter((v) => {
      if (statusFilter === 'moving' && v.status !== 'en_route' && v.telemetryStatus !== 'moving') return false;
      if (statusFilter === 'on_site' && v.status !== 'on_site') return false;
      if (statusFilter === 'parked' && v.status !== 'available' && v.status !== 'in_use') return false;
      if (statusFilter === 'maintenance' && v.status !== 'maintenance' && v.status !== 'out_of_service') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const vName = (v.name || '').toLowerCase();
        const vPlate = (v.plate || '').toLowerCase();
        const vModel = (v.model || '').toLowerCase();
        const d = workers.find((w) => w.id === v.assignedDriverId);
        const dName = d ? d.name.toLowerCase() : '';
        return vName.includes(q) || vPlate.includes(q) || vModel.includes(q) || dName.includes(q);
      }
      return true;
    });
  }, [vehicles, statusFilter, searchQuery, workers]);

  
  useEffect(() => {
    let isMounted = true;
    loadGoogleMapsSdk()
      .then(() => {
        if (isMounted) {
          setMapsLoaded(true);
          setMapsError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setMapsError(err.message || 'Could not load Google Maps SDK');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  
  useEffect(() => {
    if (!mapsLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const google = (window as any).google;
      const initialCenter = selectedVehicle?.currentLat && selectedVehicle?.currentLng
        ? { lat: selectedVehicle.currentLat, lng: selectedVehicle.currentLng }
        : { lat: CENTRAL_DEPOT_LOCATION.lat, lng: CENTRAL_DEPOT_LOCATION.lng };

      const map = new google.maps.Map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 13,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        streetViewControl: true,
        fullscreenControl: false,
        zoomControl: true,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
          { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
        ],
      });

      mapInstanceRef.current = map;

      
      const directionsRenderer = new google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#2563eb',
          strokeWeight: 5,
          strokeOpacity: 0.8,
        },
      });
      directionsRendererRef.current = directionsRenderer;

      
      const depotMarker = new google.maps.Marker({
        position: { lat: CENTRAL_DEPOT_LOCATION.lat, lng: CENTRAL_DEPOT_LOCATION.lng },
        map,
        title: CENTRAL_DEPOT_LOCATION.name,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="#1e293b" stroke="#ffffff" stroke-width="2" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.4))"/>
              <g transform="translate(10, 10)" fill="#ffffff">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
              </g>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(36, 36),
          anchor: new google.maps.Point(18, 18),
        },
        zIndex: 10,
      });

      const depotInfoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-family: sans-serif; padding: 6px 8px; min-width: 180px;">
            <div style="font-weight: bold; color: #0f172a; font-size: 13px;">🏢 Central Dispatch Depot</div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">1000 Mission St, San Francisco</div>
            <div style="font-size: 10px; color: #107c41; margin-top: 4px; font-weight: 600;">Active Fleet Staging & Base Pool</div>
          </div>
        `,
      });

      depotMarker.addListener('click', () => {
        depotInfoWindow.open(map, depotMarker);
      });
      depotMarkerRef.current = depotMarker;
    } catch (err: any) {
      console.error('Error creating Google Map instance:', err);
    }
  }, [mapsLoaded]);

  
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setMapTypeId(mapTypeId);
  }, [mapTypeId]);

  
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const google = (window as any).google;
    if (!google?.maps) return;

    if (isTrafficEnabled) {
      if (!trafficLayerRef.current) {
        trafficLayerRef.current = new google.maps.TrafficLayer();
      }
      trafficLayerRef.current.setMap(mapInstanceRef.current);
    } else if (trafficLayerRef.current) {
      trafficLayerRef.current.setMap(null);
    }
  }, [isTrafficEnabled]);

  
  useEffect(() => {
    if (!mapsLoaded || !mapInstanceRef.current) return;
    const google = (window as any).google;
    if (!google?.maps) return;

    const map = mapInstanceRef.current;
    const currentMarkers = markersRef.current;
    const activeVehicleIds = new Set<string>();

    (vehicles || []).forEach((vehicle) => {
      activeVehicleIds.add(vehicle.id);
      const isSelected = vehicle.id === selectedVehicleId;
      const lat = vehicle.currentLat || CENTRAL_DEPOT_LOCATION.lat;
      const lng = vehicle.currentLng || CENTRAL_DEPOT_LOCATION.lng;
      const pos = { lat, lng };

      let statusType: 'moving' | 'idling' | 'on_site' | 'parked' | 'maintenance' = 'parked';
      if (vehicle.status === 'on_site') statusType = 'on_site';
      else if (vehicle.status === 'en_route' || vehicle.telemetryStatus === 'moving') statusType = 'moving';
      else if (vehicle.status === 'maintenance' || vehicle.status === 'out_of_service') statusType = 'maintenance';
      else if (vehicle.telemetryStatus === 'idling') statusType = 'idling';

      const iconSvg = createVehicleIconSvg(statusType, vehicle.heading || 0, isSelected);

      let marker = currentMarkers.get(vehicle.id);
      if (!marker) {
        marker = new google.maps.Marker({
          position: pos,
          map,
          title: `${vehicle.name || vehicle.model} (${vehicle.plate})`,
          icon: {
            url: iconSvg,
            scaledSize: new google.maps.Size(isSelected ? 44 : 36, isSelected ? 44 : 36),
            anchor: new google.maps.Point(isSelected ? 22 : 18, isSelected ? 22 : 18),
          },
          zIndex: isSelected ? 100 : 20,
        });

        marker.addListener('click', () => {
          setSelectedVehicleId(vehicle.id);
        });

        currentMarkers.set(vehicle.id, marker);
      } else {
        marker.setPosition(pos);
        marker.setIcon({
          url: iconSvg,
          scaledSize: new google.maps.Size(isSelected ? 44 : 36, isSelected ? 44 : 36),
          anchor: new google.maps.Point(isSelected ? 22 : 18, isSelected ? 22 : 18),
        });
        marker.setZIndex(isSelected ? 100 : 20);
      }
    });

    
    currentMarkers.forEach((marker, id) => {
      if (!activeVehicleIds.has(id)) {
        marker.setMap(null);
        currentMarkers.delete(id);
      }
    });
  }, [mapsLoaded, vehicles, selectedVehicleId]);

  
  useEffect(() => {
    if (!mapsLoaded || !mapInstanceRef.current) return;
    const google = (window as any).google;
    if (!google?.maps) return;

    const map = mapInstanceRef.current;
    const currentJobMarkers = jobMarkersRef.current;
    const activeJobIds = new Set<string>();

    activeJobs.forEach((job) => {
      activeJobIds.add(job.id);
      if (!job.siteLocation?.lat || !job.siteLocation?.lng) return;

      const pos = { lat: job.siteLocation.lat, lng: job.siteLocation.lng };
      const isUrgent = job.priority === 'urgent';
      const isSelectedJob = selectedJob?.id === job.id;

      const pinColor = isUrgent ? '#ef4444' : job.status === 'on_site' ? '#107c41' : '#3b82f6';

      let marker = currentJobMarkers.get(job.id);
      if (!marker) {
        marker = new google.maps.Marker({
          position: pos,
          map,
          title: `${job.code}: ${job.title}`,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="42" viewBox="0 0 36 42">
                <path d="M18 0 C8.06 0 0 8.06 0 18 C0 31.5 18 42 18 42 C18 42 36 31.5 36 18 C36 8.06 27.94 0 18 0 Z" fill="${pinColor}" stroke="#ffffff" stroke-width="2" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.35))"/>
                <circle cx="18" cy="16" r="7" fill="#ffffff"/>
                <text x="18" y="19" font-size="9" font-weight="bold" font-family="sans-serif" text-anchor="middle" fill="${pinColor}">📍</text>
              </svg>
            `)}`,
            scaledSize: new google.maps.Size(isSelectedJob ? 38 : 30, isSelectedJob ? 44 : 35),
            anchor: new google.maps.Point(isSelectedJob ? 19 : 15, isSelectedJob ? 44 : 35),
          },
          zIndex: isSelectedJob ? 80 : 15,
        });

        marker.addListener('click', () => {
          if (onSelectJob) {
            onSelectJob(job);
          } else if (setInteractingJob) {
            setInteractingJob(job);
          }
        });

        currentJobMarkers.set(job.id, marker);
      } else {
        marker.setPosition(pos);
        marker.setZIndex(isSelectedJob ? 80 : 15);
      }
    });

    currentJobMarkers.forEach((marker, id) => {
      if (!activeJobIds.has(id)) {
        marker.setMap(null);
        currentJobMarkers.delete(id);
      }
    });
  }, [mapsLoaded, activeJobs, selectedJob, onSelectJob, setInteractingJob]);

  
  useEffect(() => {
    if (!mapsLoaded || !mapInstanceRef.current || !directionsRendererRef.current) return;
    const google = (window as any).google;
    if (!google?.maps) return;

    if (!selectedVehicle || !selectedJob?.siteLocation?.lat) {
      directionsRendererRef.current.set('directions', null);
      return;
    }

    const origin = {
      lat: selectedVehicle.currentLat || CENTRAL_DEPOT_LOCATION.lat,
      lng: selectedVehicle.currentLng || CENTRAL_DEPOT_LOCATION.lng,
    };
    const destination = {
      lat: selectedJob.siteLocation.lat,
      lng: selectedJob.siteLocation.lng,
    };

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result: any, status: any) => {
        if (status === google.maps.DirectionsStatus.OK && directionsRendererRef.current) {
          directionsRendererRef.current.setDirections(result);
        } else {
          
          directionsRendererRef.current?.set('directions', null);
        }
      }
    );
  }, [mapsLoaded, selectedVehicle, selectedJob]);

  
  useEffect(() => {
    if (!isLiveSimulating) return;

    const interval = setInterval(async () => {
      try {
        await apiFetch('/api/vehicles/simulate-step', { method: 'POST' });
      } catch (e) {
        
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [isLiveSimulating]);

  
  const handleCenterOnVehicle = (vehicle: FleetVehicle) => {
    if (!mapInstanceRef.current) return;
    const lat = vehicle.currentLat || CENTRAL_DEPOT_LOCATION.lat;
    const lng = vehicle.currentLng || CENTRAL_DEPOT_LOCATION.lng;
    mapInstanceRef.current.panTo({ lat, lng });
    mapInstanceRef.current.setZoom(15);
  };

  
  const handleFitFleetBounds = () => {
    if (!mapInstanceRef.current || !mapsLoaded) return;
    const google = (window as any).google;
    if (!google?.maps) return;

    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: CENTRAL_DEPOT_LOCATION.lat, lng: CENTRAL_DEPOT_LOCATION.lng });

    (vehicles || []).forEach((v) => {
      if (v.currentLat && v.currentLng) {
        bounds.extend({ lat: v.currentLat, lng: v.currentLng });
      }
    });

    activeJobs.forEach((j) => {
      if (j.siteLocation?.lat && j.siteLocation?.lng) {
        bounds.extend({ lat: j.siteLocation.lat, lng: j.siteLocation.lng });
      }
    });

    mapInstanceRef.current.fitBounds(bounds);
  };

  
  const handleRequestAiInsight = async () => {
    if (!selectedVehicle) return;
    setIsAiLoading(true);
    setAiInsight(null);

    const driverName = selectedDriver?.name || 'Assigned Driver';
    const destName = selectedJob ? `${selectedJob.title} at ${selectedJob.siteLocation.name}, ${selectedJob.siteLocation.address}` : selectedVehicle.locationName;

    const result = await fetchFleetAiInsight({
      vehicleId: selectedVehicle.id,
      vehicleName: selectedVehicle.name || selectedVehicle.model,
      plate: selectedVehicle.plate,
      driverName,
      originAddress: selectedVehicle.locationName || 'Central Depot En Route',
      destinationAddress: destName,
      currentStatus: selectedVehicle.status,
      currentLat: selectedVehicle.currentLat,
      currentLng: selectedVehicle.currentLng,
      speedKmh: selectedVehicle.speedKmh,
    });

    setIsAiLoading(false);
    setAiInsight(result);
  };

  
  const handleSaveApiKey = () => {
    setGoogleMapsApiKey(apiKeyInput);
    setShowKeyModal(false);
    window.location.reload();
  };

  return (
    <div
      className={`bg-white border border-slate-300 rounded-lg shadow-xs flex flex-col overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : className
      }`}
    >
      
      <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/30 border border-blue-500/40 rounded-lg text-blue-400">
            <Navigation className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                Live Fleet GPS Telemetry & Vehicle Tracking
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                Live GPS Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Monitoring {vehicles?.length || 0} fleet units, {activeJobs.length} active destinations, and real-time transit routes.
            </p>
          </div>
        </div>

        
        <div className="flex items-center gap-2 flex-wrap">
          
          <button
            type="button"
            onClick={() => setIsLiveSimulating(!isLiveSimulating)}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              isLiveSimulating
                ? 'bg-emerald-950/80 text-emerald-200 border-emerald-700/80 hover:bg-emerald-900'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Toggle live telemetry coordinate updates"
          >
            {isLiveSimulating ? (
              <>
                <Pause className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simulating GPS (Active)</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-slate-400" />
                <span>Simulation Paused</span>
              </>
            )}
          </button>

          
          <button
            type="button"
            onClick={() => setIsTrafficEnabled(!isTrafficEnabled)}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              isTrafficEnabled
                ? 'bg-amber-950/80 text-amber-200 border-amber-700/80 hover:bg-amber-900'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Toggle live Google Maps traffic congestion overlay"
          >
            <Zap className={`w-3.5 h-3.5 ${isTrafficEnabled ? 'text-amber-400' : 'text-slate-400'}`} />
            <span>Traffic Overlay</span>
          </button>

          
          <button
            type="button"
            onClick={handleFitFleetBounds}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
            title="Fit all fleet vehicles & destinations in view"
          >
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            <span>Fit Fleet</span>
          </button>

          
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      
      <div className="flex flex-col lg:flex-row flex-1 min-h-[460px] lg:h-[580px] relative">
        
        <div className="w-full lg:w-80 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 order-2 lg:order-1 max-h-72 lg:max-h-full overflow-y-auto">
          
          <div className="p-3 bg-white border-b border-slate-200 space-y-2 sticky top-0 z-10 shadow-2xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search unit, plate, driver..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-1 rounded font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({vehicles?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('moving')}
                className={`px-2 py-1 rounded font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  statusFilter === 'moving'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Moving
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('on_site')}
                className={`px-2 py-1 rounded font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  statusFilter === 'on_site'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                On Site
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('parked')}
                className={`px-2 py-1 rounded font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  statusFilter === 'parked'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Depot
              </button>
            </div>
          </div>

          
          <div className="p-2 space-y-2 flex-1">
            {filteredVehicles.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No fleet vehicles matching the current filter.
              </div>
            ) : (
              filteredVehicles.map((vehicle) => {
                const isSelected = vehicle.id === selectedVehicleId;
                const driver = workers.find(
                  (w) => w.id === vehicle.assignedDriverId || (w.vehicleInfo && w.vehicleInfo.plate === vehicle.plate)
                );
                const linkedJob = jobs.find((j) => {
                  if (vehicle.currentJobId && j.id === vehicle.currentJobId) return true;
                  if (driver && (j.driverId === driver.id || (j.driverIds && j.driverIds.includes(driver.id)))) return true;
                  return false;
                });

                let statusBadge = 'bg-slate-100 text-slate-700 border-slate-300';
                let statusLabel = 'In Depot / Available';
                if (vehicle.status === 'on_site') {
                  statusBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                  statusLabel = 'On Site';
                } else if (vehicle.status === 'en_route' || vehicle.telemetryStatus === 'moving') {
                  statusBadge = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
                  statusLabel = `In Transit (${vehicle.speedKmh || 45} km/h)`;
                } else if (vehicle.status === 'maintenance') {
                  statusBadge = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
                  statusLabel = 'Maintenance';
                }

                return (
                  <div
                    key={vehicle.id}
                    onClick={() => {
                      setSelectedVehicleId(vehicle.id);
                      handleCenterOnVehicle(vehicle);
                    }}
                    className={`p-3 rounded-lg border text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-1 ring-blue-400/40'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            vehicle.status === 'on_site'
                              ? 'bg-emerald-600 text-white'
                              : vehicle.status === 'en_route' || vehicle.telemetryStatus === 'moving'
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-800 text-white'
                          }`}
                        >
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 leading-tight">
                            {vehicle.name || vehicle.model}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500">
                            {vehicle.plate} • {vehicle.fuelOrBattery || 'Fleet Standard'}
                          </div>
                        </div>
                      </div>

                      <span className={`text-[10px] px-2 py-0.5 rounded border ${statusBadge}`}>
                        {statusLabel}
                      </span>
                    </div>

                    
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col gap-1 text-[11px]">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="font-medium">{driver ? driver.name : 'Unassigned Operator'}</span>
                        </span>
                        {vehicle.batteryLevel !== undefined && (
                          <span className="flex items-center gap-1 text-slate-500 font-mono text-[10px]">
                            <BatteryCharging className="w-3 h-3 text-emerald-600" />
                            {Math.round(vehicle.batteryLevel)}%
                          </span>
                        )}
                      </div>

                      {linkedJob ? (
                        <div className="text-slate-700 bg-slate-100/70 px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                          <span className="truncate">{linkedJob.code}: {linkedJob.siteLocation?.name}</span>
                        </div>
                      ) : (
                        <div className="text-slate-400 text-[10px] italic">
                          Base location: {vehicle.locationName || 'Central Depot'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        
        <div className="flex-1 relative order-1 lg:order-2 bg-slate-100 min-h-[350px]">
          
          <div ref={mapContainerRef} className="w-full h-full min-h-[350px]" />

          
          <div className="absolute top-3 right-3 z-10 flex items-center bg-white/95 backdrop-blur-xs border border-slate-300 rounded-lg shadow-sm p-1 gap-1 text-xs">
            <button
              type="button"
              onClick={() => setMapTypeId('roadmap')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                mapTypeId === 'roadmap' ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => setMapTypeId('satellite')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                mapTypeId === 'satellite' ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Satellite
            </button>
            <button
              type="button"
              onClick={() => setMapTypeId('terrain')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                mapTypeId === 'terrain' ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Terrain
            </button>
          </div>

          
          {mapsError && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-6 z-20">
              <div className="max-w-md bg-white rounded-xl p-5 shadow-2xl border border-rose-200 text-slate-800 space-y-3">
                <div className="flex items-center gap-2.5 text-rose-600 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5" />
                  Google Maps SDK Notice
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {mapsError}. You can configure your custom Google Maps Platform API key to activate live map rendering.
                </p>
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowKeyModal(true)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs cursor-pointer"
                  >
                    Configure API Key
                  </button>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-xs border border-slate-300 cursor-pointer"
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
            </div>
          )}

          
          {selectedVehicle && (
            <div className="absolute bottom-3 left-3 right-3 z-10 bg-white/95 backdrop-blur-md border border-slate-300 rounded-xl p-4 shadow-xl text-xs space-y-3 max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 ${
                      selectedVehicle.status === 'on_site'
                        ? 'bg-emerald-600'
                        : selectedVehicle.status === 'en_route' || selectedVehicle.telemetryStatus === 'moving'
                        ? 'bg-amber-600'
                        : 'bg-slate-800'
                    }`}
                  >
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {selectedVehicle.name || selectedVehicle.model}
                      </span>
                      <span className="font-mono text-slate-600 text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                        {selectedVehicle.plate}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Driver: <strong className="text-slate-700">{selectedDriver ? selectedDriver.name : 'Unassigned'}</strong> •
                      Base: {selectedVehicle.locationName || 'Central Depot'}
                    </div>
                  </div>
                </div>

                
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded border border-slate-200">
                    <Gauge className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase leading-none">Speed</div>
                      <div className="font-bold text-slate-800 text-xs">{selectedVehicle.speedKmh || 0} km/h</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded border border-slate-200">
                    <Compass className="w-4 h-4 text-amber-600" />
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase leading-none">Heading</div>
                      <div className="font-bold text-slate-800 text-xs">{selectedVehicle.heading || 0}°</div>
                    </div>
                  </div>

                  {selectedVehicle.batteryLevel !== undefined && (
                    <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded border border-slate-200">
                      <BatteryCharging className="w-4 h-4 text-emerald-600" />
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase leading-none">Fuel/Bat</div>
                        <div className="font-bold text-slate-800 text-xs">{Math.round(selectedVehicle.batteryLevel)}%</div>
                      </div>
                    </div>
                  )}

                  
                  <button
                    type="button"
                    onClick={handleRequestAiInsight}
                    disabled={isAiLoading}
                    className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold text-xs transition-all shadow-sm cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isAiLoading ? 'Analyzing Maps...' : 'AI Traffic & Route Advisory'}</span>
                  </button>
                </div>
              </div>

              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                {selectedJob ? (
                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      En Route to: <strong className="text-slate-900">{selectedJob.title}</strong> ({selectedJob.siteLocation.name}, {selectedJob.siteLocation.address})
                    </span>
                  </div>
                ) : (
                  <div className="text-slate-500 italic">
                    No active job assignment linked. Vehicle in Central Pool.
                  </div>
                )}

                
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateVehicleStatus(selectedVehicle.id, 'en_route', 'Dispatched into field', 'In Transit')}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded font-semibold text-[11px] cursor-pointer transition-colors"
                  >
                    Set In Transit
                  </button>
                  <button
                    type="button"
                    onClick={() => updateVehicleStatus(selectedVehicle.id, 'on_site', 'Arrived at job site', 'On Site')}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded font-semibold text-[11px] cursor-pointer transition-colors"
                  >
                    Arrived On Site
                  </button>
                  <button
                    type="button"
                    onClick={() => updateVehicleStatus(selectedVehicle.id, 'available', 'Returned to Central Depot', 'Central Depot')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded font-semibold text-[11px] cursor-pointer transition-colors"
                  >
                    Return to Depot
                  </button>
                </div>
              </div>

              
              {aiInsight && (
                <div className="mt-2 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-3.5 rounded-lg border border-blue-500/40 shadow-inner space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs text-amber-300">
                      <Sparkles className="w-4 h-4" />
                      <span>Google Maps Grounded AI Route Intelligence (Gemini 2.5 Flash)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiInsight(null)}
                      className="text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      ✕ Close
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-200 whitespace-pre-line leading-relaxed font-sans">
                    {aiInsight.insight}
                  </div>

                  {aiInsight.groundingMetadata?.groundingChunks && (
                    <div className="pt-2 border-t border-slate-700/60 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-300">Maps Grounding Sources:</span>
                      {aiInsight.groundingMetadata.groundingChunks.slice(0, 3).map((chunk: any, idx: number) => (
                        <span key={idx} className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-blue-300">
                          {chunk.web?.title || chunk.maps?.title || 'Google Maps Live Transit Node'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Google Maps Platform API Key
              </h3>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Enter your Google Maps JavaScript API key with Maps JavaScript API, Places API, and Directions API enabled:
            </p>

            <input
              type="text"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIzaSyBdLry4M4LfOxRCceW8IDx87BamXdHyFLs"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded cursor-pointer"
              >
                Save & Reload Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
