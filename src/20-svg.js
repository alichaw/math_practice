/* ══════════════════════════════════════════════════════════════════════
   可重複使用的響應式 SVG 圖形元件
   每個元件皆接受 {data, highlight, reveal}
   highlight：提示第二級時標亮指定的邊、角、弧或對稱軸
   reveal   ：解析狀態才顯示的關鍵標籤
   ══════════════════════════════════════════════════════════════════════ */
function rad(d){ return d * Math.PI / 180; }
function polar(cx, cy, r, deg){ return [cx + r * Math.cos(rad(deg)), cy - r * Math.sin(rad(deg))]; }
function fx(n){ return Math.round(n * 10) / 10; }
function unit(P, Q){ var dx = Q[0]-P[0], dy = Q[1]-P[1], L = Math.hypot(dx, dy) || 1; return [dx/L, dy/L]; }
function midp(P, Q){ return [(P[0]+Q[0])/2, (P[1]+Q[1])/2]; }
function angOf(V, P){ return Math.atan2(V[1]-P[1], P[0]-V[0]) * 180 / Math.PI; }
function norm180(d){ while(d > 180) d -= 360; while(d < -180) d += 360; return d; }

function arcPath(cx, cy, r, a1, a2){
  var p1 = polar(cx, cy, r, a1), p2 = polar(cx, cy, r, a2);
  var large = Math.abs(a2 - a1) > 180 ? 1 : 0;
  var sweep = a2 > a1 ? 0 : 1;
  return 'M' + fx(p1[0]) + ' ' + fx(p1[1]) + ' A' + r + ' ' + r + ' 0 ' + large + ' ' + sweep +
         ' ' + fx(p2[0]) + ' ' + fx(p2[1]);
}
function angleArc(V, P1, P2, r, cls, key){
  var a1 = angOf(V, P1), d = norm180(angOf(V, P2) - a1);
  return h('path', {key:key, d:arcPath(V[0], V[1], r, a1, a1 + d), className:cls || 'thin'});
}
function angleLabelAt(V, P1, P2, r){
  var a1 = angOf(V, P1), d = norm180(angOf(V, P2) - a1);
  return polar(V[0], V[1], r, a1 + d / 2);
}
function AL(V, P1, P2, r, txt, cls, key){
  var p = angleLabelAt(V, P1, P2, r);
  return h('text', {key:key, x:fx(p[0]), y:fx(p[1]) + 4, className:cls || 'sm', textAnchor:'middle'}, txt);
}
function ticks(P, Q, n, key, cls){
  var m = midp(P, Q), u = unit(P, Q), px = -u[1], py = u[0], out = [];
  for(var i = 0; i < n; i++){
    var off = (i - (n - 1) / 2) * 4.5;
    var bx = m[0] + u[0] * off, by = m[1] + u[1] * off;
    out.push(h('line', {key:key + i, x1:fx(bx - px*5), y1:fx(by - py*5),
      x2:fx(bx + px*5), y2:fx(by + py*5), className:cls || 'thin'}));
  }
  return out;
}
function chevrons(P, Q, n, key){
  var m = midp(P, Q), u = unit(P, Q), px = -u[1], py = u[0], out = [];
  for(var i = 0; i < n; i++){
    var off = (i - (n - 1) / 2) * 6;
    var bx = m[0] + u[0] * off, by = m[1] + u[1] * off;
    out.push(h('path', {key:key + i, className:'thin',
      d:'M' + fx(bx - u[0]*4 + px*4) + ' ' + fx(by - u[1]*4 + py*4) +
        ' L' + fx(bx + u[0]*3) + ' ' + fx(by + u[1]*3) +
        ' L' + fx(bx - u[0]*4 - px*4) + ' ' + fx(by - u[1]*4 - py*4)}));
  }
  return out;
}
function rightAngle(V, P1, P2, s, key, cls){
  s = s || 11;
  var u1 = unit(V, P1), u2 = unit(V, P2);
  var a = [V[0] + u1[0]*s, V[1] + u1[1]*s], b = [V[0] + u2[0]*s, V[1] + u2[1]*s];
  var c = [a[0] + u2[0]*s, a[1] + u2[1]*s];
  return h('path', {key:key || 'ra', className:cls || 'thin',
    d:'M' + fx(a[0]) + ' ' + fx(a[1]) + ' L' + fx(c[0]) + ' ' + fx(c[1]) +
      ' L' + fx(b[0]) + ' ' + fx(b[1])});
}
function seg(P, Q, cls, key){
  return h('line', {key:key, x1:fx(P[0]), y1:fx(P[1]), x2:fx(Q[0]), y2:fx(Q[1]), className:cls || 'stk'});
}
function poly(pts, cls, key){
  return h('polygon', {key:key, className:cls || 'stk',
    points:pts.map(function(p){ return fx(p[0]) + ',' + fx(p[1]); }).join(' ')});
}
function T(x, y, txt, cls, anchor, key){
  return h('text', {key:key || ('t' + fx(x) + '_' + fx(y) + '_' + String(txt).slice(0, 8)),
    x:fx(x), y:fx(y), className:cls || '', textAnchor:anchor || 'middle'}, txt);
}
/* 圖例：線型樣本 + 文字，用於避免標籤互相重疊 */
function legend(x, y, rows, key){
  var w = 0;
  rows.forEach(function(r){ w = Math.max(w, 30 + r.label.length * 8); });
  var out = [h('rect', {key:(key || 'lg') + 'bg', x:x - 6, y:y - 11, width:w + 10,
    height:rows.length * 16 + 6, rx:3,
    style:{fill:'var(--sheet)', fillOpacity:.9, stroke:'var(--rule)', strokeWidth:1}})];
  rows.forEach(function(r, i){
    var yy = y + i * 16;
    out.push(h('line', {key:(key || 'lg') + 's' + i, x1:x, y1:yy, x2:x + 20, y2:yy, className:r.cls}));
    out.push(h('text', {key:(key || 'lg') + 't' + i, x:x + 25, y:yy + 4,
      className:'sm', textAnchor:'start'}, r.label));
  });
  return out;
}
function VL(P, txt, dx, dy, key){  /* 頂點字母 */
  return h('text', {key:key || ('v' + txt), x:fx(P[0] + dx), y:fx(P[1] + dy),
    className:'lbl', textAnchor:'middle'}, txt);
}
function dot(P, cls, key, r){
  return h('circle', {key:key, cx:fx(P[0]), cy:fx(P[1]), r:r || 3, className:cls || 'dot'});
}

function Fig(props){
  return h('div', {className:'gap-s'},
    h('div', {className:'figure'},
      h('svg', {viewBox:props.vb || '0 0 300 200', role:'img',
        'aria-label':(props.title || '') + '。' + (props.desc || '')},
        h('title', null, props.title || ''),
        h('desc', null, props.desc || ''),
        props.children)),
    props.caption ? h('div', {className:'figcap'}, props.caption) : null);
}

/* ── 1. 三角形（內角／外角／中位線／高／邊角關係）──────────────────── */
function TriangleDiagram(p){
  var d = p.data || {}, v = d.variant || 'angles', HL = p.highlight, RV = p.reveal;
  var A = [150, 32], B = [46, 168], C = [262, 168];
  var kids = [], cap = '', title = '三角形', desc = '';
  if(v === 'angles' || v === 'exterior'){
    var D = [300, 168];
    kids.push(seg(C, D, 'dash', 'ext'));
    kids.push(poly([A, B, C], 'stk', 'tri'));
    kids.push(angleArc(A, B, C, 21, HL ? 'hl' : 'thin', 'aA'));
    kids.push(angleArc(B, C, A, 21, HL ? 'hl' : 'thin', 'aB'));
    kids.push(angleArc(C, A, B, 21, 'thin', 'aC'));
    kids.push(angleArc(C, A, D, 17, v === 'exterior' ? 'hl' : 'thin', 'aE'));
    kids.push(AL(A, B, C, 33, '∠A', 'sm', 'lA'));
    kids.push(AL(B, C, A, 33, '∠B', 'sm', 'lB'));
    kids.push(AL(C, A, B, 34, '∠C', 'sm', 'lC'));
    kids.push(AL(C, A, D, 30, v === 'exterior' ? '∠1' : '∠1', 'acc', 'lE'));
    kids.push(VL(A, 'A', 0, -10), VL(B, 'B', -11, 6), VL(C, 'C', -6, 17), VL(D, 'D', 8, 6));
    if(RV) kids.push(T(150, 118, v === 'exterior' ? '∠1 = ∠A + ∠B' : '∠A+∠B+∠C = 180°', 'acc'));
    title = v === 'exterior' ? '三角形的外角' : '三角形的內角';
    desc = '三角形 ABC，底邊 BC 向右延長到 D。∠A、∠B、∠C 為內角，∠1 為頂點 C 的外角。';
    cap = v === 'exterior' ? '∠1 是 C 的外角，兩個不相鄰內角是 ∠A 與 ∠B' : '三個內角 ∠A、∠B、∠C；虛線延長線外側的 ∠1 是外角';
  }
  else if(v === 'midsegment'){
    var M = midp(A, B), N = midp(A, C);
    kids.push(poly([A, B, C], 'stk', 'tri'));
    kids.push(seg(M, N, HL ? 'hl' : 'stk', 'mn'));
    kids.push.apply(kids, ticks(A, M, 1, 'tAM'));
    kids.push.apply(kids, ticks(M, B, 1, 'tMB'));
    kids.push.apply(kids, ticks(A, N, 2, 'tAN'));
    kids.push.apply(kids, ticks(N, C, 2, 'tNC'));
    kids.push.apply(kids, chevrons(M, N, 1, 'cMN'));
    kids.push.apply(kids, chevrons(B, C, 1, 'cBC'));
    kids.push(VL(A, 'A', 0, -10), VL(B, 'B', -11, 6), VL(C, 'C', 11, 6),
              VL(M, 'M', -13, 2), VL(N, 'N', 13, 2));
    if(RV) kids.push(T(150, 128, 'MN ∥ BC，MN = ½ BC', 'acc'));
    title = '三角形中位線';
    desc = 'M、N 分別是 AB、AC 的中點，線段 MN 與底邊 BC 平行，長度是 BC 的一半。相同記號代表等長，箭頭記號代表平行。';
    cap = '同記號＝等長，箭頭＝平行';
  }
  else if(v === 'area'){
    var H = [150, 168];
    kids.push(poly([A, B, C], 'stk', 'tri'));
    kids.push(seg(A, H, HL ? 'hl' : 'dash', 'ht'));
    kids.push(rightAngle(H, C, A, 10, 'raH'));
    kids.push(T(150, 186, '底', 'acc'), T(163, 105, '高', 'acc', 'start'));
    kids.push(VL(A, 'A', 0, -10), VL(B, 'B', -11, 6), VL(C, 'C', 11, 6));
    title = '三角形的底與高';
    desc = '三角形 ABC 以 BC 為底，從頂點 A 向 BC 作垂線得到高，垂足處有直角記號。';
    cap = '高一定要垂直於所取的底';
  }
  else if(v === 'inequality'){
    kids.push(poly([A, B, C], 'stk', 'tri'));
    kids.push(T(88, 92, 'c', 'lbl', 'end'), T(216, 92, 'b', 'lbl', 'start'), T(154, 186, 'a'));
    kids.push(VL(A, 'A', 0, -10), VL(B, 'B', -11, 6), VL(C, 'C', 11, 6));
    if(HL) kids.push(h('path', {key:'hp', className:'hl',
      d:'M' + B[0] + ' ' + B[1] + ' L' + A[0] + ' ' + A[1] + ' L' + C[0] + ' ' + C[1]}));
    if(RV) kids.push(T(150, 128, 'c + b > a', 'acc'));
    title = '三角形兩邊和大於第三邊';
    desc = '三角形 ABC 的三邊 a、b、c。從 B 沿著 A 再到 C 的折線總長，一定比直接連接 B 到 C 的線段 a 長。';
    cap = '折線 B→A→C 一定比直線 BC 長';
  }
  else if(v === 'equilateral'){
    var E1 = [150, 34], E2 = [58, 168], E3 = [242, 168], Hq = [150, 168];
    kids.push(poly([E1, E2, E3], 'stk', 'tri'));
    kids.push(seg(E1, Hq, HL ? 'hl' : 'dash', 'hh'));
    kids.push(rightAngle(Hq, E3, E1, 10, 'ra'));
    kids.push.apply(kids, ticks(E1, E2, 1, 't1'));
    kids.push.apply(kids, ticks(E1, E3, 1, 't2'));
    kids.push.apply(kids, ticks(E2, E3, 1, 't3'));
    kids.push.apply(kids, ticks(E2, Hq, 2, 't4'));
    kids.push.apply(kids, ticks(Hq, E3, 2, 't5'));
    kids.push(angleArc(E2, E1, E3, 20, 'thin', 'g1'), angleArc(E3, E1, E2, 20, 'thin', 'g2'));
    kids.push(T(92, 96, '邊長', 'sm', 'end'), T(210, 96, '邊長', 'sm', 'start'),
              T(150, 188, '邊長', 'sm'));
    kids.push(T(162, 108, '高', 'acc', 'start'));
    if(RV){
      kids.push(T(150, 14, '高 =（√3 / 2）× 邊長', 'acc'));
      kids.push(T(150, 28, '面積 =（√3 / 4）× 邊長²', 'acc'));
    }
    title = '正三角形的高';
    desc = '正三角形三邊等長（同記號），從頂點作的高把底邊平分成兩段（雙記號），得到兩個 30–60–90 直角三角形。';
    cap = '高把正三角形切成兩個 30°–60°–90° 直角三角形';
  }
  else {   /* bigside：大邊對大角 */
    var A2 = [168, 30], B2 = [40, 168], C2 = [268, 150];
    kids.push(poly([A2, B2, C2], 'stk', 'tri'));
    kids.push.apply(kids, HL ? [h('line', {key:'hb', className:'hl', x1:B2[0], y1:B2[1], x2:C2[0], y2:C2[1]})] : []);
    kids.push(angleArc(A2, B2, C2, HL ? 24 : 20, HL ? 'hl' : 'thin', 'g1'));
    kids.push(angleArc(B2, C2, A2, 20, 'thin', 'g2'));
    kids.push(angleArc(C2, A2, B2, 20, 'thin', 'g3'));
    kids.push(T(96, 88, 'c', 'lbl', 'end'), T(228, 82, 'b', 'lbl', 'start'), T(150, 178, 'a（最長）', 'acc'));
    kids.push(VL(A2, 'A', 0, -10), VL(B2, 'B', -11, 6), VL(C2, 'C', 11, 6));
    if(RV) kids.push(T(150, 122, 'a 最長 ⇒ ∠A 最大', 'acc'));
    title = '大邊對大角';
    desc = '三角形中最長的邊 a 所對的頂角 ∠A 也是最大的角。';
    cap = '最長邊 a 對到的 ∠A 就是最大角';
  }
  return h(Fig, {vb:'0 0 310 200', title:title, desc:desc, caption:cap}, kids);
}

