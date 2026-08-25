import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "public", "real-estate-mortgage", "data", "nodes.json");
const artDir = join(root, "public", "real-estate-mortgage", "tiles", "art");
const appDir = join(root, "app", "real-estate-mortgage");
const nodes = JSON.parse(await readFile(source, "utf8"));
await mkdir(artDir, { recursive: true });
await mkdir(appDir, { recursive: true });

const hash = (value) => Number.parseInt(createHash("sha256").update(value).digest("hex").slice(0, 8), 16);
const esc = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const warningPattern = /default|foreclosure|fraud|hazard|risk|crisis|bubble|redlining|exclusion|segregation|capture|delinquency|distress|loss|defect|obsolescence|abandonment|negative amortization|cyber|flood|fire|scarcity|displacement|spite|adverse|lien|cloud on title|encroachment/i;

const lifePalettes = [
  ["#95d6e8", "#f4e8c9", "#4f8c59", "#1f6f78", "#e0a93f", "#c96e4d"],
  ["#a9d9ce", "#fff1d4", "#629a67", "#287f8b", "#df9c43", "#d57c67"],
  ["#b9cfec", "#f8e8cf", "#608c77", "#397b9b", "#e8b44c", "#be7256"],
  ["#c8dfb8", "#fff0d8", "#4f8854", "#4d8b91", "#dea643", "#cf7d54"],
  ["#c9c5e8", "#f6e6c8", "#6f9564", "#3b7d8c", "#e5ad4a", "#c86e65"],
];
const warningPalette = ["#819eb2", "#dfd4be", "#426e61", "#31596e", "#c38b3d", "#9d4f43"];

