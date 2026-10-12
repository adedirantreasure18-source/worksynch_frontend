import JSZip from 'jszip';
import { Job, Worker, SystemSettings, AppStateData, JobPriority, JobStatus, WorkerRole, WorkerStatus } from '../types';
import { getDisplayJobStatus } from './statusUtils';

export interface ZipFileEntryDetail {
  name: string;
  size: number;
  detectedType: 'jobs_csv' | 'workers_csv' | 'state_json' | 'jobs_json' | 'workers_json' | 'manifest' | 'unknown';
  recordCount: number;
  previewText?: string;
  selected?: boolean;
}

export interface ParsedImportResult {
  fileName: string;
  fileType: 'zip' | 'csv' | 'json';
  fileSize: number;
  filesInsideZip?: ZipFileEntryDetail[];
  jobs: Job[];
  workers: Worker[];
  settings?: Partial<SystemSettings>;
  warnings: string[];
  stats?: {
    totalFilesScanned: number;
    validDataFiles: number;
    uniqueDatesFound: string[];
    jobsCreated: number;
    workersCreated: number;
  };
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if (char === '\n' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function findColIndex(headers: string[], aliases: string[]): number {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const alias of aliases) {
    const normAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    const idx = normalizedHeaders.findIndex((h) => h === normAlias || h.includes(normAlias));
    if (idx !== -1) return idx;
  }
  return -1;
}

export function parseDateString(rawDate: string | undefined, fallbackDate: string): string {
  if (!rawDate) return fallbackDate;
  const trimmed = rawDate.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const month = usMatch[1].padStart(2, '0');
    const day = usMatch[2].padStart(2, '0');
    const year = usMatch[3];
    return `${year}-${month}-${day}`;
  }

