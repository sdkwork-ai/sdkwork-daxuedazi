import { describe, expect, it, vi } from 'vitest'
import type { McpManagedServerView, SkillEntry } from '@deepseek-ai/dsh-api-remotes/client'
import type { CommandContribution, PopupSelectSpec } from '@deepseek-ai/dsh-client-ui-commands/client'
import type { ClientSessionContext } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-locale/client'
import type {
  KnowledgeBaseSummary, KnowledgeExcerpt,
} from '@deepseek-ai/dsh-client-ui-sdkwork-knowledge/client'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { zh } from '../src/client/locales.ts'
import {
  createCapabilityRows, type CapabilityRowDeps,
} from '../src/client/rows.ts'

const t: TranslateNS<'composerCapabilities'> = makeTranslate(zh)

const session: ClientSessionContext = { sessionId: 'session-1' as SessionId }

const skill: SkillEntry = {
  name: 'code-review',
  description: 'Review a diff',
  userInvocable: true,
  modelInvocable: true,
  source: 'user',
  provider: 'filesystem',
}

const server: McpManagedServerView = {
  name: 'github',
  configured: true,
  status: { state: 'connected', toolCount: 3, connectedAt: 1 },
}

const base: readonly KnowledgeExcerpt[] = [{ title: 'Deploy', content: 'Run the pipeline.' }]

interface Harness {
  readonly deps: CapabilityRowDeps
  readonly catalog: {
    list: ReturnType<typeof vi.fn>
    retrieve: ReturnType<typeof vi.fn>
  }
  readonly appendDraft: ReturnType<typeof vi.fn>
  readonly notify: ReturnType<typeof vi.fn>
  readonly experts: {
    readonly createExpert: ReturnType<typeof vi.fn>
    readonly openMarket: ReturnType<typeof vi.fn>
    readonly openMine: ReturnType<typeof vi.fn>
  }
}

/**
 * Build one row harness.
 * @param overrides - dependency overrides for the case under test.
 * @param capabilities - knowledge base catalog behavior for the case under test.
 * @returns the deps plus the spies a case asserts on.
 */
function harness(
  overrides: Partial<CapabilityRowDeps> = {},
  capabilities: {
    bases?: readonly KnowledgeBaseSummary[]
    retrieve?: () => Promise<readonly KnowledgeExcerpt[]>
  } = {},
): Harness {
  const catalog = {
    list: vi.fn(async () => capabilities.bases ?? []),
    retrieve: vi.fn(capabilities.retrieve ?? (async () => base)),
  }
  const appendDraft = vi.fn()
  const notify = vi.fn()
  const experts = { createExpert: vi.fn(), openMarket: vi.fn(), openMine: vi.fn() }
  const deps: CapabilityRowDeps = {
    t,
    available: () => true,
    experts: () => experts,
    loadSkills: async () => [skill],
    loadMcpServers: async () => [server],
    knowledgeBases: () => ({ list: catalog.list, retrieve: catalog.retrieve }),
    readDraft: () => '',
    appendDraft,
    notify,
    ...overrides,
  }
  return { deps, catalog, appendDraft, notify, experts }
}

/**
 * Narrow one contribution to its popupSelect spec.
 * @param row - contribution under test.
 * @returns the popup spec.
 */
function popupOf(row: CommandContribution): PopupSelectSpec {
  if (row.ui.kind !== 'popupSelect') throw new Error('expected a popupSelect contribution')
  return row.ui
}

function signal(): AbortSignal {
  return new AbortController().signal
}

describe('capability rows', () => {
  it('registers the four rows in Add-section order with localized copy', () => {
    const { deps } = harness()
    const rows = createCapabilityRows(deps)

    expect(rows.map(row => row.name)).toEqual(['experts', 'skills', 'mcp', 'knowledge'])
    expect(rows.map(row => row.label?.())).toEqual(['专家', '技能', '连接器', '知识库'])
    expect(rows.map(row => row.description?.())).toEqual([
      '添加一位专家，让它参与本轮任务',
      '选一条技能，把它的调用插入本轮输入',
      '关联一个连接器，让本轮使用它的工具',
      '关联一个知识库，把检索到的内容带进本轮输入',
    ])
    for (const row of rows) {
      expect(row.icon).toBeTypeOf('function')
      expect(row.available(session)).toBe(true)
    }
  })

  it('asks the deployment whether a session may carry a pick', () => {
    const { deps } = harness({ available: () => false })
    for (const row of createCapabilityRows(deps)) expect(row.available(session)).toBe(false)
  })

  it('hides the knowledge row when the deployment has no Knowledge Base', () => {
    const { deps } = harness({ knowledgeBases: () => undefined })
    const rows = createCapabilityRows(deps)
    expect(rows.slice(0, 3).every(row => row.available(session))).toBe(true)
    expect(rows[3]?.available(session)).toBe(false)
  })

  it('keeps the expert row visible even when the Experts center has not mounted', () => {
    const { deps } = harness({ experts: () => undefined })
    const [expert] = createCapabilityRows(deps)
    expect(expert?.available(session)).toBe(true)
  })
})

