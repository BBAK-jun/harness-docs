# 도메인 코드 Mermaid 정리

## 문서 목적

이 문서는 현재 Harness Docs의 publish governance 도메인 코드를 Mermaid 다이어그램으로 정리한 기술 문서다.

대상 범위는 다음 파일들이다.

- `packages/contracts/src/publish-governance.ts`
- `packages/contracts/src/index.ts`
- `apps/api/src/domain/documentAggregate.ts`
- `apps/api/src/domain/publishAggregate.ts`
- `apps/api/src/domain/publishGovernanceProjection.ts`
- `apps/api/src/domain/publishGovernanceAdapter.ts`
- `apps/api/src/data/mockWorkspaceSessionSource.ts`
- `apps/api/src/data/postgresWorkspaceSessionSource.ts`
- `apps/desktop/src/lib/publishGovernanceView.ts`
- `apps/desktop/src/domain/publishing.ts`

## 1. 전체 경계 구조

```mermaid
flowchart LR
  subgraph Desktop["apps/desktop"]
    D1["publishGovernanceView.ts"]
    D2["domain/publishing.ts"]
    D3["App.tsx"]
  end

  subgraph Contracts["packages/contracts"]
    C1["publish-governance.ts"]
    C2["index.ts API routes"]
  end

  subgraph API["apps/api"]
    A1["documentAggregate.ts"]
    A2["publishAggregate.ts"]
    A3["publishGovernanceProjection.ts"]
    A4["publishGovernanceAdapter.ts"]
    A5["mockWorkspaceSessionSource.ts"]
    A6["postgresWorkspaceSessionSource.ts"]
  end

  D1 --> C1
  D3 --> D1
  A3 --> C1
  A4 --> A3
  A5 --> A1
  A5 --> A2
  A6 --> A1
  A6 --> A2
  C2 --> A4
```

핵심 해석:

- `contracts`가 정책 타입과 API 경로를 소유한다.
- `api`는 aggregate 결과를 contracts snapshot으로 바꾼 뒤 projection 한다.
- `desktop`은 자체 모델을 contracts snapshot으로 바꿔 같은 정책 view를 읽는다.
- `api`와 `desktop`은 서로의 내부 타입을 직접 참조하지 않는다.

## 2. Document Aggregate 상태 모델

출처:

- `apps/api/src/domain/documentAggregate.ts`

```mermaid
stateDiagram-v2
  [*] --> draft
  draft --> in_review: approval requested
  in_review --> approved: approval approved/restored
  in_review --> in_review: pending approval remains
  in_review --> draft: no approval requested
  approved --> published: publish executed
  published --> archived: archive

  state "Review State" as ReviewState {
    [*] --> idle
    idle --> review_requested: pending approval exists
    review_requested --> changes_requested: changes_requested or invalidated
    review_requested --> approved_review: approved/restored
    changes_requested --> approved_review: restored or approved
    approved_review --> changes_requested: approval invalidated
  }

  state "Freshness State" as FreshnessState {
    [*] --> current
    current --> stale: invalidations exist
    stale --> current: invalidations cleared
  }
```

핵심 규칙:

- 문서 저장 상태와 review 상태는 분리된다.
- freshness는 `invalidations` 존재 여부에 의해 계산된다.
- `prePublicationReadiness`는 `ready`, `attention_required`, `blocked`로 별도 계산된다.

## 3. Document Aggregate 계산 흐름

출처:

- `apps/api/src/domain/documentAggregate.ts`

```mermaid
flowchart TD
  A["approvals[]"] --> B["buildUnresolvedApprovals"]
  I["invalidations[]"] --> B
  B --> C["buildBlockingIssues"]
  B --> D["approvalState 계산"]
  I --> E["freshnessStatus 계산"]
  D --> F["reviewStatus 계산"]
  E --> G["staleRationaleRequired 계산"]
  C --> H["prePublicationReadiness 계산"]
  F --> J["document.status 파생"]
  E --> K["staleSummary / staleReasons 계산"]

  C --> L["DocumentDerivedState"]
  D --> L
  E --> L
  F --> L
  G --> L
  H --> L
  J --> L
  K --> L
```

이 다이어그램이 보여주는 것:

