import { ELENCO_STILI } from './stili.js';
import { LUT } from './lut.js';
// Pagina della regia (una sola pagina, funziona da telefono e da PC).
export const PAGINA = `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#F4F2EE">
<title>AGENZIA MOMENTO AI</title>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>
<style>
@media print{header,.noprint,button{display:none!important}body{background:#fff;color:#000}.card{border-color:#ccc;background:#fff}.mut{color:#555}a{color:#000}}
details.copione summary{cursor:pointer;list-style:none}details.copione[open]{border-color:var(--teal)}
:root{--teal:#0E9F9A;--teal2:#0B8782;--tealbg:#E3F4F3;--bg:#F4F2EE;--card:#FFFFFF;--line:#E6E2DA;--txt:#17171A;--mut:#8A8780;--warn:#E8930C;--err:#E5484D;--ok:#22A55B;--nero:#141416;--legno:#E9D9BC;--legno2:#D9C29A}
*{box-sizing:border-box}body{margin:0;font-family:"Inter",system-ui,-apple-system,Segoe UI,sans-serif;background:var(--bg);color:var(--txt);font-size:15px;-webkit-font-smoothing:antialiased}
header{position:fixed;left:0;top:0;bottom:0;width:236px;display:flex;flex-direction:column;gap:4px;padding:22px 14px 16px;background:#fff;border-right:1px solid var(--line);z-index:30;overflow-y:auto}
body.dentro{padding-left:236px}body:not(.dentro) header{display:none}
.logo{display:flex;flex-direction:column;line-height:1;text-decoration:none;padding:2px 10px 18px}.logo b{font-family:"Inter",system-ui,sans-serif;font-weight:700;font-size:28px;letter-spacing:-1.3px;color:var(--teal)}.logo small{margin-top:4px;font-size:9.5px;font-weight:600;letter-spacing:1.7px;text-transform:uppercase;color:var(--mut)}
.logo:hover{opacity:.85}.sep,.sez{display:none}
header nav{display:flex;flex-direction:column;gap:2px;flex:1}
.gruppo{font-size:10.5px;font-weight:600;letter-spacing:1.4px;text-transform:uppercase;color:var(--mut);padding:16px 12px 6px}
.vm{display:flex;align-items:center;gap:11px;padding:9px 12px;border-radius:11px;color:#4a4843;font-size:14px;font-weight:500;text-decoration:none;white-space:nowrap;border:0;background:none;cursor:pointer;font-family:inherit;width:100%;text-align:left}
.vm svg{width:18px;height:18px;flex:none;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.vm:hover{background:#f3f1ec;color:var(--txt)}.vm.att{background:var(--tealbg);color:var(--teal2);font-weight:600}
.vm .num{margin-left:auto;font-size:11.5px;font-weight:600;color:var(--mut);font-variant-numeric:tabular-nums}.vm.att .num{color:var(--teal2)}
.piede{border-top:1px solid var(--line);padding-top:10px;margin-top:10px}
.ham,.barra{display:none}.ham[hidden]{display:none!important}.ham svg{width:22px;height:22px}
@media(max-width:900px){header{transform:translateX(-105%);transition:transform .3s cubic-bezier(.2,.75,.2,1);box-shadow:20px 0 60px rgba(20,20,22,.18);z-index:45;width:260px}header.aperto{transform:none}
 body.dentro{padding-left:0}.barra{display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:31;height:56px;padding:0 12px;background:rgba(255,255,255,.94);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}body:not(.dentro) .barra{display:none}
 .barra .logo{flex-direction:row;align-items:baseline;gap:8px;padding:0}.barra .logo b{font-size:23px}.barra .logo small{margin:0}.ham{display:flex;padding:9px;width:auto}.barra .tit{margin-left:auto;font-size:13px;font-weight:600;color:var(--mut)}
 .velo-menu{position:fixed;inset:0;background:rgba(20,20,22,.3);z-index:44;display:none}header.aperto~.velo-menu{display:block}}
@media(min-width:901px){.lato{top:16px}}
main{max-width:1180px;margin:auto;padding:22px}
a{color:var(--teal)}h2{margin:28px 0 10px;font-size:13px;color:var(--mut);text-transform:uppercase;letter-spacing:1.2px;font-weight:600}h1{font-size:24px;margin:6px 0 4px;letter-spacing:-.5px}
button,.btn{background:var(--teal);color:#fff;border:0;border-radius:999px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block;transition:transform .15s,box-shadow .15s}
button:hover,.btn:hover{box-shadow:0 6px 18px -8px rgba(43,89,255,.7)}
button.sec,.btn.sec{background:#fff;border:1px solid var(--line);color:var(--txt);box-shadow:none}button.rosso{background:#fff;border:1px solid #f3c9ca;color:var(--err)}
button:disabled{opacity:.5}
input,textarea,select{width:100%;background:#fff;border:1px solid var(--line);color:var(--txt);border-radius:12px;padding:11px 12px;font:inherit}
input:focus,textarea:focus,select:focus{outline:2px solid #c9d5ff;border-color:var(--teal)}
textarea{min-height:110px;resize:vertical}label{display:block;margin:16px 0 6px;font-weight:600;font-size:14px}.aiuto{color:var(--mut);font-size:13px;margin-top:5px}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px 18px;margin:10px 0;box-shadow:0 1px 2px rgba(0,0,0,.03)}
.lav{display:block;color:inherit;text-decoration:none}.lav:hover{border-color:#c9d5ff}
.mut{color:var(--mut);font-size:13px}.riga{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.pill{font-size:12px;padding:3px 10px;border-radius:20px;background:#f0ede7;color:#5f5c56;white-space:nowrap;font-weight:500}
.pill.pronto{background:#e3f6ea;color:var(--ok)}.pill.in_corso{background:#e7edff;color:var(--teal)}.pill.errore{background:#fde8e8;color:var(--err)}
.fasi{display:flex;gap:4px;margin:14px 0}.fasi div{flex:1;height:6px;border-radius:4px;background:var(--line)}.fasi .ok{background:var(--teal)}.fasi .ora{background:var(--teal);animation:p 1.2s infinite}
@keyframes p{50%{opacity:.4}}
.fasinomi{display:flex;gap:4px;font-size:11px;color:var(--mut)}.fasinomi span{flex:1;text-align:center}
.log{font-family:ui-monospace,Menlo,monospace;font-size:12.5px;max-height:320px;overflow:auto;background:#fff;border:1px solid var(--line);border-radius:14px;padding:10px 12px}
.log div{padding:4px 0;border-bottom:1px solid #f1eee8}.log .warn{color:var(--warn)}.log .errore{color:var(--err)}.log b{color:var(--txt);font-weight:600}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.tag{font-size:11px;text-transform:uppercase;padding:2px 8px;border-radius:6px;font-weight:700;color:#fff}
.youtube{background:#c4302b}.tiktok{background:#111}.instagram{background:#c13584}
table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid var(--line);padding:8px 6px;text-align:left;vertical-align:top;font-size:14px}th{color:var(--mut);font-weight:500}
ul{margin:6px 0;padding-left:20px}li{margin:3px 0}
.kv{display:grid;grid-template-columns:130px 1fr;gap:6px 12px;font-size:14px}.kv b{color:var(--mut);font-weight:500}
.vuoto{text-align:center;padding:40px 10px;color:var(--mut)}
.err{color:var(--err);margin-top:10px}
.studio{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin-top:12px}
.stanza{background:#fff;border:1px solid var(--line);border-radius:18px;padding:12px 12px 6px;position:relative}
.stanza h3{margin:0 0 10px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:var(--mut);font-weight:600}
.stanza.spenta{grid-column:1/-1}.posti{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:2px}.posti .scrivania{padding:6px;margin:0}.posti .av{width:40px;height:40px;font-size:19px}
.scrivania{display:flex;gap:12px;align-items:flex-start;padding:10px;border-radius:14px;cursor:pointer;margin-bottom:6px;transition:background .2s}
.scrivania:hover{background:#f6f4f0}
.av{width:52px;height:52px;flex:none;border-radius:50%;display:grid;place-items:center;font-size:26px;background:#f3f0ea;border:3px solid var(--c,#345);position:relative}
.av:after{content:'';position:absolute;right:-2px;bottom:-2px;width:14px;height:14px;border-radius:50%;background:#c9c5bd;border:2px solid #fff}
.lavora .av{animation:bob 1.4s ease-in-out infinite,alone 1.8s infinite}
.riposo{opacity:.4}.lavora .av:after{background:var(--ok)}.coda .av:after{background:var(--warn)}.errore .av:after{background:var(--err)}
@keyframes bob{50%{transform:translateY(-3px)}}@keyframes alone{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--c) 60%,transparent)}100%{box-shadow:0 0 0 14px transparent}}
.chi{flex:1;min-width:0}.chi b{font-size:15px}.chi .ruolo{color:var(--mut);font-size:12px}
.schermo{margin-top:7px;background:#f7f5f1;border:1px solid var(--line);border-radius:10px;padding:7px 9px;font:12.5px/1.35 ui-monospace,Menlo,monospace;color:#3b3a37;min-height:34px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}
.lavora .schermo{border-color:color-mix(in srgb,var(--c) 50%,var(--line))}
.lavora .schermo:after{content:'▋';animation:cur 1s steps(1) infinite;margin-left:2px}@keyframes cur{50%{opacity:0}}
.stato-ag{font-size:11px;font-weight:600;margin-left:6px;color:var(--mut)}.lavora .stato-ag{color:var(--ok)}.coda .stato-ag{color:var(--warn)}.errore .stato-ag{color:var(--err)}
.attivo{display:block;text-decoration:none;color:inherit}
.pannello{position:fixed;inset:auto 0 0 0;max-height:78vh;background:#fff;border-top:1px solid var(--line);border-radius:22px 22px 0 0;padding:16px 18px 24px;overflow:auto;z-index:40;box-shadow:0 -20px 60px rgba(0,0,0,.15);max-width:760px;margin:auto}
.velo{position:fixed;inset:0;background:rgba(20,20,22,.25);z-index:39}
/* ---------- la sala: l'agenzia vista dall'alto ---------- */
.et-ag.pillola{background:rgba(20,20,22,.9);color:#fff;border-radius:999px;padding:5px 10px 5px 8px;font:600 12px/1 Inter,system-ui;display:flex;gap:6px;align-items:center;white-space:nowrap;box-shadow:0 6px 16px -6px rgba(0,0,0,.45);cursor:pointer;flex-direction:row}
.et-ag.pillola .pt{width:7px;height:7px;border-radius:50%;background:#9a968f}
.et-ag.carta{background:#fff;border-radius:14px;padding:9px 11px;min-width:150px;max-width:220px;box-shadow:0 12px 30px -12px rgba(0,0,0,.35),0 0 0 1px rgba(0,0,0,.05);display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center;cursor:pointer;font-family:Inter,system-ui}
.et-ag.carta b{font-size:13px;color:#141416;grid-column:1}.et-ag.carta span{font-size:11px;color:#77736b;grid-column:1;line-height:1.3}.et-ag.carta i{grid-column:2;grid-row:1/3;font-style:normal;background:#141416;color:#fff;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:600;white-space:nowrap}
.et-ag.carta.coda i{background:#f3efe7;color:#8a6a1f}.et-ag.carta.scelto{box-shadow:0 0 0 2px var(--teal),0 12px 30px -12px rgba(0,0,0,.35)}
.etichette:not(.vicino) .et-ag.pillola{display:none}
.filtri{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px 0 0}.filtri button{background:#fff;color:#4d4b46;border:1px solid var(--line);padding:6px 12px;font-size:13px;font-weight:500;white-space:nowrap}.filtri button.on{background:var(--nero);color:#fff;border-color:var(--nero)}
.scrivi textarea{min-height:70px;margin-top:6px}.scrivi .riga{margin-top:8px}

.sala-canvas{position:absolute;inset:0;width:100%!important;height:100%!important;display:block;touch-action:none;cursor:grab}.sala-canvas:active{cursor:grabbing}
.etichette{position:absolute;inset:0;pointer-events:none;overflow:hidden}.etichette>div{position:absolute;left:0;top:0;pointer-events:auto;will-change:transform}
.et-ag{display:flex;flex-direction:column;align-items:center;gap:6px;transform-origin:50% 100%}
.et-nome{background:rgba(20,20,22,.92);color:#fff;border-radius:999px;padding:5px 10px 5px 8px;font:600 12px/1 Inter,system-ui;display:flex;gap:6px;align-items:center;white-space:nowrap;box-shadow:0 6px 16px -6px rgba(0,0,0,.45);cursor:pointer}
.et-nome .pt{width:7px;height:7px;border-radius:50%;background:#9a968f}.lavora .et-nome .pt{background:#3ddc84;box-shadow:0 0 0 3px rgba(61,220,132,.25)}.coda .et-nome .pt{background:#ffb020}.errore .et-nome .pt{background:#ff5a5f}
.et-nome .gu{background:#fff;color:#111;border-radius:999px;padding:3px 7px;font-size:11px}.scelto .et-nome{background:var(--teal)}
.et-msg{background:#fff;color:#2a2a2a;border-radius:12px;padding:6px 9px;font:500 11px/1.35 Inter,system-ui;width:max-content;max-width:190px;box-shadow:0 8px 20px -10px rgba(0,0,0,.35)}
.et-uff{font:700 12px/1 Inter,system-ui;letter-spacing:1.6px;text-transform:uppercase;color:#8c8578;background:rgba(255,255,255,.75);backdrop-filter:blur(6px);padding:6px 10px;border-radius:999px;cursor:pointer;white-space:nowrap}
.carico{position:absolute;inset:0;display:grid;place-items:center;color:var(--mut);font-size:14px}

.bb>*{position:absolute}.bb>.omino{left:-32px;top:-84px}.etichetta-stanza{cursor:pointer}.bb>.cervello{left:-35px;top:-70px}.bb>.pianta{left:-13px;top:-40px}.bb>.etichetta-stanza{left:0;top:-18px}

.saluto h1{font-size:30px;margin:0}.saluto p{margin:6px 0 0;color:#5f5c56;font-size:14px;line-height:1.5}.saluto b.n{font-weight:600}
.chiedi{display:flex;gap:8px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 6px 6px 16px;margin:16px 0 4px;box-shadow:0 8px 30px -18px rgba(0,0,0,.25)}
.chiedi input{border:0;padding:8px 0;outline:none!important;background:transparent}.chiedi select{width:auto;max-width:170px;border:0;background:#f4f2ee;border-radius:999px;padding:8px 10px;font-size:13px}
.sala{position:relative;z-index:0;isolation:isolate;height:min(70vh,760px);min-height:440px;margin:14px -22px 0;overflow:hidden;touch-action:none;background:radial-gradient(120% 90% at 50% 40%,#fbfaf7 0%,#efebe3 70%,#e7e2d8 100%);border-top:1px solid var(--line);border-bottom:1px solid var(--line);user-select:none;-webkit-user-select:none}
.camera{position:absolute;left:0;top:0;transform-origin:0 0;transition:transform .9s cubic-bezier(.2,.75,.2,1)}
.pavimento{position:relative;width:1440px;height:1000px;transform:rotateX(57deg) rotateZ(-38deg);transform-style:preserve-3d}
.stanza3d{position:absolute;border-radius:22px;background:#f8f5ef;box-shadow:inset 0 0 0 2px #e4dccd,0 30px 40px -30px rgba(80,60,30,.25);transform-style:preserve-3d;cursor:pointer;transition:background .3s}
.stanza3d:hover{background:#fbf9f4}.stanza3d.sel{background:#fffdf8;box-shadow:inset 0 0 0 3px #c9d5ff}
.stanza3d .tappeto{position:absolute;inset:16px;border-radius:16px;opacity:.55}
.muro{position:absolute;left:0;top:0;height:46px;background:linear-gradient(#efe9df,#e2d9c9);transform-origin:top;transform:rotateX(-90deg);border-radius:6px 6px 0 0}
.muro.sx{width:46px;height:100%;transform-origin:left;transform:rotateY(90deg);background:linear-gradient(90deg,#e6dece,#efe9df)}
.cartello{position:absolute;transform-style:preserve-3d}
.attori{position:absolute;left:0;top:0;width:0;height:0}.bb{position:absolute;width:0;height:0}
.etichetta-stanza{transform-origin:0 0;white-space:nowrap;font:700 15px/1 Inter,system-ui;letter-spacing:1.6px;text-transform:uppercase;color:#a8a194;transform:translate(-50%,0)}
.banco{position:absolute;width:96px;height:46px;border-radius:8px;background:linear-gradient(135deg,var(--legno),var(--legno2));box-shadow:0 10px 0 -4px #cdb68c,0 18px 22px -10px rgba(60,40,10,.35);transform-style:preserve-3d}
.monitor{position:absolute;left:28px;top:4px;width:40px;height:26px;border-radius:4px;background:#1c1c20;transform-origin:bottom;transform:translateZ(1px) rotateX(-80deg);box-shadow:0 0 0 2px #2a2a2e}
.monitor i{position:absolute;inset:3px;border-radius:2px;background:#2a3140}
.lavora .monitor i{background:linear-gradient(120deg,var(--c),#2B59FF);animation:schermo 2.4s ease-in-out infinite}
@keyframes schermo{50%{filter:brightness(1.35)}}
.omino{position:absolute;width:64px;height:84px;cursor:pointer}
.omino svg{width:100%;height:100%;overflow:visible;filter:drop-shadow(0 6px 4px rgba(60,40,10,.25))}
.lavora .omino svg{animation:digita .5s ease-in-out infinite alternate}
@keyframes digita{to{transform:translateY(-2px)}}
.nome{position:absolute;left:50%;bottom:92px;transform:translateX(-50%) scale(var(--inv,1));transform-origin:50% 100%;width:max-content;white-space:nowrap;background:var(--nero);color:#fff;border-radius:999px;padding:5px 10px 5px 8px;font:600 12px/1 Inter,system-ui;display:flex;gap:6px;align-items:center;box-shadow:0 6px 16px -6px rgba(0,0,0,.5);cursor:pointer}
.nome .pt{width:7px;height:7px;border-radius:50%;background:#8b8780}.lavora .nome .pt{background:#3ddc84;box-shadow:0 0 0 3px rgba(61,220,132,.25)}.coda .nome .pt{background:#ffb020}.errore .nome .pt{background:#ff5a5f}
.nome .gu{background:#fff;color:#111;border-radius:999px;padding:3px 7px;font-size:11px}
.nome small{color:#bdb8ae;font-weight:500;max-width:150px;overflow:hidden;text-overflow:ellipsis}
.fumetto{position:absolute;left:50%;bottom:calc(92px + 32px * var(--inv,1));transform:translateX(-50%) scale(var(--inv,1));transform-origin:50% 100%;background:#fff;color:#222;border-radius:12px;padding:6px 9px;font:500 11px/1.3 Inter,system-ui;width:170px;box-shadow:0 8px 20px -8px rgba(0,0,0,.3);text-align:left;display:none}
.lavora .fumetto,.scelto .fumetto{display:block}.sala:not(.vicino) .bb:not(.scelto) .fumetto{display:none}.scelto .omino svg{filter:drop-shadow(0 0 0 #fff) drop-shadow(0 0 10px var(--c))}.scelto .nome{background:var(--teal)}
.cervello{position:absolute;width:70px;height:70px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#dfe6ff,#7f9bff 55%,#2B59FF);box-shadow:0 0 0 8px rgba(43,89,255,.12),0 0 40px rgba(43,89,255,.5);animation:pulsa 3s ease-in-out infinite;cursor:pointer}
@keyframes pulsa{50%{box-shadow:0 0 0 16px rgba(43,89,255,.06),0 0 60px rgba(43,89,255,.6)}}
.pianta{position:absolute;width:26px;height:40px}
.comandi{position:absolute;left:14px;top:14px;display:flex;gap:6px;z-index:5}
.comandi button{padding:7px 12px;font-size:13px}
.legenda{position:absolute;right:14px;bottom:12px;background:rgba(255,255,255,.85);backdrop-filter:blur(8px);border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:12px;color:#5f5c56;z-index:5}
.lato{position:fixed;right:16px;top:76px;bottom:16px;width:min(380px,calc(100vw - 32px));background:#fff;border:1px solid var(--line);border-radius:22px;box-shadow:0 30px 80px -30px rgba(0,0,0,.35);z-index:35;overflow:auto;padding:20px;transform:translateX(120%);transition:transform .45s cubic-bezier(.2,.75,.2,1)}
.lato.aperto{transform:none}
.lato .x{position:absolute;right:14px;top:14px;border-radius:50%;width:34px;height:34px;padding:0}
.lato .faccia{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;font-size:30px;background:color-mix(in srgb,var(--c) 18%,#fff);border:3px solid var(--c)}
.lato .ora{background:#f6f4f0;border-radius:14px;padding:12px;margin:14px 0;font-size:14px;line-height:1.45}
.lato .ora b{display:block;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--mut);margin-bottom:4px}
.chip{display:inline-block;font-size:12px;background:#f0ede7;border-radius:999px;padding:4px 10px;margin:3px 4px 0 0;color:#4d4b46}
.lavori{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;margin-top:8px}
.lavoro-card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:12px;display:flex;gap:12px;align-items:center;text-decoration:none;color:inherit}
.lavoro-card .min{width:52px;height:70px;border-radius:10px;background:#1c1c20 center/cover;flex:none;display:grid;place-items:center;font-size:22px}
.lavoro-card small{display:block;color:var(--mut);font-size:11px;letter-spacing:1px;text-transform:uppercase}
.lavoro-card b{display:block;font-size:14px;margin:2px 0 6px;line-height:1.25}
@media(max-width:700px){main{padding:14px}.sala{margin:12px -14px 0;height:62vh}.saluto h1{font-size:24px}.lato{top:auto;bottom:0;right:0;left:0;width:auto;max-height:70vh;border-radius:22px 22px 0 0;transform:translateY(110%)}.chiedi select{display:none}}
@media(max-width:600px){.posti{grid-template-columns:1fr 1fr}.kv{grid-template-columns:1fr}.kv b{margin-top:6px}}
</style></head><body>
<div class="barra"><button class="vm ham" id="ham" aria-label="Menu" hidden><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button><a class="logo" href="#/" aria-label="momento, agenzia AI"><b>momento</b><small>agenzia AI</small></a><span class="tit" id="sez"></span></div><header id="testa"><a class="logo" href="#/" aria-label="momento, agenzia AI"><b>momento</b><small>agenzia AI</small></a><nav id="nav"></nav></header><div class="velo-menu" id="velo_menu"></div>
<main id="app"><div class="vuoto">Carico…</div></main>
<script>
const $ = (s) => document.querySelector(s);
const e = (s) => String(s ?? '—').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n = (x) => (Number(x) || 0).toLocaleString('it-IT');
const FASI = [['piano','Piano'],['ricerca','Ricerca'],['riferimenti','Studio reel'],['clip','Clip'],['scheda','Scheda'],['regia','Regia'],['montaggio','Montaggio'],['fatto','Pronto']];
let timer = null;

const AGENTI = {
  idee: { n: 'Nora', r: 'Idee e copioni', i: '💡', c: '#f0b44c', s: 'direzione', d: 'Riceve i tuoi argomenti e il numero di reel del contratto, costruisce strategia, calendario e giornate di ripresa, e scrive per ogni reel il copione da girare: scene, inquadrature, camera, durata, testi e caption.' },
  direttore: { n: 'Leo', r: 'Direttore creativo', i: '🎬', c: '#12a3a4', s: 'direzione', d: 'Legge il tuo prompt, capisce settore, obiettivo e pubblico, decide cosa cercare. Alla fine incrocia riferimenti e clip e scrive la scheda tecnica per tutta la squadra.' },
  stella: { n: 'Stella', r: 'Ricercatrice di stile', i: '🎨', c: '#ff8fab', s: 'scouting', d: 'Capisce lo stile che chiedi (street, emozionale, romantico, natalizio…), manda gli scout a cercare reel montati così anche fuori settore e passa a Iris e Rocco la ricetta da applicare alle tue clip: ritmo, transizioni, color, camera, testi, musica.' },
  scout_yt: { n: 'Yuri', r: 'Scout YouTube Shorts', i: '▶️', c: '#e5483f', s: 'scouting', d: 'Cerca gli Shorts del settore pubblicati negli ultimi 18 mesi e li ordina per visualizzazioni e coinvolgimento (like, commenti).' },
  scout_tt: { n: 'Tea', r: 'Scout TikTok', i: '🎵', c: '#25d6ee', s: 'scouting', d: 'Cerca su TikTok per parole chiave e hashtag del settore (via Apify) e recupera il video per Max e Iris.' },
  scout_ig: { n: 'Ines', r: 'Scout Instagram', i: '📸', c: '#d6409f', s: 'scouting', d: 'Cerca i reel più visti sugli hashtag del settore (via Apify) e recupera il video per Max e Iris.' },
  occhi: { n: 'Iris', r: 'Occhi · studia i reel', i: '👁️', c: '#8b7cf6', s: 'visione', d: 'Claude: guarda i fotogrammi chiave dei reel scelti (gancio + uno per inquadratura) insieme alle misure esatte di Max e li smonta: gancio, ritmo, testi, colore, effetti, musica, chiusura, perché funzionano.' },
  analista: { n: 'Ada', r: 'Analista delle tue clip', i: '🔎', c: '#f0b44c', s: 'visione', d: 'Claude: guarda i fotogrammi delle tue clip e le misure di Max e segna i momenti utili con i tempi, la qualità, i problemi (mosso, fuori fuoco, esposizione) e il parlato.' },
  motore: { n: 'Max', r: 'Motore GitHub · scarica e misura', i: '⚙️', c: '#9aa7ab', s: 'visione', d: 'Gira su GitHub Actions: scarica reel e clip, misura con ffmpeg i tagli esatti, la durata delle inquadrature, nitidezza, esposizione e movimento, stima i BPM, trascrive il parlato con Whisper ed estrae i fotogrammi chiave per Iris e Ada.' },
  regista: { n: 'Rocco', r: 'Regista · piano di montaggio', i: '🎥', c: '#e07a5f', s: 'post', d: 'Claude: dalla scheda tecnica e dalle analisi delle clip sceglie i pezzi migliori (tempi esatti), l\u2019ordine, i rallenty, gli effetti e le transizioni: scrive il piano che il montatore esegue alla lettera.' },
  copy: { n: 'Carla', r: 'Copy · testi e caption', i: '✍️', c: '#f2cc8f', s: 'post', d: 'Claude: scrive il gancio, i testi a schermo, la chiusura con la CTA e la caption del post.' },
  editor: { n: 'Edo', r: 'Editor · tagli e reframe', i: '✂️', c: '#81b29a', s: 'post', d: 'Motore: reframe 9:16 che segue il soggetto (volti, movimento), stabilizzazione delle clip mosse, rallenty veri, durate esatte.' },
  vfx: { n: 'Vale', r: 'VFX · effetti e transizioni', i: '✨', c: '#c77dff', s: 'post', d: 'Motore: punch-in, zoom, shake, transizioni (flash, whip, zoom, glitch, dissolvenza), light leak, grana, bande cinema.' },
  color: { n: 'Cleo', r: 'Colorist · look', i: '🎨', c: '#ff9f1c', s: 'post', d: 'Motore: uniforma bianco ed esposizione di ogni clip (misurati) e applica il look della scheda con una LUT 3D.' },
  audio: { n: 'Aldo', r: 'Audio · mix e sound design', i: '🎧', c: '#4cc9f0', s: 'post', d: 'Motore: suono originale delle clip, sound design generato (whoosh, impatti, riser), volume finale a −14 LUFS.' },
  sottotitoli: { n: 'Sara', r: 'Testi animati e sottotitoli', i: '💬', c: '#ffd166', s: 'post', d: 'Motore: testi animati con font Google, sottotitoli parola per parola o karaoke dal parlato (Whisper).' },
  revisore: { n: 'Remo', r: 'Revisore · controllo qualità', i: '✅', c: '#4fd18b', s: 'post', d: 'Motore: controlla fotogrammi neri, durata, volume e peso del file prima della consegna.' },
  regia: { n: 'Regia', r: 'sistema', i: '🛰️', c: '#5d7378' },
};
const VECCHI = { 'Direttore creativo': 'direttore', 'Occhi (Gemini)': 'occhi', 'Analista': 'analista', 'Regia': 'regia', 'Ricerca': 'scout_yt' };
const AGID = (a) => AGENTI[a] ? a : VECCHI[a] || 'regia';
const STANZE = [['direzione', 'Direzione creativa'], ['scouting', 'Scouting · ricerca di settore'], ['visione', 'Sala visione'], ['post', 'Post-produzione']];
const FASE_AGENTI = { piano: ['direttore', 'stella'], ricerca: ['scout_yt', 'scout_tt', 'scout_ig'], riferimenti: ['motore', 'occhi'], clip: ['motore', 'analista'], scheda: ['direttore'], regia: ['regista', 'copy'], montaggio: ['motore', 'editor', 'color', 'vfx', 'sottotitoli', 'audio', 'revisore'] };
const fa = (q) => { const s = (Date.now() - new Date(q)) / 1000; return s < 60 ? 'ora' : s < 3600 ? Math.round(s / 60) + ' min fa' : s < 86400 ? Math.round(s / 3600) + ' h fa' : new Date(q).toLocaleDateString('it-IT'); };

async function regia() {
  const R = await chiama('/api/regia');
  const ultimo = Object.fromEntries(R.ultimi.map((u) => [AGID(u.agente), u]));
  const conti = {}; R.conti.forEach((c) => { conti[AGID(c.agente)] = (conti[AGID(c.agente)] || 0) + c.n; });
  const stati = {};
  for (const L of R.attivi) for (const a of FASE_AGENTI[L.fase] || []) {
    const preso = L.blocco_fino && L.blocco_fino > R.adesso;
    if (stati[a]?.s !== 'lavora') stati[a] = { s: preso ? 'lavora' : 'coda', L };
  }
  for (const [a, u] of Object.entries(ultimo)) if (!stati[a] && u.livello === 'errore' && Date.now() - new Date(u.quando) < 30 * 60e3) stati[a] = { s: 'errore' };
  if ((R.piani || []).length) stati.idee = { s: R.piani.some((x) => x.blocco_fino && x.blocco_fino > R.adesso) ? 'lavora' : 'coda' };
  for (const a of R.riposo || []) stati[a] = { s: 'riposo' };
  if (R.yt_web) AGENTI.scout_yt.r = 'Scout YouTube Shorts · cerca sul web';
  const testoStato = { lavora: 'al lavoro', coda: 'parte a breve', errore: 'bloccato', riposo: 'a riposo' };
  const scr = (id) => {
    const A = AGENTI[id], st = stati[id] || {}, u = ultimo[id];
    const msg = st.s === 'riposo' ? 'spento: per TikTok e Instagram servirebbe Apify' : st.s === 'coda' ? 'tocca a me: parto entro un minuto…' : u ? u.messaggio : 'pronto, aspetto un lavoro';
    return '<div class="scrivania ' + (st.s || '') + '" style="--c:' + (A.c || '#345') + '" data-ag="' + id + '"><div class="av">' + A.i + '</div><div class="chi"><b>' + e(A.n) + '</b><span class="stato-ag">' + (testoStato[st.s] || 'libero') + '</span><div class="ruolo">' + e(A.r) + (conti[id] ? ' · ' + conti[id] + ' azioni in 7 gg' : '') + '</div>' +
      ('<div class="schermo">' + e(msg) + '</div>' + (u && !st.s ? '<div class="mut" style="font-size:11px;margin-top:3px">' + fa(u.quando) + (u.lavoro_id ? ' · lavoro #' + u.lavoro_id : '') + '</div>' : '')) + '</div></div>';
  };
  const attivi = R.attivi.map((L) => { const i = FASI.findIndex((f) => f[0] === L.fase);
    return '<a class="card attivo" href="#/lavoro/' + L.id + '"><div class="riga"><b style="flex:1">#' + L.id + ' · ' + e(L.settore || L.prompt.slice(0, 60)) + '</b><span class="pill in_corso">' + FASI[i][1] + '…</span></div><div class="fasi">' + FASI.map((f, k) => '<div class="' + (k < i ? 'ok' : k === i ? 'ora' : '') + '"></div>').join('') + '</div></a>'; }).join('');
  const manca = Object.entries(R.chiavi || {}).filter(([, v]) => !v).map(([k]) => k);
  const avviso = manca.length ? '<a class="card attivo" href="#/impostazioni" style="border-color:var(--warn)"><b style="color:var(--warn)">⚠︎ Mancano le chiavi: ' + manca.join(', ') + '</b><div class="mut">' + (manca.includes('Claude') ? 'Senza Claude la squadra non può partire.' : 'Senza queste la ricerca salta alcune piattaforme.') + ' Tocca qui per inserirle.</div></a>' : '';
  $('#app').innerHTML = '<div class="riga"><h1 style="flex:1">Comparto Reel</h1><a class="btn sec" href="#/lavori">Lavori</a><a class="btn" href="#/nuovo">+ Nuovo reel</a></div>' + avviso +
    (attivi || '<p class="mut">Nessun lavoro in corso: la squadra è libera. Avvia un reel con “+ Nuovo reel”.</p>') +
    '<div class="studio">' + STANZE.map(([s, nome]) => '<div class="stanza' + (s === 'post' ? ' spenta' : '') + '"><h3>' + nome + '</h3><div class="' + (s === 'post' ? 'posti' : '') + '">' + Object.keys(AGENTI).filter((a) => AGENTI[a].s === s).map(scr).join('') + '</div></div>').join('') + '</div>' +
    '<h2>In diretta</h2><div class="log">' + (R.feed.map((r) => { const A = AGENTI[AGID(r.agente)]; return '<div class="' + r.livello + '"><span class="mut">' + new Date(r.quando).toLocaleTimeString('it-IT') + '</span> ' + A.i + ' <b>' + e(A.n) + '</b> ' + e(r.messaggio) + (r.lavoro_id ? ' <a href="#/lavoro/' + r.lavoro_id + '" class="mut">#' + r.lavoro_id + '</a>' : '') + '</div>'; }).join('') || '<div class="mut">ancora niente</div>') + '</div>';
  document.querySelectorAll('[data-ag]').forEach((d) => d.onclick = () => agente(d.dataset.ag, stati[d.dataset.ag]));
  timer = setTimeout(rotta, R.attivi.length ? 3000 : 10000);
}

async function agente(id, st) {
  const A = AGENTI[id];
  const righe = await chiama('/api/regia/agente/' + id);
  const chiudi = () => { document.querySelector('.velo')?.remove(); document.querySelector('.pannello')?.remove(); };
  chiudi();
  document.body.insertAdjacentHTML('beforeend', '<div class="velo"></div><div class="pannello"><div class="riga"><div class="av" style="--c:' + (A.c || '#345') + '">' + A.i + '</div><div style="flex:1"><h1 style="margin:0">' + e(A.n) + '</h1><div class="mut">' + e(A.r) + '</div></div><button class="sec" id="xx">Chiudi</button></div>' +
    '<p>' + e(A.d || 'Questo agente entra in squadra con la fase 2 (montaggio): leggerà la scheda tecnica del Direttore creativo.') + '</p>' +
    (st?.L ? '<p><b>Adesso:</b> lavoro <a href="#/lavoro/' + st.L.id + '">#' + st.L.id + '</a> · ' + e(st.L.settore || st.L.prompt.slice(0, 80)) + '</p>' : '') +
    (righe.length ? '<h2>Cosa ha fatto</h2><div class="log">' + righe.map((r) => '<div class="' + r.livello + '"><span class="mut">' + new Date(r.quando).toLocaleString('it-IT') + '</span> ' + e(r.messaggio) + (r.lavoro_id ? ' <a class="mut" href="#/lavoro/' + r.lavoro_id + '">#' + r.lavoro_id + '</a>' : '') + '</div>').join('') + '</div>' : '') + '</div>');
  document.querySelector('.velo').onclick = chiudi; $('#xx').onclick = chiudi;
  addEventListener('hashchange', chiudi, { once: true });
}

async function chiama(path, opts = {}) {
  const r = await fetch(path, { ...opts, headers: { 'content-type': 'application/json' }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== '/api/accedi') { accesso(); throw new Error('accesso'); }
  if (!r.ok) throw new Error(d.errore || 'errore ' + r.status);
  return d;
}

const ICO = {
  agenzia: '<path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/>',
  riunioni: '<circle cx="12" cy="8" r="3"/><path d="M5 20c.8-3.5 3.6-5.5 7-5.5s6.2 2 7 5.5M4.5 10.5a2.3 2.3 0 1 0 0-.1M19.5 10.5a2.3 2.3 0 1 0 0-.1"/>',
  profilo: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6"/>',
  approvazioni: '<path d="M20 6 9 17l-5-5"/>',
  clienti: '<path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 20v-1.5a4 4 0 0 0-3-3.9M15.5 3.6a3.5 3.5 0 0 1 0 6.8"/>',
  post: '<rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 21h12a2 2 0 0 0 2-2V7M3 13l4-4 4 4 3-3 3 3"/>',
  costi: '<path d="M12 2v20M17 6.5c0-1.9-2.2-3-5-3s-5 1.3-5 3.3c0 4.7 10 2.4 10 7.2 0 2-2.2 3.5-5 3.5s-5-1.2-5-3.2"/>',
  reel: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 9 5 3-5 3z"/>',
  copioni: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4"/>',
  gestionale: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  impostazioni: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
};
const VOCI = [['agenzia', 'Agenzia', '#/'], ['riunioni', 'Riunioni', '#/riunioni'], ['approvazioni', 'Approvazioni', '#/approvazioni'], ['profilo', 'Profilo IG', '#/profilo'], ['clienti', 'Clienti', '#/clienti']];
const STRUMENTI = [['reel', 'Reel', '#/reel'], ['post', 'Post e caroselli', '#/post'], ['copioni', 'Copioni', '#/copioni'], ['gestionale', 'Gestionale', '#/gestionale'], ['costi', 'Costi', '#/costi']];
const voce = (v) => '<a class="vm" href="' + v[2] + '" data-k="' + v[0] + '"><svg viewBox="0 0 24 24">' + ICO[v[0]] + '</svg><span class="tx">' + v[1] + '</span>' + (v[0] === 'costi' ? '<span class="num" id="num_costi"></span>' : '') + '</a>';
function menu(on) {
  document.body.classList.toggle('dentro', !!on);
  $('#ham').hidden = !on;
  $('#nav').innerHTML = on ? '<div class="gruppo">Agenzia</div>' + VOCI.map(voce).join('') + '<div class="gruppo">Strumenti</div>' + STRUMENTI.map(voce).join('') +
    '<div class="piede">' + voce(['impostazioni', 'Impostazioni', '#/impostazioni']) + '</div>' : '';
  if (!on) { $('#sez').textContent = ''; return; }
  $('#ham').onclick = (ev) => { ev.stopPropagation(); $('#testa').classList.toggle('aperto'); };
  $('#velo_menu').onclick = () => $('#testa').classList.remove('aperto');
  evidenzia();
  aggiornaNumCosti();
}
async function aggiornaNumCosti() {
  try { const c = await chiama('/api/consumi?giorni=30'); const n = $('#num_costi'); if (n) n.textContent = soldi(c.questo_mese, c.cambio); } catch (_) {}
}
const soldi = (usd, cambio) => '€ ' + (usd * (cambio || 0.86)).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function evidenzia() {
  const h = location.hash || '#/';
  const k = h === '#/' || h.startsWith('#/agente') || h.startsWith('#/ufficio') || h.startsWith('#/incarico') || h === '#/chat/capo' ? 'agenzia' : h.startsWith('#/riunion') ? 'riunioni' : h.startsWith('#/profilo') ? 'profilo' : h.startsWith('#/approvazion') ? 'approvazioni' : h.startsWith('#/client') ? 'clienti' :
    h.startsWith('#/reel') || h.startsWith('#/lavoro') ? 'reel' : h.startsWith('#/post') ? 'post' : h.startsWith('#/copion') || h.startsWith('#/piano') ? 'copioni' : h.startsWith('#/chat/gestionale') || h.startsWith('#/chat/contabile') || h === '#/gestionale' ? 'gestionale' : h.startsWith('#/costi') ? 'costi' : h.startsWith('#/impostazioni') ? 'impostazioni' : '';
  document.querySelectorAll('#nav .vm[data-k]').forEach((a) => a.classList.toggle('att', a.dataset.k === k));
  const tutte = VOCI.concat(STRUMENTI, [['impostazioni', 'Impostazioni']]).find((v) => v[0] === k);
  $('#sez').textContent = tutte ? tutte[1] : '';
  $('#testa').classList.remove('aperto');
}
addEventListener('hashchange', () => { if ($('#nav').innerHTML) evidenzia(); });

async function accesso() {
  menu(false);
  const s = await fetch('/api/stato').then((r) => r.json());
  $('#app').innerHTML = '<div class="card" style="max-width:420px;margin:40px auto"><h1>' + (s.configurato ? 'Accedi' : 'Scegli la password') + '</h1>' +
    '<p class="mut">' + (s.configurato ? 'Password della regia.' : 'Primo accesso: la password che scrivi diventa quella della regia (minimo 6 caratteri).') + '</p>' +
    '<input id="pw" type="password" autocomplete="current-password"><div style="margin-top:14px"><button id="go">Entra</button></div><div id="er" class="err"></div></div>';
  const vai = async () => { try { await chiama('/api/accedi', { method: 'POST', body: { password: $('#pw').value } }); location.hash = '#/'; rotta(); } catch (x) { $('#er').textContent = x.message; } };
  $('#go').onclick = vai; $('#pw').onkeydown = (ev) => ev.key === 'Enter' && vai(); $('#pw').focus();
}

async function lista() {
  const L = await chiama('/api/lavori');
  $('#app').innerHTML = '<div class="riga"><h1 style="flex:1">Lavori</h1><a class="btn" href="#/nuovo">+ Nuovo reel</a></div>' +
    (L.length ? L.map((l) => '<a class="card lav" href="#/lavoro/' + l.id + '"><div class="riga"><b style="flex:1">' + e(l.titolo || l.prompt.slice(0, 90)) + '</b><span class="pill ' + l.stato + '">' + e(stato(l)) + '</span></div><div class="mut" style="margin-top:6px">#' + l.id + ' · ' + new Date(l.creato).toLocaleString('it-IT') + (l.titolo ? ' · ' + e(l.prompt.slice(0, 70)) : '') + '</div></a>').join('')
      : '<div class="vuoto">Nessun lavoro. Scrivi il primo prompt con “+ Nuovo reel”.</div>');
  if (L.some((l) => l.stato === 'in_corso')) timer = setTimeout(rotta, 8000);
}
const stato = (l) => l.stato === 'pronto' ? 'pronto' : l.stato === 'errore' ? 'errore' : (FASI.find((f) => f[0] === l.fase) || [0, l.fase])[1] + '…';

const STILI_UI = ${JSON.stringify(ELENCO_STILI)};
const LUT_UI = ${JSON.stringify(Object.fromEntries(Object.entries(LUT).map(([k, v]) => [k, v[1].split(':')[0]])))};
const GENERI_UI = STILI_UI.generi, MOOD_UI = STILI_UI.mood;
function nuovo() {
  $('#app').innerHTML = '<h1>Nuovo reel</h1><p class="mut">Il Direttore creativo cerca i video che funzionano nel settore su YouTube, TikTok e Instagram, il motore li misura, Iris li studia, l\\'Analista studia le tue clip e alla fine ricevi la scheda tecnica.</p>' +
    '<label>Cosa deve essere il reel</label><textarea id="pr" placeholder="Es. Reel per la pizzeria Da Gino a Salerno, 30 secondi, clip in cucina e in sala. Deve far venire fame e portare prenotazioni. Target 25-40 anni, tono giovane ma non volgare."></textarea>' +
    '<div class="aiuto">Cliente, settore, obiettivo, durata, tono, a chi parla. Più sei preciso, migliore è la ricerca.</div>' +
    '<label>Fonte del girato</label><select id="fo"><option value="pcloud">Le mie clip (cartella pCloud)</option><option disabled>Video stock — in arrivo</option><option disabled>Generati con AI — in arrivo</option></select>' +
    '<label>Cartella delle clip su pCloud (facoltativo)</label><input id="pc" placeholder="https://e.pcloud.link/publink/show?code=…">' +
    '<div class="aiuto">Su pCloud: tasto destro sulla cartella → Condividi → Link di condivisione → copia. Senza clip ottieni scheda e lista delle riprese, e il girato lo aggiungi dopo.</div>' +
    '<label>Reel MODELLO: lo stile che vuoi (facoltativo, ma fa la differenza)</label><textarea id="lr" style="min-height:70px" placeholder="Un link per riga: Instagram, TikTok, Pinterest, YouTube, Vimeo… La squadra copia il suo linguaggio (look, ritmo, testi sì/no, finale), non i contenuti."></textarea>' +
    '<label>Stile di montaggio</label><div class="riga" style="gap:10px"><select id="sg" style="flex:1"><option value="">Genere: lo capisce Stella</option>' + Object.entries(GENERI_UI).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') + '</select><select id="sm" style="flex:1"><option value="">Mood: lo capisce Stella</option>' + Object.entries(MOOD_UI).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') + '</select></div>' +
    '<div class="aiuto">Puoi anche solo scriverlo nella richiesta (es. “street emozionale”, “romantico”, “natalizio”): Stella cerca reel montati così e la squadra applica quello stile alle tue clip.</div>' +
    '<div style="margin-top:18px"><button id="go">Avvia la squadra</button></div><div id="er" class="err"></div>';
  if (PREFILL) { $('#pr').value = PREFILL; PREFILL = ''; }
  $('#go').onclick = async () => {
    $('#go').disabled = true;
    try { const r = await chiama('/api/lavori', { method: 'POST', body: { prompt: $('#pr').value, pcloud: $('#pc').value, link_rif: $('#lr').value, stile: ($('#sg').value || '') + '+' + ($('#sm').value || '') } }); location.hash = '#/lavoro/' + r.id; }
    catch (x) { $('#er').textContent = x.message; $('#go').disabled = false; }
  };
}

function lst(a) { return a && a.length ? '<ul>' + a.map((x) => '<li>' + e(typeof x === 'object' ? Object.values(x).join(' · ') : x) + '</li>').join('') + '</ul>' : '<p class="mut">—</p>'; }

function vistaScheda(s) {
  if (!s) return '';
  const st = (s.struttura || []).map((x) => '<tr><td style="white-space:nowrap">' + e(x.da) + '–' + e(x.a) + ' s</td><td><b>' + e(x.fase) + '</b><div class="mut">' + e(x.obiettivo) + '</div></td><td>' + e(x.contenuto) + '</td></tr>').join('');
  const a = s.audio || {}, t = s.testi || {};
  return '<h2>Concept</h2><div class="card"><h1>' + e(s.titolo_lavoro) + '</h1><p>' + e(s.concept) + '</p><div class="kv">' +
    '<b>Durata</b><span>' + e(s.durata_target_sec) + ' s · ' + e(s.formato) + '</span>' +
    '<b>Gancio</b><span>' + e((s.gancio || {}).idea) + (s.gancio?.testo_proposto ? ' — “' + e(s.gancio.testo_proposto) + '”' : '') + '</span>' +
    '<b>Ritmo</b><span>inquadratura media ' + e(s.ritmo?.durata_media_inquadratura_sec) + ' s · ' + (s.ritmo?.tagli_sul_beat ? 'tagli sul beat' : 'tagli liberi') + ' · ' + e(s.ritmo?.variazioni) + '</span>' +
    '<b>Colore</b><span>' + e(s.colore?.look) + ' — ' + e(s.colore?.note) + '</span>' +
    '<b>Testi</b><span>' + e(t.stile) + ' · ' + e(t.posizione) + ' · ' + e(t.font_suggerito) + ' · ' + e(t.colori) + ' · ' + e(t.animazione) + '</span>' +
    '<b>Sottotitoli</b><span>' + (s.sottotitoli?.usare ? e(s.sottotitoli.stile) : 'no') + '</span>' +
    '<b>Effetti</b><span>' + e((s.effetti || []).map((x) => x.nome + ' (' + x.dove + ')').join(' · ')) + '</span>' +
    '<b>Transizioni</b><span>' + e((s.transizioni || []).join(', ')) + '</span>' +
    '<b>Audio</b><span>' + e(a.mood) + ' · ' + e(a.bpm) + ' BPM · ' + e(a.musica_suggerita) + '<br>voce: ' + e(a.voce) + (a.note_voce ? ' — ' + e(a.note_voce) : '') + '<br>effetti sonori: ' + e((a.effetti_sonori || []).join(', ')) + '</span>' +
    '<b>Chiusura</b><span>' + e(s.chiusura?.tipo) + ' — ' + e(s.chiusura?.cta) + '</span>' +
    (s.obiettivo_reel ? '<b>Obiettivo</b><span>' + e(s.obiettivo_reel) + (s.leva_invio ? ' · chi lo manda a chi: ' + e(s.leva_invio) : '') + '</span>' : '') +
    (s.loop ? '<b>Loop</b><span>' + e(s.loop) + '</span>' : '') +
    (s.parola_chiave ? '<b>Parola chiave</b><span>' + e(s.parola_chiave) + '</span>' : '') +
    (s.copertina ? '<b>Copertina</b><span>' + e(s.copertina.momento) + ' — “' + e(s.copertina.testo) + '”</span>' : '') + '</div></div>' +
    '<h2>Cosa funziona nel settore</h2><div class="card">' + lst(s.cosa_funziona_nel_settore) + '</div>' +
    '<h2>Struttura</h2><div class="card"><table>' + st + '</table></div>' +
    '<h2>Clip da usare</h2><div class="card">' + lst((s.clip_da_usare || []).map((c) => c.file + ' · ' + c.momento + ' → ' + c.per)) + '</div>' +
    '<h2>Clip mancanti</h2><div class="card">' + lst(s.clip_mancanti) + '</div>' +
    '<h2>Rischi</h2><div class="card">' + lst(s.rischi) + '</div>' +
    '<h2>Caption</h2><div class="card"><p style="white-space:pre-wrap">' + e(s.caption) + '</p><p class="mut">' + e((s.hashtag || []).map((h) => '#' + String(h).replace(/^#/, '')).join(' ')) + '</p></div>';
}

const LOOKS_UI = [['', 'come prima'], ['neon_notte', 'Neon notte'], ['estate_luminosa', 'Estate luminosa'], ['autunno_caldo', 'Autunno caldo'], ['inverno_freddo', 'Inverno freddo'], ['street_urbano', 'Street urbano'], ['emozionale_film', 'Emozionale film'], ['romantico_soft', 'Romantico soft'], ['amichevole_solare', 'Amichevole solare'], ['natalizio_caldo', 'Natalizio caldo'], ['caldo_cinematico', 'Caldo cinematico'], ['pulito_commerciale', 'Pulito commerciale'], ['teal_orange', 'Teal & orange'], ['moody_scuro', 'Moody scuro'], ['naturale_vivace', 'Naturale vivace'], ['bn_contrasto', 'Bianco e nero'], ['pastello_soft', 'Pastello'], ['vintage_film', 'Vintage film']];

function boxGirato(L) {
  return '<div class="card"><b>Aggiungi il girato</b><p class="mut">Link pubblico della cartella pCloud con le clip: Max le scarica e le misura, poi scheda, piano e montaggio.</p>' +
    '<input id="gir" placeholder="https://e.pcloud.link/publink/show?code=…"><div style="margin-top:10px"><button id="gir_ok">Collega e monta</button></div><div id="gir_er" class="err"></div></div>';
}

function vistaReel(L) {
  const m = L.montaggio;
  if (!m) return L.stato === 'pronto' && !L.pcloud ? '<h2>Girato</h2>' + boxGirato(L) : '';
  if (m.stato === 'senza_girato') {
    const lr = m.lista_riprese || {};
    return '<h2>Lista delle riprese</h2><div class="card"><p class="mut">Non c’è ancora girato: ecco cosa serve, nell’ordine del montaggio.</p><table><tr><th>#</th><th>Fase</th><th>Inquadratura</th><th>Note</th></tr>' +
      (lr.riprese || []).map((r) => '<tr><td>' + e(r.n) + '</td><td>' + e(r.fase) + '</td><td><b>' + e(r.inquadratura) + '</b> · ' + e(r.cosa) + '<div class="mut">' + e(r.movimento) + ' · ' + e(r.durata_utile_sec) + ' s · ' + e(r.fps_consigliati) + ' fps</div></td><td class="mut">' + e(r.note) + '</td></tr>').join('') + '</table>' +
      ((lr.consigli_ripresa || []).length ? '<p><b>Consigli</b></p>' + lst(lr.consigli_ripresa) : '') + '</div>' + boxGirato(L);
  }
  if (m.stato !== 'fatto') return '<h2>Reel</h2><div class="card">' + (m.stato === 'errore' ? '<span class="err">Montaggio non riuscito: ' + e(m.errore) + '</span>' : '🎬 In montaggio sul motore GitHub…') + '</div>';
  const r = m.revisore || {}, p = m.piano || {};
  const t0 = Date.now();
  return '<h2>Il reel' + (m.versione > 1 ? ' · versione ' + m.versione : '') + '</h2><div class="card" style="text-align:center"><div class="riga" style="justify-content:center;align-items:flex-start;gap:14px">' +
    '<video src="/api/lavori/' + L.id + '/reel.mp4?v=' + e(m.versione || 1) + '" controls playsinline preload="metadata" style="width:100%;max-width:330px;border-radius:12px;background:#000"></video>' +
    (m.copertina ? '<div><img src="/api/lavori/' + L.id + '/copertina.jpg?v=' + e(m.versione || 1) + '" style="width:150px;border-radius:10px;display:block"><div class="mut">copertina</div></div>' : '') + '</div>' +
    '<div class="riga" style="justify-content:center;margin-top:10px"><a class="btn" href="/api/lavori/' + L.id + '/reel.mp4?scarica=1">Scarica MP4</a>' + (m.copertina ? '<a class="btn sec" href="/api/lavori/' + L.id + '/copertina.jpg?scarica=1">Scarica copertina</a>' : '') + '</div>' +
    '<p class="mut">' + e(r.durata) + ' s · ' + e(r.lufs) + ' LUFS · ' + e(r.mb) + ' MB · montato in ' + e(r.secondi_di_lavoro) + ' s</p>' +
    ((r.problemi || []).length ? '<p class="err">⚠︎ ' + e(r.problemi.join(' · ')) + '</p>' : '<p style="color:var(--ok)">✓ Revisore: tutto ok</p>') + '</div>' +
    '<div class="card"><div class="kv">' +
    '<b>Formato</b><span>' + e({ talking_head: 'Talking-head', carosello: 'Carosello → reel' }[p.formato] || 'Montaggio') + '</span>' +
    (p.parola_chiave ? '<b>Parola chiave</b><span>' + e(p.parola_chiave) + '</span>' : '') +
    (p.loop ? '<b>Loop</b><span>' + e(p.loop) + '</span>' : '') +
    (p.musica_da_mettere ? '<b>Musica (in app)</b><span>' + e(p.musica_da_mettere) + '</span>' : '') + '</div>' +
    (p.caption ? '<p style="white-space:pre-wrap"><b>Caption</b><br>' + e(p.caption) + '</p>' : '') +
    ((p.hashtag || []).length ? '<p class="mut">' + e(p.hashtag.map((h) => '#' + String(h).replace(/^#/, '')).join(' ')) + '</p>' : '') +
    ((p.ganci_alternativi || []).length ? '<p><b>Ganci alternativi da provare</b></p>' + lst(p.ganci_alternativi.map((g) => g.testo + ' (' + g.meccanismo + ')')) : '') + '</div>' +
    '<div class="card"><b>Rimonta</b><p class="mut">Rifà solo piano e montaggio (niente nuova ricerca né analisi).</p>' +
    '<label>Cosa cambiare</label><textarea id="rim_t" style="min-height:70px" placeholder="Es. più veloce, gancio con la tazza, meno testi, chiusura con il logo"></textarea>' +
    '<div class="riga"><div style="flex:1"><label>Look</label><select id="rim_l">' + LOOKS_UI.map(([v, n]) => '<option value="' + v + '">' + n + '</option>').join('') + '</select></div>' +
    '<div style="flex:1"><label>LUT (pellicola / grading)</label><select id="rim_lut"><option value="">come prima / la sceglie il colorist</option><option value="nessuna">nessuna LUT</option>' + Object.entries(LUT_UI).map(([k, d]) => '<option value="' + k + '">' + e(d) + '</option>').join('') + '</select></div>' +
    '<div style="flex:1"><label>Durata (s)</label><input id="rim_d" type="number" min="7" max="90" placeholder="come prima"></div>' +
    '<div style="flex:1"><label>Formato</label><select id="rim_f"><option value="">decide Rocco</option><option value="montaggio">Montaggio</option><option value="talking_head">Talking-head</option><option value="carosello">Carosello → reel</option></select></div></div>' +
    '<div style="margin-top:12px"><button id="rim_ok">Rimonta</button></div><div id="rim_er" class="err"></div></div>';
}

function vistaRiferimenti(R) {
  if (!R || !R.length) return '';
  return '<h2>Riferimenti (' + R.filter((r) => r.stato === 'fatto').length + '/' + R.length + ' guardati)</h2><div class="grid">' + R.map((r) => {
    const v = r.video, a = r.analisi || {};
    return '<div class="card"><div class="riga"><span class="tag ' + v.piattaforma + '">' + v.piattaforma + '</span>' + (v.scelto_da_johnny ? '<span class="pill">scelto da te</span>' : '') + '<span class="pill">' + e(r.stato.replace('_', ' ')) + '</span></div>' +
      '<p style="margin:8px 0 4px"><a href="' + e(v.url) + '" target="_blank" rel="noopener">' + e((v.titolo || v.url).slice(0, 80)) + '</a></p>' +
      '<div class="mut">' + n(v.views) + ' views · ' + n(v.likes) + ' like · ' + e(v.durata) + ' s · ' + e(v.autore) + '</div>' +
      (r.analisi ? '<p><b>Gancio</b> ' + e(a.gancio?.cosa_succede) + ' (fino a ' + e(a.gancio?.fine_sec) + ' s)<br><b>Ritmo</b> ' + e(a.ritmo) + ' · ' + e(a.numero_tagli) + ' tagli · media ' + e(a.durata_media_inquadratura_sec) + ' s<br><b>Look</b> ' + e(a.colore?.look) + ' · <b>Effetti</b> ' + e((a.effetti || []).join(', ')) + '<br><b>Audio</b> ' + e(a.audio?.mood) + ' ' + e(a.audio?.bpm_stimato) + ' BPM · voce ' + e(a.audio?.voce) + '</p><p class="mut">' + e(a.perche_funziona) + '</p>' + (a.principio ? '<p><b>Principio</b> ' + e(a.principio) + (a.replicabile && a.replicabile.si === false ? ' <span class="pill errore">poco replicabile</span>' : '') + '</p>' : '') : '') +
      (r.errore ? '<p class="err">' + e(r.errore) + '</p>' : '') + '</div>';
  }).join('') + '</div>';
}

function vistaClip(C) {
  if (!C || !C.length) return '';
  return '<h2>Le tue clip (' + C.length + ')</h2><div class="card"><table><tr><th>Clip</th><th>Tecnico</th><th>Contenuto</th></tr>' + C.map((c) => {
    const t = c.tecnico || {}, a = c.analisi || {};
    return '<tr><td>' + e(c.nome) + '<div class="mut">' + e(c.stato.replace('_', ' ')) + '</div></td><td class="mut">' + e(t.risoluzione) + '<br>' + (t.tipo === 'immagine' ? 'foto' : e(t.fps) + ' fps · ' + e(t.durata_sec) + ' s') + '</td><td>' + e(a.descrizione || c.errore) +
      ((a.problemi || []).length ? '<div class="mut">⚠︎ ' + e(a.problemi.map((p) => p.tipo + ' ' + p.da + '-' + p.a + 's').join(', ')) + '</div>' : '') + '</td></tr>';
  }).join('') + '</table></div>';
}

async function dettaglio(id) {
  const L = await chiama('/api/lavori/' + id);
  const i = FASI.findIndex((f) => f[0] === L.fase);
  const barra = '<div class="fasi">' + FASI.map((f, k) => '<div class="' + (k < i || L.stato === 'pronto' ? 'ok' : k === i && L.stato === 'in_corso' ? 'ora' : '') + '"></div>').join('') + '</div><div class="fasinomi">' + FASI.map((f) => '<span>' + f[1] + '</span>').join('') + '</div>';
  $('#app').innerHTML = '<div class="riga"><span class="pill ' + L.stato + '">' + e(stato(L)) + '</span><span class="mut">#' + L.id + ' · ' + new Date(L.creato).toLocaleString('it-IT') + '</span></div>' +
    '<p style="white-space:pre-wrap;margin:10px 0">' + e(L.prompt) + '</p>' + barra +
    (L.errore ? '<div class="card err">' + e(L.errore) + '</div>' : '') +
    '<div class="riga" style="margin-top:14px">' + (L.stato !== 'in_corso' ? '<button class="sec" id="rip">Riprova' + (L.stato === 'pronto' ? ' la scheda' : '') + '</button>' : '') +
    (L.scheda ? '<button class="sec" id="dl">Scarica scheda (JSON)</button>' : '') + '<button class="rosso" id="del">Elimina</button></div>' +
    vistaReel(L) + vistaScheda(L.scheda) + vistaRiferimenti(L.riferimenti) + vistaClip(L.clip) +
    '<h2>Cosa stanno facendo gli agenti</h2><div class="log">' + L.registro.map((r) => { const A = AGENTI[AGID(r.agente)]; return '<div class="' + r.livello + '"><span class="mut">' + new Date(r.quando).toLocaleTimeString('it-IT') + '</span> ' + A.i + ' <b>' + e(A.n) + '</b> ' + e(r.messaggio) + '</div>'; }).join('') + '</div>';
  if ($('#gir_ok')) $('#gir_ok').onclick = async () => { try { await chiama('/api/lavori/' + id + '/girato', { method: 'POST', body: { pcloud: $('#gir').value } }); rotta(); } catch (x) { $('#gir_er').textContent = x.message; } };
  if ($('#rim_ok')) $('#rim_ok').onclick = async () => { try { await chiama('/api/lavori/' + id + '/rimonta', { method: 'POST', body: { testo: $('#rim_t').value, look: $('#rim_l').value || null, durata: $('#rim_d').value || null, formato: $('#rim_f').value || null, lut: $('#rim_lut').value || null } }); rotta(); } catch (x) { $('#rim_er').textContent = x.message; } };
  if ($('#rip')) $('#rip').onclick = async () => { await chiama('/api/lavori/' + id + '/riprova', { method: 'POST', body: {} }); rotta(); };
  if ($('#dl')) $('#dl').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(L.scheda, null, 2)], { type: 'application/json' })); a.download = 'scheda-' + id + '.json'; a.click(); };
  $('#del').onclick = async () => { if (confirm('Eliminare questo lavoro?')) { await chiama('/api/lavori/' + id, { method: 'DELETE' }); location.hash = '#/'; } };
  if (L.stato === 'in_corso') timer = setTimeout(() => { if (!document.activeElement || !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) rotta(); else timer = setTimeout(rotta, 6000); }, 6000);
}

const NOMI = { ANTHROPIC_API_KEY: ['Claude', 'console.anthropic.com → API Keys'], GEMINI_API_KEY: ['Gemini (gli occhi)', 'aistudio.google.com/apikey'], YOUTUBE_API_KEY: ['YouTube Data API v3 (facoltativa: senza, Yuri cerca sul web)', 'console.cloud.google.com → abilita “YouTube Data API v3” → Credenziali → Chiave API'], APIFY_TOKEN: ['Apify (facoltativa: TikTok e Instagram)', 'console.apify.com → Settings → API & Integrations'], GITHUB_TOKEN: ['GitHub (avvio immediato del motore)', 'github.com/settings/personal-access-tokens/new → solo il repository momento-montaggio → permesso Actions: Read and write'] };
async function impostazioni() {
  const d = await chiama('/api/impostazioni');
  $('#app').innerHTML = '<h1>Impostazioni</h1><p class="mut">Le chiavi restano sul tuo Cloudflare. Lascia vuoto un campo per non cambiarlo.</p>' +
    Object.entries(d.segreti).map(([k, v]) => '<label>' + NOMI[k][0] + ' ' + (v.impostata ? '<span class="pill pronto">impostata ' + e(v.anteprima) + '</span>' : '<span class="pill errore">manca</span>') + '</label>' +
      (v.da_cloudflare ? '<div class="aiuto">Impostata come segreto su Cloudflare.</div>' : '<input data-k="' + k + '" type="password" autocomplete="off" placeholder="incolla qui"><div class="aiuto">' + NOMI[k][1] + '</div>')).join('') +
    '<h2>Avanzate</h2>' + Object.entries(d.opzioni).map(([k, v]) => '<label>' + k + '</label><input data-k="' + k + '" data-o="1" value="' + e(v) + '">').join('') +
    '<div class="riga" style="margin-top:18px"><button id="sv">Salva</button><button class="sec" id="out">Esci</button></div><div id="er" class="err"></div>';
  $('#sv').onclick = async () => {
    const body = {};
    document.querySelectorAll('[data-k]').forEach((i) => { if (i.dataset.o || i.value.trim()) body[i.dataset.k] = i.value; });
    try { await chiama('/api/impostazioni', { method: 'POST', body }); await impostazioni(); $('#er').style.color = 'var(--ok)'; $('#er').textContent = '✓ Salvato'; } catch (x) { $('#er').textContent = x.message; }
  };
  $('#out').onclick = async () => { await fetch('/api/esci'); accesso(); };
}

// ---------------------------------------------------------------- Post e caroselli
const ST_POST = { in_corso: 'in corso', da_approvare: 'da approvare', attende_canva: 'da fare su Canva', fatto: 'pronto', errore: 'errore' };
const PILL_POST = { in_corso: 'corso', da_approvare: 'errore', attende_canva: 'errore', fatto: 'pronto', errore: 'errore' };
const imgEst = (u) => '/api/post/img?u=' + encodeURIComponent(u);
async function postLista() {
  const L = await chiama('/api/post');
  $('#app').innerHTML = '<div class="riga"><h1 style="flex:1">Post e caroselli</h1><a class="btn" href="#/post/nuovo">+ Nuovo lavoro</a></div>' +
    '<p class="mut">Ines e Tea cercano su Instagram e TikTok i post e i caroselli più virali della nicchia, Iris li studia, Ada sceglie le tue foto da pCloud, Pietro e Giulia scrivono slide, caption e hashtag. Tu approvi, poi si impaginano su Canva e tornano qui pronti da pubblicare.</p>' +
    (L.map((x) => '<a class="card lav" href="#/post/' + x.id + '"><div class="riga"><b style="flex:1">#' + x.id + ' · ' + e(x.cliente || 'cliente') + (x.titolo ? ' · ' + e(x.titolo) : '') + '</b><span class="pill ' + (PILL_POST[x.stato] || '') + '">' + (ST_POST[x.stato] || x.stato) + '</span></div>' +
      '<div class="mut">' + x.numero + ' ' + (x.tipo === 'post' ? 'post' : x.tipo === 'misto' ? 'contenuti' : 'caroselli') + ' · fase: ' + e(x.fase) + ' · ' + new Date(x.creato).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' }) + '</div>' + (x.errore ? '<div class="err">' + e(x.errore) + '</div>' : '') + '</a>').join('') || '<p class="mut">Ancora nessun lavoro.</p>');
  if (L.some((x) => x.stato === 'in_corso')) timer = setTimeout(rotta, 8000);
}

async function postNuovo() {
  const CL = await chiama('/api/clienti').catch(() => []);
  $('#app').innerHTML = '<a class="mut" href="#/post">← Post e caroselli</a><h1>Nuovo lavoro: post e caroselli</h1>' +
    '<label>Cliente</label><select id="p_cl"><option value="">— scrivi sotto un cliente nuovo —</option>' + CL.map((c) => '<option value="' + c.id + '">' + e(c.nome) + (c.nicchia ? ' · ' + e(c.nicchia) : '') + '</option>').join('') + '</select>' +
    '<input id="p_cn" placeholder="Nome del cliente (se non è in elenco)" style="margin-top:8px">' +
    '<label>Nicchia (per cercare i virali giusti)</label><input id="p_ni" placeholder="Es. ristorante di pesce a Salerno, B&B in Costiera, palestra">' +
    '<div class="riga" style="gap:12px"><div style="flex:1;min-width:140px"><label>Cosa</label><select id="p_ti"><option value="carosello">Caroselli</option><option value="post">Post a foto singola</option><option value="misto">Misto</option></select></div>' +
    '<div style="flex:1;min-width:110px"><label>Quanti</label><input id="p_nu" type="number" min="1" max="12" value="3"></div>' +
    '<div style="flex:1;min-width:110px"><label>Slide per carosello</label><input id="p_sl" type="number" min="2" max="10" value="7"></div></div>' +
    '<label>Di cosa parlano</label><textarea id="p_br" placeholder="Es. 3 caroselli per la Torretta: la tostatura artigianale, le miscele della casa, la colazione del sabato. Obiettivo: salvataggi e visite al bar."></textarea>' +
    '<label>Le tue foto su pCloud (facoltativo)</label><input id="p_pc" placeholder="https://e.pcloud.link/publink/show?code=…">' +
    '<div class="aiuto">Link pubblico della cartella con gli scatti. Ada le guarda tutte e sceglie le migliori per ogni slide. Senza foto i caroselli sono grafici.</div>' +
    '<label>Post che ti piacciono come esempio (facoltativo)</label><textarea id="p_es" style="min-height:60px" placeholder="Un link Instagram o TikTok per riga"></textarea>' +
    '<label>Note (facoltativo)</label><input id="p_no" placeholder="Colori del brand, cose da non dire, date…">' +
    '<div style="margin-top:18px"><button id="p_go">Avvia la squadra</button></div><div id="p_er" class="err"></div>';
  $('#p_go').onclick = async () => {
    const d = { cliente_id: Number($('#p_cl').value) || null, cliente: $('#p_cn').value.trim(), nicchia: $('#p_ni').value.trim(), tipo: $('#p_ti').value, numero: Number($('#p_nu').value), slide: Number($('#p_sl').value),
      brief: $('#p_br').value.trim(), pcloud: $('#p_pc').value.trim(), esempi: $('#p_es').value.split(/\\s+/).filter((x) => /^https:/.test(x)), note: $('#p_no').value.trim() };
    $('#p_go').disabled = true;
    try { const r = await chiama('/api/post', { method: 'POST', body: d }); location.hash = '#/post/' + r.id; } catch (x) { $('#p_er').textContent = x.message; $('#p_go').disabled = false; }
  };
}

async function postDettaglio(id) {
  const P = await chiama('/api/post/' + id);
  const i = P.fasi.findIndex((f) => f[0] === P.fase);
  const passi = '<div class="riga" style="flex-wrap:wrap;gap:6px;margin:10px 0">' + P.fasi.map((f, k) => '<span class="pill ' + (k < i || P.fase === 'fatto' ? 'pronto' : k === i ? 'in_corso' : '') + '">' + f[1] + '</span>').join('') + '</div>';
  const V = P.virali || {}, St = P.studio, F = P.foto, Ct = P.contenuti, da = P.stato === 'da_approvare';
  const lista = (a) => (a || []).map((x) => '<li>' + e(typeof x === 'string' ? x : JSON.stringify(x)) + '</li>').join('');
  const virali = (V.post || []).length ? '<h2>Post virali trovati da Ines e Tea</h2><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">' + V.post.map((x) => '<a href="' + e(x.url) + '" target="_blank" rel="noopener" class="card" style="margin:0;padding:8px;text-decoration:none;color:inherit">' +
    (x.immagini?.[0] ? '<div style="aspect-ratio:4/5;border-radius:10px;background:#eee url(' + imgEst(x.immagini[0]) + ') center/cover"></div>' : '<div style="aspect-ratio:4/5;border-radius:10px;background:#f0ede7;display:grid;place-items:center">🗂️</div>') +
    '<div style="font-size:12px;margin-top:6px"><b>@' + e(x.autore || '') + '</b><br><span class="mut">' + e(x.piattaforma) + ' · ' + (x.carosello ? x.slide + ' slide' : 'foto') + ' · ♥ ' + n(x.likes) + ' · 💬 ' + n(x.commenti) + '</span></div></a>').join('') + '</div>' : '';
  const studio = St ? '<h2>Cosa ha imparato Iris</h2><div class="card"><p>' + e(St.sintesi || '') + '</p><b>Copertine</b><ul>' + lista(St.copertine) + '</ul><b>Struttura</b><ul>' + lista(St.struttura) + '</ul><b>Ganci</b><ul>' + lista(St.ganci) + '</ul>' +
    (St.stile_grafico ? '<b>Stile grafico</b><ul>' + Object.entries(St.stile_grafico).map(([k, v]) => '<li>' + e(k.replace('_', ' ')) + ': ' + e(v) + '</li>').join('') + '</ul>' : '') + '<b>Da evitare</b><ul>' + lista(St.da_evitare) + '</ul></div>' : '';
  const foto = F && !F.nessuna ? '<h2>Le tue foto viste da Ada</h2><div class="card"><div class="mut">' + (F.foto || []).length + ' di ' + (F.totale || '?') + ' guardate · ' + (F.foto || []).filter((x) => x.uso !== 'scarta').length + ' buone</div><ul>' +
    (F.foto || []).filter((x) => x.uso !== 'scarta').sort((a, b) => (b.qualita || 0) - (a.qualita || 0)).slice(0, 12).map((x) => '<li><b>' + e(x.nome) + '</b> · ' + e(x.uso || '') + ' · ' + (x.qualita || '?') + '/10 · ' + e(x.descrizione || '') + '</li>').join('') + '</ul></div>' : '';
  const slideFile = new Set(P.slide_file || []);
  const pubblicabili = (Ct?.post || []).some((x) => !x.ig_id && (P.canva?.post || []).some((c) => c.n === x.n)) && slideFile.size;
  const posts = Ct ? '<h2>' + (P.tipo === 'post' ? 'Post' : 'Caroselli') + '</h2>' + (Ct.stile?.palette ? '<div class="card"><b>Stile del set</b><div class="riga" style="margin:8px 0">' + Ct.stile.palette.map((c) => '<span style="width:26px;height:26px;border-radius:8px;border:1px solid var(--line);background:' + e(c) + '" title="' + e(c) + '"></span>').join('') + '<span class="mut">' + e(Ct.stile.font_titoli || '') + ' / ' + e(Ct.stile.font_testo || '') + ' · ' + e(Ct.stile.mood || '') + '</span></div><div class="mut">' + e(Ct.stile.regole || '') + '</div></div>' : '') +
    Ct.post.map((x) => {
      const cv = (P.canva?.post || []).find((c) => c.n === x.n);
      const png = cv ? cv.png.map((_, k) => '/api/post/' + P.id + '/slide/' + x.n + '-' + (k + 1) + '.png').filter((u, k) => slideFile.has('post-' + P.id + '/' + x.n + '-' + (k + 1) + '.png')) : [];
      return '<div class="card"><div class="riga"><b style="flex:1">' + x.n + '. ' + e(x.titolo || '') + '</b><span class="pill">' + (x.slide || []).length + ' slide · ' + e(x.obiettivo || '') + '</span>' +
        (da ? '<label style="display:flex;gap:6px;font-weight:400;margin:0"><input type="checkbox" class="po_ok" data-n="' + x.n + '" checked style="width:auto"> approva</label>' : '<span class="pill ' + (x.stato === 'approvato' ? 'pronto' : '') + '">' + e(x.stato || '') + '</span>') + '</div>' +
        (png.length ? '<div style="display:flex;gap:8px;overflow-x:auto;margin:10px 0">' + png.map((u) => '<a href="' + u + '?scarica=1"><img src="' + u + '" style="height:220px;border-radius:10px;border:1px solid var(--line)"></a>').join('') + '</div>' : '') +
        '<div class="riga" style="gap:8px;margin:6px 0">' + (cv?.link ? '<a class="btn sec" href="' + e(cv.link) + '" target="_blank" rel="noopener">Modifica su Canva ↗</a>' : '') +
          (x.ig_id ? '<span class="pill ' + (x.ig_stato === 'pubblicato' ? 'pronto' : x.ig_stato === 'errore' ? 'errore' : 'in_corso') + '">📲 ' + e(x.ig_stato || 'programmato') + ' · ' + new Date(x.ig_quando).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) + '</span>' + (x.ig_link ? '<a href="' + e(x.ig_link) + '" target="_blank" rel="noopener">apri su Instagram</a>' : '') + (x.ig_errore ? '<span class="err">' + e(x.ig_errore) + '</span>' : '')
            : png.length && P.instagram?.suo_profilo ? '<label style="display:flex;gap:6px;align-items:center;font-weight:400;margin:0"><input type="checkbox" class="pi_ok" data-n="' + x.n + '" checked style="width:auto"> pubblica il</label><input type="datetime-local" class="pi_q" data-n="' + x.n + '" style="width:auto">' : '') + '</div>' +
        '<ol style="padding-left:18px">' + (x.slide || []).map((s, k) => '<li style="margin:8px 0">' + (da ? '<input class="po_ti" data-n="' + x.n + '" data-k="' + k + '" value="' + e(s.titolo || '') + '" style="font-weight:600"><textarea class="po_te" data-n="' + x.n + '" data-k="' + k + '" style="min-height:50px;margin-top:4px">' + e(s.testo || '') + '</textarea>'
          : '<b>' + e(s.titolo || '') + '</b>' + (s.testo ? '<br>' + e(s.testo) : '')) + '<div class="mut">' + e(s.ruolo || '') + (s.foto ? ' · 📷 ' + e(s.foto) : '') + (s.layout ? ' · ' + e(s.layout) : '') + '</div></li>').join('') + '</ol>' +
        '<label>Caption</label>' + (da ? '<textarea class="po_ca" data-n="' + x.n + '">' + e(x.caption || '') + '</textarea>' : '<div style="white-space:pre-wrap" class="card">' + e(x.caption || '') + '</div>') +
        '<div class="mut">' + (x.hashtag || []).map((h) => '#' + e(String(h).replace(/^#/, ''))).join(' ') + '</div></div>';
    }).join('') + (da ? '<div class="riga"><button id="po_ok">Approva i selezionati</button></div><div id="po_er" class="err"></div>' : '') : '';
  $('#app').innerHTML = '<a class="mut" href="#/post">← Post e caroselli</a><h1>' + e(P.cliente || 'Cliente') + ' · ' + P.numero + ' ' + (P.tipo === 'post' ? 'post' : P.tipo === 'misto' ? 'contenuti' : 'caroselli') + '</h1><div class="mut">#' + P.id + ' · ' + e(P.nicchia || '') + '</div>' + passi +
    '<div class="card"><b>Brief</b><div style="white-space:pre-wrap">' + e(P.brief) + '</div>' + (P.pcloud ? '<div class="mut">📁 foto: <a href="' + e(P.pcloud) + '" target="_blank" rel="noopener">cartella pCloud</a></div>' : '') + '</div>' +
    (P.errore ? '<div class="card err">' + e(P.errore) + ' <button class="sec" id="po_rp">Riprova</button></div>' : '') +
    (P.stato === 'attende_canva' ? '<div class="card">🎨 <b>Pronti per Canva.</b> Testi, foto e stile sono approvati: chiedi a Claude in chat <i>“fai su Canva il lavoro post #' + P.id + '”</i> e le slide tornano qui in PNG, con il link per modificarle.</div>' : '') +
    (pubblicabili ? '<div class="card"><b>📲 Pubblicazione su Instagram</b>' + (P.instagram?.suo_profilo ? '<p class="mut">Vanno sul tuo profilo solo quando premi qui, agli orari che scegli (proposti: uno al giorno alle 19:00).</p><div class="riga"><button id="pi_go">Programma su Instagram</button></div><div id="pi_er" class="err"></div>'
      : '<p class="mut" style="margin-bottom:0">Per ora si pubblica in automatico solo sul tuo profilo. Per i clienti scarichi le slide e la caption, oppure colleghiamo il loro account Instagram.</p>') + '</div>' : '') +
    posts + studio + foto + virali + '<div class="riga" style="margin-top:14px"><button class="sec" id="po_del">Elimina</button></div>';
  if ($('#po_ok')) $('#po_ok').onclick = async () => {
    const nn = [...document.querySelectorAll('.po_ok')].filter((x) => x.checked).map((x) => Number(x.dataset.n));
    const modifiche = {};
    for (const x of Ct.post) {
      const slide = x.slide.map((s, k) => ({ ...s, titolo: document.querySelector('.po_ti[data-n="' + x.n + '"][data-k="' + k + '"]')?.value ?? s.titolo, testo: document.querySelector('.po_te[data-n="' + x.n + '"][data-k="' + k + '"]')?.value ?? s.testo }));
      modifiche[x.n] = { slide, caption: document.querySelector('.po_ca[data-n="' + x.n + '"]')?.value ?? x.caption };
    }
    try { await chiama('/api/post/' + id + '/approva', { method: 'POST', body: { n: nn, modifiche } }); rotta(); } catch (x) { $('#po_er').textContent = x.message; }
  };
  document.querySelectorAll('.pi_q').forEach((x, k) => { const d = new Date(); d.setDate(d.getDate() + 1 + k); d.setHours(19, 0, 0, 0); x.value = new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); });
  if ($('#pi_go')) $('#pi_go').onclick = async () => {
    const nn = [...document.querySelectorAll('.pi_ok')].filter((x) => x.checked).map((x) => Number(x.dataset.n));
    if (!nn.length) { $('#pi_er').textContent = 'seleziona almeno un carosello'; return; }
    const quando = {}; document.querySelectorAll('.pi_q').forEach((x) => { if (x.value) quando[x.dataset.n] = new Date(x.value).toISOString(); });
    if (!confirm('Programmare ' + nn.length + ' contenuti sul tuo profilo Instagram? Verranno pubblicati da soli agli orari scelti.')) return;
    try { const r = await chiama('/api/post/' + id + '/pubblica', { method: 'POST', body: { n: nn, quando } }); const ko = r.fatti.filter((f) => f.errore); if (ko.length) $('#pi_er').textContent = ko.map((f) => '#' + f.n + ': ' + f.errore).join(' · '); else rotta(); } catch (x) { $('#pi_er').textContent = x.message; }
  };
  if ($('#po_rp')) $('#po_rp').onclick = async () => { await chiama('/api/post/' + id + '/riprova', { method: 'POST' }); rotta(); };
  $('#po_del').onclick = async () => { if (!confirm('Eliminare questo lavoro?')) return; await chiama('/api/post/' + id, { method: 'DELETE' }); location.hash = '#/post'; };
  if (P.stato === 'in_corso') timer = setTimeout(rotta, 8000);
}

// ---------------------------------------------------------------- Gestionale ufficiale + Gino e Dora
const SCHEDE_G = (att) => '<div class="riga" style="flex-wrap:wrap;gap:10px;margin-bottom:12px"><div style="display:flex;background:#ebe8e2;border-radius:12px;padding:3px;flex-wrap:wrap">' +
  [['#/gestionale', '📒 Gestionale'], ['#/chat/gestionale', '🗂️ Gino'], ['#/chat/contabile', '🧾 Dora']].map(([h, n]) => '<a href="' + h + '" style="padding:7px 14px;border-radius:9px;font-size:13.5px;font-weight:600;text-decoration:none;' + (h === att ? 'background:#fff;color:var(--txt);box-shadow:0 1px 3px rgba(0,0,0,.08)' : 'color:#6b6862') + '">' + n + '</a>').join('') +
  '</div><span style="flex:1"></span><a class="btn sec" href="https://momento-gestionale.gestionalelcl.workers.dev/" target="_blank" rel="noopener">Apri in una nuova scheda ↗</a></div>';
function gestionalePagina() {
  $('#app').innerHTML = SCHEDE_G('#/gestionale') + '<iframe src="/gestionale/" title="Gestionale Momento" style="width:100%;height:calc(100vh - 150px);min-height:560px;border:1px solid var(--line);border-radius:18px;background:#fff"></iframe>' +
    '<p class="mut" style="font-size:12.5px">È il gestionale ufficiale, con i suoi utenti e permessi: la prima volta accedi con il tuo utente del gestionale. Gino e Dora lavorano sugli stessi dati.</p>';
}

// ---------------------------------------------------------------- Costi: contatori di ogni chiamata a pagamento
const AREE_C = { reel: 'Comparto Reel', post: 'Post e caroselli', uffici: 'Uffici (incarichi)', riunioni: 'Riunioni', profilo: 'Profilo IG (ricerca, copioni, avatar)', copioni: 'Copioni di Nora', gestionale: 'Gestionale e contabilità', altro: 'Altro' };
const SERV_C = { claude: 'Claude (agenti + ricerche web)', heygen: 'HeyGen (avatar)' };
async function costiPagina(giorni) {
  const C = await chiama('/api/consumi?giorni=' + giorni);
  if (!AGENTI.capo?.n) { try { const A = await chiama('/api/azienda'); Object.assign(AGENTI, A.squadra); } catch (_) {} }
  const eur = (u) => soldi(u || 0, C.cambio), usd = (u) => '$ ' + (u || 0).toFixed(2);
  const k = (tit, val, sub) => '<div class="card" style="margin:0"><div class="mut" style="font-size:12px;text-transform:uppercase;letter-spacing:1px">' + tit + '</div><div style="font-size:26px;font-weight:700;margin:6px 0 2px;letter-spacing:-.5px">' + val + '</div><div class="mut" style="font-size:12.5px">' + sub + '</div></div>';
  const max = Math.max(0.0001, ...C.giornaliero.map((g) => g.costo));
  const barre = C.giornaliero.length ? '<div style="display:flex;align-items:flex-end;gap:3px;height:120px;margin-top:10px">' + C.giornaliero.map((g) => '<div title="' + g.giorno + ': ' + eur(g.costo) + '" style="flex:1;min-width:4px;background:var(--teal);opacity:.85;border-radius:4px 4px 0 0;height:' + Math.max(2, (g.costo / max) * 100) + '%"></div>').join('') + '</div><div class="riga mut" style="font-size:11.5px;margin-top:4px"><span style="flex:1">' + C.giornaliero[0].giorno + '</span><span>' + C.giornaliero.at(-1).giorno + '</span></div>' : '<p class="mut">Ancora nessun dato.</p>';
  const tab = (titolo, righe, nome) => '<div class="card"><b>' + titolo + '</b>' + (righe.length ? '<table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:14px">' + righe.map((r) => '<tr style="border-top:1px solid var(--line)"><td style="padding:7px 0">' + nome(r) + '</td><td class="mut" style="text-align:right;padding:7px 8px;white-space:nowrap">' + r.n + ' chiam.</td><td style="text-align:right;font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums">' + eur(r.costo) + '</td></tr>').join('') + '</table>' : '<p class="mut" style="margin:8px 0 0">Niente in questo periodo.</p>') + '</div>';
  const nomeAg = (a) => (AGENTI[a] ? AGENTI[a].i + ' ' + AGENTI[a].n + ' <span class="mut">' + e(AGENTI[a].r || '') + '</span>' : e(a));
  const T = C.totale;
  $('#app').innerHTML = '<div class="riga" style="flex-wrap:wrap;gap:10px"><h1 style="flex:1;margin-right:auto">Costi</h1><div style="display:flex;background:#ebe8e2;border-radius:12px;padding:3px">' + [7, 30, 90].map((g) => '<a href="#/costi/' + g + '" style="padding:7px 14px;border-radius:9px;font-size:13.5px;font-weight:600;text-decoration:none;' + (g === giorni ? 'background:#fff;color:var(--txt);box-shadow:0 1px 3px rgba(0,0,0,.08)' : 'color:#6b6862') + '">' + g + ' gg</a>').join('') + '</div></div>' +
    '<p class="mut">Ogni chiamata a pagamento degli agenti viene contata qui: chi l’ha fatta, per quale cliente o reel, quanto costa a prezzo di listino. Importi in euro al cambio ' + C.cambio + ' (modificabile in Impostazioni).</p>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:14px 0">' +
      k('Questo mese', eur(C.questo_mese), usd(C.questo_mese) + ' a consumo') +
      k('Previsione mese', eur(C.proiezione_mese), C.giorni_con_dati >= 3 ? 'media ' + eur(C.al_giorno) + '/giorno × 30 + fissi' : 'servono qualche giorno di dati') +
      k('Ultimi ' + giorni + ' giorni', eur(T.costo), T.chiamate + ' chiamate · ' + T.ricerche + ' ricerche web') +
      k('Costi fissi', eur(C.fissi_totale), C.fissi.map((f) => e(f.nome)).join(', ') || 'nessuno') + '</div>' +
    '<div class="card"><b>Spesa al giorno</b>' + barre + '</div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px">' +
      tab('Per servizio', C.servizi, (r) => e(SERV_C[r.servizio] || r.servizio)) +
      tab('Per area', C.aree, (r) => e(AREE_C[r.area] || r.area)) + '</div>' +
    tab('Per agente', C.agenti, (r) => nomeAg(r.agente)) +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px">' +
      tab('Costo per reel', C.reel, (r) => '<a href="#/lavoro/' + r.lavoro_id + '">#' + r.lavoro_id + ' ' + e(r.titolo || r.prompt || '') + '</a>' + (r.stato === 'pronto' ? '' : ' <span class="mut">(' + e(r.stato || '') + ')</span>')) +
      tab('Per cliente', C.clienti, (r) => '<a href="#/cliente/' + r.cliente_id + '">' + e(r.nome || '#' + r.cliente_id) + '</a>') + '</div>' +
    tab('Profilo IG: costo per argomento (ricerca, copioni, avatar; il montaggio è nei reel)', C.profilo, (r) => '<a href="#/profilo/' + r.piano_id + '">' + e(r.argomento || '#' + r.piano_id) + '</a> <span class="mut">· ' + (r.numero || '') + ' reel</span>') +
    '<div class="card"><b>Costi fissi del mese</b>' + (C.fissi.length ? '<table style="width:100%;margin-top:8px;font-size:14px">' + C.fissi.map((f) => '<tr><td style="padding:5px 0">' + e(f.nome) + '</td><td style="text-align:right;font-weight:600">' + eur(f.dollari) + ' <span class="mut">(' + usd(f.dollari) + ')</span></td></tr>').join('') + '</table>' : '') +
      '<p class="mut" style="font-size:13px;margin-bottom:0">Si cambiano in ⚙︎ Impostazioni → COSTI_FISSI (es. <code>Cloudflare Workers Paid:5,Apify:19</code>). HeyGen è contato a ' + usd(C.heygen_minuto) + ' al minuto di video (HEYGEN_DOLLARI_MINUTO). Gli importi sono a listino: la cifra esatta addebitata la trovi nelle console di Anthropic e HeyGen.</p></div>';
}

// ---------------------------------------------------------------- Nora · idee e copioni
let PREFILL = '';
async function piani() {
  const P = await chiama('/api/piani');
  $('#app').innerHTML = '<div class="riga"><h1 style="flex:1">Copioni</h1><a class="btn" href="#/copioni/nuovo">+ Nuovo piano</a></div>' +
    '<p class="mut">Nora prende i tuoi argomenti e scrive il piano del contratto: calendario, giornate di ripresa e un copione per ogni reel con le clip da girare.</p>' +
    (P.map((x) => '<a class="card lav" href="#/copioni/' + x.id + '"><div class="riga"><b style="flex:1">#' + x.id + ' · ' + e(x.titolo || x.cliente) + '</b><span class="pill ' + x.stato + '">' + (x.stato === 'pronto' ? 'pronto' : x.stato === 'errore' ? 'errore' : (x.fase === 'strategia' ? 'strategia…' : 'copioni ' + x.scritti + '/' + x.numero)) + '</span></div><div class="mut">' + e(x.cliente) + ' · ' + x.numero + ' reel in ' + x.mesi + ' mesi · ' + fa(x.creato) + '</div></a>').join('') || '<div class="vuoto">Nessun piano ancora. Crea il primo con “+ Nuovo piano”.</div>');
}

function nuovoPiano() {
  const oggi = new Date(); oggi.setDate(oggi.getDate() + ((8 - oggi.getDay()) % 7 || 7));
  $('#app').innerHTML = '<h1>Nuovo piano di copioni</h1><p class="mut">Tu dai cliente, argomenti e numero di reel. Nora fa strategia, calendario e copioni da girare.</p>' +
    '<label>Cliente</label><input id="c_cl" placeholder="Es. Caffetteria Torretta">' +
    '<label>Settore / attività (facoltativo)</label><input id="c_se" placeholder="Es. torrefazione artigianale e bar, Salerno">' +
    '<label>Argomenti (uno per riga)</label><textarea id="c_ar" style="min-height:160px" placeholder="La tostatura dei chicchi&#10;Il mastro tostatore&#10;Le miscele della casa&#10;La colazione del sabato&#10;…"></textarea>' +
    '<div class="aiuto">Più sono concreti (prodotti, persone, momenti, promozioni) più i copioni sono girabili. Nora non inventa cose che non hai scritto.</div>' +
    '<div class="riga" style="gap:12px"><div style="flex:1;min-width:120px"><label>Numero di reel</label><input id="c_nu" type="number" min="1" max="60" value="20"></div>' +
    '<div style="flex:1;min-width:120px"><label>Mesi di contratto</label><input id="c_me" type="number" min="1" max="24" value="3"></div>' +
    '<div style="flex:1;min-width:160px"><label>Inizio</label><input id="c_in" type="date" value="' + oggi.toISOString().slice(0, 10) + '"></div></div>' +
    '<label>Obiettivo del cliente (facoltativo)</label><input id="c_ob" placeholder="Es. più clienti al bancone il weekend, vendere le miscele online">' +
    '<label>Pubblico (facoltativo)</label><input id="c_pu" placeholder="Es. 25-45 anni, amanti del caffè, turisti">' +
    '<label>Tono (facoltativo)</label><input id="c_to" placeholder="Es. caldo, artigianale, cinematografico, niente testi">' +
    '<label>Piattaforme (facoltativo)</label><input id="c_pi" placeholder="Instagram Reels + TikTok">' +
    '<label>Note per Nora (facoltativo)</label><textarea id="c_no" style="min-height:70px" placeholder="Vincoli, date importanti, chi può andare in camera, reel modello…"></textarea>' +
    '<div style="margin-top:18px"><button id="c_go">Fai lavorare Nora</button></div><div id="c_er" class="err"></div>';
  $('#c_go').onclick = async () => {
    $('#c_go').disabled = true;
    try {
      const r = await chiama('/api/piani', { method: 'POST', body: { cliente: $('#c_cl').value, settore: $('#c_se').value, argomenti: $('#c_ar').value, numero: $('#c_nu').value, mesi: $('#c_me').value, inizio: $('#c_in').value, obiettivo: $('#c_ob').value, pubblico: $('#c_pu').value, tono: $('#c_to').value, piattaforme: $('#c_pi').value, note: $('#c_no').value } });
      location.hash = '#/copioni/' + r.id;
    } catch (x) { $('#c_er').textContent = x.message; $('#c_go').disabled = false; }
  };
}

function testoCopione(c, d) {
  const g = c.gancio || {};
  return 'REEL #' + c.numero + ' · ' + c.titolo + '\\nCliente: ' + d.cliente + ' · Formato: ' + c.formato + ' · ' + c.durata_sec + ' s\\n\\n' + c.concetto +
    '\\n\\nGANCIO: ' + (g.visivo || '') + (g.testo_a_schermo ? ' | testo: ' + g.testo_a_schermo : '') + (g.parlato ? ' | parlato: ' + g.parlato : '') +
    '\\n\\nSCENE:\\n' + (c.scene || []).map((s) => s.n + '. ' + s.da_sec + '-' + s.a_sec + ' s · ' + s.inquadratura + ' · ' + s.cosa_riprendere + ' · camera: ' + s.camera + (s.fps && String(s.fps).includes('50') ? ' · 50 fps' : '') + (s.testo_a_schermo ? ' · testo: ' + s.testo_a_schermo : '') + (s.parlato ? ' · parlato: ' + s.parlato : '')).join('\\n') +
    '\\n\\nLISTA RIPRESE:\\n' + (c.lista_riprese || []).map((x) => '- ' + x).join('\\n') +
    '\\n\\nMUSICA: ' + (c.musica || '') + '\\n\\nCAPTION:\\n' + (c.caption || '') + '\\n' + (c.hashtag || []).join(' ');
}

function vistaCopione(r, cal, d, id) {
  const c = r.copione;
  const t = '<div class="riga"><b style="flex:1">#' + r.numero + ' · ' + e(c ? c.titolo : (cal.idea || cal.argomento || '')) + '</b><span class="pill">' + e(cal.data || ('sett. ' + cal.settimana)) + '</span><span class="pill">' + e((c && c.formato) || cal.formato || '') + '</span></div>' +
    '<div class="mut">' + e(cal.argomento || '') + ' · ' + e(cal.pilastro || '') + ' · obiettivo ' + e((c && c.obiettivo) || cal.obiettivo || '') + '</div>';
  if (!c) return '<div class="card">' + t + '<p class="mut">' + (r.stato === 'da_scrivere' ? '✍️ Nora lo sta scrivendo…' : '') + (r.nota ? ' (' + e(r.nota) + ')' : '') + '</p></div>';
  const g = c.gancio || {}, mo = c.montaggio || {};
  const scene = (c.scene || []).map((s) => '<tr><td style="white-space:nowrap"><b>' + e(s.da_sec) + '–' + e(s.a_sec) + ' s</b><div class="mut">gira ' + e(s.girare_sec || '') + '</div></td><td><b>' + e(s.inquadratura) + '</b><div class="mut">' + e(s.angolo || '') + '</div></td><td>' + e(s.cosa_riprendere) +
    '<div class="mut">🎥 ' + e(s.camera || '') + ' · 💡 ' + e(s.luce || '') + (s.fps ? ' · ' + e(s.fps) + ' fps' : '') + ' · 🔊 ' + e(s.audio || '') + '</div>' +
    (s.testo_a_schermo ? '<div>🅣 “' + e(s.testo_a_schermo) + '”</div>' : '') + (s.parlato ? '<div>🗣️ “' + e(s.parlato) + '”</div>' : '') + '</td></tr>').join('');
  return '<details class="card copione"><summary>' + t + '</summary>' +
    '<p>' + e(c.concetto) + '</p>' +
    '<div class="kv"><b>Gancio</b><span>' + e(g.visivo || '') + (g.testo_a_schermo ? '<br>🅣 “' + e(g.testo_a_schermo) + '”' : '') + (g.parlato ? '<br>🗣️ “' + e(g.parlato) + '”' : '') + '</span>' +
    '<b>Durata</b><span>' + e(c.durata_sec) + ' s</span><b>Musica</b><span>' + e(c.musica || '') + '</span>' +
    '<b>Montaggio</b><span>' + e([mo.ritmo, mo.look, mo.transizioni, mo.finale].filter(Boolean).join(' · ')) + '</span></div>' +
    '<h3 style="margin:16px 0 6px">Scene da girare</h3><table><tr><th>Tempo</th><th>Inquadratura</th><th>Cosa e come</th></tr>' + scene + '</table>' +
    (c.parlato_completo ? '<h3 style="margin:16px 0 6px">Testo parlato</h3><p>' + e(c.parlato_completo) + '</p>' : '') +
    '<div class="grid"><div><h3 style="margin:16px 0 6px">✅ Lista riprese</h3>' + (c.lista_riprese || []).map((x) => '<label style="font-weight:400;margin:4px 0;display:flex;gap:8px"><input type="checkbox" style="width:auto"> ' + e(x) + '</label>').join('') + '</div>' +
    '<div><h3 style="margin:16px 0 6px">📦 Da preparare</h3>' + lst(c.da_preparare) + '<h3 style="margin:16px 0 6px">🎬 Note set</h3><p>' + e(c.note_set || '—') + '</p></div></div>' +
    '<h3 style="margin:16px 0 6px">Caption</h3><div class="card" style="white-space:pre-wrap">' + e(c.caption || '') + '\\n\\n' + e((c.hashtag || []).join(' ')) + '</div>' +
    '<div class="mut">CTA: ' + e(c.cta || '') + ' · Ganci da testare: ' + e((c.ganci_alternativi || []).join(' / ')) + '</div>' +
    '<div class="riga" style="margin-top:12px"><button class="sec" data-copia="' + r.numero + '">Copia copione</button><button class="sec" data-lavoro="' + r.numero + '">🎬 Crea il reel da questo</button><button class="sec" data-rifai="' + r.numero + '">✍️ Riscrivi</button></div></details>';
}

async function piano(id) {
  const P = await chiama('/api/piani/' + id);
  const d = P.dati || {}, s = P.strategia || {}, cal = s.calendario || [];
  const fatti = P.reel.filter((r) => r.stato === 'fatto').length;
  const stato = P.stato === 'errore' ? '<div class="card err">❌ ' + e(P.errore || '') + ' <button class="sec" id="p_rip">Riprova</button></div>' :
    P.stato === 'in_corso' ? '<div class="card attivo">💡 Nora ' + (P.fase === 'strategia' ? 'sta studiando la strategia…' : 'sta scrivendo i copioni: ' + fatti + '/' + P.reel.length) + (P.errore ? '<div class="mut">' + e(P.errore) + '</div>' : '') + '<div class="fasi">' + P.reel.map((r) => '<div class="' + (r.stato === 'fatto' ? 'ok' : '') + '"></div>').join('') + '</div></div>' : '';
  const strat = !P.strategia ? '' : '<h2>Strategia</h2><div class="card"><h1>' + e(s.titolo_piano || d.cliente) + '</h1><p>' + e(s.sintesi || '') + '</p><div class="kv">' +
    '<b>Pubblico</b><span>' + e(s.pubblico || '') + '</span><b>Linea</b><span>' + e(s.linea_editoriale || '') + '</span><b>Formati</b><span>' + e(s.mix_formati || '') + '</span><b>Frequenza</b><span>' + e(s.frequenza || '') + '</span></div>' +
    '<h3 style="margin:16px 0 6px">Pilastri</h3>' + lst((s.pilastri || []).map((x) => x.nome + ' (' + (x.quota || '') + ') — ' + (x.perche || ''))) +
    '<h3 style="margin:16px 0 6px">Consigli</h3>' + lst(s.consigli) + '</div>' +
    '<h2>Giornate di ripresa</h2>' + (s.giornate_di_ripresa || []).map((gr) => '<div class="card"><b>Giorno ' + e(gr.giorno) + ' · ' + e(gr.dove || '') + '</b> <span class="pill">' + e(gr.durata || '') + '</span><div>Reel: ' + (gr.reel || []).map((n) => '#' + n).join(', ') + '</div><div class="mut">Chi: ' + e(gr.chi || '') + (gr.note ? ' · ' + e(gr.note) : '') + '</div></div>').join('') +
    '<h2>Calendario e copioni</h2>' + P.reel.map((r) => vistaCopione(r, cal.find((x) => x.numero === r.numero) || {}, d, id)).join('');
  $('#app').innerHTML = '<div class="riga noprint"><a class="mut" href="#/copioni">← Copioni</a><span style="flex:1"></span>' + (P.stato === 'pronto' ? '<button class="sec" id="p_print">🖨️ Stampa / PDF</button>' : '') + '<button class="rosso" id="p_del">Elimina</button></div>' +
    '<h1>' + e(d.cliente) + '</h1><div class="mut">' + d.numero + ' reel · ' + d.mesi + ' mesi dal ' + e(d.inizio) + ' · argomenti: ' + e((d.argomenti || []).join(', ')) + '</div>' + stato + strat;
  const trova = (n) => ({ r: P.reel.find((x) => x.numero === Number(n)), c: cal.find((x) => x.numero === Number(n)) || {} });
  document.querySelectorAll('[data-copia]').forEach((b) => b.onclick = async () => { await navigator.clipboard.writeText(testoCopione(trova(b.dataset.copia).r.copione, d)); b.textContent = 'Copiato ✓'; });
  document.querySelectorAll('[data-lavoro]').forEach((b) => b.onclick = () => { const c = trova(b.dataset.lavoro).r.copione; PREFILL = 'Reel per ' + d.cliente + (d.settore ? ' (' + d.settore + ')' : '') + ', ' + c.durata_sec + ' secondi, formato ' + c.formato + '. Segui questo copione:\\n\\n' + testoCopione(c, d); location.hash = '#/nuovo'; });
  document.querySelectorAll('[data-rifai]').forEach((b) => b.onclick = async () => { const nota = prompt('Cosa vuoi cambiare in questo copione? (vuoto = riscrivilo da capo)'); if (nota === null) return; await chiama('/api/piani/' + id + '/reel/' + b.dataset.rifai + '/rifai', { method: 'POST', body: { nota } }); rotta(); });
  if ($('#p_print')) $('#p_print').onclick = () => { document.querySelectorAll('details').forEach((x) => x.open = true); print(); };
  if ($('#p_rip')) $('#p_rip').onclick = async () => { await chiama('/api/piani/' + id + '/riprova', { method: 'POST', body: {} }); rotta(); };
  $('#p_del').onclick = async () => { if (!confirm('Eliminare questo piano?')) return; await chiama('/api/piani/' + id, { method: 'DELETE' }); location.hash = '#/copioni'; };
  if (P.stato === 'in_corso') timer = setTimeout(rotta, 5000);
}

// ---------------------------------------------------------------- AGENZIA MOMENTO AI
let CLIENTI_CACHE = null;
const ST_INC = { in_coda: 'in coda', in_corso: 'al lavoro', da_approvare: 'da approvare', fatto: 'fatto', errore: 'errore', approvato: 'approvato' };
function md(t) {
  const righe = e(t || '').split('\\n');
  let h = '', lista = false;
  for (let r of righe) {
    r = r.replace(/\\*\\*(.+?)\\*\\*/g, '<b>$1</b>');
    const li = /^\\s*([-*]|\\d+[.)])\\s+(.*)$/.exec(r);
    if (li) { if (!lista) { h += '<ul>'; lista = true; } h += '<li>' + li[2] + '</li>'; continue; }
    if (lista) { h += '</ul>'; lista = false; }
    const ti = /^(#{1,4})\\s+(.*)$/.exec(r);
    if (ti) h += '<h' + (ti[1].length + 1) + ' style="margin:14px 0 6px">' + ti[2] + '</h' + (ti[1].length + 1) + '>';
    else if (r.trim()) h += '<p style="margin:6px 0">' + r + '</p>';
  }
  return h + (lista ? '</ul>' : '');
}
async function clientiSel(id, scelto, vuoto) {
  CLIENTI_CACHE = await chiama('/api/clienti');
  return '<select id="' + id + '"><option value="">' + (vuoto || '— nessun cliente —') + '</option>' + CLIENTI_CACHE.map((c) => '<option value="' + c.id + '"' + (String(scelto) === String(c.id) ? ' selected' : '') + '>' + e(c.nome) + (c.ha_scheda ? '' : ' (senza scheda)') + '</option>').join('') + '</select>';
}

// ---------------------------------------------------------------- LA SALA: l'agenzia vista dall'alto
// Grandangolo isometrico con tutti gli uffici; tocchi un ufficio e la camera entra; tocchi un agente e si avvicina,
// a destra (o in basso sul telefono) vedi cosa sta facendo.
const PIANTA = [
  // [ufficio, nome, x, y, larghezza, altezza, colore tappeto]
  ['direzione', 'Direzione', 0, 0, 480, 300, '#dfe6ff'],
  ['marketing', 'Marketing', 480, 0, 480, 300, '#ffe4d6'],
  ['social', 'Social', 960, 0, 480, 300, '#ffe9f2'],
  ['video', 'Video · comparto Reel', 0, 300, 960, 440, '#e4f3ea'],
  ['foto', 'Foto', 960, 300, 480, 440, '#fff3d6'],
  ['web', 'Web & E-commerce', 0, 740, 360, 260, '#e3f1fb'],
  ['booking', 'Booking & WhatsApp', 360, 740, 360, 260, '#eaf8df'],
  ['gestionale', 'Gestionale', 720, 740, 360, 260, '#efe9ff'],
  ['contabilita', 'Contabilità', 1080, 740, 360, 260, '#fff0d9'],
  ['meeting', 'Sala meeting', 1440, 740, 300, 260, '#eef2f7'],
];
const VIDEO_TEAM = ['direttore', 'avatar', 'stella', 'scout_yt', 'scout_tt', 'scout_ig', 'occhi', 'analista', 'motore', 'regista', 'copy', 'editor', 'vfx', 'color', 'audio', 'sottotitoli', 'revisore'];
let SALA = { s: 1, x: 0, y: 0, dati: null, sel: null, ufficio: null };

function statiAgenti(R) {
  const st = {}, cosa = {}, ultimo = {};
  for (const r of R.feed) { const a = AGID(r.agente); if (!ultimo[a]) ultimo[a] = r; }
  for (const I of R.attivi) {
    const s = I.stato === 'in_corso' && I.blocco_fino > R.adesso ? 'lavora' : 'coda';
    if (st[I.agente] !== 'lavora') { st[I.agente] = s; cosa[I.agente] = { testo: I.titolo, link: '#/incarico/' + I.id }; }
  }
  for (const L of R.reel) for (const a of FASE_AGENTI[L.fase] || []) {
    const s = L.blocco_fino && L.blocco_fino > R.adesso ? 'lavora' : 'coda';
    if (st[a] !== 'lavora') { st[a] = s; cosa[a] = { testo: 'Reel #' + L.id + ' · fase ' + L.fase, link: '#/lavoro/' + L.id }; }
  }
  if (R.piani.length) { st.idee = 'lavora'; cosa.idee = { testo: 'Piano copioni #' + R.piani[0].id, link: '#/copioni/' + R.piani[0].id }; }
  for (const Q of (R.riunioni || []).filter((x) => x.in_sala)) for (const a of Q.partecipanti) cosa[a] = { testo: 'In riunione: ' + (Q.titolo || ''), link: '#/riunione/' + Q.id };
  for (const [a, u] of Object.entries(ultimo)) if (!st[a] && u.livello === 'errore' && Date.now() - new Date(u.quando) < 30 * 60e3) st[a] = 'errore';
  return { st, cosa, ultimo };
}

function agentiUfficio(R, u) {
  if (u === 'video') return VIDEO_TEAM.filter((a) => AGENTI[a]);
  const ids = Object.keys(R.squadra).filter((k) => R.squadra[k].u === u);
  return u === 'direzione' ? ids.concat(['idee']) : ids;
}

function datiSala(R) {
  const { st, cosa, ultimo } = statiAgenti(R);
  SALA.info = { st, cosa, ultimo };
  const agenti = [];
  const registro = {};
  for (const r of R.feed) { const a = AGID(r.agente); (registro[a] ||= []).length < 4 && registro[a].push(r.messaggio); }
  const reelImg = (a) => { const L = R.reel.find((x) => (FASE_AGENTI[x.fase] || []).includes(a)); return L && L.fase === 'fatto' ? '/api/lavori/' + L.id + '/anteprima.jpg' : null; };
  for (const [u] of PIANTA) for (const a of agentiUfficio(R, u)) { const A = AGENTI[a]; if (A) agenti.push({ id: a, n: A.n, r: A.r, c: A.c || '#888888', u, stato: st[a] || '', msg: cosa[a]?.testo || ultimo[a]?.messaggio || '', log: registro[a] || [], img: reelImg(a) }); }
  const riunioni = (R.riunioni || []).filter((x) => x.in_sala).map((x) => ({ id: x.id, stanza: x.tipo === 'settimanale' ? 'direzione' : 'meeting', partecipanti: x.partecipanti, titolo: x.titolo }));
  return { uffici: PIANTA.map(([id, nome, x, y, w, h, col]) => ({ id, nome, x, y, w, h, col })), agenti, riunioni };
}
let SALA3D = null;
function vaiAgente(a) { if (SALA3D) SALA3D.vaiAgente(a); }
function entraUfficio(u) { if (SALA3D) SALA3D.entraUfficio(u); }
function grandangolo() { if (SALA3D) SALA3D.grandangolo(); }

function chiudiLato() { const l = $('#lato'); if (l) l.classList.remove('aperto'); }

async function apriLato(a) {
  const A = AGENTI[a], R = SALA.dati, I = SALA.info;
  const s = I.st[a];
  const testoStato = { lavora: 'al lavoro', coda: 'parte a breve', errore: 'bloccato' }[s] || 'libero';
  const miei = R.feed.filter((r) => AGID(r.agente) === a).slice(0, 8);
  const ora = I.cosa[a] ? '<div class="ora"><b>Sta facendo</b>' + e(I.cosa[a].testo) + (I.ultimo[a] ? '<div class="mut" style="margin-top:6px">' + e(I.ultimo[a].messaggio) + '</div>' : '') + '<div style="margin-top:10px"><a class="btn" href="' + I.cosa[a].link + '">Guarda il lavoro ▸</a></div></div>' :
    '<div class="ora"><b>Adesso</b>' + (I.ultimo[a] ? 'Ultima cosa fatta: ' + e(I.ultimo[a].messaggio) + ' <span class="mut">(' + fa(I.ultimo[a].quando) + ')</span>' : 'Libero, aspetta un lavoro.') + '</div>';
  // Johnny parla solo con la Direttrice: a chiunque scriva, il messaggio arriva ad Alba che convoca la riunione
  const azione = a === 'capo' ? '<a class="btn" href="#/riunioni">Riunioni e proposte</a>' : A.chat ? '<a class="btn" href="#/chat/' + a + '">Scrivi a ' + e(A.n) + '</a>' : R.squadra[a] ? '<a class="btn sec" href="#/agente/' + a + '">I suoi lavori</a>' : a === 'idee' ? '<a class="btn sec" href="#/copioni">I suoi piani</a>' : '<a class="btn sec" href="#/reel">Comparto Reel</a>';
  const via = a === 'capo' || A.chat ? '' : '<div class="mut" style="font-size:13px;margin-bottom:6px">Il messaggio arriva ad Alba: i capireparto ne parlano in riunione e ti portano le proposte.</div>';
  $('#lato').style.setProperty('--c', A.c || '#888');
  $('#lato').innerHTML = '<button class="sec x" id="lato_x">✕</button><div class="riga"><div class="faccia">' + A.i + '</div><div><h1 style="font-size:21px">' + e(A.n) + '</h1><div class="mut">' + e(A.r) + ' · <b style="color:' + (s === 'lavora' ? 'var(--ok)' : s === 'errore' ? 'var(--err)' : 'var(--mut)') + '">' + testoStato + '</b></div></div></div>' +
    ora + '<p style="font-size:14px;line-height:1.5;color:#4d4b46">' + e(A.d || '') + '</p>' +
    ((A.skill || []).length ? '<div style="margin:8px 0 14px">' + A.skill.map((k) => '<span class="chip">' + e(k) + '</span>').join('') + '</div>' : '') +
    '<div class="riga">' + azione + '</div>' +
    '<div class="scrivi"><h2>' + (a === 'capo' || A.chat ? 'Scrivi a ' + e(A.n) : 'Chiedi qualcosa a ' + e(A.n)) + '</h2>' + via + '<textarea id="lato_t" placeholder="Cosa deve fare? Es. ' + (A.chat ? 'segnami uno shooting il 12' : 'prepara 3 idee per il weekend') + '"></textarea><div class="riga"><button id="lato_go">Manda</button><span class="mut" id="lato_r"></span></div></div>' +
    (miei.length ? '<h2>Ultime attività</h2><div class="log" style="max-height:none">' + miei.map((r) => '<div class="' + r.livello + '"><span class="mut">' + new Date(r.quando).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + '</span> ' + e(r.messaggio) + '</div>').join('') + '</div>' : '');
  $('#lato').classList.add('aperto');
  $('#lato_x').onclick = () => { chiudiLato(); SALA.sel = null; if (SALA.ufficio) entraUfficio(SALA.ufficio); else grandangolo(); };
  $('#lato_go').onclick = async () => {
    const testo = $('#lato_t').value.trim(); if (!testo) return;
    $('#lato_go').disabled = true; $('#lato_r').textContent = 'invio…';
    try {
      if (A.chat) { const r = await chiama('/api/chat/' + a, { method: 'POST', body: { testo } }); $('#lato_r').textContent = r.risposta.slice(0, 160); }
      else { const r = await chiama('/api/capo', { method: 'POST', body: { testo: a === 'capo' ? testo : 'Per ' + A.n + ' (' + A.r + '): ' + testo } }); $('#lato_r').innerHTML = e(r.risposta.slice(0, 160)) + (r.riunione ? ' <a href="#/riunione/' + r.riunione + '">Segui la riunione ▸</a>' : r.avatar ? ' <a href="#/profilo/' + r.avatar + '">Segui il lavoro ▸</a>' : r.post ? ' <a href="#/post/' + r.post + '">Segui il lavoro ▸</a>' : ''); }
      $('#lato_t').value = '';
    } catch (x) { $('#lato_r').textContent = x.message; }
    $('#lato_go').disabled = false;
  };
}

function apriCervello() {
  const R = SALA.dati;
  const tot = R.conti.reduce((a, c) => a + c.n, 0);
  $('#lato').style.setProperty('--c', '#2B59FF');
  $('#lato').innerHTML = '<button class="sec x" id="lato_x">✕</button><div class="riga"><div class="faccia">🧠</div><div><h1 style="font-size:21px">Cervello condiviso</h1><div class="mut">quello che l’agenzia sa e ha fatto</div></div></div>' +
    '<div class="grid" style="grid-template-columns:1fr 1fr;margin-top:14px">' +
    [[R.clienti, 'clienti con scheda'], [tot, 'incarichi in 30 giorni'], [R.da_approvare, 'da approvare'], [R.reel.length, 'reel in lavorazione']].map(([n, t]) => '<div style="background:#141416;color:#fff;border-radius:14px;padding:14px"><div style="font-size:26px;font-weight:700">' + n + '</div><div style="font-size:12px;color:#bdb8ae">' + t + '</div></div>').join('') + '</div>' +
    '<p class="mut" style="margin-top:14px">Ogni agente legge la scheda del cliente, le tue correzioni e il lavoro dei colleghi prima di partire.</p><div class="riga"><a class="btn" href="#/clienti">Schede clienti</a><a class="btn sec" href="#/approvazioni">Approvazioni</a></div>';
  $('#lato').classList.add('aperto');
  $('#lato_x').onclick = chiudiLato;
}

async function azienda() {
  const [R, lavori, riunioni, avatarL, postL] = await Promise.all([chiama('/api/azienda'), chiama('/api/lavori').catch(() => []), chiama('/api/riunioni').catch(() => []), chiama('/api/avatar').catch(() => []), chiama('/api/post').catch(() => [])]);
  Object.assign(AGENTI, R.squadra);
  R.riunioni = riunioni;
  SALA.dati = R;
  const prima = !$('#sala');
  // se la sala è già aperta aggiorno solo i dati (stati, fumetti, saluto) senza muovere la camera
  const { st } = statiAgenti(R);
  const nomi = (ids, col) => ids.slice(0, 3).map((a) => '<b class="n" style="color:' + col + '">' + e(AGENTI[a]?.n || a) + '</b>').join(', ') + (ids.length > 3 ? ' e altri ' + (ids.length - 3) : '');
  const lavorano = Object.keys(st).filter((a) => st[a] === 'lavora'), coda = Object.keys(st).filter((a) => st[a] === 'coda');
  const tutti = Object.keys(AGENTI).filter((a) => a !== 'regia').length;
  const h = new Date().getHours();
  const frase = [
    R.da_approvare ? '<b class="n" style="color:var(--warn)">' + R.da_approvare + (R.da_approvare === 1 ? ' contenuto</b> ti aspetta' : ' contenuti</b> ti aspettano') + ' in approvazione.' : '',
    lavorano.length ? nomi(lavorano, 'var(--teal)') + (lavorano.length === 1 ? ' sta' : ' stanno') + ' lavorando.' : 'Nessuno sta lavorando adesso.',
    coda.length ? nomi(coda, 'var(--warn)') + (coda.length === 1 ? ' parte' : ' partono') + ' a breve.' : '',
    (tutti - lavorano.length - coda.length) + ' sono liberi.',
  ].filter(Boolean).join(' ');
  const saluto = '<div class="saluto"><h1>' + (h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera') + ', Johnny</h1><p>' + frase + '</p></div>';
  if (!prima) {
    $('#saluto').innerHTML = saluto;
    if (SALA3D) SALA3D.aggiorna(datiSala(R)); else datiSala(R);
    if (SALA.sel && $('#lato').classList.contains('aperto')) apriLato(SALA.sel);
    timer = setTimeout(rotta, R.attivi.length || R.reel.length ? 5000 : 15000);
    return;
  }
  const C = await clientiSel('k_cli', '', 'cliente: lo capisce Alba');
  const daScegliere = riunioni.filter((x) => x.stato === 'proposte').map((x) => ({ t: '🗳️ PROPOSTE DA SCEGLIERE', b: x.titolo || x.richiesta || '', link: '#/riunione/' + x.id, img: null, i: '🗳️' }));
  const ultimoReport = riunioni.find((x) => x.tipo === 'settimanale' && x.stato === 'report');
  const daApprovareAv = avatarL.filter((x) => x.stato === 'da_approvare').map((x) => ({ t: '🎭 COPIONI AVATAR DA APPROVARE', b: x.argomento, link: '#/profilo/' + x.id, img: null, i: '🎭' }));
  const daPost = postL.filter((x) => ['da_approvare', 'attende_canva', 'fatto'].includes(x.stato)).slice(0, 4).map((x) => ({ t: x.stato === 'da_approvare' ? '🗂️ CAROSELLI DA APPROVARE' : x.stato === 'attende_canva' ? '🎨 CAROSELLI DA FARE SU CANVA' : '🗂️ CAROSELLI PRONTI', b: (x.cliente || '') + (x.titolo ? ' · ' + x.titolo : ''), link: '#/post/' + x.id, img: x.stato === 'fatto' ? '/api/post/' + x.id + '/slide/1-1.png' : null, i: '🗂️' }));
  const recenti = [...daScegliere, ...daApprovareAv, ...daPost, ...(ultimoReport ? [{ t: '📊 REPORT RIUNIONE OPERATIVA', b: ultimoReport.titolo, link: '#/riunione/' + ultimoReport.id, img: null, i: '📊' }] : []), ...lavori.slice(0, 4).map((L) => ({ t: 'REEL · ' + (L.stato === 'pronto' ? 'pronto' : L.stato === 'errore' ? 'errore' : 'in lavorazione'), b: (L.titolo || L.prompt || '').slice(0, 60), link: '#/lavoro/' + L.id, img: L.stato === 'pronto' ? '/api/lavori/' + L.id + '/anteprima.jpg' : null, i: '🎬' })),
    ...R.recenti.slice(0, 4).map((I) => ({ t: (AGENTI[I.agente]?.n || I.agente) + ' · ' + (ST_INC[I.stato] || I.stato), b: I.titolo, link: '#/incarico/' + I.id, img: null, i: AGENTI[I.agente]?.i || '📄' }))];
  $('#app').innerHTML = '<div id="saluto">' + saluto + '</div>' +
    '<div class="chiedi"><span>🧭</span><input id="k_t" placeholder="Chiedi all’agenzia… es. 6 post per dicembre per A’ Villetta, romantici">' + C + '<button id="k_go">Invia</button></div><div id="k_r"></div>' +
    '<div class="filtri" id="filtri"><button class="on" data-f="">Tutto</button>' + PIANTA.map(([u, n]) => '<button data-f="' + u + '">' + e(n.split(' · ')[0]) + '</button>').join('') + '</div>' +
    '<div class="sala" id="sala"><div class="comandi"><button class="sec" id="torna" style="display:none">← Tutta l’agenzia</button></div>' +
    '<div class="carico" id="carico">Accendo le luci dell’ufficio…</div>' +
    '<div class="legenda"><span style="color:#22A55B">●</span> al lavoro &nbsp; <span style="color:#E8930C">●</span> in coda &nbsp; <span style="color:#8b8780">●</span> libero</div></div>' +
    '<h2>Tocca a te</h2><div class="lavori">' + (recenti.map((x) => '<a class="lavoro-card" href="' + x.link + '"><div class="min" style="' + (x.img ? 'background-image:url(' + x.img + ')' : '') + '">' + (x.img ? '' : x.i) + '</div><div style="min-width:0"><small>' + e(x.t) + '</small><b>' + e(x.b) + '</b><span class="btn" style="padding:5px 12px;font-size:12px">Guarda ▸</span></div></a>').join('') || '<p class="mut">Ancora niente.</p>') + '</div>' +
    '<h2>In diretta</h2><div class="log">' + (R.feed.slice(0, 25).map((r) => { const A = AGENTI[AGID(r.agente)] || AGENTI.regia; return '<div class="' + r.livello + '"><span class="mut">' + new Date(r.quando).toLocaleTimeString('it-IT') + '</span> ' + A.i + ' <b>' + e(A.n) + '</b> ' + e(r.messaggio) + '</div>'; }).join('') || '<div class="mut">ancora niente</div>') + '</div>' +
    '<div class="lato" id="lato"></div>';
  const D = datiSala(R);
  import('/sala3d.js').then((m) => {
    if (!$('#sala')) return;
    SALA3D = m; window.__sala = m;
    m.avvia($('#sala'), D, {
      agente: (a) => { SALA.sel = a; $('#torna').style.display = ''; apriLato(a); },
      ufficio: (u) => { SALA.ufficio = u; SALA.sel = null; chiudiLato(); $('#torna').style.display = ''; },
      vista: () => { SALA.ufficio = null; SALA.sel = null; chiudiLato(); $('#torna').style.display = 'none'; },
      cervello: apriCervello,
    });
    $('#carico').remove();
  }).catch((x) => { $('#carico').textContent = 'La sala 3D non si è caricata (' + x.message + '). Ricarica la pagina.'; });
  document.querySelectorAll('#filtri button').forEach((b) => b.onclick = () => {
    document.querySelectorAll('#filtri button').forEach((x) => x.classList.toggle('on', x === b));
    if (b.dataset.f) entraUfficio(b.dataset.f); else grandangolo();
  });
  $('#torna').onclick = () => { if (SALA.sel && SALA.ufficio) { SALA.sel = null; chiudiLato(); entraUfficio(SALA.ufficio); } else grandangolo(); };
  $('#k_go').onclick = async () => {
    const t = $('#k_t').value.trim(); if (!t) return;
    $('#k_go').disabled = true; $('#k_r').innerHTML = '<p class="mut">Alba sta convocando i capireparto…</p>';
    try {
      const r = await chiama('/api/capo', { method: 'POST', body: { testo: t, cliente_id: $('#k_cli').value || null } });
      $('#k_t').value = '';
      $('#k_r').innerHTML = '<div class="card">🧭 <b>Alba:</b> ' + e(r.risposta) + (r.riunione ? '<div style="margin-top:8px"><a class="btn" href="#/riunione/' + r.riunione + '">Segui la riunione ▸</a></div>' : r.avatar ? '<div style="margin-top:8px"><a class="btn" href="#/profilo/' + r.avatar + '">Segui il lavoro sul profilo ▸</a></div>' : r.post ? '<div style="margin-top:8px"><a class="btn" href="#/post/' + r.post + '">Segui i caroselli ▸</a></div>' : '') + '</div>';
    } catch (x) { $('#k_r').innerHTML = '<div class="err">' + e(x.message) + '</div>'; }
    $('#k_go').disabled = false;
  };
  timer = setTimeout(rotta, R.attivi.length || R.reel.length ? 5000 : 15000);
}

async function agentePagina(id) {
  const R = await chiama('/api/azienda'); Object.assign(AGENTI, R.squadra);
  const A = AGENTI[id];
  const L = await chiama('/api/incarichi?agente=' + id);
  const C = await clientiSel('a_cli', '');
  $('#app').innerHTML = '<a class="mut" href="#/">← Agenzia</a><div class="riga" style="margin-top:8px"><div class="av" style="font-size:34px">' + A.i + '</div><div><h1>' + e(A.n) + ' · ' + e(A.r) + '</h1><div class="mut">' + e(A.d) + '</div><div class="mut">Metodo: ' + (A.skill || []).join(', ') + '</div></div></div>' +
    '<h2>Chiedi qualcosa a ' + e(A.n) + '</h2><div class="card"><p class="mut" style="margin-top:0">Passa da Alba: i capireparto ne parlano in riunione e ti portano le proposte da scegliere.</p><label>Cliente</label>' + C + '<label>Cosa deve fare</label><input id="a_ti" placeholder="Es. 6 post per dicembre"><label>Dettagli (facoltativo)</label><textarea id="a_br" placeholder="Tutto quello che deve sapere: obiettivo, date, prodotti, vincoli…"></textarea><div style="margin-top:12px"><button id="a_go">Manda ad Alba</button></div><div id="a_er" class="err"></div></div>' +
    '<h2>I suoi incarichi</h2>' + (L.map((I) => '<a class="card lav" href="#/incarico/' + I.id + '"><div class="riga"><b style="flex:1">#' + I.id + ' · ' + e(I.titolo) + '</b><span class="pill">' + (ST_INC[I.stato] || I.stato) + '</span></div><div class="mut">' + (I.cliente ? e(I.cliente) + ' · ' : '') + fa(I.aggiornato) + '</div></a>').join('') || '<p class="mut">Nessuno.</p>');
  $('#a_go').onclick = async () => {
    const ti = $('#a_ti').value.trim(); if (!ti) { $('#a_er').textContent = 'scrivi cosa deve fare'; return; }
    try { const r = await chiama('/api/capo', { method: 'POST', body: { testo: 'Per ' + A.n + ' (' + A.r + '): ' + ti + ($('#a_br').value.trim() ? '\\n' + $('#a_br').value.trim() : ''), cliente_id: $('#a_cli').value || null } }); location.hash = r.riunione ? '#/riunione/' + r.riunione : r.avatar ? '#/profilo/' + r.avatar : location.hash; if (!r.riunione && !r.avatar) alert(r.risposta); }
    catch (x) { $('#a_er').textContent = x.message; }
  };
}

function vistaContenuto(c) {
  const h = JSON.parse(c.hashtag || '[]');
  const az = c.stato === 'da_approvare' ? '<button data-ok="' + c.id + '">✅ Approva</button><button class="sec" data-mod="' + c.id + '">✏️ Modifica</button><button class="rosso" data-no="' + c.id + '">Scarta</button>' :
    (c.stato === 'programmato' || c.stato === 'approvato' || c.stato === 'da_pubblicare') ? '<button class="sec" data-pub="' + c.id + '">Segna pubblicato</button><button class="sec" data-mod="' + c.id + '">✏️ Modifica</button>' : '';
  return '<div class="card" id="cn' + c.id + '"><div class="riga"><span class="pill">' + e(c.tipo) + ' · ' + e(c.piattaforma) + '</span><b style="flex:1">' + e(c.titolo || '') + '</b><span class="pill ' + (c.stato === 'da_pubblicare' ? 'errore' : c.stato === 'programmato' ? 'pronto' : '') + '">' + e(c.stato.replace('_', ' ')) + '</span></div>' +
    '<div class="mut">' + (c.cliente ? e(c.cliente) + ' · ' : '') + (c.data ? '📅 ' + e(c.data) + (c.ora ? ' ' + e(c.ora) : '') : 'senza data') + ' · ' + e(AGENTI[c.agente]?.n || '') + '</div>' +
    '<div style="white-space:pre-wrap;margin:8px 0">' + e(c.testo || '') + (h.length ? '\\n\\n' + e(h.join(' ')) : '') + '</div>' +
    (c.visual ? '<div class="mut" style="white-space:pre-wrap">🖼️ ' + e(c.visual) + '</div>' : '') +
    '<div class="riga" style="margin-top:8px">' + az + '<button class="sec" data-copia="' + c.id + '">Copia testo</button></div></div>';
}
function agganciaContenuti(lista, dopo) {
  const trova = (id) => lista.find((x) => String(x.id) === String(id));
  const manda = async (id, body) => { await chiama('/api/contenuti/' + id, { method: 'POST', body }); dopo(); };
  document.querySelectorAll('[data-ok]').forEach((b) => b.onclick = () => manda(b.dataset.ok, { azione: 'approva' }));
  document.querySelectorAll('[data-no]').forEach((b) => b.onclick = () => manda(b.dataset.no, { azione: 'scarta' }));
  document.querySelectorAll('[data-pub]').forEach((b) => b.onclick = () => manda(b.dataset.pub, { azione: 'pubblicato' }));
  document.querySelectorAll('[data-copia]').forEach((b) => b.onclick = async () => { const c = trova(b.dataset.copia); await navigator.clipboard.writeText((c.testo || '') + '\\n\\n' + JSON.parse(c.hashtag || '[]').join(' ')); b.textContent = 'Copiato ✓'; });
  document.querySelectorAll('[data-mod]').forEach((b) => b.onclick = () => {
    const c = trova(b.dataset.mod), box = $('#cn' + c.id);
    box.innerHTML = '<label>Testo</label><textarea id="m_t" style="min-height:160px">' + e(c.testo || '') + '</textarea><div class="riga" style="gap:10px"><div style="flex:1"><label>Data</label><input id="m_d" type="date" value="' + (c.data || '') + '"></div><div style="flex:1"><label>Ora</label><input id="m_o" type="time" value="' + (c.ora || '') + '"></div></div><label>Visual</label><textarea id="m_v" style="min-height:60px">' + e(c.visual || '') + '</textarea><div class="riga" style="margin-top:10px"><button id="m_ok">Salva e approva</button><button class="sec" id="m_s">Solo salva</button></div>';
    const val = () => ({ testo: $('#m_t').value, data: $('#m_d').value || null, ora: $('#m_o').value || null, visual: $('#m_v').value });
    $('#m_ok').onclick = () => manda(c.id, { ...val(), azione: 'approva' });
    $('#m_s').onclick = () => manda(c.id, val());
  });
}

async function incarico(id) {
  const I = await chiama('/api/incarichi/' + id);
  if (!AGENTI.capo) { const R = await chiama('/api/azienda'); Object.assign(AGENTI, R.squadra); }
  const A = AGENTI[I.agente] || { n: I.agente, i: '' }, E = I.esito || {};
  $('#app').innerHTML = '<div class="riga noprint"><a class="mut" href="#/">← Agenzia</a><span style="flex:1"></span><button class="sec" id="i_pr">🖨️ PDF</button><button class="rosso" id="i_del">Elimina</button></div>' +
    '<h1>' + A.i + ' #' + I.id + ' · ' + e(E.titolo || I.titolo) + '</h1><div class="mut">' + e(A.n) + ' · ' + e(A.r || '') + (I.cliente ? ' · ' + e(I.cliente) : '') + ' · ' + (ST_INC[I.stato] || I.stato) + '</div>' +
    (I.stato === 'in_coda' || I.stato === 'in_corso' ? '<div class="card attivo">' + A.i + ' ' + e(A.n) + (I.stato === 'in_corso' ? ' ci sta lavorando…' : I.dipende_da ? ' aspetta il lavoro del collega (#' + I.dipende_da + ')' : ' parte entro un minuto') + (I.errore ? '<div class="mut">' + e(I.errore) + '</div>' : '') + '</div>' : '') +
    (I.stato === 'errore' ? '<div class="card err">' + e(I.errore || '') + ' <button class="sec" id="i_rip">Riprova</button></div>' : '') +
    (I.brief ? '<details class="card"><summary class="mut">Brief</summary><div style="white-space:pre-wrap">' + e(I.brief) + '</div></details>' : '') +
    (E.sintesi ? '<div class="card"><b>In breve</b><p>' + e(E.sintesi) + '</p></div>' : '') +
    (I.contenuti.length ? '<h2>Contenuti (' + I.contenuti.length + ')</h2>' + I.contenuti.map(vistaContenuto).join('') : '') +
    (E.documento ? '<h2>Lavoro</h2><div class="card">' + md(E.documento) + '</div>' : '') +
    ((E.domande || []).length ? '<h2>Domande per te</h2><div class="card">' + lst(E.domande) + '</div>' : '') +
    (I.figli.length ? '<h2>Passato ai colleghi</h2>' + I.figli.map((f) => '<a class="card lav" href="#/incarico/' + f.id + '">' + (AGENTI[f.agente]?.i || '') + ' <b>#' + f.id + ' · ' + e(f.titolo) + '</b> <span class="pill">' + (ST_INC[f.stato] || f.stato) + '</span></a>').join('') : '') +
    (E.documento ? '<h2>Non va bene?</h2><div class="card noprint"><textarea id="i_nota" placeholder="Cosa deve cambiare"></textarea><div style="margin-top:8px"><button class="sec" id="i_rifai">Rifallo con queste correzioni</button></div></div>' : '');
  agganciaContenuti(I.contenuti, rotta);
  $('#i_pr').onclick = () => print();
  $('#i_del').onclick = async () => { if (!confirm('Eliminare questo incarico?')) return; await chiama('/api/incarichi/' + id, { method: 'DELETE' }); location.hash = '#/'; };
  if ($('#i_rip')) $('#i_rip').onclick = async () => { await chiama('/api/incarichi/' + id + '/riprova', { method: 'POST', body: {} }); rotta(); };
  if ($('#i_rifai')) $('#i_rifai').onclick = async () => { const r = await chiama('/api/incarichi/' + id + '/rifai', { method: 'POST', body: { nota: $('#i_nota').value } }); location.hash = '#/incarico/' + r.id; };
  if (I.stato === 'in_coda' || I.stato === 'in_corso' || I.figli.some((f) => f.stato === 'in_coda' || f.stato === 'in_corso')) timer = setTimeout(rotta, 6000);
}

const ST_RIU = { in_corso: 'in corso', proposte: 'proposte da scegliere', decisa: 'decisa', report: 'report pronto', chiusa: 'rifatta', errore: 'errore' };
const PILL_RIU = { in_corso: 'corso', proposte: 'errore', decisa: 'pronto', report: 'pronto', chiusa: '', errore: 'errore' };
// ---------------------------------------------------------------- PROFILO IG: reel con l'avatar di Johnny
const FASI_AV = [['ricerca', '📚 Sofia si documenta'], ['virali', '🔥 Zoe studia i video virali'], ['copioni', '✍️ Nora scrive i copioni'], ['approvazione', '✅ Approvi tu'], ['avatar', '🎭 Ava genera con il tuo avatar'], ['montaggio', '🎬 Il comparto Reel monta'], ['fatto', 'Pronti']];
async function profiloPagina() {
  const L = await chiama('/api/avatar');
  const fase = (x) => (FASI_AV.find((f) => f[0] === x.fase) || [0, x.fase])[1];
  $('#app').innerHTML = '<h1>Profilo Instagram · reel con il tuo avatar</h1><p class="mut">Dai l’argomento ad Alba: Sofia si documenta sul web, Zoe guarda i video simili e quelli virali, Nora scrive i copioni gancio → problema → tensione → soluzione. Tu li approvi, poi Ava li genera con il tuo avatar HeyGen e il comparto Reel li monta con le grafiche del talking head educativo.</p>' +
    '<div class="card"><label>Argomento</label><input id="av_a" placeholder="Es. perché i reel dei ristoranti non funzionano"><div class="riga" style="gap:12px;align-items:end"><div><label>Quanti reel</label><input id="av_n" type="number" min="1" max="10" value="5" style="width:90px"></div><div style="flex:1"><label>Indicazioni (facoltative)</label><input id="av_note" placeholder="Es. tono ironico, parla ai titolari di B&B"></div></div><div style="margin-top:12px"><button id="av_go">Manda ad Alba</button></div><div id="av_er" class="err"></div></div>' +
    '<h2>Argomenti</h2>' + (L.map((x) => '<a class="card lav" href="#/profilo/' + x.id + '"><div class="riga"><b style="flex:1">' + e(x.argomento) + '</b><span class="pill ' + (x.stato === 'da_approvare' ? 'errore' : x.stato === 'fatto' ? 'pronto' : x.stato === 'errore' ? 'errore' : 'corso') + '">' + (x.stato === 'da_approvare' ? 'da approvare' : x.stato === 'attende_avatar' ? 'aspetta l’avatar' : x.stato === 'errore' ? 'errore' : fase(x)) + '</span></div><div class="mut">#' + x.id + ' · ' + x.numero + ' reel · ' + fa(x.aggiornato) + (x.errore ? ' · ' + e(x.errore.slice(0, 90)) : '') + '</div></a>').join('') || '<p class="mut">Ancora nessuno.</p>');
  $('#av_go').onclick = async () => {
    try { const r = await chiama('/api/avatar', { method: 'POST', body: { argomento: $('#av_a').value, numero: Number($('#av_n').value) || 5, note: $('#av_note').value } }); location.hash = '#/profilo/' + r.id; }
    catch (x) { $('#av_er').textContent = x.message; }
  };
  if (L.some((x) => x.stato === 'in_corso')) timer = setTimeout(rotta, 8000);
}

async function profiloDettaglio(id) {
  const A = await chiama('/api/avatar/' + id);
  const i = FASI_AV.findIndex((f) => f[0] === A.fase);
  const passi = '<div class="riga" style="flex-wrap:wrap;gap:6px;margin:10px 0">' + FASI_AV.map((f, k) => '<span class="pill ' + (k < i || A.fase === 'fatto' ? 'pronto' : k === i ? 'corso' : '') + '">' + f[1] + '</span>').join('') + '</div>';
  const R = A.ricerca, V = A.virali;
  const lista = (a) => (a || []).map((x) => '<li>' + e(typeof x === 'string' ? x : x.fatto || x.dato || '') + (x.fonte ? ' <a href="' + e(x.fonte) + '" target="_blank" rel="noopener" class="mut">fonte</a>' : '') + '</li>').join('');
  const vid = (n) => (A.video || []).find((v) => v.n === n), lav = (n) => (A.lavori || []).find((v) => v.n === n);
  const copioni = A.copioni.map((c) => '<div class="card"><div class="riga"><b style="flex:1">' + c.n + '. ' + e(c.titolo || '') + '</b><span class="pill">' + (c.parole || 0) + ' parole</span>' +
    (A.stato === 'da_approvare' ? '<label style="display:flex;gap:6px;font-weight:400"><input type="checkbox" class="av_ok" data-n="' + c.n + '" checked style="width:auto"> approva</label>' : '<span class="pill ' + (c.stato === 'approvato' ? 'pronto' : '') + '">' + e(c.stato) + '</span>') + '</div>' +
    '<p class="mut" style="margin:6px 0">' + e(c.angolo || '') + '</p>' +
    (A.stato === 'da_approvare' ? '<textarea class="av_t" data-n="' + c.n + '" style="min-height:160px">' + e(c.testo || '') + '</textarea>' : '<div style="white-space:pre-wrap">' + e(c.testo || '') + '</div>') +
    '<p class="mut"><b>Cartelli:</b> ' + (c.cartelli || []).map((k) => e(k.testo) + (k.stile === 'barrato' ? ' (barrato)' : '')).join(' · ') + '</p>' +
    '<p class="mut"><b>Caption:</b> ' + e(c.caption || '') + ' ' + e((c.hashtag || []).join(' ')) + '</p>' +
    (vid(c.n) ? '<p>🎭 Avatar: ' + e(vid(c.n).stato) + (vid(c.n).url ? ' · <a href="' + e(vid(c.n).url) + '" target="_blank" rel="noopener">video grezzo</a>' : '') + '</p>' : '') +
    (lav(c.n) ? '<div class="riga" style="gap:8px;flex-wrap:wrap"><a class="btn" href="#/lavoro/' + lav(c.n).lavoro + '">Reel ' + (lav(c.n).stato === 'pronto' ? 'montato' : 'in montaggio') + ' ▸</a>' +
      (lav(c.n).ig_id ? '<span class="pill ' + (lav(c.n).ig_stato === 'pubblicato' ? 'pronto' : lav(c.n).ig_stato === 'errore' ? 'err' : 'corso') + '">📲 ' + e(lav(c.n).ig_stato || 'programmato') + ' · ' + new Date(lav(c.n).ig_quando).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) + '</span>' + (lav(c.n).ig_link ? ' <a href="' + e(lav(c.n).ig_link) + '" target="_blank" rel="noopener">apri su Instagram</a>' : '') + (lav(c.n).ig_errore ? ' <span class="err">' + e(lav(c.n).ig_errore) + '</span>' : '')
        : lav(c.n).stato === 'pronto' ? '<label style="display:flex;gap:6px;align-items:center;font-weight:400"><input type="checkbox" class="ig_ok" data-n="' + c.n + '" checked style="width:auto"> pubblica il</label><input type="datetime-local" class="ig_q" data-n="' + c.n + '" style="width:auto">' : '') + '</div>' : '') + '</div>').join('');
  const daPubblicare = (A.lavori || []).filter((l) => l.stato === 'pronto' && !l.ig_id).length;
  $('#app').innerHTML = '<a class="mut" href="#/profilo">← Profilo IG</a><h1>' + e(A.argomento) + '</h1><div class="mut">#' + A.id + ' · ' + A.numero + ' reel' + (A.note ? ' · ' + e(A.note) : '') + '</div>' + passi +
    (A.errore ? '<div class="card err">' + e(A.errore) + ' <button class="sec" id="av_rp">Riprova</button></div>' : '') +
    (A.stato === 'attende_avatar' ? '<div class="card">🎭 I copioni sono approvati. Ava li genera da sola appena inserisci la chiave HeyGen in ⚙︎ Impostazioni; intanto puoi chiedere a Claude in chat di generarli con il tuo avatar.</div>' : '') +
    (A.copioni.length ? '<h2>Copioni</h2>' + copioni + (A.stato === 'da_approvare' ? '<div class="riga"><button id="av_ok">Approva i selezionati e genera</button></div><div id="av_er" class="err"></div>' : '') : '') +
    (daPubblicare ? '<div class="card"><b>📲 Pubblicazione su Instagram</b><p class="mut">I reel montati vanno sul tuo profilo solo quando premi qui. Orari proposti: uno al giorno alle 19:00 e alle 13:00 alternati; cambiali se vuoi.</p><div class="riga"><button id="ig_go">Programma su Instagram</button></div><div id="ig_er" class="err"></div></div>' : '') +
    (R ? '<h2>Ricerca di Sofia</h2><div class="card"><p>' + e(R.sintesi || '') + '</p><b>Fatti verificati</b><ul>' + lista(R.fatti) + '</ul><b>Numeri</b><ul>' + lista(R.numeri) + '</ul><b>Errori comuni</b><ul>' + lista(R.errori_comuni) + '</ul><b>Domande della gente</b><ul>' + lista(R.domande_della_gente) + '</ul></div>' : '') +
    (V ? '<h2>Video virali studiati da Zoe</h2><div class="card"><b>Ganci che funzionano</b><ul>' + lista(V.ganci_che_funzionano) + '</ul><b>Angoli scoperti</b><ul>' + lista(V.angoli_scoperti) + '</ul><b>Da evitare</b><ul>' + lista(V.da_evitare) + '</ul><b>I video</b><ul>' + (V.video || []).map((v) => '<li><a href="' + e(v.url) + '" target="_blank" rel="noopener">' + e((v.titolo || v.url).slice(0, 90)) + '</a> <span class="mut">' + e(v.piattaforma || '') + (v.views ? ' · ' + Number(v.views).toLocaleString('it-IT') + ' views' : '') + '</span></li>').join('') + '</ul></div>' : '') +
    '<div class="riga" style="margin-top:14px"><button class="sec" id="av_del">Elimina</button></div>';
  if ($('#av_ok')) $('#av_ok').onclick = async () => {
    const n = [...document.querySelectorAll('.av_ok')].filter((x) => x.checked).map((x) => Number(x.dataset.n));
    const modifiche = {}; document.querySelectorAll('.av_t').forEach((x) => { const c = A.copioni.find((k) => k.n === Number(x.dataset.n)); if (c && x.value !== c.testo) modifiche[c.n] = x.value; });
    try { await chiama('/api/avatar/' + id + '/approva', { method: 'POST', body: { n, modifiche } }); rotta(); } catch (x) { $('#av_er').textContent = x.message; }
  };
  const libere = (A.lavori || []).filter((l) => l.stato === 'pronto' && !l.ig_id);
  document.querySelectorAll('.ig_q').forEach((x) => { const k = libere.findIndex((l) => l.n === Number(x.dataset.n)); const d = new Date((A.orari || [])[k] || Date.now() + 864e5); x.value = new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); });
  if ($('#ig_go')) $('#ig_go').onclick = async () => {
    const n = [...document.querySelectorAll('.ig_ok')].filter((x) => x.checked).map((x) => Number(x.dataset.n));
    if (!n.length) { $('#ig_er').textContent = 'seleziona almeno un reel'; return; }
    const quando = {}; document.querySelectorAll('.ig_q').forEach((x) => { if (x.value) quando[x.dataset.n] = new Date(x.value).toISOString(); });
    if (!confirm('Programmare ' + n.length + ' reel sul tuo profilo Instagram? Verranno pubblicati da soli agli orari scelti.')) return;
    try { const r = await chiama('/api/avatar/' + id + '/pubblica', { method: 'POST', body: { n, quando } }); const ko = r.fatti.filter((f) => f.errore); if (ko.length) alert(ko.map((f) => '#' + f.n + ': ' + f.errore).join('\\n')); rotta(); } catch (x) { $('#ig_er').textContent = x.message; }
  };
  if ($('#av_rp')) $('#av_rp').onclick = async () => { await chiama('/api/avatar/' + id + '/riprova', { method: 'POST' }); rotta(); };
  $('#av_del').onclick = async () => { if (!confirm('Eliminare questo argomento?')) return; await chiama('/api/avatar/' + id, { method: 'DELETE' }); location.hash = '#/profilo'; };
  if (['in_corso'].includes(A.stato)) timer = setTimeout(rotta, 8000);
}

async function riunioniPagina() {
  const L = await chiama('/api/riunioni');
  const riga = (x) => '<a class="card lav" href="#/riunione/' + x.id + '"><div class="riga"><b style="flex:1">' + (x.tipo === 'settimanale' ? '📊 ' : '🗳️ ') + e(x.titolo || x.richiesta || 'Riunione') + '</b><span class="pill ' + (PILL_RIU[x.stato] || '') + '">' + (ST_RIU[x.stato] || x.stato) + '</span></div><div class="mut">#' + x.id + ' · ' + new Date(x.creato).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' }) + (x.cliente ? ' · ' + e(x.cliente) : '') + (x.tipo === 'settimanale' ? ' · in direzione' : ' · in sala meeting') + '</div></a>';
  $('#app').innerHTML = '<h1>Riunioni</h1><p class="mut">Parli solo con Alba, la Direttrice. Per ogni tua richiesta i capireparto si riuniscono in sala meeting e ti preparano le proposte: scegli tu, anche modificandole. Ogni lunedì mattina c’è la riunione operativa in direzione con il report della settimana.</p>' +
    '<div class="riga"><button id="r_sett">Convoca adesso la riunione operativa</button></div>' +
    '<h2>Da scegliere</h2>' + (L.filter((x) => x.stato === 'proposte').map(riga).join('') || '<p class="mut">Niente in attesa.</p>') +
    '<h2>Riunioni operative</h2>' + (L.filter((x) => x.tipo === 'settimanale').map(riga).join('') || '<p class="mut">La prima è lunedì mattina (o convocala adesso).</p>') +
    '<h2>Tutte le richieste</h2>' + (L.filter((x) => x.tipo === 'richiesta' && x.stato !== 'proposte').map(riga).join('') || '<p class="mut">Ancora nessuna.</p>');
  $('#r_sett').onclick = async () => { const r = await chiama('/api/riunioni/settimanale', { method: 'POST' }); location.hash = '#/riunione/' + r.id; };
  if (L.some((x) => x.stato === 'in_corso')) timer = setTimeout(rotta, 8000);
}

async function riunionePagina(id) {
  const R = await chiama('/api/riunioni/' + id);
  if (!AGENTI.capo) { const A = await chiama('/api/azienda'); Object.assign(AGENTI, A.squadra); }
  const chi = (a) => { const A = AGENTI[a]; return (A ? A.i + ' ' : '') + '<b>' + e(R.nomi[a] || A?.n || a) + '</b>'; };
  const verbale = R.verbale.length ? '<h2>Verbale</h2><div class="card">' + R.verbale.map((v) => '<p style="margin:6px 0">' + chi(v.chi) + ': ' + e(v.testo) + '</p>').join('') + '</div>' : '';
  const testa = '<a class="mut" href="#/riunioni">← Riunioni</a><h1>' + (R.tipo === 'settimanale' ? '📊 ' : '🗳️ ') + e(R.titolo || 'Riunione') + '</h1>' +
    '<div class="mut">#' + R.id + ' · ' + (R.tipo === 'settimanale' ? 'riunione operativa in direzione' : 'riunione preventiva in sala meeting') + ' · ' + new Date(R.creato).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' }) + (R.cliente ? ' · ' + e(R.cliente) : '') + '</div>' +
    '<div class="mut" style="margin-top:4px">Presenti: ' + R.partecipanti.map((a) => e(R.nomi[a] || a)).join(', ') + '</div>' +
    (R.richiesta ? '<div class="card" style="margin-top:12px"><b>La tua richiesta</b><div style="white-space:pre-wrap">' + e(R.richiesta) + '</div></div>' : '');
  if (R.stato === 'in_corso') {
    $('#app').innerHTML = testa + '<div class="card" style="margin-top:12px">⏳ I capireparto sono in riunione' + (R.tipo === 'settimanale' ? ' in direzione' : ' in sala meeting') + '. Li vedi nella sala 3D. ' + (R.errore ? '<div class="err">' + e(R.errore) + '</div>' : 'Tra qualche minuto qui trovi ' + (R.tipo === 'settimanale' ? 'il report.' : 'le proposte.')) + '</div>';
    timer = setTimeout(rotta, 6000); return;
  }
  if (R.stato === 'errore') { $('#app').innerHTML = testa + '<div class="card err">La riunione non è andata a buon fine: ' + e(R.errore || '') + '</div>'; return; }
  if (R.tipo === 'settimanale') {
    const P = R.report || {};
    const lista = (a) => (a || []).map((x) => '<li>' + e(x) + '</li>').join('');
    $('#app').innerHTML = testa +
      '<div class="card" style="margin-top:12px">🧭 <b>Alba:</b> ' + e(R.messaggio || '') + '<p>' + e(P.sintesi || '') + '</p></div>' +
      (P.numeri?.length ? '<h2>I numeri</h2><div class="riga" style="flex-wrap:wrap;gap:10px">' + P.numeri.map((n) => '<div class="card" style="min-width:150px;margin:0"><div class="mut">' + e(n.etichetta) + '</div><b style="font-size:22px">' + e(n.valore) + '</b></div>').join('') + '</div>' : '') +
      (P.reparti?.length ? '<h2>Reparto per reparto</h2>' + P.reparti.map((x) => '<div class="card"><b>' + e(x.ufficio) + '</b> · ' + e(x.capo || '') + '<p><b>Fatto:</b> ' + e(x.fatto || '') + '</p><p><b>Problemi:</b> ' + e(x.problemi || '') + '</p><p><b>Prossima settimana:</b> ' + e(x.prossima_settimana || '') + '</p></div>').join('') : '') +
      '<h2>Decisioni</h2><div class="card"><ul>' + lista(P.decisioni) + '</ul></div><h2>Priorità della settimana</h2><div class="card"><ol>' + lista(P.priorita) + '</ol></div>' +
      (P.per_johnny?.length ? '<h2>Cosa serve da te</h2><div class="card"><ul>' + lista(P.per_johnny) + '</ul></div>' : '') + verbale;
    return;
  }
  const scelta = R.stato === 'decisa' ? R.scelta : null;
  $('#app').innerHTML = testa +
    '<div class="card" style="margin-top:12px">🧭 <b>Alba:</b> ' + e(R.messaggio || '') + '</div>' +
    '<h2>' + (scelta == null ? 'Scegli come procedere' : 'Hai scelto') + '</h2>' +
    R.proposte.map((P, i) => '<div class="card"' + (scelta === i ? ' style="outline:2px solid var(--teal)"' : scelta != null ? ' style="opacity:.55"' : '') + '><div class="riga"><b style="flex:1;font-size:17px">' + (i + 1) + '. ' + e(P.titolo) + '</b>' + (i === R.consigliata ? '<span class="pill pronto">consigliata</span>' : '') + (P.tempi ? '<span class="pill">' + e(P.tempi) + '</span>' : '') + '</div>' +
      '<p>' + e(P.sintesi || '') + '</p>' + (P.passi?.length ? '<ol>' + P.passi.map((x) => '<li>' + e(x) + '</li>').join('') + '</ol>' : '') +
      '<p class="mut"><b>Pro:</b> ' + e(P.pro || '') + ' · <b>Contro:</b> ' + e(P.contro || '') + '</p>' +
      (P.domande?.length ? '<p class="mut"><b>Domande per te:</b> ' + P.domande.map(e).join(' · ') + '</p>' : '') +
      (scelta == null ? '<label>Vuoi cambiare qualcosa prima di partire? (facoltativo)</label><textarea id="mod_' + i + '" placeholder="Es. niente reel, solo post; aggiungi una storia al giorno; tono più ironico…"></textarea><div class="riga" style="margin-top:8px"><button data-sc="' + i + '">Scegli questa</button></div>' : '') + '</div>').join('') +
    (scelta == null ? '<h2>Nessuna ti convince?</h2><div class="card"><textarea id="r_nota" placeholder="Dì ad Alba cosa non va: i capireparto rifanno la riunione con le tue indicazioni"></textarea><div class="riga" style="margin-top:8px"><button class="sec" id="r_rifai">Rifate la riunione</button></div></div>' : '') +
    (R.esito ? '<h2>Partito</h2><div class="card">' + (R.esito.incarichi || []).map((i) => '<a href="#/incarico/' + i + '">incarico #' + i + '</a>').join(' · ') + (R.esito.reel ? ' · <a href="#/lavoro/' + R.esito.reel + '">reel #' + R.esito.reel + '</a>' : '') + (R.esito.piano ? ' · <a href="#/copioni/' + R.esito.piano + '">copioni #' + R.esito.piano + '</a>' : '') + (R.modifica ? '<p class="mut">Con le tue modifiche: ' + e(R.modifica) + '</p>' : '') + '</div>' : '') +
    verbale + '<div id="r_er" class="err"></div>';
  document.querySelectorAll('[data-sc]').forEach((b) => b.onclick = async () => {
    const i = Number(b.dataset.sc);
    document.querySelectorAll('[data-sc]').forEach((x) => { x.disabled = true; }); b.textContent = 'Alba fa partire gli uffici…';
    try { await chiama('/api/riunioni/' + id + '/scegli', { method: 'POST', body: { indice: i, modifica: $('#mod_' + i).value } }); rotta(); }
    catch (x) { $('#r_er').textContent = x.message; document.querySelectorAll('[data-sc]').forEach((y) => { y.disabled = false; }); b.textContent = 'Scegli questa'; }
  });
  if ($('#r_rifai')) $('#r_rifai').onclick = async () => { const r = await chiama('/api/riunioni/' + id + '/rifai', { method: 'POST', body: { nota: $('#r_nota').value } }); location.hash = '#/riunione/' + r.id; };
}

async function approvazioni() {
  if (!AGENTI.capo) { const R = await chiama('/api/azienda'); Object.assign(AGENTI, R.squadra); }
  const L = await chiama('/api/contenuti');
  const gruppi = [['da_pubblicare', '⏰ Da pubblicare adesso'], ['da_approvare', '✅ Da approvare'], ['programmato', '🗓️ In programmazione'], ['approvato', 'Approvati senza data'], ['pubblicato', 'Pubblicati']];
  $('#app').innerHTML = '<h1>Approvazioni e calendario</h1><p class="mut">Approvi tu, poi Rita li mette in calendario (anche nel gestionale, sezione contenuti). All’ora di uscita ti avvisa: la pubblicazione automatica arriva quando colleghiamo un canale.</p>' +
    gruppi.map(([s, t]) => { const g = L.filter((c) => c.stato === s); return g.length ? '<h2>' + t + ' (' + g.length + ')</h2>' + (s === 'pubblicato' ? g.slice(0, 10) : g).map(vistaContenuto).join('') : ''; }).join('') || '<div class="vuoto">Niente da approvare.</div>';
  agganciaContenuti(L, rotta);
}

async function clientiPagina() {
  const [L, G] = await Promise.all([chiama('/api/clienti'), chiama('/api/gestionale/clienti')]);
  const liberi = G.filter((g) => !L.some((c) => c.gest_id === g.id));
  $('#app').innerHTML = '<h1>Clienti</h1><p class="mut">Ogni cliente ha la sua scheda (scritta da Bianca): tutti gli agenti la leggono prima di lavorare. Vale per qualsiasi nicchia.</p>' +
    (L.map((c) => '<a class="card lav" href="#/cliente/' + c.id + '"><div class="riga"><b style="flex:1">' + e(c.nome) + '</b>' + (c.ha_scheda ? '<span class="pill pronto">scheda ok</span>' : '<span class="pill errore">senza scheda</span>') + (c.gest_id ? '<span class="pill">gestionale</span>' : '') + '</div><div class="mut">' + e(c.nicchia || '') + '</div></a>').join('') || '<p class="mut">Nessun cliente ancora.</p>') +
    '<h2>Nuovo cliente</h2><div class="card">' + (liberi.length ? '<label>Dal gestionale</label><select id="n_g"><option value="">— nuovo —</option>' + liberi.map((g) => '<option value="' + g.id + '">' + e(g.nome) + ' · ' + e(g.servizi || '') + '</option>').join('') + '</select>' : '') +
    '<label>Nome</label><input id="n_n"><label>Nicchia / settore</label><input id="n_s" placeholder="Es. B&B nel Cilento, pizzeria, negozio di abbigliamento…">' +
    '<label>Tutto quello che sai (Bianca ci scrive la scheda)</label><textarea id="n_i" placeholder="Cosa fa, cosa vende, prezzi, chi sono i clienti, tono, sito e profili social, cose da non dire, cosa vuole ottenere…"></textarea>' +
    '<label style="font-weight:400;display:flex;gap:8px"><input type="checkbox" id="n_cg" style="width:auto" checked> crealo anche nel gestionale se non c’è</label>' +
    '<div style="margin-top:12px"><button id="n_go">Crea</button></div><div id="n_er" class="err"></div></div>';
  if ($('#n_g')) $('#n_g').onchange = () => { const g = liberi.find((x) => x.id === $('#n_g').value); if (g) $('#n_n').value = g.nome; };
  $('#n_go').onclick = async () => {
    try { const r = await chiama('/api/clienti', { method: 'POST', body: { nome: $('#n_n').value, nicchia: $('#n_s').value, info: $('#n_i').value, gest_id: $('#n_g') ? $('#n_g').value || null : null, crea_nel_gestionale: $('#n_cg').checked } }); location.hash = '#/cliente/' + r.id; }
    catch (x) { $('#n_er').textContent = x.message; }
  };
}

async function clientePagina(id) {
  const C = await chiama('/api/clienti/' + id);
  if (!AGENTI.capo) { const R = await chiama('/api/azienda'); Object.assign(AGENTI, R.squadra); }
  $('#app').innerHTML = '<div class="riga"><a class="mut" href="#/clienti">← Clienti</a><span style="flex:1"></span><button class="rosso" id="c_del">Elimina</button></div><h1>' + e(C.nome) + '</h1><div class="mut">' + e(C.nicchia || '') + (C.gest_id ? ' · collegato al gestionale' : '') + '</div>' +
    '<h2>Scheda cliente</h2><div class="card">' + (C.scheda ? md(C.scheda) : '<p class="mut">Non ancora scritta.</p>') + '</div>' +
    '<details class="card"><summary><b>✏️ Modifica la scheda a mano</b></summary><textarea id="c_sc" style="min-height:260px">' + e(C.scheda || '') + '</textarea><button id="c_salva" style="margin-top:8px">Salva</button></details>' +
    '<div class="card"><b>🪪 Fai aggiornare la scheda a Bianca</b><textarea id="c_in" placeholder="Nuove informazioni, regole, cose da evitare…" style="margin-top:8px"></textarea><button class="sec" id="c_br" style="margin-top:8px">Manda a Bianca</button></div>' +
    '<label>Note per tutti gli agenti</label><textarea id="c_no" style="min-height:60px">' + e(C.note || '') + '</textarea><button class="sec" id="c_nos" style="margin-top:8px">Salva note</button>' +
    '<h2>Incarichi</h2>' + (C.incarichi.map((I) => '<a class="card lav" href="#/incarico/' + I.id + '">' + (AGENTI[I.agente]?.i || '') + ' <b>#' + I.id + ' · ' + e(I.titolo) + '</b> <span class="pill">' + (ST_INC[I.stato] || I.stato) + '</span></a>').join('') || '<p class="mut">Nessuno.</p>') +
    '<h2>Contenuti</h2>' + (C.contenuti.map((c) => '<div class="card"><span class="pill">' + e(c.tipo) + '</span> <b>' + e(c.titolo || '') + '</b> <span class="mut">' + e(c.data || '') + ' · ' + e(c.stato.replace('_', ' ')) + '</span></div>').join('') || '<p class="mut">Nessuno.</p>');
  $('#c_salva').onclick = async () => { await chiama('/api/clienti/' + id, { method: 'PUT', body: { scheda: $('#c_sc').value } }); rotta(); };
  $('#c_nos').onclick = async () => { await chiama('/api/clienti/' + id, { method: 'PUT', body: { note: $('#c_no').value } }); $('#c_nos').textContent = 'Salvate ✓'; };
  $('#c_br').onclick = async () => { const r = await chiama('/api/clienti/' + id + '/scheda', { method: 'POST', body: { info: $('#c_in').value } }); location.hash = '#/incarico/' + r.id; };
  $('#c_del').onclick = async () => { if (!confirm('Eliminare il cliente dall’agenzia? (nel gestionale resta)')) return; await chiama('/api/clienti/' + id, { method: 'DELETE' }); location.hash = '#/clienti'; };
}

async function chatPagina(canale) {
  if (!AGENTI.capo) { const R = await chiama('/api/azienda'); Object.assign(AGENTI, R.squadra); }
  const A = AGENTI[canale];
  const M = await chiama('/api/chat/' + canale);
  const es = canale === 'gestionale' ? ['Segnami uno shooting il 12 da Torretta alle 9', 'Nuovo cliente Pizzeria Da Gino, referente Gino Rossi, 333 1234567', 'Cosa abbiamo in calendario questa settimana?'] : ['Fammi un preventivo per Da Gino: 8 reel e 2 shooting foto', 'Chi ci deve ancora pagare?', 'Registra un’uscita di 49 € per Canva, oggi'];
  $('#app').innerHTML = (canale === 'capo' ? '<div class="riga"><a class="mut" href="#/">← Agenzia</a><span style="flex:1"></span><button class="sec" id="ch_pul">Nuova chat</button></div>' : SCHEDE_G('#/chat/' + canale) + '<div class="riga"><span style="flex:1"></span><button class="sec" id="ch_pul">Nuova chat</button></div>') + '<h1>' + A.i + ' ' + e(A.n) + ' · ' + e(A.r) + '</h1><div class="mut">' + e(A.d) + '</div>' +
    '<div id="ch_m" class="card" style="max-height:55vh;overflow:auto">' + (M.map((x) => '<div style="margin:8px 0;' + (x.ruolo === 'user' ? 'text-align:right' : '') + '"><span style="display:inline-block;padding:8px 12px;border-radius:12px;white-space:pre-wrap;text-align:left;background:' + (x.ruolo === 'user' ? 'var(--teal);color:#fff' : '#f1eee8') + '">' + e(x.testo) + '</span></div>').join('') || '<div class="mut">Scrivigli cosa fare, per esempio:<ul>' + es.map((x) => '<li>' + e(x) + '</li>').join('') + '</ul></div>') + '</div>' +
    '<div class="riga"><textarea id="ch_t" style="flex:1;min-height:60px" placeholder="Scrivi a ' + e(A.n) + '…"></textarea><button id="ch_go">Invia</button></div><div id="ch_er" class="err"></div>';
  const box = $('#ch_m'); box.scrollTop = box.scrollHeight;
  $('#ch_go').onclick = async () => {
    const t = $('#ch_t').value.trim(); if (!t) return;
    $('#ch_go').disabled = true;
    box.innerHTML += '<div style="text-align:right;margin:8px 0"><span style="display:inline-block;padding:8px 12px;border-radius:12px;background:var(--teal);color:#fff;white-space:pre-wrap;text-align:left">' + e(t) + '</span></div><div class="mut" id="ch_w">' + e(A.n) + ' sta lavorando sul gestionale…</div>';
    box.scrollTop = box.scrollHeight; $('#ch_t').value = '';
    try { await chiama('/api/chat/' + canale, { method: 'POST', body: { testo: t } }); rotta(); }
    catch (x) { $('#ch_er').textContent = x.message; $('#ch_go').disabled = false; }
  };
  $('#ch_pul').onclick = async () => { await chiama('/api/chat/' + canale, { method: 'DELETE' }); rotta(); };
}

async function rotta() {
  clearTimeout(timer);
  const h = location.hash || '#/';
  const s = await fetch('/api/stato').then((r) => r.json());
  if (!s.dentro) return accesso();
  menu(true);
  try {
    if (h.startsWith('#/lavoro/')) await dettaglio(h.split('/')[2]);
    else if (h === '#/nuovo') nuovo();
    else if (h === '#/impostazioni') await impostazioni();
    else if (h === '#/lavori') await lista();
    else if (h === '#/reel') { if (!document.querySelector('.pannello')) await regia(); else timer = setTimeout(rotta, 3000); }
    else if (h.startsWith('#/agente/')) await agentePagina(h.split('/')[2]);
    else if (h.startsWith('#/incarico/')) await incarico(h.split('/')[2]);
    else if (h === '#/approvazioni') await approvazioni();
    else if (h === '#/riunioni') await riunioniPagina();
    else if (h === '#/profilo') await profiloPagina();
    else if (h.startsWith('#/profilo/')) await profiloDettaglio(h.split('/')[2]);
    else if (h.startsWith('#/riunione/')) await riunionePagina(h.split('/')[2]);
    else if (h === '#/clienti') await clientiPagina();
    else if (h.startsWith('#/cliente/')) await clientePagina(h.split('/')[2]);
    else if (h === '#/gestionale') gestionalePagina();
    else if (h === '#/post') await postLista();
    else if (h === '#/post/nuovo') await postNuovo();
    else if (h.startsWith('#/post/')) await postDettaglio(h.split('/')[2]);
    else if (h.startsWith('#/chat/')) await chatPagina(h.split('/')[2]);
    else if (h.startsWith('#/costi')) await costiPagina(Number(h.split('/')[2]) || 30);
    else if (h === '#/copioni') await piani();
    else if (h === '#/copioni/nuovo') nuovoPiano();
    else if (h.startsWith('#/copioni/')) await piano(h.split('/')[2]);
    else await azienda();
  } catch (x) { if (x.message !== 'accesso') $('#app').innerHTML = '<div class="card err">' + e(x.message) + '</div>'; }
}
addEventListener('hashchange', rotta);
rotta();
</script></body></html>`;