  const ymdSlashMatch = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (ymdSlashMatch) {
    const year = ymdSlashMatch[1];
    const month = ymdSlashMatch[2].padStart(2, '0');
    const day = ymdSlashMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return fallbackDate;
}

export function extractDateFromFilename(filename: string): string | null {
  const match = filename.match(/(\d{4}[-_]\d{2}[-_]\d{2})/);
  if (match) {
    return match[1].replace(/_/g, '-');
  }
  return null;
}

export function parseJobsFromCSV(
  rows: string[][],
  fallbackDate: string,
  existingWorkers: Worker[],
  fileEmbeddedDate?: string | null
): Job[] {
  if (rows.length < 2) return [];

  const effectiveFallbackDate = fileEmbeddedDate || fallbackDate;

  const headers = rows[0];
  const stopIdx = findColIndex(headers, ['stop', 'stopnumber', 'stop#', 'order', 'sequence']);
  const codeIdx = findColIndex(headers, ['jobcode', 'code', 'job#', 'id', 'ticket']);
  const titleIdx = findColIndex(headers, ['title', 'jobtitle', 'description', 'task', 'name']);
  const clientIdx = findColIndex(headers, ['client', 'clientname', 'customer', 'company']);
  const timeIdx = findColIndex(headers, ['time', 'timewindow', 'window', 'hours', 'schedule']);
  const locIdx = findColIndex(headers, ['location', 'sitelocation', 'site', 'sitename']);
  const addrIdx = findColIndex(headers, ['address', 'street', 'fulladdress']);
  const zoneIdx = findColIndex(headers, ['zone', 'sector', 'area', 'region']);
  const engIdx = findColIndex(headers, ['engineer', 'specialist', 'technician', 'lead']);
  const drvIdx = findColIndex(headers, ['driver', 'transport', 'vehicle']);
  const priorityIdx = findColIndex(headers, ['priority', 'urgency', 'tier']);
  const statusIdx = findColIndex(headers, ['status', 'state']);
  const estIdx = findColIndex(headers, ['estimated', 'duration', 'hours', 'durationhours', 'esthours']);
  const dateIdx = findColIndex(headers, ['date', 'scheduleddate', 'day']);
  const notesIdx = findColIndex(headers, ['notes', 'instructions', 'comments', 'routenotes']);

  const jobs: Job[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0 || row.every((c) => !c.trim())) continue;

    const rawCode = (codeIdx !== -1 && row[codeIdx]) ? row[codeIdx].trim() : `JOB-${1000 + r}`;
    const rawTitle = (titleIdx !== -1 && row[titleIdx]) ? row[titleIdx].trim() : `Field Service Appointment ${r}`;
    const rawClient = (clientIdx !== -1 && row[clientIdx]) ? row[clientIdx].trim() : 'Commercial Client';
    const rawSite = (locIdx !== -1 && row[locIdx]) ? row[locIdx].trim() : 'Operational Facility';
    const rawAddr = (addrIdx !== -1 && row[addrIdx]) ? row[addrIdx].trim() : '100 Industrial Parkway';
    const rawZone = (zoneIdx !== -1 && row[zoneIdx]) ? row[zoneIdx].trim() : 'Metro Core';

    let startTime = '09:00 AM';
    let endTime = '12:00 PM';
    if (timeIdx !== -1 && row[timeIdx]) {
      const timeStr = row[timeIdx].trim();
      const parts = timeStr.split(/[-–—to]/i).map((s) => s.trim());
      if (parts.length >= 2) {
        startTime = parts[0] || '09:00 AM';
        endTime = parts[1] || '12:00 PM';
      } else if (parts.length === 1 && parts[0]) {
        startTime = parts[0];
      }
    }

    let engineerId = '';
    if (engIdx !== -1 && row[engIdx]) {
      const engName = row[engIdx].trim().toLowerCase();
      const matched = existingWorkers.find(
        (w) => w.role !== 'driver' && (w.name.toLowerCase().includes(engName) || w.id.toLowerCase() === engName)
      );
      if (matched) engineerId = matched.id;
    }
    if (!engineerId && existingWorkers.length > 0) {
      const firstEng = existingWorkers.find((w) => w.role !== 'driver');
      if (firstEng) engineerId = firstEng.id;
    }

    let driverId: string | undefined = undefined;
    let transitMode: 'driver' | 'public_transport' | 'walking' = 'driver';

    if (drvIdx !== -1 && row[drvIdx]) {
      const drvName = row[drvIdx].trim().toLowerCase();
      if (drvName.includes('transit') || drvName.includes('public') || drvName.includes('bus') || drvName.includes('train')) {
        transitMode = 'public_transport';
        driverId = undefined;
      } else if (drvName.includes('walk')) {
        transitMode = 'walking';
        driverId = undefined;
      } else {
        const matched = existingWorkers.find(
          (w) => w.role === 'driver' && (w.name.toLowerCase().includes(drvName) || w.id.toLowerCase() === drvName)
        );
        if (matched) {
          driverId = matched.id;
          transitMode = 'driver';
        }
      }
    }

    let priority: JobPriority = 'normal';
    if (priorityIdx !== -1 && row[priorityIdx]) {
      const p = row[priorityIdx].toLowerCase();
      if (p.includes('urg') || p.includes('p1')) priority = 'urgent';
      else if (p.includes('high') || p.includes('p2')) priority = 'high';
      else if (p.includes('low') || p.includes('p4')) priority = 'low';
      else priority = 'normal';
    }

    let status: JobStatus = 'Scheduled';
    if (statusIdx !== -1 && row[statusIdx]) {
      const s = row[statusIdx].toLowerCase().replace(/[^a-z]/g, '');
      if (s.includes('comp') || s.includes('done')) status = 'Completed';
      else if (s.includes('prog')) status = 'In Progress';
      else if (s.includes('site')) status = 'On Site';
      else if (s.includes('route') || s.includes('transit')) status = 'In Transit';
      else if (s.includes('canc')) status = 'Cancelled';
      else status = 'Scheduled';
    }

    let estDuration = 2.5;
    if (estIdx !== -1 && row[estIdx]) {
      const parsedNum = parseFloat(row[estIdx].replace(/[^0-9.]/g, ''));
      if (!isNaN(parsedNum) && parsedNum > 0) estDuration = parsedNum;
    }

    const scheduledDate = parseDateString(
      dateIdx !== -1 && row[dateIdx] ? row[dateIdx] : undefined,
      effectiveFallbackDate
    );

    const notes = (notesIdx !== -1 && row[notesIdx]) ? row[notesIdx].trim() : '';

    const deterministicId = `job-${rawCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${scheduledDate}`;

    jobs.push({
      id: deterministicId,
      code: rawCode,
      title: rawTitle,
      clientName: rawClient,
      siteLocation: {
        name: rawSite,
        address: rawAddr,
        zone: rawZone,
        lat: 37.7749 + (Math.random() - 0.5) * 0.05,
        lng: -122.4194 + (Math.random() - 0.5) * 0.05,
      },
      scheduledDate,
      timeWindow: {
        start: startTime,
        end: endTime,
      },
      engineerId: engineerId || (existingWorkers[0]?.id || 'w-eng-1'),
      specialistIds: engineerId ? [engineerId] : [],
      driverId,
      transitMode,
      priority,
      status,
      estimatedDurationHours: estDuration,
      notes,
    });
  }