function flower(x, y, color, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><circle r="10" fill="${color}"/><circle cx="-11" r="7" fill="#fff3db"/><circle cx="11" r="7" fill="#fff3db"/><circle cy="-11" r="7" fill="#fff3db"/><circle cy="11" r="7" fill="#fff3db"/></g>`;
}
function tree(x, y, scale, leaf) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M0 95V8M0 50-28 23M0 36 31 5" stroke="#8a5b35" stroke-width="13" stroke-linecap="round"/><circle cx="-28" cy="4" r="37" fill="${leaf}" stroke="#b78d42" stroke-width="5"/><circle cx="20" cy="-13" r="44" fill="${leaf}" stroke="#b78d42" stroke-width="5"/><circle cx="43" cy="27" r="33" fill="${leaf}" stroke="#b78d42" stroke-width="5"/></g>`;
}
function sun(x, y, gold) {
  return `<g transform="translate(${x} ${y})"><circle r="42" fill="${gold}" stroke="#fff1b9" stroke-width="7"/>${Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return `<path d="M${Math.cos(a)*58} ${Math.sin(a)*58} ${Math.cos(a)*86} ${Math.sin(a)*86}" stroke="${gold}" stroke-width="8" stroke-linecap="round"/>`}).join("")}</g>`;
}
function house(x, y, scale, cream, green, gold, windows = 4) {
  const win = Array.from({length:windows},(_,i)=>{const col=i%2,row=Math.floor(i/2);return `<rect x="${-108+col*152}" y="${-12+row*86}" width="58" height="58" rx="4" fill="#ffe18b" stroke="${gold}" stroke-width="8"/><path d="M${-79+col*152} ${-12+row*86}v58M${-108+col*152} ${17+row*86}h58" stroke="#c38a33" stroke-width="4"/>`}).join("");
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-186-65 0-205 190-65V180H-186Z" fill="${cream}" stroke="${gold}" stroke-width="14"/><path d="M-220-55 0-230 222-55" fill="none" stroke="#4c5962" stroke-width="31" stroke-linejoin="round"/><rect x="-28" y="70" width="68" height="110" rx="4" fill="#a96842" stroke="${gold}" stroke-width="9"/>${win}<path d="M-245 182H245" stroke="${green}" stroke-width="18" stroke-linecap="round"/></g>`;
}
function rootSystem(x, y, gold, green) {
  return `<g transform="translate(${x} ${y})" fill="none" stroke-linecap="round"><path d="M0 0C-18 80-80 110-146 172M0 0C38 71 91 105 163 160M0 0C-3 86 4 146 0 218M-20 65C-88 77-135 99-184 126M25 75C91 88 136 109 191 137" stroke="${gold}" stroke-width="12"/><path d="M0 0C-52 94-60 155-102 222M0 0C61 90 72 157 112 221" stroke="${green}" stroke-width="8"/></g>`;
}
function mapScene(p, seed) {
  const variant = seed % 4;
  if (variant === 1) {
    const contours = Array.from({length:8},(_,i)=>`<path d="M${95+i*19} ${760-i*56}C${250+i*16} ${650-i*19} ${355-i*8} ${735-i*52} ${500+i*12} ${585-i*31}S${750-i*9} ${420+i*13} ${930-i*17} ${300+i*22}" fill="none" stroke="${i%2?p[4]:p[3]}" stroke-width="${7+i%3*2}" opacity="${.42+i*.045}"/>`).join("");
    return `${sun(790,180,p[4])}<path d="M90 810 240 330 418 565 612 248 920 810Z" fill="${p[2]}" stroke="#b7893f" stroke-width="18"/>${contours}${tree(180,660,.58,p[2])}<path d="M134 850C334 690 516 780 878 470" fill="none" stroke="#f7e59c" stroke-width="21" stroke-dasharray="7 24"/>`;
  }
  if (variant === 2) {
    return `${[0,1,2,3,4].map((i)=>`<path d="M${190+i*23} ${760-i*92}  ${745-i*19} ${720-i*92}  ${824-i*9} ${390-i*72}  ${250+i*12} ${430-i*72}Z" fill="${[p[2],p[1],p[0],p[3],"#fff2d5"][i]}" stroke="#b7893f" stroke-width="14"/>`).join("")}<path d="M322 244 748 218 780 484 350 510Z" fill="none" stroke="${p[5]}" stroke-width="15" stroke-dasharray="24 14"/><path d="M568 188c-67 0-112 49-112 108 0 94 112 184 112 184s112-90 112-184c0-59-45-108-112-108Z" fill="${p[4]}" stroke="#fff0ad" stroke-width="11"/><circle cx="568" cy="294" r="35" fill="${p[3]}"/>`;
  }
  if (variant === 3) {
    return `<path d="M116 152H908V866H116Z" fill="${p[2]}" stroke="#b7893f" stroke-width="17"/><path d="M126 794C286 656 350 670 455 512S694 330 900 214" fill="none" stroke="#fff4bc" stroke-width="78" stroke-linecap="round"/><path d="M126 794C286 656 350 670 455 512S694 330 900 214" fill="none" stroke="${p[4]}" stroke-width="17" stroke-dasharray="8 26" stroke-linecap="round"/>${[170,330,510,690,830].map((x,i)=>tree(x,240+(i%2)*420,.44,p[2])).join("")}<path d="M100 860C290 780 370 866 520 790S760 708 934 760" fill="none" stroke="${p[3]}" stroke-width="30"/>`;
  }
  const cells = Array.from({length:18},(_,i)=>{const col=i%6,row=Math.floor(i/6);const dx=((seed>>(i%16))&3)*4;return `<path d="M${120+col*128+dx} ${210+row*190}h${102-dx}v${150+(i%3)*8}h-${102-dx}Z" fill="${i%5===0?p[1]:i%3===0?p[2]:p[0]}" stroke="#b7893f" stroke-width="7"/>`}).join("");
  return `${cells}<path d="M70 810C210 620 320 742 455 530S725 390 944 142" fill="none" stroke="${p[3]}" stroke-width="62" stroke-linecap="round"/><path d="M70 790C225 620 330 735 462 526S730 395 945 158" fill="none" stroke="#e6c350" stroke-width="15" stroke-linecap="round" stroke-dasharray="4 25"/>${tree(170,185,.55,p[2])}${tree(794,684,.48,p[2])}`;
}
function homeScene(p, seed, mortgage = false) {
  if (seed % 4 === 1) return `${sun(810,170,p[4])}${house(512,390,.82,p[1],p[2],p[4],4)}${rootSystem(512,550,p[4],p[3])}${[210,315,708,815].map((x,i)=>flower(x,790,p[5],.7+i%2*.15)).join("")}`;
  if (seed % 4 === 2) return `${networkScene(p,seed)}<path d="M330 874H694" stroke="${p[4]}" stroke-width="15" stroke-dasharray="10 18"/>`;
  if (seed % 4 === 3) return `${sun(806,175,p[4])}<path d="M306 824V272H718V824" fill="${p[1]}" stroke="#b6873c" stroke-width="25"/><path d="M306 272 512 126 718 272" fill="${p[0]}" stroke="#b6873c" stroke-width="25"/><path d="M420 824V460H604V824" fill="${p[2]}" stroke="${p[4]}" stroke-width="20"/><path d="M466 642C466 616 488 594 514 594s48 22 48 48" fill="none" stroke="#ffe18a" stroke-width="13"/>${tree(205,706,.5,p[2])}${tree(816,706,.5,p[2])}${flower(380,844,p[5],.75)}${flower(650,844,p[5],.75)}`;
  const base = `${sun(804,174,p[4])}${tree(175,395,.7,p[2])}${house(500,420,1,p[1],p[2],p[4],4)}${rootSystem(500,608,p[4],p[3])}${flower(225,760,p[5],.7)}${flower(773,760,p[5],.8)}`;
  if (!mortgage) return base;
  const beads = Array.from({length:15},(_,i)=>`<circle cx="${165+i*49}" cy="${820-Math.sin(i/14*Math.PI)*75}" r="${11+i*.5}" fill="${p[4]}" stroke="#fff0ad" stroke-width="4"/>`).join("");
  return `${base}<path d="M150 820C360 710 630 710 850 820" fill="none" stroke="#aa7938" stroke-width="14"/>${beads}`;
}
function documentScene(p, seed) {
  if (seed % 3 === 1) return `<path d="M190 222H806V806H190Z" fill="${p[1]}" stroke="#b9873a" stroke-width="19"/>${[0,1,2,3].map((i)=>`<circle cx="${300+i*142}" cy="${354+i%2*108}" r="62" fill="${i%2?p[0]:p[2]}" stroke="${p[4]}" stroke-width="14"/><path d="M${362+i*142} ${354+i%2*108}h${48}" stroke="${p[5]}" stroke-width="12"/>`).join("")}<path d="M286 646H710M286 706H652" stroke="#92734a" stroke-width="14" stroke-linecap="round"/><circle cx="690" cy="714" r="70" fill="${p[5]}" stroke="${p[4]}" stroke-width="16"/>`;
  if (seed % 3 === 2) return `<path d="M242 152H736V814H242Z" fill="${p[1]}" stroke="#b9873a" stroke-width="19"/><path d="M332 292H656M332 376H684M332 460H628" stroke="#8c7048" stroke-width="15" stroke-linecap="round"/><path d="M300 650C370 560 438 700 512 610S660 542 722 630" fill="none" stroke="${p[3]}" stroke-width="17"/><path d="M210 766C270 690 330 696 380 744" fill="none" stroke="#b9873a" stroke-width="18"/><circle cx="716" cy="690" r="104" fill="${p[5]}" stroke="${p[4]}" stroke-width="21"/><path d="M650 690 700 738 785 630" fill="none" stroke="#fff0ba" stroke-width="17"/>`;
  return `<path d="M244 142H663L798 278V840H244Z" fill="${p[1]}" stroke="#b9873a" stroke-width="19"/><path d="M663 142V278H798" fill="${p[0]}" stroke="#b9873a" stroke-width="15"/><path d="M338 344H694M338 430H722M338 516H650M338 602H704" stroke="#8c7048" stroke-width="15" stroke-linecap="round"/><circle cx="642" cy="714" r="78" fill="${p[5]}" stroke="${p[4]}" stroke-width="18"/><path d="M604 714 632 744 687 678" fill="none" stroke="#fff1c8" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/><g transform="translate(264 708)"><circle r="74" fill="${p[0]}aa" stroke="${p[3]}" stroke-width="15"/><path d="M52 52 120 120" stroke="${p[3]}" stroke-width="28" stroke-linecap="round"/></g>`;
}
function capitalScene(p, seed) {
  if (seed % 3 === 1) return networkScene(p,seed);
  if (seed % 3 === 2) return `${gaugeScene(p,seed)}<path d="M248 842H776" stroke="${p[4]}" stroke-width="16" stroke-dasharray="16 18"/>`;
  const tiers = [
    [190,690,640,150,p[3]], [245,555,530,135,p[0]], [305,435,410,120,p[4]], [370,330,280,105,p[5]]
  ].map(([x,y,w,h,c])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="28" fill="${c}" stroke="#b9883e" stroke-width="15"/>`).join("");
  const flow = `<path d="M512 185V334M512 435V555M512 690V840" stroke="#ffe29a" stroke-width="21" stroke-linecap="round"/><path d="m480 810 32 42 32-42" fill="none" stroke="#ffe29a" stroke-width="16"/>`;
  return `${sun(512,150,p[4])}${tiers}${flow}<path d="M215 840C332 768 406 870 512 808S700 744 826 812" fill="none" stroke="#d9f3ee" stroke-width="14"/>`;
}
function networkScene(p, seed) {
  const positions=[[205,245],[512,185],[815,245],[175,665],[512,770],[850,665]];
  const lines=positions.map(([x,y])=>`<path d="M${x} ${y} 512 500" stroke="${p[3]}" stroke-width="18"/>`).join("");
  const homes=positions.map(([x,y],i)=>house(x,y,.28,p[1],p[2],p[4],2)).join("");
  return `${lines}<circle cx="512" cy="500" r="126" fill="${p[0]}" stroke="${p[4]}" stroke-width="19"/><path d="M440 510C478 450 551 450 590 510S665 571 700 520" fill="none" stroke="#fff0b4" stroke-width="16"/>${homes}`;
}
function gaugeScene(p, seed) {
  if (seed % 2) return `<path d="M512 184V792M282 316H742M282 316 164 626M742 316 860 626" stroke="#b78539" stroke-width="21" stroke-linecap="round"/><path d="M110 626Q164 760 218 626Z" fill="${p[0]}" stroke="${p[4]}" stroke-width="15"/><path d="M806 626Q860 760 914 626Z" fill="${p[2]}" stroke="${p[4]}" stroke-width="15"/><circle cx="512" cy="184" r="54" fill="${p[4]}" stroke="#fff0b5" stroke-width="10"/><path d="M318 806H706" stroke="${p[3]}" stroke-width="32" stroke-linecap="round"/>`;
  const ticks=Array.from({length:13},(_,i)=>{const a=Math.PI*.78+i*Math.PI*1.44/12;const x1=512+Math.cos(a)*265,y1=520+Math.sin(a)*265,x2=512+Math.cos(a)*225,y2=520+Math.sin(a)*225;return `<path d="M${x1} ${y1} ${x2} ${y2}" stroke="#b78539" stroke-width="12" stroke-linecap="round"/>`}).join("");
  const angle=Math.PI*.9+(seed%100)/100*Math.PI*1.2;
  return `<circle cx="512" cy="520" r="326" fill="${p[1]}" stroke="#b78539" stroke-width="21"/><circle cx="512" cy="520" r="278" fill="${p[0]}88" stroke="${p[3]}" stroke-width="12"/>${ticks}<path d="M512 520  ${512+Math.cos(angle)*190} ${520+Math.sin(angle)*190}" stroke="${p[5]}" stroke-width="23" stroke-linecap="round"/><circle cx="512" cy="520" r="45" fill="${p[4]}" stroke="#fff0b5" stroke-width="9"/><path d="M270 760C382 700 454 770 532 716S689 661 775 720" fill="none" stroke="${p[2]}" stroke-width="18"/>`;
}
function thresholdScene(p, seed) {
  if (seed % 3 === 1) return `${sun(808,170,p[4])}<path d="M218 822H806V730H218Z" fill="${p[2]}" stroke="#b6843b" stroke-width="18"/><path d="M312 730V290H712V730" fill="${p[1]}" stroke="#b6843b" stroke-width="26"/><path d="M312 290 512 142 712 290" fill="${p[0]}" stroke="#b6843b" stroke-width="26"/><path d="M405 730V430H619V730" fill="${p[3]}" stroke="${p[4]}" stroke-width="22"/><circle cx="565" cy="574" r="18" fill="#ffe390"/><path d="M140 846C320 730 370 800 512 700S746 620 892 680" fill="none" stroke="${p[5]}" stroke-width="18"/>`;
  if (seed % 3 === 2) return `<circle cx="390" cy="410" r="150" fill="none" stroke="${p[4]}" stroke-width="36"/><path d="M496 516 812 832M650 670 742 578M710 730 798 642" stroke="${p[4]}" stroke-width="40" stroke-linecap="round"/><path d="M152 846H876" stroke="${p[3]}" stroke-width="20"/><path d="M160 780C290 682 410 742 518 628" fill="none" stroke="#fff2b5" stroke-width="18" stroke-dasharray="8 24"/>`;
  return `${sun(790,165,p[4])}<path d="M118 856C220 690 270 654 354 603S472 494 512 395 650 284 884 175" fill="none" stroke="${p[1]}" stroke-width="128" stroke-linecap="round"/><path d="M118 856C220 690 270 654 354 603S472 494 512 395 650 284 884 175" fill="none" stroke="${p[4]}" stroke-width="18" stroke-dasharray="8 30" stroke-linecap="round"/><path d="M330 670V440H688V670" fill="none" stroke="#b6843b" stroke-width="28"/><path d="M330 440 509 280 688 440" fill="${p[0]}" stroke="#b6843b" stroke-width="28" stroke-linejoin="round"/>${tree(190,390,.48,p[2])}${tree(818,516,.55,p[2])}`;
}
function constructionScene(p, seed) {
  if (seed % 3 === 1) return `${sun(820,175,p[4])}<path d="M110 730C250 520 380 520 512 730S770 940 914 730" fill="none" stroke="#b6873d" stroke-width="38"/><path d="M130 734H894" stroke="${p[3]}" stroke-width="28"/><path d="M220 734 338 534M804 734 686 534" stroke="#b6873d" stroke-width="20"/>${tree(176,658,.45,p[2])}${tree(848,658,.45,p[2])}<path d="M160 810H864" stroke="${p[4]}" stroke-width="15" stroke-dasharray="22 18"/>`;
  if (seed % 3 === 2) return `<path d="M166 820H858V270H166Z" fill="${p[1]}" stroke="#b6873d" stroke-width="20"/>${Array.from({length:7},(_,i)=>`<path d="M166 ${330+i*70}H858" stroke="${i%2?p[4]:p[5]}" stroke-width="13"/>`).join("")}<path d="M512 270V820" stroke="${p[3]}" stroke-width="24"/><path d="M512 270 438 430 540 544 470 674 512 820" fill="none" stroke="#fff0ad" stroke-width="19"/><path d="M640 684H760V820H640Z" fill="${p[2]}" stroke="#b6873d" stroke-width="14"/>`;
  const floors=Array.from({length:5},(_,i)=>`<rect x="284" y="${690-i*100}" width="448" height="84" fill="${i%2?p[1]:p[0]}" stroke="#b6873d" stroke-width="13"/><rect x="330" y="${714-i*100}" width="72" height="40" fill="#ffe38d"/><rect x="466" y="${714-i*100}" width="72" height="40" fill="#ffe38d"/><rect x="602" y="${714-i*100}" width="72" height="40" fill="#ffe38d"/>`).join("");
  return `${sun(800,180,p[4])}<path d="M208 808V178H266V808M238 210H790M516 210V320M790 210V508" fill="none" stroke="#b6873d" stroke-width="24"/><path d="M754 508h72l-36 62Z" fill="${p[5]}" stroke="#b6873d" stroke-width="9"/>${floors}${tree(180,730,.45,p[2])}${tree(823,730,.45,p[2])}`;
}
function technologyScene(p, seed) {
  if (seed % 2) return `${networkScene(p,seed)}<path d="M372 886H652" stroke="#b6883f" stroke-width="17"/><circle cx="512" cy="500" r="44" fill="#fff2bd"/>`;
  const points=Array.from({length:18},(_,i)=>{const a=i*Math.PI*2/18,r=215+(i%3)*45,x=512+Math.cos(a)*r,y=500+Math.sin(a)*r;return [x,y]} );
  return `<rect x="170" y="118" width="684" height="748" rx="76" fill="${p[0]}" stroke="#b6883f" stroke-width="22"/><rect x="218" y="172" width="588" height="606" rx="38" fill="${p[1]}" stroke="${p[3]}" stroke-width="12"/>${points.map(([x,y],i)=>`<path d="M512 500 ${x} ${y}" stroke="${i%2?p[3]:p[2]}" stroke-width="9" opacity=".8"/><circle cx="${x}" cy="${y}" r="${15+(i%4)*3}" fill="${i%3?p[4]:p[5]}" stroke="#fff0b2" stroke-width="5"/>`).join("")}<circle cx="512" cy="500" r="76" fill="${p[2]}" stroke="${p[4]}" stroke-width="14"/><circle cx="512" cy="822" r="18" fill="${p[4]}"/>`;
}
function riskScene(p, seed) {
  if (seed % 3 === 1) return `<path d="M104 188H920V824H104Z" fill="${p[0]}" stroke="#b58339" stroke-width="18"/>${house(512,330,.62,p[1],p[2],p[4],4)}<path d="M98 560C230 510 340 590 512 540S794 498 930 548V828H98Z" fill="${p[3]}" stroke="#e6c681" stroke-width="11"/><path d="M250 720H774" stroke="#dcc985" stroke-width="27"/><path d="M276 720v108M748 720v108" stroke="#dcc985" stroke-width="23"/><circle cx="512" cy="710" r="88" fill="#75524b" stroke="${p[4]}" stroke-width="16"/><path d="M464 704h96v104h-96Z" fill="${p[1]}"/><path d="M485 704v-45c0-36 54-36 54 0v45" fill="none" stroke="${p[4]}" stroke-width="18"/>`;
  if (seed % 3 === 2) return `<path d="M130 810H894" stroke="#b58339" stroke-width="22"/>${[0,1,2,3,4].map((i)=>`<rect x="${190+i*130}" y="${270+i*85}" width="82" height="${540-i*85}" fill="${i<2?p[3]:i<4?p[4]:p[5]}" stroke="#fff0ba" stroke-width="8"/>`).join("")}<path d="M178 234C320 288 402 356 512 438S730 654 872 742" fill="none" stroke="#8d473f" stroke-width="26"/><path d="m822 708 58 42-68 26" fill="none" stroke="#8d473f" stroke-width="22"/>`;
  return `<path d="M90 240C250 160 350 220 512 160S792 160 934 236V758C760 690 650 780 512 718S230 742 90 796Z" fill="${p[3]}" stroke="#b58339" stroke-width="17"/><path d="M512 170 468 324 548 430 456 568 530 716 486 864" fill="none" stroke="#f2d48c" stroke-width="24" stroke-linecap="round"/><path d="M512 430 650 354M456 568 310 500M530 716 692 646" stroke="#f2d48c" stroke-width="15" stroke-linecap="round"/>${house(250,340,.38,p[1],p[2],p[4],2)}<path d="M684 244 824 520H544Z" fill="${p[4]}" stroke="#fff0ba" stroke-width="13"/><circle cx="684" cy="410" r="16" fill="#7e3e35"/><path d="M684 304V374" stroke="#7e3e35" stroke-width="20" stroke-linecap="round"/>`;
}
function historyScene(p, seed) {
  return `<path d="M120 720H904" stroke="#b6883d" stroke-width="22" stroke-linecap="round"/>${[190,350,512,675,835].map((x,i)=>`<circle cx="${x}" cy="720" r="27" fill="${i%2?p[4]:p[3]}" stroke="#fff0b4" stroke-width="7"/><path d="M${x} 690V${560-i%2*90}" stroke="#b6883d" stroke-width="11"/>`).join("")}${house(190,472,.25,p[1],p[2],p[4],2)}<path d="M315 560H405V420H458V560" fill="${p[1]}" stroke="#b6883d" stroke-width="12"/>${house(512,410,.38,p[1],p[2],p[4],2)}<path d="M640 560H714V340H778V560M790 560V280H842V560" fill="${p[0]}" stroke="#b6883d" stroke-width="12"/>${sun(820,170,p[4])}`;
}
function personScene(p, seed) {
  return `<circle cx="512" cy="390" r="238" fill="${p[0]}" stroke="#b6883d" stroke-width="22"/><circle cx="512" cy="338" r="78" fill="${p[1]}" stroke="#9f7437" stroke-width="12"/><path d="M330 572C358 458 426 426 512 426S668 458 694 572" fill="${p[2]}" stroke="#9f7437" stroke-width="14"/><path d="M176 790C314 646 434 756 512 652S702 608 854 742" fill="none" stroke="${p[3]}" stroke-width="26"/><path d="M188 842H836" stroke="#b6883d" stroke-width="14" stroke-dasharray="25 15"/>${sun(802,196,p[4])}`;
}
function chooseScene(node, p, seed) {
  const name = node.name;
  const family = node.family_slug;
  if (warningPattern.test(name) || node.kind === "pathology-or-event") return riskScene(p, seed);
  if (/person/.test(node.kind)) return personScene(p, seed);
  if (/history-events/.test(family)) return historyScene(p, seed);
  if (/proptech|digital|cyber/.test(family) || /algorithm|data|digital|automated|platform|token|smart contract|blockchain/i.test(name)) return technologyScene(p, seed);
  if (/construction|building-systems|development-entitlement/.test(family)) return constructionScene(p, seed);
  if (/title-deeds|documents-custody|closing-disclosures|appraisal-valuation|survey-boundary/.test(family) || /deed|title|note|document|record|policy|disclosure|report|agreement|contract|survey|plat|appraisal/i.test(name)) return documentScene(p, seed);
  if (/securitization|bond-math|whole-loan|msr-economics|cre-finance|cre-metrics|investment-capital|secondary-market/.test(family) || /capital|tranche|waterfall|security|bond|yield|equity|debt|loan|warehouse|liquidity/i.test(name)) return capitalScene(p, seed);
  if (/roles-institutions|affordable-housing|government-mortgages/.test(family) || node.kind === "actor-or-institution") return networkScene(p, seed);
  if (/metric-or-force/.test(node.kind) || /rate|ratio|value|income|price|duration|spread|score|index/i.test(name)) return gaugeScene(p, seed);
  if (/land-place|property-rights|estates-tenure|zoning-urbanism|neighborhood-infrastructure|strange-property|global-models/.test(family) || /parcel|land|boundary|zoning|easement|street|district|neighborhood/i.test(name)) return mapScene(p, seed);
  if (/mortgage|home|house|dwelling|shelter|residential|lease|tenant|owner|borrower/i.test(`${name} ${family}`)) return homeScene(p, seed, /mortgage|loan|amortization|refinance/i.test(name));
  if (node.kind === "process" || /origination|underwriting|transaction|inspection/.test(family)) return thresholdScene(p, seed);
  return mapScene(p, seed);
}

function ornament(seed, p) {
  const count = 9 + seed % 7;
  return Array.from({length:count},(_,i)=>{const a=(i/count)*Math.PI*2;const r=412;const x=512+Math.cos(a)*r,y=512+Math.sin(a)*r;return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${5+i%3*2}" fill="${i%2?p[4]:p[3]}" opacity=".78"/>`}).join("");
}

