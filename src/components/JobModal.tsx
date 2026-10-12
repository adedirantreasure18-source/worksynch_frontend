import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Job, JobPriority, JobStatus } from '../types';
import { X, Calendar, Clock, MapPin, User, Truck, AlertCircle, Save, FileSpreadsheet, ChevronDown, Check, Wrench } from 'lucide-react';
import { getEffectiveLeaveInfo } from '../utils/leaveUtils';

interface JobModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobToEdit?: Job | null;
}

export const JobModal: React.FC<JobModalProps> = ({ isOpen, onClose, jobToEdit }) => {
  const { workers, selectedDate, addJob, updateJob, settings } = useApp();

  const availableZones = settings.dropdownConfig?.zones || [
    'North Industrial Sector',
    'West Rural Sector',
    'Central Healthcare Zone',
    'Downtown Core',
    'Harbor Commercial Zone',
    'East Industrial Sector',
  ];

  const availablePriorities = settings.dropdownConfig?.priorities || ['Urgent', 'High', 'Normal', 'Low'];
  const availableStatuses = settings.dropdownConfig?.jobStatuses || ['Scheduled', 'In Transit', 'On Site', 'In Progress', 'Completed', 'Cancelled'];
  
  const defaultPresetJobTitles = [
    'Substation SCADA RTU Gateway Commissioning',
    'Emergency Diagnostics & Fault Isolation',
    'Preventative Maintenance & Inspection',
    'Solar Inverter SCADA Telemetry Calibration',
    'Backbone Fiber Sever Repair & Splicing',
    'Emergency Generator ATS Switchgear Testing',
    '5G Small Cell Radio Node Alignment',
    'Chiller Plant VFD Controller Replacement',
    'Substation Transformer Dissolved Gas Sampling',
    'High-Pressure Steam Manifold Welding & Pressure Test',
    'Hospital Medical Gas & Hydronic Backflow Overhaul',
    'Precision Cryogenic Pipeline Weld Certification',
    'Commercial Water Pressure Balancing & Valve Inspection',
    'Commissioning of 500 kVA Genset',
    'System Installation & Power Up',
    'Equipment Calibration & Sensor Tuning',
    'Site Inspection & Safety Isolation',
  ];

  const availableJobTitles = Array.from(
    new Set([...(settings.dropdownConfig?.jobTitles || []), ...defaultPresetJobTitles])
  );
  const availableClients = settings.dropdownConfig?.clients || [];
  const availableJobDescriptions = settings.dropdownConfig?.jobDescriptions || [];

  const [isTitleDropdownOpen, setIsTitleDropdownOpen] = useState(false);
  const titleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (titleDropdownRef.current && !titleDropdownRef.current.contains(e.target as Node)) {
        setIsTitleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const specialists = workers.filter((w) => w.role !== 'driver');
  const drivers = workers.filter((w) => w.role === 'driver');

  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [clientName, setClientName] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [siteZone, setSiteZone] = useState('Central District');
  const [scheduledDate, setScheduledDate] = useState(selectedDate);
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('12:00 PM');
  const [engineerId, setEngineerId] = useState('');
  const [specialistIds, setSpecialistIds] = useState<string[]>([]);
  const [driverId, setDriverId] = useState('');
  const [driverIds, setDriverIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<JobPriority>((availablePriorities.find(p => p.toLowerCase() === 'normal') as JobPriority) || (availablePriorities[0] as JobPriority));
  const [status, setStatus] = useState<JobStatus>(availableStatuses[0]);
  const [duration, setDuration] = useState(2.5);
  const [notes, setNotes] = useState('');
  const [routeNotes, setRouteNotes] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [assignedTools, setAssignedTools] = useState<{ toolId: string; toolName: string; quantity: number; signedBy?: string; date?: string; isReturned?: boolean }[]>([]);

  useEffect(() => {
    if (jobToEdit) {
      setTitle(jobToEdit.title);
      setCode(jobToEdit.code);
      setClientName(jobToEdit.clientName);
      setSiteName(jobToEdit.siteLocation.name);
      setSiteAddress(jobToEdit.siteLocation.address);
      setSiteZone(jobToEdit.siteLocation.zone);
      setScheduledDate(jobToEdit.scheduledDate);
      setStartTime(jobToEdit.timeWindow.start);
      setEndTime(jobToEdit.timeWindow.end);
      setEngineerId(jobToEdit.engineerId);
      setSpecialistIds(jobToEdit.specialistIds || (jobToEdit.engineerId ? [jobToEdit.engineerId] : []));
      setDriverId(jobToEdit.driverId || '');
      setDriverIds(jobToEdit.driverIds || (jobToEdit.driverId ? [jobToEdit.driverId] : []));
      setPriority(jobToEdit.priority);
      setStatus(jobToEdit.status);
      setDuration(jobToEdit.estimatedDurationHours);
      setNotes(jobToEdit.notes);
      setRouteNotes(jobToEdit.routeNotes || '');
      setCustomFields(jobToEdit.customFields || {});
      setAssignedTools(jobToEdit.assignedTools || []);
    } else {
      setTitle('');
      setCode(`JOB-${Math.floor(2000 + Math.random() * 8000)}`);
      setClientName('');
      setSiteName('');
      setSiteAddress('');
      setSiteZone('Central District');
      setScheduledDate(selectedDate);
      setStartTime('09:00 AM');
      setEndTime('12:00 PM');
      setEngineerId('');
      setSpecialistIds([]);
      setDriverId('');
      setDriverIds([]);
      setPriority((availablePriorities.find(p => p.toLowerCase() === 'normal') as JobPriority) || (availablePriorities[0] as JobPriority));
      setStatus(availableStatuses[0]);
      setDuration(2.5);
      setNotes('');
      setRouteNotes('');
      setCustomFields({});
      setAssignedTools([]);
    }
  }, [jobToEdit, isOpen, selectedDate, specialists.length, drivers.length]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !siteName.trim()) return;

    const payload: Partial<Job> = {
      code,
      title: title.trim(),
      clientName: clientName.trim() || 'Commercial Client',
      siteLocation: {
        name: siteName.trim(),
        address: siteAddress.trim() || 'Site Address TBD',
        zone: siteZone,
        lat: 37.7749,
        lng: -122.4194,
      },
      scheduledDate,
      timeWindow: {
        start: startTime,
        end: endTime,
      },
      engineerId: specialistIds[0] || (jobToEdit ? '' : (specialists[0]?.id || '')),
      specialistIds: specialistIds.length > 0 ? specialistIds : (jobToEdit ? [] : (specialists[0]?.id ? [specialists[0].id] : [])),
      driverId: driverIds[0] || '',
      driverIds: driverIds,
      priority,
      status,
      estimatedDurationHours: Number(duration) || 2,
      notes: notes.trim(),
      routeNotes: routeNotes.trim(),
      customFields,
      assignedTools,
    };

    if (jobToEdit) {
      await updateJob(jobToEdit.id, payload);
    } else {
      await addJob(payload);
    }
    onClose();
  };

  return (
    <div
      id="job-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="job-modal-card"
        className="bg-white border border-slate-300 rounded-xl w-full max-w-2xl text-slate-800 shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#107c41]" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {jobToEdit ? `Edit Job (${jobToEdit.code})` : 'Schedule New Job Appointment'}
              </h3>
              <p className="text-xs text-slate-500">
                Configure appointment details, assign field engineer and driver transport.
              </p>
            </div>
          </div>
          <button
            id="btn-close-job-modal"
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Job Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41] font-mono"
              />
            </div>
            <div className="sm:col-span-2" ref={titleDropdownRef}>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">Job Title / Task</label>
                <div className="flex items-center gap-1.5">
                  <select
                    id="select-job-title-preset"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        setTitle(e.target.value);
                      }
                    }}
                    className="text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded px-2 py-0.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#107c41] transition-colors"
                    title="Choose from pre-listed job titles"
                  >
                    <option value="">▼ Select Pre-listed Title...</option>
                    {availableJobTitles.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="relative">
                <div className="flex items-center bg-white border border-slate-300 rounded focus-within:border-[#107c41] focus-within:ring-1 focus-within:ring-[#107c41] shadow-2xs">
                  <input
                    id="input-job-title"
                    type="text"
                    list="job-titles-datalist"
                    placeholder="e.g. Substation SCADA RTU Gateway Commissioning"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full bg-transparent px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                  />
                  <button
                    id="btn-toggle-title-dropdown"
                    type="button"
                    onClick={() => setIsTitleDropdownOpen((prev) => !prev)}
                    className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-l border-slate-200 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                    title="Browse all pre-listed job titles"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isTitleDropdownOpen ? 'rotate-180 text-[#107c41]' : ''}`} />
                  </button>
                </div>

                <datalist id="job-titles-datalist">
                  {availableJobTitles.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>

                
                {isTitleDropdownOpen && (
                  <div
                    id="job-titles-dropdown-menu"
                    className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-300 rounded-lg shadow-xl max-h-56 overflow-y-auto py-1 text-xs"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <span>Pre-listed Titles ({availableJobTitles.length})</span>
                      <span className="text-[10px] text-emerald-700 font-medium">Click to use & edit</span>
                    </div>
                    {availableJobTitles.map((t) => {
                      const isSelected = title.trim().toLowerCase() === t.trim().toLowerCase();
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setTitle(t);
                            setIsTitleDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-emerald-50 text-[#107c41] font-semibold'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate mr-2">{t}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#107c41] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase text-[#107c41] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Time Window & Schedule
              </h4>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date</label>
                <input
                  id="input-scheduled-date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41] font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Commute / Start Time</label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="09:00 AM"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target End Time</label>
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="12:00 PM"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
                  />
                </div>
              </div>
            </div>

            
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase text-[#107c41] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                Client Name & Job Site Location
              </h4>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client Name / Org</label>
                <input
                  type="text"
                  list="clients-datalist"
                  placeholder="e.g. Pacific Electric Co."
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
                />
                <datalist id="clients-datalist">
                  {availableClients.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Site Location Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Substation 14"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sector / Zone</label>
                  <select
                    value={siteZone}
                    onChange={(e) => setSiteZone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
                  >
                    {availableZones.map((z) => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  placeholder="e.g. 1040 Gateway Blvd, Gate 3"
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
                />
              </div>
            </div>
          </div>

          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                Assigned Specialists
              </label>
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap gap-1">
                  {specialistIds.map(id => {
                    const spec = specialists.find(s => s.id === id);
                    if (!spec) return null;
                    return (
                      <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-semibold">
                        {spec.name}
                        <button type="button" onClick={() => setSpecialistIds(prev => prev.filter(p => p !== id))} className="hover:text-indigo-900">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  {specialistIds.length === 0 && <span className="text-[11px] text-slate-500 italic px-1 py-1">No specialists assigned</span>}
                </div>
                <select
                  value=""
                  onChange={(e) => {
                    const newId = e.target.value;
                    if (newId && !specialistIds.includes(newId)) {
                      setSpecialistIds(prev => [...prev, newId]);
                      
                      const selectedEngineer = specialists.find(s => s.id === newId);
                      if (selectedEngineer?.assignedDriverId && !driverIds.includes(selectedEngineer.assignedDriverId)) {
                        setDriverIds(prev => [...prev, selectedEngineer.assignedDriverId!]);
                      }
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
                >
                  <option value="">-- Add Specialist --</option>
                  {specialists.filter(s => !specialistIds.includes(s.id)).map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.name} - {spec.roleTitle || (spec.role === 'welder' ? 'Welder' : spec.role === 'plumber' ? 'Plumber' : 'Engineer')} ({spec.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-amber-600" />
                Assigned Vehicles & Drivers
              </label>
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap gap-1">
                  {driverIds.map(id => {
                    const drv = drivers.find(d => d.id === id);
                    if (!drv) return null;
                    return (
                      <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                        {drv.name} ({drv.vehicleInfo?.plate || 'Van'})
                        <button type="button" onClick={() => setDriverIds(prev => prev.filter(p => p !== id))} className="hover:text-amber-900">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  {driverIds.length === 0 && <span className="text-[11px] text-slate-500 italic px-1 py-1">No vehicles assigned</span>}
                </div>
                <select
                  value=""
                  onChange={(e) => {
                    const newId = e.target.value;
                    if (newId && !driverIds.includes(newId)) {
                      setDriverIds(prev => [...prev, newId]);
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
                >
                  <option value="">-- Add Vehicle / Driver --</option>
                  {drivers.filter(d => !driverIds.includes(d.id)).map((drv) => {
                    const leaveInfo = getEffectiveLeaveInfo(drv, scheduledDate);
                    const leaveText = leaveInfo.isOnLeave
                      ? ' [On Leave]'
                      : leaveInfo.daysUntilLeave !== null && leaveInfo.daysUntilLeave !== undefined && leaveInfo.daysUntilLeave <= 7
                      ? ` [Leaves in ${leaveInfo.daysUntilLeave}d]`
                      : '';
                    return (
                      <option key={drv.id} value={drv.id}>
                        {drv.name} ({drv.vehicleInfo?.plate || drv.vehicleInfo?.model || 'Fleet Unit'}){leaveText}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
            <label className="block font-bold text-slate-700 flex items-center gap-1.5 text-xs">
              <Wrench className="w-4 h-4 text-[#107c41]" />
              Assigned Tools & Equipment
            </label>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                {assignedTools.map((at, idx) => {
                  const matchingTool = settings.tools?.find(
                    t => t.id === at.toolId || (t.name && at.toolName && t.name.trim().toLowerCase() === at.toolName.trim().toLowerCase())
                  );
                  const totalStock = Number(matchingTool?.quantity || at.quantity || 1);
                  const currentRemaining = Number(matchingTool?.remaining ?? (totalStock - (matchingTool ? Number(matchingTool.assigned || 0) : 0)));

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 border p-2.5 rounded text-xs shadow-2xs w-full transition-colors ${
                        at.isReturned ? 'bg-emerald-50/70 border-emerald-300' : 'bg-white border-slate-300'
                      }`}
                    >
                      <div className="min-w-[130px]">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <Wrench className={`w-3.5 h-3.5 ${at.isReturned ? 'text-emerald-700' : 'text-slate-600'}`} />
                          <span>{at.toolName}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Total stock: <span className="font-mono font-medium text-slate-700">{totalStock}</span> | Avail: <span className="font-mono font-medium text-slate-700">{currentRemaining}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">Qty:</span>
                          <input
                            type="number"
                            min="1"
                            value={at.quantity}
                            onChange={(e) => {
                              const val = Math.max(1, Number(e.target.value) || 1);
                              setAssignedTools(prev => prev.map((item, i) => i === idx ? { ...item, quantity: val } : item));
                            }}
                            className="w-16 bg-white border border-slate-300 rounded px-1.5 py-1 text-xs font-mono text-slate-900"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">Date:</span>
                          <input
                            type="date"
                            value={at.date || scheduledDate}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAssignedTools(prev => prev.map((item, i) => i === idx ? { ...item, date: val } : item));
                            }}
                            className="bg-white border border-slate-300 rounded px-1.5 py-1 text-xs font-mono text-slate-900"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="Receiver / Signed By"
                            value={at.signedBy || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAssignedTools(prev => prev.map((item, i) => i === idx ? { ...item, signedBy: val } : item));
                            }}
                            className="w-36 bg-white border border-slate-300 rounded px-1.5 py-1 text-xs text-slate-900 placeholder:text-slate-400"
                          />
                        </div>
                        <label
                          className={`flex items-center gap-1.5 cursor-pointer text-xs font-semibold px-2.5 py-1 rounded border transition-colors select-none ${
                            at.isReturned
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs'
                              : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(at.isReturned)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setAssignedTools(prev => prev.map((item, i) => i === idx ? { ...item, isReturned: checked } : item));
                            }}
                            className="rounded text-emerald-700 focus:ring-emerald-700"
                          />
                          <span>{at.isReturned ? 'Returned to Stock' : 'Mark as Returned'}</span>
                        </label>
                      </div>

                      <div className="ml-auto flex items-center gap-2">
                        {at.isReturned ? (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                            ✓ Returned (+{at.quantity} back in stock)
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                            Active Checkout
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setAssignedTools(prev => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          title="Remove tool"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {assignedTools.length === 0 && <span className="text-xs text-slate-500 italic">No tools assigned to this job appointment.</span>}
              </div>

              {settings.tools && settings.tools.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <select
                    id="select-add-tool"
                    value=""
                    onChange={(e) => {
                      const tId = e.target.value;
                      if (!tId) return;
                      const toolItem = settings.tools?.find(t => t.id === tId);
                      if (toolItem) {
                        setAssignedTools(prev => [
                          ...prev,
                          {
                            toolId: toolItem.id,
                            toolName: toolItem.name,
                            quantity: 1,
                            date: scheduledDate,
                            signedBy: toolItem.signedBy || '',
                            isReturned: false,
                          }
                        ]);
                      }
                    }}
                    className="flex-1 bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
                  >
                    <option value="">-- Select Tool from Inventory to Assign --</option>
                    {settings.tools.map(tool => (
                      <option key={tool.id} value={tool.id}>
                        {tool.name} (Qty: {tool.quantity}) {tool.signedBy ? `[Signed by: ${tool.signedBy}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as JobPriority)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
              >
                {availablePriorities.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as JobStatus)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
              >
                {availableStatuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Est. Duration (hrs)</label>
              <input
                type="number"
                step="0.25"
                min="0.5"
                max="12"
                value={duration}
                onChange={(e) => setDuration(parseFloat(e.target.value) || 2)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
              />
            </div>
          </div>

          
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Job Description / Work Scope</label>
            <div className="flex flex-col gap-2">
              <select
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#107c41] cursor-pointer"
                value={availableJobDescriptions.includes(notes) ? notes : ""}
                onChange={(e) => {
                  setNotes(e.target.value);
                }}
              >
                <option value="">-- Select a preset description... --</option>
                {availableJobDescriptions.map((desc) => (
                  <option key={desc} value={desc}>
                    {desc}
                  </option>
                ))}
              </select>
              <textarea
                rows={2}
                placeholder="Type custom job description here..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Driver Transit & Gate Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Loading dock bay 3 access. Security badge check."
              value={routeNotes}
              onChange={(e) => setRouteNotes(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
            />
          </div>

          
          {settings.jobListColumns?.filter(c => c.custom).length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              {settings.jobListColumns.filter(c => c.custom).map((col) => (
                <div key={col.id}>
                  <label className="block font-semibold text-slate-700 mb-1">{col.label}</label>
                  <input
                    type="text"
                    value={customFields[col.id] || ''}
                    onChange={(e) => setCustomFields({ ...customFields, [col.id]: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
                  />
                </div>
              ))}
            </div>
          ) : null}

          
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-save-job"
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-bold bg-[#107c41] hover:bg-[#0b5c30] text-white shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {jobToEdit ? 'Save Changes' : 'Insert Job Row'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
