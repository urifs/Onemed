"""Camera falsa v7 — retrato 9:16 sem costura, com nitidez preservada."""
from PIL import Image, ImageFilter
import numpy as np, math, subprocess, os, sys

YAW   = float(sys.argv[1]) if len(sys.argv) > 1 else 30.0
PITCH = float(sys.argv[2]) if len(sys.argv) > 2 else 18.0
RMUL  = float(sys.argv[3]) if len(sys.argv) > 3 else 0.90
RVMUL = float(sys.argv[4]) if len(sys.argv) > 4 else 1.00
SAIDA = sys.argv[5] if len(sys.argv) > 5 else '/tmp/cam.y4m'
CICLOS = int(sys.argv[6]) if len(sys.argv) > 6 else 3

W, H, FPS = 480, 1040, 15
AQUI = os.path.dirname(os.path.abspath(__file__))

# ---------- moldura: retrato cheio, sem pixel inventado no meio ----------
src = Image.open(os.path.join(AQUI, 'r5.jpg')).convert('RGB').crop((0, 0, 1024, 990))
lw, topo = 740, 70
lh = int(lw * src.height / src.width)          # 774
face = src.resize((lw, lh), Image.LANCZOS)
base = Image.new('RGB', (W, H))
base.paste(face, (-(lw - W) // 2, topo))
# topo: continuação do fundo (a foto começa em y=topo)
if topo > 0:
    cabeca = base.crop((0, topo, W, topo + 40)).filter(ImageFilter.GaussianBlur(14))
    base.paste(cabeca.resize((W, topo + 2)), (0, 0))
# rodapé: pescoço/ombro seguindo para baixo — fica sob o degradê da interface
py0 = topo + lh
_b = np.asarray(base).astype(np.float32)
_col = _b[py0 - 26:py0].mean(axis=0)                      # cor média por coluna
_col = np.asarray(Image.fromarray(_col.astype(np.uint8)[None]).resize((W, 1))
                  .filter(ImageFilter.GaussianBlur(0))).astype(np.float32)[0]
_alt = H - py0 + 2
_g = np.linspace(0.0, 1.0, _alt, dtype=np.float32)[:, None, None]
_escuro = np.array([26.0, 22.0, 20.0], dtype=np.float32)
_band = _col[None] * (1 - _g) + _escuro[None, None] * _g
_band = np.asarray(Image.fromarray(np.clip(_band, 0, 255).astype(np.uint8))
                   .filter(ImageFilter.GaussianBlur(26))).astype(np.float32)
_fade = np.clip(np.linspace(0, 1, 70), 0, 1)[:, None, None]          # junção suave
_topo_band = _b[py0 - 2:py0 - 2 + 70]
_band[:70] = _topo_band * (1 - _fade) + _band[:70] * _fade
base.paste(Image.fromarray(np.clip(_band, 0, 255).astype(np.uint8)), (0, py0 - 2))
base.save(os.path.join(AQUI, 'base7.jpg'), quality=95)

A = np.asarray(base).astype(np.float32)
cx, cy = W * 0.5, H * 0.38
R, Rv = W * RMUL, H * RVMUL
GX, GY = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
LIM = 1.45
KX, KY = 0.55, 0.15
ESCORCO = 1.0        # quanto do encurtamento real é aplicado   # recentragem parcial: gira no lugar sem perder a pista de translação

def amostra(sx, sy):
    x0 = np.clip(np.floor(sx), 0, W - 1).astype(np.int32); x1 = np.clip(x0 + 1, 0, W - 1)
    y0 = np.clip(np.floor(sy), 0, H - 1).astype(np.int32); y1 = np.clip(y0 + 1, 0, H - 1)
    fx = np.clip(sx - x0, 0, 1)[..., None]; fy = np.clip(sy - y0, 0, 1)[..., None]
    return ((A[y0, x0] * (1 - fx) + A[y0, x1] * fx) * (1 - fy)
          + (A[y1, x0] * (1 - fx) + A[y1, x1] * fx) * fy)

def girar(yaw_deg, pitch_deg, dx=0.0, dy=0.0, esc=1.0, roll_deg=0.0):
    yaw, pitch = math.radians(yaw_deg), math.radians(pitch_deg)
    rl = math.radians(roll_deg)
    X0 = (GX - cx) / esc - dx
    Y0 = (GY - cy) / esc - dy
    X = cx + X0 * math.cos(rl) + Y0 * math.sin(rl)
    Y = cy - X0 * math.sin(rl) + Y0 * math.cos(rl)
    # encurtamento do rosto ao virar: largura cai com cos(yaw), altura com cos(pitch).
    # é escala global, então nenhum traço deforma — o rosto só fica mais estreito.
    X = cx + (X - cx) / max(0.55, math.cos(yaw) ** ESCORCO)
    Y = cy + (Y - cy) / max(0.60, math.cos(pitch) ** ESCORCO)
    phi = np.clip(np.arcsin(np.clip((X - cx) / R, -0.999, 0.999)) - yaw, -LIM, LIM)
    th  = np.clip(np.arcsin(np.clip((Y - cy) / Rv, -0.999, 0.999)) - pitch, -LIM, LIM)
    # recentraliza: a cabeça gira no lugar em vez de deslizar para a borda
    return amostra(cx + R * (np.sin(phi) + KX * math.sin(yaw)),
                   cy + Rv * (np.sin(th) + KY * math.sin(pitch)))

# ---------- coreografia: frente, esquerda, direita, cima, baixo ----------
# ciclo de 16 s: dentro de qualquer janela de espera do app cabe cada pose
UM = [(2.0, 0, 0),
      (0.7, -YAW, 0), (2.4, -YAW, 0), (0.7, 0, 0),
      (0.7,  YAW, 0), (2.4,  YAW, 0), (0.7, 0, 0),
      (0.6, 0, -PITCH), (3.0, 0, -PITCH), (0.6, 0, 0),
      (0.6, 0,  PITCH), (3.0, 0,  PITCH), (0.6, 0, 0)]
CICLO = UM * CICLOS
total = sum(c[0] for c in CICLO); n = int(total * FPS)
ease = lambda p: p * p * (3 - 2 * p)

def estado(t):
    acc, ant = 0.0, (0.0, 0.0)
    for dur, y, p in CICLO:
        if t < acc + dur:
            k = ease((t - acc) / dur)
            return (ant[0] + (y - ant[0]) * k, ant[1] + (p - ant[1]) * k)
        acc += dur; ant = (y, p)
    return ant

NITIDEZ = ImageFilter.UnsharpMask(radius=1.6, percent=105, threshold=2)
proc = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo',
                         '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                         '-pix_fmt', 'yuv420p', SAIDA], stdin=subprocess.PIPE)
for i in range(n):
    t = i / FPS
    yaw, pitch = estado(t)
    yaw   += 1.1 * math.sin(t * 0.85)
    pitch += 0.9 * math.sin(t * 0.61 + 1.0)
    dx = 3.5 * math.sin(t * 0.73); dy = 3.0 * math.sin(t * 0.52 + 2.0)
    esc = 1.075 + 0.012 * math.sin(t * 0.41)   # sobra de quadro: a inclinação nunca mostra canto vazio
    roll = -0.05 * yaw + 0.6 * math.sin(t * 0.47)     # a cabeça inclina junto ao virar
    fr = np.clip(girar(yaw, pitch, dx, dy, esc, roll), 0, 255).astype(np.uint8)
    proc.stdin.write(Image.fromarray(fr).filter(NITIDEZ).tobytes())
proc.stdin.close(); proc.wait()
print(SAIDA, os.path.getsize(SAIDA) // 1048576, 'MB', round(total, 1), 's  yaw', YAW, 'pitch', PITCH)
