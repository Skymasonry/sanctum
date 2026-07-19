"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { CalendarEvent } from "@/lib/calendar"
import {
  Calendar, Clock, Plus, X, MapPin, Repeat,
  Video, FileText, ScrollText, MessageCircle, Trash2,
  Folder, ChevronRight, ChevronLeft, Loader2, Pencil, Check,
} from "lucide-react"

interface ChamberLink {
  type: string
  label: string
  url: string
}

interface FileNode {
  id: number
  name: string
  type: "file" | "folder"
  size?: number
  modified?: number
}

interface FormItem {
  id: number
  title: string
}

interface RitesViewProps {
  guildId: string
  guildName: string
  calendarUri: string | undefined
  initialEvents: CalendarEvent[]
  talkRoom?: string
  folderId?: number
  deckBoardId?: number
}

const QUICK_RECURRENCE = [
  { label: "Weekly", value: "FREQ=WEEKLY" },
  { label: "Biweekly", value: "FREQ=WEEKLY;INTERVAL=2" },
  { label: "Monthly", value: "FREQ=MONTHLY" },
]

const RECURRENCE_OPTIONS = [
  { label: "Does not repeat", value: "" },
  { label: "Daily", value: "FREQ=DAILY" },
  { label: "Weekly", value: "FREQ=WEEKLY" },
  { label: "Every 2 weeks", value: "FREQ=WEEKLY;INTERVAL=2" },
  { label: "Monthly", value: "FREQ=MONTHLY" },
  { label: "Yearly", value: "FREQ=YEARLY" },
]

const REMINDER_OPTIONS = [
  { label: "No reminder", value: "" },
  { label: "At time of event", value: "0" },
  { label: "5 minutes before", value: "5" },
  { label: "15 minutes before", value: "15" },
  { label: "30 minutes before", value: "30" },
  { label: "1 hour before", value: "60" },
  { label: "1 day before", value: "1440" },
]

const STATUS_OPTIONS = [
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Tentative", value: "TENTATIVE" },
]

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function recurrenceLabel(rrule: string): string {
  if (rrule.includes("DAILY")) return "Daily"
  if (rrule.includes("INTERVAL=2") && rrule.includes("WEEKLY")) return "Biweekly"
  if (rrule.includes("WEEKLY")) return "Weekly"
  if (rrule.includes("MONTHLY")) return "Monthly"
  if (rrule.includes("YEARLY")) return "Yearly"
  return "Repeating"
}

