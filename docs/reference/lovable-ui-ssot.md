# Lovable UI SSOT

_최종 업데이트: 2026-03-29_

## 목적

이 문서는 초기 Lovable 생성 화면이 어떤 정보구조와 화면 책임을 전제로 했는지 기록한다.

이 문서의 목적은 두 가지다.

- 데스크톱 앱 마이그레이션 중 화면 기준 SSOT를 명시한다.
- backend authoritative entity와 별개로, frontend projection/view-model이 무엇을 책임져야 하는지 고정한다.

즉 API와 도메인 모델은 authoritative source of truth이고, 화면 구조와 레이아웃 책임은 이 문서를 기준으로 본다.

## Lovable이 전제한 전체 구조

Lovable 초안은 앱을 아래 6개 주요 화면으로 나눴다.

1. Dashboard
2. Documents
3. Document Detail / Editor
4. Reviews
5. Publish
6. AI Assistant

이 구조의 핵심은 `Dashboard`가 단순 요약 화면이 아니라 워크스페이스 운영의 시작점이라는 점이다.

## Dashboard의 역할

Dashboard는 빈 화면이 아니다. 문서가 없을 때도 다음 작업을 안내해야 한다.

Lovable 기준 Dashboard 책임:

- 최근 업데이트 문서 요약
- pending review 요약
- 팀 멤버 요약
- 문서 상태별 집계
- AI 진입점
- publish readiness 흐름의 시작점

문서가 하나도 없을 때도 Dashboard는 아래 역할을 해야 한다.

- “아직 비어 있음” 상태를 설명
- 첫 문서를 어떻게 시작할지 안내
- AI로 시작할지, 문서 라이브러리로 갈지, publish 준비 상태를 볼지 제안

즉 empty state도 Dashboard의 일부다.

## Documents 화면의 역할

Documents는 “앱의 홈”이 아니라 `문서 라이브러리`다.

Lovable 기준 Documents 책임:

- 문서 목록과 상태를 탐색
- 제목/타입/상태 기준으로 스캔
- 특정 문서를 고르고 detail route로 진입

Documents empty state는 다음 원칙을 따른다.

- 빈 상태 자체가 끝이 아니다.
- Dashboard로 돌아가게 해야 한다.
- AI로 첫 문서를 시작하는 CTA가 있어야 한다.

## Document Detail의 역할

Lovable은 `documents/:documentId`를 목록 재사용이 아니라 독립 detail shell로 본다.

Detail shell 책임:

- 문서 헤더
- 타입 / 상태 / freshness / GitHub readiness 요약
- linked docs 스냅샷
- review thread 스냅샷
- approval 스냅샷
- edit / comments / approvals / publish / ai로 이어지는 액션

즉 detail route는 탭으로 쪼개진 작업의 부모 컨텍스트다.

## Publish 화면의 역할

Publish는 단순 실행 버튼 화면이 아니다.

Lovable 기준 Publish 책임:

- 대표 문서 표시
- preflight 상태 요약
- publish 단계 나열
- stale reason 표시
- blocking issue 표시
- rationale 입력
- latest attempt/result 표시

Publish empty state 원칙:

- “지금은 발행 배치가 없음”을 설명
- 먼저 문서를 고르고 리뷰/승인 흐름을 만들라고 안내
- 문서 목록, 승인 화면으로 돌아갈 수 있어야 한다

## AI 화면의 역할

AI는 자유 채팅보다 `작업 카탈로그`에 가깝다.

Lovable 기준 AI 책임:

- provider badge
- task kind
- task scope
- title / description
- trigger label
- context label

즉 화면은 “대화창”보다 “실행 가능한 AI 작업 목록”이어야 한다.

## 레이아웃 원칙

Lovable 초안의 레이아웃 특징:

- 좌측 고정 workspace/sidebar
- 우측 메인 작업 영역
- 상단에는 현재 영역의 title/description
- 본문은 정보 밀도가 높은 카드/리스트 패턴
- Dashboard와 Detail은 단일 giant form보다 여러 summary panel 조합

## 시각 톤

Lovable이 전제한 톤:

- 데스크톱 생산성 도구
- 가벼운 glass/background 분위기
- 과도하게 playful 하지 않음
- badge, stat, queue 중심의 운영 화면
- 문서 작성 툴보다는 운영 콘솔에 가까운 느낌

## 현재 앱에 반영된 매핑

현재 `apps/desktop` 기준으로 반영된 매핑:

- `/workspaces`
  워크스페이스가 있으면 바로 `/$workspaceId/dashboard`로 진입
- `/$workspaceId/dashboard`
  workspace overview
- `/$workspaceId/documents`
  document library
- `/$workspaceId/documents/$documentId`
  document overview shell
- `/$workspaceId/documents/$documentId/edit`
  editor
- `/$workspaceId/documents/$documentId/comments`
  review/comments
- `/$workspaceId/documents/$documentId/approvals`
  approvals
- `/$workspaceId/publish`
  publish flow
- `/$workspaceId/ai`
  AI task catalog

## 현재 projection 계층

Lovable 화면 구조를 유지하기 위해 아래 projection/view-model을 둔다.

- `apps/desktop/src/view-models/workspaceDashboard.ts`
- `apps/desktop/src/view-models/documentViews.ts`
- `apps/desktop/src/view-models/publishFlowView.ts`
- `apps/desktop/src/view-models/mockAdapters.ts`

원칙:

- authoritative domain entity는 backend/API 쪽 진실을 유지한다.
- 화면은 projection/view-model을 기준으로 렌더링한다.
- 부족한 값은 먼저 mock adapter에서 메우고, 나중에 실제 selector/API 값으로 치환한다.

## 아직 남은 작업

Lovable 기준으로 아직 더 다듬을 부분:

1. document overview를 탭형 detail shell로 더 강하게 정리
2. documents list와 publish 화면도 projection 사용을 더 직접적으로 통일
3. dashboard의 stat/recent/review queue를 실제 API selector 기반으로 치환
4. empty state 카피와 CTA를 문서 생성 흐름과 더 강하게 연결

## 참고

- 현재 마이그레이션 계획: [autopilot-spec.md](/Users/sondi/Documents/github/projects/.omx/plans/autopilot-spec.md)
- 현재 구현 계획: [autopilot-impl.md](/Users/sondi/Documents/github/projects/.omx/plans/autopilot-impl.md)
