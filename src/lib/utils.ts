import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function daysAgo(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000)
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatInactive(days: number): string {
  if (days < 30) return `${days}d`
  if (days < 365) return `${Math.floor(days / 30)}mo`
  const years = Math.floor(days / 365)
  const months = Math.floor((days % 365) / 30)
  return months > 0 ? `${years}y ${months}mo` : `${years}y`
}

export function inactivityColor(days: number | null): string {
  if (days === null) return 'text-slate-500'
  if (days < 180) return 'text-slate-300'
  if (days < 365) return 'text-amber-400'
  if (days < 730) return 'text-orange-400'
  return 'text-red-400'
}
