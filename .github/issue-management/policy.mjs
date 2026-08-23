#!/usr/bin/env node

import fs from 'node:fs'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

import config from './config.json' with { type: 'json' }

const API_VERSION = '2026-03-10'
const BODY_LIMIT = 50
const AUDIT_MARKER = '<!-- alego-issue-policy -->'
const OWNER_LINE = /^Owner: @([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)$/
const TYPES = new Set(['Idea', 'Feature', 'Bug', 'Research', 'Task'])
const PRIORITIES = ['p0', 'p1', 'p2', 'p3']
const PR_KINDS = new Set([
  'kind/feature',
  'kind/bug-fix',
  'kind/doc',
  'kind/testing',
  'kind/cleanup',
  'kind/dependency',
])
// Retired label aliases stay reserved so they cannot be recreated.
const LEGACY_LABELS = new Set([
  'kind/bug',
  'kind/documentation',
  'feature',
  'bug-fix',
  'doc',
  'cleanup',
  'testing',
  'dependencies',
  'ci',
  'cli',
  'llm',
  'web-search',
])
const TERMINAL_STATUSES = new Set(['Done', 'No action'])
const ACTIVE_STATUS_ORDER = config.statuses.filter((status) => !TERMINAL_STATUSES.has(status))
const IMPLEMENTATION_PULL_REQUEST_ACTIONS = new Set([
  'opened',
  'edited',
  'synchronize',
  'reopened',
  'labeled',
  'unlabeled',
])

for (const status of ['In progress', 'In review']) {
  if (!ACTIVE_STATUS_ORDER.includes(status)) throw new Error(`config.statuses is missing ${status}`)
}
if (typeof config.lifecycleActor !== 'string' || !config.lifecycleActor) {
  throw new Error('config.lifecycleActor is not set')
}

/**
 * Return Markdown outside balanced details elements.
 * @param {string} body Markdown body.
 * @returns {{text: string, balanced: boolean, detailsCount: number, allCollapsed: boolean}} Visible source and details shape.
 */
export function extractOutsideDetails(body) {
  const source = body.replace(/<!--[\s\S]*?-->/g, '')
  const tag = /<\/?details\b[^>]*>/gi
  let depth = 0
  let cursor = 0
  let balanced = true
  let text = ''
  let detailsCount = 0
  let allCollapsed = true

  for (const match of source.matchAll(tag)) {
    const index = match.index ?? 0
    if (depth === 0) text += source.slice(cursor, index)
    if (/^<\//.test(match[0])) {
      if (depth === 0) balanced = false
      else depth -= 1
    } else {
      depth += 1
      detailsCount += 1
      if (/\sopen(?:\s|=|>)/i.test(match[0])) allCollapsed = false
    }
    cursor = index + match[0].length
  }

  if (depth === 0) text += source.slice(cursor)
  if (depth !== 0) balanced = false
  return { text, balanced, detailsCount, allCollapsed }
}

/**
 * Count Chinese characters and contiguous Latin, numeric, or code tokens.
 * @param {string} body Markdown body.
 * @returns {{units: number, balanced: boolean, detailsCount: number, allCollapsed: boolean}} Visible unit count and details shape.
 */
export function countVisibleUnits(body) {
  const outside = extractOutsideDetails(body)
  const visible = outside.text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .replace(/<((?:https?:\/\/|mailto:)[^>]+)>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:[A-Za-z]+|#\d+|#x[0-9A-Fa-f]+);/g, ' ')
    .replace(/[\u0060*~\[\]{}()<>#!|]/g, ' ')
  const han = visible.match(/\p{Script=Han}/gu)?.length ?? 0
  const tokens = visible.match(/[\p{Script=Latin}\p{Number}_./:@+-]+/gu)?.length ?? 0
  return {
    units: han + tokens,
    balanced: outside.balanced,
    detailsCount: outside.detailsCount,
    allCollapsed: outside.allCollapsed,
  }
}

function firstNonblankLine(body) {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean)
}

/**
 * Validate required body sections and check Owner against assignees.
 * @param {{body: string, assignees: string[], allowUnassignedOwner?: boolean}} input Body input.
 * @returns {string[]} Validation errors.
 */
export function validateBody({
  body,
  assignees,
  allowUnassignedOwner = config.allowUnassignedOwner ?? false,
}) {
  const errors = []
  const count = countVisibleUnits(body)
  const owner = firstNonblankLine(body)?.match(OWNER_LINE)?.[1] ?? null
  const normalized = [...new Set(assignees.map((login) => login.toLowerCase()))]

  if (!count.balanced) errors.push('details tags must be balanced')
  if (count.detailsCount === 0) errors.push('body must contain a collapsed <details> section')
  if (!count.allCollapsed) errors.push('details must be collapsed by default; open is not allowed')
  if (count.units > BODY_LIMIT) {
    errors.push(`body exposes ${count.units} units outside details, over the 50-unit limit`)
  }
  if (normalized.length >= 2 && !owner) {
    errors.push('with multiple assignees the first non-blank line must be Owner: @login')
  } else if (normalized.length >= 2 && !normalized.includes(owner.toLowerCase())) {
    errors.push('Owner must be one of the assignees')
  } else if (
    normalized.length < 2 &&
    owner &&
    !(normalized.length === 0 && allowUnassignedOwner)
  ) {
    errors.push('with zero or one assignee an Owner line is not allowed')
  }
  return errors
}

/**
 * Decide whether the human-review policy applies to a PR.
 * @param {{isDraft: boolean, authorType: string, reviewRequestCount: number, reviewCount: number}} input PR state.
 * @returns {boolean} Whether the PR policy is mandatory.
 */
export function requiresPullRequestPolicy({
  isDraft,
  authorType,
  reviewRequestCount,
  reviewCount,
}) {
  const automated = authorType === 'Bot' || authorType === 'App'
  return !isDraft && !automated && (reviewRequestCount > 0 || reviewCount > 0)
}

/**
 * Translate a repository event into one resolving-Issue lifecycle command.
 * @param {string} eventName GitHub event name.
 * @param {{action?: string, review?: {state?: string}}} event GitHub event payload.
 * @returns {'implementation'|'review-requested'|'changes-requested'|null} Lifecycle command.
 */
export function resolvingIssueStatusCommand(eventName, event) {
  if (eventName === 'pull_request') {
    if (event.action === 'review_requested') return 'review-requested'
    return IMPLEMENTATION_PULL_REQUEST_ACTIONS.has(event.action) ? 'implementation' : null
  }
  if (
    eventName === 'pull_request_review' &&
    event.action === 'submitted' &&
    event.review?.state?.toLowerCase() === 'changes_requested'
  ) {
    return 'changes-requested'
  }
  return null
}

/**
 * Plan one event-directed resolving-Issue status transition.
 * @param {string|null} currentStatus Current Project status.
 * @param {'implementation'|'review-requested'|'changes-requested'} command Lifecycle command.
 * @param {string|null} currentStatusActor Actor that last set the current Project status.
 * @returns {string|null} Status to write, or null when no permitted transition exists.
 */
export function nextResolvingIssueStatus(currentStatus, command, currentStatusActor = null) {
  let target
  if (command === 'review-requested') target = 'In review'
  else if (command === 'implementation' || command === 'changes-requested') target = 'In progress'
  else throw new Error(`unknown lifecycle command: ${command}`)

  const currentIndex = ACTIVE_STATUS_ORDER.indexOf(currentStatus)
  const targetIndex = ACTIVE_STATUS_ORDER.indexOf(target)
  if (
    command === 'changes-requested' &&
    currentStatus === 'In review' &&
    currentStatusActor === config.lifecycleActor
  ) {
    return target
  }
  return currentIndex >= 0 && currentIndex < targetIndex ? target : null
}

function stripIgnoredMarkdown(body) {
  const lines = body.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/)
  const kept = []
  let fence = null
  for (const line of lines) {
    const marker = line.match(/^\s*([\u0060~]{3,})/)
    if (marker) {
      if (fence === null) fence = marker[1][0]
      else if (marker[1][0] === fence) fence = null
      continue
    }
    if (fence === null) kept.push(line)
  }
  return kept.join('\n').replace(/\u0060[^\u0060]*\u0060/g, ' ')
}

/**
 * Parse same-repository resolving and informational references.
 * @param {{body: string, repository: string}} input PR body and repository.
 * @returns {{all: number[], resolving: number[], related: number[]}} References.
 */
export function parseReferences({ body, repository }) {
  const source = stripIgnoredMarkdown(body)
  const expected = repository.toLowerCase()
  const all = new Set()
  const resolving = new Set()
  const reference =
    /(?:([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)#|#)(\d+)|https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/issues\/(\d+)/gi
  const closing =
    /\b(?:close(?:s|d)?|fix(?:es|ed)?|resolve(?:s|d)?)\s*:?\s+(?:(?:([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)#|#)(\d+)|https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/issues\/(\d+))/gi

  for (const match of source.matchAll(reference)) {
    const explicit = (match[1] ?? match[3] ?? '').toLowerCase()
    const number = Number(match[2] ?? match[4])
    if (!explicit || explicit === expected) all.add(number)
  }
  for (const match of source.matchAll(closing)) {
    const explicit = (match[1] ?? match[3] ?? '').toLowerCase()
    const number = Number(match[2] ?? match[4])
    if (!explicit || explicit === expected) {
      all.add(number)
      resolving.add(number)
    }
  }
  return {
    all: [...all].sort((left, right) => left - right),
    resolving: [...resolving].sort((left, right) => left - right),
    related: [...all].filter((number) => !resolving.has(number)).sort((a, b) => a - b),
  }
}

/**
 * Retain only references that resolve to Issues rather than pull requests.
 * @param {{all: number[], resolving: number[], related: number[]}} references Parsed references.
 * @param {Map<number, unknown>} issues Resolved same-repository Issues.
 * @returns {{all: number[], resolving: number[], related: number[]}} Issue-only references.
 */
export function retainIssueReferences(references, issues) {
  return {
    all: references.all.filter((number) => issues.has(number)),
    resolving: references.resolving.filter((number) => issues.has(number)),
    related: references.related.filter((number) => issues.has(number)),
  }
}

/**
 * Validate one Issue with its Project status.
 * @param {{title: string, body: string, assignees: string[], labels: string[], type: string|null, priority: string|null, status: string|null, state: string, stateReason: string|null}} issue Issue snapshot.
 * @returns {string[]} Validation errors.
 */
export function validateIssue(issue) {
  const errors = validateBody(issue)
  const status = issue.status
  const invalidLabels = issue.labels.filter(
    (label) => label.startsWith('kind/') || LEGACY_LABELS.has(label),
  )

  if (!/\p{Script=Han}/u.test(issue.title)) errors.push('Issue title must contain Chinese')
  if (invalidLabels.length > 0) {
    errors.push(`Issue must not use PR kind or legacy labels: ${invalidLabels.join(', ')}`)
  }
  if (
    /^\s*(?:\[(?:Idea|Feature|Bug|Research|Task|P[0-3]|Inbox|Backlog|Ready|In progress|In review|Done|No action|Owner|area\/[^\]]+)[^\]]*\]|(?:Idea|Feature|Bug|Research|Task|P[0-3]|Inbox|Backlog|Ready|In progress|In review|Done|No action|Owner|area\/[^:： ]+)\s*[:：-])/iu.test(
      issue.title,
    )
  ) {
    errors.push('Issue title must not carry a Type, Priority, Status, area, or Owner prefix')
  }
  if (!TYPES.has(issue.type ?? '')) errors.push('Type must be one of the five native Types')
  if (!status || !config.statuses.includes(status)) errors.push('Issue must be in the Project with a valid Status')
  if (issue.priority !== null && !PRIORITIES.includes(issue.priority.toLowerCase())) {
    errors.push('Priority must be empty or P0-P3')
  }
  if (status === 'Done' && (issue.state !== 'closed' || issue.stateReason !== 'completed')) {
    errors.push('Done requires the Completed close reason')
  }
  if (
    status === 'No action' &&
    (issue.state !== 'closed' || issue.stateReason !== 'not_planned')
  ) {
    errors.push('No action requires the Not planned close reason')
  }
  if (!['Done', 'No action'].includes(status ?? '') && issue.state !== 'open') {
    errors.push(`${status} requires an open Issue`)
  }
  return errors
}

/**
 * Validate PR metadata and its referenced Issues.
 * @param {{authorType: string, labels: string[], references: ReturnType<typeof parseReferences>, issues: Map<number, {priority: string|null}>}} input PR snapshot.
 * @returns {string[]} Validation errors.
 */
export function validatePullRequest(input) {
  if (!requiresPullRequestPolicy(input)) return []
  const errors = []
  const kinds = input.labels.filter((label) => PR_KINDS.has(label))
  const unknownKinds = input.labels.filter(
    (label) => label.startsWith('kind/') && !PR_KINDS.has(label) && !LEGACY_LABELS.has(label),
  )
  const legacyLabels = input.labels.filter((label) => LEGACY_LABELS.has(label))
  const sourceLabels = input.labels.filter((label) => label.startsWith('source/'))
  const priorities = input.labels.filter((label) => PRIORITIES.includes(label))
  const areas = input.labels.filter((label) => label.startsWith('area/'))

  if (input.references.all.length === 0) errors.push('PR body must reference at least one Issue in this repository')
  if (kinds.length !== 1) {
    errors.push(`PR must carry exactly one allowed kind/*, found ${kinds.length}`)
  }
  if (unknownKinds.length > 0) {
    errors.push(`PR carries unsupported kind/*: ${unknownKinds.join(', ')}`)
  }
  if (legacyLabels.length > 0) errors.push(`PR carries legacy labels: ${legacyLabels.join(', ')}`)
  if (sourceLabels.length > 0) errors.push(`source/* applies to Issues only: ${sourceLabels.join(', ')}`)
  if (priorities.length > 1) errors.push(`PR may carry at most one p0-p3, found ${priorities.length}`)
  if (areas.length === 0) errors.push('PR must carry at least one area/*')
  for (const number of input.references.all) {
    if (!input.issues.has(number)) errors.push(`#${number} is not an Issue in this repository`)
  }

  const resolving = input.references.resolving
    .map((number) => [number, input.issues.get(number)])
    .filter((entry) => entry[1])
  if (resolving.length === 0) return errors

  const issuePriorities = resolving
    .map(([, issue]) => issue.priority?.toLowerCase())
    .filter((priority) => PRIORITIES.includes(priority))
  if (priorities.length === 0 && issuePriorities.length > 0) {
    const highest = issuePriorities.sort(
      (left, right) => PRIORITIES.indexOf(left) - PRIORITIES.indexOf(right),
    )[0]
    errors.push(`PR Priority must be ${highest}`)
  } else if (priorities.length === 1 && issuePriorities.length !== resolving.length) {
    errors.push('a resolving PR with a Priority requires every resolved Issue to set one')
  } else if (priorities.length === 1) {
    const highest = issuePriorities.sort(
      (left, right) => PRIORITIES.indexOf(left) - PRIORITIES.indexOf(right),
    )[0]
    if (priorities[0] !== highest) errors.push(`PR Priority must be ${highest}`)
  }
  return errors
}

function token() {
  const value = process.env.GH_TOKEN || process.env.GITHUB_TOKEN
  if (!value) throw new Error('GH_TOKEN or GITHUB_TOKEN is not set')
  return value
}

async function api(path, options = {}) {
  const response = await fetch(`${process.env.GITHUB_API_URL ?? 'https://api.github.com'}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token()}`,
      'X-GitHub-Api-Version': API_VERSION,
      'User-Agent': 'alego-issue-policy',
      ...options.headers,
    },
  })
  if (options.allow404 && response.status === 404) return null
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`${options.method ?? 'GET'} ${path}: ${response.status} ${body}`)
  }
  if (response.status === 204) return null
  return response.json()
}

async function graphql(query, variables) {
  const result = await api('/graphql', {
    method: 'POST',
    body: JSON.stringify({ query, variables }),
    headers: { 'Content-Type': 'application/json' },
  })
  if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join('; '))
  return result.data
}

