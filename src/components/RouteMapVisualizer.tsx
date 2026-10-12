import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Job, Worker } from '../types';
import { Truck, MapPin, CheckCircle, Navigation, Clock, Building2, User, Phone, ArrowRight, Layers, Compass } from 'lucide-react';
import { getDisplayJobStatus, matchJobStatus } from '../utils/statusUtils';
import { LiveVehicleTrackerMap } from './LiveVehicleTrackerMap';

export const RouteMapVisualizer: React.FC = () => {
  const { jobs, workers, selectedDate, dateScope, updateJobStatus, setEditingJob, settings, setInteractingJob } = useApp();
  const [mapMode, setMapMode] = useState<'google_maps' | 'schematic'>('google_maps');
  const availableStatuses = settings.dropdownConfig?.jobStatuses || ['Scheduled', 'In Transit', 'On Site', 'Completed', 'Cancelled'];
  const transitStatus = availableStatuses.find(s => s.toLowerCase().includes('transit') || s.toLowerCase().includes('route')) || 'In Transit';
  const siteStatus = availableStatuses.find(s => s.toLowerCase().includes('site')) || 'On Site';
  const doneStatus = availableStatuses.find(s => s.toLowerCase().includes('complete') || s.toLowerCase().includes('done')) || 'Completed';
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  
  const dayJobs = jobs.filter((j) => j.scheduledDate === selectedDate);
  const activeMapJobs = dateScope === 'all' ? jobs : dayJobs;
  const selectedJob = activeMapJobs.find((j) => j.id === selectedJobId) || activeMapJobs[0] || null;

  
  const depotPos = { x: 380, y: 210, name: 'worksynch Central Depot' };

  const getCoordinates = (job: Job, index: number) => {
    const positions = [
      { x: 190, y: 100 },
      { x: 620, y: 110 },
      { x: 140, y: 310 },
      { x: 420, y: 340 },
      { x: 660, y: 280 },
      { x: 300, y: 120 },
    ];
    return positions[index % positions.length];
  };

  const getStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'on_site':
        return { fill: '#107c41', border: '#0b5c30', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'en_route':
        return { fill: '#d97706', border: '#b45309', badge: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'completed':
        return { fill: '#7c3aed', border: '#6d28d9', badge: 'bg-purple-100 text-purple-800 border-purple-300' };
      default:
        return { fill: '#2563eb', border: '#1d4ed8', badge: 'bg-blue-100 text-blue-800 border-blue-300' };
    }
  };

  return (
    <div className="space-y-3">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-300 rounded-lg p-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase">
              <Navigation className="w-4 h-4 text-blue-600" />
              Live Fleet Transit & Job Site Operations
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-bold">
              {activeMapJobs.length} {dateScope === 'all' ? 'Active Sites (All Dates)' : 'Sites Today'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Real-time GPS vehicle tracking, route directions, live traffic layers, and AI dispatch intelligence.
          </p>
        </div>

        
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-300 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setMapMode('google_maps')}
            className={`px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              mapMode === 'google_maps'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>🛰️ Live Google Map</span>
          </button>
          <button
            type="button"
            onClick={() => setMapMode('schematic')}
            className={`px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              mapMode === 'schematic'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>📐 Schematic Grid</span>
          </button>
        </div>
      </div>

      
      {mapMode === 'google_maps' ? (
        <LiveVehicleTrackerMap onSelectJob={(j) => setInteractingJob ? setInteractingJob(j) : setEditingJob(j)} />
      ) : (
        
        <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase">
                  <Navigation className="w-3.5 h-3.5 text-[#107c41]" />
                  Field Transit Schematic & Job Site Grid
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Schematic vectors delivering field engineers from Central Depot to site appointments.
              </p>
            </div>

            
            <div className="flex items-center gap-3 text-[11px] text-slate-700 bg-slate-50 px-2.5 py-1 rounded border border-slate-300 shrink-0 font-medium">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#107c41] inline-block" />
                On Site
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
                In Transit
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                Scheduled
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
                Done
              </span>
            </div>
          </div>

          
          <div className="relative w-full h-72 sm:h-80 bg-slate-50 rounded-lg border border-slate-300 overflow-hidden select-none">
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage: `radial-gradient(circle, #cbd5e1 1px, transparent 1px)`,
                backgroundSize: '20px 20px',
              }}
            />

            <svg className="w-full h-full" viewBox="0 0 800 420" preserveAspectRatio="xMidYMid meet">
              <text x="60" y="35" fill="#94a3b8" fontSize="10" fontWeight="bold" letterSpacing="1">
                NORTH ZONE
              </text>
              <text x="680" y="35" fill="#94a3b8" fontSize="10" fontWeight="bold" letterSpacing="1">
                EAST SECTOR
              </text>
              <text x="60" y="395" fill="#94a3b8" fontSize="10" fontWeight="bold" letterSpacing="1">
                WEST CORRIDOR
              </text>
              <text x="680" y="395" fill="#94a3b8" fontSize="10" fontWeight="bold" letterSpacing="1">
                SOUTH HARBOR
              </text>

              
              <g transform={`translate(${depotPos.x}, ${depotPos.y})`}>
                <circle cx="0" cy="0" r="28" fill="#f8fafc" stroke="#107c41" strokeWidth="2.5" />
                <rect x="-10" y="-10" width="20" height="20" rx="3" fill="#107c41" />
                <text x="0" y="3" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                  HUB
                </text>
                <text x="0" y="42" fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="middle">
                  {depotPos.name}
                </text>
                <text x="0" y="54" fill="#64748b" fontSize="9" textAnchor="middle">
                  Fleet Dispatch Origin
                </text>
              </g>

              
              {activeMapJobs.map((job, index) => {
                const pos = getCoordinates(job, index);
                const isSelected = selectedJob?.id === job.id;
                const colors = getStatusColor(job.status);

                return (
                  <g
                    key={job.id}
                    className="cursor-pointer transition-all duration-200"
                    onClick={() => setSelectedJobId(job.id)}
                  >
                    <line
                      x1={depotPos.x}
                      y1={depotPos.y}
                      x2={pos.x}
                      y2={pos.y}
                      stroke={colors.fill}
                      strokeWidth={isSelected ? '3' : '1.5'}
                      strokeDasharray={job.status === 'en_route' ? '5,5' : 'none'}
                      strokeOpacity={isSelected ? '1' : '0.6'}
                    />

                    {job.status === 'en_route' && (
                      <circle
                        cx={(depotPos.x + pos.x) / 2}
                        cy={(depotPos.y + pos.y) / 2}
                        r="5"
                        fill="#d97706"
                        className="animate-pulse"
                      />
                    )}

                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={isSelected ? '22' : '17'}
                      fill="#ffffff"
                      stroke={colors.fill}
                      strokeWidth={isSelected ? '3' : '2'}
                      filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.15))"
                    />

                    <circle cx={pos.x} cy={pos.y} r={isSelected ? '16' : '12'} fill={colors.fill} />

                    <text
                      x={pos.x}
                      y={pos.y + 3.5}
                      fill="#ffffff"
                      fontSize={isSelected ? '9' : '7.5'}
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {job.code.replace('JOB-', '')}
                    </text>

                    <text
                      x={pos.x}
                      y={pos.y - 26}
                      fill="#0f172a"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {job.siteLocation.name.length > 20
                        ? job.siteLocation.name.substring(0, 18) + '...'
                        : job.siteLocation.name}
                    </text>

                    <text
                      x={pos.x}
                      y={pos.y - 15}
                      fill="#64748b"
                      fontSize="8.5"
                      textAnchor="middle"
                    >
                      {job.siteLocation.zone}
                    </text>
                  </g>
                );
              })}
            </svg>

            
            {selectedJob && (
              <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-xs border border-slate-300 rounded-lg p-3 shadow-md max-w-sm text-xs space-y-2 select-text">
                <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2">
                  <div>
                    <span className="font-mono font-bold text-slate-800">{selectedJob.code}</span>
                    <h4 className="font-bold text-slate-900 leading-tight">{selectedJob.title}</h4>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded border uppercase font-semibold ${
                      getStatusColor(selectedJob.status).badge
                    }`}
                  >
                    {getDisplayJobStatus(selectedJob.status, availableStatuses)}
                  </span>
                </div>

                <div className="space-y-1 text-slate-600 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="font-medium text-slate-900">{selectedJob.siteLocation.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{selectedJob.siteLocation.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>
                      {selectedJob.timeWindow.start} - {selectedJob.timeWindow.end}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Specialist: {workers.find((w) => w.id === selectedJob.engineerId)?.name || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Driver: {workers.find((w) => w.id === selectedJob.driverId)?.name || 'Unassigned / Public Transit'}</span>
                  </div>
                </div>

                
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Update Transit:</span>
                  <div className="flex items-center gap-1">
                    {matchJobStatus(selectedJob.status, 'scheduled') && (
                      <button
                        onClick={() => updateJobStatus(selectedJob.id, transitStatus as any)}
                        className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold cursor-pointer"
                      >
                        Start Transit
                      </button>
                    )}
                    {matchJobStatus(selectedJob.status, 'en_route') && (
                      <button
                        onClick={() => updateJobStatus(selectedJob.id, siteStatus as any)}
                        className="px-2 py-1 bg-[#107c41] hover:bg-[#0b5c30] text-white rounded text-[10px] font-bold cursor-pointer"
                      >
                        Mark On Site
                      </button>
                    )}
                    {matchJobStatus(selectedJob.status, 'on_site') && (
                      <button
                        onClick={() => updateJobStatus(selectedJob.id, doneStatus as any)}
                        className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-bold cursor-pointer"
                      >
                        Mark Done
                      </button>
                    )}
                    <button
                      onClick={() => setEditingJob(selectedJob)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold border border-slate-300 cursor-pointer"
                    >
                      Edit Job
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