- aggregate는 원시 DB row를 직접 노출하지 않는다.
- approval, invalidation, freshness, blocking issue를 합성해서 `DocumentDerivedState`를 만든다.
- publish 정책 판단의 전제 데이터는 여기서 대부분 결정된다.

## 4. Publish Aggregate 구조

출처:

- `apps/api/src/domain/publishAggregate.ts`

```mermaid
classDiagram
  class PublishDraftAggregate {
    +currentStageId
    +status
    +staleRationaleEntries[]
    +artifacts[]
    +staleDocumentIds[]
    +unresolvedApprovalIds[]
    +unresolvedApprovals[]
    +invalidationIds[]
    +notificationTargets[]
    +branchName
    +commitMessage
    +pullRequestTitle
    +preflight
  }

  class PublishArtifactDraft {
    +id
    +kind
    +targetId
    +label
    +documentType
    +changeSummary
    +linkedDocumentIds[]
    +stalenessStatus
    +unresolvedApprovalIds[]
    +unresolvedApprovals[]
    +invalidationIds[]
  }

  class PublishPreflightResult {
    +status
    +summary
    +staleDocumentIds[]
    +unresolvedApprovalIds[]
    +findings[]
  }

  class PublishPreflightFinding {
    +kind
    +severity
    +label
    +summary
    +requiredAction
    +documentId
    +approvalId
    +invalidationId
    +staleRationaleEntryId
  }

  class PublishStaleRationaleEntry {
    +id
    +label
    +summary
    +status
    +recordedAt
    +relatedDocumentId
    +relatedInvalidationId
    +relatedApprovalId
  }

  PublishDraftAggregate --> PublishArtifactDraft
  PublishDraftAggregate --> PublishStaleRationaleEntry
  PublishDraftAggregate --> PublishPreflightResult
  PublishPreflightResult --> PublishPreflightFinding
```

## 5. Publish Aggregate 단계 흐름

출처:

- `apps/api/src/domain/publishAggregate.ts`

```mermaid
stateDiagram-v2
  [*] --> scope
  scope --> freshness
  freshness --> approvals
  approvals --> memo
  memo --> github
  github --> published

  state github {
    [*] --> ready_for_publish
    ready_for_publish --> publishing: execute publish
    publishing --> published: PR created
  }
```

단계 정의는 `publishStageDefinitions`가 소유한다.

- `scope`
- `freshness`
- `approvals`
- `memo`
- `github`

이건 UI 화면 단계이면서 publish record의 진행 상태 문서이기도 하다.

## 6. Publish Preflight 계산

출처:

- `apps/api/src/domain/publishAggregate.ts`

```mermaid
flowchart TD
  A["staleDocumentIds[]"] --> B["buildStaleRationaleFindings"]
  R["staleRationale text"] --> B
  E["staleRationaleEntries[]"] --> B

  U["unresolvedApprovals[]"] --> C["buildUnresolvedApprovalFindings"]

  B --> D["findings[]"]
  C --> D

  D --> E1["blockingFindings 필터"]
  D --> E2["warningFindings 필터"]
  D --> E3["summary 생성"]

  E1 --> F["status = blocked"]
  E2 --> G["status = ready_with_warnings"]
  D --> H["status = ready"]

  F --> I["PublishPreflightResult"]
  G --> I
  H --> I
  E3 --> I
```

핵심 정책:

- stale 문서는 rationale이 없으면 `blocking`
- stale 문서는 rationale이 있으면 `warning`
- unresolved approval은 상태에 따라 `warning` 또는 `blocking`

## 7. Contracts 상태 기계

출처:

- `packages/contracts/src/publish-governance.ts`

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> ready_to_publish: document_loaded
  idle --> stale_requires_rationale: document_loaded
  idle --> blocked: document_loaded

  ready_to_publish --> publishing: publish_attempted
  ready_to_publish --> blocked: sync_requested
  ready_to_publish --> stale_requires_rationale: sync_requested

  stale_requires_rationale --> ready_to_publish: rationale_provided
  stale_requires_rationale --> blocked: sync_requested
  stale_requires_rationale --> ready_to_publish: sync_requested

  blocked --> ready_to_publish: sync_completed
  blocked --> stale_requires_rationale: sync_completed
  blocked --> blocked: document_loaded

  publishing --> published_pr_created: publish_succeeded
  publishing --> ready_to_publish: publish_failed
  publishing --> stale_requires_rationale: publish_failed
  publishing --> blocked: publish_failed

  published_pr_created --> published_pr_created: document_loaded
  published_pr_created --> stale_requires_rationale: document_loaded
