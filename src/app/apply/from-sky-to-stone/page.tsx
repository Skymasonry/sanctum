import { Mountain } from "lucide-react"
import { redirect } from "next/navigation"

import { ChamberHeader } from "@/components/shared"
import { FromSkyToStoneForm } from "@/components/apply/FromSkyToStoneForm"
import { getUser } from "@/lib/auth"
import { FROM_SKY_TO_STONE_SLUG, getApplication } from "@/lib/event-applications"

export default async function FromSkyToStoneApplyPage() {
  const user = await getUser()
  if (!user) redirect("/")

  const existing = await getApplication(FROM_SKY_TO_STONE_SLUG, user.username)

  return (
    <div className="glass flex h-full flex-col overflow-hidden" style={{ borderRadius: 'var(--panel-radius)' }}>
      <div className="scrollbar-none h-full min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col p-6 lg:p-8">
          <ChamberHeader
            backHref="/"
            icon={<Mountain className="h-10 w-10 text-guild" />}
            title="From Sky To Stone"
            subtitle="Apply or update your details for this year's gathering"
          />
          <FromSkyToStoneForm
            userName={user.name}
            userEmail={user.email}
            initialAnswers={existing?.answers ?? {}}
            initialAgreed={existing?.agreed ?? false}
            alreadySubmitted={!!existing}
          />
        </div>
      </div>
    </div>
  )
}
