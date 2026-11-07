import { createRoot } from "react-dom/client";

import "@app/styles/index.css";
import SeatingPlayground from "./ui/SeatingPlayground";

createRoot(document.getElementById("root")!).render(<SeatingPlayground />);
