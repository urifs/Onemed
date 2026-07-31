/**
 * Meta Pixel Helper
 * Pixels: 797374160058274 e 2400702203708115
 *
 * A auditoria de 31/07/2026 encontrou três buracos aqui, todos corrigidos
 * neste arquivo (o quarto, a CAPI, é server-side):
 *
 *  1. PageView disparava só uma vez, no `index.html`. O site é uma SPA, então
 *     ir de `/` para `/checkout` não contava visualização nenhuma.
 *  2. InitiateCheckout disparava ao ABRIR o /checkout, não ao tentar comprar:
 *     ~565 eventos para 203 checkouts reais, e com email em 1% (o formulário
 *     ainda estava vazio). A Meta otimizava para "abriu a página".
 *  3. Não existia ViewContent nem AddToCart — dois degraus do funil que a
 *     Meta usa para montar público e otimizar.
 */

import { PLAN_LABELS } from './plans';

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

/** IDs precisam bater com os do index.html e com CAPI_PIXEL_IDS no mp-webhook. */
const PIXEL_IDS = ['797374160058274', '2400702203708115'];

const isFbqAvailable = () =>
  typeof window !== 'undefined' && typeof window.fbq === 'function';

/** Dados do comprador para a correspondência avançada (advanced matching). */
export interface PixelUserData {
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  country?: string | null;
}

/**
 * Reinicializa os pixels com os dados que o usuário acabou de digitar.
 *
 * É assim que a Meta documenta a correspondência avançada manual: o `init`
 * com user_data é idempotente e apenas enriquece os eventos seguintes. O
 * navegador faz o hash sozinho — nunca mandar já hasheado daqui.
 */
export const setPixelUserData = (data: PixelUserData) => {
  if (!isFbqAvailable()) return;

  const userData: Record<string, string> = {};
  if (data.email) userData.em = data.email.trim().toLowerCase();
  if (data.phone) {
    const digits = data.phone.replace(/\D/g, '');
    if (digits.length >= 8) userData.ph = digits;
  }
  if (data.name) {
    const parts = data.name.trim().split(/\s+/);
    if (parts[0]) userData.fn = parts[0].toLowerCase();
    if (parts.length > 1) userData.ln = parts[parts.length - 1].toLowerCase();
  }
  if (data.country) userData.country = data.country.trim().toLowerCase();

  if (Object.keys(userData).length === 0) return;
  for (const id of PIXEL_IDS) window.fbq!('init', id, userData);
};

/**
 * PageView numa troca de rota da SPA.
 * O `index.html` já dispara o primeiro; este cobre as navegações seguintes.
 */
export const trackPageView = () => {
  if (!isFbqAvailable()) return;
  window.fbq!('track', 'PageView');
};

/** Lead — usuário solicitou o teste gratuito. */
export const trackLead = (email: string, extra?: PixelUserData) => {
  if (!isFbqAvailable()) return;

  setPixelUserData({ email, ...extra });
  window.fbq!('track', 'Lead', {
    content_name: 'Teste Gratuito 30min',
    content_category: 'Trial',
    value: 0,
    currency: 'BRL',
  });
};

/** ViewContent — abriu a página de checkout e viu os planos. */
export const trackViewContent = (plan: string, value: number) => {
  if (!isFbqAvailable()) return;

  window.fbq!('track', 'ViewContent', {
    content_name: PLAN_LABELS[plan] || plan,
    content_category: 'Subscription',
    content_ids: [plan],
    content_type: 'product',
    value,
    currency: 'BRL',
  });
};

/** AddToCart — escolheu um plano ou adicionou um complemento. */
export const trackAddToCart = (plan: string, value: number, extras: string[] = []) => {
  if (!isFbqAvailable()) return;

  window.fbq!('track', 'AddToCart', {
    content_name: PLAN_LABELS[plan] || plan,
    content_category: 'Subscription',
    content_ids: [plan, ...extras],
    content_type: 'product',
    value,
    currency: 'BRL',
    num_items: 1 + extras.length,
  });
};

/**
 * InitiateCheckout — o usuário mandou ir para o pagamento de verdade.
 * Dispare no clique que leva ao Mercado Pago, com o formulário já preenchido:
 * é o que dá email e telefone para a correspondência.
 */
export const trackInitiateCheckout = (
  plan: string,
  value: number,
  userData?: PixelUserData,
) => {
  if (!isFbqAvailable()) return;

  if (userData) setPixelUserData(userData);
  window.fbq!('track', 'InitiateCheckout', {
    content_name: PLAN_LABELS[plan] || plan,
    content_category: 'Subscription',
    content_ids: [plan],
    content_type: 'product',
    value,
    currency: 'BRL',
    num_items: 1,
  });
};

/**
 * Purchase — compra concluída.
 * `eventId` deve ser `purchase_${paymentId}`, o mesmo que o mp-webhook usa na
 * CAPI, senão a mesma venda conta duas vezes.
 */
export const trackPurchase = (
  plan: string,
  value: number,
  paymentMethod: string,
  eventId?: string,
  userData?: PixelUserData,
) => {
  if (!isFbqAvailable()) return;

  if (userData) setPixelUserData(userData);

  const params = {
    content_name: PLAN_LABELS[plan] || plan,
    content_category: 'Subscription',
    content_ids: [plan],
    content_type: 'product',
    value,
    currency: 'BRL',
    num_items: 1,
    payment_method: paymentMethod,
  };

  if (eventId) {
    window.fbq!('track', 'Purchase', params, { eventID: eventId });
  } else {
    window.fbq!('track', 'Purchase', params);
  }
};

/** Evento customizado. */
export const trackCustomEvent = (
  eventName: string,
  params: Record<string, any> = {},
) => {
  if (!isFbqAvailable()) return;
  window.fbq!('trackCustom', eventName, params);
};
