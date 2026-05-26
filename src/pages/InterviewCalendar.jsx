import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, Video, PhoneCall, Building2, Wrench, Users2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import SubmissionDrawer from '../components/SubmissionDrawer'

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const TYPE_CONFIG = {
  phone:     { label: 'Phone',     color: 'bg-sky-100 text-sky-700 border-sky-200',           icon: PhoneCall },
  video:     { label: 'Video',     color: 'bg-violet-100 text-violet-700 border-violet-200',  icon: Video },
  onsite:    { label: 'Onsite',    color: 'bg-amber-100 text-amber-700 border-amber-200',     icon: Building2 },
  technical: { label: 'Technical', color: 'bg-rose-100 text-rose-700 border-rose-200',        icon: Wrench },
  hr:        { label: 'HR',        color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Users2 },
}

const OUTCOME_DOT = {
  pending: 'bg-gray-400',
  pass:    'bg-emerald-500',
  fail:    'bg-red-500',
  hold:    'bg-amber-400',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCalendarWeeks(year, month) {
  // Week starts Monday: Mon=0, ..., Sun=6
  const firstDay   = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7 // convert Sun=0 → Mon=0

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  const trailing = (7 - (cells.length % 7)) % 7
  for (let i = 0; i < trailing; i++) cells.push(null)

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

function isToday(year, month, day) {
  const t = new Date()
  return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day
}

// ─── Event pill ───────────────────────────────────────────────────────────────

function EventPill({ round, onClick }) {
  const cfg  = TYPE_CONFIG[round.type] ?? TYPE_CONFIG.video
  const Icon = cfg.icon
  const name = round.submissions?.candidates?.full_name ?? 'Candidate'
  const time = new Date(round.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-1.5 py-0.5 rounded text-xs font-medium border flex items-center gap-1 truncate hover:opacity-80 transition-opacity ${cfg.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${OUTCOME_DOT[round.outcome] ?? 'bg-gray-400'}`} />
      <span className="truncate">{time} {name}</span>
    </button>
  )
}

// ─── Day cell ─────────────────────────────────────────────────────────────────

function DayCell({ day, year, month, events, onEventClick }) {
  const today = day && isToday(year, month, day)

  return (
    <div className={`min-h-[90px] border-r border-b border-gray-100 p-1.5 ${day ? 'bg-white' : 'bg-gray-50/50'}`}>
      {day && (
        <>
          <span className={`text-xs font-semibold mb-1 inline-flex w-6 h-6 items-center justify-center rounded-full ${
            today ? 'bg-brand-600 text-white' : 'text-gray-600'
          }`}>
            {day}
          </span>
          <div className="space-y-0.5">
            {(events ?? []).slice(0, 3).map(r => (
              <EventPill key={r.id} round={r} onClick={() => onEventClick(r)} />
            ))}
            {(events ?? []).length > 3 && (
              <p className="text-xs text-gray-400 pl-1">+{events.length - 3} more</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Detail sidebar ───────────────────────────────────────────────────────────

function DaySidebar({ day, month, year, events, onEventClick, onClose }) {
  if (!events || events.length === 0) return null

  const dateStr = new Date(year, month, day).toLocaleDateString('en-IN', { weekday: 'long', dateStyle: 'long' })

  return (
    <div className="absolute right-0 top-0 w-72 bg-white border-l border-gray-200 h-full shadow-lg z-10 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-800">{dateStr}</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
      </div>
      <div className="divide-y divide-gray-100">
        {events.map(r => {
          const cfg  = TYPE_CONFIG[r.type] ?? TYPE_CONFIG.video
          const Icon = cfg.icon
          const sub  = r.submissions
          const time = new Date(r.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
          return (
            <button
              key={r.id}
              onClick={() => onEventClick(r)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                  <Icon size={10} /> {cfg.label}
                </span>
                <span className="text-xs text-gray-400">{time}</span>
              </div>
              <p className="text-sm font-medium text-gray-800">{sub?.candidates?.full_name ?? '—'}</p>
              <p className="text-xs text-gray-400">{sub?.jobs?.title ?? '—'}</p>
              {r.interviewer && <p className="text-xs text-gray-400 mt-0.5">with {r.interviewer}</p>}
              <div className="flex items-center gap-1 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${OUTCOME_DOT[r.outcome]}`} />
                <span className="text-xs text-gray-500 capitalize">{r.outcome}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InterviewCalendar() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [rounds, setRounds]             = useState([])
  const [loading, setLoading]           = useState(true)
  const [drawerSub, setDrawerSub]       = useState(null)
  const [selectedDay, setSelectedDay]   = useState(null)

  const year  = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const weeks = buildCalendarWeeks(year, month)

  const load = useCallback(async () => {
    setLoading(true)
    const start = new Date(year, month, 1).toISOString()
    const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

    const { data } = await supabase
      .from('interview_rounds')
      .select('*, submissions(id, stage, submitted_by, job_id, candidate_id, candidates(*), jobs(id, title))')
      .gte('scheduled_at', start)
      .lte('scheduled_at', end)
      .order('scheduled_at', { ascending: true })

    setRounds(data ?? [])
    setLoading(false)
  }, [year, month])

  useEffect(() => { load() }, [load])

  // Group rounds by day-of-month
  const byDay = {}
  for (const r of rounds) {
    const d = new Date(r.scheduled_at).getDate()
    if (!byDay[d]) byDay[d] = []
    byDay[d].push(r)
  }

  function prevMonth() { setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function nextMonth() { setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }

  function handleEventClick(round) {
    if (round.submissions) setDrawerSub(round.submissions)
  }

  function handleDayCellClick(day) {
    if (!day || !byDay[day]) return
    setSelectedDay(day === selectedDay ? null : day)
  }

  const totalThisMonth = rounds.length
  const pendingCount   = rounds.filter(r => r.outcome === 'pending').length

  return (
    <div className="space-y-5 relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Interview Calendar</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalThisMonth} interview{totalThisMonth !== 1 ? 's' : ''} this month
            {pendingCount > 0 && ` · ${pendingCount} pending`}
          </p>
        </div>

        {/* Legend */}
        <div className="hidden md:flex items-center gap-3">
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon
            return (
              <span key={key} className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
                <Icon size={10} /> {cfg.label}
              </span>
            )
          })}
        </div>
      </div>

      {/* Calendar card */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden relative">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
            <ChevronLeft size={16} />
          </button>
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <CalendarDays size={16} className="text-brand-600" />
            {MONTHS[month]} {year}
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
            <ChevronRight size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Weekday header */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {WEEKDAYS.map(d => (
                <div key={d} className="px-2 py-2 text-xs font-semibold text-gray-400 uppercase text-center border-r border-gray-100 last:border-r-0">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div>
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7">
                  {week.map((day, di) => (
                    <div
                      key={di}
                      onClick={() => handleDayCellClick(day)}
                      className={day && byDay[day] ? 'cursor-pointer' : ''}
                    >
                      <DayCell
                        day={day}
                        year={year}
                        month={month}
                        events={byDay[day]}
                        onEventClick={handleEventClick}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Day sidebar (click on day with events) */}
        {selectedDay && byDay[selectedDay] && (
          <DaySidebar
            day={selectedDay}
            month={month}
            year={year}
            events={byDay[selectedDay]}
            onEventClick={round => { setSelectedDay(null); handleEventClick(round) }}
            onClose={() => setSelectedDay(null)}
          />
        )}
      </div>

      {/* Empty state */}
      {!loading && totalThisMonth === 0 && (
        <div className="text-center py-8 text-gray-400">
          <CalendarDays size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">No interviews scheduled this month</p>
          <p className="text-sm mt-1">Open a candidate in the Pipeline and click "Schedule Interview".</p>
        </div>
      )}

      {/* Submission drawer */}
      {drawerSub && (
        <SubmissionDrawer
          submission={drawerSub}
          onClose={() => setDrawerSub(null)}
          onStageChange={() => { setDrawerSub(null); load() }}
        />
      )}
    </div>
  )
}