function toLocalDate(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

/* ── File Picker ── */
function FilePicker({ folderId, onSelect, onClose }: { folderId: number; onSelect: (f: FileNode) => void; onClose: () => void }) {
  const [files, setFiles] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(true)
  const [currentFolder, setCurrentFolder] = useState(folderId)
  const [folderStack, setFolderStack] = useState<Array<{ id: number; name: string }>>([])
  const fetchFiles = useCallback(async (id: number) => { setLoading(true); try { const r = await fetch(`/api/files/${id}`); if (r.ok) { const d = await r.json(); setFiles(d.files || []) } } catch { setFiles([]) } finally { setLoading(false) } }, [])
  useEffect(() => { fetchFiles(currentFolder) }, [currentFolder, fetchFiles])
  return (
    <div className="rounded-lg border border-gray-dark bg-black-deep p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray">
          {folderStack.length > 0 && <button type="button" onClick={() => { const p = folderStack[folderStack.length - 1]; setFolderStack(folderStack.slice(0, -1)); setCurrentFolder(p.id) }} className="hover:text-guild"><ChevronLeft className="h-4 w-4" /></button>}
          <span className="font-medium text-white">{folderStack.length > 0 ? folderStack[folderStack.length - 1].name : "Archive"}</span>
        </div>
        <button type="button" onClick={onClose} className="text-gray hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      {loading ? <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-gray" /></div>
       : files.length === 0 ? <p className="py-4 text-center text-xs text-gray">No files in this folder</p>
       : <div className="max-h-48 space-y-1 overflow-y-auto">{files.map(f => (
          <button key={f.id} type="button" onClick={() => f.type === "folder" ? (setFolderStack([...folderStack, { id: currentFolder, name: f.name }]), setCurrentFolder(f.id)) : onSelect(f)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-gray transition-colors hover:bg-black-light hover:text-white">
            {f.type === "folder" ? <Folder className="h-3.5 w-3.5 shrink-0 text-guild" /> : <FileText className="h-3.5 w-3.5 shrink-0 text-gray" />}
            <span className="flex-1 truncate">{f.name}</span>
            {f.type === "folder" && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
          </button>))}</div>}
    </div>
  )
}

/* ── Form Picker ── */
function FormPicker({ onSelect, onClose }: { onSelect: (f: FormItem) => void; onClose: () => void }) {
  const [forms, setForms] = useState<FormItem[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { (async () => { try { const [a, b] = await Promise.all([fetch("/api/forms"), fetch("/api/forms/shared")]); const ad = a.ok ? await a.json() : { forms: [] }; const bd = b.ok ? await b.json() : { forms: [] }; const seen = new Set<number>(); setForms([...(ad.forms||[]),...(bd.forms||[])].filter((f:FormItem)=>{if(seen.has(f.id))return false;seen.add(f.id);return true})) } catch { setForms([]) } finally { setLoading(false) } })() }, [])
  return (
    <div className="rounded-lg border border-gray-dark bg-black-deep p-3">
      <div className="mb-2 flex items-center justify-between"><span className="text-sm font-medium text-white">Select a Scroll</span><button type="button" onClick={onClose} className="text-gray hover:text-white"><X className="h-4 w-4" /></button></div>
      {loading ? <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-gray" /></div>
       : forms.length === 0 ? <p className="py-4 text-center text-xs text-gray">No scrolls available</p>
       : <div className="max-h-48 space-y-1 overflow-y-auto">{forms.map(f => (
          <button key={f.id} type="button" onClick={() => onSelect(f)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-gray transition-colors hover:bg-black-light hover:text-white">
            <ScrollText className="h-3.5 w-3.5 shrink-0 text-guild" /><span className="flex-1 truncate">{f.title}</span>
          </button>))}</div>}
    </div>
  )
}

/* ── Event Detail Panel ── */
function EventDetail({
  event,
  onEdit,
  onDelete,
  onClose,
}: {
  event: CalendarEvent
  onEdit: (e: CalendarEvent) => void
  onDelete: (e: CalendarEvent) => void
  onClose: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="rounded-lg border border-gray-dark bg-black-light p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-white">{event.title}</h3>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => { onEdit(event); onClose() }} className="rounded p-1.5 text-gray transition-colors hover:bg-black-deep hover:text-guild" title="Edit"><Pencil className="h-4 w-4" /></button>
          {confirming ? (
            <button onClick={() => { onDelete(event); onClose(); setConfirming(false) }} className="rounded p-1.5 text-danger transition-colors hover:bg-danger/10" title="Confirm delete"><Check className="h-4 w-4" /></button>
          ) : (
            <button onClick={() => setConfirming(true)} onBlur={() => setTimeout(() => setConfirming(false), 200)} className="rounded p-1.5 text-gray transition-colors hover:bg-black-deep hover:text-danger" title="Delete"><Trash2 className="h-4 w-4" /></button>
          )}
          <button onClick={onClose} className="rounded p-1.5 text-gray transition-colors hover:bg-black-deep hover:text-white" title="Close"><X className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Status badge */}
        {event.status === "TENTATIVE" && (
          <span className="inline-block rounded bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">Tentative</span>
        )}

        {/* Date & Time */}
        <div className="flex items-center gap-2 text-sm text-gray">
          <Calendar className="h-4 w-4 shrink-0 text-guild" />
          <span>{formatFullDate(event.start)}</span>
        </div>
        {!event.allDay && (
          <div className="flex items-center gap-2 text-sm text-gray">
            <Clock className="h-4 w-4 shrink-0 text-guild" />
            <span>
              {formatTime(event.start)}
              {event.end && ` \u2013 ${formatTime(event.end)}`}
            </span>
          </div>
        )}
        {event.allDay && (
          <div className="flex items-center gap-2 text-sm text-gray">
            <Clock className="h-4 w-4 shrink-0 text-guild" />
            <span>All day</span>
          </div>
        )}

        {/* Recurrence */}
        {event.recurrence && (
          <div className="flex items-center gap-2 text-sm text-gray">
            <Repeat className="h-4 w-4 shrink-0 text-guild" />
            <span>{recurrenceLabel(event.recurrence)}</span>
          </div>
        )}

        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-2 text-sm text-gray">
            <MapPin className="h-4 w-4 shrink-0 text-guild" />
            <span>{event.location}</span>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="mt-2 rounded-md bg-black-deep p-3">
            <p className="whitespace-pre-wrap text-sm text-gray-light">{event.description}</p>
          </div>
        )}

        {/* Chamber links */}
        {event.links && event.links.length > 0 && (
          <div className="mt-2">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray">Related Chambers</p>
            <div className="flex flex-wrap gap-2">
              {event.links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target={link.url.startsWith("/") ? undefined : "_blank"}
                  rel={link.url.startsWith("/") ? undefined : "noopener noreferrer"}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-dark bg-black-deep px-3 py-1.5 text-xs text-gray transition-colors hover:border-guild/50 hover:text-guild"
                >
                  {link.type === "meeting" && <Video className="h-3.5 w-3.5" />}
                  {link.type === "archive" && <FileText className="h-3.5 w-3.5" />}
                  {link.type === "scroll" && <ScrollText className="h-3.5 w-3.5" />}
                  {link.type === "pulse" && <MessageCircle className="h-3.5 w-3.5" />}
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Month Calendar Grid ── */
function MonthCalendar({
  calendarUri,
  events,
  onSelectDate,
  selectedDate,
}: {
  calendarUri: string
  events: CalendarEvent[]
  onSelectDate: (date: string) => void
  selectedDate: string | null
}) {
  const [viewDate, setViewDate] = useState(() => new Date())
  const [monthEvents, setMonthEvents] = useState<CalendarEvent[]>(events)
  const [loading, setLoading] = useState(false)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  // Fetch events when month changes
  useEffect(() => {
    async function fetchMonth() {
      setLoading(true)
      const from = `${year}-${String(month + 1).padStart(2, "0")}-01`
      const lastDay = new Date(year, month + 1, 0).getDate()
      const to = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`
      try {
        const res = await fetch(`/api/calendar/${calendarUri}/events?from=${from}&to=${to}`)
        if (res.ok) {
          const data = await res.json()
          setMonthEvents(data)
        }
      } catch {
        // keep existing
      } finally {
        setLoading(false)
      }
    }
    fetchMonth()
  }, [calendarUri, year, month])

  // Build day grid
  const days = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1)
    // Monday = 0 in our grid
    let startDay = firstOfMonth.getDay() - 1
    if (startDay < 0) startDay = 6
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrev = new Date(year, month, 0).getDate()

    const cells: Array<{ day: number; inMonth: boolean; dateStr: string }> = []

    // Previous month padding
    for (let i = startDay - 1; i >= 0; i--) {
      const d = daysInPrev - i
      const m = month === 0 ? 12 : month
      const y = month === 0 ? year - 1 : year
      cells.push({ day: d, inMonth: false, dateStr: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` })
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, inMonth: true, dateStr: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` })
    }

    // Next month padding to fill 6 rows
    const remaining = 42 - cells.length
    for (let d = 1; d <= remaining; d++) {
      const m = month + 2 > 12 ? 1 : month + 2
      const y = month + 2 > 12 ? year + 1 : year
      cells.push({ day: d, inMonth: false, dateStr: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` })
    }

    return cells
  }, [year, month])

  // Build event count map by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, number> = {}
    for (const ev of monthEvents) {
      const d = ev.start.slice(0, 10)
      map[d] = (map[d] || 0) + 1
    }
    return map
  }, [monthEvents])

  const today = toLocalDate(new Date())
  const monthName = viewDate.toLocaleDateString("en-AU", { month: "long", year: "numeric" })

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  return (
    <div className="rounded-lg border border-gray-dark p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <button onClick={prevMonth} className="rounded p-1 text-gray transition-colors hover:text-guild"><ChevronLeft className="h-5 w-5" /></button>
        <h3 className="font-display text-sm font-semibold text-white">{monthName} {loading && <Loader2 className="ml-2 inline h-3 w-3 animate-spin text-gray" />}</h3>
        <button onClick={nextMonth} className="rounded p-1 text-gray transition-colors hover:text-guild"><ChevronRight className="h-5 w-5" /></button>
      </div>

      {/* Day headers */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {DAYS.map((d) => (
          <div key={d} className="py-1 text-xs font-medium text-gray">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((cell, i) => {
          const count = eventsByDate[cell.dateStr] || 0
          const isToday = cell.dateStr === today
          const isSelected = cell.dateStr === selectedDate

          return (
            <button
              key={i}
              onClick={() => onSelectDate(cell.dateStr)}
              className={`relative flex flex-col items-center rounded py-1.5 text-xs transition-colors ${
                !cell.inMonth ? "text-gray-dark" :
                isSelected ? "bg-guild text-black-deep" :
                isToday ? "font-bold text-guild" :
                "text-gray-light hover:bg-black-light"
              }`}
            >
              {cell.day}
              {count > 0 && (
                <div className="mt-0.5 flex gap-0.5">
                  {Array.from({ length: Math.min(count, 3) }).map((_, j) => (
                    <span
                      key={j}
                      className={`block h-1 w-1 rounded-full ${
                        isSelected ? "bg-black-deep" : "bg-guild"
                      }`}
                    />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Main View ── */
export function RitesView({ guildId, guildName, calendarUri, initialEvents, talkRoom, folderId, deckBoardId }: RitesViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [showForm, setShowForm] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [expandedUid, setExpandedUid] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [date, setDate] = useState("")
  const [startTime, setStartTime] = useState("10:00")
  const [endTime, setEndTime] = useState("11:00")
  const [untilDate, setUntilDate] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [allDay, setAllDay] = useState(false)
  const [recurrence, setRecurrence] = useState("")
  const [alarm, setAlarm] = useState("")
  const [status, setStatus] = useState("CONFIRMED")
  const [links, setLinks] = useState<ChamberLink[]>([])

  const [editingUid, setEditingUid] = useState<string | null>(null)
  const [showFilePicker, setShowFilePicker] = useState(false)
  const [showFormPicker, setShowFormPicker] = useState(false)

  const refreshEvents = useCallback(async () => {
    if (!calendarUri) return
    try {
      const res = await fetch(`/api/calendar/${calendarUri}/events`)
      if (res.ok) setEvents(await res.json())
    } catch (err) {
      console.error("Failed to refresh events:", err)
    }
  }, [calendarUri])

  const resetForm = () => {
    setTitle(""); setDate(""); setStartTime("10:00"); setEndTime("11:00"); setUntilDate("")
    setDescription(""); setLocation(""); setAllDay(false); setRecurrence(""); setAlarm("")
    setStatus("CONFIRMED"); setLinks([]); setShowFilePicker(false); setShowFormPicker(false)
    setEditingUid(null)
  }

  const handleEdit = (event: CalendarEvent) => {
    setEditingUid(event.uid)
    setTitle(event.title)
    setDescription(event.description || "")
    setLocation(event.location || "")
    setStatus(event.status || "CONFIRMED")
    setLinks(event.links || [])
    setAllDay(event.allDay || false)
    setExpandedUid(null)

    const startDt = new Date(event.start)
    const pad = (n: number) => n.toString().padStart(2, "0")
    setDate(`${startDt.getFullYear()}-${pad(startDt.getMonth() + 1)}-${pad(startDt.getDate())}`)

    if (!event.allDay) {
      setStartTime(`${pad(startDt.getHours())}:${pad(startDt.getMinutes())}`)
      if (event.end) {
        const endDt = new Date(event.end)
        setEndTime(`${pad(endDt.getHours())}:${pad(endDt.getMinutes())}`)
      } else { setEndTime("") }
    }

    if (event.recurrence) {
      const parts = event.recurrence.split(";")
      const untilPart = parts.find(p => p.startsWith("UNTIL="))
      setRecurrence(parts.filter(p => !p.startsWith("UNTIL=")).join(";"))
      if (untilPart) {
        const u = untilPart.replace("UNTIL=", "")
        setUntilDate(`${u.slice(0, 4)}-${u.slice(4, 6)}-${u.slice(6, 8)}`)
      } else { setUntilDate("") }
    } else { setRecurrence(""); setUntilDate("") }

    setAlarm("")
    setShowForm(true)
    setShowCalendar(false)
  }

  const handleDelete = async (event: CalendarEvent) => {
    if (!calendarUri) return
    try {
      const res = await fetch(`/api/calendar/${calendarUri}/events/${event.uid}`, { method: "DELETE" })
      if (res.ok) await refreshEvents()
    } catch (err) { console.error("Failed to delete event:", err) }
  }

  const setQuickDate = (which: "today" | "tomorrow" | "nextWeek") => {
    const d = new Date()
    if (which === "tomorrow") d.setDate(d.getDate() + 1)
    if (which === "nextWeek") { const day = d.getDay(); d.setDate(d.getDate() + (day === 0 ? 1 : 8 - day)) }
    setDate(toLocalDate(d))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!calendarUri || !title || !date) return
    setSubmitting(true); setError(null)
    try {
      let startISO: string; let endISO: string | undefined
      if (allDay) { startISO = date }
      else { startISO = new Date(`${date}T${startTime}`).toISOString(); if (endTime) endISO = new Date(`${date}T${endTime}`).toISOString() }

      const body: Record<string, string | boolean | number> = { title, start: startISO }
      if (endISO) body.end = endISO
      if (description) body.description = description
      if (location) body.location = location
      if (allDay) body.allDay = true
      if (recurrence) { let rrule = recurrence; if (untilDate) rrule += `;UNTIL=${untilDate.replace(/-/g, "")}T235959Z`; body.recurrence = rrule }
      if (alarm !== "") body.alarm = parseInt(alarm, 10)
      if (status) body.status = status
      if (links.length > 0) (body as any).links = links

      const url = editingUid ? `/api/calendar/${calendarUri}/events/${editingUid}` : `/api/calendar/${calendarUri}/events`
      const res = await fetch(url, { method: editingUid ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Failed (${res.status})`) }
      resetForm(); setShowForm(false); await refreshEvents()
    } catch (err: any) { setError(err.message || "Failed") } finally { setSubmitting(false) }
  }

  // Events filtered by selected date (for calendar day view)
  const filteredEvents = useMemo(() => {
    if (!selectedDate) return events
    return events.filter(ev => ev.start.slice(0, 10) === selectedDate)
  }, [events, selectedDate])

  // When selecting a date from calendar, also fetch that month's events for the list
  const handleSelectDate = useCallback(async (dateStr: string) => {
    setSelectedDate(dateStr)
    setExpandedUid(null)
    if (!calendarUri) return
    // Fetch events around the selected date to populate the list
    const d = new Date(dateStr)
    const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
    try {
      const res = await fetch(`/api/calendar/${calendarUri}/events?from=${from}&to=${to}`)
      if (res.ok) setEvents(await res.json())
    } catch { /* keep existing */ }
  }, [calendarUri])

  if (!calendarUri) {
    return <div className="flex h-64 flex-col items-center justify-center text-center"><p className="text-gray">No calendar has been set up for this guild yet.</p></div>
  }

  const inputClass = "w-full rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white focus:border-guild focus:outline-none [color-scheme:dark]"
  const selectClass = "w-full rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white focus:border-guild focus:outline-none"

  return (
    <div className="scrollbar-none flex-1 overflow-y-auto">
      {/* Action buttons */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => { if (showForm) resetForm(); setShowForm(!showForm); setShowCalendar(false) }}
          className="inline-flex items-center gap-2 rounded-lg bg-guild px-4 py-2 text-sm font-medium text-black-deep transition-colors hover:bg-guild/80"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "Create Event"}
        </button>
        <button
          onClick={() => { setShowCalendar(!showCalendar); setShowForm(false); if (!showCalendar) { setSelectedDate(null); setExpandedUid(null) } }}
          className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
            showCalendar ? "border-guild text-guild" : "border-gray-dark text-gray hover:border-guild/50 hover:text-guild"
          }`}
        >
          <Calendar className="h-4 w-4" />
          {showCalendar ? "Hide Calendar" : "Calendar"}
        </button>
      </div>

      {/* Calendar view */}
      {showCalendar && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.5fr]">
          <MonthCalendar
            calendarUri={calendarUri}
            events={events}
            onSelectDate={handleSelectDate}
            selectedDate={selectedDate}
          />
          <div>
            {selectedDate && (
              <h4 className="mb-3 text-sm font-medium text-gray">
                {formatFullDate(selectedDate + "T00:00:00")}
                {filteredEvents.length > 0 && ` \u2014 ${filteredEvents.length} event${filteredEvents.length > 1 ? "s" : ""}`}
              </h4>
            )}
            {selectedDate ? (
              filteredEvents.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray">No events on this day</p>
              ) : (
                <div className="space-y-2">
                  {filteredEvents.map((ev, i) => (
                    <div key={`${ev.uid}-${i}`}>
                      <button
                        onClick={() => setExpandedUid(expandedUid === `${ev.uid}-${i}` ? null : `${ev.uid}-${i}`)}
                        className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${expandedUid === `${ev.uid}-${i}` ? "border-guild/50 bg-black-light" : "border-gray-dark hover:border-guild/50"}`}
                      >
                        <Calendar className="h-4 w-4 shrink-0 text-guild" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">{ev.title}</p>
                          <p className="text-xs text-gray">
                            {ev.allDay ? "All day" : formatTime(ev.start)}
                            {ev.recurrence && ` \u00b7 ${recurrenceLabel(ev.recurrence)}`}
                          </p>
                        </div>
                        <ChevronRight className={`h-4 w-4 shrink-0 text-gray transition-transform ${expandedUid === `${ev.uid}-${i}` ? "rotate-90" : ""}`} />
                      </button>
                      {expandedUid === `${ev.uid}-${i}` && (
                        <div className="mt-1">
                          <EventDetail event={ev} onEdit={handleEdit} onDelete={handleDelete} onClose={() => setExpandedUid(null)} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="py-8 text-center text-sm text-gray">Select a day to see events</p>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-gray-dark p-4">
          <h3 className="mb-4 font-display text-lg font-semibold text-white">{editingUid ? "Edit Rite" : "New Rite"}</h3>

          {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-gray">Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Event title" className="w-full rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white placeholder-gray focus:border-guild focus:outline-none" />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="allDay" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-4 w-4 rounded border-gray-dark bg-black-deep text-guild accent-guild focus:ring-guild" />
                <label htmlFor="allDay" className="text-sm text-gray">All-day</label>
              </div>
              <div className="flex items-center gap-1.5">
                {QUICK_RECURRENCE.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setRecurrence(recurrence === opt.value ? "" : opt.value)}
                    className={`rounded-full px-3 py-1 text-xs transition-colors ${recurrence === opt.value ? "bg-guild text-black-deep" : "border border-gray-dark text-gray hover:border-guild/50 hover:text-guild"}`}>
                    <Repeat className="mr-1 inline h-3 w-3" />{opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray">Date</label>
              <div className="flex items-center gap-2">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputClass + " flex-1"} />
                <div className="flex gap-1.5">
                  {(["today", "tomorrow", "nextWeek"] as const).map((q) => (
                    <button key={q} type="button" onClick={() => setQuickDate(q)}
                      className={`whitespace-nowrap rounded-full border px-2.5 py-1.5 text-xs transition-colors ${
                        date === toLocalDate((() => { const d = new Date(); if (q === "tomorrow") d.setDate(d.getDate() + 1); if (q === "nextWeek") { const day = d.getDay(); d.setDate(d.getDate() + (day === 0 ? 1 : 8 - day)) }; return d })())
                          ? "border-guild bg-guild/10 text-guild" : "border-gray-dark text-gray hover:border-guild/50 hover:text-guild"
                      }`}>
                      {q === "today" ? "Today" : q === "tomorrow" ? "Tomorrow" : "Next Mon"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {!allDay && (
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1 block text-sm text-gray">Start time</label><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} /></div>
                <div><label className="mb-1 block text-sm text-gray">End time</label><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} /></div>
              </div>
            )}

            {recurrence && (
              <div><label className="mb-1 block text-sm text-gray">Repeat until (optional)</label><input type="date" value={untilDate} onChange={(e) => setUntilDate(e.target.value)} min={date || undefined} className={inputClass} /></div>
            )}

            <div><label className="mb-1 block text-sm text-gray">Description (optional)</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Event description" className="w-full rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white placeholder-gray focus:border-guild focus:outline-none" /></div>

            <div><label className="mb-1 block text-sm text-gray">Location (optional)</label><input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Event location" className="w-full rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white placeholder-gray focus:border-guild focus:outline-none" /></div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div><label className="mb-1 block text-sm text-gray">Recurrence</label><select value={recurrence} onChange={(e) => setRecurrence(e.target.value)} className={selectClass}>{RECURRENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
              <div><label className="mb-1 block text-sm text-gray">Reminder</label><select value={alarm} onChange={(e) => setAlarm(e.target.value)} className={selectClass}>{REMINDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
              <div><label className="mb-1 block text-sm text-gray">Status</label><select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>{STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            </div>

            {/* Related Chambers */}
            <div>
              <label className="mb-2 block text-sm text-gray">Related Chambers</label>
              {links.length > 0 && (
                <div className="mb-2 space-y-2">
                  {links.map((link, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md border border-gray-dark bg-black-light px-3 py-1.5 text-sm">
                      {link.type === "meeting" && <Video className="h-3.5 w-3.5 text-guild" />}
                      {link.type === "archive" && <FileText className="h-3.5 w-3.5 text-guild" />}
                      {link.type === "scroll" && <ScrollText className="h-3.5 w-3.5 text-guild" />}
                      {link.type === "pulse" && <MessageCircle className="h-3.5 w-3.5 text-guild" />}
                      <span className="flex-1 text-white">{link.label}</span>
                      <button type="button" onClick={() => setLinks(links.filter((_, j) => j !== i))} className="text-gray hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {talkRoom && !links.some(l => l.type === "meeting") && (
                  <button type="button" onClick={() => setLinks([...links, { type: "meeting", label: "Join Chamber Call", url: `https://meet.talitamoss.info/${guildId}` }])} className="inline-flex items-center gap-1.5 rounded-md border border-gray-dark px-2.5 py-1.5 text-xs text-gray transition-colors hover:border-guild/50 hover:text-guild"><Video className="h-3 w-3" />Add Chamber Call</button>
                )}
                {folderId && (
                  <button type="button" onClick={() => setShowFilePicker(!showFilePicker)} className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${showFilePicker ? "border-guild text-guild" : "border-gray-dark text-gray hover:border-guild/50 hover:text-guild"}`}><FileText className="h-3 w-3" />Add Archive Document</button>
                )}
                <button type="button" onClick={() => setShowFormPicker(!showFormPicker)} className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${showFormPicker ? "border-guild text-guild" : "border-gray-dark text-gray hover:border-guild/50 hover:text-guild"}`}><ScrollText className="h-3 w-3" />Add Scroll</button>
                {talkRoom && !links.some(l => l.type === "pulse") && (
                  <button type="button" onClick={() => setLinks([...links, { type: "pulse", label: "Open Chat", url: `/guild/${guildId}/pulse` }])} className="inline-flex items-center gap-1.5 rounded-md border border-gray-dark px-2.5 py-1.5 text-xs text-gray transition-colors hover:border-guild/50 hover:text-guild"><MessageCircle className="h-3 w-3" />Add Chat</button>
                )}
              </div>
              {showFilePicker && folderId && <div className="mt-2"><FilePicker folderId={folderId} onSelect={(f) => { setLinks([...links, { type: "archive", label: f.name, url: `/guild/${guildId}/archive` }]); setShowFilePicker(false) }} onClose={() => setShowFilePicker(false)} /></div>}
              {showFormPicker && <div className="mt-2"><FormPicker onSelect={(f) => { setLinks([...links, { type: "scroll", label: f.title, url: `/guild/${guildId}/scrolls` }]); setShowFormPicker(false) }} onClose={() => setShowFormPicker(false)} /></div>}
            </div>

            <button type="submit" disabled={submitting || !title || !date} className="inline-flex items-center gap-2 rounded-lg bg-guild px-4 py-2 text-sm font-medium text-black-deep transition-colors hover:bg-guild/80 disabled:opacity-50">
              <Plus className="h-4 w-4" />
              {submitting ? (editingUid ? "Saving..." : "Creating...") : (editingUid ? "Save Changes" : "Create Rite")}
            </button>
          </div>
        </form>
      )}

      {/* Upcoming events list (shown when calendar is not open) */}
      {!showCalendar && !showForm && (
        events.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <p className="text-gray">No upcoming rites in the next 30 days.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((ev, idx) => {
              const startDt = new Date(ev.start)
              const now = new Date()
              const tmrw = new Date(now); tmrw.setDate(tmrw.getDate() + 1)
              let dateLabel: string
              if (startDt.toDateString() === now.toDateString()) dateLabel = "Today"
              else if (startDt.toDateString() === tmrw.toDateString()) dateLabel = "Tomorrow"
              else dateLabel = startDt.toLocaleDateString("en-AU", { weekday: "short", month: "short", day: "numeric" })
              const key = `${ev.uid}-${idx}`
              const isExpanded = expandedUid === key

              return (
                <div key={key}>
                  <button
                    onClick={() => setExpandedUid(isExpanded ? null : key)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${isExpanded ? "border-guild/50 bg-black-light" : "border-gray-dark hover:border-guild/50"}`}
                  >
                    <Calendar className="h-4 w-4 shrink-0 text-guild" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-white">{ev.title}</p>
                        {ev.status === "TENTATIVE" && <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-xs text-yellow-400">Tentative</span>}
                      </div>
                      <p className="text-xs text-gray">
                        {dateLabel} {ev.allDay ? "\u2014 All day" : `at ${formatTime(ev.start)}`}
                        {ev.recurrence && ` \u00b7 ${recurrenceLabel(ev.recurrence)}`}
                        {ev.location && ` \u00b7 ${ev.location}`}
                      </p>
                    </div>
                    {ev.links && ev.links.length > 0 && (
                      <div className="flex shrink-0 gap-1">
                        {ev.links.some(l => l.type === "meeting") && <Video className="h-3.5 w-3.5 text-gray" />}
                        {ev.links.some(l => l.type === "archive") && <FileText className="h-3.5 w-3.5 text-gray" />}
                      </div>
                    )}
                    <ChevronRight className={`h-4 w-4 shrink-0 text-gray transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </button>
                  {isExpanded && (
                    <div className="mt-1">
                      <EventDetail event={ev} onEdit={handleEdit} onDelete={handleDelete} onClose={() => setExpandedUid(null)} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
