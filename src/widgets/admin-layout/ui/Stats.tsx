import styles from './Stats.module.css'

interface StatsProps {
  teamsCount: number
  playersCount: number
  passesCount: number
}

export function Stats({ teamsCount, playersCount, passesCount }: StatsProps) {
  return (
    <div className={styles.statsCard}>
      <h5 className={styles.statsTitle}>Краткий обзор регистрации</h5>
      <div>
        <div className={styles.statsTable}>


          <div className={styles.tableRow}>
            <div className={styles.rowHeader}>Команд</div>
            <div className={styles.cell}>{teamsCount}</div>
          </div>

          <div className={styles.tableRow}>
            <div className={styles.rowHeader}>Человек</div>

            <div className={styles.cell}>{playersCount}</div>

          </div>

          <div className={styles.tableRow}>
            <div className={styles.rowHeader}>Пропусков</div>

            <div className={styles.cell}>{passesCount}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
