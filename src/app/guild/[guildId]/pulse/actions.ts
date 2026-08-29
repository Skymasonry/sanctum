"use server"

import { sendMessage as sendTalkMessage } from "@/lib/talk"
import { getUser } from "@/lib/auth"
import { getGuild } from "@/lib/guilds"
import { sendPushToUsers } from "@/lib/push"
import { revalidatePath } from "next/cache"

export async function sendMessage(guildId: string, token: string, message: string) {
  const result = await sendTalkMessage(token, message)
  revalidatePath(`/guild/${guildId}/pulse`)

  // Best-effort: notify the guild's other members. Never let a push
  // failure surface as a failed send — the message already went out.
  try {
    const [user, guild] = await Promise.all([getUser(), getGuild(guildId)])
    if (user && guild) {
      const others = guild.members.filter(m => m.toLowerCase() !== user.username.toLowerCase())
      await sendPushToUsers(others, {
        title: `${guild.name} — ${user.name || user.username}`,
        body: message.length > 140 ? `${message.slice(0, 140)}…` : message,
        url: `/guild/${guildId}/pulse`,
      })
    }
  } catch (err) {
    console.error("push notify on send failed:", err)
  }

  return result
}
