# 문서 타입

Harness Docs v1의 1급 문서 타입은 아래 네 가지입니다.

## PRD

제품 요구사항과 문제 정의, 목표, 범위를 다룹니다.

## UX Flow

사용자 흐름, 상호작용, 화면 전환, 주요 UX 의도를 다룹니다.

## Technical Spec

구현 구조, 시스템 제약, 기술 설계 결정을 다룹니다.

## Policy / Decision

팀 차원의 규칙, 승인 기준, 복구 권한, 장기 의사결정을 다룹니다.

## 링크와 invalidation

문서는 서로 링크될 수 있고, 상위 문서의 변경은 하위 문서를 stale로 만들 수 있습니다.

v1 규칙:

- PRD 변경은 UX Flow와 Technical Spec을 invalidate할 수 있습니다.
- UX Flow 변경은 Technical Spec을 invalidate할 수 있습니다.
- Policy / Decision 변경은 연결된 downstream 문서를 invalidate할 수 있습니다.
