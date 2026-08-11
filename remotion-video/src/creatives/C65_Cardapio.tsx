import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO } from './theme';
import { FPS } from './story';
import { OLightBg, OLEndCard, O_RED, O_INK, O_MUT, O_GREEN, WHITE } from './olight';
import { Grain, Vignette, win, easeOutExpo } from './cine';
import timing from './timings/c65.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C65_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  rest: DELAY + 0.7, vontade: DELAY + 5.2,
  entrada: DELAY + 7.9, sanarflix: DELAY + 9.8, usp: DELAY + 11.4,
  principal: DELAY + 14.1, estrategia: DELAY + 16.3, medcel: DELAY + 18.2, medcurso: DELAY + 19.9, n65: DELAY + 21.7,
  casa: DELAY + 25.6, n31: DELAY + 26.5, porcao: DELAY + 31.4,
  cozinha: DELAY + 33.2, atualiza: DELAY + 38.7,
  mesa: DELAY + 40.8,
  sobremesa: DELAY + 44.9, chef1: DELAY + 47.6, chef2: DELAY + 48.9, chef3: DELAY + 51.3,
  end: DELAY + T.duration - 3.2,
};

const Secao: React.FC<{ t: number; at: number; titulo: string; children: React.ReactNode }> =
({ t, at, titulo, children }) => {
  const p = easeOutExpo(win(t, at, at + 0.5));
  if (p <= 0) return null;
  return (
    <div style={{ opacity: win(t, at, at + 0.3), transform: `translateY(${(1 - p) * 40}px)`, marginBottom: 34 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ flex: 1, height: 2, background: '#e0d9c8' }} />
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 25, color: O_RED, letterSpacing: 6 }}>{titulo}</span>
        <div style={{ flex: 1, height: 2, background: '#e0d9c8' }} />
      </div>
      <div style={{ marginTop: 18 }}>{children}</div>
    </div>
  );
};

const Prato: React.FC<{ t: number; at: number; nome: string; nota: string; destaque?: boolean }> =
({ t, at, nome, nota, destaque }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, padding: '10px 0',
    opacity: win(t, at, at + 0.3), transform: `translateX(${(1 - easeOutExpo(win(t, at, at + 0.45))) * 30}px)`,
  }}>
    <span style={{ fontFamily: HEAD, fontWeight: destaque ? 900 : 800, fontSize: destaque ? 40 : 34, color: O_INK, whiteSpace: 'nowrap' }}>{nome}</span>
    <span style={{ flex: 1, borderBottom: '3px dotted #d6cfbc', transform: 'translateY(-8px)' }} />
    <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: destaque ? 30 : 25, color: destaque ? O_RED : O_MUT, whiteSpace: 'nowrap' }}>{nota}</span>
  </div>
);

