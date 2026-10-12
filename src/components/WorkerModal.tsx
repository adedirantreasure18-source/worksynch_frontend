import React, { useState, useEffect } from 'react';
import { backendFileUrl } from '../config/api';
import { useApp } from '../context/AppContext';
import { Worker, WorkerRole, WorkerStatus } from '../types';
import { uploadAvatarImage } from '../utils/imageUtils';
import { getEffectiveLeaveInfo } from '../utils/leaveUtils';
import {
  X,
  User,
  Phone,
  Mail,
  Shield,
  ShieldCheck,
  Award,
  Truck,
  MapPin,
  Plus,
  Trash2,
  Save,
  Flame,
  Wrench,
  Sparkles,
  History,
  KeyRound,
  Eye,
  EyeOff,
  Shuffle,
  Repeat,
} from 'lucide-react';

interface WorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerToEdit?: Worker | null;
}

const ROLE_RECOMMENDED_SPECIALIZATIONS: Record<WorkerRole, string[]> = {
  engineer: [
    'Optical Telecom & Fiber Networks',
    'Substation Electrical & Power Grid',
    'SCADA & Industrial Automation',
    '5G RF & Microwave Infrastructure',
    'Commercial HVAC & Building Controls',
    'Industrial Robotics & Controls',
  ],
  welder: [
    'Structural Steel Fabrication',
    'High-Pressure Pipe Systems',
    'Orbital Sanitary & Cryogenic Piping',
    'Pressure Vessel Systems',
    'Heavy Equipment Hardfacing',
  ],
  plumber: [
    'Commercial Hydronics & Heating',
    'Municipal Gas & Water Utilities',
    'Healthcare Medical Gas Facilities',
    'Industrial Waste & Drainage',
    'Water Treatment & Backflow Systems',
  ],
  driver: [
    'Fleet Transport & Route Logistics',
    'Heavy Haul Rigging & Transport',
    'Hazardous Materials (Hazmat)',
    'Express Route Dispatch',
    'All-Terrain Rough Sector Access',
  ],
};

const ROLE_RECOMMENDED_SKILLS: Record<WorkerRole, string[]> = {
  engineer: [
    'SCADA RTU Commissioning',
    'Backbone Fiber Splicing',
    'High Voltage Relay Protection',
    'Arc Flash Level 4',
    'PLC Diagnostics',
    'Thermal Imaging Inspection',
  ],
  welder: [
    'ASME / AWS D1.1 Certified',
    'TIG / MIG Stainless Steel',
    'Orbital TIG Welding',
    'Confined Space Certified',
    'Pressure Vessel Repair',
    'Pipe Rigging',
  ],
  plumber: [
    'Backflow Prevention (ASSE 5110)',
    'Medical Gas Piping (NFPA 99)',
    'Commercial Pipefitting',
    'Hydro Jetting & Drainage',
    'Hydronic Boiler Heating',
    'Gas Line Certification',
  ],
  driver: [
    'Class A CDL',
    'Class B CDL',
    'Hazmat Endorsement',
    'All-Terrain 4x4 Transit',
    'Heavy Gear Rigging',
    'Defensive Driving II',
  ],
};

