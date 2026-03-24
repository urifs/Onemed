import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

export function formatDateSP(dateStr: string | number | null, options: Intl.DateTimeFormatOptions = {}): string {
  if (!dateStr) return '-';
  try {
    let date: Date;
    if (typeof dateStr === 'number' || /^\d{10}$/.test(String(dateStr))) {
      date = new Date(Number(dateStr) * 1000);
    } else {
      date = new Date(dateStr as string);
    }
    if (isNaN(date.getTime())) return '-';
    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: SAO_PAULO_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...options
    };
    return date.toLocaleDateString('pt-BR', defaultOptions);
  } catch { return '-'; }
}

export function formatDateTimeSP(dateStr: string | number | null): string {
  if (!dateStr) return '-';
  try {
    let date: Date;
    if (typeof dateStr === 'number' || /^\d{10}$/.test(String(dateStr))) {
      date = new Date(Number(dateStr) * 1000);
    } else {
      date = new Date(dateStr as string);
    }
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('pt-BR', {
      timeZone: SAO_PAULO_TIMEZONE,
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return '-'; }
}

export function nowSaoPaulo(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: SAO_PAULO_TIMEZONE }));
}

export function formatWhatsApp(value: string, countryCode: string): string {
  const nums = value.replace(/\D/g, '');
  if (countryCode === '+55') {
    if (nums.length <= 2) return nums;
    if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7, 11)}`;
  }
  return nums;
}
