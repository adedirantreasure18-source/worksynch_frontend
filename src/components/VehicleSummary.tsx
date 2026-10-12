import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Truck,
  CheckCircle2,
  Package,
  RotateCcw,
  ExternalLink,
  User,
  ArrowUpRight,
  Calendar,
  History,
  AlertTriangle,
  Wrench,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Job, FleetVehicle } from '../types';
import { getEffectiveLeaveInfo } from '../utils/leaveUtils';

interface VehicleSummaryProps {
  className?: string;
  onSelectJob?: (job: Job) => void;
}

export const VehicleSummary: React.FC<VehicleSummaryProps> = ({
  className = '',
  onSelectJob,
}) => {
  const { vehicles, jobs, workers, updateVehicleStatus, assignVehicleDriver, setInteractingJob, openSettingsTab } = useApp();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'in_field' | 'returned' | 'in_depot'>('in_field');

  const handleOpenJob = (job: Job) => {
    if (onSelectJob) {
      onSelectJob(job);
    } else if (setInteractingJob) {
      setInteractingJob(job);
    }
  };

  const fleetList = (vehicles || []).filter(v => (v.name || v.model || '').trim().length > 0);

  if (fleetList.length === 0) {
    return null;
  }

  
  const totalFleetCount = fleetList.length;
  
  
  const vehicleItems = fleetList.map(vehicle => {
    const isFieldActive = vehicle.status === 'in_use' || vehicle.status === 'en_route' || vehicle.status === 'on_site';
    const isMaintenance = vehicle.status === 'maintenance' || vehicle.status === 'out_of_service';
    const isAvailable = vehicle.status === 'available';

    
    const driver = workers.find(w => w.id === vehicle.assignedDriverId || (w.vehicleInfo && w.vehicleInfo.plate === vehicle.plate));

    
    const linkedJob = jobs.find(j => {
      if (vehicle.currentJobId && j.id === vehicle.currentJobId) return true;
      if (driver && (j.driverId === driver.id || (j.driverIds && j.driverIds.includes(driver.id)))) return true;
      return false;
    });

    const driverName = driver ? driver.name : (vehicle.assignedDriverId ? 'Assigned Driver' : 'Fleet Operator');
    const scheduledDate = linkedJob?.scheduledDate || new Date().toISOString().slice(0, 10);
    const displayName = vehicle.name ? `${vehicle.name} (${vehicle.plate || vehicle.model})` : `${vehicle.model} (${vehicle.plate})`;

    return {
      id: vehicle.id,
      vehicle,
      displayName,
      model: vehicle.model,
      plate: vehicle.plate,
      status: vehicle.status,
      isFieldActive,
      isMaintenance,
      isAvailable,
      driverName,
      driver,
      linkedJob,
      date: scheduledDate,
      locationName: vehicle.locationName || (linkedJob ? linkedJob.siteLocation?.name : 'In Field'),
      notes: vehicle.notes,
    };
  });

  const activeInFieldVehicles = vehicleItems.filter(v => v.isFieldActive);
  const availableDepotVehicles = vehicleItems.filter(v => v.isAvailable);
  const maintenanceVehicles = vehicleItems.filter(v => v.isMaintenance);

  const handleReturnToDepot = async (vehicleId: string, currentStatus: string) => {
    setIsUpdating(vehicleId);
    try {
      if (currentStatus === 'available') {
        
        await updateVehicleStatus(vehicleId, 'on_site', 'Dispatched to field site', 'On Site');
      } else {
        
        await updateVehicleStatus(vehicleId, 'available', 'Returned to depot inspection bay', 'Central Depot');
      }
    } finally {
      setTimeout(() => setIsUpdating(null), 250);
    }
  };

  const displayedVehicles = statusFilter === 'in_field'
    ? activeInFieldVehicles
    : statusFilter === 'returned'
    ? availableDepotVehicles
    : [];

  return (
    <div
      id="vehicle-summary-panel"
      className={`pt-2.5 mt-2.5 border border-slate-300 text-xs bg-white p-2.5 rounded-lg ${className}`}
    >
      
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
            <Truck className="w-3.5 h-3.5 text-[#107c41] shrink-0" />
            <span>Vehicle Status</span>
          </div>

          
          <div className="flex items-center gap-1.5 text-[11px]">
            {activeInFieldVehicles.length > 0 ? (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 border border-[#5e7ba1] px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                {activeInFieldVehicles.length} in field
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-slate-100 border border-[#5e7ba1] px-2 py-0.5 rounded-full">
                0 in field
              </span>
            )}

            <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 border border-[#5e7ba1] px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
              {availableDepotVehicles.length} available
            </span>

            {maintenanceVehicles.length > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                <Wrench className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                {maintenanceVehicles.length} maintenance
              </span>
            )}

            <span className="text-black font-normal">
              ({totalFleetCount} total fleet)
            </span>
          </div>
        </div>

        
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 text-[11px]">
            <button
              type="button"
              id="btn-vehicles-filter-in-field"
              onClick={() => setStatusFilter('in_field')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                statusFilter === 'in_field'
                  ? 'bg-white text-amber-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Active vehicles currently dispatched in the field"
            >
              In Field ({activeInFieldVehicles.length})
            </button>
            <button
              type="button"
              id="btn-vehicles-filter-in-depot"
              onClick={() => setStatusFilter('in_depot')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                statusFilter === 'in_depot'
                  ? 'bg-white text-emerald-800 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="All available fleet vehicles"
            >
              Vehicles Available ({availableDepotVehicles.length})
            </button>
            {availableDepotVehicles.length > 0 && (
              <button
                type="button"
                id="btn-vehicles-filter-returned"
                onClick={() => setStatusFilter('returned')}
                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'returned'
                    ? 'bg-white text-slate-900 font-bold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="View depot available fleet history"
              >
                <History className="w-2.5 h-2.5" />
                <span>Returned ({availableDepotVehicles.length})</span>
              </button>
            )}
          </div>

          <button
            type="button"
            id="btn-vehicles-manage-settings"
            onClick={() => openSettingsTab('vehicles')}
            className="text-[11px] font-medium text-slate-500 hover:text-[#107c41] flex items-center gap-1 cursor-pointer transition-colors px-1.5 py-0.5 rounded hover:bg-slate-100"
            title="Open Fleet & Vehicles in Settings"
          >
            <span>Settings</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      
      <div className="space-y-2">
        
        {statusFilter === 'in_field' && activeInFieldVehicles.length === 0 ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 bg-emerald-50/60 border border-[#30805d] rounded-lg text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <span className="font-semibold text-slate-900">All fleet vehicles are available</span>
                <span className="text-slate-500 ml-1.5">
                  ({availableDepotVehicles.length} vehicles pre-inspected and ready for dispatch)
                </span>
              </div>
            </div>

            
            <div className="flex flex-wrap gap-1.5">
              {availableDepotVehicles.map(v => (
                <span
                  key={v.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-emerald-200 text-slate-700 text-[11px] shadow-2xs"
                >
                  <Truck className="w-2.5 h-2.5 text-emerald-600" />
                  <span className="font-medium">{v.vehicle.name || v.vehicle.model}</span>
                  <span className="font-mono text-emerald-700 font-bold">({v.plate})</span>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <>
            
            {displayedVehicles.length > 0 && (
              <div className="flex flex-col gap-1.5">
                
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 px-0.5 pt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'in_field' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-600'}`} />
                  <span>{statusFilter === 'in_field' ? 'In Field' : 'Available History'} ({displayedVehicles.length}):</span>
                </div>

                <AnimatePresence mode="popLayout">
                  {displayedVehicles.map((item) => {
                    const updating = isUpdating === item.id;
                    const isReturned = item.status === 'available';

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0, transition: { duration: 0.2 } }}
                        id={`vehicle-summary-item-${item.id}`}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors overflow-hidden ${
                          isReturned
                            ? 'bg-slate-50/70 border-slate-200 text-slate-500'
                            : 'bg-white border-[#cbcbcb] text-slate-800 shadow-2xs hover:border-slate-400'
                        }`}
                      >
                        
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0 text-xs">
                          
                          {item.date && (
                            <span className="font-mono font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                              {item.date}
                            </span>
                          )}

                          
                          <span className="font-mono font-bold text-slate-900">
                            (1)
                          </span>

                          
                          <span className={`font-bold ${isReturned ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                            {item.vehicle.name || item.vehicle.model}
                          </span>

                          
                          <span className="font-mono text-[11px] font-semibold bg-slate-100 text-slate-700 border border-[#5e7ba1] px-1.5 py-0.2 rounded">
                            {item.plate}
                          </span>

                          
                          <span className="text-slate-500 font-normal">driven by</span>
                          <select
                            value={item.vehicle.assignedDriverId || ''}
                            onChange={(e) => assignVehicleDriver(item.id, e.target.value || undefined)}
                            className="text-[11px] font-semibold text-slate-800 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded px-1.5 py-0.5 outline-none focus:border-[#107c41] cursor-pointer transition-colors shadow-2xs"
                            title="Assign or change driver for this vehicle"
                          >
                            <option value="">-- No Driver --</option>
                            {workers
                              .filter((w) => w.role === 'driver' || (w.roleTitle && w.roleTitle.toLowerCase().includes('driver')))
                              .map((d) => {
                                const leaveInfo = getEffectiveLeaveInfo(d);
                                const leaveText = leaveInfo.isOnLeave
                                  ? ' [On Leave]'
                                  : leaveInfo.daysUntilLeave !== null && leaveInfo.daysUntilLeave !== undefined && leaveInfo.daysUntilLeave <= 7
                                  ? ` [Leaves in ${leaveInfo.daysUntilLeave}d]`
                                  : '';
                                return (
                                  <option key={d.id} value={d.id}>
                                    {d.name} {d.vehicleInfo?.plate ? `(${d.vehicleInfo.plate})` : ''}{leaveText}
                                  </option>
                                );
                              })}
                          </select>

                          
                          {item.linkedJob ? (
                            <>
                              <span className="text-slate-500 font-normal">for</span>
                              <button
                                type="button"
                                onClick={() => handleOpenJob(item.linkedJob!)}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-[#107c41] border border-emerald-300 font-mono text-xs font-bold transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
                                title={`Open Job #${item.linkedJob.code}: ${item.linkedJob.title} • Client: ${item.linkedJob.clientName || 'Client'}`}
                                aria-label={`Open appointment ${item.linkedJob.code}`}
                              >
                                <span>{item.linkedJob.code}</span>
                                <ArrowUpRight className="w-3 h-3 text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                              </button>
                            </>
                          ) : item.locationName && item.locationName !== 'Central Depot' ? (
                            <>
                              <span className="text-slate-500 font-normal">at</span>
                              <span className="font-medium text-slate-700 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200/80">
                                {item.locationName}
                              </span>
                            </>
                          ) : null}

                          
                          <span className={`text-[11px] font-semibold px-1.5 py-0.2 rounded border ${
                            isReturned
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                              : 'text-amber-800 bg-amber-50 border-amber-200'
                          }`}>
                            ({isReturned ? 'Available' : item.status === 'on_site' ? 'On Site' : item.status === 'en_route' ? 'En Route' : 'In Field'})
                          </span>

                          
                          {item.vehicle.speedKmh !== undefined && item.vehicle.speedKmh > 0 && (
                            <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 font-bold flex items-center gap-0.5">
                              <span>⚡ {item.vehicle.speedKmh} km/h</span>
                            </span>
                          )}

                          {item.notes && (
                            <span className="text-slate-400 text-[11px] italic">
                              • {item.notes}
                            </span>
                          )}
                        </div>

                        
                        <button
                          type="button"
                          id={`btn-toggle-vehicle-return-${item.id}`}
                          disabled={updating}
                          onClick={() => handleReturnToDepot(item.id, item.status)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold border cursor-pointer transition-colors shrink-0 flex items-center justify-center gap-1.5 ${
                            isReturned
                              ? 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-2xs'
                          } ${updating ? 'opacity-60 cursor-wait' : ''}`}
                          title={isReturned ? 'Dispatch vehicle back to field' : 'Return vehicle to depot (row will clear from In Field)'}
                        >
                          {isReturned ? (
                            <>
                              <RotateCcw className="w-3 h-3 text-slate-500" />
                              <span>Dispatch</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              <span>Return to Depot</span>
                            </>
                          )}
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            
            {statusFilter === 'returned' && availableDepotVehicles.length === 0 && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>No fleet vehicles are currently available.</span>
              </div>
            )}

            
            {(statusFilter === 'in_field' || statusFilter === 'in_depot') && (
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 mt-1">
                <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <Package className="w-3 h-3 text-slate-400" />
                  Vehicles available:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {fleetList.map(v => {
                    const isAvail = v.status === 'available';
                    const isMaint = v.status === 'maintenance' || v.status === 'out_of_service';

                    return (
                      <span
                        key={v.id}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs transition-colors shadow-2xs ${
                          isAvail
                            ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            : isMaint
                            ? 'bg-rose-50/50 border-rose-200 text-rose-800'
                            : 'bg-amber-50/40 border-amber-200 text-amber-900'
                        }`}
                        title={`${v.name || v.model} (${v.plate}) • Status: ${v.status} • Location: ${v.locationName || 'Depot'}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isAvail ? 'bg-emerald-500' : isMaint ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'
                          }`}
                        />
                        <span className="font-medium text-slate-800">{v.name || v.model}</span>
                        <span className="text-slate-500 font-mono text-[11px] font-semibold">({v.plate})</span>
                        {isAvail ? (
                          <span className="text-emerald-700 font-semibold text-[10px] uppercase">Available</span>
                        ) : isMaint ? (
                          <span className="text-rose-700 font-semibold text-[10px] uppercase">Service</span>
                        ) : (
                          <span className="text-amber-700 font-semibold text-[10px] uppercase">In Field</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
