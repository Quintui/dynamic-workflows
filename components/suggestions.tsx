"use client"

import { Button } from "@/components/ui/button"

const suggestions = [
  {
    label: "Tell me a story",
    prompt:
      "Tell me a short story. Format it in rich markdown: a title heading, a blockquote, a bulleted list, a table, and some bold and italic text.",
  },
  {
    label: "Explain a concept",
    prompt:
      "Explain how server-sent events work, with a short example and a table of the alternatives.",
  },
  {
    label: "Write some code",
    prompt:
      "Write a TypeScript function that debounces an async function, and explain the tricky parts.",
  },
  {
    label: "Plan a dinner",
    prompt:
      "Help me plan a birthday dinner for six people — suggest a three-course menu and a prep timeline.",
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