export const WorkerModal: React.FC<WorkerModalProps> = ({ isOpen, onClose, workerToEdit }) => {
  const { workers, addWorker, updateWorker, deleteWorker, settings } = useApp();

  const configuredRoles = settings.dropdownConfig?.roles || [
    'Field Systems Engineer',
    'Lead Substation Specialist',
    'Certified Structural & Pipe Welder',
    'Master Commercial Plumber',
    'Transport Driver (Class A CDL)',
    'Fleet Logistics Driver',
    'Emergency Dispatcher',
  ];

  const configuredSpecializations = settings.dropdownConfig?.specializations || [
    'Optical Telecom & Fiber Networks',
    'Substation Electrical & Power Grid',
    'SCADA & Industrial Automation',
    '5G RF & Microwave Infrastructure',
    'Commercial HVAC & Building Controls',
    'Structural Steel Fabrication',
    'High-Pressure Pipe Systems',
    'Orbital Sanitary & Cryogenic Piping',
    'Commercial Hydronics & Heating',
    'Municipal Gas & Water Utilities',
    'Healthcare Medical Gas Facilities',
    'Fleet Transport & Route Logistics',
    'Heavy Haul Rigging & Transport',
  ];

  const configuredSkills = settings.dropdownConfig?.skills || [
    'ASME / AWS D1.1 Certified',
    'TIG / MIG Stainless Steel',
    'Orbital TIG Welding',
    'Commercial Pipefitting',
    'Backflow Prevention (ASSE 5110)',
    'Medical Gas Piping',
    'Hydro Jetting & Drainage',
    'SCADA RTU Commissioning',
    'Backbone Fiber Splicing',
    'High Voltage Relay Protection',
    'Class A CDL',
  ];

  const configuredVehicles = settings.dropdownConfig?.vehicleTypes || [
    'Ford Transit 350 AWD High Roof',
    'Ford Transit 350 Plumbing & Hydro Jetting Van',
    'Chevy Silverado 3500HD Mobile Rig (Welding & Rigging)',
    'Mercedes-Benz Sprinter 2500 Cargo',
  ];

  const drivers = workers.filter((w) => w.role === 'driver');

  const [workerCode, setWorkerCode] = useState('');
  const [name, setName] = useState('');
  type FunctionType = 'electrical_engineer' | 'control_engineer' | 'welder' | 'plumber' | 'driver';
  const [role, setRole] = useState<WorkerRole>('engineer');
  const [functionType, setFunctionType] = useState<FunctionType>('electrical_engineer');
  const [roleTitle, setRoleTitle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [accountActive, setAccountActive] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<WorkerStatus>('available');

  
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [newSpecializationInput, setNewSpecializationInput] = useState('');

  const [skills, setSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');

  const [avatarUrl, setAvatarUrl] = useState('');
  const [locationName, setLocationName] = useState('');
  const [notes, setNotes] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveReturnDate, setLeaveReturnDate] = useState('');
  const [leaveRecurringYearly, setLeaveRecurringYearly] = useState(false);

  
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleCapacity, setVehicleCapacity] = useState(3);

  
  const [assignedDriverId, setAssignedDriverId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (workerToEdit) {
      setWorkerCode(workerToEdit.id);
      setName(workerToEdit.name);
      setRole(workerToEdit.role);
      let ft: FunctionType = 'electrical_engineer';
      if (workerToEdit.role === 'welder') ft = 'welder';
      else if (workerToEdit.role === 'plumber') ft = 'plumber';
      else if (workerToEdit.role === 'driver') ft = 'driver';
      else if (workerToEdit.role === 'engineer') {
         if (workerToEdit.functionCategory === 'control_engineer' || workerToEdit.functionCategory === 'electrical_engineer') {
            ft = workerToEdit.functionCategory as FunctionType;
         } else {
            const t = (workerToEdit.roleTitle || '').toLowerCase();
            if (t.includes('control') || t.includes('automation') || t.includes('robotics') || t.includes('scada') || t.includes('telemetry')) {
              ft = 'control_engineer';
            } else if (workerToEdit.id === 'w-eng-4' || workerToEdit.id === 'w-eng-5' || workerToEdit.id === 'w-eng-6') {
              ft = 'control_engineer';
            }
         }
      }
      setFunctionType(ft);
      setEmail(workerToEdit.email);
      setPhone(workerToEdit.phone);
      setStatus(workerToEdit.status);
      setSpecializations(workerToEdit.specializations || []);
      setSkills(workerToEdit.skills || []);
      setAvatarUrl(workerToEdit.avatarUrl || '');
      setLocationName(workerToEdit.locationName || '');
      setNotes(workerToEdit.notes || '');
      setLeaveStartDate(workerToEdit.leaveStartDate || '');
      setLeaveReturnDate(workerToEdit.leaveReturnDate || '');
      setLeaveRecurringYearly(Boolean(workerToEdit.leaveRecurringYearly));
      if (workerToEdit.role === 'driver' && workerToEdit.vehicleInfo) {
        setVehicleModel(workerToEdit.vehicleInfo.model);
        setVehiclePlate(workerToEdit.vehicleInfo.plate);
        setVehicleCapacity(workerToEdit.vehicleInfo.capacity);
      }
      if (workerToEdit.role !== 'driver') {
        setAssignedDriverId(workerToEdit.assignedDriverId || '');
      }
      setRoleTitle(workerToEdit.roleTitle || '');
      setUsername(workerToEdit.username || workerToEdit.id || '');
      
      setPassword('');
      setAccountActive(workerToEdit.accountActive !== false);
      setShowPassword(false);
    } else {
      setWorkerCode(`W-${Math.floor(1000 + Math.random() * 9000)}`);
      setName('');
      setRole('engineer');
      setFunctionType('electrical_engineer');
      setRoleTitle('');
      setEmail('');
      setPassword('');
      setUsername('');
      setAccountActive(true);
      setShowPassword(false);
      setPhone('');
      setStatus('available');
      setSpecializations([]);
      setSkills([]);
      setAvatarUrl('');
      setLocationName('');
      setNotes('');
      setLeaveStartDate('');
      setLeaveReturnDate('');
      setLeaveRecurringYearly(false);
      setVehicleModel('');
      setVehiclePlate('');
      setVehicleCapacity(3);
      setAssignedDriverId('');
    }
    setNewSpecializationInput('');
    setNewSkillInput('');
  }, [workerToEdit, isOpen, drivers.length]);

  if (!isOpen) return null;

  const handleFunctionTypeChange = (ft: FunctionType) => {
    setFunctionType(ft);
    const newRole: WorkerRole = (ft === 'electrical_engineer' || ft === 'control_engineer') ? 'engineer' : ft;
    setRole(newRole);

    if (!workerToEdit) {
      if (ft === 'control_engineer') {
        setRoleTitle('Control Engineer');
        setSpecializations(['SCADA & PLC Automation']);
        setSkills(['PLC Programming', 'BMS Integration', 'Robotics']);
      } else if (ft === 'electrical_engineer') {
        setRoleTitle('Field Systems Engineer');
        setSpecializations(['Optical Telecom & Fiber Networks']);
        setSkills(['Fiber Splicing', 'OTDR Testing']);
      } else if (ft === 'welder') {
        setRoleTitle('Certified Structural & Pipe Welder');
        setSpecializations(['Pressure Vessel Welding']);
        setSkills(['TIG / MIG Stainless Steel']);
      } else if (ft === 'plumber') {
        setRoleTitle('Master Commercial Plumber');
        setSpecializations(['Medical Gas Systems']);
        setSkills(['Medical Gas Piping']);
      } else if (ft === 'driver') {
        setRoleTitle('Fleet Transport Driver (Class A CDL)');
        setSpecializations(['Heavy Equipment Transport']);
        setSkills(['Class A CDL']);
      }
    } else {
      if (newRole === 'driver' && !vehicleModel) {
        setVehicleModel(configuredVehicles[0] || 'Ford Transit 350 AWD High Roof');
        setVehiclePlate('FL-901-CA');
        setVehicleCapacity(4);
      }
      if (newRole !== 'driver' && (!assignedDriverId && drivers.length > 0)) {
        setAssignedDriverId(drivers[0].id);
      }
    }
  };

  
  const handleAddSpecialization = (specToAdd?: string) => {
    const text = (specToAdd || newSpecializationInput).trim();
    if (text && !specializations.includes(text)) {
      setSpecializations([...specializations, text]);
      if (!specToAdd) setNewSpecializationInput('');
    }
  };

  const handleRemoveSpecialization = (specToRemove: string) => {
    setSpecializations(specializations.filter((s) => s !== specToRemove));
  };

  
  const handleAddSkill = (skillToAdd?: string) => {
    const text = (skillToAdd || newSkillInput).trim();
    if (text && !skills.includes(text)) {
      setSkills([...skills, text]);
      if (!skillToAdd) setNewSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  
  const activeRoleSpecializations = Array.from(
    new Set([
      ...(ROLE_RECOMMENDED_SPECIALIZATIONS[role] || []),
      ...configuredSpecializations,
    ])
  );

  const activeRoleSkills = Array.from(
    new Set([
      ...(ROLE_RECOMMENDED_SKILLS[role] || []),
      ...configuredSkills,
    ])
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const payload: Partial<Worker> = {
        id: workerCode.trim() || undefined,
        name: name.trim(),
        role,
        roleTitle: roleTitle.trim() || undefined,
        functionCategory: functionType,
        email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '.')}@fieldops.io`,
        phone: phone.trim() || '+1 (555) 000-0000',
        status,
        specializations,
        skills,
        avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        locationName: locationName.trim() || 'Central Depot',
        notes: notes.trim(),
        username: username.trim() || undefined,
        password: password.trim() || undefined,
        accountActive,
        leaveStartDate: leaveStartDate || undefined,
        leaveReturnDate: leaveReturnDate || undefined,
        leaveRecurringYearly: leaveRecurringYearly || undefined,
      };

      if (role === 'driver') {
        payload.vehicleInfo = {
          model: vehicleModel.trim() || 'Utility Service Van',
          plate: vehiclePlate.trim() || 'FL-000-XX',
          capacity: Number(vehicleCapacity) || 3,
        };
        payload.assignedDriverId = undefined;
      } else {
        payload.assignedDriverId = assignedDriverId || undefined;
        payload.vehicleInfo = undefined;
      }

      if (workerToEdit) {
        await updateWorker(workerToEdit.id, payload);
      } else {
        await addWorker(payload);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save worker profile:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="worker-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="worker-modal-card"
        className="bg-white border border-slate-300 rounded-xl w-full max-w-2xl text-slate-800 shadow-2xl overflow-hidden my-6"
        onClick={(e) => e.stopPropagation()}
      >
        
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-[#107c41]">
              {role === 'welder' ? (
                <Flame className="w-4 h-4 text-orange-600" />
              ) : role === 'plumber' ? (
                <Wrench className="w-4 h-4 text-cyan-600" />
              ) : role === 'driver' ? (
                <Truck className="w-4 h-4 text-amber-600" />
              ) : (
                <User className="w-4 h-4 text-[#107c41]" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {workerToEdit ? `Edit Personnel: ${workerToEdit.name}` : 'Add Field Personnel to Fleet'}
              </h3>
              <p className="text-xs text-slate-500">
                {workerToEdit
                  ? 'Update profile attributes, role title, skills, and vehicle. Changes save directly to Field Personnel & Fleet Roster.'
                  : 'Configure profile, function type, separate specializations & technical skills.'}
              </p>
            </div>
          </div>
          <button
            id="btn-close-worker-modal"
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[78vh] overflow-y-auto text-xs">
          
          {workerToEdit && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 flex items-center justify-between text-xs text-emerald-950 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>
                  Editing profile for <strong>{workerToEdit.name}</strong> (Employee Code: <code>{workerToEdit.id}</code>).
                </span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                Live Roster Sync
              </span>
            </div>
          )}

          
          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-2xs">
            <img 
              src={backendFileUrl(avatarUrl) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'} 
              alt="Avatar" 
              className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm shrink-0" 
            />
            <div className="flex-1 space-y-1.5 min-w-0">
              <label className="block font-semibold text-slate-700">Profile Avatar</label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input 
                  type="url" 
                  value={avatarUrl} 
                  onChange={(e) => setAvatarUrl(e.target.value)} 
                  placeholder="Paste image URL here..." 
                  className="flex-1 min-w-0 bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]" 
                />
                <span className="hidden sm:inline text-[10px] text-slate-400 font-bold uppercase">OR</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const url = await uploadAvatarImage(file, workerToEdit?.id);
                        setAvatarUrl(url);
                      } catch (err) {
                        console.error('Failed to process avatar image:', err);
                      }
                    }
                  }} 
                  className="shrink-0 text-[10px] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer" 
                />
              </div>
            </div>
          </div>

          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Employee Code</label>
              <input
                type="text"
                placeholder="e.g. w-eng-100"
                value={workerCode}
                onChange={(e) => setWorkerCode(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41] font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Elena Rostova"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Function Type</label>
              <select
                value={functionType}
                onChange={(e) => handleFunctionTypeChange(e.target.value as FunctionType)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41] font-medium cursor-pointer"
              >
                <option value="electrical_engineer">Field Engineer (Electrical/Systems)</option>
                <option value="control_engineer">Control Engineer (PLC/Automation)</option>
                <option value="welder">Certified Welder (Structural & Pipe)</option>
                <option value="plumber">Licensed Plumber (Commercial / Utility)</option>
                <option value="driver">Fleet Driver (Transport Operator)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Role Title</label>
              <select
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
              >
                {configuredRoles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Phone Number
              </label>
              <input
                type="text"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@fieldops.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
              />
            </div>
          </div>

          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Live Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as WorkerStatus)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
              >
                <option value="available">Available (Standby / Ready)</option>
                <option value="en_route">In Transit</option>
                <option value="on_site">On Site (Executing Job)</option>
                <option value="completed">Completed Shift / Off-site</option>
                <option value="off_duty">Off Duty</option>
                <option value="on_leave">On Leave (PTO/Vacation)</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  Leave Commence Date
                </label>
                <input
                  type="date"
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  Resume Date
                </label>
                <input
                  type="date"
                  value={leaveReturnDate}
                  onChange={(e) => setLeaveReturnDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
                />
              </div>
            </div>

            
            <div className="flex items-center justify-between bg-purple-50/70 border border-purple-200/90 rounded-md px-2.5 py-1.5 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={leaveRecurringYearly}
                  onChange={(e) => setLeaveRecurringYearly(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 border-purple-300"
                />
                <span className="font-semibold text-purple-900 flex items-center gap-1">
                  <Repeat className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  Repetitive Yearly Leave (Annual Recurring Schedule)
                </span>
              </label>
              {leaveRecurringYearly && (
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200">
                  Repeats Yearly
                </span>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Current Base Location
              </label>
              <input
                type="text"
                placeholder="e.g. Central Depot - Standby Bay"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
              />
            </div>
          </div>

          
          {role === 'driver' && (
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
              <h4 className="text-xs font-bold uppercase text-amber-700 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" />
                Transport Vehicle Specification
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Vehicle Model</label>
                  <select
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
                  >
                    {configuredVehicles.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">License Plate</label>
                  <input
                    type="text"
                    placeholder="FL-889-TX"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41] font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          
          {role !== 'driver' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-[#107c41]" />
                Default Assigned Transport Driver & Fleet Van
              </label>
              <select
                value={assignedDriverId}
                onChange={(e) => setAssignedDriverId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
              >
                <option value="">-- No Default Driver (Not Assigned) --</option>
                {drivers.map((d) => {
                  const leaveInfo = getEffectiveLeaveInfo(d);
                  const leaveText = leaveInfo.isOnLeave
                    ? ' [On Leave]'
                    : leaveInfo.daysUntilLeave !== null && leaveInfo.daysUntilLeave !== undefined && leaveInfo.daysUntilLeave <= 7
                    ? ` [Leaves in ${leaveInfo.daysUntilLeave}d]`
                    : '';
                  return (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.vehicleInfo?.model || 'Van'} - {d.vehicleInfo?.plate || 'Plate'}){leaveText}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          
          
          
          <div className="p-3.5 bg-indigo-50/40 rounded-lg border border-indigo-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <label className="block font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Award className="w-3.5 h-3.5 text-indigo-600" />
                  Specializations (Domain Disciplines & Trade Focus)
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 border border-indigo-300 font-bold ml-1">
                    {specializations.length} active
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Primary operational domains, engineering fields, or trade focus areas.
                </p>
              </div>
            </div>

            
            <div className="flex gap-2">
              <input
                id="input-worker-specialization"
                type="text"
                placeholder="e.g. Optical Telecom, High-Pressure Piping, Substation Power..."
                value={newSpecializationInput}
                onChange={(e) => setNewSpecializationInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSpecialization();
                  }
                }}
                className="flex-1 bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
              />
              <button
                type="button"
                id="btn-add-specialization"
                onClick={() => handleAddSpecialization()}
                className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Add Specialization
              </button>
            </div>

            
            <div>
              <select
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && !specializations.includes(val)) {
                    handleAddSpecialization(val);
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
              >
                <option value="">-- Add Specialization from List --</option>
                {activeRoleSpecializations.filter(s => !specializations.includes(s)).map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">
                Suggested Trade Specializations ({role.toUpperCase()}):
              </span>
              <div className="flex flex-wrap gap-1">
                {activeRoleSpecializations.map((spec) => {
                  const isSelected = specializations.includes(spec);
                  return (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => (isSelected ? handleRemoveSpecialization(spec) : handleAddSpecialization(spec))}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-700 font-semibold shadow-2xs'
                          : 'bg-white text-indigo-900 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300'
                      }`}
                    >
                      {isSelected ? '✓' : '+'} {spec}
                    </button>
                  );
                })}
              </div>
            </div>

            
            <div className="flex flex-wrap gap-1.5 pt-1 min-h-[28px]">
              {specializations.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic">No specializations assigned yet. Click suggestions above or type custom.</span>
              ) : (
                specializations.map((spec, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-indigo-100/90 border border-indigo-300 text-indigo-900 font-semibold"
                  >
                    <Award className="w-3 h-3 text-indigo-700 shrink-0" />
                    <span>{spec}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSpecialization(spec)}
                      className="text-indigo-500 hover:text-rose-600 ml-1 font-bold text-xs"
                      title="Remove specialization"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          
          
          
          <div className="p-3.5 bg-emerald-50/40 rounded-lg border border-emerald-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <label className="block font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#107c41]" />
                  Skills & Certifications (Credentials & Qualifications)
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold ml-1">
                    {skills.length} active
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Licenses, equipment authorizations, technical proficiencies, or industry testing certs.
                </p>
              </div>
            </div>

            
            <div className="flex gap-2">
              <input
                id="input-worker-skill"
                type="text"
                placeholder="e.g. ASME IX, ASSE 5110 Backflow, Class A CDL, OTDR Testing, OSHA 30..."
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                className="flex-1 bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
              />
              <button
                type="button"
                id="btn-add-skill"
                onClick={() => handleAddSkill()}
                className="px-3 py-1.5 rounded bg-[#107c41] hover:bg-[#0b5c30] text-white text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Add Skill
              </button>
            </div>

            
            <div>
              <select
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && !skills.includes(val)) {
                    handleAddSkill(val);
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
              >
                <option value="">-- Add Skill / Qualification from List --</option>
                {activeRoleSkills.filter(s => !skills.includes(s)).map(sk => (
                  <option key={sk} value={sk}>{sk}</option>
                ))}
              </select>
            </div>

            
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">
                Suggested Technical Qualifications ({role.toUpperCase()}):
              </span>
              <div className="flex flex-wrap gap-1">
                {activeRoleSkills.map((sk) => {
                  const isSelected = skills.includes(sk);
                  return (
                    <button
                      key={sk}
                      type="button"
                      onClick={() => (isSelected ? handleRemoveSkill(sk) : handleAddSkill(sk))}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-[#107c41] text-white border-[#0b5c30] font-semibold shadow-2xs'
                          : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300'
                      }`}
                    >
                      {isSelected ? '✓' : '+'} {sk}
                    </button>
                  );
                })}
              </div>
            </div>

            
            <div className="flex flex-wrap gap-1.5 pt-1 min-h-[28px]">
              {skills.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic">No skills assigned yet. Click suggestions above or type custom.</span>
              ) : (
                skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-emerald-100/90 border border-emerald-300 text-emerald-900 font-semibold"
                  >
                    <Shield className="w-3 h-3 text-emerald-700 shrink-0" />
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-emerald-500 hover:text-rose-600 ml-1 font-bold text-xs"
                      title="Remove skill"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Personnel Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Special credentials, certifications, shift notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
            />
          </div>

          
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <KeyRound className="w-4 h-4 text-[#107c41]" />
                <span>Worker Login Account & Password</span>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={accountActive}
                  onChange={(e) => setAccountActive(e.target.checked)}
                  className="rounded text-[#107c41] focus:ring-[#107c41] border-slate-300"
                />
                <span className={`font-semibold text-[11px] ${accountActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {accountActive ? 'Account Enabled' : 'Account Disabled'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between text-xs">
                  <span>Login Username / ID</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (name.trim()) {
                        const clean = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '.');
                        setUsername(clean);
                      } else {
                        setUsername(workerCode.toLowerCase());
                      }
                    }}
                    className="text-[10px] text-[#107c41] hover:underline font-normal cursor-pointer"
                  >
                    Suggest
                  </button>
                </label>
                <input
                  type="text"
                  placeholder="e.g. alex.turner or W-102"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41] font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Worker can sign in with this, email, or worker ID</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between text-xs">
                  <span>Login Password</span>
                  <button
                    type="button"
                    onClick={() => {
                      const words = ['Field', 'Tech', 'Power', 'Service', 'Pro', 'Site'];
                      const num = Math.floor(1000 + Math.random() * 9000);
                      const chars = ['#', '!', '$', '*'];
                      const sym = chars[Math.floor(Math.random() * chars.length)];
                      const word = words[Math.floor(Math.random() * words.length)];
                      setPassword(`${word}${sym}${num}`);
                      setShowPassword(true);
                    }}
                    className="text-[10px] text-[#107c41] hover:underline font-normal flex items-center gap-0.5 cursor-pointer"
                  >
                    <Shuffle className="w-3 h-3" />
                    Generate
                  </button>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={workerToEdit ? 'Leave blank to keep current password' : 'Assign a password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 pr-8 text-xs text-slate-900 focus:outline-none focus:border-[#107c41] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Required for field staff login</p>
              </div>
            </div>
          </div>

          
          {workerToEdit && workerToEdit.history && workerToEdit.history.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                  <History className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Saved Audit History ({workerToEdit.history.length})</span>
                </div>
                <span className="text-[10px] text-slate-500">Persistent revision log</span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {workerToEdit.history.slice(0, 3).map((h, hIdx) => (
                  <div key={hIdx} className="rounded bg-white p-2 border border-slate-200 text-[11px]">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="font-semibold text-slate-700">{h.changedBy || 'Dispatch Manager'}</span>
                      <span>{new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="mt-1 text-slate-800 font-medium">{h.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
            {workerToEdit ? (
              <button
                type="button"
                onClick={async () => {
                  await deleteWorker(workerToEdit.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                title="Delete this personnel profile"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Personnel</span>
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-save-worker"
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-bold bg-[#107c41] hover:bg-[#0b5c30] disabled:bg-[#107c41]/70 text-white shadow-xs transition-colors cursor-pointer"
              >
                <Save className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                <span>
                  {isSubmitting
                    ? 'Saving Profile...'
                    : workerToEdit
                    ? 'Save & Update Profile'
                    : 'Insert Personnel Row'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
