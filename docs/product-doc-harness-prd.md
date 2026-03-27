# Product Requirements Document

## Product

Working title: Harness Docs

Harness Docs is a desktop application for small cross-functional product teams that need one shared system for product-development documents without forcing everyone into developer-native tools. The app owns the document source of truth, helps users create and update structured documents with AI, and publishes documentation changes to a dedicated GitHub repository through automated branch, commit, and pull request flows.

## Problem

Small product teams often keep product requirements, UX flows, technical specs, and decision records in fragmented role-specific documents. The result is drift between PM, design, and engineering views, weak traceability, and painful publishing workflows. Existing documentation tools often optimize either for free-form collaboration or for developer workflows, but not for structured multi-role governance with publishable Markdown output.

## Target Customer

Primary customer: small cross-functional product teams.

Primary users:
- PMs and product owners
- Designers
- Developers
- Lead-level decision-makers
- Other collaborators who contribute to product documentation

## Goals

- Unify role-specific product documents inside one desktop app.
- Keep documents structured, traceable, and reviewable without requiring a CLI or TUI workflow.
- Support AI-guided document creation through interviews and internal-document exploration.
- Preserve Markdown as the editable and publishable document format.
- Publish to a dedicated GitHub documentation repository with automated branch, commit, and PR creation.
- Make stale state visible without hard-blocking users.

## Implementation Direction

V1 desktop client stack:
- Tauri v2 as the desktop shell
- React + TypeScript + Vite for the desktop UI
- Markdown source editing plus preview as the primary document editor

Implementation note:
- Cloud-hosted workspace and approval services remain required, but Tauri is the fixed desktop application container for v1.

## Non-Goals For V1

- Real-time simultaneous co-editing by multiple editors in the same document.
- Slack- or email-specific notification integrations.
- GitLab, Bitbucket, Perforce, SVN, or other non-GitHub integrations.
- AI exploration of source code, PR history, or commit history.
- Rich block editor as the primary editing experience.
- Version restore from historical revisions.

## Product Principles

- The app, not GitHub, is the source of truth for document state, approvals, and governance.
- GitHub is the publication target, not the authority on whether a document is current.
- Separate role-specific documents are first-class citizens.
- Structure matters more than unconstrained free-form writing.
- AI should propose drafts and actions, but people remain in control of approval and publishing.
- Governance should be visible and auditable without becoming a hard block in urgent situations.

## Core Concepts

### Workspace

A workspace is a cloud-hosted team space connected to exactly one dedicated GitHub documentation repository. A single user may belong to multiple workspaces.

Workspace settings persist at most one connected GitHub documentation repository reference. A workspace may have no connected repository during setup, but it cannot store multiple connected repository references in v1.

### First-Class Document Types

V1 must support these first-class document types:
- PRD
- UX Flow
- Technical Spec
- Policy/Decision Document

External design tools such as Figma are reference-only artifacts. They may be linked, but they are not first-class documents in V1.

### Templates

The system ships with default templates for each first-class document type. Teams may edit those templates, and template changes are versioned and published through the same governance and GitHub pipeline as normal documents.

### Traceable Links And Invalidation

Documents can create explicit traceable links to one another. Link rules determine which downstream documents may become stale when an upstream document changes.

V1 invalidation rules:
- PRD changes may invalidate UX Flow and Technical Spec documents.
- UX Flow changes may invalidate Technical Spec documents.
- Policy/Decision changes may invalidate any linked downstream document that depends on that decision.

### Current vs Stale

Current vs stale is evaluated at publish time, not on every draft edit. The app must clearly show stale state, unresolved invalidations, and missing approvals before publication. The user may still publish, but the publish record must capture rationale and unresolved issues.

## Users And Roles

### Contributor

Contributors can create documents, request AI assistance, edit documents when they hold the lock, comment, mention collaborators, and publish.

### Lead-Level Decision-Maker

Lead-level decision-makers are the minimum approval authority for restoring a stale downstream document to current status. This authority is managed inside the app, not inferred purely from GitHub permissions.

### Approval Candidate

The app should import GitHub members or teams as initial approval candidates for a workspace, but final approver assignment lives in the app.