```

이 다이어그램은 `publishFlowTransitionMap`을 거의 그대로 시각화한 것이다.

## 8. Contracts 타입 관계

출처:

- `packages/contracts/src/publish-governance.ts`

```mermaid
classDiagram
  class PublishGovernanceDocumentSnapshot {
    +id
    +workspaceId
    +title
    +type
    +updatedAt
    +lastSyncedAt
    +storedStatus
    +freshnessStatus
    +staleReasons[]
    +validation
    +metadata
    +blockingIssues[]
    +summary
    +requiresRationale
  }

  class PublishGovernancePublishRecordSnapshot {
    +status
    +pullRequest
  }

  class DocumentStatusView {
    +storedStatus
    +freshnessStatus
    +isStale
    +staleReasons[]
    +validation
    +metadata
    +publishEligibility
    +activePullRequest
  }

  class PublishEligibility {
    +status
    +canPublish
    +requiresRationale
    +staleReasons[]
    +blockingIssues[]
    +summary
  }

  class PublishPreflightView {
    +document
    +currentState
    +allowedTransitions[]
  }

  class PublishAttemptResult {
    <<union>>
    publish_succeeded
    rationale_required
    publish_blocked
  }

  PublishGovernanceDocumentSnapshot --> DocumentStatusView
  PublishGovernancePublishRecordSnapshot --> DocumentStatusView
  DocumentStatusView --> PublishEligibility
  DocumentStatusView --> PublishPreflightView
  PublishPreflightView --> PublishAttemptResult
```

## 9. API Projection 파이프라인

출처:

- `apps/api/src/domain/publishGovernanceAdapter.ts`
- `apps/api/src/domain/publishGovernanceProjection.ts`
- `packages/contracts/src/index.ts`

```mermaid
sequenceDiagram
  participant Route as contracts createApiApp route
  participant DS as WorkspaceSessionDataSource
  participant Adapter as publishGovernanceAdapter
  participant Projection as publishGovernanceProjection
  participant Contracts as contracts types

  Route->>DS: getWorkspaceGraph(workspaceId)
  Route->>DS: getWorkspaceDocuments(workspaceId)
  DS-->>Route: workspaceGraph + documents
  Route->>Adapter: projectDocumentPublishPreflight(...)
  Adapter->>Adapter: ApiDocumentLike -> PublishGovernanceDocumentSnapshot
  Adapter->>Adapter: ApiPublishRecordLike -> PublishGovernancePublishRecordSnapshot
  Adapter->>Projection: projectPublishPreflightView(snapshot, recordSnapshot)
  Projection->>Contracts: DocumentStatusView 생성
  Projection->>Contracts: PublishEligibility 계산
  Projection->>Contracts: PublishFlowState 계산
  Projection-->>Route: PublishPreflightView
  Route-->>Route: ApiSuccessResponse<PublishPreflightEnvelopeDto>
```

핵심 경계:

- route는 `contracts`에 있다
- adapter는 `apps/api`에 있다
- projection 입력/출력 타입은 전부 `contracts`에 있다
- `api`는 `desktop` 타입을 import하지 않는다

## 10. Desktop Projection 파이프라인

출처:

- `apps/desktop/src/lib/publishGovernanceView.ts`
- `apps/desktop/src/App.tsx`

```mermaid
sequenceDiagram
  participant UI as App.tsx
  participant View as publishGovernanceView.ts
  participant DesktopModel as WorkspaceDocument / PublishRecord
  participant Contracts as contracts publish-governance.ts

  UI->>View: getDefaultPublishGovernanceSnapshot(workspaceGraph)
  View->>DesktopModel: select publishRecord + document
  View->>View: toGovernanceDocumentSnapshot(document)
  View->>View: toGovernancePublishRecordSnapshot(record)
  View->>Contracts: toDocumentStatusView(snapshot)
  View->>Contracts: getPublishFlowState(...)
  View->>Contracts: getAllowedTransitions(...)
  View->>Contracts: buildPublishAttemptPreview(...)
  View-->>UI: preflight + attemptPreview