describe('expert row', () => {
  it('lists the three expert-adding entries with localized copy', async () => {
    const { deps } = harness()
    const popup = popupOf(createCapabilityRows(deps)[0])

    await expect(popup.options(session, signal())).resolves.toEqual([
      { id: 'create', label: '创建专家', detail: '通过对话引导，创建一位本地运行的专家' },
      { id: 'market', label: '专家市场', detail: '打开云端专家目录，浏览并添加专家' },
      { id: 'mine', label: '我的专家', detail: '查看我的专家，或在这里创建与管理专家' },
    ])
    expect(popup.searchLabels?.()).toEqual({
      placeholder: '搜索专家…',
      empty: '没有可用的添加方式',
      noResults: '没有匹配项',
    })
  })

  it('hands each pick to the Experts center without touching the draft', async () => {
    const { deps, experts, appendDraft } = harness()
    const popup = popupOf(createCapabilityRows(deps)[0])

    await popup.onSelect({ id: 'create', label: '创建专家' }, session)
    await popup.onSelect({ id: 'market', label: '专家市场' }, session)
    await popup.onSelect({ id: 'mine', label: '我的专家' }, session)

    expect(experts.createExpert).toHaveBeenCalledOnce()
    expect(experts.openMarket).toHaveBeenCalledOnce()
    expect(experts.openMine).toHaveBeenCalledOnce()
    expect(appendDraft).not.toHaveBeenCalled()
  })

  it('reports a localized refusal when the Experts center is absent', () => {
    const { deps } = harness({ experts: () => undefined })
    const popup = popupOf(createCapabilityRows(deps)[0])
    expect(() => popup.onSelect({ id: 'mine', label: '我的专家' }, session))
      .toThrow('专家中心暂不可用，请稍后重试')
  })
})

describe('skill row', () => {
  it('loads the catalog for this session and maps the rows', async () => {
    const loadSkills = vi.fn(async () => [skill])
    const { deps } = harness({ loadSkills })
    const popup = popupOf(createCapabilityRows(deps)[1])
    const controller = new AbortController()

    await expect(popup.options(session, controller.signal)).resolves.toEqual([
      { id: 'code-review', label: 'code-review', detail: 'Review a diff' },
    ])
    expect(loadSkills).toHaveBeenCalledWith(session.sessionId, controller.signal)
    expect(popup.searchLabels?.()).toEqual({
      placeholder: '搜索技能…',
      empty: '没有可用的技能',
      noResults: '没有匹配项',
    })
    expect(popup.searchMode).toBe('fuzzy-label')
  })

  it('marks a skill the draft already invokes', async () => {
    const { deps } = harness({ readDraft: () => '/code-review now' })
    const popup = popupOf(createCapabilityRows(deps)[1])
    await expect(popup.options(session, signal())).resolves.toMatchObject([{ active: true }])
  })

  it('reports the retryable failure and drops a superseded opening', async () => {
    const failure = harness({ loadSkills: async () => { throw new Error('offline') } })
    const failing = popupOf(createCapabilityRows(failure.deps)[1])
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(failing.options(session, signal())).rejects.toThrow('目录加载失败，请重试')
    expect(errorSpy).toHaveBeenCalled()

    const controller = new AbortController()
    const aborted = harness({
      loadSkills: async () => {
        controller.abort()
        throw new Error('aborted')
      },
    })
    const superseded = popupOf(createCapabilityRows(aborted.deps)[1])
    await expect(superseded.options(session, controller.signal)).resolves.toEqual([])
    errorSpy.mockRestore()
  })

  it('inserts the chosen skill gesture', async () => {
    const { deps, appendDraft } = harness()
    const popup = popupOf(createCapabilityRows(deps)[1])
    await popup.onSelect({ id: 'code-review', label: 'code-review' }, session)
    expect(appendDraft).toHaveBeenCalledWith(session.sessionId, '/code-review ')
  })
})