export const C65_Cardapio: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  // o cardápio desliza pra cima conforme as seções entram
  const lift = easeOutExpo(win(t, B.casa - 0.6, B.casa + 0.6)) * 330 + easeOutExpo(win(t, B.sobremesa - 0.6, B.sobremesa + 0.6)) * 480;
  const menuOp = Math.min(win(t, B.rest, B.rest + 0.4), 1 - win(t, B.end + 0.5, B.end + 1));
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OLightBg />

      <div style={{
        position: 'absolute', left: 70, right: 70, top: 300 - lift, opacity: menuOp,
        background: '#fffdf6', border: '2px solid #e8e2d2', borderRadius: 26, padding: '44px 48px 30px',
        boxShadow: '0 50px 110px -30px rgba(22,24,29,0.28)',
      }}>
        {/* cabeçalho do menu */}
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24, color: O_MUT, letterSpacing: 8 }}>MAISON</div>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 62, color: O_INK, letterSpacing: -1 }}>One<span style={{ color: O_RED }}>Med</span></div>
          <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 26, color: O_MUT, marginTop: 8, opacity: win(t, B.rest + 0.8, B.rest + 1.2) }}>
            cardápio: +530 cursos de medicina
          </div>
          <div style={{
            display: 'inline-block', marginTop: 12, transform: 'rotate(-3deg)', opacity: win(t, B.vontade, B.vontade + 0.3),
            border: `4px double ${O_GREEN}`, borderRadius: 12, padding: '6px 18px', fontFamily: HEAD, fontWeight: 900, fontSize: 27, color: O_GREEN,
          }}>TUDO À VONTADE</div>
        </div>

        <Secao t={t} at={B.entrada} titulo="ENTRADAS · CICLO BÁSICO">
          <Prato t={t} at={B.sanarflix} nome="Sanarflix" nota="ciclo básico completo" />
          <Prato t={t} at={B.usp} nome="Semiologia · USP" nota="pra abrir o apetite" />
        </Secao>

        <Secao t={t} at={B.principal} titulo="PRATOS PRINCIPAIS · EXTENSIVOS">
          <Prato t={t} at={B.estrategia} nome="Estratégia MED" nota="intensivo/extensivo" />
          <Prato t={t} at={B.medcel} nome="MedCel · Afya" nota="extensivo" />
          <Prato t={t} at={B.medcurso} nome="MEDCurso" nota="clássico da casa" />
          <div style={{ textAlign: 'center', marginTop: 10, opacity: win(t, B.n65, B.n65 + 0.35) }}>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 34, color: O_RED }}>+65 mil aulas</span>
            <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 25, color: O_MUT }}> só nessa categoria</span>
          </div>
        </Secao>

        {t >= B.casa - 1 && (
          <Secao t={t} at={B.casa} titulo="O PRATO DA CASA">
            <div style={{
              border: `3px solid ${O_RED}`, borderRadius: 18, padding: '24px 28px', background: 'rgba(224,45,45,0.05)',
              transform: `scale(${0.94 + 0.06 * easeOutExpo(win(t, B.casa, B.casa + 0.5))})`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 42, color: O_INK }}>Questões Comentadas</span>
                <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 56, color: O_RED, opacity: win(t, B.n31, B.n31 + 0.3) }}>31.612</span>
              </div>
              <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 26, color: O_MUT, marginTop: 8 }}>
                aulas — <span style={{ opacity: win(t, B.porcao, B.porcao + 0.3), color: O_INK }}>servidas numa porção única</span>
              </div>
            </div>
          </Secao>
        )}

        {t >= B.cozinha - 1 && (
          <div style={{ marginTop: 6, opacity: win(t, B.cozinha, B.cozinha + 0.4) }}>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              {['cozinha aberta', 'prova tudo', 'repete à vontade'].map((c, i) => (
                <span key={c} style={{
                  opacity: win(t, B.cozinha + i * 0.5, B.cozinha + 0.3 + i * 0.5),
                  background: WHITE, border: '2px solid #e4ddca', borderRadius: 999, padding: '12px 24px',
                  fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: O_INK,
                }}>{c}</span>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 16, opacity: win(t, B.atualiza, B.atualiza + 0.35) }}>
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: O_GREEN }}>✓ ATUALIZAÇÕES SEM CUSTO</span>
            </div>
            <div style={{ textAlign: 'center', marginTop: 14, opacity: win(t, B.mesa, B.mesa + 0.35) }}>
              <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 28, color: O_MUT }}>+10.000 médicos e estudantes com mesa cativa</span>
            </div>
          </div>
        )}

        {t >= B.sobremesa - 1 && (
          <Secao t={t} at={B.sobremesa} titulo="SOBREMESA · O CHEF MONTA DO SEU JEITO">
            <Prato t={t} at={B.chef1} nome="Resumo" nota="em 1 clique" destaque />
            <Prato t={t} at={B.chef2} nome="Flashcards" nota="do seu material" destaque />
            <Prato t={t} at={B.chef3} nome="Cronograma" nota="com mapa mental" destaque />
          </Secao>
        )}
      </div>

      <Vignette strength={0.2} />
      <Grain opacity={0.04} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c65.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