/* ── 2. 平行線截角 ─────────────────────────────────────────────────── */
function ParallelLinesDiagram(p){
  var d = p.data || {}, v = d.variant || 'corresponding', HL = p.highlight, RV = p.reveal;
  var P1 = [120.7, 62], P2 = [179.3, 142];
  var kids = [];
  kids.push(seg([16, 62], [292, 62], 'stk', 'l1'));
  kids.push(seg([16, 142], [292, 142], 'stk', 'l2'));
  kids.push(seg([95, 27], [205, 177], 'stk', 'tr'));
  kids.push.apply(kids, chevrons([40, 62], [120, 62], 1, 'p1'));
  kids.push.apply(kids, chevrons([100, 142], [178, 142], 1, 'p2'));
  kids.push(T(24, 56, 'L₁', 'sm', 'start'), T(24, 136, 'L₂', 'sm', 'start'), T(212, 176, 'M', 'sm', 'start'));
  var upper = [95, 27], lower = [205, 177], leftA = [16, 62], rightA = [292, 62],
      leftB = [16, 142], rightB = [292, 142];
  var pairs = {
    corresponding: [[P1, rightA, lower], [P2, rightB, lower]],
    alternate:     [[P1, rightA, lower], [P2, leftB, upper]],
    cointerior:    [[P1, rightA, lower], [P2, rightB, upper]]
  };
  var pr = pairs[v] || pairs.corresponding;
  kids.push(angleArc(pr[0][0], pr[0][1], pr[0][2], 17, HL ? 'hl' : 'thin', 'q1'));
  kids.push(angleArc(pr[1][0], pr[1][1], pr[1][2], 17, HL ? 'hl' : 'thin', 'q2'));
  kids.push(AL(pr[0][0], pr[0][1], pr[0][2], 29, '①', HL ? 'acc' : 'sm', 'n1'));
  kids.push(AL(pr[1][0], pr[1][1], pr[1][2], 29, '②', HL ? 'acc' : 'sm', 'n2'));
  kids.push(dot(P1, 'dot', 'd1', 2.4), dot(P2, 'dot', 'd2', 2.4));
  var names = {corresponding:'同位角', alternate:'內錯角', cointerior:'同側內角'};
  if(RV) kids.push(T(150, 196, v === 'cointerior' ? '① + ② = 180°' : '① = ②', 'acc'));
  return h(Fig, {vb:'0 0 300 205',
    title:'平行線被截線所截的' + (names[v] || ''),
    desc:'兩條平行線 L₁、L₂（以箭頭記號標示平行）被截線 M 所截，標示出一組' + (names[v] || '') + '①與②。',
    caption:'一組' + (names[v] || '') + '：①與②' + (v === 'cointerior' ? '（互補）' : '（相等）')}, kids);
}

/* ── 3. 全等判定 ───────────────────────────────────────────────────── */
function CongruenceDiagram(p){
  var d = p.data || {}, v = (d.variant || 'SSS').toUpperCase(), HL = p.highlight, RV = p.reveal;
  var kids = [];
  if(v === 'RHS'){
    var A = [42, 28], B = [42, 148], C = [122, 148];
    var D = [212, 28], E = [212, 148], F = [292, 148];
    kids.push(poly([A, B, C], 'stk', 't1'), poly([D, E, F], 'stk', 't2'));
    kids.push(rightAngle(B, A, C, 12, 'r1'), rightAngle(E, D, F, 12, 'r2'));
    kids.push.apply(kids, ticks(A, C, 1, 'h1', HL ? 'hl' : 'thin'));
    kids.push.apply(kids, ticks(D, F, 1, 'h2', HL ? 'hl' : 'thin'));
    kids.push.apply(kids, ticks(B, C, 2, 's1', HL ? 'hl' : 'thin'));
    kids.push.apply(kids, ticks(E, F, 2, 's2', HL ? 'hl' : 'thin'));
    kids.push(VL(A, 'A', -11, 2), VL(B, 'B', -11, 6), VL(C, 'C', 8, 14),
              VL(D, 'D', -11, 2), VL(E, 'E', -11, 6), VL(F, 'F', 8, 14));
    kids.push(T(150, 96, '≅', 'acc'));
    if(RV) kids.push(T(150, 178, '直角＋斜邊＋一股 ⇒ △ABC ≅ △DEF', 'acc'));
    return h(Fig, {vb:'0 0 305 190', title:'RHS 全等判定',
      desc:'兩個直角三角形，直角在 B 與 E；斜邊 AC 與 DF 等長（單記號），一股 BC 與 EF 等長（雙記號）。',
      caption:'RHS：直角、斜邊、一股'}, kids);
  }
  var A1 = [40, 30], B1 = [16, 150], C1 = [126, 150];
  var A2 = [216, 30], B2 = [192, 150], C2 = [302, 150];
  kids.push(poly([A1, B1, C1], 'stk', 't1'), poly([A2, B2, C2], 'stk', 't2'));
  var side = function(P, Q, R, S, n, k){
    kids.push.apply(kids, ticks(P, Q, n, k + 'a', HL ? 'hl' : 'thin'));
    kids.push.apply(kids, ticks(R, S, n, k + 'b', HL ? 'hl' : 'thin'));
  };
  var ang2 = function(V1, X1, Y1, V2, X2, Y2, r, k){
    kids.push(angleArc(V1, X1, Y1, r, HL ? 'hl' : 'thin', k + 'a'));
    kids.push(angleArc(V2, X2, Y2, r, HL ? 'hl' : 'thin', k + 'b'));
  };
  if(v === 'SSS'){
    side(A1, B1, A2, B2, 1, 'u'); side(B1, C1, B2, C2, 2, 'w'); side(A1, C1, A2, C2, 3, 'z');
  } else if(v === 'SAS'){
    side(A1, B1, A2, B2, 1, 'u'); side(A1, C1, A2, C2, 2, 'z');
    ang2(A1, B1, C1, A2, B2, C2, 18, 'g');
  } else if(v === 'ASA'){
    side(B1, C1, B2, C2, 1, 'w');
    ang2(B1, A1, C1, B2, A2, C2, 18, 'g'); ang2(C1, A1, B1, C2, A2, B2, 22, 'g2');
  } else {  /* AAS */
    side(A1, C1, A2, C2, 1, 'z');
    ang2(A1, B1, C1, A2, B2, C2, 18, 'g'); ang2(B1, A1, C1, B2, A2, C2, 22, 'g2');
  }
  kids.push(VL(A1, 'A', 0, -9), VL(B1, 'B', -11, 6), VL(C1, 'C', 10, 12),
            VL(A2, 'D', 0, -9), VL(B2, 'E', -11, 6), VL(C2, 'F', 10, 12));
  kids.push(T(160, 96, '≅', 'acc'));
  if(RV) kids.push(T(160, 182, v + ' ⇒ △ABC ≅ △DEF', 'acc'));
  var descs = {SSS:'三組對應邊分別等長（一、二、三道記號）。',
    SAS:'兩組對應邊等長，且它們夾的角相等。',
    ASA:'兩組對應角相等，且它們夾的邊 BC 與 EF 等長。',
    AAS:'兩組對應角相等，加上一組非夾邊 AC 與 DF 等長。'};
  return h(Fig, {vb:'0 0 320 190', title:v + ' 全等判定',
    desc:'左右兩個三角形 ABC 與 DEF。' + descs[v],
    caption:v + '：相同記號代表對應相等'}, kids);
}

