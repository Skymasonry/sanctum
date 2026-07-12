"use client"

import Link from "next/link"

import type { LiveRoom } from "@/types/threshold"

import { useTick } from "./useTick"

interface LiveBandProps {
  rooms: LiveRoom[]
}

export function LiveBand({ rooms }: LiveBandProps) {
  return (
    <div className="mx-10 mt-6 flex flex-col gap-2">
      {rooms.map(room => (
        <LiveRoomRow key={`${room.guildId}-${room.startedAt}`} room={room} />
      ))}
    </div>
  )
}

function LiveRoomRow({ room }: { room: LiveRoom }) {
  const now = useTick(30_000)
  const reference = now ?? Date.parse(room.startedAt)
  const minutes = Math.max(1, Math.floor((reference - Date.parse(room.startedAt)) / 60_000))
  return (
    <section
      className="relative flex items-center gap-4 overflow-hidden rounded-[10px] border px-5 py-4"
      style={{
        background:
          "linear-gradient(90deg, rgba(212,98,58,0.11), rgba(212,98,58,0.02))",
        borderColor: "rgba(212,98,58,0.28)",
      }}
    >
      <span
        className="pointer-events-none absolute inset-0 -translate-x-full animate-sweep"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(212,98,58,0.08), transparent)",
        }}
      />
      <div className="flex items-center gap-2 whitespace-nowrap font-mono text-[9px] tracking-[0.2em] text-ember uppercase">
        <span
          className="h-1.5 w-1.5 animate-beat rounded-full bg-ember"
          style={{ boxShadow: "0 0 8px #d4623a" }}
        />
        Gathering now
      </div>
      <div className="z-10 min-w-0 flex-1">
        <h3 className="font-display text-[17px] font-normal tracking-[0.04em]">
          {room.room}
        </h3>
        <p className="mt-0.5 text-[15px] text-muted">
          Open floor · {minutes} minute{minutes === 1 ? "" : "s"} in
        </p>
      </div>
      <div className="z-10 flex">
        {room.present.slice(0, 4).map((p, i) => (
          <div
            key={i}
            className="-ml-2 grid h-[27px] w-[27px] place-items-center rounded-full border-2 font-mono text-[9px] text-white/70"
            style={{
              borderColor: "#16110f",
              background: "linear-gradient(150deg, #4a3f30, #241d17)",
            }}
          >
            {p.initials}
          </div>
        ))}
      </div>
      <Link
        href={`/guild/${room.guildId}/pulse`}
        className="z-10 rounded-md bg-ember px-[18px] py-[9px] font-mono text-[10px] font-medium tracking-[0.16em] text-black uppercase transition hover:brightness-110"
      >
        Enter
      </Link>
    </section>
  )
}
