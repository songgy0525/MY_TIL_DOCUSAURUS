import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

const STARS = Array.from({ length: 120 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2 + 0.5,
  delay: Math.random() * 4,
  duration: Math.random() * 3 + 2,
}));

const SKILLS = ['Java', 'Spring Boot', 'MySQL', 'Linux', 'Jenkins', 'Docker', 'Redis', 'MyBatis'];

const TILS = [
  {
    date: '2026.05.29',
    title: 'Ubuntu 서버 구축 + Tomcat 배포 + Jenkins 설치까지',
    tags: ['Ubuntu', 'Tomcat', 'Jenkins', 'CI/CD'],
    href: '/blog/2026/05/29/ubuntu-tomcat-jenkins',
  },
];

export default function Home() {
  return (
    <Layout title="songkyeongyong" description="백엔드 취준생의 TIL">
      <main className={styles.main}>

        {/* 별 배경 */}
        <div className={styles.starfield}>
          {STARS.map(s => (
            <div
              key={s.id}
              className={styles.star}
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                animationDelay: `${s.delay}s`,
                animationDuration: `${s.duration}s`,
              }}
            />
          ))}
        </div>

        {/* 그리드 라인 */}
        <div className={styles.grid} />

        {/* 히어로 */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.badge}>
              <span className={styles.dot} />
              songkyeongyong
            </div>
            <h1 className={styles.glitch} data-text="songkyeongyong">
              songkyeongyong
            </h1>
            <p className={styles.subtitle}>
              <span className={styles.cursor}>{'>'}</span>
              {' '}백엔드 취준생의{' '}
              <span className={styles.neon}>Today I Learned</span>
            </p>
            <div className={styles.skills}>
              {SKILLS.map(s => (
                <span key={s} className={styles.skillTag}>{s}</span>
              ))}
            </div>
            <div className={styles.heroActions}>
              <Link className={styles.btnPrimary} to="/blog">
                📡 TIL 보러가기
              </Link>
              <a className={styles.btnSecondary} href="https://github.com/songgy0525" target="_blank" rel="noreferrer">
                GitHub →
              </a>
            </div>
          </div>
        </section>

        {/* 최근 TIL */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>{'// RECENT TIL'}</span>
            <Link to="/blog" className={styles.seeAll}>전체보기 →</Link>
          </div>
          <div className={styles.cards}>
            {TILS.map((til, i) => (
              <Link key={i} to={til.href} className={styles.card}>
                <div className={styles.cardDate}>{til.date}</div>
                <div className={styles.cardTitle}>{til.title}</div>
                <div className={styles.cardTags}>
                  {til.tags.map(t => (
                    <span key={t} className={styles.cardTag}>{t}</span>
                  ))}
                </div>
                <div className={styles.cardGlow} />
              </Link>
            ))}
          </div>
        </section>


      </main>
    </Layout>
  );
}
