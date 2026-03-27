import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

export default withMermaid(
  defineConfig({
  lang: "ko-KR",
  title: "Harness Docs",
  description: "Harness Docs 제품과 아키텍처를 설명하는 내부 문서 사이트",
  base: "/harness-docs/",
  cleanUrls: true,
  mermaid: {
    theme: "default"
  },
  themeConfig: {
    nav: [
      { text: "가이드", link: "/guide/getting-started" },
      { text: "인증", link: "/guide/authentication" },
      { text: "아키텍처", link: "/guide/architecture" },
      { text: "도메인", link: "/guide/domain-model" },
      { text: "이벤트스토밍", link: "/guide/event-storming-app-flow" },
      { text: "도메인 코드", link: "/guide/domain-code-mermaid" },
      { text: "레퍼런스", link: "/reference/packages" }
    ],
    sidebar: [
      {
        text: "가이드",
        items: [
          { text: "시작하기", link: "/guide/getting-started" },
          { text: "인증과 로그인", link: "/guide/authentication" },
          { text: "서버 인증/인가", link: "/guide/server-side-auth-and-authorization" },
          { text: "아키텍처", link: "/guide/architecture" },
          { text: "도메인 모델", link: "/guide/domain-model" },
          { text: "앱 플로우 이벤트스토밍", link: "/guide/event-storming-app-flow" },
          { text: "도메인 코드 Mermaid", link: "/guide/domain-code-mermaid" }
        ]
      },
      {
        text: "레퍼런스",
        items: [
          { text: "구현 현황", link: "/reference/implementation-status" },
          { text: "Publish Governance RPC", link: "/reference/publish-governance-rpc" },
          { text: "패키지 구성", link: "/reference/packages" },
          { text: "문서 타입", link: "/reference/document-types" },
          { text: "원문 사양", link: "/reference/spec-sources" }
        ]
      }
    ],
    search: {
      provider: "local"
    },
    footer: {
      message: "Harness Docs internal documentation",
      copyright: "Copyright 2026 Harness Docs"
    }
  }
})
);