describe('connector row', () => {
  it('lists the managed servers and inserts the chosen connector directive', async () => {
    const { deps, appendDraft } = harness()
    const popup = popupOf(createCapabilityRows(deps)[2])

    await expect(popup.options(session, signal())).resolves.toEqual([
      { id: 'github', label: 'github', detail: '已连接 · 3 个工具 · 工具前缀 mcp__github__' },
    ])
    expect(popup.searchLabels?.()).toEqual({
      placeholder: '搜索连接器…',
      empty: '还没有可用的连接器',
      noResults: '没有匹配项',
    })

    await popup.onSelect({ id: 'github', label: 'github' }, session)
    expect(appendDraft).toHaveBeenCalledWith(
      session.sessionId,
      '请使用连接器「github」的工具（mcp__github__）来完成这条输入。\n',
    )
  })
})

describe('knowledge row', () => {
  it('lists the knowledge bases the capability reports', async () => {
    const { deps, catalog } = harness({}, {
      bases: [{ id: '11', name: 'Team Handbook', kind: 'team', documentCount: 2 }],
    })
    const popup = popupOf(createCapabilityRows(deps)[3])
    const controller = new AbortController()

    await expect(popup.options(session, controller.signal)).resolves.toEqual([
      {
        id: '11',
        label: 'Team Handbook',
        detail: '2 个文档',
        group: { name: 'team', label: '团队知识库' },
      },
    ])
    expect(catalog.list).toHaveBeenCalledWith(controller.signal)
  })

  it('fails the popup when the catalog disappeared after the menu opened', async () => {
    const { deps } = harness({ knowledgeBases: () => undefined })
    const popup = popupOf(createCapabilityRows(deps)[3])
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(popup.options(session, signal())).rejects.toThrow('目录加载失败，请重试')
    await expect(popup.onSelect({ id: '11', label: 'KB' }, session)).rejects.toThrow('知识库暂不可用，无法关联')
    errorSpy.mockRestore()
  })

  it('retrieves passages for the draft and inserts them with the link', async () => {
    const { deps, catalog, appendDraft } = harness({ readDraft: () => 'how do we deploy?' })
    const popup = popupOf(createCapabilityRows(deps)[3])

    await popup.onSelect({ id: '11', label: 'Team Handbook' }, session)

    expect(catalog.retrieve).toHaveBeenCalledWith(
      'how do we deploy?',
      ['11'],
      expect.any(AbortSignal),
    )
    expect(appendDraft).toHaveBeenCalledWith(session.sessionId, [
      '请结合知识库「Team Handbook」回答这条输入。',
      '从知识库「Team Handbook」检索到的相关内容：',
      '> [1] Deploy: Run the pipeline.',
      '',
    ].join('\n'))
  })

  it('skips retrieval for an empty draft', async () => {
    const { deps, catalog } = harness()
    const popup = popupOf(createCapabilityRows(deps)[3])
    await popup.onSelect({ id: '11', label: 'KB' }, session)
    expect(catalog.retrieve).not.toHaveBeenCalled()
  })

  it('keeps the link and reports an empty retrieval', async () => {
    const { deps, appendDraft, notify } = harness({ readDraft: () => 'question' }, { retrieve: async () => [] })
    const popup = popupOf(createCapabilityRows(deps)[3])

    await popup.onSelect({ id: '11', label: 'KB' }, session)

    expect(notify).toHaveBeenCalledWith(session.sessionId, '已关联知识库，但这次没有检索到内容')
    expect(appendDraft).toHaveBeenCalledWith(session.sessionId, '请结合知识库「KB」回答这条输入。\n')
  })

  it('keeps the link when retrieval fails', async () => {
    const { deps, catalog, appendDraft, notify } = harness({ readDraft: () => 'question' })
    catalog.retrieve.mockRejectedValue(new Error('network'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const popup = popupOf(createCapabilityRows(deps)[3])

    await popup.onSelect({ id: '11', label: 'KB' }, session)

    expect(warnSpy).toHaveBeenCalled()
    expect(notify).toHaveBeenCalledWith(session.sessionId, '已关联知识库，但这次没有检索到内容')
    expect(appendDraft).toHaveBeenCalledWith(session.sessionId, '请结合知识库「KB」回答这条输入。\n')
    warnSpy.mockRestore()
  })
})