/* ── 4. 相似三角形 ─────────────────────────────────────────────────── */
function SimilarTriangleDiagram(p){
  var d = p.data || {}, v = d.variant || 'sides', HL = p.highlight, RV = p.reveal, k = d.k || 2;
  var A = [30, 40], B = [16, 118], C = [86, 118];
  var A2 = [180, 22], B2 = [152, 178], C2 = [292, 178];
  var kids = [poly([A, B, C], 'stk', 't1'), poly([A2, B2, C2], 'stk', 't2')];
  kids.push(angleArc(A, B, C, 14, 'thin', 'a1'), angleArc(A2, B2, C2, 20, 'thin', 'a2'));
  kids.push(angleArc(B, A, C, 12, 'thin', 'b1'), angleArc(B2, A2, C2, 18, 'thin', 'b2'));
  kids.push(VL(A, 'A', 0, -9), VL(B, 'B', -11, 6), VL(C, 'C', 9, 12),
            VL(A2, 'D', 0, -9), VL(B2, 'E', -11, 6), VL(C2, 'F', 10, 13));
  if(v === 'height'){
    var H = [30, 118], H2 = [180, 178];
    kids.push(seg(A, H, HL ? 'hl' : 'dash', 'h1'), seg(A2, H2, HL ? 'hl' : 'dash', 'h2'));
    kids.push(rightAngle(H, C, A, 8, 'rh1'), rightAngle(H2, C2, A2, 10, 'rh2'));
    kids.push(T(36, 84, '高', 'acc', 'start'), T(188, 110, '高', 'acc', 'start'));
    if(RV) kids.push(T(150, 196, '對應高之比 = 對應邊之比 = 1 : ' + k, 'acc'));
  } else {
    kids.push(T(50, 133, '3', 'sm'), T(222, 194, String(3 * k), 'sm'));
    kids.push(T(14, 84, '2', 'sm', 'end'), T(158, 104, String(2 * k), 'sm', 'end'));
    if(HL){ kids.push(seg(B, C, 'hl', 'hb'), seg(B2, C2, 'hl', 'hb2')); }
    if(RV) kids.push(T(150, 196, '△ABC ∽ △DEF，對應邊比 = 1 : ' + k, 'acc'));
  }
  kids.push(T(122, 74, '∽', 'acc'));
  return h(Fig, {vb:'0 0 305 205', title:'相似三角形',
    desc:'△ABC 與 △DEF 相似，對應角相等（弧記號），對應邊成比例，' +
         (v === 'height' ? '兩條對應高的比也等於對應邊之比。' : '大三角形的邊長是小三角形的 ' + k + ' 倍。'),
    caption:v === 'height' ? '對應高之比 = 對應邊之比' : '對應頂點順序：A↔D、B↔E、C↔F'}, kids);
}

/* ── 5. 特殊直角三角形／勾股定理 ───────────────────────────────────── */
function SpecialRightTriangleDiagram(p){
  var d = p.data || {}, v = d.variant || 'pythagoras', HL = p.highlight, RV = p.reveal;
  var kids = [], title, desc, cap;
  if(v === 'pythagoras'){
    var C = [56, 158], B = [236, 158], A = [56, 46];
    kids.push(poly([A, B, C], 'stk', 't'));
    kids.push(rightAngle(C, B, A, 13, 'ra'));
    kids.push(T(146, 176, 'a', 'lbl'), T(44, 102, 'b', 'lbl', 'end'), T(154, 94, 'c', 'lbl'));
    kids.push(VL(A, 'A', -12, 0), VL(B, 'B', 11, 6), VL(C, 'C', -12, 10));
    if(HL) kids.push(seg(A, B, 'hl', 'hc'));
    if(RV) kids.push(T(150, 30, 'a² + b² = c²，c 是斜邊', 'acc'));
    title = '勾股定理'; cap = '直角所對的邊 c 就是斜邊，單獨放在等號一邊';
    desc = '直角三角形 ABC，直角在 C。兩股為 a、b，斜邊為 c。';
  } else if(v === '306090'){
    var C2 = [70, 152], B2 = [70, 62], A2 = [226, 152];
    kids.push(poly([A2, B2, C2], 'stk', 't'));
    kids.push(rightAngle(C2, A2, B2, 13, 'ra'));
    kids.push(angleArc(A2, C2, B2, 24, HL ? 'hl' : 'thin', 'a30'));
    kids.push(angleArc(B2, C2, A2, 20, HL ? 'hl' : 'thin', 'a60'));
    kids.push(AL(A2, C2, B2, 38, '30°', 'acc', 'l30'));
    kids.push(AL(B2, C2, A2, 34, '60°', 'acc', 'l60'));
    kids.push(T(58, 110, RV ? '1' : '?', 'lbl', 'end'), T(148, 170, RV ? '√3' : '?', 'lbl'),
              T(158, 96, RV ? '2' : '?', 'lbl'));
    kids.push(VL(A2, 'A', 11, 6), VL(B2, 'B', -6, -8), VL(C2, 'C', -12, 10));
    if(RV) kids.push(T(150, 36, '30° 對的邊最短，比 1 : √3 : 2', 'acc'));
    title = '30°–60°–90° 直角三角形';
    cap = RV ? '短邊在 30° 對面，√3 倍在 60° 對面，斜邊是短邊的 2 倍'
             : '三個角是 30°、60°、90°，三邊有固定比例';
    desc = '直角在 C，∠A = 30°、∠B = 60°，三邊長成固定比例' + (RV ? '，依序為 1、√3、2。' : '。');
  } else if(v === '454590'){
    var C3 = [78, 156], B3 = [78, 44], A3 = [190, 156];
    kids.push(poly([A3, B3, C3], 'stk', 't'));
    kids.push(rightAngle(C3, A3, B3, 13, 'ra'));
    kids.push(angleArc(A3, C3, B3, 22, HL ? 'hl' : 'thin', 'a1'));
    kids.push(angleArc(B3, C3, A3, 22, HL ? 'hl' : 'thin', 'a2'));
    kids.push(AL(A3, C3, B3, 36, '45°', 'acc', 'l1'), AL(B3, C3, A3, 36, '45°', 'acc', 'l2'));
    kids.push.apply(kids, ticks(C3, B3, 1, 'e1'));
    kids.push.apply(kids, ticks(C3, A3, 1, 'e2'));
    kids.push(T(66, 104, RV ? '1' : '?', 'lbl', 'end'), T(134, 174, RV ? '1' : '?', 'lbl'),
              T(146, 92, RV ? '√2' : '?', 'lbl'));
    kids.push(VL(A3, 'A', 11, 6), VL(B3, 'B', -6, -8), VL(C3, 'C', -12, 10));
    if(RV) kids.push(T(150, 30, '兩股等長，比 1 : 1 : √2', 'acc'));
    title = '45°–45°–90° 直角三角形';
    cap = RV ? '等腰直角三角形：兩股等長，斜邊是股的 √2 倍'
             : '等腰直角三角形：兩底角都是 45°，兩股等長（同記號）';
    desc = '直角在 C，兩底角都是 45°，兩股等長（同記號）' + (RV ? '，斜邊是股的 √2 倍。' : '。');
  } else {  /* incircle-right：直角三角形內切圓半徑 */
    var C4 = [62, 160], B4 = [242, 160], A4 = [62, 40];
    var a = 180, b = 120, c = Math.hypot(180, 120);
    var rr = (a + b - c) / 2;
    kids.push(poly([A4, B4, C4], 'stk', 't'));
    kids.push(h('circle', {key:'ic', cx:fx(C4[0] + rr), cy:fx(C4[1] - rr), r:fx(rr),
      className:HL ? 'hl' : 'fillT'}));
    kids.push(dot([C4[0] + rr, C4[1] - rr], 'dotT', 'ic0', 2.6));
    kids.push(rightAngle(C4, B4, A4, 12, 'ra'));
    kids.push(T(152, 178, '股', 'sm'), T(50, 104, '股', 'sm', 'end'), T(166, 92, '斜邊', 'sm'));
    kids.push(T(C4[0] + rr + 8, C4[1] - rr + 4, '半徑', 'acc', 'start'));
    if(RV) kids.push(T(150, 26, '內切圓半徑 =（兩股和 − 斜邊）÷ 2', 'acc'));
    title = '直角三角形的內切圓'; cap = '只有直角三角形能用 r =（兩股和 − 斜邊）÷ 2';
    desc = '直角三角形與其內切圓，圓心到三邊等距，半徑為 r。';
  }
  return h(Fig, {vb:'0 0 300 195', title:title, desc:desc, caption:cap}, kids);
}

