"use client"

import { Button } from "@/components/ui/button"

const suggestions = [
  {
    label: "Move fast",
    prompt:
      "We're a small startup and we care about speed, not process. Classify the ticket, ping the team if it's urgent, and always draft a reply. Skip the customer lookup entirely.",
  },
  {
    label: "Gate on the plan",
    prompt:
      "Support level should follow what the customer pays for. Look the customer up, check their entitlement, then branch: paid tiers get a drafted reply, free tier gets pointed at the community forum.",
  },
  {
    label: "Keep an audit trail",
    prompt:
      "We're an EU company with compliance obligations, so nothing gets skipped. Classify, look the customer up, draft a reply, translate it into their preferred language, and always file a ticket for the audit trail.",
  },
  {
    label: "Compare the three",
    prompt:
      "Show me the three tenant triage workflows side by side and explain what each one skips, branches on, or always does.",
  },
  {
    label: "What blocks exist?",
    prompt:
      "What building blocks can a triage workflow use, and what does each one take and return?",
  },
]

export function Suggestions({
  onSelect,
}: {
  onSelect: (prompt: string) => void
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion.label}
          variant="outline"
          size="sm"
          onClick={() => onSelect(suggestion.prompt)}
        >
          {suggestion.label}
        </Button>
      ))}
    </div>
  )
}
