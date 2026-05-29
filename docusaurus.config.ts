import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'songkyeongyong',
  tagline: 'Today I Learned',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://songgy0525.github.io',
  baseUrl: '/MY_TIL_DOCUSAURUS/',

  organizationName: 'songgy0525',
  projectName: 'MY_TIL_DOCUSAURUS',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'ko',
    locales: ['ko'],
  },

  presets: [
    [
      'classic',
      {
        docs: false,
        blog: {
          routeBasePath: '/blog',
          showReadingTime: true,
          blogTitle: 'songkyeongyong.TIL',
          blogDescription: '백엔드 취준생의 Today I Learned',
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          onInlineTags: 'ignore',
          onInlineAuthors: 'ignore',
          onUntruncatedBlogPosts: 'ignore',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'songkyeongyong',
      items: [
        { to: '/blog', label: 'Recent', position: 'left' },
        { to: '/blog/archive', label: 'Archive', position: 'left' },
        { to: '/blog/tags', label: 'Tags', position: 'left' },
        {
          href: 'https://github.com/songgy0525',
          label: 'Github',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Seoul · Backend Developer · ${new Date().getFullYear()}`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['java', 'bash', 'yaml'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