/* ── 6. 三角形的心 ─────────────────────────────────────────────────── */
function TriangleCentersDiagram(p){
  var d = p.data || {}, v = d.variant || 'centroid', HL = p.highlight, RV = p.reveal;
  var A = [131.4, 30.5], B = [91, 141.3], C = [215.3, 130.4];
  var mAB = [111.2, 85.9], mBC = [153.2, 135.9], mAC = [173.4, 80.5];
  var kids = [poly([A, B, C], 'stk', 't')];
  kids.push(VL(A, 'A', 0, -9), VL(B, 'B', -12, 5), VL(C, 'C', 12, 6));
  var title, desc, cap;
  if(v === 'circum'){
    var O = [150, 100], R = 72;
    kids.push(h('circle', {key:'cc', cx:150, cy:100, r:R, className:'dash'}));
    kids.push(seg(O, mAB, HL ? 'hl' : 'thin', 'p1'), seg(O, mBC, HL ? 'hl' : 'thin', 'p2'),
              seg(O, mAC, HL ? 'hl' : 'thin', 'p3'));
    kids.push(rightAngle(mAB, A, O, 8, 'r1'), rightAngle(mBC, B, O, 8, 'r2'), rightAngle(mAC, C, O, 8, 'r3'));
    kids.push.apply(kids, ticks(A, mAB, 1, 'k1')); kids.push.apply(kids, ticks(mAB, B, 1, 'k2'));
    kids.push.apply(kids, ticks(B, mBC, 2, 'k3')); kids.push.apply(kids, ticks(mBC, C, 2, 'k4'));
    kids.push.apply(kids, ticks(A, mAC, 3, 'k5')); kids.push.apply(kids, ticks(mAC, C, 3, 'k6'));
    kids.push(dot(O, 'dotT', 'o', 3.4), T(O[0] + 8, O[1] + 14, 'O', 'lbl', 'start'));
    if(RV) kids.push(T(150, 192, 'OA = OB = OC＝外接圓半徑', 'acc'));
    title = '外心與外接圓';
    desc = '三角形三邊中垂線交於一點 O，O 到三頂點等距，以 O 為圓心可畫出通過三頂點的外接圓。';
    cap = '外心＝三條中垂線的交點，到三頂點等距';
  } else if(v === 'circum-right'){
    var A2 = [70, 40], B2 = [70, 160], C2 = [250, 160], O2 = [160, 100];
    kids = [poly([A2, B2, C2], 'stk', 't'),
            h('circle', {key:'cc', cx:160, cy:100, r:108.2, className:'dash'}),
            rightAngle(B2, A2, C2, 12, 'ra'),
            seg(O2, B2, HL ? 'hl' : 'thin', 'ob')];
    kids.push.apply(kids, ticks(A2, O2, 1, 'q1')); kids.push.apply(kids, ticks(O2, C2, 1, 'q2'));
    kids.push(dot(O2, 'dotT', 'o', 3.4), T(O2[0] + 4, O2[1] - 8, 'O', 'lbl', 'start'));
    kids.push(VL(A2, 'A', -12, 0), VL(B2, 'B', -12, 8), VL(C2, 'C', 11, 8));
    if(RV) kids.push(T(160, 192, '外心 O＝斜邊 AC 的中點，OB = ½ AC', 'acc'));
    title = '直角三角形的外心';
    desc = '直角在 B 的三角形，外心 O 正好落在斜邊 AC 的中點上，外接圓以 AC 為直徑。';
    cap = '直角三角形的外心在斜邊中點，斜邊就是直徑';
  } else if(v === 'incenter'){
    var I = [143.8, 100.8], r = 35.7;
    var tAB = [110.2, 88.6], tBC = [146.9, 136.4], tAC = [171.1, 77.8];
    kids.push(h('circle', {key:'ic', cx:143.8, cy:100.8, r:35.7, className:HL ? 'hl' : 'fillT'}));
    kids.push(seg(A, I, 'thin', 'b1'), seg(B, I, 'thin', 'b2'), seg(C, I, 'thin', 'b3'));
    kids.push(seg(I, tAB, HL ? 'hl' : 'dash', 'd1'), seg(I, tBC, HL ? 'hl' : 'dash', 'd2'),
              seg(I, tAC, HL ? 'hl' : 'dash', 'd3'));
    kids.push(rightAngle(tAB, A, I, 7, 'r1'), rightAngle(tBC, B, I, 7, 'r2'), rightAngle(tAC, A, I, 7, 'r3'));
    kids.push(angleArc(A, B, I, 15, 'thin', 'g1'), angleArc(A, I, C, 15, 'thin', 'g2'));
    kids.push(dot(I, 'dotT', 'i', 3.4), T(I[0] + 7, I[1] + 13, 'I', 'lbl', 'start'));
    kids.push(T(I[0] - 18, I[1] - 4, '半徑', 'acc', 'end'));
    if(RV) kids.push(T(150, 192, 'I 到三邊等距＝內切圓半徑', 'acc'));
    title = '內心與內切圓';
    desc = '三角形三個內角平分線交於一點 I，I 到三邊的距離都等於內切圓半徑。';
    cap = '內心＝三條角平分線的交點，到三邊等距';
  } else if(v === 'centroid-areas'){
    var G0 = [145.9, 100.7];
    kids.push(seg(A, mBC, 'thin', 'm1'), seg(B, mAC, 'thin', 'm2'), seg(C, mAB, 'thin', 'm3'));
    kids.push(seg(G0, A, HL ? 'hl' : 'thin', 'x1'), seg(G0, B, HL ? 'hl' : 'thin', 'x2'),
              seg(G0, C, HL ? 'hl' : 'thin', 'x3'));
    kids.push(dot(G0, 'dotT', 'g', 3.4), T(G0[0] + 8, G0[1] + 13, 'G', 'lbl', 'start'));
    [[A, mAB, G0], [mAB, B, G0], [B, mBC, G0], [mBC, C, G0], [C, mAC, G0], [mAC, A, G0]]
      .forEach(function(tri, i){
        var cxy = [(tri[0][0] + tri[1][0] + tri[2][0]) / 3, (tri[0][1] + tri[1][1] + tri[2][1]) / 3];
        kids.push(T(cxy[0], cxy[1] + 4, String(i + 1), 'sm', 'middle', 'z' + i));
      });
    if(RV) kids.push(T(150, 192, '六塊面積都相等，各為 ⅙', 'acc'));
    title = '三條中線分出的六塊';
    desc = '三條中線把三角形分成六個小三角形，六塊的面積完全相等。';
    cap = '① ~ ⑥ 六塊面積相等';
  } else {  /* centroid */
    var G = [145.9, 100.7];
    kids.push(seg(A, mBC, HL ? 'hl' : 'thin', 'm1'), seg(B, mAC, 'thin', 'm2'), seg(C, mAB, 'thin', 'm3'));
    kids.push.apply(kids, ticks(B, mBC, 1, 'k1')); kids.push.apply(kids, ticks(mBC, C, 1, 'k2'));
    kids.push.apply(kids, ticks(A, mAC, 2, 'k3')); kids.push.apply(kids, ticks(mAC, C, 2, 'k4'));
    kids.push.apply(kids, ticks(A, mAB, 3, 'k5')); kids.push.apply(kids, ticks(mAB, B, 3, 'k6'));
    kids.push(dot(G, 'dotT', 'g', 3.4), T(G[0] + 9, G[1] - 4, 'G', 'lbl', 'start'));
    if(RV) kids.push(T(138.6, 69, '2', 'acc', 'middle'), T(149.6, 122, '1', 'acc', 'middle'));
    if(RV) kids.push(T(150, 192, 'AG : G(BC中點) = 2 : 1', 'acc'));
    title = '重心與三條中線';
    desc = '三角形三條中線交於重心 G，頂點到重心的長度是重心到對邊中點的兩倍。';
    cap = '重心把每條中線分成 2 : 1（靠頂點那段較長）';
  }
  return h(Fig, {vb:'0 0 300 200', title:title, desc:desc, caption:cap}, kids);
}

