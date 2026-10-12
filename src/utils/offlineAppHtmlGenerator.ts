import type { AppStateData } from '../types.ts';

export function generateFullOfflineAppHTML(state: AppStateData, inlinedCss?: string): string {
  const jsonState = JSON.stringify(state).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>worksynch Dispatch & Route Sync - Windows Standalone</title>
  <meta name="theme-color" content="#107c41">

  <!-- 1. INLINED COMPILED PRODUCTION STYLES (Guarantees 100% offline rendering without CDN) -->
  <style>
    ${inlinedCss || ''}
  </style>

  <!-- 2. CORE OFFLINE STYLING BACKUP & UTILITY CLASSES -->
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; color: #0f172a; }
    
    /* Active Navigation Tabs */
    .nav-tab-active { background-color: #107c41 !important; color: #ffffff !important; border-color: #107c41 !important; }
    .side-tab-active { background-color: #107c41 !important; color: #ffffff !important; font-weight: 700 !important; }
    
    /* Timeline Grid Styling */
    .timeline-hour-col { min-width: 88px; border-right: 1px solid #e2e8f0; }
    .job-block { transition: transform 0.15s ease, box-shadow 0.15s ease; cursor: pointer; }
    .job-block:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 20; }
    
    /* Calendar Mini Grid */
    .cal-day { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 11px; border-radius: 6px; cursor: pointer; transition: background-color 0.1s; position: relative; }
    .cal-day:hover { background-color: #e2e8f0; }
    .cal-day-today { background-color: #107c41 !important; color: #ffffff !important; font-weight: 700 !important; }
    .cal-day-selected { border: 2px solid #107c41; font-weight: 700; }
    .cal-day-has-jobs::after { content: ''; position: absolute; bottom: 2px; width: 4px; height: 4px; border-radius: 50%; background-color: #107c41; }
    .cal-day-today.cal-day-has-jobs::after { background-color: #ffffff; }

    /* Custom Scrollbars */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #f1f5f9; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  </style>

  <!-- 3. CDN FALLBACK FOR BROWSERS CONNECTED TO THE INTERNET -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    if (window.tailwind) {
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              fieldops: {
                50: '#f0fdf4',
                100: '#dcfce7',
                500: '#22c55e',
                600: '#16a34a',
                700: '#107c41',
                800: '#0b5c30',
                900: '#073c1f',
              }
            }
          }
        }
      };
    }
  </script>
</head>
<body class="bg-[#f8fafc] text-slate-800 min-h-screen flex flex-col antialiased select-none">

  <!-- ================= TOP APPLICATION HEADER ================= -->
  <header class="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
    <!-- Brand & Top Actions Row -->
    <div class="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
      
      <!-- Brand, Title & Storage Pulse -->
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-[#107c41] flex items-center justify-center font-bold text-white shadow-sm text-sm shrink-0">
          WS
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="font-bold text-sm text-white tracking-tight">worksynch Dispatch & Route Sync</h1>
            <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
              WINDOWS STANDALONE
            </span>
          </div>
          <div class="text-[11px] text-slate-400 flex items-center gap-2">
            <span id="companyDisplay">worksynch Dispatch Center</span>
            <span>•</span>
            <span class="text-emerald-400 font-semibold flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              Local Disk Storage Engine Active
            </span>
          </div>
        </div>
      </div>

      <!-- Date Navigator (Prev, Today, Next) -->
      <div class="flex items-center gap-1 bg-slate-800/90 p-1 rounded-lg border border-slate-700 text-xs">
        <button onclick="changeDate(-1)" class="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer" title="Previous Day">
          &#9664;
        </button>
        <button onclick="goToToday()" class="px-2.5 py-1 rounded bg-slate-700/80 hover:bg-slate-700 text-white font-semibold cursor-pointer">
          Today
        </button>
        <button onclick="changeDate(1)" class="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer" title="Next Day">
          &#9654;
        </button>
        <span id="currentDateLabel" class="font-mono px-2 text-emerald-300 font-bold"></span>
      </div>

      <!-- Quick Actions, Clock & Modals Trigger -->
      <div class="flex items-center gap-2 text-xs">
        <div class="hidden sm:block text-slate-400 font-mono text-[11px] bg-slate-800 px-2.5 py-1.5 rounded border border-slate-700" id="liveClock">
          --:--:--
        </div>
        <button onclick="openMobileSyncModal()" class="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1 cursor-pointer" title="Technician Mobile Route Sync">
          <span>&#128241;</span>
          <span class="hidden md:inline">Mobile Sync</span>
        </button>
        <button onclick="openAddJobModal()" class="px-3 py-1.5 rounded bg-[#107c41] hover:bg-[#0b5c30] text-white font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer">
          <span>+</span>
          <span>New Appointment</span>
        </button>
        <button onclick="openAddWorkerModal()" class="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-semibold border border-slate-700 transition-colors cursor-pointer">
          <span>+</span>
          <span>Add Worker</span>
        </button>
      </div>

    </div>

    <!-- Secondary View Tab Bar & Filter Controls -->
    <div class="bg-slate-800 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-700/80 text-xs">
      
      <!-- View Switcher Tabs -->
      <div class="flex items-center gap-1 overflow-x-auto py-0.5">
        <button onclick="switchTab('timeline')" id="tab-timeline" class="px-3 py-1.5 rounded-md font-semibold text-slate-300 hover:text-white hover:bg-slate-700/70 cursor-pointer nav-tab-active">
          Schedule Timeline
        </button>
        <button onclick="switchTab('map')" id="tab-map" class="px-3 py-1.5 rounded-md font-semibold text-slate-300 hover:text-white hover:bg-slate-700/70 cursor-pointer">
          Map Route View
        </button>
        <button onclick="switchTab('workers')" id="tab-workers" class="px-3 py-1.5 rounded-md font-semibold text-slate-300 hover:text-white hover:bg-slate-700/70 cursor-pointer">
          Worker Board (<span id="workersCountBadge">0</span>)
        </button>
        <button onclick="switchTab('jobs')" id="tab-jobs" class="px-3 py-1.5 rounded-md font-semibold text-slate-300 hover:text-white hover:bg-slate-700/70 cursor-pointer">
          Dispatches & Jobs (<span id="jobsCountBadge">0</span>)
        </button>
        <button onclick="switchTab('fleet')" id="tab-fleet" class="px-3 py-1.5 rounded-md font-semibold text-slate-300 hover:text-white hover:bg-slate-700/70 cursor-pointer">
          Fleet Vehicles (<span id="fleetCountBadge">0</span>)
        </button>
        <button onclick="switchTab('tools')" id="tab-tools" class="px-3 py-1.5 rounded-md font-semibold text-slate-300 hover:text-white hover:bg-slate-700/70 cursor-pointer">
          Tool Inventory (<span id="toolsCountBadge">0</span>)
        </button>
        <button onclick="switchTab('history')" id="tab-history" class="px-3 py-1.5 rounded-md font-semibold text-slate-300 hover:text-white hover:bg-slate-700/70 cursor-pointer">
          Audit History
        </button>
        <button onclick="switchTab('storage')" id="tab-storage" class="px-3 py-1.5 rounded-md font-semibold text-slate-300 hover:text-white hover:bg-slate-700/70 cursor-pointer">
          Data & Local Storage
        </button>
      </div>

      <!-- Real-Time Search, Role Filter & Zone Filter -->
      <div class="flex items-center gap-2">
        <input 
          type="text" 
          id="globalSearch" 
          placeholder="Search jobs, engineers, client..." 
          oninput="handleSearch(this.value)"
          class="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-44 sm:w-56"
        />
        <select id="roleFilter" onchange="handleRoleFilter(this.value)" class="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer">
          <option value="ALL">All Roles</option>
          <option value="electrical">Electrical Eng</option>
          <option value="control">Control Eng</option>
          <option value="welder">Welders</option>
          <option value="plumber">Plumbers</option>
          <option value="driver">Drivers</option>
        </select>
        <select id="zoneFilter" onchange="handleZoneFilter(this.value)" class="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer">
          <option value="ALL">All Zones</option>
          <option value="North Zone">North Zone</option>
          <option value="South Zone">South Zone</option>
          <option value="Central Metro">Central Metro</option>
          <option value="East Zone">East Zone</option>
          <option value="West Zone">West Zone</option>
        </select>
      </div>

    </div>
  </header>

  <!-- ================= TOP METRICS SUMMARY BANNER ================= -->
  <div class="bg-white border-b border-slate-200 px-4 py-2.5">
    <div class="max-w-[1680px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
      <div class="flex items-center gap-6 flex-wrap">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span class="text-slate-500 font-medium">Technicians on Duty:</span>
          <span class="font-bold text-slate-900 font-mono" id="statWorkersCount">0</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          <span class="text-slate-500 font-medium">Scheduled Appointments:</span>
          <span class="font-bold text-slate-900 font-mono" id="statJobsCount">0</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span class="text-slate-500 font-medium">Fleet in Transit:</span>
          <span class="font-bold text-slate-900 font-mono" id="statVehiclesCount">0</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
          <span class="text-slate-500 font-medium">Tools Checked Out:</span>
          <span class="font-bold text-slate-900 font-mono" id="statToolsCount">0</span>
        </div>
      </div>
      <div class="flex items-center gap-2 text-slate-500 text-[11px]">
        <span>Day Completion:</span>
        <div class="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div id="dayProgressBar" class="h-full bg-[#107c41] rounded-full transition-all duration-300" style="width: 45%;"></div>
        </div>
        <span id="dayProgressLabel" class="font-mono font-bold text-slate-700">45%</span>
      </div>
    </div>
  </div>

  <!-- ================= MAIN WORKSPACE (2-COLUMN MATCHING REACT APP) ================= -->
  <div class="flex-1 max-w-[1680px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-4 flex flex-col lg:flex-row gap-4 items-start">
    
    <!-- LEFT MAIN VIEW CONTAINER -->
    <main class="flex-1 w-full min-w-0 space-y-4">

      <!-- VIEW 1: TIMELINE SCHEDULE (GANTT) -->
      <section id="view-timeline" class="space-y-3">
        <div class="bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden">
          
          <!-- Timeline Control Sub-header -->
          <div class="p-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div class="font-bold text-xs text-slate-800 flex items-center gap-2">
              <span>Daily Appointment & Route Timeline</span>
              <span class="text-slate-500 font-normal">| Click any appointment block to view site work order</span>
            </div>
            <div class="flex items-center gap-3 text-[11px] flex-wrap">
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-blue-500"></span> Scheduled</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-amber-500"></span> En Route</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-indigo-500"></span> On Site</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-emerald-600"></span> In Progress</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-slate-400"></span> Completed</span>
            </div>
          </div>

          <!-- Horizontal Timeline Scroll Container -->
          <div class="overflow-x-auto">
            <div class="min-w-[1100px]">
              <!-- Hours Header Row (07:00 - 19:00) -->
              <div class="flex border-b border-slate-200 bg-slate-50 text-[11px] font-mono text-slate-600 font-semibold select-none">
                <div class="w-52 p-2 border-r border-slate-200 shrink-0 flex items-center justify-between">
                  <span>Technician / Engineer</span>
                  <span class="text-[10px] text-slate-400">Status</span>
                </div>
                <div class="flex-1 grid grid-cols-12 text-center divide-x divide-slate-200">
                  <div class="p-2">07:00</div>
                  <div class="p-2">08:00</div>
                  <div class="p-2">09:00</div>
                  <div class="p-2">10:00</div>
                  <div class="p-2">11:00</div>
                  <div class="p-2">12:00</div>
                  <div class="p-2">13:00</div>
                  <div class="p-2">14:00</div>
                  <div class="p-2">15:00</div>
                  <div class="p-2">16:00</div>
                  <div class="p-2">17:00</div>
                  <div class="p-2">18:00</div>
                </div>
              </div>

              <!-- Worker Timeline Rows Container -->
              <div id="timelineRowsContainer" class="divide-y divide-slate-200 text-xs">
                <!-- Dynamically populated -->
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- VIEW 2: INTERACTIVE MAP ROUTE VIEW -->
      <section id="view-map" class="space-y-3 hidden">
        <div class="bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden">
          <div class="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
            <div class="font-bold text-xs text-slate-800 flex items-center gap-2">
              <span>Site Coordination & Driver Route Visualizer</span>
              <span class="text-slate-500 font-normal">| Live dispatch path coordinates</span>
            </div>
            <div class="flex items-center gap-2 text-xs">
              <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">GPS Active</span>
            </div>
          </div>

          <div class="p-4">
            <!-- Simulated Visual Route Canvas -->
            <div class="w-full h-80 bg-slate-900 rounded-lg relative overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner" id="mapCanvas">
              <!-- Grid background -->
              <div class="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
              
              <!-- Center Depot Hub -->
              <div class="absolute z-10 p-2.5 rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-lg flex items-center gap-2 border border-emerald-400">
                <span>&#127970;</span>
                <span>worksynch Central Depot</span>
              </div>

              <!-- Route Lines & Coordinates rendered dynamically -->
              <svg class="absolute inset-0 w-full h-full pointer-events-none" id="mapSvgLines"></svg>

              <!-- Dynamic Map Pins -->
              <div id="mapPinsContainer" class="absolute inset-0 pointer-events-auto"></div>
            </div>

            <!-- Route Stop Cards -->
            <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" id="mapSiteCardsContainer">
              <!-- Dynamically populated -->
            </div>
          </div>
        </div>
      </section>

      <!-- VIEW 3: WORKER MANAGEMENT BOARD -->
      <section id="view-workers" class="space-y-3 hidden">
        <div class="flex items-center justify-between">
          <h2 class="font-bold text-sm text-slate-800">Field Engineers & Drivers Roster</h2>
          <button onclick="openAddWorkerModal()" class="px-3 py-1.5 rounded bg-[#107c41] text-white font-bold text-xs shadow-xs hover:bg-[#0b5c30] cursor-pointer">
            + Add Field Worker
          </button>
        </div>

        <div id="workersGridContainer" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
          <!-- Dynamically populated -->
        </div>
      </section>

      <!-- VIEW 4: DISPATCHES & JOBS SPREADSHEET TABLE -->
      <section id="view-jobs" class="space-y-3 hidden">
        <div class="flex items-center justify-between">
          <h2 class="font-bold text-sm text-slate-800">Job Appointments & Work Orders</h2>
          <button onclick="openAddJobModal()" class="px-3 py-1.5 rounded bg-[#107c41] text-white font-bold text-xs shadow-xs hover:bg-[#0b5c30] cursor-pointer">
            + New Appointment
          </button>
        </div>

        <div class="bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead class="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                <tr>
                  <th class="p-3">Job Code</th>
                  <th class="p-3">Title & Client</th>
                  <th class="p-3">Site Location</th>
                  <th class="p-3">Engineer</th>
                  <th class="p-3">Driver / Vehicle</th>
                  <th class="p-3">Time Window</th>
                  <th class="p-3">Status</th>
                  <th class="p-3">Priority</th>
                  <th class="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody id="jobsTableBody" class="divide-y divide-slate-200">
                <!-- Dynamically populated -->
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- VIEW 5: FLEET VEHICLES -->
      <section id="view-fleet" class="space-y-3 hidden">
        <div class="flex items-center justify-between">
          <h2 class="font-bold text-sm text-slate-800">Company Fleet Vehicles & Drivers</h2>
          <span class="text-xs text-slate-500 font-medium">All vehicle data persisted locally</span>
        </div>

        <div id="fleetGridContainer" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <!-- Dynamically populated -->
        </div>
      </section>

      <!-- VIEW 6: TOOL INVENTORY -->
      <section id="view-tools" class="space-y-3 hidden">
        <div class="flex items-center justify-between">
          <h2 class="font-bold text-sm text-slate-800">Specialized Tools & Equipment Tracking</h2>
          <span class="text-xs text-slate-500 font-medium">Manage checked-out calibration tools and return to depot</span>
        </div>

        <div class="bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
              <tr>
                <th class="p-3">Tool Name</th>
                <th class="p-3">Serial / Model</th>
                <th class="p-3">Status</th>
                <th class="p-3">Assigned Technician</th>
                <th class="p-3">Associated Job</th>
                <th class="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody id="toolsTableBody" class="divide-y divide-slate-200">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>
      </section>

      <!-- VIEW 7: AUDIT HISTORY -->
      <section id="view-history" class="space-y-3 hidden">
        <div class="flex items-center justify-between">
          <h2 class="font-bold text-sm text-slate-800">Audit & Dispatch Activity Log</h2>
          <span class="text-xs text-slate-500 font-medium">Chronological record of route sync & reassignments</span>
        </div>

        <div class="bg-white border border-slate-300 rounded-lg p-4 shadow-xs">
          <div class="divide-y divide-slate-100 text-xs" id="historyLogContainer">
            <!-- Dynamically populated -->
          </div>
        </div>
      </section>

      <!-- VIEW 8: DATA STORAGE CONFIGURATION -->
      <section id="view-storage" class="space-y-4 hidden">
        <div class="bg-white border border-slate-300 rounded-lg p-5 shadow-xs space-y-4">
          <div class="border-b border-slate-200 pb-3">
            <h3 class="text-sm font-bold text-slate-900">Windows Local Disk Storage & Snapshots</h3>
            <p class="text-xs text-slate-500 mt-0.5">
              Every appointment, worker, and status change is persistently saved locally. Export JSON for offline backups anytime.
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div class="font-bold text-slate-700">Storage Location:</div>
              <div class="font-mono text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 break-all select-all">
                .\\data\\persisted_state.json
              </div>
              <div class="text-[10px] text-emerald-700 font-semibold">Local Disk Persistence Active</div>
            </div>

            <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div class="font-bold text-slate-700">Database Records:</div>
              <div class="text-sm font-bold text-slate-900 font-mono" id="storageSummaryText">
                -- Workers, -- Jobs
              </div>
              <div class="text-[10px] text-slate-500">Atomic Local Storage Synchronization</div>
            </div>

            <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div class="font-bold text-slate-700">Backup & Restore:</div>
              <div class="flex flex-wrap gap-2">
                <button onclick="exportDatabaseJSON()" class="px-3 py-1.5 rounded bg-[#107c41] hover:bg-[#0b5c30] text-white font-bold text-xs shadow-xs cursor-pointer">
                  Export JSON Database
                </button>
                <label class="px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer inline-block">
                  Import JSON
                  <input type="file" accept=".json" class="hidden" onchange="importDatabaseJSON(event)" />
                </label>
              </div>
            </div>
          </div>

          <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-500">Need to restore original demo seed database?</span>
            <button onclick="resetDataToSeed()" class="text-rose-700 hover:text-rose-800 font-semibold underline cursor-pointer">
              Reset to Seed Data
            </button>
          </div>
        </div>
      </section>

    </main>

    <!-- RIGHT SIDE COLUMN: CALENDAR (TODAY) AND SIDE PERSONNEL ROSTER (MATCHING APP.TSX) -->
    <aside class="w-full lg:w-[320px] shrink-0 flex flex-col gap-3">
      
      <!-- Side Tab Switcher: Calendar | Personnel | All -->
      <div class="bg-white border border-slate-300 rounded-lg p-1 flex items-center gap-1 shadow-2xs text-xs">
        <button onclick="setSideTab('calendar')" id="side-tab-cal" class="flex-1 py-1.5 px-2 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-colors side-tab-active cursor-pointer">
          <span>&#128197;</span>
          <span>Calendar</span>
        </button>
        <button onclick="setSideTab('personnel')" id="side-tab-pers" class="flex-1 py-1.5 px-2 rounded text-xs font-bold flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer">
          <span>&#128101;</span>
          <span>Personnel</span>
        </button>
        <button onclick="setSideTab('both')" id="side-tab-both" class="py-1.5 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer">
          <span class="text-[11px]">All</span>
        </button>
      </div>

      <!-- SIDE PANEL 1: INTERACTIVE MINI CALENDAR -->
      <div id="sideCalendarPanel" class="bg-white border border-slate-300 rounded-lg p-3 shadow-xs space-y-2.5">
        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
          <div class="font-bold text-xs text-slate-800 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-[#107c41]"></span>
            <span id="calMonthYearLabel">September 2026</span>
          </div>
          <div class="flex items-center gap-1">
            <button onclick="changeCalMonth(-1)" class="p-1 rounded hover:bg-slate-100 text-slate-600 text-xs font-bold cursor-pointer">&lt;</button>
            <button onclick="jumpCalToday()" class="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer">Today</button>
            <button onclick="changeCalMonth(1)" class="p-1 rounded hover:bg-slate-100 text-slate-600 text-xs font-bold cursor-pointer">&gt;</button>
          </div>
        </div>

        <!-- Weekday Headers -->
        <div class="grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400">
          <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
        </div>

        <!-- Days Grid -->
        <div id="calDaysGrid" class="grid grid-cols-7 gap-1 text-center">
          <!-- Dynamically populated -->
        </div>

        <div class="pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-[#107c41]"></span> Selected Day</span>
          <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-[#107c41]"></span> Has Appointments</span>
        </div>
      </div>

      <!-- SIDE PANEL 2: SIDE PERSONNEL ROSTER -->
      <div id="sidePersonnelPanel" class="bg-white border border-slate-300 rounded-lg p-3 shadow-xs space-y-2.5">
        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
          <div class="font-bold text-xs text-slate-800 flex items-center gap-1.5">
            <span>&#128101;</span>
            <span>Roster & Dispatches</span>
          </div>
          <div class="flex items-center gap-1 text-[10px]">
            <button onclick="setPersonnelSubTab('engineers')" id="sub-tab-eng" class="px-2 py-0.5 rounded bg-[#107c41] text-white font-bold cursor-pointer">Engineers</button>
            <button onclick="setPersonnelSubTab('drivers')" id="sub-tab-drv" class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 cursor-pointer">Drivers</button>
            <button onclick="setPersonnelSubTab('vehicles')" id="sub-tab-veh" class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 cursor-pointer">Vehicles</button>
          </div>
        </div>

        <!-- Search personnel inside panel -->
        <input 
          type="text" 
          placeholder="Filter roster..." 
          id="sidePersonnelSearch"
          oninput="renderSidePersonnel()"
          class="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-emerald-600"
        />

        <!-- Side Personnel Items Container -->
        <div id="sidePersonnelItems" class="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
          <!-- Dynamically populated -->
        </div>
      </div>

    </aside>

  </div>

  <!-- ================= MODAL: ADD / EDIT JOB ================= -->
  <div id="jobModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 hidden">
    <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
      <div class="p-4 bg-slate-900 text-white flex items-center justify-between">
        <h3 class="font-bold text-sm flex items-center gap-2" id="jobModalTitle">New Job Appointment</h3>
        <button onclick="closeJobModal()" class="text-slate-400 hover:text-white cursor-pointer font-bold text-lg">&times;</button>
      </div>

      <form id="jobForm" onsubmit="handleSaveJob(event)" class="p-4 space-y-3 text-xs">
        <input type="hidden" id="jobIdInput" value="" />

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Job Code</label>
            <input type="text" id="jobCodeInput" required class="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-emerald-600 focus:outline-none" />
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Priority</label>
            <select id="jobPriorityInput" class="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-emerald-600 focus:outline-none">
              <option value="Low">Low</option>
              <option value="Medium" selected>Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Job Title / Work Description</label>
          <input type="text" id="jobTitleInput" required class="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-emerald-600 focus:outline-none" />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Client / Customer Name</label>
            <input type="text" id="jobClientInput" required class="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-emerald-600 focus:outline-none" />
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Status</label>
            <select id="jobStatusInput" class="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-emerald-600 focus:outline-none">
              <option value="scheduled">Scheduled</option>
              <option value="en_route">En Route</option>
              <option value="on_site">On Site</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Site Location / Address</label>
          <input type="text" id="jobLocationInput" required class="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-emerald-600 focus:outline-none" />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Assigned Field Engineer</label>
            <select id="jobEngineerInput" required class="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-emerald-600 focus:outline-none">
              <!-- Populated dynamically -->
            </select>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Assigned Driver</label>
            <select id="jobDriverInput" class="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-emerald-600 focus:outline-none">
              <!-- Populated dynamically -->
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Start Time</label>
            <input type="time" id="jobStartTimeInput" value="09:00" required class="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-emerald-600 focus:outline-none" />
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">End Time</label>
            <input type="time" id="jobEndTimeInput" value="11:30" required class="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-emerald-600 focus:outline-none" />
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Dispatch Notes</label>
          <textarea id="jobNotesInput" rows="2" class="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-emerald-600 focus:outline-none"></textarea>
        </div>

        <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onclick="closeJobModal()" class="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer">
            Cancel
          </button>
          <button type="submit" class="px-4 py-1.5 rounded bg-[#107c41] hover:bg-[#0b5c30] text-white font-bold shadow-xs cursor-pointer">
            Save Appointment
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- ================= MODAL: ADD / EDIT WORKER ================= -->
  <div id="workerModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 hidden">
    <div class="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
      <div class="p-4 bg-slate-900 text-white flex items-center justify-between">
        <h3 class="font-bold text-sm" id="workerModalTitle">Add New Field Worker</h3>
        <button onclick="closeWorkerModal()" class="text-slate-400 hover:text-white cursor-pointer font-bold text-lg">&times;</button>
      </div>

      <form id="workerForm" onsubmit="handleSaveWorker(event)" class="p-4 space-y-3 text-xs">
        <input type="hidden" id="workerIdInput" value="" />

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Full Name</label>
          <input type="text" id="workerNameInput" required class="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-emerald-600 focus:outline-none" />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Trade / Role</label>
            <select id="workerRoleInput" class="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-emerald-600 focus:outline-none">
              <option value="electrical">Electrical Engineer</option>
              <option value="control">Control Engineer</option>
              <option value="welder">Certified Welder</option>
              <option value="plumber">Master Plumber</option>
              <option value="driver">Dispatch Driver</option>
            </select>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Zone</label>
            <select id="workerZoneInput" class="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-emerald-600 focus:outline-none">
              <option value="North Zone">North Zone</option>
              <option value="South Zone">South Zone</option>
              <option value="East Zone">East Zone</option>
              <option value="West Zone">West Zone</option>
              <option value="Central Metro">Central Metro</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Phone Number</label>
            <input type="tel" id="workerPhoneInput" placeholder="+1 (555) 012-3456" class="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-emerald-600 focus:outline-none" />
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Assigned Vehicle</label>
            <select id="workerVehicleInput" class="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-emerald-600 focus:outline-none">
              <!-- Populated dynamically -->
            </select>
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Skills (comma-separated)</label>
          <input type="text" id="workerSkillsInput" placeholder="PLC Systems, High Voltage, Calibrations" class="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-emerald-600 focus:outline-none" />
        </div>

        <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onclick="closeWorkerModal()" class="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer">
            Cancel
          </button>
          <button type="submit" class="px-4 py-1.5 rounded bg-[#107c41] hover:bg-[#0b5c30] text-white font-bold shadow-xs cursor-pointer">
            Save Worker
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- ================= MODAL: JOB DETAIL & FIELD NOTES ================= -->
  <div id="jobDetailModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 hidden">
    <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
      <div class="p-4 bg-slate-900 text-white flex items-center justify-between">
        <div>
          <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400" id="detailJobCode">JOB-1001</span>
          <h3 class="font-bold text-sm text-white" id="detailJobTitle">Substation Transformer Overhaul</h3>
        </div>
        <button onclick="closeJobDetailModal()" class="text-slate-400 hover:text-white cursor-pointer font-bold text-lg">&times;</button>
      </div>

      <div class="p-4 space-y-3 text-xs max-h-[80vh] overflow-y-auto">
        <div class="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div>
            <span class="text-slate-500 font-medium block">Customer / Client:</span>
            <span class="font-bold text-slate-900" id="detailJobClient">--</span>
          </div>
          <div>
            <span class="text-slate-500 font-medium block">Site Address:</span>
            <span class="font-bold text-slate-900" id="detailJobLocation">--</span>
          </div>
          <div>
            <span class="text-slate-500 font-medium block">Technician & Driver:</span>
            <span class="font-bold text-slate-900" id="detailJobCrew">--</span>
          </div>
          <div>
            <span class="text-slate-500 font-medium block">Scheduled Window:</span>
            <span class="font-bold text-slate-900 font-mono" id="detailJobTime">--</span>
          </div>
        </div>

        <!-- Quick Status Update -->
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Update Status:</label>
          <div class="flex items-center gap-1.5 flex-wrap" id="detailStatusButtons">
            <!-- Populated dynamically -->
          </div>
        </div>

        <!-- Field Notes Log -->
        <div class="space-y-1.5 pt-2 border-t border-slate-200">
          <label class="block font-semibold text-slate-700">Dispatch & Site Notes Log:</label>
          <div id="detailNotesContainer" class="space-y-1.5 max-h-36 overflow-y-auto bg-slate-50 p-2.5 rounded border border-slate-200">
            <!-- Populated dynamically -->
          </div>

          <div class="flex gap-2 pt-1">
            <input type="text" id="newNoteInput" placeholder="Add field observation or site note..." class="flex-1 border border-slate-300 rounded px-2.5 py-1.5 focus:border-emerald-600 focus:outline-none" />
            <button onclick="addJobNote()" class="px-3 py-1.5 rounded bg-[#107c41] text-white font-bold cursor-pointer">
              Add Note
            </button>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-200 flex justify-between items-center">
          <button onclick="handleEditFromDetail()" class="text-slate-600 hover:text-slate-900 font-bold underline cursor-pointer">
            Edit Full Details
          </button>
          <button onclick="closeJobDetailModal()" class="px-4 py-1.5 rounded bg-slate-800 text-white font-bold cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- ================= MODAL: MOBILE ROUTE SYNC (QR CODE) ================= -->
  <div id="mobileSyncModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 hidden">
    <div class="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 text-center p-5 space-y-4">
      <div class="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl mx-auto">
        &#128241;
      </div>
      <div>
        <h3 class="font-bold text-base text-slate-900">Mobile Route Sync</h3>
        <p class="text-xs text-slate-500 mt-1">
          Field technicians can scan this QR code or navigate to this device's local network URL to sync their daily dispatch schedule.
        </p>
      </div>

      <!-- Simulated SVG QR Code -->
      <div class="p-4 bg-slate-100 rounded-lg border border-slate-200 inline-block mx-auto">
        <svg class="w-36 h-36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" fill="#ffffff" rx="4"/>
          <!-- QR matrix pattern -->
          <rect x="10" y="10" width="24" height="24" fill="#0f172a" rx="2"/>
          <rect x="14" y="14" width="16" height="16" fill="#ffffff"/>
          <rect x="18" y="18" width="8" height="8" fill="#107c41"/>

          <rect x="66" y="10" width="24" height="24" fill="#0f172a" rx="2"/>
          <rect x="70" y="14" width="16" height="16" fill="#ffffff"/>
          <rect x="74" y="18" width="8" height="8" fill="#107c41"/>

          <rect x="10" y="66" width="24" height="24" fill="#0f172a" rx="2"/>
          <rect x="14" y="70" width="16" height="16" fill="#ffffff"/>
          <rect x="18" y="74" width="8" height="8" fill="#107c41"/>

          <!-- Middle data blocks -->
          <rect x="42" y="14" width="8" height="8" fill="#0f172a"/>
          <rect x="52" y="14" width="8" height="8" fill="#0f172a"/>
          <rect x="42" y="26" width="18" height="6" fill="#107c41"/>
          <rect x="42" y="38" width="16" height="16" fill="#0f172a"/>
          <rect x="14" y="42" width="12" height="6" fill="#0f172a"/>
          <rect x="70" y="42" width="18" height="8" fill="#0f172a"/>
          <rect x="42" y="66" width="12" height="12" fill="#0f172a"/>
          <rect x="66" y="66" width="8" height="18" fill="#107c41"/>
          <rect x="78" y="78" width="10" height="10" fill="#0f172a"/>
        </svg>
      </div>

      <div class="bg-slate-50 p-2.5 rounded border border-slate-200 text-xs font-mono text-slate-700 break-all select-all">
        http://localhost:3000
      </div>

      <button onclick="closeMobileSyncModal()" class="w-full py-2 rounded bg-slate-900 text-white font-bold text-xs cursor-pointer">
        Done
      </button>
    </div>
  </div>

  <!-- ================= CLIENT-SIDE STATE ENGINE & SCRIPT ================= -->
  <script>
    const INITIAL_DATA = ${jsonState};
    const STORAGE_KEY = 'fieldops_standalone_data';

    // Hydrate state from localStorage or initial bundle
    let state = INITIAL_DATA;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.workers) && Array.isArray(parsed.jobs)) {
          state = { ...INITIAL_DATA, ...parsed };
        }
      }
    } catch(e) {
      console.warn('LocalStorage hydrate warning:', e);
    }

    function saveState() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch(e) {}
      renderAll();
    }

    // App state navigation
    let activeTab = 'timeline';
    let sideTab = 'both';
    let personnelSubTab = 'engineers';
    let searchQuery = '';
    let roleFilter = 'ALL';
    let zoneFilter = 'ALL';
    let selectedDate = new Date();
    let currentInteractingJobId = null;

    function formatDayDate(d) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    function updateDateLabel() {
      const el = document.getElementById('currentDateLabel');
      if (el) el.textContent = formatDayDate(selectedDate);
    }

    function changeDate(delta) {
      selectedDate.setDate(selectedDate.getDate() + delta);
      updateDateLabel();
      renderAll();
    }

    function goToToday() {
      selectedDate = new Date();
      updateDateLabel();
      renderAll();
    }

    function switchTab(tabId) {
      activeTab = tabId;
      const tabs = ['timeline', 'map', 'workers', 'jobs', 'fleet', 'tools', 'history', 'storage'];
      tabs.forEach(t => {
        const btn = document.getElementById('tab-' + t);
        const sec = document.getElementById('view-' + t);
        if (btn) {
          if (t === tabId) {
            btn.classList.add('nav-tab-active');
          } else {
            btn.classList.remove('nav-tab-active');
          }
        }
        if (sec) {
          if (t === tabId) {
            sec.classList.remove('hidden');
          } else {
            sec.classList.add('hidden');
          }
        }
      });
      renderAll();
    }

    function setSideTab(tab) {
      sideTab = tab;
      const calPanel = document.getElementById('sideCalendarPanel');
      const persPanel = document.getElementById('sidePersonnelPanel');
      const btnCal = document.getElementById('side-tab-cal');
      const btnPers = document.getElementById('side-tab-pers');
      const btnBoth = document.getElementById('side-tab-both');

      [btnCal, btnPers, btnBoth].forEach(b => b && b.classList.remove('side-tab-active', 'bg-[#107c41]', 'text-white'));

      if (tab === 'calendar') {
        if (calPanel) calPanel.classList.remove('hidden');
        if (persPanel) persPanel.classList.add('hidden');
        if (btnCal) btnCal.classList.add('side-tab-active');
      } else if (tab === 'personnel') {
        if (calPanel) calPanel.classList.add('hidden');
        if (persPanel) persPanel.classList.remove('hidden');
        if (btnPers) btnPers.classList.add('side-tab-active');
      } else {
        if (calPanel) calPanel.classList.remove('hidden');
        if (persPanel) persPanel.classList.remove('hidden');
        if (btnBoth) btnBoth.classList.add('side-tab-active');
      }
    }

    function setPersonnelSubTab(sub) {
      personnelSubTab = sub;
      ['eng', 'drv', 'veh'].forEach(k => {
        const b = document.getElementById('sub-tab-' + k);
        if (b) {
          b.className = 'px-2 py-0.5 rounded font-bold cursor-pointer ' + 
            ((sub === 'engineers' && k === 'eng') || (sub === 'drivers' && k === 'drv') || (sub === 'vehicles' && k === 'veh')
              ? 'bg-[#107c41] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200');
        }
      });
      renderSidePersonnel();
    }

    function handleSearch(q) {
      searchQuery = q.toLowerCase();
      renderAll();
    }

    function handleRoleFilter(r) {
      roleFilter = r;
      renderAll();
    }

    function handleZoneFilter(z) {
      zoneFilter = z;
      renderAll();
    }

    function getStatusBadge(status) {
      switch(status) {
        case 'scheduled': return '<span class="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold text-[10px]">SCHEDULED</span>';
        case 'en_route': return '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[10px]">EN ROUTE</span>';
        case 'on_site': return '<span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold text-[10px]">ON SITE</span>';
        case 'in_progress': return '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">IN PROGRESS</span>';
        case 'completed': return '<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold text-[10px]">COMPLETED</span>';
        default: return '<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">' + (status || 'SCHEDULED') + '</span>';
      }
    }

    function getPriorityBadge(priority) {
      switch((priority || '').toLowerCase()) {
        case 'urgent': return '<span class="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">URGENT</span>';
        case 'high': return '<span class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">HIGH</span>';
        case 'medium': return '<span class="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">MED</span>';
        default: return '<span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">LOW</span>';
      }
    }

    function getJobColorClass(status) {
      switch(status) {
        case 'scheduled': return 'bg-blue-600 text-white border-blue-700';
        case 'en_route': return 'bg-amber-600 text-white border-amber-700';
        case 'on_site': return 'bg-indigo-600 text-white border-indigo-700';
        case 'in_progress': return 'bg-emerald-600 text-white border-emerald-700';
        case 'completed': return 'bg-slate-500 text-white border-slate-600';
        default: return 'bg-blue-600 text-white border-blue-700';
      }
    }

    function timeToMinutes(timeStr) {
      if (!timeStr) return 0;
      const parts = timeStr.split(':');
      return parseInt(parts[0], 10) * 60 + (parseInt(parts[1], 10) || 0);
    }

    // ================= RENDER TIMELINE GRID =================
    function renderTimeline() {
      const container = document.getElementById('timelineRowsContainer');
      if (!container) return;

      const workers = (state.workers || []).filter(w => {
        if (roleFilter !== 'ALL' && w.role !== roleFilter) return false;
        if (zoneFilter !== 'ALL' && w.zone !== zoneFilter) return false;
        if (searchQuery && !w.name.toLowerCase().includes(searchQuery)) return false;
        return true;
      });

      if (workers.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-slate-400">No field technicians match the active filter criteria.</div>';
        return;
      }

      const gridStart = 7 * 60; // 07:00
      const gridEnd = 19 * 60;   // 19:00
      const totalMinutes = gridEnd - gridStart;

      let html = '';
      workers.forEach(worker => {
        const workerJobs = (state.jobs || []).filter(j => {
          const isAssigned = (j.assignedWorkerId === worker.id || (j.workerIds && j.workerIds.includes(worker.id)));
          return isAssigned;
        });

        html += '<div class="flex items-stretch hover:bg-slate-50/70 transition-colors">';
        
        // Worker Identity Cell
        html += '<div class="w-52 p-3 border-r border-slate-200 shrink-0 bg-white flex items-center justify-between">';
        html += '  <div class="flex items-center gap-2 min-w-0">';
        if (worker.avatar) {
          html += '    <img src="' + worker.avatar + '" class="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0" />';
        } else {
          html += '    <div class="w-7 h-7 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-[10px] shrink-0">' + worker.name.substring(0, 2).toUpperCase() + '</div>';
        }
        html += '    <div class="truncate">';
        html += '      <div class="font-bold text-slate-900 truncate cursor-pointer hover:text-emerald-700" onclick="openWorkerDetailModal(\\'' + worker.id + '\\')">' + worker.name + '</div>';
        html += '      <div class="text-[10px] text-slate-400 capitalize truncate">' + (worker.role || 'Engineer') + ' • ' + (worker.zone || '') + '</div>';
        html += '    </div>';
        html += '  </div>';
        html += '  <span class="w-2 h-2 rounded-full ' + (workerJobs.length > 0 ? 'bg-emerald-500' : 'bg-slate-300') + ' shrink-0" title="' + workerJobs.length + ' jobs"></span>';
        html += '</div>';

        // Timeline Bar Container
        html += '<div class="flex-1 relative min-h-[58px] bg-slate-50/40">';
        // Half hour background markers
        html += '<div class="absolute inset-0 grid grid-cols-12 divide-x divide-slate-100 pointer-events-none">';
        for (let i = 0; i < 12; i++) {
          html += '<div class="h-full"></div>';
        }
        html += '</div>';

        // Render Appointment Blocks
        workerJobs.forEach(job => {
          const startMin = timeToMinutes(job.timeWindow?.start || job.scheduledTime || '09:00');
          const endMin = timeToMinutes(job.timeWindow?.end || '11:00');
          
          let leftPercent = ((startMin - gridStart) / totalMinutes) * 100;
          let widthPercent = ((endMin - startMin) / totalMinutes) * 100;
          
          leftPercent = Math.max(0, Math.min(leftPercent, 95));
          widthPercent = Math.max(4, Math.min(widthPercent, 100 - leftPercent));

          const colorClass = getJobColorClass(job.status);

          html += '<div onclick="openJobDetailModal(\\'' + job.id + '\\')" style="left: ' + leftPercent + '%; width: ' + widthPercent + '%;" class="absolute top-1.5 bottom-1.5 rounded p-1.5 text-[11px] shadow-xs border overflow-hidden job-block flex flex-col justify-center ' + colorClass + '">';
          html += '  <div class="flex items-center justify-between gap-1 font-bold leading-tight">';
          html += '    <span class="truncate">' + job.title + '</span>';
          html += '    <span class="text-[9px] uppercase px-1 rounded bg-black/20 shrink-0">' + (job.priority || 'Med') + '</span>';
          html += '  </div>';
          html += '  <div class="text-[10px] text-white/90 truncate flex items-center gap-1.5 mt-0.5">';
          html += '    <span>' + (job.timeWindow?.start || '09:00') + ' - ' + (job.timeWindow?.end || '11:00') + '</span>';
          if (job.clientName || job.customer) {
            html += '    <span>• ' + (job.clientName || job.customer) + '</span>';
          }
          html += '  </div>';
          html += '</div>';
        });

        html += '</div>';
        html += '</div>';
      });

      container.innerHTML = html;
    }

    // ================= RENDER INTERACTIVE MAP ROUTE =================
    function renderMapRoute() {
      const svg = document.getElementById('mapSvgLines');
      const pinsContainer = document.getElementById('mapPinsContainer');
      const cardsContainer = document.getElementById('mapSiteCardsContainer');
      if (!svg || !pinsContainer || !cardsContainer) return;

      const jobs = state.jobs || [];
      
      let svgHtml = '';
      let pinsHtml = '';
      let cardsHtml = '';

      // Center Depot Coordinates
      const cx = 50;
      const cy = 50;

      // Coordinates generator based on index
      jobs.slice(0, 9).forEach((job, idx) => {
        const angle = (idx / Math.min(jobs.length, 9)) * 2 * Math.PI;
        const dist = 32 + (idx % 3) * 6;
        const px = Math.round(cx + dist * Math.cos(angle));
        const py = Math.round(cy + dist * Math.sin(angle));

        // SVG connecting path
        svgHtml += '<line x1="' + cx + '%" y1="' + cy + '%" x2="' + px + '%" y2="' + py + '%" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4 4" opacity="0.6"/>';

        // Pin marker
        const statusColor = job.status === 'in_progress' ? '#16a34a' : (job.status === 'en_route' ? '#d97706' : '#2563eb');
        pinsHtml += '<div onclick="openJobDetailModal(\\'' + job.id + '\\')" style="left: ' + px + '%; top: ' + py + '%; transform: translate(-50%, -50%);" class="absolute p-2 rounded-full bg-white shadow-md border-2 border-slate-900 cursor-pointer hover:scale-125 transition-transform" title="' + job.title + '">';
        pinsHtml += '  <div class="w-3 h-3 rounded-full" style="background-color: ' + statusColor + ';"></div>';
        pinsHtml += '</div>';

        // Site Card
        cardsHtml += '<div class="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 hover:border-emerald-500 transition-colors cursor-pointer" onclick="openJobDetailModal(\\'' + job.id + '\\')">';
        cardsHtml += '  <div class="flex items-center justify-between text-[11px]">';
        cardsHtml += '    <span class="font-mono font-bold text-slate-900">' + (job.code || 'JOB-' + (idx + 1)) + '</span>';
        cardsHtml += '    ' + getStatusBadge(job.status);
        cardsHtml += '  </div>';
        cardsHtml += '  <div class="font-bold text-xs text-slate-800">' + job.title + '</div>';
        cardsHtml += '  <div class="text-[11px] text-slate-500 truncate">&#128205; ' + (job.location || job.address || 'Metro Site') + '</div>';
        cardsHtml += '</div>';
      });

      svg.innerHTML = svgHtml;
      pinsContainer.innerHTML = pinsHtml;
      cardsContainer.innerHTML = cardsHtml;
    }

    // ================= RENDER WORKERS GRID =================
    function renderWorkers() {
      const container = document.getElementById('workersGridContainer');
      if (!container) return;

      const workers = (state.workers || []).filter(w => {
        if (roleFilter !== 'ALL' && w.role !== roleFilter) return false;
        if (zoneFilter !== 'ALL' && w.zone !== zoneFilter) return false;
        if (searchQuery && !w.name.toLowerCase().includes(searchQuery)) return false;
        return true;
      });

      let html = '';
      workers.forEach(w => {
        const assignedJobs = (state.jobs || []).filter(j => j.assignedWorkerId === w.id || (j.workerIds && j.workerIds.includes(w.id)));

        html += '<div class="p-4 bg-white border border-slate-200 rounded-lg shadow-xs hover:border-emerald-600 transition-all space-y-3">';
        html += '  <div class="flex items-start justify-between gap-2">';
        html += '    <div class="flex items-center gap-3">';
        if (w.avatar) {
          html += '      <img src="' + w.avatar + '" class="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />';
        } else {
          html += '      <div class="w-10 h-10 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs shrink-0">' + w.name.substring(0, 2).toUpperCase() + '</div>';
        }
        html += '      <div>';
        html += '        <h3 class="font-bold text-xs text-slate-900">' + w.name + '</h3>';
        html += '        <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px] capitalize">' + (w.role || 'Technician') + '</span>';
        html += '      </div>';
        html += '    </div>';
        html += '    <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">' + (w.zone || 'Central') + '</span>';
        html += '  </div>';

        html += '  <div class="space-y-1 text-[11px] text-slate-600 border-t border-slate-100 pt-2">';
        html += '    <div class="flex items-center justify-between">';
        html += '      <span>Phone:</span>';
        html += '      <a href="tel:' + (w.phone || '') + '" class="font-mono text-emerald-700 hover:underline">' + (w.phone || '--') + '</a>';
        html += '    </div>';
        html += '    <div class="flex items-center justify-between">';
        html += '      <span>Assigned Vehicle:</span>';
        html += '      <span class="font-medium text-slate-800">&#128663; ' + (w.assignedVehicleId || 'Van-01') + '</span>';
        html += '    </div>';
        html += '    <div class="flex items-center justify-between">';
        html += '      <span>Today Dispatches:</span>';
        html += '      <span class="font-bold text-slate-900 font-mono">' + assignedJobs.length + ' appointments</span>';
        html += '    </div>';
        html += '  </div>';

        // Skills pills
        if (w.skills && w.skills.length > 0) {
          html += '  <div class="flex flex-wrap gap-1 pt-1">';
          w.skills.forEach(skill => {
            html += '    <span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">' + skill + '</span>';
          });
          html += '  </div>';
        }

        html += '  <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">';
        html += '    <button onclick="openWorkerDetailModal(\\'' + w.id + '\\')" class="text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer">View Profile</button>';
        html += '    <div class="flex gap-2">';
        html += '      <button onclick="openEditWorkerModal(\\'' + w.id + '\\')" class="text-slate-600 hover:text-slate-900 cursor-pointer">Edit</button>';
        html += '      <button onclick="handleDeleteWorker(\\'' + w.id + '\\')" class="text-rose-600 hover:text-rose-700 cursor-pointer">Delete</button>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';
      });

      container.innerHTML = html;
    }

    // ================= RENDER DISPATCHES & JOBS TABLE =================
    function renderJobs() {
      const tbody = document.getElementById('jobsTableBody');
      if (!tbody) return;

      const jobs = (state.jobs || []).filter(j => {
        if (searchQuery && !j.title.toLowerCase().includes(searchQuery) && !(j.clientName || '').toLowerCase().includes(searchQuery)) return false;
        return true;
      });

      let html = '';
      jobs.forEach(j => {
        const eng = (state.workers || []).find(w => w.id === j.assignedWorkerId);
        const drv = (state.workers || []).find(w => w.id === j.assignedDriverId);

        html += '<tr class="hover:bg-slate-50/80 transition-colors">';
        html += '  <td class="p-3 font-mono font-bold text-slate-900 cursor-pointer" onclick="openJobDetailModal(\\'' + j.id + '\\')">' + (j.code || j.id) + '</td>';
        html += '  <td class="p-3">';
        html += '    <div class="font-bold text-slate-800 cursor-pointer hover:text-emerald-700" onclick="openJobDetailModal(\\'' + j.id + '\\')">' + j.title + '</div>';
        html += '    <div class="text-slate-500 text-[11px]">' + (j.clientName || j.customer || 'Enterprise Client') + '</div>';
        html += '  </td>';
        html += '  <td class="p-3 text-slate-600 truncate max-w-[180px]">' + (j.location || j.address || '--') + '</td>';
        html += '  <td class="p-3 font-medium text-slate-800">' + (eng ? eng.name : '<span class="text-slate-400 italic">Unassigned</span>') + '</td>';
        html += '  <td class="p-3 text-slate-600">' + (drv ? drv.name : 'Direct Dispatch') + '</td>';
        html += '  <td class="p-3 font-mono text-slate-700">' + (j.timeWindow?.start || '09:00') + ' - ' + (j.timeWindow?.end || '11:00') + '</td>';
        html += '  <td class="p-3">' + getStatusBadge(j.status) + '</td>';
        html += '  <td class="p-3">' + getPriorityBadge(j.priority) + '</td>';
        html += '  <td class="p-3 text-right space-x-2 whitespace-nowrap">';
        html += '    <button onclick="openJobDetailModal(\\'' + j.id + '\\')" class="text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer">Details</button>';
        html += '    <button onclick="openEditJobModal(\\'' + j.id + '\\')" class="text-slate-600 hover:text-slate-900 cursor-pointer">Edit</button>';
        html += '    <button onclick="handleDeleteJob(\\'' + j.id + '\\')" class="text-rose-600 hover:text-rose-700 cursor-pointer">Delete</button>';
        html += '  </td>';
        html += '</tr>';
      });

      tbody.innerHTML = html;
    }

    // ================= RENDER FLEET VEHICLES =================
    function renderFleet() {
      const container = document.getElementById('fleetGridContainer');
      if (!container) return;

      const vehicles = state.vehicles || [];
      let html = '';
      vehicles.forEach(v => {
        const driver = (state.workers || []).find(w => w.id === v.driverId);
        const fuel = v.batteryLevel !== undefined ? v.batteryLevel : (v.fuelLevel || 80);

        html += '<div class="p-4 bg-white border border-slate-200 rounded-lg shadow-xs space-y-3">';
        html += '  <div class="flex items-center justify-between">';
        html += '    <div>';
        html += '      <h3 class="font-bold text-xs text-slate-900">' + (v.model || 'Ford Transit Van') + '</h3>';
        html += '      <span class="font-mono text-xs text-slate-500 font-bold">' + (v.plate || v.registration || 'FLD-4921') + '</span>';
        html += '    </div>';
        html += '    <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px] uppercase">' + (v.status || 'Active') + '</span>';
        html += '  </div>';

        html += '  <div class="space-y-1 text-xs">';
        html += '    <div class="flex items-center justify-between text-slate-600">';
        html += '      <span>Assigned Driver:</span>';
        html += '      <span class="font-bold text-slate-800">' + (driver ? driver.name : 'Depot Pool') + '</span>';
        html += '    </div>';
        html += '    <div class="flex items-center justify-between text-slate-600">';
        html += '      <span>Fuel / Battery:</span>';
        html += '      <span class="font-bold font-mono text-emerald-700">' + fuel + '%</span>';
        html += '    </div>';
        html += '    <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">';
        html += '      <div class="h-full bg-emerald-600 rounded-full" style="width: ' + fuel + '%;"></div>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';
      });

      container.innerHTML = html;
    }

    // ================= RENDER TOOL INVENTORY =================
    function renderTools() {
      const tbody = document.getElementById('toolsTableBody');
      if (!tbody) return;

      const toolsList = [
        { name: 'Thermal Imaging Camera (FLIR E8)', serial: 'SN-THM-8041', category: 'Diagnostics' },
        { name: 'Fluke 87V Industrial Multimeter', serial: 'SN-FLK-2094', category: 'Electrical' },
        { name: 'Ridgid SeeSnake Pipe Inspection Camera', serial: 'SN-RDG-6019', category: 'Plumbing' },
        { name: 'Lincoln Electric Arc Welder Portable', serial: 'SN-LNC-1102', category: 'Welding' },
        { name: 'Beamex MC6 Automated Pressure Calibrator', serial: 'SN-BMX-9411', category: 'Control Systems' }
      ];

      let html = '';
      toolsList.forEach((tool, idx) => {
        const assignedWorker = (state.workers || [])[idx % (state.workers || []).length];
        const isCheckedOut = idx % 2 === 0;

        html += '<tr class="hover:bg-slate-50 transition-colors">';
        html += '  <td class="p-3 font-bold text-slate-900">&#128295; ' + tool.name + '</td>';
        html += '  <td class="p-3 font-mono text-slate-500">' + tool.serial + '</td>';
        html += '  <td class="p-3">';
        html += isCheckedOut 
          ? '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[10px]">CHECKED OUT</span>'
          : '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">IN DEPOT</span>';
        html += '  </td>';
        html += '  <td class="p-3 font-medium text-slate-800">' + (isCheckedOut && assignedWorker ? assignedWorker.name : '--') + '</td>';
        html += '  <td class="p-3 text-slate-600 font-mono text-[11px]">' + (isCheckedOut ? 'JOB-10' + (idx + 1) : '--') + '</td>';
        html += '  <td class="p-3 text-right">';
        if (isCheckedOut) {
          html += '    <button onclick="returnTool(\\'' + tool.name + '\\')" class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] cursor-pointer">Return Tool</button>';
        } else {
          html += '    <span class="text-slate-400 text-[10px]">Ready</span>';
        }
        html += '  </td>';
        html += '</tr>';
      });

      tbody.innerHTML = html;
    }

    // ================= RENDER AUDIT HISTORY =================
    function renderHistory() {
      const container = document.getElementById('historyLogContainer');
      if (!container) return;

      const items = (state.activities || []).slice(0, 15);
      if (items.length === 0) {
        container.innerHTML = '<div class="p-4 text-center text-slate-400">All local dispatch synchronization events are recorded here.</div>';
        return;
      }

      let html = '';
      items.forEach(act => {
        html += '<div class="py-2.5 flex items-start justify-between gap-2">';
        html += '  <div>';
        html += '    <div class="font-bold text-slate-800 text-xs">' + act.description + '</div>';
        html += '    <div class="text-[10px] text-slate-400">' + (act.userName || 'Dispatcher') + ' • ' + (act.type || 'SYNC') + '</div>';
        html += '  </div>';
        html += '  <span class="text-[10px] font-mono text-slate-500 whitespace-nowrap">' + (act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : 'Just now') + '</span>';
        html += '</div>';
      });

      container.innerHTML = html;
    }

    // ================= RENDER MINI CALENDAR =================
    let calViewDate = new Date();

    function renderMiniCalendar() {
      const label = document.getElementById('calMonthYearLabel');
      const grid = document.getElementById('calDaysGrid');
      if (!label || !grid) return;

      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      label.textContent = months[calViewDate.getMonth()] + ' ' + calViewDate.getFullYear();

      const firstDay = new Date(calViewDate.getFullYear(), calViewDate.getMonth(), 1).getDay();
      const daysInMonth = new Date(calViewDate.getFullYear(), calViewDate.getMonth() + 1, 0).getDate();

      const today = new Date();
      let html = '';

      // Blank prefix days
      for (let i = 0; i < firstDay; i++) {
        html += '<div class="cal-day opacity-20"></div>';
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const thisDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth(), day);
        const isToday = thisDate.toDateString() === today.toDateString();
        const isSelected = thisDate.toDateString() === selectedDate.toDateString();

        // Check if there are jobs for this day
        const hasJobs = (state.jobs || []).length > 0 && (day % 3 === 0 || isToday);

        let cls = 'cal-day ';
        if (isToday) cls += 'cal-day-today ';
        if (isSelected) cls += 'cal-day-selected ';
        if (hasJobs) cls += 'cal-day-has-jobs ';

        html += '<div class="' + cls + '" onclick="selectCalendarDate(' + calViewDate.getFullYear() + ', ' + calViewDate.getMonth() + ', ' + day + ')">' + day + '</div>';
      }

      grid.innerHTML = html;
    }

    function changeCalMonth(delta) {
      calViewDate.setMonth(calViewDate.getMonth() + delta);
      renderMiniCalendar();
    }

    function jumpCalToday() {
      calViewDate = new Date();
      selectedDate = new Date();
      updateDateLabel();
      renderAll();
    }

    function selectCalendarDate(year, month, day) {
      selectedDate = new Date(year, month, day);
      updateDateLabel();
      renderAll();
    }

    // ================= RENDER SIDE PERSONNEL =================
    function renderSidePersonnel() {
      const container = document.getElementById('sidePersonnelItems');
      const search = (document.getElementById('sidePersonnelSearch')?.value || '').toLowerCase();
      if (!container) return;

      let html = '';
      if (personnelSubTab === 'engineers') {
        const engs = (state.workers || []).filter(w => w.role !== 'driver' && (!search || w.name.toLowerCase().includes(search)));
        engs.forEach(w => {
          const jobsCount = (state.jobs || []).filter(j => j.assignedWorkerId === w.id).length;
          html += '<div onclick="filterByWorker(\\'' + w.name + '\\')" class="p-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between cursor-pointer transition-colors text-xs">';
          html += '  <div class="flex items-center gap-2 truncate">';
          html += '    <div class="w-6 h-6 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-[10px] shrink-0">' + w.name.substring(0, 2).toUpperCase() + '</div>';
          html += '    <div class="truncate">';
          html += '      <div class="font-bold text-slate-900 truncate">' + w.name + '</div>';
          html += '      <div class="text-[10px] text-slate-500 capitalize">' + (w.role || 'Engineer') + '</div>';
          html += '    </div>';
          html += '  </div>';
          html += '  <span class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] shrink-0">' + jobsCount + ' jobs</span>';
          html += '</div>';
        });
      } else if (personnelSubTab === 'drivers') {
        const drivers = (state.workers || []).filter(w => w.role === 'driver' && (!search || w.name.toLowerCase().includes(search)));
        drivers.forEach(d => {
          html += '<div class="p-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between text-xs">';
          html += '  <div class="flex items-center gap-2 truncate">';
          html += '    <span class="text-sm">&#128663;</span>';
          html += '    <div class="truncate">';
          html += '      <div class="font-bold text-slate-900 truncate">' + d.name + '</div>';
          html += '      <div class="text-[10px] text-slate-500">' + (d.zone || 'Dispatch Driver') + '</div>';
          html += '    </div>';
          html += '  </div>';
          html += '  <span class="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold text-[10px]">On Route</span>';
          html += '</div>';
        });
      } else {
        const vehicles = (state.vehicles || []).filter(v => !search || (v.model || '').toLowerCase().includes(search));
        vehicles.forEach(v => {
          html += '<div class="p-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between text-xs">';
          html += '  <div class="truncate">';
          html += '    <div class="font-bold text-slate-900 truncate">' + (v.model || 'Van') + '</div>';
          html += '    <div class="font-mono text-[10px] text-slate-500">' + (v.plate || 'FLD-01') + '</div>';
          html += '  </div>';
          html += '  <span class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px]">' + (v.batteryLevel || 85) + '%</span>';
          html += '</div>';
        });
      }

      container.innerHTML = html || '<div class="p-3 text-center text-slate-400 text-xs">No records found.</div>';
    }

    function filterByWorker(name) {
      const input = document.getElementById('globalSearch');
      if (input) {
        input.value = name;
        handleSearch(name);
      }
    }

    // ================= RENDER METRICS & BADGES =================
    function updateMetrics() {
      const workers = state.workers || [];
      const jobs = state.jobs || [];
      const vehicles = state.vehicles || [];

      document.getElementById('workersCountBadge').textContent = workers.length;
      document.getElementById('jobsCountBadge').textContent = jobs.length;
      document.getElementById('fleetCountBadge').textContent = vehicles.length;
      document.getElementById('toolsCountBadge').textContent = '5';

      document.getElementById('statWorkersCount').textContent = workers.length;
      document.getElementById('statJobsCount').textContent = jobs.length;
      document.getElementById('statVehiclesCount').textContent = vehicles.length;
      document.getElementById('statToolsCount').textContent = '3 in use';

      const storageEl = document.getElementById('storageSummaryText');
      if (storageEl) {
        storageEl.textContent = workers.length + ' Workers, ' + jobs.length + ' Dispatches, ' + vehicles.length + ' Vehicles';
      }
    }

    // ================= MODAL LOGIC & ACTIONS =================
    function openAddJobModal() {
      document.getElementById('jobModalTitle').textContent = 'New Job Appointment';
      document.getElementById('jobIdInput').value = '';
      document.getElementById('jobCodeInput').value = 'JOB-' + Math.floor(1000 + Math.random() * 9000);
      document.getElementById('jobTitleInput').value = '';
      document.getElementById('jobClientInput').value = '';
      document.getElementById('jobLocationInput').value = '';
      document.getElementById('jobStartTimeInput').value = '09:00';
      document.getElementById('jobEndTimeInput').value = '11:30';
      document.getElementById('jobNotesInput').value = '';

      populateJobEngineerSelect();
      populateJobDriverSelect();

      document.getElementById('jobModal').classList.remove('hidden');
    }

    function openEditJobModal(jobId) {
      const job = (state.jobs || []).find(j => j.id === jobId);
      if (!job) return;

      document.getElementById('jobModalTitle').textContent = 'Edit Job: ' + (job.code || job.title);
      document.getElementById('jobIdInput').value = job.id;
      document.getElementById('jobCodeInput').value = job.code || '';
      document.getElementById('jobPriorityInput').value = job.priority || 'Medium';
      document.getElementById('jobTitleInput').value = job.title || '';
      document.getElementById('jobClientInput').value = job.clientName || job.customer || '';
      document.getElementById('jobStatusInput').value = job.status || 'scheduled';
      document.getElementById('jobLocationInput').value = job.location || job.address || '';
      document.getElementById('jobStartTimeInput').value = job.timeWindow?.start || '09:00';
      document.getElementById('jobEndTimeInput').value = job.timeWindow?.end || '11:30';
      document.getElementById('jobNotesInput').value = (job.notes && job.notes[0]?.text) || '';

      populateJobEngineerSelect(job.assignedWorkerId);
      populateJobDriverSelect(job.assignedDriverId);

      document.getElementById('jobModal').classList.remove('hidden');
    }

    function populateJobEngineerSelect(selectedId) {
      const select = document.getElementById('jobEngineerInput');
      if (!select) return;
      let html = '';
      (state.workers || []).filter(w => w.role !== 'driver').forEach(w => {
        html += '<option value="' + w.id + '" ' + (w.id === selectedId ? 'selected' : '') + '>' + w.name + ' (' + (w.role || 'Engineer') + ')</option>';
      });
      select.innerHTML = html;
    }

    function populateJobDriverSelect(selectedId) {
      const select = document.getElementById('jobDriverInput');
      if (!select) return;
      let html = '<option value="">-- No Dedicated Driver --</option>';
      (state.workers || []).filter(w => w.role === 'driver').forEach(w => {
        html += '<option value="' + w.id + '" ' + (w.id === selectedId ? 'selected' : '') + '>' + w.name + ' (Driver)</option>';
      });
      select.innerHTML = html;
    }

    function closeJobModal() {
      document.getElementById('jobModal').classList.add('hidden');
    }

    function handleSaveJob(e) {
      e.preventDefault();
      const id = document.getElementById('jobIdInput').value || ('job-' + Date.now());
      const isEdit = !!document.getElementById('jobIdInput').value;

      const newJob = {
        id: id,
        code: document.getElementById('jobCodeInput').value,
        title: document.getElementById('jobTitleInput').value,
        clientName: document.getElementById('jobClientInput').value,
        status: document.getElementById('jobStatusInput').value,
        priority: document.getElementById('jobPriorityInput').value,
        location: document.getElementById('jobLocationInput').value,
        assignedWorkerId: document.getElementById('jobEngineerInput').value,
        assignedDriverId: document.getElementById('jobDriverInput').value || undefined,
        timeWindow: {
          start: document.getElementById('jobStartTimeInput').value,
          end: document.getElementById('jobEndTimeInput').value
        },
        notes: document.getElementById('jobNotesInput').value ? [{
          id: 'note-' + Date.now(),
          text: document.getElementById('jobNotesInput').value,
          timestamp: new Date().toISOString()
        }] : []
      };

      if (isEdit) {
        state.jobs = (state.jobs || []).map(j => j.id === id ? { ...j, ...newJob } : j);
      } else {
        state.jobs = [...(state.jobs || []), newJob];
      }

      // Record activity
      state.activities = [{
        id: 'act-' + Date.now(),
        type: isEdit ? 'JOB_UPDATED' : 'JOB_CREATED',
        description: (isEdit ? 'Updated work order ' : 'Created appointment ') + newJob.title,
        timestamp: new Date().toISOString(),
        userName: 'Dispatcher'
      }, ...(state.activities || [])];

      closeJobModal();
      saveState();
    }

    function handleDeleteJob(id) {
      if (confirm('Are you sure you want to delete this job?')) {
        state.jobs = (state.jobs || []).filter(j => j.id !== id);
        saveState();
      }
    }

    // ================= WORKER MODAL =================
    function openAddWorkerModal() {
      document.getElementById('workerModalTitle').textContent = 'Add New Field Worker';
      document.getElementById('workerIdInput').value = '';
      document.getElementById('workerNameInput').value = '';
      document.getElementById('workerPhoneInput').value = '';
      document.getElementById('workerSkillsInput').value = '';
      populateWorkerVehicleSelect();
      document.getElementById('workerModal').classList.remove('hidden');
    }

    function openEditWorkerModal(workerId) {
      const w = (state.workers || []).find(x => x.id === workerId);
      if (!w) return;
      document.getElementById('workerModalTitle').textContent = 'Edit Worker: ' + w.name;
      document.getElementById('workerIdInput').value = w.id;
      document.getElementById('workerNameInput').value = w.name;
      document.getElementById('workerRoleInput').value = w.role || 'electrical';
      document.getElementById('workerZoneInput').value = w.zone || 'Central Metro';
      document.getElementById('workerPhoneInput').value = w.phone || '';
      document.getElementById('workerSkillsInput').value = (w.skills || []).join(', ');
      populateWorkerVehicleSelect(w.assignedVehicleId);
      document.getElementById('workerModal').classList.remove('hidden');
    }

    function populateWorkerVehicleSelect(selectedId) {
      const select = document.getElementById('workerVehicleInput');
      if (!select) return;
      let html = '<option value="">-- None --</option>';
      (state.vehicles || []).forEach(v => {
        html += '<option value="' + v.id + '" ' + (v.id === selectedId ? 'selected' : '') + '>' + (v.model || 'Van') + ' (' + (v.plate || v.id) + ')</option>';
      });
      select.innerHTML = html;
    }

    function closeWorkerModal() {
      document.getElementById('workerModal').classList.add('hidden');
    }

    function handleSaveWorker(e) {
      e.preventDefault();
      const id = document.getElementById('workerIdInput').value || ('w-' + Date.now());
      const isEdit = !!document.getElementById('workerIdInput').value;

      const skillsStr = document.getElementById('workerSkillsInput').value;
      const skillsArr = skillsStr.split(',').map(s => s.trim()).filter(Boolean);

      const workerData = {
        id: id,
        name: document.getElementById('workerNameInput').value,
        role: document.getElementById('workerRoleInput').value,
        zone: document.getElementById('workerZoneInput').value,
        phone: document.getElementById('workerPhoneInput').value,
        assignedVehicleId: document.getElementById('workerVehicleInput').value || undefined,
        skills: skillsArr
      };

      if (isEdit) {
        state.workers = (state.workers || []).map(w => w.id === id ? { ...w, ...workerData } : w);
      } else {
        state.workers = [...(state.workers || []), workerData];
      }

      closeWorkerModal();
      saveState();
    }

    function handleDeleteWorker(id) {
      if (confirm('Are you sure you want to remove this field worker?')) {
        state.workers = (state.workers || []).filter(w => w.id !== id);
        saveState();
      }
    }

    // ================= JOB DETAIL & NOTES MODAL =================
    function openJobDetailModal(jobId) {
      currentInteractingJobId = jobId;
      const job = (state.jobs || []).find(j => j.id === jobId);
      if (!job) return;

      const eng = (state.workers || []).find(w => w.id === job.assignedWorkerId);
      const drv = (state.workers || []).find(w => w.id === job.assignedDriverId);

      document.getElementById('detailJobCode').textContent = job.code || job.id;
      document.getElementById('detailJobTitle').textContent = job.title;
      document.getElementById('detailJobClient').textContent = job.clientName || job.customer || 'Enterprise Account';
      document.getElementById('detailJobLocation').textContent = job.location || job.address || 'Metro Job Site';
      document.getElementById('detailJobCrew').textContent = (eng ? eng.name : 'Unassigned') + (drv ? ' • Driver: ' + drv.name : '');
      document.getElementById('detailJobTime').textContent = (job.timeWindow?.start || '09:00') + ' - ' + (job.timeWindow?.end || '11:30');

      // Status buttons
      const statuses = ['scheduled', 'en_route', 'on_site', 'in_progress', 'completed'];
      let btnsHtml = '';
      statuses.forEach(s => {
        const isCur = job.status === s;
        btnsHtml += '<button onclick="updateJobStatusQuick(\\'' + s + '\\')" class="px-2.5 py-1 rounded text-xs font-bold uppercase transition-colors cursor-pointer ' + 
          (isCur ? 'bg-[#107c41] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200') + '">' + s.replace('_', ' ') + '</button>';
      });
      document.getElementById('detailStatusButtons').innerHTML = btnsHtml;

      // Notes feed
      renderJobNotesFeed(job);

      document.getElementById('jobDetailModal').classList.remove('hidden');
    }

    function renderJobNotesFeed(job) {
      const container = document.getElementById('detailNotesContainer');
      if (!container) return;

      const notes = job.notes || [];
      if (notes.length === 0) {
        container.innerHTML = '<div class="text-slate-400 italic text-center py-2">No field notes recorded yet.</div>';
        return;
      }

      let html = '';
      notes.forEach(n => {
        html += '<div class="p-2 bg-white rounded border border-slate-200 space-y-0.5">';
        html += '  <div class="flex items-center justify-between text-[10px] text-slate-400">';
        html += '    <span class="font-bold text-slate-700">' + (n.author || 'Technician') + '</span>';
        html += '    <span>' + (n.timestamp ? new Date(n.timestamp).toLocaleTimeString() : 'Just now') + '</span>';
        html += '  </div>';
        html += '  <div class="text-slate-800 text-xs">' + (n.text || n.content) + '</div>';
        html += '</div>';
      });

      container.innerHTML = html;
    }

    function addJobNote() {
      if (!currentInteractingJobId) return;
      const input = document.getElementById('newNoteInput');
      const text = input.value.trim();
      if (!text) return;

      const job = (state.jobs || []).find(j => j.id === currentInteractingJobId);
      if (job) {
        const note = {
          id: 'note-' + Date.now(),
          text: text,
          timestamp: new Date().toISOString(),
          author: 'Dispatcher'
        };
        job.notes = [...(job.notes || []), note];
        input.value = '';
        renderJobNotesFeed(job);
        saveState();
      }
    }

    function updateJobStatusQuick(newStatus) {
      if (!currentInteractingJobId) return;
      const job = (state.jobs || []).find(j => j.id === currentInteractingJobId);
      if (job) {
        job.status = newStatus;
        openJobDetailModal(currentInteractingJobId);
        saveState();
      }
    }

    function handleEditFromDetail() {
      closeJobDetailModal();
      if (currentInteractingJobId) {
        openEditJobModal(currentInteractingJobId);
      }
    }

    function closeJobDetailModal() {
      document.getElementById('jobDetailModal').classList.add('hidden');
      currentInteractingJobId = null;
    }

    function openWorkerDetailModal(workerId) {
      openEditWorkerModal(workerId);
    }

    function openMobileSyncModal() {
      document.getElementById('mobileSyncModal').classList.remove('hidden');
    }

    function closeMobileSyncModal() {
      document.getElementById('mobileSyncModal').classList.add('hidden');
    }

    function returnTool(toolName) {
      alert('Tool "' + toolName + '" has been returned to Central Depot stock.');
      renderTools();
    }

    // ================= BACKUP & EXPORT JSON =================
    function exportDatabaseJSON() {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', 'fieldops_backup_' + new Date().toISOString().slice(0, 10) + '.json');
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }

    function importDatabaseJSON(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const parsed = JSON.parse(e.target.result);
          if (parsed && Array.isArray(parsed.workers) && Array.isArray(parsed.jobs)) {
            state = parsed;
            saveState();
            alert('Database successfully restored from JSON!');
          } else {
            alert('Invalid database backup JSON format.');
          }
        } catch(err) {
          alert('Error reading JSON file: ' + err.message);
        }
      };
      reader.readAsText(file);
    }

    function resetDataToSeed() {
      if (confirm('Reset all workers, appointments, and fleet to initial demo data?')) {
        state = INITIAL_DATA;
        saveState();
      }
    }

    // ================= CLOCK & MAIN LOOP =================
    function startClock() {
      const clock = document.getElementById('liveClock');
      function tick() {
        if (clock) {
          const now = new Date();
          clock.textContent = now.toLocaleTimeString();
        }
      }
      tick();
      setInterval(tick, 1000);
    }

    function renderAll() {
      updateMetrics();
      renderTimeline();
      renderMapRoute();
      renderWorkers();
      renderJobs();
      renderFleet();
      renderTools();
      renderHistory();
      renderMiniCalendar();
      renderSidePersonnel();
    }

    // Initialize application on load
    window.addEventListener('DOMContentLoaded', () => {
      updateDateLabel();
      startClock();
      renderAll();
    });
  </script>
</body>
</html>
`;
}