  return jobs;
}

export function parseWorkersFromCSV(rows: string[][]): Worker[] {
  if (rows.length < 2) return [];

  const headers = rows[0];
  const idIdx = findColIndex(headers, ['id', 'workerid', 'employeeid', 'badge', 'code']);
  const nameIdx = findColIndex(headers, ['name', 'fullname', 'workername', 'employee']);
  const roleIdx = findColIndex(headers, ['role', 'type', 'category']);
  const titleIdx = findColIndex(headers, ['title', 'roletitle', 'jobtitle', 'designation', 'trade']);
  const statusIdx = findColIndex(headers, ['status', 'state', 'availability']);
  const phoneIdx = findColIndex(headers, ['phone', 'mobile', 'cell', 'telephone']);
  const emailIdx = findColIndex(headers, ['email', 'mail']);
  const locIdx = findColIndex(headers, ['location', 'depot', 'assignedsite', 'station']);
  const vehicleIdx = findColIndex(headers, ['vehicle', 'truck', 'van', 'model']);
  const plateIdx = findColIndex(headers, ['plate', 'licenseplate', 'tag']);
  const skillsIdx = findColIndex(headers, ['skills', 'certifications', 'qualifications']);
  const notesIdx = findColIndex(headers, ['notes', 'bio', 'comments']);

  const workers: Worker[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0 || row.every((c) => !c.trim())) continue;

    const rawName = (nameIdx !== -1 && row[nameIdx]) ? row[nameIdx].trim() : `Technician ${r}`;

    let role: WorkerRole = 'engineer';
    const rawRole = (roleIdx !== -1 && row[roleIdx]) ? row[roleIdx].toLowerCase() : '';
    const rawTitle = (titleIdx !== -1 && row[titleIdx]) ? row[titleIdx].trim() : '';

    if (rawRole.includes('driver') || rawTitle.toLowerCase().includes('driver')) {
      role = 'driver';
    } else if (rawRole.includes('weld') || rawTitle.toLowerCase().includes('weld')) {
      role = 'welder';
    } else if (rawRole.includes('plumb') || rawTitle.toLowerCase().includes('plumb')) {
      role = 'plumber';
    } else {
      role = 'engineer';
    }

    let status: WorkerStatus = 'available';
    if (statusIdx !== -1 && row[statusIdx]) {
      const s = row[statusIdx].toLowerCase().replace(/[^a-z]/g, '');
      if (s.includes('site')) status = 'on_site';
      else if (s.includes('route')) status = 'en_route';
      else if (s.includes('duty') || s.includes('off')) status = 'off_duty';
      else if (s.includes('comp')) status = 'completed';
      else status = 'available';
    }

    const email = (emailIdx !== -1 && row[emailIdx])
      ? row[emailIdx].trim()
      : `${rawName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@fieldops.io`;
    const phone = (phoneIdx !== -1 && row[phoneIdx])
      ? row[phoneIdx].trim()
      : `+1 (555) ${100 + r}-${1000 + r}`;
    const locationName = (locIdx !== -1 && row[locIdx])
      ? row[locIdx].trim()
      : 'Central Dispatch Depot';
    const notes = (notesIdx !== -1 && row[notesIdx]) ? row[notesIdx].trim() : '';

    const skills: string[] = [];
    if (skillsIdx !== -1 && row[skillsIdx]) {
      row[skillsIdx].split(/[,;|]/).forEach((sk) => {
        const trimmed = sk.trim();
        if (trimmed) skills.push(trimmed);
      });
    }
    if (skills.length === 0) {
      skills.push(role === 'driver' ? 'Defensive Driving II' : 'Field Certified');
    }

    const rawId = (idIdx !== -1 && row[idIdx]) ? row[idIdx].trim() : '';
    const workerId = rawId || `w-${role.slice(0, 3)}-${rawName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const newWorker: Worker = {
      id: workerId,
      name: rawName,
      role,
      roleTitle: rawTitle || (role === 'driver' ? 'Field Fleet Transport Specialist' : `Certified ${role.charAt(0).toUpperCase() + role.slice(1)} Specialist`),
      email,
      phone,
      status,
      skills,
      specializations: [rawTitle || `${role.toUpperCase()} Operations`],
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      locationName,
      notes,
      rating: 4.8,
      history: [
        {
          id: `hist-imp-${workerId}`,
          timestamp: new Date().toISOString(),
          changedBy: 'CSV Import',
          summary: `Imported into roster as ${role}`,
          changes: [],
        },
      ],
    };

    if (role === 'driver' || (vehicleIdx !== -1 && row[vehicleIdx])) {
      const model = (vehicleIdx !== -1 && row[vehicleIdx]) ? row[vehicleIdx].trim() : 'Ford Transit 350 AWD';
      const plate = (plateIdx !== -1 && row[plateIdx]) ? row[plateIdx].trim() : `FLT-${100 + r}`;
      newWorker.vehicleInfo = {
        model,
        plate,
        capacity: 4,
      };
    }

    workers.push(newWorker);
  }

  return workers;
}

export function detectCSVType(rows: string[][]): 'jobs' | 'workers' | 'unknown' {
  if (rows.length < 1) return 'unknown';
  const headerStr = rows[0].join(' ').toLowerCase();

  const jobHits = ['stop', 'job', 'client', 'time', 'address', 'site', 'priority'].filter((k) => headerStr.includes(k)).length;
  const workerHits = ['employee', 'worker', 'phone', 'email', 'vehicle', 'plate', 'driver', 'engineer', 'trade'].filter((k) => headerStr.includes(k)).length;

  if (jobHits >= workerHits && jobHits >= 2) return 'jobs';
  if (workerHits > jobHits && workerHits >= 2) return 'workers';
  return jobHits > 0 ? 'jobs' : 'workers';
}

export async function processUploadedFile(
  file: File,
  fallbackDate: string,
  existingWorkers: Worker[]
): Promise<ParsedImportResult> {
  const fileName = file.name;
  const fileSize = file.size;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  const warnings: string[] = [];
  let jobs: Job[] = [];
  let workers: Worker[] = [];
  let settings: Partial<SystemSettings> | undefined = undefined;

  if (ext === 'zip' || file.type.includes('zip')) {
    const zip = new JSZip();
    let loadedZip: JSZip;
    try {
      loadedZip = await zip.loadAsync(file);
    } catch (zipErr: any) {
      warnings.push(`Archive corrupted or unreadable: ${zipErr?.message || zipErr}`);
      return {
        fileName,
        fileType: 'zip',
        fileSize,
        filesInsideZip: [],
        jobs: [],
        workers: [],
        warnings,
      };
    }

    const filesInsideZip: ZipFileEntryDetail[] = [];

    const fileEntries = Object.entries(loadedZip.files).filter(([name, zipEntry]) => {
      if (zipEntry.dir) return false;
      const cleanName = name.replace(/\\/g, '/');
      const baseName = cleanName.split('/').pop() || '';
      if (baseName.startsWith('.') || baseName.startsWith('__MACOSX')) return false;
      if (cleanName.includes('__MACOSX/') || cleanName.includes('.DS_Store')) return false;
      return true;
    });

    fileEntries.sort(([nameA], [nameB]) => {
      const a = nameA.toLowerCase();
      const b = nameB.toLowerCase();
      const aIsWorker = a.includes('worker') || a.includes('personnel') || a.includes('roster') || a.includes('employee');
      const bIsWorker = b.includes('worker') || b.includes('personnel') || b.includes('roster') || b.includes('employee');
      if (aIsWorker && !bIsWorker) return -1;
      if (!aIsWorker && bIsWorker) return 1;
      return nameA.localeCompare(nameB);
    });

    const currentWorkerPool: Worker[] = [...existingWorkers];

    for (const [entryName, zipEntry] of fileEntries) {
      const cleanName = entryName.replace(/\\/g, '/');
      const innerExt = cleanName.split('.').pop()?.toLowerCase() || '';

      if (innerExt === 'json') {
        try {
          const jsonText = await zipEntry.async('text');
          const previewText = jsonText.slice(0, 300);
          const parsed = JSON.parse(jsonText);

          if (parsed && (Array.isArray(parsed.jobs) || Array.isArray(parsed.workers))) {

            const jobCount = Array.isArray(parsed.jobs) ? parsed.jobs.length : 0;
            const workerCount = Array.isArray(parsed.workers) ? parsed.workers.length : 0;
            if (Array.isArray(parsed.workers)) {
              workers.push(...parsed.workers);
              currentWorkerPool.push(...parsed.workers);
            }
            if (Array.isArray(parsed.jobs)) jobs.push(...parsed.jobs);
            if (parsed.settings) settings = parsed.settings;

            filesInsideZip.push({
              name: cleanName,
              size: jsonText.length,
              detectedType: 'state_json',
              recordCount: jobCount + workerCount,
              previewText,
              selected: true,
            });
          } else if (Array.isArray(parsed)) {

            if (parsed.length > 0 && ('code' in parsed[0] || 'timeWindow' in parsed[0])) {
              jobs.push(...parsed);
              filesInsideZip.push({
                name: cleanName,
                size: jsonText.length,
                detectedType: 'jobs_json',
                recordCount: parsed.length,
                previewText,
                selected: true,
              });
            } else if (parsed.length > 0 && ('role' in parsed[0] || 'email' in parsed[0])) {
              workers.push(...parsed);
              currentWorkerPool.push(...parsed);
              filesInsideZip.push({
                name: cleanName,
                size: jsonText.length,
                detectedType: 'workers_json',
                recordCount: parsed.length,
                previewText,
                selected: true,
              });
            } else {
              filesInsideZip.push({
                name: cleanName,
                size: jsonText.length,
                detectedType: 'unknown',
                recordCount: parsed.length,
                previewText,
                selected: false,
              });
            }
          } else if (parsed && parsed.dropdownConfig) {
            settings = parsed;
            filesInsideZip.push({
              name: cleanName,
              size: jsonText.length,
              detectedType: 'state_json',
              recordCount: 1,
              previewText,
              selected: true,
            });
          }
        } catch (err: any) {
          warnings.push(`Could not parse JSON inside zip: ${cleanName} (${err?.message || err})`);
        }
      } else if (innerExt === 'csv' || innerExt === 'txt' || innerExt === 'tsv') {
        try {
          const csvText = await zipEntry.async('text');
          const previewText = csvText.split('\n').slice(0, 4).join('\n');
          const rows = parseCSV(csvText);
          const detected = detectCSVType(rows);
          const embeddedDate = extractDateFromFilename(cleanName);

          const lowerName = cleanName.toLowerCase();
          const isJobFile = detected === 'jobs' || lowerName.includes('job') || lowerName.includes('schedule') || lowerName.includes('route');
          const isWorkerFile = detected === 'workers' || lowerName.includes('worker') || lowerName.includes('personnel') || lowerName.includes('roster') || lowerName.includes('employee');

          if (isJobFile && !isWorkerFile) {
            const parsedJobs = parseJobsFromCSV(rows, fallbackDate, currentWorkerPool, embeddedDate);
            jobs.push(...parsedJobs);
            filesInsideZip.push({
              name: cleanName,
              size: csvText.length,
              detectedType: 'jobs_csv',
              recordCount: parsedJobs.length,
              previewText,
              selected: true,
            });
          } else if (isWorkerFile) {
            const parsedWorkers = parseWorkersFromCSV(rows);
            workers.push(...parsedWorkers);
            currentWorkerPool.push(...parsedWorkers);
            filesInsideZip.push({
              name: cleanName,
              size: csvText.length,
              detectedType: 'workers_csv',
              recordCount: parsedWorkers.length,
              previewText,
              selected: true,
            });
          } else if (lowerName.includes('readme') || lowerName.includes('manifest')) {
            filesInsideZip.push({
              name: cleanName,
              size: csvText.length,
              detectedType: 'manifest',
              recordCount: 0,
              previewText,
              selected: false,
            });
          } else {

            if (rows.length > 1) {
              const parsedJobs = parseJobsFromCSV(rows, fallbackDate, currentWorkerPool, embeddedDate);
              jobs.push(...parsedJobs);
              filesInsideZip.push({
                name: cleanName,
                size: csvText.length,
                detectedType: 'jobs_csv',
                recordCount: parsedJobs.length,
                previewText,
                selected: true,
              });
            } else {
              filesInsideZip.push({
                name: cleanName,
                size: csvText.length,
                detectedType: 'unknown',
                recordCount: 0,
                previewText,
                selected: false,
              });
            }
          }
        } catch (err: any) {
          warnings.push(`Could not parse CSV inside zip: ${cleanName} (${err?.message || err})`);
        }
      } else {
        filesInsideZip.push({
          name: cleanName,
          size: 0,
          detectedType: 'unknown',
          recordCount: 0,
          selected: false,
        });
      }
    }

    const uniqueJobsMap = new Map<string, Job>();
    for (const job of jobs) {
      const key = `${job.code.toLowerCase()}::${job.scheduledDate}`;
      if (!uniqueJobsMap.has(key)) {
        uniqueJobsMap.set(key, job);
      } else {
        const existing = uniqueJobsMap.get(key)!;
        uniqueJobsMap.set(key, {
          ...existing,
          ...job,
          notes: job.notes || existing.notes,
          engineerId: job.engineerId || existing.engineerId,
          driverId: job.driverId || existing.driverId,
        });
      }
    }
    const deduplicatedJobs = Array.from(uniqueJobsMap.values());

    const uniqueWorkersMap = new Map<string, Worker>();
    for (const worker of workers) {
      const key = worker.id || worker.email?.toLowerCase() || worker.name.toLowerCase();
      if (!uniqueWorkersMap.has(key)) {
        uniqueWorkersMap.set(key, worker);
      } else {
        const existing = uniqueWorkersMap.get(key)!;
        uniqueWorkersMap.set(key, {
          ...existing,
          ...worker,
          skills: Array.from(new Set([...(existing.skills || []), ...(worker.skills || [])])),
          notes: worker.notes || existing.notes,
        });
      }
    }
    const deduplicatedWorkers = Array.from(uniqueWorkersMap.values());

    const uniqueDates = Array.from(new Set(deduplicatedJobs.map((j) => j.scheduledDate))).filter(Boolean).sort();
    const validDataFiles = filesInsideZip.filter((f) => f.recordCount > 0).length;

    return {
      fileName,
      fileType: 'zip',
      fileSize,
      filesInsideZip,
      jobs: deduplicatedJobs,
      workers: deduplicatedWorkers,
      settings,
      warnings,
      stats: {
        totalFilesScanned: filesInsideZip.length,
        validDataFiles,
        uniqueDatesFound: uniqueDates,
        jobsCreated: deduplicatedJobs.length,
        workersCreated: deduplicatedWorkers.length,
      },
    };
  }

  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
    const text = await file.text();
    const rows = parseCSV(text);
    const detected = detectCSVType(rows);

    if (detected === 'jobs') {
      jobs = parseJobsFromCSV(rows, fallbackDate, existingWorkers);
    } else {
      workers = parseWorkersFromCSV(rows);
    }

    return {
      fileName,
      fileType: 'csv',
      fileSize,
      jobs,
      workers,
      warnings,
    };
  }

  if (ext === 'json') {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (parsed && (Array.isArray(parsed.jobs) || Array.isArray(parsed.workers))) {
        if (Array.isArray(parsed.jobs)) jobs = parsed.jobs;
        if (Array.isArray(parsed.workers)) workers = parsed.workers;
        if (parsed.settings) settings = parsed.settings;
      } else if (Array.isArray(parsed)) {
        if (parsed.length > 0 && ('code' in parsed[0] || 'timeWindow' in parsed[0])) {
          jobs = parsed;
        } else if (parsed.length > 0 && ('role' in parsed[0] || 'email' in parsed[0])) {
          workers = parsed;
        }
      } else if (parsed && parsed.dropdownConfig) {
        settings = parsed;
      }
    } catch (err: any) {
      warnings.push(`Invalid JSON format: ${err?.message || err}`);
    }

    return {
      fileName,
      fileType: 'json',
      fileSize,
      jobs,
      workers,
      settings,
      warnings,
    };
  }

  warnings.push(`Unsupported file extension '.${ext}'. Please upload .zip, .csv, or .json files.`);
  return {
    fileName,
    fileType: 'csv',
    fileSize,
    jobs: [],
    workers: [],
    warnings,
  };
}

export async function createFullDatabaseZip(
  jobs: Job[],
  workers: Worker[],
  settings: SystemSettings,
  selectedDate: string
): Promise<Blob> {
  const zip = new JSZip();

  const dayJobs = jobs
    .filter((j) => j.scheduledDate === selectedDate)
    .sort((a, b) => (a.timeWindow?.start || '').localeCompare(b.timeWindow?.start || '') || a.code.localeCompare(b.code));
  const jobHeaders = [
    'Job Code',
    'Time Window',
    'Title',
    'Client',
    'Site Name',
    'Address',
    'Zone',
    'Specialists',
    'Transit Mode',
    'Drivers / Vehicles',
    'Priority',
    'Status',
    'Estimated Hours',
    'Scheduled Date',
    'Notes',
  ];

  const jobRows = dayJobs.map((j) => {
    const specIds = Array.from(new Set([...(j.specialistIds || []), ...(j.engineerId ? [j.engineerId] : [])]));
    const specNames = specIds.map(id => workers.find(w => w.id === id)?.name).filter(Boolean).join('; ') || 'Unassigned';

    const drvIds = Array.from(new Set([...(j.driverIds || []), ...(j.driverId ? [j.driverId] : [])]));
    const drvDetails = drvIds.map(id => {
      const d = workers.find(w => w.id === id);
      return d ? `${d.name} (${d.vehicleInfo?.plate || 'Van'})` : null;
    }).filter(Boolean).join('; ') || (j.transitMode === 'public_transport' ? 'Public Transit' : 'None');

    const displayStatus = getDisplayJobStatus(j.status, settings.dropdownConfig?.jobStatuses);

    return [
      `"${j.code}"`,
      `"${j.timeWindow.start} - ${j.timeWindow.end}"`,
      `"${j.title.replace(/"/g, '""')}"`,
      `"${j.clientName.replace(/"/g, '""')}"`,
      `"${j.siteLocation.name.replace(/"/g, '""')}"`,
      `"${j.siteLocation.address.replace(/"/g, '""')}"`,
      `"${j.siteLocation.zone.replace(/"/g, '""')}"`,
      `"${specNames.replace(/"/g, '""')}"`,
      `"${j.transitMode || 'driver'}"`,
      `"${drvDetails.replace(/"/g, '""')}"`,
      `"${j.priority}"`,
      `"${displayStatus}"`,
      j.estimatedDurationHours,
      `"${j.scheduledDate}"`,
      `"${(j.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });
  const scheduleCsv = [jobHeaders.join(','), ...jobRows].join('\n');
  zip.file(`daily_schedule_${selectedDate}.csv`, scheduleCsv);

  const workerHeaders = [
    'Worker ID',
    'Name',
    'Role',
    'Role Title',
    'Status',
    'Phone',
    'Email',
    'Location',
    'Vehicle Model',
    'Vehicle Plate',
    'Skills',
    'Notes',
  ];
  const workerRows = workers.map((w) => [
    `"${w.id}"`,
    `"${w.name.replace(/"/g, '""')}"`,
    `"${w.role}"`,
    `"${(w.roleTitle || '').replace(/"/g, '""')}"`,
    `"${w.status}"`,
    `"${w.phone}"`,
    `"${w.email}"`,
    `"${(w.locationName || '').replace(/"/g, '""')}"`,
    `"${(w.vehicleInfo?.model || '').replace(/"/g, '""')}"`,
    `"${(w.vehicleInfo?.plate || '').replace(/"/g, '""')}"`,
    `"${(w.skills || []).join('; ').replace(/"/g, '""')}"`,
    `"${(w.notes || '').replace(/"/g, '""')}"`,
  ].join(','));
  const rosterCsv = [workerHeaders.join(','), ...workerRows].join('\n');
  zip.file('field_personnel_roster.csv', rosterCsv);

  const stateBackup = {
    exportDate: new Date().toISOString(),
    selectedDate,
    jobs,
    workers,
    settings,
  };
  zip.file('system_backup_state.json', JSON.stringify(stateBackup, null, 2));

  zip.file('all_jobs_database.json', JSON.stringify(jobs, null, 2));

  zip.file('field_personnel_roster.json', JSON.stringify(workers, null, 2));

  const readme = `Field Operations System Data Archive
Generated: ${new Date().toLocaleString()}
Selected Date: ${selectedDate}

CONTENTS OF THIS ZIP ARCHIVE:
- daily_schedule_${selectedDate}.csv: Tabular CSV spreadsheet of daily appointments and routes.
- field_personnel_roster.csv: Complete list of field specialists (Engineers, Welders, Plumbers) and Fleet Drivers.
- all_jobs_database.json: Full relational jobs dataset with coordinates and notes.
- field_personnel_roster.json: Full personnel objects with vehicle and skill specs.
- system_backup_state.json: Full database snapshot for 1-click restore.

HOW TO IMPORT THIS BACKUP:
You can drop this .zip file directly into the "Import File & ZIP" modal in FieldOps to restore or merge your dataset at any time!
`;
  zip.file('README_MANIFEST.txt', readme);

  return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