/* ── 7. 四邊形 ─────────────────────────────────────────────────────── */
function QuadrilateralDiagram(p){
  var d = p.data || {}, v = d.variant || 'parallelogram', HL = p.highlight, RV = p.reveal;
  var kids = [], title, desc, cap, pts, note = '';
  if(v === 'parallelogram' || v === 'rectangle'){
    pts = v === 'rectangle' ? [[52, 46], [248, 46], [248, 152], [52, 152]]
                            : [[38, 152], [96, 46], [262, 46], [204, 152]];
    var A = pts[3], B = pts[0], C = pts[1], D = pts[2];
    var Aa = pts[0], Bb = pts[1], Cc = pts[2], Dd = pts[3];
    kids.push(poly(pts, 'stk', 'q'));
    kids.push(seg(Aa, Cc, HL ? 'hl' : 'dash', 'd1'), seg(Bb, Dd, HL ? 'hl' : 'dash', 'd2'));
    var O = midp(Aa, Cc);
    kids.push(dot(O, 'dotT', 'o', 3));
    kids.push.apply(kids, ticks(Aa, O, 1, 'x1')); kids.push.apply(kids, ticks(O, Cc, 1, 'x2'));
    kids.push.apply(kids, ticks(Bb, O, 2, 'x3')); kids.push.apply(kids, ticks(O, Dd, 2, 'x4'));
    kids.push.apply(kids, chevrons(Aa, Bb, 1, 'c1')); kids.push.apply(kids, chevrons(Dd, Cc, 1, 'c2'));
    kids.push.apply(kids, chevrons(Bb, Cc, 2, 'c3')); kids.push.apply(kids, chevrons(Aa, Dd, 2, 'c4'));
    kids.push(VL(Aa, 'A', -11, 8), VL(Bb, 'B', -6, -8), VL(Cc, 'C', 10, -8), VL(Dd, 'D', 11, 8));
    if(v === 'rectangle'){
      kids.push(rightAngle(Aa, Bb, Dd, 11, 'ra1'), rightAngle(Cc, Bb, Dd, 11, 'ra2'));
      if(RV) kids.push(T(150, 180, '長方形：AC = BD，且互相平分', 'acc'));
      title = '長方形的對角線'; cap = '長方形的兩條對角線等長，而且互相平分';
      desc = '長方形 ABCD 的兩條對角線交於中點 O，兩條對角線長度相等並互相平分。';
    } else {
      if(RV) kids.push(T(150, 180, '對邊平行且相等，對角線互相平分', 'acc'));
      title = '平行四邊形'; cap = '箭頭＝平行；對角線在 O 互相平分';
      desc = '平行四邊形 ABCD，兩組對邊分別平行且相等，對角線交於 O 並互相平分。';
    }
  } else if(v === 'rhombus'){
    pts = [[150, 36], [252, 100], [150, 164], [48, 100]];
    var O2 = [150, 100];
    kids.push(poly(pts, 'stk', 'q'));
    kids.push(seg(pts[0], pts[2], HL ? 'hl' : 'dash', 'd1'), seg(pts[1], pts[3], HL ? 'hl' : 'dash', 'd2'));
    kids.push(rightAngle(O2, pts[0], pts[1], 11, 'ra'));
    kids.push(dot(O2, 'dotT', 'o', 3));
    [[0, 1], [1, 2], [2, 3], [3, 0]].forEach(function(e, i){
      kids.push.apply(kids, ticks(pts[e[0]], pts[e[1]], 1, 'e' + i));
    });
    kids.push.apply(kids, ticks(pts[0], O2, 2, 'g1')); kids.push.apply(kids, ticks(O2, pts[2], 2, 'g2'));
    kids.push(VL(pts[0], 'A', 0, -9), VL(pts[1], 'B', 11, 4), VL(pts[2], 'C', 0, 16), VL(pts[3], 'D', -11, 4));
    if(RV) kids.push(T(150, 188, '菱形：對角線互相垂直平分', 'acc'));
    title = '菱形的對角線'; cap = '四邊等長；對角線互相垂直平分（直角記號）';
    desc = '菱形 ABCD 四邊等長，兩條對角線互相垂直並且互相平分。';
  } else if(v === 'kite'){
    pts = [[150, 22], [228, 84], [150, 172], [72, 84]];
    var O3 = [150, 84];
    kids.push(poly(pts, 'stk', 'q'));
    kids.push(seg(pts[0], pts[2], HL ? 'hl' : 'dash', 'd1'), seg(pts[1], pts[3], 'dash', 'd2'));
    kids.push(rightAngle(O3, pts[0], pts[1], 10, 'ra'));
    kids.push.apply(kids, ticks(pts[0], pts[1], 1, 'e0')); kids.push.apply(kids, ticks(pts[0], pts[3], 1, 'e1'));
    kids.push.apply(kids, ticks(pts[2], pts[1], 2, 'e2')); kids.push.apply(kids, ticks(pts[2], pts[3], 2, 'e3'));
    kids.push.apply(kids, ticks(pts[3], O3, 3, 'g1')); kids.push.apply(kids, ticks(O3, pts[1], 3, 'g2'));
    kids.push(VL(pts[0], 'A', 0, -9), VL(pts[1], 'B', 11, 4), VL(pts[2], 'C', 13, 6), VL(pts[3], 'D', -11, 4));
    kids.push(T(138, 52, 'AO', 'sm', 'end'), T(138, 132, 'OC', 'sm', 'end'));
    if(RV) kids.push(T(150, 196, 'AC 垂直平分 BD；AO ≠ OC，BD 不平分 AC', 'acc'));
    title = '箏形'; cap = '只有一條對角線（AC）垂直平分另一條';
    desc = '箏形 ABCD，AB = AD、CB = CD，但 AB 與 CB 不等長。對角線 AC 垂直平分 BD，' +
           '而 AO 與 OC 不相等，所以 BD 並不平分 AC。';
  } else if(v === 'isotrapezoid'){
    pts = [[84, 46], [216, 46], [262, 152], [38, 152]];
    kids.push(poly(pts, 'stk', 'q'));
    kids.push.apply(kids, chevrons(pts[0], pts[1], 1, 'c1'));
    kids.push.apply(kids, chevrons(pts[3], pts[2], 1, 'c2'));
    kids.push.apply(kids, ticks(pts[0], pts[3], 1, 'e1')); kids.push.apply(kids, ticks(pts[1], pts[2], 1, 'e2'));
    kids.push(angleArc(pts[3], pts[0], pts[2], 20, HL ? 'hl' : 'thin', 'a1'));
    kids.push(angleArc(pts[2], pts[3], pts[1], 20, HL ? 'hl' : 'thin', 'a2'));
    kids.push(seg(pts[0], pts[2], 'dash', 'dg1'), seg(pts[1], pts[3], 'dash', 'dg2'));
    kids.push(VL(pts[0], 'A', -6, -8), VL(pts[1], 'B', 6, -8), VL(pts[2], 'C', 11, 8), VL(pts[3], 'D', -11, 8));
    if(RV) kids.push(T(150, 180, '∠D = ∠C，兩腰等長，對角線等長', 'acc'));
    title = '等腰梯形'; cap = '兩腰等長 ⇒ 同一底上的兩底角相等';
    desc = '等腰梯形 ABCD，AB 平行 DC，兩腰 AD 與 BC 等長，下底的兩個底角 ∠D 與 ∠C 相等。';
  } else if(v === 'parallelogram-area'){
    pts = [[38, 156], [96, 50], [262, 50], [204, 156]];
    var Hf = [96, 156];
    kids.push(poly(pts, 'stk', 'q'));
    kids.push(seg(pts[1], Hf, HL ? 'hl' : 'dash', 'hh'));
    kids.push(rightAngle(Hf, pts[3], pts[1], 10, 'ra'));
    kids.push.apply(kids, chevrons(pts[0], pts[1], 1, 'c1'));
    kids.push.apply(kids, chevrons(pts[3], pts[2], 1, 'c2'));
    kids.push(T(121, 174, '底', 'acc'), T(106, 106, '高', 'acc', 'start'));
    if(RV) kids.push(T(150, 34, '面積 = 底 × 高', 'acc'));
    title = '平行四邊形的底與高'; cap = '高必須垂直於底，不是斜邊';
    desc = '平行四邊形以下方那一邊為底，從上方頂點向底作垂線得到高，垂足有直角記號。';
  } else if(v === 'trapezoid-area'){
    pts = [[92, 50], [206, 50], [262, 156], [38, 156]];
    var Hf2 = [92, 156];
    kids.push(poly(pts, 'stk', 'q'));
    kids.push(seg(pts[0], Hf2, HL ? 'hl' : 'dash', 'hh'));
    kids.push(rightAngle(Hf2, pts[2], pts[0], 10, 'ra'));
    kids.push.apply(kids, chevrons(pts[0], pts[1], 1, 'c1'));
    kids.push.apply(kids, chevrons(pts[3], pts[2], 1, 'c2'));
    kids.push(T(149, 42, '上底', 'acc'), T(150, 174, '下底', 'acc'), T(102, 106, '高', 'acc', 'start'));
    if(RV) kids.push(T(150, 26, '面積 =（上底 ＋ 下底）× 高 ÷ 2', 'acc'));
    title = '梯形的兩底與高'; cap = '兩底是互相平行的那一組對邊';
    desc = '梯形的上底與下底互相平行（箭頭記號），兩底之間的垂直距離就是高。';
  } else if(v === 'polygon-angles' || v === 'regular-polygon'){
    var cen = [150, 106], Rp = 78, pn = [];
    for(var t = 0; t < 5; t++) pn.push(polar(cen[0], cen[1], Rp, 90 + t * 72));
    kids = [poly(pn, 'stk', 'p')];
    if(v === 'polygon-angles'){
      kids.push(seg(pn[0], pn[2], HL ? 'hl' : 'dash', 'd1'), seg(pn[0], pn[3], HL ? 'hl' : 'dash', 'd2'));
      [[0, 1, 2], [0, 2, 3], [0, 3, 4]].forEach(function(tr, i){
        var cxy = [(pn[tr[0]][0] + pn[tr[1]][0] + pn[tr[2]][0]) / 3,
                   (pn[tr[0]][1] + pn[tr[1]][1] + pn[tr[2]][1]) / 3];
        kids.push(T(cxy[0], cxy[1] + 4, String(i + 1), 'acc', 'middle', 'nn' + i));
      });
      if(RV) kids.push(T(150, 198, '5 邊形切出 5 − 2 = 3 個三角形 ⇒ 3 × 180° = 540°', 'acc'));
      title = '凸多邊形內角和'; cap = '從一個頂點拉對角線，n 邊形切出 (n − 2) 個三角形';
      desc = '一個凸五邊形，從同一個頂點拉出兩條對角線，把五邊形切成三個三角形。';
    } else {
      for(var q2 = 0; q2 < 5; q2++){
        kids.push(angleArc(pn[q2], pn[(q2 + 4) % 5], pn[(q2 + 1) % 5], 16, 'thin', 'ag' + q2));
      }
      kids.push.apply(kids, ticks(pn[0], pn[1], 1, 'e0'));
      kids.push.apply(kids, ticks(pn[1], pn[2], 1, 'e1'));
      kids.push.apply(kids, ticks(pn[2], pn[3], 1, 'e2'));
      kids.push.apply(kids, ticks(pn[3], pn[4], 1, 'e3'));
      kids.push.apply(kids, ticks(pn[4], pn[0], 1, 'e4'));
      kids.push(AL(pn[2], pn[1], pn[3], 30, RV ? '108°' : '?', 'acc', 'la'));
      if(RV) kids.push(T(150, 198, '正五邊形每個內角 = 540° ÷ 5 = 108°', 'acc'));
      title = '正多邊形的內角'; cap = '正多邊形每邊等長、每個內角也一樣大';
      desc = '正五邊形五邊等長（同記號）、五個內角相等，每個內角是內角和除以 5。';
    }
    return h(Fig, {vb:'0 0 300 205', title:title, desc:desc, caption:cap}, kids);
  } else {  /* trapezoid-mid：梯形中位線 */
    pts = [[84, 46], [216, 46], [262, 152], [38, 152]];
    var M = midp(pts[0], pts[3]), N = midp(pts[1], pts[2]);
    kids.push(poly(pts, 'stk', 'q'));
    kids.push(seg(M, N, HL ? 'hl' : 'stk', 'mn'));
    kids.push.apply(kids, ticks(pts[0], M, 1, 'k1')); kids.push.apply(kids, ticks(M, pts[3], 1, 'k2'));
    kids.push.apply(kids, ticks(pts[1], N, 2, 'k3')); kids.push.apply(kids, ticks(N, pts[2], 2, 'k4'));
    kids.push.apply(kids, chevrons(pts[0], pts[1], 1, 'c1'));
    kids.push.apply(kids, chevrons(M, N, 1, 'c2'));
    kids.push.apply(kids, chevrons(pts[3], pts[2], 1, 'c3'));
    kids.push(T(150, 40, '上底', 'sm'), T(150, 168, '下底', 'sm'), T(150, 94, '中位線', 'acc'));
    kids.push(VL(pts[0], 'A', -6, -10), VL(pts[1], 'B', 6, -10), VL(pts[2], 'C', 11, 8), VL(pts[3], 'D', -11, 8));
    if(RV) kids.push(T(150, 188, '中位線 =（上底 ＋ 下底）÷ 2', 'acc'));
    title = '梯形中位線'; cap = '中位線平行兩底，長度是兩底和的一半';
    desc = '梯形 ABCD，M、N 分別是兩腰的中點，中位線 MN 平行上下底，長度為兩底和的一半。';
  }
  return h(Fig, {vb:'0 0 300 200', title:title, desc:desc, caption:cap}, kids);
}

/* ── 8. 圓心角與圓周角 ─────────────────────────────────────────────── */
function CircleAngleDiagram(p){
  var d = p.data || {}, v = d.variant || 'central-inscribed', HL = p.highlight, RV = p.reveal;
  var O = [150, 102], R = 70;
  var at = function(deg){ return polar(O[0], O[1], R, deg); };
  var kids = [h('circle', {key:'c', cx:150, cy:102, r:R, className:'stk'})];
  var title, desc, cap;
  if(v === 'central-inscribed'){
    var A = at(200), B = at(340), P = at(90);
    kids.push(h('path', {key:'arc', className:HL ? 'hl' : 'thin',
      d:arcPath(O[0], O[1], R, 200, 340)}));
    kids.push(seg(O, A, 'stk', 'oa'), seg(O, B, 'stk', 'ob'));
    kids.push(seg(P, A, 'stk', 'pa'), seg(P, B, 'stk', 'pb'));
    kids.push(angleArc(O, A, B, 26, 'thin', 'ao'), angleArc(P, A, B, 30, 'thin', 'ap'));
    kids.push(AL(O, A, B, 38, RV ? '140°' : '?', 'acc', 'lo'));
    kids.push(AL(P, A, B, 42, RV ? '70°' : '?', 'acc2', 'lp'));
    kids.push(dot(O, 'dot', 'o', 2.6), VL(O, 'O', -10, 5), VL(P, 'P', 0, -9),
              VL(A, 'A', -11, 4), VL(B, 'B', 11, 4));
    if(RV) kids.push(T(150, 196, '圓心角 = 2 × 同弧圓周角', 'acc'));
    title = '圓心角與圓周角'; cap = '粗弧 AB 所對：圓心角 ∠AOB、圓周角 ∠APB';
    desc = '圓 O 上有 A、B 兩點，弧 AB 所對的圓心角為 ∠AOB，圓周上另一點 P 所對的圓周角為 ∠APB，圓心角是圓周角的兩倍。';
  } else if(v === 'same-arc'){
    var A2 = at(200), B2 = at(340), P1 = at(110), P2 = at(62);
    kids.push(h('path', {key:'arc', className:HL ? 'hl' : 'thin', d:arcPath(O[0], O[1], R, 200, 340)}));
    kids.push(seg(P1, A2, 'stk', 'a1'), seg(P1, B2, 'stk', 'b1'));
    kids.push(seg(P2, A2, 'dash', 'a2'), seg(P2, B2, 'dash', 'b2'));
    kids.push(angleArc(P1, A2, B2, 26, 'thin', 'g1'), angleArc(P2, A2, B2, 26, 'thin', 'g2'));
    kids.push(AL(P1, A2, B2, 38, '①', 'acc', 'l1'), AL(P2, A2, B2, 38, '②', 'acc', 'l2'));
    kids.push(VL(P1, 'P', -8, -7), VL(P2, 'Q', 8, -7), VL(A2, 'A', -11, 4), VL(B2, 'B', 11, 4));
    if(RV) kids.push(T(150, 196, '① = ②（同弧所對的圓周角相等）', 'acc'));
    title = '同弧圓周角'; cap = '不論 P 在弧上哪裡，同弧所對的圓周角都一樣大';
    desc = '弧 AB 所對的兩個圓周角 ∠APB 與 ∠AQB 相等。';
  } else if(v === 'diameter'){
    var A3 = [80, 102], B3 = [220, 102], P3 = at(120);
    kids.push(seg(A3, B3, HL ? 'hl' : 'stk', 'diam'));
    kids.push(seg(P3, A3, 'stk', 'pa'), seg(P3, B3, 'stk', 'pb'));
    kids.push(rightAngle(P3, A3, B3, 12, 'ra'));
    kids.push(AL(P3, A3, B3, 34, RV ? '90°' : '?', 'acc', 'lp'));
    kids.push(dot(O, 'dot', 'o', 2.6), VL(O, 'O', 0, 15), VL(P3, 'P', -4, -9),
              VL(A3, 'A', -11, 4), VL(B3, 'B', 11, 4));
    if(RV) kids.push(T(150, 196, 'AB 是直徑 ⇒ ∠APB = 90°', 'acc'));
    title = '直徑所對的圓周角'; cap = 'AB 通過圓心（直徑）時，∠APB 一定是直角';
    desc = 'AB 是圓 O 的直徑，P 在圓上，∠APB 為直角。';
  } else if(v === 'cyclic'){
    var A4 = at(150), B4 = at(215), C4 = at(330), D4 = at(40);
    kids.push(poly([A4, B4, C4, D4], 'stk', 'q'));
    kids.push(angleArc(A4, D4, B4, 18, HL ? 'hl' : 'thin', 'g1'));
    kids.push(angleArc(C4, B4, D4, 18, HL ? 'hl' : 'thin', 'g2'));
    kids.push(AL(A4, D4, B4, 30, '①', 'acc', 'l1'), AL(C4, B4, D4, 30, '②', 'acc', 'l2'));
    kids.push(VL(A4, 'A', -11, 0), VL(B4, 'B', -10, 10), VL(C4, 'C', 11, 8), VL(D4, 'D', 11, -2));
    if(RV) kids.push(T(150, 196, '① + ② = 180°（對角互補）', 'acc'));
    title = '圓內接四邊形'; cap = '四個頂點都在圓上 ⇒ 對角互補';
    desc = '四邊形 ABCD 的四個頂點都在圓 O 上，一組對角 ∠A 與 ∠C 的和是 180 度。';
  } else {  /* chord-perp */
    var A5 = at(200), B5 = at(340), Mc = [150, A5[1]];
    kids.push(seg(A5, B5, 'stk', 'ch'));
    kids.push(seg(O, Mc, HL ? 'hl' : 'stk', 'om'));
    kids.push(rightAngle(Mc, A5, O, 11, 'ra'));
    kids.push.apply(kids, ticks(A5, Mc, 1, 'k1')); kids.push.apply(kids, ticks(Mc, B5, 1, 'k2'));
    kids.push(dot(O, 'dot', 'o', 2.6), VL(O, 'O', 0, -8), VL(A5, 'A', -11, 4), VL(B5, 'B', 11, 4),
              VL(Mc, 'M', 0, 16));
    if(RV) kids.push(T(150, 196, 'OM ⊥ AB ⇒ AM = MB', 'acc'));
    title = '圓心到弦的垂線'; cap = '從圓心向弦作垂線，垂足就是弦的中點';
    desc = '弦 AB 與圓心 O，OM 垂直 AB 於 M，M 是 AB 的中點。';
  }
  return h(Fig, {vb:'0 0 300 205', title:title, desc:desc, caption:cap}, kids);
}

