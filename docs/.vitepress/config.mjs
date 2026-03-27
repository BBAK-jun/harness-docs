import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "ko-KR",
  title: "Harness Docs",
  description: "Harness Docs 제품과 아키텍처를 설명하는 내부 문서 사이트",
  base: "/harness-docs/",
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: "가이드", link: "/guide/getting-started" },
      { text: "아키텍처", link: "/guide/architecture" },
      { text: "도메인", link: "/guide/domain-model" },
      { text: "레퍼런스", link: "/reference/packages" }
    ],
    sidebar: [
      {
        text: "가이드",
        items: [
          { text: "시작하기", link: "/guide/getting-started" },
          { text: "아키텍처", link: "/guide/architecture" },
          { text: "도메인 모델", link: "/guide/domain-model" }
        ]
      },
      {
        text: "레퍼런스",
        items: [
          { text: "구현 현황", link: "/reference/implementation-status" },
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
});
