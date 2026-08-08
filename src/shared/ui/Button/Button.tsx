import styles from './Button.module.css'
import { cn } from '@shared/lib/utils'


export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        styles.button,
        styles[variant],
        styles[`size-${size}`],
        className
      )}
      {...props}
    />
  )
}
