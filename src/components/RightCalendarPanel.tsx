import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Job, JobStatus } from '../types';
import { JobInteractionModal } from './JobInteractionModal';
import { getDisplayJobStatus } from '../utils/statusUtils';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Building2,
  User,
  Truck,
  Plus,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export const RightCalendarPanel: React.FC = () => {
  const {
    jobs,
    workers,
    selectedDate,
    setSelectedDate,
    dateScope,
    setDateScope,
    todayDate,
    goToToday,
    isCalendarOpen,
    setIsCalendarOpen,
    setIsAddJobOpen,
    updateJobStatus,
    settings,
  } = useApp();

  
  const initialDate = new Date(selectedDate || todayDate || '2026-09-12T00:00:00');
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(
    isNaN(initialDate.getTime()) ? new Date(2026, 8, 1) : new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  );
  const [selectedJobForModal, setSelectedJobForModal] = useState<Job | null>(null);

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth(); 

  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthTitle = `${monthNames[month]} ${year}`;

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  
  useEffect(() => {
    if (selectedDate) {
      const parts = selectedDate.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        setCurrentMonthDate(new Date(parts[0], parts[1] - 1, 1));
      }
    }
  }, [selectedDate]);

  const handleJumpToToday = () => {
    goToToday();
    setDateScope('selected');
    const today = new Date(todayDate + 'T00:00:00');
    if (!isNaN(today.getTime())) {
      setCurrentMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    }
  };

  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const firstDayIndex = new Date(year, month, 1).getDay();

  
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  const NIGERIA_HOLIDAYS: Record<string, string> = {
    '01-01': "New Year's Day",
    '05-01': "Workers' Day",
    '06-12': "Democracy Day",
    '10-01': "Independence Day",
    '12-25': "Christmas Day",
    '12-26': "Boxing Day",
    
    '04-03': "Good Friday",
    '04-06': "Easter Monday",
    '03-20': "Eid al-Fitr (Est)",
    '05-27': "Children's Day / Eid al-Adha",
  };

  
  const calendarCells = [];
  
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  
  for (let d = 1; d <= daysInMonth; d++) {
    const monthPad = pad(month + 1);
    const dayPad = pad(d);
    const dateString = `${year}-${monthPad}-${dayPad}`;
    const holidayName = NIGERIA_HOLIDAYS[`${monthPad}-${dayPad}`];
    
    calendarCells.push({
      dayNumber: d,
      dateString,
      isToday: dateString === todayDate,
      isSelected: dateString === selectedDate,
      jobCount: jobs.filter((j) => j.scheduledDate === dateString).length,
      holidayName,
    });
  }

  
  const selectedDayJobs = (dateScope === 'all'
    ? [...jobs].sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || '') || (a.timeWindow?.start || '').localeCompare(b.timeWindow?.start || '') || a.code.localeCompare(b.code))
    : jobs.filter((j) => j.scheduledDate === selectedDate).sort((a, b) => (a.timeWindow?.start || '').localeCompare(b.timeWindow?.start || '') || a.code.localeCompare(b.code))
  );

  
  const todayJobs = jobs.filter((j) => j.scheduledDate === todayDate);
  const todayOnSite = todayJobs.filter((j) => j.status === 'on_site').length;
  const todayCompleted = todayJobs.filter((j) => j.status === 'completed').length;

  const isViewingToday = selectedDate === todayDate;

  
  let selectedHoliday = null;
  if (selectedDate) {
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      const mmdd = `${parts[1]}-${parts[2]}`;
      selectedHoliday = NIGERIA_HOLIDAYS[mmdd] || null;
    }
  }

  
  const formatHumanDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  if (!isCalendarOpen) {
    return (
      <aside className="shrink-0">
        <button
          id="btn-expand-calendar"
          onClick={() => setIsCalendarOpen(true)}
          className="bg-white border border-slate-300 hover:border-[#107c41] rounded-lg p-2.5 shadow-xs hover:shadow-md transition-all flex flex-col items-center gap-2 text-slate-700 hover:text-emerald-800 group"
          title="Open Calendar (Indicating TODAY)"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-300 flex items-center justify-center text-[#107c41] group-hover:bg-[#107c41] group-hover:text-white transition-colors">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold writing-mode-vertical uppercase tracking-wider text-slate-600 group-hover:text-emerald-900">
            Calendar
          </span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300 animate-pulse">
            TODAY
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {todayDate.slice(5)}
          </span>
        </button>
      </aside>
    );
  }

  return (
    <aside
      id="right-calendar-panel"
      className="w-full lg:w-[320px] shrink-0 bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden select-none flex flex-col"
    >
      
      <div className="bg-slate-100/90 border-b border-slate-300 px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#107c41] text-white flex items-center justify-center shadow-xs">
            <CalendarIcon className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-slate-900 leading-tight">
              Calendar
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              {formatHumanDate(selectedDate)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!isViewingToday && (
            <button
              id="btn-jump-to-today"
              onClick={handleJumpToToday}
              className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50 transition-colors shadow-2xs"
              title="Jump to today"
            >
              Today
            </button>
          )}

          
          <button
            onClick={() => setIsCalendarOpen(false)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            title="Close calendar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      
      <div className="px-3 pt-2.5 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded hover:bg-slate-100 text-slate-600 border border-slate-200"
            title="Previous month"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-bold text-slate-800 px-1.5">
            {monthTitle}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded hover:bg-slate-100 text-slate-600 border border-slate-200"
            title="Next month"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        
        <button
          onClick={handleJumpToToday}
          className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 px-1.5 py-0.5 rounded border border-emerald-300 hover:bg-emerald-50 transition-colors"
          title="Jump to TODAY"
        >
          TODAY
        </button>
      </div>

      
      <div className="p-3 pt-1">
        
        <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 mb-1">
          <span className="text-red-500 font-extrabold">Su</span>
          <span>Mo</span>
          <span>Tu</span>
          <span>We</span>
          <span>Th</span>
          <span>Fr</span>
          <span>Sa</span>
        </div>

        
        <div className="grid grid-cols-7 gap-1 text-xs">
          {calendarCells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="h-8" />;
            }
            
            const isSunday = idx % 7 === 0;
            const { dayNumber, dateString, isToday, isSelected, jobCount, holidayName } = cell;
            
            return (
              <button
                key={dateString}
                id={`calendar-day-${dateString}`}
                onClick={() => {
                  setSelectedDate(dateString);
                  setDateScope('selected');
                }}
                className={`h-8 rounded relative flex flex-col items-center justify-center transition-all ${
                  isSelected && dateScope === 'selected'
                    ? 'bg-[#107c41] text-white font-bold shadow-xs'
                    : isToday
                    ? 'bg-emerald-50/90 text-emerald-900 font-bold border-2 border-[#107c41]'
                    : holidayName
                    ? 'bg-green-100/50 text-green-800 border border-green-200 hover:bg-green-100 font-bold'
                    : isSunday
                    ? 'text-red-600 hover:bg-red-50 font-medium'
                    : 'text-slate-700 hover:bg-slate-100 font-medium'
                }`}
                title={`${dateString}${isToday ? ' (TODAY)' : ''}${holidayName ? ` - ${holidayName}` : ''} - ${jobCount} appointments`}
              >
                
                <span className="text-[11px] leading-none">{dayNumber}</span>

                
                {holidayName && !isToday && !isSelected && (
                  <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-green-500" />
                )}

                
                {isToday && (
                  <span
                    className={`text-[8px] font-extrabold uppercase leading-none mt-0.5 px-0.5 rounded ${
                      isSelected
                        ? 'bg-emerald-800 text-white'
                        : 'bg-[#107c41] text-white'
                    }`}
                  >
                    TODAY
                  </span>
                )}

                
                {!isToday && jobCount > 0 && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      isSelected ? 'bg-white' : 'bg-emerald-600'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      
      <div className="border-t border-slate-200 bg-slate-50/70 p-3 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
            <span>{dateScope === 'all' ? `All Jobs (${selectedDayJobs.length})` : 'Schedule'}</span>
            {dateScope === 'all' ? (
              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold border border-emerald-300">
                All Dates Active
              </span>
            ) : isViewingToday ? (
              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold border border-emerald-300">
                Today
              </span>
            ) : null}
            {selectedHoliday && dateScope !== 'all' && (
              <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 text-[9px] font-bold border border-indigo-300 ml-1">
                🌟 {selectedHoliday}
              </span>
            )}
          </div>
        </div>

        
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
          {selectedDayJobs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded p-3 text-center text-slate-400 text-xs">
              <p className="font-semibold text-slate-600">
                {dateScope === 'all' ? 'No jobs in system' : 'No jobs scheduled'}
              </p>
              {!isViewingToday && dateScope !== 'all' && (
                <button
                  onClick={handleJumpToToday}
                  className="mt-1.5 text-xs font-semibold text-[#107c41] hover:underline inline-flex items-center gap-1"
                >
                  <ArrowRight className="w-3 h-3" />
                  <span>Go to Today</span>
                </button>
              )}
            </div>
          ) : (
            selectedDayJobs.map((job) => {
              const engineer = workers.find((w) => w.id === job.engineerId);
              const driver = workers.find((w) => w.id === job.driverId);
              const jobSpecialists = (job.specialistIds && job.specialistIds.length > 0)
                ? workers.filter(w => job.specialistIds?.includes(w.id))
                : (engineer ? [engineer] : []);

              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJobForModal(job)}
                  className="bg-white border border-slate-200 hover:border-[#107c41] rounded p-2 text-xs cursor-pointer hover:shadow-2xs transition-all group"
                  title="Click to view & interact"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 font-mono font-bold text-slate-800">
                      <span className="text-emerald-800">{job.code}</span>
                      {dateScope === 'all' && (
                        <span className="text-[10px] font-normal text-slate-500 font-sans ml-1">
                          • {job.scheduledDate}
                        </span>
                      )}
                    </div>

                    <select
                      value={getDisplayJobStatus(job.status, settings.dropdownConfig?.jobStatuses)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateJobStatus(job.id, e.target.value as JobStatus);
                      }}
                      aria-label={`Mark status for job ${job.code}`}
                      className={`text-[10px] font-bold rounded px-1.5 py-0.5 border shadow-2xs focus:outline-none cursor-pointer ${
                        job.status.toLowerCase().includes('site')
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-400'
                          : (job.status.toLowerCase().includes('route') || job.status.toLowerCase().includes('transit'))
                          ? 'bg-amber-50 text-amber-900 border-amber-400'
                          : job.status.toLowerCase().includes('complete')
                          ? 'bg-purple-50 text-purple-900 border-purple-400'
                          : job.status.toLowerCase().includes('cancel')
                          ? 'bg-rose-50 text-rose-900 border-rose-300'
                          : 'bg-blue-50 text-blue-900 border-blue-300'
                      }`}
                    >
                      {(settings.dropdownConfig?.jobStatuses || ['Scheduled', 'In Transit', 'On Site', 'Completed', 'Cancelled']).map(st => (
                        <option key={st} value={st}>
                          {st.toLowerCase().includes('complete') ? '✅ ' : st.toLowerCase().includes('transit') || st.toLowerCase().includes('route') ? '🚚 ' : st.toLowerCase().includes('site') ? '📍 ' : st.toLowerCase().includes('cancel') ? '❌ ' : '🕒 '}
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="font-semibold text-slate-900 truncate mt-1 group-hover:text-emerald-900">
                    {job.title}
                  </div>

                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {job.clientName} • {job.siteLocation.name}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1 pt-1 border-t border-slate-100">
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5 text-slate-400" />
                      {job.timeWindow.start}
                    </span>
                    <span className="truncate max-w-[150px]" title={jobSpecialists.map(s => s.name).join(', ')}>
                      {jobSpecialists.length > 1
                        ? `Crew (${jobSpecialists.length}): ${jobSpecialists.map(s => s.name.split(' ')[0]).join(', ')}`
                        : jobSpecialists.length === 1
                        ? `Spec: ${jobSpecialists[0].name}`
                        : 'Unassigned'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      
      <JobInteractionModal
        job={selectedJobForModal ? jobs.find((j) => j.id === selectedJobForModal.id) || selectedJobForModal : null}
        isOpen={!!selectedJobForModal}
        onClose={() => setSelectedJobForModal(null)}
      />
    </aside>
  );
};