/* ── 9. 切線 ───────────────────────────────────────────────────────── */
function CircleTangentDiagram(p){
  var d = p.data || {}, v = d.variant || 'tangent-radius', HL = p.highlight, RV = p.reveal;
  var kids = [], title, desc, cap;
  if(v === 'tangent-radius'){
    var O = [116, 104], R = 60, Tp = [176, 104];
    kids.push(h('circle', {key:'c', cx:116, cy:104, r:R, className:'stk'}));
    kids.push(seg([176, 26], [176, 182], HL ? 'hl' : 'stk', 'tan'));
    kids.push(seg(O, Tp, HL ? 'hl' : 'stk', 'ot'));
    kids.push(rightAngle(Tp, O, [176, 40], 12, 'ra'));
    kids.push(dot(O, 'dot', 'o', 2.6), dot(Tp, 'dotA', 't', 3));
    kids.push(VL(O, 'O', -10, 5), VL(Tp, 'T', 10, 14), T(186, 36, '切線 L', 'sm', 'start'));
    kids.push(T(142, 96, 'r', 'lbl'));
    if(RV) kids.push(T(150, 198, '半徑 OT ⊥ 切線 L', 'acc'));
    title = '切線與半徑'; cap = '切線只碰圓一點；連到切點的半徑一定與切線垂直';
    desc = '直線 L 與圓 O 相切於 T，半徑 OT 與切線 L 互相垂直。';
  } else {
    var O2 = [116, 104], R2 = 58, P = [258, 104];
    var a = 65.4;
    var T1 = polar(O2[0], O2[1], R2, a), T2 = polar(O2[0], O2[1], R2, -a);
    kids.push(h('circle', {key:'c', cx:116, cy:104, r:R2, className:'stk'}));
    kids.push(seg(P, T1, HL ? 'hl' : 'stk', 'p1'), seg(P, T2, HL ? 'hl' : 'stk', 'p2'));
    kids.push(seg(O2, T1, 'dash', 'o1'), seg(O2, T2, 'dash', 'o2'), seg(O2, P, 'dash', 'op'));
    kids.push(rightAngle(T1, O2, P, 10, 'r1'), rightAngle(T2, O2, P, 10, 'r2'));
    kids.push.apply(kids, ticks(P, T1, 1, 'k1')); kids.push.apply(kids, ticks(P, T2, 1, 'k2'));
    kids.push(dot(O2, 'dot', 'o', 2.6), dot(P, 'dotA', 'p', 3));
    kids.push(VL(O2, 'O', -10, 5), VL(P, 'P', 11, 5), VL(T1, 'A', -2, -8), VL(T2, 'B', -2, 15));
    if(RV) kids.push(T(150, 198, 'PA = PB（切線長相等）', 'acc'));
    title = '圓外一點的兩條切線'; cap = '同一點拉出的兩條切線長度相等（同記號）';
    desc = '圓外一點 P 向圓 O 作兩條切線，切點為 A、B，兩段切線長 PA 與 PB 相等。';
  }
  return h(Fig, {vb:'0 0 300 205', title:title, desc:desc, caption:cap}, kids);
}

/* ── 10. 扇形與弧長 ────────────────────────────────────────────────── */
function SectorDiagram(p){
  var d = p.data || {}, HL = p.highlight, RV = p.reveal;
  if(d.full){
    var Oc = [150, 100], Rc = 78;
    var ck = [h('circle', {key:'c', cx:150, cy:100, r:Rc, className:HL ? 'hl' : 'stk'})];
    ck.push(seg(Oc, [150 + Rc, 100], 'stk', 'rr'));
    ck.push(dot(Oc, 'dot', 'o', 2.6), VL(Oc, 'O', -10, 5));
    ck.push(T(150 + Rc / 2, 94, 'r', 'lbl'));
    ck.push(T(150, 100 + Rc + 18,
             RV ? (d.mode === 'area' ? '圓面積 = πr²' : '圓周長 = 2πr')
                : (d.mode === 'area' ? '網底＝圓面積' : '外圈＝圓周長'),
             RV ? 'acc' : 'sm'));
    if(d.mode === 'area') ck.splice(1, 0, h('circle', {key:'f', cx:150, cy:100, r:Rc, className:'fillT'}));
    return h(Fig, {vb:'0 0 300 200', title:d.mode === 'area' ? '圓面積' : '圓周長',
      desc:'圓心為 O、半徑為 r 的圓。' + (d.mode === 'area' ? '網底部分是圓面積。' : '外圍粗線是圓周長。'),
      caption:RV ? (d.mode === 'area' ? '面積用 r 的平方；周長只用一次 r' : '周長是一圈的長度，用 2πr')
                 : (d.mode === 'area' ? '網底部分就是要求的面積' : '外圈一整圈的長度就是周長')}, ck);
  }
  var theta = d.theta || 120, R = 92, O = [150, 156];
  var a1 = 90 + theta / 2, a2 = 90 - theta / 2;
  var A = polar(O[0], O[1], R, a1), B = polar(O[0], O[1], R, a2);
  var large = theta > 180 ? 1 : 0;
  var kids = [h('path', {key:'sec', className:'fillT',
    d:'M' + fx(O[0]) + ' ' + fx(O[1]) + ' L' + fx(A[0]) + ' ' + fx(A[1]) +
      ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + fx(B[0]) + ' ' + fx(B[1]) + ' Z'})];
  kids.push(h('path', {key:'arc', className:HL ? 'hl' : 'stk', d:arcPath(O[0], O[1], R, a1, a2)}));
  kids.push(seg(O, A, 'stk', 'oa'), seg(O, B, 'stk', 'ob'));
  kids.push(angleArc(O, A, B, 26, 'thin', 'ang'));
  kids.push(AL(O, A, B, 44, RV ? theta + '°' : '圓心角', 'acc', 'lt'));
  kids.push(T(midp(O, A)[0] - 12, midp(O, A)[1], 'r', 'lbl', 'end'));
  kids.push(T(midp(O, B)[0] + 12, midp(O, B)[1], 'r', 'lbl', 'start'));
  kids.push(T(150, 46, '弧長', 'acc2'));
  kids.push(dot(O, 'dot', 'o', 2.6), VL(O, 'O', 0, 16));
  if(RV){
    kids.push(T(150, 188, '弧長 = 2πr ×（圓心角 / 360°）', 'acc'));
    kids.push(T(150, 204, '扇形面積 = πr² ×（圓心角 / 360°）', 'acc'));
  }
  return h(Fig, {vb:'0 0 300 212', title:'扇形與弧長',
    desc:'一個扇形，兩條半徑長 r，中間夾出圓心角，上方粗線是所對的弧。扇形佔整個圓的比例就是圓心角除以 360 度。',
    caption:'扇形就是整個圓的「圓心角 ÷ 360°」'}, kids);
}

/* ── 11. 坐標平面兩點距離 ──────────────────────────────────────────── */
function CoordinateDistanceDiagram(p){
  var d = p.data || {}, HL = p.highlight, RV = p.reveal;
  var ox = 58, oy = 158, u = 25;
  var mp = function(x, y){ return [ox + x * u, oy - y * u]; };
  var kids = [];
  for(var i = -1; i <= 8; i++) kids.push(h('line', {key:'gx' + i, className:'grid',
    x1:ox + i*u, y1:oy - 5*u, x2:ox + i*u, y2:oy + u}));
  for(var j = -1; j <= 5; j++) kids.push(h('line', {key:'gy' + j, className:'grid',
    x1:ox - u, y1:oy - j*u, x2:ox + 8*u, y2:oy - j*u}));
  kids.push(h('line', {key:'ax', className:'axis', x1:ox - u, y1:oy, x2:ox + 8*u, y2:oy}));
  kids.push(h('line', {key:'ay', className:'axis', x1:ox, y1:oy + u, x2:ox, y2:oy - 5*u}));
  kids.push(T(ox + 8*u - 2, oy + 14, 'x', 'lbl', 'end'), T(ox - 10, oy - 5*u + 10, 'y', 'lbl', 'end'));
  kids.push(T(ox - 8, oy + 14, 'O', 'lbl', 'end'));
  var A = mp(1, 1), B = mp(5, 4), Cc = mp(5, 1);
  kids.push(seg(A, Cc, HL ? 'hl' : 'dash', 'dx'), seg(Cc, B, HL ? 'hl' : 'dash', 'dy'));
  kids.push(seg(A, B, 'curve', 'ab'));
  kids.push(rightAngle(Cc, A, B, 11, 'ra'));
  kids.push(dot(A, 'dot', 'pa'), dot(B, 'dot', 'pb'));
  kids.push(T(A[0] - 6, A[1] + 16, 'A(1, 1)', 'sm', 'middle'), T(B[0] + 4, B[1] - 8, 'B(5, 4)', 'sm', 'middle'));
  kids.push(T(midp(A, Cc)[0], oy + 16, RV ? '5 − 1 = 4' : 'x 的差', 'acc'));
  kids.push(T(Cc[0] + 6, midp(Cc, B)[1] + 4, RV ? '4 − 1 = 3' : 'y 的差', 'acc', 'start'));
  if(RV) kids.push(T(150, 24, 'AB = √(4² + 3²) = 5', 'acc'));
  return h(Fig, {vb:'0 0 300 180', title:'坐標平面上兩點的距離',
    desc:'A(1, 1) 與 B(5, 4) 兩點，以 x 的差與 y 的差作出一個直角三角形，AB 是斜邊。',
    caption:'兩點距離＝以 x 差、y 差為兩股的斜邊'}, kids);
}

