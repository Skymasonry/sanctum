import type { ScrollQuestion } from "@/lib/scrolls"

interface QuestionInputProps {
  question: ScrollQuestion
  answer: unknown
  onAnswer: (v: unknown) => void
  disabled: boolean
}

/**
 * Renders just the input control for a scroll question — shared
 * between the in-app ScrollDetail (authenticated members) and the
 * public, unauthenticated scroll page, which otherwise wrap it
 * differently (seeder gets a remove button, public page doesn't, etc).
 */
export function QuestionInput({ question, answer, onAnswer, disabled }: QuestionInputProps) {
  if (question.type === "short") {
    return (
      <input
        type="text"
        value={(answer as string) ?? ""}
        onChange={e => onAnswer(e.target.value)}
        disabled={disabled}
        className="w-full rounded border border-gray-dark bg-black-deep px-2 py-1.5 text-sm text-white focus:border-guild focus:outline-none disabled:opacity-50"
      />
    )
  }
  if (question.type === "long") {
    return (
      <textarea
        value={(answer as string) ?? ""}
        onChange={e => onAnswer(e.target.value)}
        disabled={disabled}
        rows={4}
        className="w-full resize-y rounded border border-gray-dark bg-black-deep px-2 py-1.5 text-sm text-white focus:border-guild focus:outline-none disabled:opacity-50"
      />
    )
  }
  if (question.type === "date") {
    return (
      <input
        type="date"
        value={(answer as string) ?? ""}
        onChange={e => onAnswer(e.target.value)}
        disabled={disabled}
        className="rounded border border-gray-dark bg-black-deep px-2 py-1.5 text-sm text-white focus:border-guild focus:outline-none disabled:opacity-50"
      />
    )
  }
  if (question.type === "radio") {
    return (
      <>
        {question.options.map(opt => (
          <label key={opt} className="flex items-center gap-2 py-1 text-sm text-white">
            <input
              type="radio"
              name={question.id}
              value={opt}
              checked={answer === opt}
              onChange={() => onAnswer(opt)}
              disabled={disabled}
            />
            {opt}
          </label>
        ))}
      </>
    )
  }
  if (question.type === "select") {
    return (
      <select
        value={(answer as string) ?? ""}
        onChange={e => onAnswer(e.target.value)}
        disabled={disabled}
        className="rounded border border-gray-dark bg-black-deep px-2 py-1.5 text-sm text-white focus:border-guild focus:outline-none disabled:opacity-50"
      >
        <option value="">—</option>
        {question.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }
  // checkbox
  const list = Array.isArray(answer) ? (answer as string[]) : []
  return (
    <>
      {question.options.map(opt => (
        <label key={opt} className="flex items-center gap-2 py-1 text-sm text-white">
          <input
            type="checkbox"
            checked={list.includes(opt)}
            onChange={e => {
              const next = e.target.checked ? [...list, opt] : list.filter(o => o !== opt)
              onAnswer(next)
            }}
            disabled={disabled}
          />
          {opt}
        </label>
      ))}
    </>
  )
}