## Identity And Session Model

### GitHub OAuth Only

V1 authentication is GitHub OAuth only. The desktop app must not offer local credentials, magic links, SSO alternatives, or additional social login providers.

### Desktop Sign-In Flow

1. User clicks `Continue with GitHub`.
2. The desktop app opens the system browser to GitHub OAuth consent.
3. After successful authorization, the user returns to the app through a secure callback or device-completion flow.
4. The backend exchanges the authorization grant for GitHub identity data and app-managed session credentials.
5. The app establishes an authenticated session and loads the user's workspace memberships.

The user should not need Git knowledge, PAT creation, or manual OAuth app setup to complete sign-in.

### App Session

After GitHub authentication, the system creates an app session tied to the cloud-hosted workspace service. The app session, not a raw GitHub access token shown to the user, is the mechanism used for day-to-day access to workspaces, documents, approvals, comments, and publish actions.

Session requirements:
- The app must persist a secure signed-in session across desktop restarts until explicit sign-out, session expiry, or admin revocation.
- The app must restore the last active workspace context after session recovery when that membership is still valid.
- The app must let a signed-in user switch between workspaces they belong to without re-running OAuth each time.
- The app must clearly distinguish between authenticated-but-no-workspace and authenticated-with-workspace states.

### Workspace Membership

Workspace membership is app-managed and independent from GitHub repository collaborator status after initial identity verification.

Membership requirements:
- A GitHub-authenticated user can be added to more than one workspace.
- A user can establish a usable app session only for workspaces where they are an active member.
- If a user authenticates successfully but belongs to no workspace yet, the app must route them to create a workspace or accept an invitation.
- If a user's membership is removed from one workspace, the app session remains valid for any other workspaces they still belong to.
- Workspace role and approval authority are resolved from app-managed membership records, not directly from GitHub permissions.

## End-To-End User Flows

### 1. Workspace Creation

1. User signs in with GitHub OAuth.
2. App establishes a signed-in session and loads any existing workspace memberships.
3. User creates a workspace or joins an existing cloud-hosted workspace.
4. Workspace is connected to one dedicated GitHub documentation repository.
5. GitHub collaborators and teams are imported as candidate approvers.

### 2. Document Creation

1. User creates a document from a system template.
2. User may choose Codex or Claude for AI assistance.
3. AI can interview the user, explore existing app documents, and generate a structured draft.
4. AI may propose document body, document links, approval targets, and publish memo drafts.

### 3. Editing

1. User clicks `Start Editing` to acquire the document lock.
2. While locked, other users can view but cannot edit.
3. Lock holder is visible to the team.
4. If the lock holder is inactive for 30 minutes, the lock auto-expires.
5. Editing experience is Markdown source plus preview.

### 4. Review And Discussion

1. Users leave block-level comments and mentions.
2. Linked document changes create review requests and notifications.
3. Review state is tracked in the app.
4. App approvals, not GitHub approvals, determine official current status.

### 5. Publish

1. User initiates publish from the app.
2. App evaluates linked invalidations and approval state.
3. App shows whether the document is current or stale.
4. If stale, user may still continue, but must provide rationale.
5. App records unresolved invalidations and missing approvals in the publish record.
6. App automatically creates branch, commit, and PR in the dedicated GitHub repository.

## Functional Requirements

### Identity And Workspace

- The system must support GitHub OAuth as the only login mechanism in V1.
- The system must open GitHub OAuth in the system browser and return the user to the desktop app with an authenticated app session.
- The system must create an app-managed session after GitHub authentication and restore that session across app relaunches until sign-out or expiry.
- The system must support cloud-hosted team workspaces.
- Each workspace must map to one dedicated GitHub documentation repository.
- A user must be able to belong to multiple workspaces.
- The system must load all active workspace memberships for the authenticated user after sign-in.
- The system must allow an authenticated user with no workspace memberships to create a workspace or join through invitation.
- The system must treat workspace membership and authority as app-managed records rather than direct GitHub repository permissions.

### Document System