/* ── 座標格線共用 ──────────────────────────────────────────────────── */
function gridAxes(ox, oy, u, xr, yr, kids){
  var i;
  for(i = -xr; i <= xr; i++) kids.push(h('line', {key:'gx' + i, className:'grid',
    x1:fx(ox + i*u), y1:fx(oy - yr*u), x2:fx(ox + i*u), y2:fx(oy + yr*u)}));
  for(i = -yr; i <= yr; i++) kids.push(h('line', {key:'gy' + i, className:'grid',
    x1:fx(ox - xr*u), y1:fx(oy - i*u), x2:fx(ox + xr*u), y2:fx(oy - i*u)}));
  kids.push(h('line', {key:'ax', className:'axis', x1:fx(ox - xr*u), y1:oy, x2:fx(ox + xr*u), y2:oy}));
  kids.push(h('line', {key:'ay', className:'axis', x1:ox, y1:fx(oy - yr*u), x2:ox, y2:fx(oy + yr*u)}));
  kids.push(T(ox + xr*u - 3, oy - 6, 'x', 'lbl', 'end', 'lx'));
  kids.push(T(ox - 7, oy - yr*u + 11, 'y', 'lbl', 'end', 'ly'));
  kids.push(T(ox - 6, oy + 13, 'O', 'lbl', 'end', 'lo'));
}
function fnPath(f, x0, x1, mp, ymin, ymax){
  var segs = [], cur = [], n = 140;
  for(var i = 0; i <= n; i++){
    var x = x0 + (x1 - x0) * i / n, y = f(x);
    if(y >= ymin && y <= ymax){
      var q = mp(x, y);
      cur.push((cur.length ? 'L' : 'M') + fx(q[0]) + ' ' + fx(q[1]));
    } else if(cur.length){ segs.push(cur.join(' ')); cur = []; }
  }
  if(cur.length) segs.push(cur.join(' '));
  return segs.join(' ');
}

/* ── 12. 一次函數圖形 ──────────────────────────────────────────────── */
function LinearFunctionGraph(p){
  var d = p.data || {}, v = d.variant || 'compare', HL = p.highlight, RV = p.reveal;
  var ox = 150, oy = 106, u = 19, xr = 7, yr = 5;
  var mp = function(x, y){ return [ox + x*u, oy - y*u]; };
  var kids = []; gridAxes(ox, oy, u, xr, yr, kids);
  var line = function(f, cls, key){ return h('path', {key:key, className:cls,
    d:fnPath(f, -xr + 0.2, xr - 0.2, mp, -yr + 0.25, yr - 0.25)}); };
  var title, desc, cap;
  if(v === 'hv'){
    kids.push(line(function(){ return 3; }, HL ? 'hl' : 'curve', 'h'));
    kids.push(h('path', {key:'v', className:HL ? 'hl' : 'curve2',
      d:'M' + fx(mp(4, -yr + 0.25)[0]) + ' ' + fx(mp(4, -yr + 0.25)[1]) +
        ' L' + fx(mp(4, yr - 0.25)[0]) + ' ' + fx(mp(4, yr - 0.25)[1])}));
    kids.push(T(mp(-4.6, 3)[0], mp(-4.6, 3)[1] - 7, RV ? 'y = 3' : '水平線', 'acc2'));
    kids.push(T(mp(4, -3.6)[0] + 22, mp(4, -3.6)[1], RV ? 'x = 4' : '鉛垂線', 'acc'));
    kids.push(dot(mp(0, 3), 'dotT', 'p1'), dot(mp(4, 0), 'dotA', 'p2'));
    if(RV) kids.push(T(150, 14, 'y = c 是水平線，x = c 是鉛垂線', 'acc'));
    title = '水平線 y = c 與鉛垂線 x = c';
    desc = '實線 y = 3 是與 x 軸平行的水平線，虛線 x = 4 是與 y 軸平行的鉛垂線。';
    cap = RV ? 'y = 3：所有點的 y 都是 3　｜　x = 4：所有點的 x 都是 4'
             : '實線上每一點高度都相同；虛線上每一點左右位置都相同';
  } else if(v === 'bshift'){
    kids.push(line(function(x){ return x + 3; }, 'curve2', 'l1'));
    kids.push(line(function(x){ return x; }, HL ? 'hl' : 'curve', 'l2'));
    kids.push(line(function(x){ return x - 3; }, 'curve3', 'l3'));
    kids.push(dot(mp(0, 3), 'dotA', 'b1'), dot(mp(0, 0), 'dotT', 'b2'), dot(mp(0, -3), 'dot', 'b3'));
    kids.push.apply(kids, legend(22, 26, [
      {cls:'curve2', label:'b = 3'}, {cls:'curve', label:'b = 0'},
      {cls:'curve3', label:'b = −3'}], 'lb'));
    if(RV) kids.push(T(150, 14, 'a 相同時，b 只會把整條線上下平移', 'acc'));
    title = '改變 b 的上下平移';
    desc = '三條斜率相同的直線 y = x + 3、y = x、y = x − 3，彼此平行，b 決定與 y 軸的交點高度。';
    cap = 'b 就是與 y 軸的交點（0, b）';
  } else {
    kids.push(line(function(x){ return x + 1; }, HL ? 'hl' : 'curve', 'l1'));
    kids.push(line(function(x){ return -x + 1; }, 'curve2', 'l2'));
    kids.push(line(function(){ return 1; }, 'curve3', 'l3'));
    kids.push(dot(mp(0, 1), 'dotT', 'b0'));
    kids.push(T(mp(3.4, 4.4)[0], mp(3.4, 4.4)[1], 'a > 0', 'acc2'));
    kids.push(T(mp(-3.4, 4.4)[0], mp(-3.4, 4.4)[1], 'a < 0', 'acc'));
    kids.push(T(mp(5.2, 1)[0], mp(5.2, 1)[1] - 7, 'a = 0', 'sm'));
    if(RV) kids.push(T(150, 14, 'a > 0 往右上；a < 0 往右下；a = 0 是水平線', 'acc'));
    title = '一次函數 a 的正負';
    desc = '三條都通過 (0, 1) 的直線：實線 a > 0 由左下往右上，虛線 a < 0 由左上往右下，點線 a = 0 為水平線。';
    cap = '線型與文字同時區分：實線 a>0、虛線 a<0、點線 a=0';
  }
  return h(Fig, {vb:'0 0 300 212', title:title, desc:desc, caption:cap}, kids);
}

/* ── 13. 二次函數圖形 ──────────────────────────────────────────────── */
function QuadraticFunctionGraph(p){
  var d = p.data || {}, v = d.variant || 'vertex', HL = p.highlight, RV = p.reveal;
  var ox = 150, oy = 112, u = 17, xr = 8, yr = 5.4;
  var mp = function(x, y){ return [ox + x*u, oy - y*u]; };
  var kids = []; gridAxes(ox, oy, u, 8, 5, kids);
  var cur = function(f, cls, key){ return h('path', {key:key, className:cls,
    d:fnPath(f, -xr, xr, mp, -yr, yr)}); };
  var title, desc, cap;
  if(v === 'open'){
    kids.push(cur(function(x){ return 0.5*x*x; }, HL ? 'hl' : 'curve', 'c1'));
    kids.push(cur(function(x){ return -0.5*x*x; }, 'curve2', 'c2'));
    kids.push(dot(mp(0, 0), 'dot', 'o0'));
    kids.push(T(mp(3.8, 4.3)[0], mp(3.8, 4.3)[1], RV ? 'a > 0 開口向上' : '實線', 'acc2'));
    kids.push(T(mp(-3.6, -4.3)[0], mp(-3.6, -4.3)[1], RV ? 'a < 0 開口向下' : '虛線', 'acc'));
    if(RV) kids.push(T(150, 14, 'y = a(x − h)² + k 的 a 決定開口方向', 'acc'));
    title = '二次函數開口方向';
    desc = RV ? '實線是 a 大於 0 的拋物線，開口向上；虛線是 a 小於 0 的拋物線，開口向下。兩者頂點都在原點。'
              : '兩條頂點都在原點的拋物線，一條開口向上、一條開口向下。';
    cap = RV ? '實線 a>0 開口向上；虛線 a<0 開口向下' : '兩條拋物線的開口方向相反';
  } else if(v === 'width'){
    kids.push(cur(function(x){ return x*x; }, HL ? 'hl' : 'curve', 'c1'));
    kids.push(cur(function(x){ return 0.35*x*x; }, 'curve2', 'c2'));
    kids.push(cur(function(x){ return 0.12*x*x; }, 'curve3', 'c3'));
    kids.push(dot(mp(0, 0), 'dot', 'o0'));
    kids.push.apply(kids, legend(20, 152, [
      {cls:'curve', label:'|a| 大：開口窄'}, {cls:'curve2', label:'|a| 中'},
      {cls:'curve3', label:'|a| 小：開口寬'}], 'lw'));
    if(RV) kids.push(T(150, 14, '|a| 愈大開口愈窄，|a| 愈小開口愈寬', 'acc'));
    title = '｜a｜與開口寬窄';
    desc = '三條開口都向上的拋物線，實線的 a 絕對值最大、開口最窄，點線的 a 絕對值最小、開口最寬。';
    cap = '線型與文字同時區分：實線最窄、虛線居中、點線最寬';
  } else if(v === 'shift'){
    kids.push(cur(function(x){ return 0.5*x*x; }, 'curve3', 'c0'));
    kids.push(cur(function(x){ return 0.5*(x-3)*(x-3); }, 'curve2', 'c1'));
    kids.push(cur(function(x){ return 0.5*(x-3)*(x-3) - 3; }, HL ? 'hl' : 'curve', 'c2'));
    kids.push(dot(mp(0, 0), 'dot', 'v0'), dot(mp(3, 0), 'dotA', 'v1'), dot(mp(3, -3), 'dotT', 'v2'));
    kids.push(h('path', {key:'ar1', className:'thin',
      d:'M' + fx(mp(0.3, -0.5)[0]) + ' ' + fx(mp(0.3, -0.5)[1]) + ' L' + fx(mp(2.7, -0.5)[0]) + ' ' + fx(mp(2.7, -0.5)[1])}));
    kids.push(T(mp(1.5, -0.5)[0], mp(1.5, -0.5)[1] + 14, 'h = 3 右移', 'acc'));
    kids.push(h('path', {key:'ar2', className:'thin',
      d:'M' + fx(mp(3.5, -0.3)[0]) + ' ' + fx(mp(3.5, -0.3)[1]) + ' L' + fx(mp(3.5, -2.7)[0]) + ' ' + fx(mp(3.5, -2.7)[1])}));
    kids.push(T(mp(3.7, -1.6)[0], mp(3.7, -1.6)[1], 'k = −3 下移', 'acc2', 'start'));
    if(RV) kids.push(T(150, 14, 'h 管左右、k 管上下，頂點 (h, k)', 'acc'));
    title = '二次函數的平移';
    desc = '從點線 y = ½x² 出發，先向右平移 3 得到虛線，再向下平移 3 得到實線，頂點落在 (3, −3)。';
    cap = 'h 往右為正、k 往上為正';
  } else {
    kids.push(cur(function(x){ return 0.5*(x-3)*(x-3) - 3; }, 'curve', 'c'));
    kids.push(h('path', {key:'ax2', className:HL ? 'hl' : 'curve2',
      d:'M' + fx(mp(3, -yr + 0.2)[0]) + ' ' + fx(mp(3, -yr + 0.2)[1]) +
        ' L' + fx(mp(3, yr - 0.2)[0]) + ' ' + fx(mp(3, yr - 0.2)[1])}));
    kids.push(dot(mp(3, -3), 'dotT', 'vx', 4));
    kids.push(T(mp(3, -3)[0] - 8, mp(3, -3)[1] + 16, RV ? '頂點 (3, −3)' : '頂點', 'acc2', 'end'));
    kids.push(T(mp(3, 4.2)[0] + 6, mp(3, 4.2)[1], RV ? '對稱軸 x = 3' : '對稱軸', 'acc', 'start'));
    kids.push(dot(mp(1, -1), 'dot', 'q1', 2.6), dot(mp(5, -1), 'dot', 'q2', 2.6));
    kids.push(h('path', {key:'mir', className:'thin',
      d:'M' + fx(mp(1, -1)[0]) + ' ' + fx(mp(1, -1)[1]) + ' L' + fx(mp(5, -1)[0]) + ' ' + fx(mp(5, -1)[1])}));
    kids.push(T(mp(2, -1)[0], mp(2, -1)[1] - 6, '2', 'sm'), T(mp(4, -1)[0], mp(4, -1)[1] - 6, '2', 'sm'));
    if(RV) kids.push(T(150, 14, 'y = a(x − 3)² − 3 ⇒ 頂點 (3, −3)、對稱軸 x = 3', 'acc'));
    title = '頂點與對稱軸';
    desc = '拋物線 y = a(x − 3)² − 3 的頂點在 (3, −3)，對稱軸是鉛垂虛線 x = 3，軸兩側等距的點高度相同。';
    cap = '對稱軸通過頂點，左右等距的點 y 值相同';
  }
  return h(Fig, {vb:'0 0 300 212', title:title, desc:desc, caption:cap}, kids);
}

