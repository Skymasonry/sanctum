import { Mountain } from "lucide-react"
import { redirect } from "next/navigation"

import { ChamberHeader, Card, CardTitle } from "@/components/shared"
import { getUser, isElder, isGrandmaster } from "@/lib/auth"
import { FROM_SKY_TO_STONE_SLUG, getApplicationsForEvent } from "@/lib/event-applications"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const CONTRIBUTION_LABEL: Record<string, string> = {
  yes: "Committed",
  no: "Declined",
  assistance: "Needs assistance",
  "": "—",
}

export default async function FromSkyToStoneResponsesPage() {
  const user = await getUser()
  if (!user) redirect("/")
  if (!isGrandmaster(user) && !isElder(user)) redirect("/apply/from-sky-to-stone")

  const applications = await getApplicationsForEvent(FROM_SKY_TO_STONE_SLUG)

  return (
    <div className="glass flex h-full flex-col overflow-hidden" style={{ borderRadius: 'var(--panel-radius)' }}>
      <div className="scrollbar-none h-full min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col p-6 lg:p-8">
          <ChamberHeader
            backHref="/apply/from-sky-to-stone"
            icon={<Mountain className="h-10 w-10 text-guild" />}
            title="From Sky To Stone"
            subtitle={`${applications.length} application${applications.length === 1 ? "" : "s"}`}
          />

          {applications.length === 0 ? (
            <p className="text-sm text-gray">No applications yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {applications.map(app => (
                <Card key={app.userId}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <CardTitle>{app.userId}</CardTitle>
                      <p className="mt-0.5 text-xs text-gray">
                        Submitted {formatDate(app.submittedAt)} · Contribution:{" "}
                        {CONTRIBUTION_LABEL[app.answers.contribution] ?? "—"} · Agreed:{" "}
                        {app.agreed ? "Yes" : "No"}
                      </p>
                      {app.answers.focus && (
                        <p className="mt-2 text-sm text-gray-light">
                          <span className="text-faint">Focus:</span> {app.answers.focus}
                        </p>
                      )}
                      {app.answers.rolesAndContributions && (
                        <p className="mt-1 text-sm text-gray-light">
                          <span className="text-faint">Offering:</span>{" "}
                          {app.answers.rolesAndContributions}
                        </p>
                      )}
                      {app.answers.healthNotes && (
                        <p className="mt-1 text-sm text-danger">
                          <span className="text-faint">Health notes:</span> {app.answers.healthNotes}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