- The system must support separate role-specific documents rather than one canonical shared document with role overlays.
- The system must support PRD, UX Flow, Technical Spec, and Policy/Decision documents in V1.
- The system must store document content in Markdown-compatible form.
- The system must allow teams to customize system-provided templates.
- The system must version and publish template changes through the same GitHub pipeline.

### Editing And Locking

- The desktop application shell must be implemented with Tauri in V1.
- The desktop UI must be implemented with React, TypeScript, and Vite unless a later architecture decision explicitly replaces that stack.
- The system must require an explicit `Start Editing` action to obtain a document lock.
- The system must prevent a second user from editing a locked document.
- The system must show which user currently holds the lock.
- The system must auto-release locks after 30 minutes of inactivity.
- The system must provide Markdown source editing with live or near-live preview.

### Comments, Mentions, And Notifications

- The system must support paragraph- or block-level comments.
- The system must support mentions inside comments.
- The system must support in-app notifications.
- The system must support outbound notification webhooks.
- The system must generate review requests when linked documents change.

### Governance

- The system must track explicit traceable links between documents.
- The system must apply invalidation rules based on document type and link relationships.
- The system must require lead-level approval to restore a stale downstream document to current status.
- The system must keep approval authority inside the app, even if GitHub identities are imported.
- The system must evaluate stale vs current at publish time only.
- The system must not hard-block stale publish.
- The system must require rationale for stale publish.
- The system must record unresolved invalidations and unresolved approvals in the publish record.

### GitHub Integration

- The system must support GitHub only in V1.
- The system must publish to a dedicated documentation repository.
- The system must automate branch creation, commit creation, and PR creation.
- The system must treat GitHub PRs as publication artifacts, not as the source of truth for approval state.

### AI Harness

- The system must support both Codex and Claude in V1.
- The system must let the user choose the AI provider per task.
- The primary AI UX must be action-button driven, with optional free-form chat.
- The AI must support interview-driven drafting.
- The AI must search only the app's internal documents in V1.
- The AI must propose structured drafts rather than silently applying official changes.
- The AI must be able to draft document body, traceability links, suggested approvers, and publish memo text.
- The AI must help maintain document structure consistency.

### History

- The system must show version history.
- The system must show diffs between versions.
- The system does not need version restore in V1.

## Acceptance Criteria

- A user can sign in with GitHub OAuth and join more than one workspace.
- After GitHub OAuth succeeds, the desktop app creates a persistent app session and loads the user's workspace memberships.
- A GitHub-authenticated user with valid membership can enter a workspace without any manual GitHub token handling.
- A GitHub-authenticated user with no memberships is routed into workspace creation or invite acceptance instead of a broken signed-in state.
- Each workspace is connected to exactly one dedicated GitHub documentation repository.
- A user can create PRD, UX Flow, Technical Spec, and Policy/Decision documents from system templates.
- A team can customize a system template and publish that template change through the same document publication flow.
- The desktop application launches as a Tauri app and renders a React + TypeScript UI.
- A user can only edit a document after clicking `Start Editing`.
- A second user cannot edit while another user holds the lock.
- The app shows the active lock holder and auto-releases the lock after 30 minutes of inactivity.
- Documents are edited in Markdown source with preview.
- Users can create block-level comments and mentions.
- Linked document changes trigger review requests and notifications.
- App approvals restore current status; GitHub PR approval alone does not.
- The app computes stale state at publish time based on linked invalidations and missing approvals.
- The app allows stale publish but forces a rationale and records unresolved issues.
- Publishing automatically creates a branch, commit, and PR in GitHub.
- Users can choose either Codex or Claude for AI-assisted tasks.
- AI can interview the user, explore internal documents, and draft structured content, links, approvers, and publish notes.

## Deferred For Later

- Real-time multi-cursor co-editing
- Slack and email integrations
- Non-GitHub SCM support
- Codebase and PR-history-aware AI exploration
- Rich block editor as default editing mode
- Version restore

## Success Metrics

- Teams can keep all four first-class document types in one workspace without splitting tooling by role.
- Teams can publish documentation to GitHub without manually handling branch, commit, or PR mechanics.
- Reviewers can quickly identify why a document is stale and who needs to act.
- Non-developer users can complete document creation and publish flows without leaving the desktop app.
