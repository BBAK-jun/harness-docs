# 시작하기

Harness Docs는 소규모 크로스펑셔널 팀을 위한 데스크톱 중심 문서 워크플로 서비스입니다.

## 한 문장 설명

앱이 문서 상태, 승인, stale/current 판정을 소유하고, GitHub는 publish 결과물을 받는 구조의 제품 문서 시스템입니다.

## 해결하려는 문제

작은 제품 팀은 PRD, UX, 기술 설계, 의사결정 문서가 역할별로 흩어져 있고, 상태 추적과 리뷰 히스토리가 쉽게 어긋납니다. Harness Docs는 이 문제를 다음 방식으로 해결하려고 합니다.

- 역할별 문서를 1급 객체로 유지
- Markdown 기반 작성 경험 제공
- 문서 간 링크와 invalidation 규칙 지원
- 앱 내부 승인과 stale state 추적
- GitHub publish 자동화

## 주요 사용자

- PM / Product Owner
- Designer
- Developer
- Lead-level Decision Maker
- 제품 문서 작성에 참여하는 기타 협업자

## 핵심 흐름

1. GitHub OAuth로 로그인합니다.
2. 워크스페이스에 진입합니다.
3. 템플릿에서 문서를 생성합니다.
4. Markdown으로 편집하고 링크를 연결합니다.
5. 댓글, 멘션, 승인 상태를 확인합니다.
6. 필요하면 AI로 초안을 보강합니다.
7. publish preflight를 확인한 뒤 GitHub PR을 생성합니다.

## 더 보기

- [아키텍처](/guide/architecture)
- [도메인 모델](/guide/domain-model)
- [패키지 구성](/reference/packages)
