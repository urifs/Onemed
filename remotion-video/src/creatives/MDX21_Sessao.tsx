import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/md21.json';
import { HEAD, MONO } from './theme';
import { M_BLUE, M_NAVY, M_MUT, M_RED, WHITE } from './meduf';
import {
  MobileShell, NavSlide, Dedo, CameraRig, ConsensoFlux, Cartao, Rank, Refs, Linha,
  FimClaro, Seguranca, surge, win, outB, flashAt, AZUL_SOFT, VERM_BG, FERRAMENTAS, Shimmer,
} from './medufui';

/* ============================================================
   MDX21 — UMA SESSÃO COMPLETA (dentro do app, celular)
   Nós SOMOS a tela: home com as 17 ferramentas → toque →
   a tela desliza pro Diagnóstico Detalhado → caso digitado →
   3 IAs convergindo → resultado → swipe pros exames.
   Câmera empurrando o tempo todo.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const MDX21_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

const CASO = 'Mulher, 46 anos. Cefaleia súbita, intensa — "a pior da vida". Início há 1h.';

export const MDX21_Sessao: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const tapAt = DELAY + 3.55;      /* toca em Diagnóstico Detalhado */
  const telaB = tapAt + 0.15;
  const digAt = DELAY + 5.2;
  const iasAt = DELAY + 10.2;
  const consAt = DELAY + 11.9;
  const resAt = DELAY + 13.0;
  const alarmAt = DELAY + 14.65;
  const swipeAt = DELAY + 16.6;
  const fimAt = DELAY + 21.9;

  const nCaso = t < digAt ? 0 : Math.ceil(win(t, digAt, digAt + 4.2) * CASO.length);
  const pSwipe = t < swipeAt ? 0 : outB(win(t, swipeAt, swipeAt + 0.5));

  /* ---------------- TELA A: home com as 17 ---------------- */
  const Home = (
    <MobileShell hora="21:08">
      <div style={{ padding: '30px 40px' }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 46, color: M_NAVY, ...surge(t, DELAY + 0.15) }}>
          boa noite, doutora
        </div>
        <div style={{ fontFamily: HEAD, fontSize: 29, color: M_MUT, marginTop: 8, ...surge(t, DELAY + 0.9) }}>
          17 ferramentas prontas — por onde começamos?
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 26 }}>
          {FERRAMENTAS.map((f, i) => {
            const at = DELAY + 1.0 + i * 0.07;
            const alvo = f === 'Diagnóstico Detalhado';
            const press = alvo && t >= tapAt && t < tapAt + 0.2;
            return (
              <div key={f} style={{
                background: WHITE, borderRadius: 18, padding: '18px 20px',
                border: `2px solid ${alvo && t >= tapAt - 0.3 ? M_BLUE : 'rgba(14,27,51,0.08)'}`,
                boxShadow: '0 10px 26px rgba(14,27,51,0.06)',
                display: 'flex', alignItems: 'center', gap: 14,
                transform: press ? 'scale(0.95)' : 'scale(1)',
                ...surge(t, at, 0.3),
              }}>
                <span style={{
                  width: 44, height: 44, borderRadius: 12, background: AZUL_SOFT, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: HEAD, fontWeight: 900, fontSize: 21, color: M_BLUE,
                }}>{i + 1}</span>
                <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 24.5, color: M_NAVY, lineHeight: 1.2 }}>{f}</span>
              </div>
            );
          })}
        </div>
      </div>
    </MobileShell>
  );

  /* ---------------- TELA B: a ferramenta ---------------- */
  const Ferramenta = (
    <MobileShell ferramenta="Diagnóstico Detalhado" voltar hora="21:08">
      {/* conteúdo com swipe para a seção de exames */}
      <div style={{
        position: 'absolute', inset: 0, padding: '28px 40px',
        transform: `translateY(${-pSwipe * 760}px)`,
      }}>
        <Cartao style={{ padding: '26px 30px' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 22, color: M_MUT, marginBottom: 12, letterSpacing: '0.06em' }}>
            QUADRO CLÍNICO
          </div>
          <div style={{ fontFamily: HEAD, fontSize: 31, color: M_NAVY, lineHeight: 1.5, minHeight: 140 }}>
            {CASO.slice(0, nCaso)}
            {nCaso > 0 && nCaso < CASO.length && <span style={{ color: M_BLUE }}>▌</span>}
          </div>
        </Cartao>

        {t >= iasAt && (
          <div style={{ marginTop: 20 }}>
            <ConsensoFlux t={t} at={iasAt} consAt={consAt} largura={1000} />
          </div>
        )}

        {t >= resAt && (
          <Cartao style={{ marginTop: 8, ...surge(t, resAt) }}>
            <Rank t={t} at={resAt + 0.1} rotulo="Hemorragia subaracnóidea" frac={0.82} tag="não pode passar" />
            <Rank t={t} at={resAt + 0.5} rotulo="Enxaqueca com aura" frac={0.4} tag="considerar" />
            {t >= alarmAt && (
              <div style={{
                background: VERM_BG, border: `2.5px solid ${M_RED}`, borderRadius: 14,
                padding: '18px 24px', marginTop: 6, ...surge(t, alarmAt, 0.35),
              }}>
                <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 27, color: M_RED }}>
                  vermelho: TC de crânio agora — cefaleia sentinela
                </span>
              </div>
            )}
          </Cartao>
        )}

        {/* seção de exames (revelada pelo swipe) */}
        {t >= swipeAt - 0.6 && (
        <Cartao style={{ marginTop: 22 }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 30, color: M_NAVY, marginBottom: 16 }}>
            Exames sugeridos — na ordem certa
          </div>
          {[['1', 'TC de crânio sem contraste', 'imediata'], ['2', 'se TC normal: punção lombar', 'sequência'], ['3', 'angio-TC conforme achados', 'condicional']].map(([n, e, tag], i) => t >= swipeAt + 0.4 + i * 0.4 && (
            <div key={n} style={{
              display: 'flex', alignItems: 'center', gap: 18, marginBottom: 14,
              ...surge(t, swipeAt + 0.4 + i * 0.4, 0.3),
            }}>
              <span style={{
                width: 48, height: 48, borderRadius: 14, background: M_BLUE, color: WHITE, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: HEAD, fontWeight: 900, fontSize: 25,
              }}>{n}</span>
              <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 28, color: M_NAVY, flex: 1 }}>{e}</span>
              <span style={{
                fontFamily: HEAD, fontWeight: 800, fontSize: 20, color: M_BLUE,
                background: AZUL_SOFT, borderRadius: 999, padding: '6px 16px',
              }}>{tag}</span>
            </div>
          ))}
          {t >= swipeAt + 1.9 && (
            <Refs t={t} at={swipeAt + 1.9} itens={['PubMed', 'diretriz de cefaleia — SUS']} />
          )}
        </Cartao>
        )}
      </div>
    </MobileShell>
  );

  return (
    <AbsoluteFill style={{ background: '#0e1b33' }}>
      <CameraRig t={t} kf={[
        [0, 1.0, 0, 0],
        [digAt, 1.0, 0, 0],
        [digAt + 1.5, 1.1, -30, -60],
        [iasAt, 1.06, 0, -20],
        [alarmAt, 1.06, 0, -20],
        [alarmAt + 0.4, 1.17, -20, -170],
        [swipeAt, 1.0, 0, 0],
        [swipeAt + 2.2, 1.08, 0, -60],
        [fimAt, 1.0, 0, 0],
      ]}>
        <NavSlide t={t} telas={[
          { at: 0, el: Home },
          { at: telaB, el: Ferramenta },
        ]} />
        <Dedo t={t} taps={[[tapAt, 810, 700], [swipeAt, 540, 1400]]} />
      </CameraRig>

      {/* chip narrativo do fecho */}
      {t >= DELAY + 19.5 && t < fimAt && (
        <div style={{
          position: 'absolute', bottom: 140, left: 0, right: 0, display: 'flex', justifyContent: 'center',
          ...surge(t, DELAY + 19.5),
        }}>
          <div style={{
            background: M_NAVY, color: WHITE, fontFamily: HEAD, fontWeight: 800, fontSize: 36,
            borderRadius: 999, padding: '20px 42px', boxShadow: '0 20px 60px rgba(14,27,51,0.4)',
          }}>
            tudo isso antes do café esfriar.
          </div>
        </div>
      )}

      {/* flash de transição no toque */}
      <AbsoluteFill style={{ background: WHITE, opacity: flashAt(t, tapAt) * 0.5, pointerEvents: 'none' }} />

      <FimClaro t={t} at={fimAt}
        frase="o assistente clínico no seu bolso"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/md21.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