/* ── 14. 立體圖形與展開圖 ──────────────────────────────────────────── */
function SolidNetDiagram(p){
  var d = p.data || {}, v = d.variant || 'prism', HL = p.highlight, RV = p.reveal;
  var kids = [], title, desc, cap;
  if(v === 'prism'){
    var bt = [[62, 168], [150, 190], [242, 168], [150, 148]];
    var tp = bt.map(function(q){ return [q[0], q[1] - 86]; });
    kids.push(poly(bt, HL ? 'hl' : 'fillT', 'base'));
    kids.push(poly(tp, 'stk', 'top'));
    kids.push(seg(bt[0], tp[0], 'stk', 'e0'), seg(bt[1], tp[1], 'stk', 'e1'),
              seg(bt[2], tp[2], 'stk', 'e2'), seg(bt[3], tp[3], 'dash', 'e3'));
    kids.push(seg(bt[3], bt[0], 'dash', 'h1'), seg(bt[3], bt[2], 'dash', 'h2'));
    kids.push(rightAngle(bt[0], bt[1], tp[0], 11, 'ra'));
    kids.push(T(150, 176, '底面積', 'acc2'));
    kids.push(T(50, 126, '高', 'acc', 'end'));
    if(RV) kids.push(T(150, 26, '直角柱體積 = 底面積 × 高', 'acc'));
    title = '直角柱'; cap = '側稜垂直於底面，體積＝底面積 × 高';
    desc = '一個直角柱，底面以網底標示，側稜的長度就是高，側稜與底面垂直（直角記號）。虛線是被擋住的稜。';
  } else if(v === 'prism-net'){
    kids.push(h('rect', {key:'r1', x:56, y:66, width:60, height:78, className:'stk'}));
    kids.push(h('rect', {key:'r2', x:116, y:66, width:60, height:78, className:'stk'}));
    kids.push(h('rect', {key:'r3', x:176, y:66, width:60, height:78, className:'stk'}));
    kids.push(poly([[116, 66], [176, 66], [146, 20]], HL ? 'hl' : 'fillT', 'tt'));
    kids.push(poly([[116, 144], [176, 144], [146, 190]], HL ? 'hl' : 'fillT', 'tb'));
    kids.push(T(146, 40, '底面', 'acc2'), T(146, 176, '底面', 'acc2'));
    kids.push(T(86, 110, '側面', 'sm'), T(146, 110, '側面', 'sm'), T(206, 110, '側面', 'sm'));
    kids.push(T(270, 104, '高', 'acc'), seg([250, 66], [250, 144], 'thin', 'hh'));
    kids.push(seg([246, 66], [254, 66], 'thin', 'ht'), seg([246, 144], [254, 144], 'thin', 'hb'));
    if(RV) kids.push(T(150, 206, '表面積 = 2 × 底面積 + 底面周長 × 高', 'acc'));
    title = '三角柱展開圖'; cap = '側面攤開是一個長方形，長＝底面周長，寬＝高';
    desc = '三角柱的展開圖：中間三個長方形是側面，上下兩個三角形是底面。';
  } else if(v === 'cylinder-net'){
    kids.push(h('rect', {key:'r', x:88, y:62, width:124, height:76, className:'stk'}));
    kids.push(h('circle', {key:'c1', cx:150, cy:36, r:22, className:HL ? 'hl' : 'fillT'}));
    kids.push(h('circle', {key:'c2', cx:150, cy:164, r:22, className:HL ? 'hl' : 'fillT'}));
    kids.push(T(150, 104, '側面（長方形）', 'sm'));
    kids.push(T(150, 40, 'r', 'lbl'), seg([150, 36], [172, 36], 'thin', 'rr'));
    kids.push(T(150, 56, RV ? '長 = 2πr' : '長 = ？', 'acc'));
    kids.push(T(240, 100, '高', 'acc'), seg([224, 62], [224, 138], 'thin', 'hh'));
    if(RV) kids.push(T(150, 196, '側面長方形的長就是底圓周長 2πr', 'acc'));
    title = '圓柱展開圖'; cap = '側面長方形的長＝底圓周長 2πr，寬＝柱體的高';
    desc = '圓柱展開後：中間長方形為側面，上下兩個圓為底面，長方形的長等於底圓的圓周長。';
  } else if(v === 'cone-net'){
    var O = [96, 112], R = 74;
    kids.push(h('path', {key:'sec', className:HL ? 'hl' : 'fillT',
      d:'M' + O[0] + ' ' + O[1] + ' L' + fx(polar(O[0], O[1], R, 62)[0]) + ' ' + fx(polar(O[0], O[1], R, 62)[1]) +
        ' A' + R + ' ' + R + ' 0 0 1 ' + fx(polar(O[0], O[1], R, -62)[0]) + ' ' + fx(polar(O[0], O[1], R, -62)[1]) + ' Z'}));
    kids.push(h('circle', {key:'c', cx:238, cy:112, r:32, className:'fillT'}));
    kids.push(T(96, 62, '扇形＝側面', 'acc2'), T(238, 116, '底圓', 'sm'));
    kids.push(T(238, 100, 'r', 'lbl'), seg([238, 112], [270, 112], 'thin', 'rr'));
    kids.push(T(126, 118, 'ℓ', 'lbl'));
    if(RV) kids.push(T(150, 190, '扇形弧長 = 底圓周長 2πr（本課程不處理錐體體積）', 'acc'));
    title = '圓錐展開圖'; cap = '側面扇形的弧長＝底圓周長；只處理展開圖與表面積';
    desc = '圓錐展開後：左邊的扇形是側面，母線長 ℓ 就是扇形半徑；右邊的圓是底面，半徑 r。';
  } else {  /* pyramid-net */
    kids.push(h('rect', {key:'sq', x:114, y:76, width:72, height:72, className:HL ? 'hl' : 'fillT'}));
    kids.push(poly([[114, 76], [186, 76], [150, 20]], 'stk', 'f1'));
    kids.push(poly([[114, 148], [186, 148], [150, 194]], 'stk', 'f2'));
    kids.push(poly([[114, 76], [114, 148], [56, 112]], 'stk', 'f3'));
    kids.push(poly([[186, 76], [186, 148], [244, 112]], 'stk', 'f4'));
    kids.push(T(150, 116, '底面正方形', 'acc2'));
    kids.push(T(150, 46, '側面', 'sm'), T(150, 172, '側面', 'sm'),
              T(88, 116, '側面', 'sm'), T(212, 116, '側面', 'sm'));
    if(RV) kids.push(T(150, 208, '表面積 = 底面積 + 4 個側面三角形面積', 'acc'));
    title = '正四角錐展開圖'; cap = '底面正方形 + 四個全等的側面三角形';
    desc = '正四角錐的展開圖：中間是底面正方形，四邊各接一個全等的等腰三角形側面。';
  }
  return h(Fig, {vb:'0 0 300 215', title:title, desc:desc, caption:cap}, kids);
}

/* ── 圖形註冊表 ────────────────────────────────────────────────────── */
var DIAGRAMS = {
  TriangleDiagram:TriangleDiagram, ParallelLinesDiagram:ParallelLinesDiagram,
  CongruenceDiagram:CongruenceDiagram, SimilarTriangleDiagram:SimilarTriangleDiagram,
  SpecialRightTriangleDiagram:SpecialRightTriangleDiagram, TriangleCentersDiagram:TriangleCentersDiagram,
  QuadrilateralDiagram:QuadrilateralDiagram, CircleAngleDiagram:CircleAngleDiagram,
  CircleTangentDiagram:CircleTangentDiagram, SectorDiagram:SectorDiagram,
  CoordinateDistanceDiagram:CoordinateDistanceDiagram, LinearFunctionGraph:LinearFunctionGraph,
  QuadraticFunctionGraph:QuadraticFunctionGraph, SolidNetDiagram:SolidNetDiagram
};
function Diagram(props){
  var C = DIAGRAMS[props.type];
  if(!C) return null;
  return h(C, {data:props.data || {}, highlight:!!props.highlight, reveal:!!props.reveal});
}
