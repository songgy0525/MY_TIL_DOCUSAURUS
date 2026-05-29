import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

export default function Home() {
  return (
    <Layout title="songkyeongyong" description="Today I Learned">
      <main className={styles.main}>

        <div className={styles.center}>
          <span className={styles.index}>TIL — {new Date().getFullYear()}</span>
          <h1 className={styles.name}>songkyeongyong</h1>
          <div className={styles.rule} />
          <nav className={styles.nav}>
            <Link to="/blog/archive" className={styles.link}>Archive</Link>
            <a
              href="https://github.com/songgy0525"
              className={styles.link}
              target="_blank"
              rel="noreferrer"
            >
              Github
            </a>
          </nav>
        </div>

        <footer className={styles.foot}>Seoul · Backend Developer</footer>

      </main>
    </Layout>
  );
}
