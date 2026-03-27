---
layout: home

hero:
  name: Harness Docs
  text: 앱이 문서 거버넌스를 소유하는 데스크톱 제품 문서 시스템
  tagline: PRD, UX Flow, Technical Spec, Policy/Decision 문서를 하나의 앱 안에서 작성, 검토, 승인, 발행합니다.
  actions:
    - theme: brand
      text: 시작하기
      link: /guide/getting-started
    - theme: alt
      text: 아키텍처 보기
      link: /guide/architecture

features:
  - title: 앱이 소스 오브 트루스
    details: GitHub는 발행 대상이고, 문서 상태와 승인 권한, stale/current 판정은 앱이 소유합니다.
  - title: 구조화된 제품 문서
    details: PRD, UX Flow, Technical Spec, Policy/Decision 문서를 템플릿 기반으로 생성하고 관리합니다.
  - title: AI 보조 작성
    details: Codex 또는 Claude를 사용해 인터뷰 기반 초안 작성, 링크 제안, approver 제안, publish memo 작성을 지원합니다.
  - title: GitHub 발행 자동화
    details: branch, commit, pull request 생성을 자동화하되, publish 전 판단과 근거는 앱 내부에 기록합니다.
---

## 왜 Harness Docs인가

Harness Docs는 단순한 Markdown 편집기나 GitHub 동기화 도구가 아닙니다. 이 제품은 PM, 디자인, 엔지니어링이 역할별 문서를 나눠 관리하면서도, 하나의 워크스페이스와 하나의 거버넌스 체계 안에서 문서를 운영하기 위한 시스템입니다.

핵심 원칙:

- 문서의 최신성은 GitHub가 아니라 앱이 판정합니다.
- stale 상태는 보이게 하되 hard block으로만 처리하지 않습니다.
- AI는 초안과 제안을 제공하지만 최종 결정을 대체하지 않습니다.
- 문서 간 링크와 invalidation을 통해 추적 가능성을 유지합니다.

자세한 내용은 [시작하기](/guide/getting-started)부터 보면 됩니다.
