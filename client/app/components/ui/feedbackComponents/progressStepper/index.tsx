import styles from "./progressStepper.module.css";

export interface ProgressStep {
  id: string;
  label: string;
}

export interface ProgressStepperProps {
  steps: readonly ProgressStep[];
  currentStepIndex?: number;
  className?: string;
  ariaLabel?: string;
}

export default function ProgressStepper({
  steps,
  currentStepIndex = 0,
  className = "",
  ariaLabel = "Progress",
}: ProgressStepperProps) {
  const lastStepIndex = Math.max(steps.length - 1, 0);
  const activeIndex = Math.min(Math.max(currentStepIndex, 0), lastStepIndex);

  return (
    <ol
      className={`${styles.progressStepper} ${className}`.trim()}
      aria-label={ariaLabel}
    >
      {steps.map((step, index) => {
        const isCompleted = index < activeIndex;
        const isCurrent = index === activeIndex;
        const stateClass = isCompleted
          ? styles.completed
          : isCurrent
            ? styles.current
            : styles.inactive;

        return (
          <li
            className={`${styles.step} ${stateClass}`}
            aria-current={isCurrent ? "step" : undefined}
            key={step.id}
          >
            <span className={styles.marker} aria-hidden="true">
              {isCompleted ? "\u2713" : index + 1}
            </span>
            <span className={styles.label}>{step.label}</span>

            {index < steps.length - 1 && (
              <span
                className={`${styles.connector} ${isCompleted ? styles.connectorCompleted : styles.connectorInactive}`}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
