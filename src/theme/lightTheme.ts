/**
 * Semantic light-theme utility tokens.
 *
 * These map UI pieces to design-system variables so light/dark parity
 * is handled by theme.css instead of hardcoded per-component colors.
 */

export const lightTheme = {
  background: {
    primary: 'bg-background',
    secondary: 'bg-muted/50',
    card: 'bg-card',
    sidebar: 'bg-sidebar',
    map: 'bg-muted',
    input: 'bg-input-background',
    hover: 'hover:bg-accent/60',
    info: 'bg-primary/10',
    success: 'bg-emerald-500/10',
    warning: 'bg-amber-500/10',
    error: 'bg-rose-500/10',
  },
  text: {
    primary: 'text-foreground',
    secondary: 'text-muted-foreground',
    muted: 'text-muted-foreground/80',
    label: 'text-muted-foreground',
    inverse: 'text-primary-foreground',
  },
  primary: {
    main: 'bg-primary text-primary-foreground',
    hover: 'hover:bg-primary/90',
    selectedText: 'text-primary',
    selectedBg: 'bg-primary/10',
    selectedCardBg: 'bg-primary/15 text-primary',
  },
  status: {
    success: 'text-emerald-600 dark:text-emerald-400',
    successBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    successFg: 'text-emerald-700 dark:text-emerald-300',
    warning: 'text-amber-600 dark:text-amber-400',
    warningBg: 'bg-amber-500/10 dark:bg-amber-500/15',
    error: 'text-rose-600 dark:text-rose-400',
    errorBg: 'bg-rose-500/10 dark:bg-rose-500/15',
    errorFg: 'text-rose-700 dark:text-rose-300',
    info: 'text-sky-600 dark:text-sky-400',
    infoBg: 'bg-sky-500/10 dark:bg-sky-500/15',
  },
  border: {
    default: 'border-border',
    card: 'border-border/80',
    input: 'border-input',
  },
  shadow: {
    base: 'shadow-sm',
    card: 'shadow-[0px_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0px_2px_8px_rgba(0,0,0,0.24)]',
  },
  card: 'bg-card text-card-foreground border border-border shadow-sm rounded-xl relative overflow-hidden',
  table: {
    header: 'bg-muted/50 text-muted-foreground',
    rowHover: 'hover:bg-accent/60',
    border: 'border-border',
  },
  sidebar: {
    container: 'bg-sidebar border-r border-sidebar-border',
    activeMenu: 'bg-sidebar-accent text-sidebar-accent-foreground',
    inactiveMenu: 'text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground',
    icon: 'text-sidebar-foreground/80',
    activeIcon: 'text-sidebar-accent-foreground',
  },
  metricCard: {
    container: 'bg-card text-card-foreground border border-border shadow-sm rounded-xl',
    iconBg: 'bg-primary/10',
    title: 'text-muted-foreground',
    value: 'text-foreground',
  },
};
