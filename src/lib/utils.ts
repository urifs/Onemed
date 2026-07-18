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

// Retorna o início do dia atual no horário de São Paulo como string ISO (UTC)
// Brasil não tem horário de verão desde 2019, então São Paulo é sempre UTC-3
export function todayStartISO(): string {
  const spDateStr = new Date().toLocaleDateString('en-CA', { timeZone: SAO_PAULO_TIMEZONE });
  return new Date(`${spDateStr}T00:00:00-03:00`).toISOString();
}

// Busca todos os registros de uma tabela contornando o limite de 1000 linhas do Supabase
export async function fetchAllRows<T = any>(
  buildQuery: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const PAGE = 1000;
  let all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery(from, from + PAGE - 1);
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

export function formatDuration(totalSeconds: number | null | undefined): string {
  if (!totalSeconds || totalSeconds <= 0) return '';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${m}min`;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
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