function microInlay(seed, p) {
  const field = Array.from({ length: 28 }, (_, i) => {
    const col = i % 7;
    const row = Math.floor(i / 7);
    const x = 118 + col * 132 + ((seed >> (i % 15)) & 7);
    const y = 116 + row * 252 + ((seed >> ((i + 4) % 15)) & 9);
    const radius = 5 + (i % 4);
    return `<g opacity=".32"><circle cx="${x}" cy="${y}" r="${radius}" fill="${i % 3 ? p[4] : p[3]}"/><path d="M${x - 18} ${y}h${36 + i % 5 * 3}M${x} ${y - 18}v${36 + i % 4 * 4}" stroke="#fff6cf" stroke-width="2.5" stroke-linecap="round"/></g>`;
  }).join("");
  const cadastral = Array.from({ length: 10 }, (_, i) => {
    const y = 126 + i * 78;
    const bend = 42 + ((seed >> (i % 16)) & 31);
    return `<path d="M86 ${y}h${bend}m${760 - bend} 0h72" stroke="${i % 2 ? p[3] : p[4]}" stroke-width="3" opacity=".25"/>`;
  }).join("");
  return `${field}${cadastral}`;
}

function tileSvg(node, index) {
  const seed = hash(node.id);
  const warning = warningPattern.test(node.name) || node.kind === "pathology-or-event";
  const p = warning ? warningPalette : lifePalettes[seed % lifePalettes.length];
  const scene = chooseScene(node, p, index);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-labelledby="title desc"><title id="title">${esc(node.name)} enamel tile</title><desc id="desc">${esc(node.visual_direction)}</desc><defs><linearGradient id="brass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#6e451d"/><stop offset=".22" stop-color="#f5d783"/><stop offset=".47" stop-color="#a8752e"/><stop offset=".72" stop-color="#ffe39a"/><stop offset="1" stop-color="#815526"/></linearGradient><radialGradient id="field" cx="28%" cy="18%" r="96%"><stop stop-color="${p[0]}"/><stop offset=".54" stop-color="${p[1]}"/><stop offset="1" stop-color="${warning?"#596e70":"#d6e6bd"}"/></radialGradient><filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="24" stdDeviation="19" flood-color="#3c301c" flood-opacity=".35"/></filter><filter id="enamel"><feTurbulence baseFrequency=".42" numOctaves="3" seed="${seed%97}" type="fractalNoise" result="grain"/><feColorMatrix in="grain" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 .12 0"/><feBlend in="SourceGraphic" mode="soft-light"/><feSpecularLighting surfaceScale="2" specularConstant=".28" specularExponent="18" lighting-color="#fff7d2" result="spec"><feDistantLight azimuth="225" elevation="58"/></feSpecularLighting><feComposite in="spec" in2="SourceGraphic" operator="in" result="specOut"/><feBlend in="SourceGraphic" in2="specOut" mode="screen"/></filter><clipPath id="clip"><rect x="60" y="60" width="904" height="904" rx="124"/></clipPath></defs><rect width="1024" height="1024" fill="#f2ead8"/><g filter="url(#shadow)"><rect x="45" y="45" width="934" height="934" rx="142" fill="url(#brass)"/><rect x="62" y="62" width="900" height="900" rx="122" fill="url(#field)" stroke="#6e4b25" stroke-width="8"/></g><g clip-path="url(#clip)" filter="url(#enamel)"><path d="M58 620C210 550 350 605 492 548S774 432 968 500V968H58Z" fill="${p[2]}" opacity=".2"/>${microInlay(seed,p)}${scene}${ornament(seed,p)}<path d="M122 152Q512 70 902 152" fill="none" stroke="#fff" stroke-opacity=".34" stroke-width="20" stroke-linecap="round"/></g><rect x="62" y="62" width="900" height="900" rx="122" fill="none" stroke="url(#brass)" stroke-width="18"/><path d="M99 820Q512 944 925 820" fill="none" stroke="#7a4c1d" stroke-opacity=".35" stroke-width="9"/></svg>`;
}

