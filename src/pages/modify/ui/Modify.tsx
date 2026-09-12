import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { RouteFallback } from "@/router/RouteFallback";
import styles from "./Modify.module.css";

export default function Modify() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Внести изменения</h1>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