```

핵심 의미:

- desktop도 contracts snapshot을 거친다
- UI가 직접 policy를 계산하지 않는다
- UI는 상태와 전이 결과를 읽고 렌더만 한다

## 11. Data Source에서 도메인으로 가는 흐름

출처:

- `apps/api/src/data/mockWorkspaceSessionSource.ts`
- `apps/api/src/data/postgresWorkspaceSessionSource.ts`

```mermaid
flowchart LR
  subgraph Persistence["DB / Mock Session"]
    P1["document rows"]
    P2["approval rows"]
    P3["invalidation rows"]
    P4["publish record rows"]
  end

  subgraph Aggregate["API Domain"]
    A1["deriveDocumentState"]
    A2["createPublishDraft"]
    A3["buildPublishPreflightResult"]
  end

  subgraph ContractView["Contracts Projection"]
    C1["PublishGovernanceDocumentSnapshot"]
    C2["PublishGovernancePublishRecordSnapshot"]
    C3["PublishPreflightView"]
  end

  P1 --> A1
  P2 --> A1
  P3 --> A1
  P1 --> A2
  P2 --> A2
  P3 --> A2
  P4 --> A3

  A1 --> C1
  A2 --> C2
  A3 --> C3
```

## 12. Publish 시도 결과 Union

출처:

- `packages/contracts/src/publish-governance.ts`
- `apps/api/src/domain/publishGovernanceProjection.ts`
- `apps/desktop/src/lib/publishGovernanceView.ts`

```mermaid
flowchart TD
  A["PublishPreflightView"] --> B{"publishEligibility.status"}

  B -->|blocked| C["PublishBlockedResult"]
  B -->|requires_rationale| D["PublishRationaleRequiredResult"]
  B -->|allowed| E["PublishSuccessResult"]

  C --> C1["transition: publish_attempted -> blocked"]
  D --> D1["transition: publish_attempted -> stale_requires_rationale"]
  E --> E1["transition: publish_started/publish_succeeded -> publishing or published_pr_created"]
```

이 union 덕분에 caller는 문자열 조합이 아니라 `kind` 기준으로 분기한다.

## 13. 권장 읽기 순서

코드를 읽을 때는 아래 순서가 가장 낫다.

1. `packages/contracts/src/publish-governance.ts`
2. `apps/api/src/domain/documentAggregate.ts`
3. `apps/api/src/domain/publishAggregate.ts`
4. `apps/api/src/domain/publishGovernanceProjection.ts`
5. `apps/api/src/domain/publishGovernanceAdapter.ts`
6. `apps/desktop/src/lib/publishGovernanceView.ts`

## 14. 현재 구조의 결론

```mermaid
flowchart TD
  A["DB / Mock Facts"] --> B["API Aggregate"]
  B --> C["Contracts Snapshot"]
  C --> D["Contracts Policy View"]
  D --> E["Desktop Rendering / API Response"]
```

현재 구조의 핵심은 이것이다.

- 사실은 aggregate가 만든다
- 정책 표현은 contracts가 만든다
- API와 desktop은 각각 adapter를 가진다
- 타입이 곧 문서가 되도록 설계한다

## 15. 현재 도메인 개발의 공백

```mermaid
flowchart TD
  A["Domain Vision"] --> B["Aggregate Rules"]
  A --> C["Contracts State Machine"]
  A --> D["RPC Read Model"]

  B --> E["완료: document/publish aggregate 기본형"]
  C --> F["완료: publish governance contracts"]
  D --> G["완료: preflight endpoint + desktop service"]

  B --> H["부족: sync/revalidate/metadata refresh workflow"]
  B --> I["부족: rationale lifecycle 규칙"]
  C --> J["부족: attempt/sync/rationale command model"]
  D --> K["부족: UI source of truth 전환"]
  D --> L["부족: execute 직전 재검증 규칙"]
```

현재 핵심 공백은 아래 다섯 가지다.

- freshness 회복 절차가 aggregate 상태 기계로 완전히 모델링되지 않았다.
- rationale의 생성, 대체, 재사용, 만료 규칙이 부족하다.
- contracts state machine은 read 중심이고 command 모델은 아직 덜 연결됐다.
- desktop UI는 아직 `PublishPreflightView`를 최종 source of truth로 쓰지 않는다.
- preflight와 execute 사이 경쟁 조건을 막는 재검증 규칙이 없다.
