# chatbot-template

A minimal chatbot template built with Next.js, [Mastra](https://mastra.ai), the [AI SDK](https://ai-sdk.dev), [shadcn/ui](https://ui.shadcn.com), [shadcn/react](https://ui.shadcn.com/docs/react/message-scroller), [shadcn/typeset](https://ui.shadcn.com/docs/typeset) and [OpenRouter](https://openrouter.ai).

<p>
  <a href="https://github.com/shadcn-ui/chatbot-template/stargazers"><img src="https://shieldcn.dev/github/stars/shadcn-ui/chatbot-template.svg?variant=secondary&size=xs" alt="GitHub stars" /></a>
  <a href="https://github.com/shadcn-ui/chatbot-template/forks"><img src="https://shieldcn.dev/github/forks/shadcn-ui/chatbot-template.svg?variant=secondary&size=xs" alt="GitHub forks" /></a>
  <a href="https://github.com/shadcn-ui/chatbot-template/blob/main/LICENSE"><img src="https://shieldcn.dev/github/license/shadcn-ui/chatbot-template.svg?variant=secondary&size=xs" alt="License" /></a>
</p>

## Features

- Streaming chat with markdown rendering and shadcn/typeset
- A single [Mastra](https://mastra.ai) agent behind `/api/chat`, with per-request model selection
- Tool part components kept as a reference for when tools are added back (see [Tool parts](#tool-parts))

## Local development

```bash
pnpm install
```

Create an API key at [openrouter.ai/keys](https://openrouter.ai/keys) and add it to `.env.local`:

```bash
cp .env.example .env.local
# then set OPENROUTER_API_KEY=...
```

Start the dev server:

```bash
pnpm dev
```

## Configuration

| Env var              | Required | Description                                            |
| -------------------- | -------- | ------------------------------------------------------ |
| `OPENROUTER_API_KEY` | Yes      | OpenRouter API key, used by Mastra's model router.     |

The model list lives in [lib/models.ts](lib/models.ts) — the first entry is the default model. Ids are [OpenRouter slugs](https://openrouter.ai/models); the `openrouter/` prefix Mastra's router expects is added in [mastra/agents/chat-agent.ts](mastra/agents/chat-agent.ts).

## Security

The `/api/chat` route is **public and unauthenticated** — every request spends your OpenRouter credits. That's fine for a personal demo, but before putting it in front of real traffic you should:

- **Rate limit it.** Add [Vercel Firewall / WAF](https://vercel.com/docs/security/vercel-waf) rules or [`@upstash/ratelimit`](https://github.com/upstash/ratelimit-js) so a single client can't drain your credits (denial-of-wallet).
- **Cap spend.** Set an [OpenRouter credit limit](https://openrouter.ai/docs/api-reference/limits) on the key as a backstop.
- **Add auth** if the chatbot isn't meant to be public.

The route already validates the request body and restricts models to [lib/models.ts](lib/models.ts) — but that bounds a single request, not overall volume.

## How it works

- [mastra/index.ts](mastra/index.ts) registers the agents; [mastra/agents/chat-agent.ts](mastra/agents/chat-agent.ts) is a single tool-less agent whose model is resolved per request from the `RequestContext`.
- [mastra/skills/](mastra/skills) holds the agent's skills. See [Skills](#skills).
- [app/api/chat/route.ts](app/api/chat/route.ts) validates the request and streams the agent with `handleChatStream` from `@mastra/ai-sdk`.
- [components/chat.tsx](components/chat.tsx) renders the conversation with `useChat` and shadcn chat primitives.
- [tools/index.ts](tools/index.ts) holds no tools right now — only the UI part types the components below are written against.

## Skills

Skills are markdown instructions the agent loads on demand. Mastra injects only
each skill's name and description into the system prompt; the agent then calls
its built-in `skill` / `skill_read` / `skill_search` tools to pull in the full
body and any reference files.

| Skill                                                             | Teaches the agent                                                     |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| [dynamic-workflows](mastra/skills/dynamic-workflows/SKILL.md)     | How to author a Mastra dynamic workflow definition (the JSON document) |

A skill is a directory with a `SKILL.md` — YAML frontmatter carrying `name` and
`description`, then a markdown body — plus optional `references/*.md` files for
detail the agent only needs sometimes. Add one by dropping the directory under
`mastra/skills/` and listing its path in the agent's `skills` array. Paths
resolve against the working directory, and
[next.config.ts](next.config.ts) traces `mastra/skills/**` into the chat route
so the markdown ships with a production build.

The `dynamic-workflows` skill deliberately covers only the definition format —
the schemas and the step graph. It leaves out the runtime APIs
(`addDynamicWorkflow()`, storage, server routes), which the agent never calls.

## Tool parts

> The agent defines no tools of its own, so none of these render yet. They are kept intact as a working reference for wiring Mastra tools back in. (The built-in skill tools do run, but have no part type here, so `chat-message.tsx` skips them.)

Assistant messages are a list of typed parts. [components/chat-message.tsx](components/chat-message.tsx) switches on `part.type` and delegates each one to a component in [components/parts/](components/parts):

| Part type          | Component                                                          | Renders                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`             | [text-part.tsx](components/parts/text-part.tsx)                   | Markdown via react-markdown and shadcn/typeset.                                                                                                |
| `tool-github_repo` | [github-repo-part.tsx](components/parts/github-repo-part.tsx)     | A spinner while the lookup runs, then a linked stat line (stars, forks, language).                                                             |
| `tool-web_search`  | [web-search-part.tsx](components/parts/web-search-part.tsx)       | A "Searching the web…" status while the search runs, then a persistent "Searched the web" line per search.                                     |
| `tool-ask_user`    | [ask-user-part.tsx](components/parts/ask-user-part.tsx)           | The answered questions inline. Pending questions render in [question-card.tsx](components/question-card.tsx), pinned to the scroller bottom.   |
| `source-url`       | [sources-part.tsx](components/parts/sources-part.tsx)             | Web search citations, deduped into a "Searched N websites" drawer once the message finishes streaming.                                         |

Tool parts move through states as the stream progresses — `input-streaming` → `input-available` → `output-available` (or `output-error`) — and each component switches on `part.state` to show progress, results, and failures.

### Adding your own tool

1. Create `tools/<name>.ts` exporting a `createTool()` from `@mastra/core/tools` with a `description`, an `inputSchema`, and an `execute` function, then register it on the agent's `tools` in [mastra/agents/chat-agent.ts](mastra/agents/chat-agent.ts).
2. Add the tool's `input`/`output` shape to `ChatTools` in [tools/index.ts](tools/index.ts) so the part types stay accurate.
3. Add a part component in [components/parts/](components/parts) and a `case "tool-<name>"` in [chat-message.tsx](components/chat-message.tsx).

Step 2 is manual because the tools no longer live in an AI SDK `ToolSet` that `InferUITools` can read from.

## Adding components

```bash
npx shadcn@latest add button
```

## License

MIT — see [LICENSE](LICENSE).