const cards = [];
for (const [index, node] of nodes.entries()) {
  const number = String(index + 1).padStart(3, "0");
  const filename = `${number}-${node.slug}.svg`;
  const svg = tileSvg(node, index);
  await writeFile(join(artDir, filename), svg);
  cards.push({
    ...node,
    number,
    artwork: `/real-estate-mortgage/tiles/art/${filename}`,
    featuredArtwork: node.slug === "thirty-year-fixed-mortgage" ? "/real-estate-mortgage/tiles/featured/thirty-year-fixed-mortgage.png" : null,
    tone: warningPattern.test(node.name) || node.kind === "pathology-or-event" ? "warning" : "life-light",
    relationshipCount: node.relationships.length,
  });
}

const manifest = cards.map(({ id, number, name, slug, family, family_slug, kind, artwork, featuredArtwork, tone, relationshipCount }) => ({ id, number, name, slug, family, family_slug, kind, artwork, featuredArtwork, tone, relationshipCount }));
await writeFile(join(appDir, "cards.generated.json"), `${JSON.stringify(cards)}\n`);
await writeFile(join(root, "public", "real-estate-mortgage", "tiles", "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Generated ${cards.length} unique enamel SVG masters (${cards.filter((card) => card.tone === "warning").length} warning, ${cards.filter((card) => card.tone === "life-light").length} life-light).`);