export function getSampleJobsCSV(date: string): string {
  return `Job Code,Time Window,Title,Client,Site Location,Address,Zone,Specialist,Driver,Priority,Status,Estimated Hours,Date,Notes
JOB-5001,08:30 AM - 11:00 AM,Fiber Optical Gateway Termination,Pacific Tech Corp,Harbour Tech Center,450 Terminal Way,East Harbour,Elena Rostova,Carlos Mendez,urgent,scheduled,2.5,${date},Check grounding busbar
JOB-5002,11:30 AM - 02:00 PM,High-Pressure Chilled Water Pipe Weld,BioMed Research Labs,West Campus Facility,1200 Innovation Drive,North Industrial,Aria Kim,Public Transit,high,scheduled,2.5,${date},ASME Section IX cert required
JOB-5003,02:30 PM - 05:00 PM,Industrial Backflow Valve Assembly,City Waterworks District,Reservoir Pumping Stn 4,88 Ridge Road,West Valley,Tariq Al-Mansoor,Public Transit,normal,scheduled,2.5,${date},Verify double check detector loop
`;
}

export function getSamplePersonnelCSV(): string {
  return `Name,Role,Role Title,Status,Phone,Email,Location,Vehicle Model,Vehicle Plate,Skills,Notes
Sarah Jenkins,engineer,Senior Instrumentation Specialist,available,+1 (555) 349-1100,sarah.jenkins@fieldops.io,Central Depot,,,SCADA RTU; Calibration; PLC,Lead automation troubleshooter
James MacIntyre,welder,Certified Structural & Pipe Welder,available,+1 (555) 482-9011,james.macintyre@fieldops.io,North Depot,,,MIG/TIG Welding; Pipe Fitting; ASME IX,Mobile welding rig equipped
Elena Gomez,plumber,Master Commercial Plumber,available,+1 (555) 670-3344,elena.gomez@fieldops.io,Central Depot,,,Backflow Testing; Boiler Systems; Copper,Commercial hydraulics certified
David Vance,driver,Fleet Heavy Logistics Driver,available,+1 (555) 799-2233,david.vance@fieldops.io,Central Loading Dock,Ford F-450 Super Duty,FLT-808,Heavy Towing; Hazmat Cert,Authorized for crane utility trailer
`;
}
