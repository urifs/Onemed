/**
 * Meta Pixel Helper
 * Utilitário para rastrear eventos do Meta Pixel
 * Pixels: 797374160058274 e 2400702203708115
 */

import { PLAN_LABELS } from './plans';

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

const isFbqAvailable = () =>
  typeof window !== 'undefined' && typeof window.fbq === 'function';

/**
 * Rastreia o evento Lead - quando um usuário solicita teste gratuito
 */
export const trackLead = (email: string) => {
  if (!isFbqAvailable()) return;

  window.fbq!('track', 'Lead', {
    content_name: 'Teste Gratuito 30min',
    content_category: 'Trial',
    value: 0,
    currency: 'BRL',
  });

  console.log('[Meta Pixel] Lead tracked:', email);
};

/**
 * Rastreia o evento InitiateCheckout - quando um usuário inicia o checkout
 */
export const trackInitiateCheckout = (plan: string, value: number) => {
  if (!isFbqAvailable()) return;

  window.fbq!('track', 'InitiateCheckout', {
    content_name: PLAN_LABELS[plan] || plan,
    content_category: 'Subscription',
    content_ids: [plan],
    value,
    currency: 'BRL',
    num_items: 1,
  });

  console.log('[Meta Pixel] InitiateCheckout tracked:', { plan, value });
};

/**
 * Rastreia o evento Purchase - quando uma compra é concluída.
 * eventId deve ser `purchase_${paymentId}` para deduplicação com CAPI server-side.
 */
export const trackPurchase = (
  plan: string,
  value: number,
  paymentMethod: string,
  eventId?: string
) => {
  if (!isFbqAvailable()) return;

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

  console.log('[Meta Pixel] Purchase tracked:', { plan, value, paymentMethod, eventId });
};

/**
 * Rastreia evento customizado
 */
export const trackCustomEvent = (
  eventName: string,
  params: Record<string, any> = {}
) => {
  if (!isFbqAvailable()) return;

  window.fbq!('trackCustom', eventName, params);

  console.log('[Meta Pixel] Custom event tracked:', eventName, params);
};
