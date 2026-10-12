import { Job, JobStatus, TimeWindow } from '../types';

export interface TimeWindowDisplay {
  commuteStart: string;
  commuteStartFull: string;
  spentLabel: string;
  spentHours: number;
  spentMinutes: number;
  totalMinutes: number;
  status: JobStatus;
  isFinished: boolean;
  badgeText: string;
}

export function formatTimeToAMPM(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '09:00 AM';

  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
  const formattedMins = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${formattedHours}:${formattedMins} ${ampm}`;
}

export function parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return { hours, minutes };
}

export function formatDurationToHrMm(totalMinutes: number, suffix = 'spent'): string {
  const safeMins = Math.max(0, Math.round(totalMinutes));
  const hrs = Math.floor(safeMins / 60);
  const mins = safeMins % 60;
  const paddedMins = mins < 10 ? `0${mins}` : `${mins}`;
  return `${hrs} hr ${paddedMins} mm ${suffix}`.trim();
}

export function calculateMinutesDifference(
  startTimeIsoOrStr: string,
  endTimeIsoOrStr: string,
  scheduledDate?: string
): number {

  const startDate = new Date(startTimeIsoOrStr);
  const endDate = new Date(endTimeIsoOrStr);

  if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
    const diffMs = endDate.getTime() - startDate.getTime();
    return Math.max(1, Math.round(diffMs / (1000 * 60)));
  }

  const startParsed = parseTimeString(startTimeIsoOrStr);
  const endParsed = parseTimeString(endTimeIsoOrStr);

  if (startParsed && endParsed) {
    const startMins = startParsed.hours * 60 + startParsed.minutes;
    let endMins = endParsed.hours * 60 + endParsed.minutes;
    if (endMins < startMins) endMins += 24 * 60;
    return Math.max(1, endMins - startMins);
  }

  return 120;
}

export function getTimeWindowDisplay(job: Job): TimeWindowDisplay {
  const status = job.status || '';
  const statusLower = status.toLowerCase();
  const isCompleted = statusLower.includes('completed') || statusLower === 'done';
  const isCancelled = statusLower.includes('cancelled') || statusLower.includes('cancel');
  const isFinished = isCompleted || isCancelled;

  let commuteStart = '09:00 AM';
  if (job.commuteStartedAt) {
    commuteStart = formatTimeToAMPM(job.commuteStartedAt);
  } else if (job.timeWindow?.start) {
    commuteStart = job.timeWindow.start;
  }

  let totalMinutes = 0;
  let spentLabel = '';

  if (isCompleted) {
    if (job.timeSpent && !job.timeSpent.includes('in progress')) {
      spentLabel = job.timeSpent;
      const match = job.timeSpent.match(/(\d+)\s*hr\s*(\d+)\s*mm/i);
      if (match) {
        totalMinutes = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
      }
    } else if (job.completedAt && job.commuteStartedAt) {
      totalMinutes = calculateMinutesDifference(job.commuteStartedAt, job.completedAt, job.scheduledDate);
      spentLabel = formatDurationToHrMm(totalMinutes, 'spent');
    } else if (job.timeWindow?.start && job.timeWindow?.end && !job.timeWindow.end.includes('spent')) {
      totalMinutes = calculateMinutesDifference(job.timeWindow.start, job.timeWindow.end, job.scheduledDate);
      spentLabel = formatDurationToHrMm(totalMinutes, 'spent');
    } else if (job.timeWindow?.end && job.timeWindow.end.includes('spent')) {
      spentLabel = job.timeWindow.end;
      const match = job.timeWindow.end.match(/(\d+)\s*hr\s*(\d+)\s*mm/i);
      if (match) {
        totalMinutes = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
      }
    } else {
      const estHours = job.estimatedDurationHours || 2.5;
      totalMinutes = Math.round(estHours * 60);
      spentLabel = formatDurationToHrMm(totalMinutes, 'spent');
    }
  } else if (isCancelled) {
    if (job.timeSpent) {
      spentLabel = job.timeSpent.includes('Cancelled') ? job.timeSpent : `${job.timeSpent} (Cancelled)`;
      const match = job.timeSpent.match(/(\d+)\s*hr\s*(\d+)\s*mm/i);
      if (match) {
        totalMinutes = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
      }
    } else if (job.cancelledAt && job.commuteStartedAt) {
      totalMinutes = calculateMinutesDifference(job.commuteStartedAt, job.cancelledAt, job.scheduledDate);
      spentLabel = `${formatDurationToHrMm(totalMinutes, 'spent')} (Cancelled)`;
    } else if (job.cancelledAt && job.timeWindow?.start) {

      totalMinutes = 45;
      spentLabel = `${formatDurationToHrMm(totalMinutes, 'spent')} (Cancelled)`;
    } else {
      totalMinutes = 60;
      spentLabel = `1 hr 00 mm spent (Cancelled)`;
    }
  } else if (statusLower.includes('route') || statusLower.includes('site') || statusLower.includes('progress') || statusLower.includes('transit')) {

    if (job.commuteStartedAt) {
      const startMs = new Date(job.commuteStartedAt).getTime();
      const nowMs = Date.now();
      const elapsedMins = !isNaN(startMs) ? Math.max(1, Math.round((nowMs - startMs) / 60000)) : 45;

      totalMinutes = Math.min(elapsedMins, 720);
      spentLabel = `${formatDurationToHrMm(totalMinutes, 'active')}`;
    } else {

      const estHours = job.estimatedDurationHours || 2.0;
      totalMinutes = Math.round(estHours * 30);
      spentLabel = `${formatDurationToHrMm(totalMinutes, 'active')}`;
    }
  } else {

    const estHours = job.estimatedDurationHours || 2.5;
    totalMinutes = Math.round(estHours * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    spentLabel = `Est. ${hrs} hr ${mins < 10 ? '0' : ''}${mins} mm`;
  }

  const spentHours = Math.floor(totalMinutes / 60);
  const spentMinutes = totalMinutes % 60;

  return {
    commuteStart,
    commuteStartFull: `Commute: ${commuteStart}`,
    spentLabel,
    spentHours,
    spentMinutes,
    totalMinutes,
    status,
    isFinished,
    badgeText: isCompleted ? 'Completed' : isCancelled ? 'Cancelled' : statusLower === 'en_route' ? 'In Transit' : status,
  };
}

export function getJobStatusTransitionUpdates(
  job: Job,
  newStatus: JobStatus,
  nowIso = new Date().toISOString()
): Partial<Job> {
  const updates: Partial<Job> = {
    status: newStatus,
  };

  let commuteStartedAt = job.commuteStartedAt;
  const statusLower = (newStatus || '').toLowerCase();
  const isCompleted = statusLower.includes('completed') || statusLower === 'done';
  const isCancelled = statusLower.includes('cancelled') || statusLower.includes('cancel');
  const isActive = statusLower.includes('route') || statusLower.includes('site') || statusLower.includes('progress') || statusLower.includes('transit');

  if (!commuteStartedAt) {
    if (isActive) {
      commuteStartedAt = nowIso;
      updates.commuteStartedAt = nowIso;
    } else if (isCompleted || isCancelled) {

      const estHours = job.estimatedDurationHours || 2;
      const priorMs = Date.now() - Math.round(estHours * 3600000);
      commuteStartedAt = new Date(priorMs).toISOString();
      updates.commuteStartedAt = commuteStartedAt;
    }
  }

  const commuteStartTimeStr = commuteStartedAt ? formatTimeToAMPM(commuteStartedAt) : (job.timeWindow?.start || '09:00 AM');

  if (isCompleted) {
    updates.completedAt = nowIso;
    const diffMs = Math.max(60000, new Date(nowIso).getTime() - new Date(commuteStartedAt || nowIso).getTime());
    const totalMinutes = Math.round(diffMs / 60000);
    const spentStr = formatDurationToHrMm(totalMinutes, 'spent');
    updates.timeSpent = spentStr;
    updates.timeWindow = {
      start: commuteStartTimeStr,
      end: spentStr,
    };
  } else if (isCancelled) {
    updates.cancelledAt = nowIso;
    const diffMs = Math.max(60000, new Date(nowIso).getTime() - new Date(commuteStartedAt || nowIso).getTime());
    const totalMinutes = Math.round(diffMs / 60000);
    const spentStr = `${formatDurationToHrMm(totalMinutes, 'spent')} (Cancelled)`;
    updates.timeSpent = spentStr;
    updates.timeWindow = {
      start: commuteStartTimeStr,
      end: spentStr,
    };
  } else if (statusLower.includes('route') || statusLower.includes('transit')) {
    updates.commuteStartedAt = commuteStartedAt || nowIso;
    updates.timeWindow = {
      start: formatTimeToAMPM(updates.commuteStartedAt),
      end: job.timeWindow?.end || '01:00 PM',
    };
  }

  return updates;
}
