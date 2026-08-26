import { Outlet } from "react-router-dom";
import styles from "./Modify.module.css";

export default function Modify() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Внести изменения</h1>
        <Outlet />
      </div>
    </div>
  );
}
