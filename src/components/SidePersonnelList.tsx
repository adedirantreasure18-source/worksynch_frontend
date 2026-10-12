import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Worker, WorkerRole, WorkerStatus } from '../types';
import {
  Users,
  User,
  Truck,
  Phone,
  Plus,
  Edit,
  Trash2,
  Car,
  Search,
  CheckCircle2,
  Navigation,
  MapPin,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Flame,
  Wrench,
} from 'lucide-react';

export const SidePersonnelList: React.FC = () => {
  const {
    workers,
    jobs,
    selectedDate,
    dateScope,
    setEditingWorker,
    updateWorker,
    deleteWorker,
    setIsAddWorkerOpen,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'specialists' | 'drivers' | 'vehicles'>('specialists');
  const [tradeFilter, setTradeFilter] = useState<'all' | WorkerRole>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  
  const dayJobs = useMemo(() => {
    return dateScope === 'all' ? jobs : jobs.filter((j) => j.scheduledDate === selectedDate);
  }, [jobs, selectedDate, dateScope]);

  
  const specialists = useMemo(() => workers.filter((w) => w.role !== 'driver'), [workers]);
  const engineers = useMemo(() => workers.filter((w) => w.role === 'engineer'), [workers]);
  const welders = useMemo(() => workers.filter((w) => w.role === 'welder'), [workers]);
  const plumbers = useMemo(() => workers.filter((w) => w.role === 'plumber'), [workers]);
  const drivers = useMemo(() => workers.filter((w) => w.role === 'driver'), [workers]);

  
  const fleetVehicles = useMemo(() => {
    const list: Array<{
      id: string;
      plate: string;
      model: string;
      capacity: number;
      driver: Worker;
      assignedSpecialists: Worker[];
      status: 'active_route' | 'on_site' | 'depot_standby';
      location: string;
    }> = [];

    drivers.forEach((driver) => {
      if (driver.vehicleInfo) {
        const pairedSpecialists = specialists.filter((e) => e.assignedDriverId === driver.id);
        let vehicleStatus: 'active_route' | 'on_site' | 'depot_standby' = 'depot_standby';
        if (driver.status === 'on_site') vehicleStatus = 'on_site';
        else if (driver.status === 'en_route') vehicleStatus = 'active_route';

        list.push({
          id: `veh-${driver.id}`,
          plate: driver.vehicleInfo.plate,
          model: driver.vehicleInfo.model,
          capacity: driver.vehicleInfo.capacity,
          driver,
          assignedSpecialists: pairedSpecialists,
          status: vehicleStatus,
          location: driver.locationName || 'Central Depot',
        });
      }
    });

    return list;
  }, [drivers, specialists]);

  
  const filteredSpecialists = useMemo(() => {
    let list = specialists;
    if (tradeFilter !== 'all') {
      list = list.filter((s) => s.role === tradeFilter);
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((s) => {
      const driver = drivers.find((d) => d.id === s.assignedDriverId);
      return (
        s.name.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        (s.roleTitle && s.roleTitle.toLowerCase().includes(q)) ||
        (s.specializations && s.specializations.some((sp) => sp.toLowerCase().includes(q))) ||
        s.skills.some((sk) => sk.toLowerCase().includes(q)) ||
        (driver && driver.name.toLowerCase().includes(q)) ||
        (driver?.vehicleInfo && driver.vehicleInfo.plate.toLowerCase().includes(q))
      );
    });
  }, [specialists, tradeFilter, drivers, searchQuery]);

  const filteredDrivers = useMemo(() => {
    if (!searchQuery.trim()) return drivers;
    const q = searchQuery.toLowerCase();
    return drivers.filter((d) => {
      return (
        d.name.toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        (d.vehicleInfo && d.vehicleInfo.model.toLowerCase().includes(q)) ||
        (d.vehicleInfo && d.vehicleInfo.plate.toLowerCase().includes(q))
      );
    });
  }, [drivers, searchQuery]);

  const filteredVehicles = useMemo(() => {
    if (!searchQuery.trim()) return fleetVehicles;
    const q = searchQuery.toLowerCase();
    return fleetVehicles.filter(
      (v) =>
        v.plate.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.driver.name.toLowerCase().includes(q) ||
        v.assignedSpecialists.some((e) => e.name.toLowerCase().includes(q))
    );
  }, [fleetVehicles, searchQuery]);

  const handleStatusToggle = (worker: Worker) => {
    const nextStatusMap: Record<WorkerStatus, WorkerStatus> = {
      available: 'en_route',
      en_route: 'on_site',
      on_site: 'completed',
      completed: 'available',
      off_duty: 'available',
      on_leave: 'available',
    };
    const next = nextStatusMap[worker.status] || 'available';
    updateWorker(worker.id, { status: next });
  };

  return (
    <aside
      id="side-personnel-fleet-panel"
      className="w-full lg:w-[320px] shrink-0 bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden select-none flex flex-col"
    >
      
      <div className="bg-slate-100/90 border-b border-slate-300 px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#107c41] text-white flex items-center justify-center shadow-xs">
            <Users className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-slate-900 leading-tight">
              Personnel
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              {workers.length} active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsAddWorkerOpen(true)}
            className="p-1 rounded text-slate-500 hover:text-emerald-700 hover:bg-slate-200 transition-colors"
            title="Add Personnel"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          
          <div className="grid grid-cols-3 bg-slate-200/70 p-1 gap-1 border-b border-slate-300 text-xs font-semibold">
            
            <button
              id="tab-side-specialists"
              onClick={() => setActiveTab('specialists')}
              className={`py-1.5 px-1 rounded flex flex-col items-center justify-center gap-0.5 transition-all ${
                activeTab === 'specialists'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-300/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center gap-1">
                <User className="w-3 h-3 text-indigo-600" />
                <span className="text-[11px]">Specialists</span>
              </div>
              <span className="text-[9px] font-mono px-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                {specialists.length}
              </span>
            </button>

            
            <button
              id="tab-side-drivers"
              onClick={() => setActiveTab('drivers')}
              className={`py-1.5 px-1 rounded flex flex-col items-center justify-center gap-0.5 transition-all ${
                activeTab === 'drivers'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-300/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center gap-1">
                <Truck className="w-3 h-3 text-amber-600" />
                <span className="text-[11px]">Drivers</span>
              </div>
              <span className="text-[9px] font-mono px-1 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                {drivers.length}
              </span>
            </button>

            
            <button
              id="tab-side-vehicles"
              onClick={() => setActiveTab('vehicles')}
              className={`py-1.5 px-1 rounded flex flex-col items-center justify-center gap-0.5 transition-all ${
                activeTab === 'vehicles'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-300/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center gap-1">
                <Car className="w-3 h-3 text-[#107c41]" />
                <span className="text-[11px]">Vehicles</span>
              </div>
              <span className="text-[9px] font-mono px-1 rounded bg-emerald-50 text-[#107c41] border border-emerald-200 font-bold">
                {fleetVehicles.length}
              </span>
            </button>
          </div>

          
          <div className="p-2 border-b border-slate-200 bg-white space-y-1.5">
            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab}...`}
                className="w-full pl-6 pr-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#107c41] bg-slate-50 placeholder:text-slate-400"
              />
            </div>

            {activeTab === 'specialists' && (
              <div className="flex items-center gap-1 text-[10px] overflow-x-auto pb-0.5">
                <button
                  onClick={() => setTradeFilter('all')}
                  className={`px-1.5 py-0.5 rounded font-semibold whitespace-nowrap transition-colors ${
                    tradeFilter === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({specialists.length})
                </button>
                <button
                  onClick={() => setTradeFilter('engineer')}
                  className={`px-1.5 py-0.5 rounded font-semibold whitespace-nowrap transition-colors ${
                    tradeFilter === 'engineer'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  Eng ({engineers.length})
                </button>
                <button
                  onClick={() => setTradeFilter('welder')}
                  className={`px-1.5 py-0.5 rounded font-semibold whitespace-nowrap transition-colors flex items-center gap-0.5 ${
                    tradeFilter === 'welder'
                      ? 'bg-orange-600 text-white'
                      : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                  }`}
                >
                  <Flame className="w-2.5 h-2.5" />
                  <span>Weld ({welders.length})</span>
                </button>
                <button
                  onClick={() => setTradeFilter('plumber')}
                  className={`px-1.5 py-0.5 rounded font-semibold whitespace-nowrap transition-colors flex items-center gap-0.5 ${
                    tradeFilter === 'plumber'
                      ? 'bg-cyan-700 text-white'
                      : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
                  }`}
                >
                  <Wrench className="w-2.5 h-2.5" />
                  <span>Plumb ({plumbers.length})</span>
                </button>
              </div>
            )}
          </div>

          
          <div className="p-2 space-y-2 max-h-[380px] overflow-y-auto bg-slate-50/50 flex-1">
            
            {activeTab === 'specialists' && (
              <>
                {filteredSpecialists.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No field specialists found.
                  </div>
                ) : (
                  filteredSpecialists.map((worker) => {
                    const assignedDriver = drivers.find((d) => d.id === worker.assignedDriverId);
                    const stopsToday = dayJobs.filter((j) => j.engineerId === worker.id).length;

                    return (
                      <div
                        key={worker.id}
                        className="bg-white border border-slate-200 hover:border-[#107c41] rounded-lg p-2.5 text-xs shadow-2xs transition-all"
                      >
                        
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`w-7 h-5 rounded px-1 flex items-center justify-center font-bold text-[9px] uppercase shrink-0 border ${
                                worker.role === 'welder'
                                  ? 'bg-orange-100 text-orange-800 border-orange-200'
                                  : worker.role === 'plumber'
                                  ? 'bg-cyan-100 text-cyan-800 border-cyan-200'
                                  : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                              }`}
                            >
                              {worker.role === 'welder' ? 'WLD' : worker.role === 'plumber' ? 'PLM' : 'ENG'}
                            </span>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 truncate block">
                                {worker.name}
                              </span>
                              {worker.roleTitle && (
                                <span className="text-[10px] text-slate-500 block truncate">
                                  {worker.roleTitle}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => handleStatusToggle(worker)}
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border transition-colors shrink-0 ${
                              worker.status === 'on_site'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : worker.status === 'en_route'
                                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                : 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
                            }`}
                            title="Click to toggle status"
                          >
                            {worker.status === 'en_route' ? 'in transit' : worker.status.replace('_', ' ')}
                          </button>
                        </div>

                        
                        <div className="flex items-center justify-between text-[11px] text-slate-600 mt-1.5 font-mono">
                          <a
                            href={`tel:${worker.phone}`}
                            className="flex items-center gap-1 hover:text-emerald-700"
                          >
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            <span>{worker.phone}</span>
                          </a>
                          <span className="text-[10px] text-slate-500 font-sans">
                            <strong>{stopsToday}</strong> stops today
                          </span>
                        </div>

                        
                        {((worker.specializations && worker.specializations.length > 0) || (worker.skills && worker.skills.length > 0)) && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {worker.specializations?.slice(0, 1).map((spec, spIdx) => (
                              <span
                                key={`sp-${spIdx}`}
                                className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-200 text-indigo-800 font-semibold truncate max-w-[180px]"
                                title={spec}
                              >
                                {spec}
                              </span>
                            ))}
                            {worker.skills?.slice(0, 2).map((sk, skIdx) => (
                              <span
                                key={`sk-${skIdx}`}
                                className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 truncate max-w-[130px]"
                                title={sk}
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}

                        
                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <div className="truncate text-slate-600">
                            {assignedDriver ? (
                              <div className="flex items-center gap-1">
                                <Truck className="w-3 h-3 text-amber-600 shrink-0" />
                                <span className="truncate">{assignedDriver.name}</span>
                              </div>
                            ) : worker.vehicleInfo ? (
                              <div className="flex items-center gap-1">
                                <Truck className="w-3 h-3 text-slate-600 shrink-0" />
                                <span className="truncate">{worker.vehicleInfo.model}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No assigned driver</span>
                            )}
                          </div>

                          {(assignedDriver?.vehicleInfo?.plate || worker.vehicleInfo?.plate) && (
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-800 shrink-0">
                              {assignedDriver?.vehicleInfo?.plate || worker.vehicleInfo?.plate}
                            </span>
                          )}

                          <div className="flex items-center gap-0.5 ml-1 shrink-0">
                            <button
                              onClick={() => setEditingWorker(worker)}
                              className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
                              title="Edit Specialist"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteWorker(worker.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                              title="Delete Specialist"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

            
            {activeTab === 'drivers' && (
              <>
                {filteredDrivers.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No drivers found.
                  </div>
                ) : (
                  filteredDrivers.map((driver) => {
                    const stopsToday = dayJobs.filter((j) => j.driverId === driver.id).length;
                    const pairedEngineers = engineers.filter((e) => e.assignedDriverId === driver.id);

                    return (
                      <div
                        key={driver.id}
                        className="bg-white border border-slate-200 hover:border-amber-400 rounded-lg p-2.5 text-xs shadow-2xs transition-all"
                      >
                        
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                              DRV
                            </span>
                            <span className="font-bold text-slate-900 truncate">
                              {driver.name}
                            </span>
                          </div>

                          <button
                            onClick={() => handleStatusToggle(driver)}
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border transition-colors ${
                              driver.status === 'on_site'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : driver.status === 'en_route'
                                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                : 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
                            }`}
                            title="Click to toggle status"
                          >
                            {driver.status === 'en_route' ? 'in transit' : driver.status.replace('_', ' ')}
                          </button>
                        </div>

                        
                        {driver.vehicleInfo && (
                          <div className="mt-1.5 bg-slate-50 border border-slate-200 rounded p-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-black bg-slate-900 text-amber-300 px-1.5 py-0.5 rounded tracking-wider shadow-2xs">
                                {driver.vehicleInfo.plate}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                Cap: {driver.vehicleInfo.capacity} pax
                              </span>
                            </div>
                            <div className="text-[11px] font-medium text-slate-700 truncate mt-1">
                              {driver.vehicleInfo.model}
                            </div>
                          </div>
                        )}

                        
                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                          <a
                            href={`tel:${driver.phone}`}
                            className="flex items-center gap-1 font-mono hover:text-emerald-700"
                          >
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            <span>{driver.phone}</span>
                          </a>

                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <span>{stopsToday} stops</span>
                            <div className="flex items-center gap-0.5 ml-0.5">
                              <button
                                onClick={() => setEditingWorker(driver)}
                                className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
                                title="Edit Driver"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => deleteWorker(driver.id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                                title="Delete Driver"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {pairedEngineers.length > 0 && (
                          <div className="mt-1 text-[10px] text-slate-500 truncate">
                            Partner: {pairedEngineers.map((e) => e.name).join(', ')}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </>
            )}

            
            {activeTab === 'vehicles' && (
              <>
                {filteredVehicles.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No vehicles found.
                  </div>
                ) : (
                  filteredVehicles.map((veh) => (
                    <div
                      key={veh.id}
                      className="bg-white border border-slate-200 hover:border-emerald-400 rounded-lg p-2.5 text-xs shadow-2xs transition-all"
                    >
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="font-mono text-xs font-black bg-slate-900 text-amber-300 border border-slate-700 px-2 py-0.5 rounded shadow-2xs tracking-wider">
                            {veh.plate}
                          </div>
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                              veh.status === 'active_route'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : veh.status === 'on_site'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                          >
                            {veh.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => setEditingWorker(veh.driver)}
                            className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
                            title="Edit Vehicle & Driver"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteWorker(veh.driver.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                            title="Delete Vehicle & Driver"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      
                      <div className="font-semibold text-slate-900 mt-1.5 text-xs">
                        {veh.model}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                        <span>Capacity: {veh.capacity} passengers & gear</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {veh.location}
                        </span>
                      </div>

                      
                      <div className="mt-2 pt-1.5 border-t border-slate-100 space-y-0.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Driver:</span>
                          <span className="font-semibold text-slate-800">
                            {veh.driver.name}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Specialists:</span>
                          <span className="font-medium text-slate-700 truncate max-w-[170px]">
                            {veh.assignedSpecialists.length > 0
                              ? veh.assignedSpecialists.map((e) => e.name).join(', ')
                              : 'None paired'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </>
      )}
    </aside>
  );
};
