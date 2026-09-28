import styles from "./content.module.css";

export function ArticleBody({ html }: { html: string }) {
  return <div className={styles.articleBody} dangerouslySetInnerHTML={{ __html: html }} />;
}
