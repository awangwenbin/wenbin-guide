import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/wenbin-guide/',
  title: "wenbin-guide",
  description: "文彬的指南",
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', type: 'image/x-icon', href: '/wenbin-guide/favicon.ico' }]
  ],
  vite: {
    server: {
      port: 7000,
    }
  },

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config

    // 页面导航文字
    outlineTitle: '本页目录',
    lastUpdatedText: '最后更新',
    docFooter: {
      prev: '上一页',
      next: '下一页'
    },

    // editLink: {
    //   pattern: 'https://github.com/vuejs/vitepress/edit/main/docs/:path',
    //   text: '在 GitHub 上编辑此页'
    // },

    nav: [
      { text: '首页', link: '/' },
      { text: '文档', link: '/markdown' }
    ],

    sidebar: [
      { text: 'markdown', link: '/markdown' },
      {
        text: '常用软件安装',
        items: [
          {
            text: 'RocketMQ', items: [
              { text: 'windows安装', link: '/software/rocketmq/windows' },
            ]
          }
        ]
      },
      {
        text: 'Spring',
        items: [
          { text: '面向切面编程（AOP）', link: '/spring/aop' },
          { text: 'spring-tx', link: '/spring/tx' },
          { text: '自定义start', link: '/spring/start' },
          { text: 'security', link: '/spring/security' },
          { text: 'amqp-rabbitmq', link: '/spring/rabbitmq' }
        ]
      },
      {
        text: '小知识',
        items: [
          { text: 'github设置ssh', link: '/knowledge/github-ssh-key' },
          { text: 'vitepress部署github', link: '/knowledge/vitepress-deploy-github' }
        ]
      },
    ],

    // socialLinks: [
    //   { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    // ]
  }
})