async function issueSnapshot(number, status = undefined) {
  const issue = await api(`/repos/${config.organization}/${config.repository}/issues/${number}`)
  if (issue.pull_request) return null
  const values = await api(
    `/repos/${config.organization}/${config.repository}/issues/${number}/issue-field-values?per_page=100`,
  )
  const field = (name) => values.find((value) => value.issue_field_name === name)
  return {
    number,
    nodeId: issue.node_id,
    title: issue.title,
    body: issue.body ?? '',
    assignees: issue.assignees.map((assignee) => assignee.login),
    labels: issue.labels.map((label) => label.name),
    type: issue.type?.name ?? null,
    priority: field(config.priorityField)?.single_select_option?.name ?? null,
    status: status === undefined ? await projectStatus(number) : status,
    state: issue.state,
    stateReason: issue.state_reason ?? null,
  }
}

async function projectContext(number, includeStatusActor = false) {
  const data = await graphql(
    `query(
      $organization: String!
      $repository: String!
      $number: Int!
      $project: Int!
      $includeStatusActor: Boolean!
    ) {
      organization(login: $organization) {
        projectV2(number: $project) {
          id
          title
          fields(first: 50) {
            nodes {
              ... on ProjectV2SingleSelectField { id name options { id name } }
            }
          }
        }
      }
      repository(owner: $organization, name: $repository) {
        issue(number: $number) {
          id
          timelineItems(last: 100, itemTypes: [PROJECT_V2_ITEM_STATUS_CHANGED_EVENT])
            @include(if: $includeStatusActor) {
            nodes {
              ... on ProjectV2ItemStatusChangedEvent {
                actor { login }
                project { id }
                status
              }
            }
          }
          projectItems(first: 20, includeArchived: true) {
            nodes {
              id
              project { id }
              fieldValueByName(name: "Status") {
                ... on ProjectV2ItemFieldSingleSelectValue { name optionId }
              }
            }
          }
        }
      }
    }`,
    {
      organization: config.organization,
      repository: config.repository,
      number,
      project: config.projectNumber,
      includeStatusActor,
    },
  )
  const project = data.organization?.projectV2
  const issue = data.repository?.issue
  if (!project || project.title !== config.projectTitle) throw new Error('target Project is missing or its title does not match')
  if (!issue) throw new Error(`#${number} does not exist`)
  const statusField = project.fields.nodes.find((field) => field?.name === 'Status')
  if (!statusField) throw new Error('Project has no Status field')
  const item = issue.projectItems.nodes.find((candidate) => candidate.project.id === project.id)
  const latestStatusEvent = issue.timelineItems?.nodes
    ?.filter((event) => event?.project?.id === project.id)
    .at(-1)
  const statusActor =
    latestStatusEvent?.status === item?.fieldValueByName?.name
      ? (latestStatusEvent.actor?.login ?? null)
      : null
  return { project, issue, statusField, item, statusActor }
}

