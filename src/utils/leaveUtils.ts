import { Worker } from '../types';

export interface EffectiveLeaveInfo {
  isOnLeave: boolean;
  effectiveStartDate?: string;
  effectiveReturnDate?: string;
  daysUntilLeave?: number;
  daysUntilReturn?: number;
  isRecurringYearly: boolean;
}

export function formatLeaveDuration(days: number): string {
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  const remDays = days % 30;
  if (remDays === 0) return `${months} mo`;
  return `${months} mo ${remDays}d`;
}

export function getEffectiveLeaveInfo(worker: Worker, targetDateStr?: string): EffectiveLeaveInfo {
  const targetDate = targetDateStr ? new Date(targetDateStr + 'T00:00:00') : new Date();
  targetDate.setHours(0, 0, 0, 0);
  const targetYear = targetDate.getFullYear();
  const targetTime = targetDate.getTime();

  const isRecurring = Boolean(worker.leaveRecurringYearly);
  const rawStart = worker.leaveStartDate;
  const rawReturn = worker.leaveReturnDate;

  if (!rawStart && !rawReturn) {
    return {
      isOnLeave: worker.status === 'on_leave',
      isRecurringYearly: isRecurring,
    };
  }

  let effStartStr = rawStart;
  let effReturnStr = rawReturn;

  if (isRecurring) {

    if (rawStart) {
      const parts = rawStart.split('-');
      if (parts.length === 3) {
        effStartStr = `${targetYear}-${parts[1]}-${parts[2]}`;
      }
    }
    if (rawReturn) {
      const parts = rawReturn.split('-');
      if (parts.length === 3) {
        let retYear = targetYear;
        if (rawStart) {
          const sParts = rawStart.split('-');

          if (parts[1] < sParts[1] || (parts[1] === sParts[1] && parts[2] < sParts[2])) {
            retYear = targetYear + 1;
          }
        }
        effReturnStr = `${retYear}-${parts[1]}-${parts[2]}`;
      }
    }

    if (effReturnStr) {
      const returnTime = new Date(effReturnStr + 'T00:00:00').getTime();
      if (targetTime > returnTime) {

        if (rawStart) {
          const parts = rawStart.split('-');
          if (parts.length === 3) {
            effStartStr = `${targetYear + 1}-${parts[1]}-${parts[2]}`;
          }
        }
        if (rawReturn) {
          const parts = rawReturn.split('-');
          if (parts.length === 3) {
            let retYear = targetYear + 1;
            if (rawStart) {
              const sParts = rawStart.split('-');
              if (parts[1] < sParts[1] || (parts[1] === sParts[1] && parts[2] < sParts[2])) {
                retYear = targetYear + 2;
              }
            }
            effReturnStr = `${retYear}-${parts[1]}-${parts[2]}`;
          }
        }
      }
    }
  }

  let isOnLeave = worker.status === 'on_leave';
  let daysUntilLeave: number | undefined;
  let daysUntilReturn: number | undefined;

  const startDateObj = effStartStr ? new Date(effStartStr + 'T00:00:00') : undefined;
  const returnDateObj = effReturnStr ? new Date(effReturnStr + 'T00:00:00') : undefined;

  if (startDateObj && returnDateObj) {
    if (targetTime >= startDateObj.getTime() && targetTime <= returnDateObj.getTime()) {
      isOnLeave = true;
    }
  } else if (startDateObj && !returnDateObj) {
    if (targetTime >= startDateObj.getTime()) {
      isOnLeave = true;
    }
  }

  if (startDateObj) {
    const diff = Math.ceil((startDateObj.getTime() - targetTime) / (1000 * 60 * 60 * 24));
    if (diff > 0) {
      daysUntilLeave = diff;
    }
  }

  if (returnDateObj) {
    const diff = Math.ceil((returnDateObj.getTime() - targetTime) / (1000 * 60 * 60 * 24));
    if (diff >= 0) {
      daysUntilReturn = diff;
    }
  }

  return {
    isOnLeave,
    effectiveStartDate: effStartStr,
    effectiveReturnDate: effReturnStr,
    daysUntilLeave,
    daysUntilReturn,
    isRecurringYearly: isRecurring,
  };
}
