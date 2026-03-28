import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

export default withMermaid(
  defineConfig({
  lang: "ko-KR",
  title: "Harness Docs",
  description: "Harness Docs 제품 소개와 고객-facing 문서 전략을 설명하는 제품 문서 사이트",
  base: "/harness-docs/",
  cleanUrls: true,
  mermaid: {
    theme: "default"
  },
  themeConfig: {
    nav: [
      { text: "제품 소개", link: "/product-overview" },
      { text: "대상 사용자", link: "/for-who" },
      { text: "해결하는 문제", link: "/problems-we-solve" },
      { text: "작동 방식", link: "/how-it-works" },
      { text: "FAQ", link: "/faq" },
      { text: "문서 타입", link: "/reference/document-types" },
    ],
    sidebar: [
      {
        text: "제품",
        items: [
          { text: "홈", link: "/" },
          { text: "제품 소개", link: "/product-overview" },
          { text: "누구를 위한 제품인가", link: "/for-who" },
          { text: "어떤 문제를 해결하는가", link: "/problems-we-solve" },
          { text: "어떻게 작동하는가", link: "/how-it-works" },
          { text: "FAQ", link: "/faq" },
        ]
      },
      {
        text: "레퍼런스",
        items: [
          { text: "문서 타입", link: "/reference/document-types" },
        ]
      }
    ],
    search: {
      provider: "local"
    },
    footer: {
      message: "Harness Docs product documentation",
      copyright: "Copyright 2026 Harness Docs"
    }
  }
})
);