async function projectStatus(number) {
  const context = await projectContext(number)
  return context.item?.fieldValueByName?.name ?? null
}

async function ensureProjectItem(number) {
  const context = await projectContext(number)
  if (context.item) return context
  const data = await graphql(
    `mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
        item { id }
      }
    }`,
    { projectId: context.project.id, contentId: context.issue.id },
  )
  return {
    ...context,
    item: { id: data.addProjectV2ItemById.item.id, fieldValueByName: null },
  }
}

async function updateStatus(context, status) {
  const option = context.statusField.options.find((candidate) => candidate.name === status)
  if (!option) throw new Error(`Status does not exist: ${status}`)
  if (context.item.fieldValueByName?.name === status) return
  await graphql(
    `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId,
        itemId: $itemId,
        fieldId: $fieldId,
        value: {singleSelectOptionId: $optionId}
      }) { projectV2Item { id } }
    }`,
    {
      projectId: context.project.id,
      itemId: context.item.id,
      fieldId: context.statusField.id,
      optionId: option.id,
    },
  )
}

async function setStatus(number, status) {
  await updateStatus(await ensureProjectItem(number), status)
}

async function upsertAudit(number, errors) {
  const comments = await api(
    `/repos/${config.organization}/${config.repository}/issues/${number}/comments?per_page=100`,
  )
  const existing = comments.find(
    (comment) => comment.user?.type === 'Bot' && comment.body?.includes(AUDIT_MARKER),
  )
  if (errors.length === 0) {
    if (existing) {
      await api(`/repos/${config.organization}/${config.repository}/issues/comments/${existing.id}`, {
        method: 'DELETE',
      })
    }
    return
  }
  const body = `${AUDIT_MARKER}\n⚠️ Issue policy failed:\n\n${errors.map((error) => `- ${error}`).join('\n')}`
  if (existing) {
    if (existing.body === body) return
    await api(`/repos/${config.organization}/${config.repository}/issues/comments/${existing.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ body }),
      headers: { 'Content-Type': 'application/json' },
    })
  } else {
    await api(`/repos/${config.organization}/${config.repository}/issues/${number}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function auditIssue(number, extraErrors = [], status = undefined) {
  const issue = await issueSnapshot(number, status)
  if (!issue) return []
  const errors = [...extraErrors, ...validateIssue(issue)]
  await upsertAudit(number, errors)
  return errors
}

async function resolvingReferencesSnapshot(number, pull) {
  const references = parseReferences({
    body: pull.body ?? '',
    repository: `${config.organization}/${config.repository}`,
  })
  const issues = new Map()
  for (const issueNumber of references.all) {
    const issue = await issueSnapshot(issueNumber, null)
    if (issue) issues.set(issueNumber, issue)
  }
  return {
    number,
    references: retainIssueReferences(references, issues),
    issues,
  }
}

async function pullRequestSnapshot(number) {
  const [pull, reviewRequests, reviews] = await Promise.all([
    api(`/repos/${config.organization}/${config.repository}/pulls/${number}`),
    api(`/repos/${config.organization}/${config.repository}/pulls/${number}/requested_reviewers`),
    api(`/repos/${config.organization}/${config.repository}/pulls/${number}/reviews?per_page=100`),
  ])
  const resolving = await resolvingReferencesSnapshot(number, pull)
  return {
    ...resolving,
    isDraft: pull.draft,
    authorType: pull.user?.type ?? 'User',
    reviewRequestCount: reviewRequests.users.length + reviewRequests.teams.length,
    reviewCount: reviews.length,
    labels: pull.labels.map((label) => label.name),
  }
}

async function lifecyclePullRequestSnapshot(number) {
  const pull = await api(`/repos/${config.organization}/${config.repository}/pulls/${number}`)
  return resolvingReferencesSnapshot(number, pull)
}

async function transitionResolvingIssues(pull, command) {
  for (const number of pull.references.resolving) {
    const context = await projectContext(number, command === 'changes-requested')
    const target = nextResolvingIssueStatus(
      context.item?.fieldValueByName?.name ?? null,
      command,
      context.statusActor,
    )
    if (!target) continue
    // TODO: Replace this latest-state guard with per-Issue serialization or a
    // conditional ProjectV2 update; GraphQL currently has no compare-and-swap.
    await updateStatus(context, target)
    await auditIssue(number)
  }
}

async function runPullRequestCheck(event) {
  const pull = await pullRequestSnapshot(event.pull_request.number)
  const errors = validatePullRequest(pull)
  if (errors.length > 0) {
    for (const error of errors) process.stdout.write(`::error::${error}\n`)
    throw new Error(`Issue policy failed with ${errors.length} error(s)`)
  }
  process.stdout.write(
    requiresPullRequestPolicy(pull) ? 'Issue policy passed.\n' : 'PR is not yet in scope for Issue policy enforcement.\n',
  )
}

async function runLifecycle(eventName, event) {
  if (eventName === 'issues') {
    const number = event.issue.number
    if (event.action === 'opened') await setStatus(number, 'Inbox')
    if (event.action === 'closed') {
      const target = event.issue.state_reason === 'not_planned' ? 'No action' : 'Done'
      await setStatus(number, target)
    }
    if (event.action === 'reopened') {
      await setStatus(number, 'Inbox')
    }
    await ensureProjectItem(number)
    await auditIssue(number)
    return
  }

  if (eventName === 'pull_request' || eventName === 'pull_request_review') {
    const command = resolvingIssueStatusCommand(eventName, event)
    if (!command) return
    const pull = await lifecyclePullRequestSnapshot(event.pull_request.number)
    await transitionResolvingIssues(pull, command)
  }
}

function readEvent() {
  if (!process.env.GITHUB_EVENT_PATH) throw new Error('GITHUB_EVENT_PATH is not set')
  return JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
}

async function main(argv) {
  const [command] = argv
  if (command === 'pr') await runPullRequestCheck(readEvent())
  else if (command === 'lifecycle') await runLifecycle(process.env.GITHUB_EVENT_NAME, readEvent())
  else throw new Error('usage: policy.mjs pr|lifecycle')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
