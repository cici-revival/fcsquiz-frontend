import styles from './ModifyPlayers.module.css'
import { Input } from "@/shared/ui";

export const NumberInputWithControls = ({
  value,
  onChange,
  min = 0,
  max = 20,
  disabled = false
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) => {
  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    if (inputValue === "") {
      onChange(min);
      return;
    }

    const num = parseInt(inputValue, 10);
    if (!isNaN(num)) {
      const clampedValue = Math.min(Math.max(num, min), max);
      onChange(clampedValue);
    }
  };

  const handleBlur = () => {
    if (value < min) onChange(min);
    if (value > max) onChange(max);
  };

  return (
    <div className={styles.numberInputContainer}>
      <button
        type="button"
        className={styles.numberBtn}
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        aria-label="Уменьшить"
      >
        −
      </button>

      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value === 0 ? "" : value.toString()}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder="0"
        disabled={disabled}
        className={styles.numberInputField}
      />

      <button
        type="button"
        className={styles.numberBtn}
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        aria-label="Увеличить"
      >
        +
      </button>
    </div>
  );
};
