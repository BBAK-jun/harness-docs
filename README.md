# Harness Docs

Harness Docs는 소규모 크로스펑셔널 제품 팀을 위한 문서 거버넌스 시스템입니다.

이 프로젝트는 단순한 Markdown 편집기나 GitHub 동기화 도구를 만들려는 것이 아닙니다. 제품 문서의 상태, 리뷰 흐름, 승인 권한, stale 판단, publish 이력을 앱이 직접 소유하고, GitHub는 그 결과를 배포하는 채널로 다루는 것을 목표로 합니다.

## 무엇을 해결하려는가

작은 제품 팀은 보통 PRD, UX 문서, 기술 문서, 운영 결정 문서가 여러 도구에 흩어집니다. 누가 최신 문서를 갖고 있는지, 어떤 문서가 다른 문서 변경으로 stale 되었는지, 지금 publish 가능한 상태인지가 사람 기억과 관습에 의존하게 됩니다.

Harness Docs는 이 문제를 다음 방식으로 풀고자 합니다.

- 문서를 역할별 1급 객체로 관리합니다.
- 문서 간 링크를 명시적으로 다룹니다.
- 리뷰, 멘션, 승인, stale 상태를 앱 안에서 추적합니다.
- AI는 초안 작성과 구조 제안에 참여하지만, 승인과 발행 통제권은 사람이 유지합니다.
- GitHub는 작성 공간이 아니라 publish 대상 저장소로 사용합니다.

## 제품 관점의 핵심 원칙

- 문서 상태의 source of truth는 앱입니다.
- GitHub는 최종 발행 채널이지 정책 판단의 권위가 아닙니다.
- stale 상태는 숨기지 않고 드러내되, 항상 하드 블록으로 처리하지는 않습니다.
- 문서 작성 경험과 정책 판단을 분리합니다.
- PM, 디자인, 엔지니어링이 같은 흐름 안에서 협업할 수 있어야 합니다.

## 다루는 문서

Harness Docs는 다음 문서군을 하나의 운영 체계로 다루는 방향으로 설계됩니다.

- PRD
- UX Flow
- Technical Spec
- Policy / Decision

## 제품이 지향하는 흐름

이 프로젝트는 아래 흐름을 일관된 제품 경험으로 묶는 것을 목표로 합니다.

1. 팀원이 워크스페이스에 들어옵니다.
2. 구조화된 템플릿에서 문서를 만듭니다.
3. 문서를 Markdown 기반으로 작성하고 미리보기와 함께 검토합니다.
4. 관련 문서끼리 연결하고 변경 영향도를 추적합니다.
5. 댓글, 멘션, 승인, stale 상태를 앱 안에서 관리합니다.
6. AI를 통해 초안 작성, 구조 제안, 문서 탐색을 돕습니다.
7. GitHub에 branch, commit, pull request를 생성하며 발행합니다.

## 저장소가 표현하는 시스템 경계

이 모노레포는 제품의 책임 경계를 코드 구조로 드러냅니다.

```text
apps/
  api/        authoritative한 정책 판단과 publish 오케스트레이션
  desktop/    문서 작성과 검토를 위한 데스크톱 클라이언트

packages/
  contracts/  desktop과 api 사이의 공유 계약
  db/         영속 계층, 스키마, 마이그레이션 지원

docs/         제품 요구사항과 기획 문서
```

정리하면 다음과 같습니다.

- `apps/desktop`은 사용자 경험과 인터랙션을 담당합니다.
- `apps/api`는 권한, 승인 규칙, stale/current 판단, publish preflight 같은 정책을 담당합니다.
- `packages/contracts`는 두 계층 사이의 typed contract를 고정합니다.
- `packages/db`는 서버 측 영속 계층을 뒷받침합니다.

## 이 저장소를 읽는 방법

루트 `README`는 프로젝트 소개만 다룹니다. 실행 방법이나 패키지별 개발 절차는 각 패키지 문서에서 확인하는 구조를 의도합니다.

- 데스크톱 클라이언트: [apps/desktop/README.md](/Users/sondi/Documents/github/projects/apps/desktop/README.md)
- API 패키지: [apps/api/README.md](/Users/sondi/Documents/github/projects/apps/api/README.md)
- DB 패키지: [packages/db/README.md](/Users/sondi/Documents/github/projects/packages/db/README.md)
- 공유 계약 패키지: [packages/contracts/README.md](/Users/sondi/Documents/github/projects/packages/contracts/README.md)

## 관련 문서

- 제품 요구사항: [docs/product-doc-harness-prd.md](/Users/sondi/Documents/github/projects/docs/product-doc-harness-prd.md)
- GitHub 운영 규칙: [.github/REPOSITORY_RULES.md](/Users/sondi/Documents/github/projects/.github/REPOSITORY_RULES.md)

## 한 문장 요약

Harness Docs는 문서를 파일이 아니라 운영 대상 객체로 다루는 제품 문서 워크플로 시스템입니다.
