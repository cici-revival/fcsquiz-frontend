import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@shared/ui/Collapsible";
import styles from "./Faq.module.css";

const ITEMS = [
  {
    question: "Сколько длится квиз?",
    answer: "Обычно игра занимает около 2–3 часов вместе с перерывами.",
  },
  {
    question: "Какие есть дивизионы?",
    answer: "Мы делим команды на Джунов (J), Миддлов (M) и Сеньоров (S) по месту в общем зачете",
  },
  {
    question: "Сколько человек я могу пригласить?",
    answer:
      "В команде может быть до восьми человек, хотя бы один должен являться студентом или сотрудником ФКН.",
  },
];

export function Faq() {
  return (
    <section className={styles.section}>
      <div className={styles.titleRow}>
        <h2 className={styles.title}>FAQ</h2>
      </div>

      <div className={styles.list}>
        {ITEMS.map((item) => (
          <Collapsible
            key={item.question}
            // defaultOpen={index === ITEMS.length - 1}
          >
            <CollapsibleTrigger className={styles.itemHeader}>
              <span>{item.question}</span>
              <span className={styles.icon}>
                <ChevronDown size={16} />
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className={styles.itemContent}>
              <div className={styles.itemBody}>{item.answer}</div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </section>
  );
}
