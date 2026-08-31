/* ══════════════════════════════════════════════════════════════════════
   數學排版：把受限的 TeX 子集直接排成 HTML（不使用外部字型檔）
   支援：\frac \dfrac \sqrt \overline \text{} \operatorname{} 上下標
        希臘字母與運算符號、分組 {}、\left \right
   ══════════════════════════════════════════════════════════════════════ */
var h = React.createElement;

var SYM = {
  pi:'π', theta:'θ', alpha:'α', beta:'β', gamma:'γ',
  Delta:'Δ', times:'×', div:'÷', pm:'±', mp:'∓',
  cdot:'·', le:'≤', leq:'≤', ge:'≥', geq:'≥',
  ne:'≠', neq:'≠', approx:'≈', circ:'°',
  angle:'∠', triangle:'△', parallel:'∥', perp:'⊥',
  sim:'∽', cong:'≅', odot:'⊙', square:'□',
  Rightarrow:'⇒', rightarrow:'→', to:'→', leftrightarrow:'↔',
  Leftrightarrow:'⇔', iff:'⇔', checkmark:'✓',
  ldots:'…', cdots:'⋯', infty:'∞', sum:'∑',
  cup:'∪', cap:'∩', in:'∈', neg:'¬', prime:'′'
};
var SYM_TEXT = {
  'π':'pi','×':'乘','÷':'除以','±':'正負','≤':'小於等於',
  '≥':'大於等於','≠':'不等於','≈':'約等於','°':'度',
  '∠':'角','△':'三角形','∥':'平行','⊥':'垂直','∽':'相似於',
  '≅':'全等於','⇒':'則','⇔':'等價於','→':'到','∑':'總和','·':'乘','✓':'正確',
  '=':'等於','+':'加','-':'減','<':'小於','>':'大於',':':'比',
  '(':'左括號',')':'右括號','|':'絕對值','%':'百分比'
};
var FNS = {gcd:'gcd', lcm:'lcm', max:'max', min:'min', log:'log'};
var RELS = '=≤≥≠≈<>∥⊥∽≅⇒⇔→↔:';
var BINS = '+×÷±∓·';

function tokenize(src){
  var t = [], i = 0, n = src.length;
  while(i < n){
    var c = src[i];
    if(c === '\\'){
      var raw = /^\\(text|operatorname|mathrm|blank)\{/.exec(src.slice(i));
      if(raw){
        var j = i + raw[0].length, depth = 1, buf = '';
        while(j < n && depth > 0){
          if(src[j] === '{') depth++;
          else if(src[j] === '}'){ depth--; if(!depth) break; }
          buf += src[j]; j++;
        }
        t.push({t: raw[1] === 'text' ? 'text' : raw[1] === 'blank' ? 'blank' : 'fnname', v: buf});
        i = j + 1; continue;
      }
      var m = /^\\([a-zA-Z]+)/.exec(src.slice(i));
      if(m){ t.push({t:'cmd', v:m[1]}); i += m[0].length; }
      else { t.push({t:'chr', v:src[i+1] || ''}); i += 2; }
    }
    else if(c === '{'){ t.push({t:'{'}); i++; }
    else if(c === '}'){ t.push({t:'}'}); i++; }
    else if(c === '^'){ t.push({t:'^'}); i++; }
    else if(c === '_'){ t.push({t:'_'}); i++; }
    else if(c === ' '){ i++; }
    else if(c >= '0' && c <= '9'){
      var mm = /^[0-9]+(\.[0-9]+)?/.exec(src.slice(i));
      t.push({t:'num', v:mm[0]}); i += mm[0].length;
    }
    else { t.push({t:'chr', v:c}); i++; }
  }
  return t;
}

function parseSeq(ts, i, stopAtClose){
  var out = [];
  while(i < ts.length){
    if(ts[i].t === '}'){ if(stopAtClose) return [out, i+1]; i++; continue; }
    var r = parseUnit(ts, i);
    if(r[0]) out.push(r[0]);
    if(r[1] === i) i++; else i = r[1];
  }
  return [out, i];
}

function parseArg(ts, i){
  if(!ts[i]) return [{k:'seq', c:[]}, i];
  if(ts[i].t === '{'){ var r = parseSeq(ts, i+1, true); return [{k:'seq', c:r[0]}, r[1]]; }
  var a = parseAtom(ts, i);
  return [{k:'seq', c: a[0] ? [a[0]] : []}, a[1]];
}

function parseAtom(ts, i){
  var tk = ts[i];
  if(!tk) return [null, i];
  if(tk.t === '{'){ var r = parseSeq(ts, i+1, true); return [{k:'seq', c:r[0]}, r[1]]; }
  if(tk.t === 'text') return [{k:'text', v:tk.v}, i+1];
  if(tk.t === 'blank') return [{k:'blank', n:Number(tk.v) || 1}, i+1];
  if(tk.t === 'fnname') return [{k:'fn', v:tk.v}, i+1];
  if(tk.t === 'num') return [{k:'num', v:tk.v}, i+1];
  if(tk.t === 'cmd'){
    var c = tk.v;
    if(c === 'frac' || c === 'dfrac'){
      var a = parseArg(ts, i+1), b = parseArg(ts, a[1]);
      return [{k:'frac', n:a[0], d:b[0], big:(c === 'dfrac')}, b[1]];
    }
    if(c === 'sqrt'){ var s = parseArg(ts, i+1); return [{k:'sqrt', c:s[0]}, s[1]]; }
    if(c === 'overline' || c === 'bar'){ var o = parseArg(ts, i+1); return [{k:'ovl', c:o[0]}, o[1]]; }
    if(c === 'left' || c === 'right' || c === 'displaystyle') return [null, i+1];
    if(c === 'quad') return [{k:'sp', v:' '}, i+1];
    if(c === ',' ) return [{k:'sp', v:' '}, i+1];
    if(SYM[c]) return [{k:'sym', v:SYM[c]}, i+1];
    if(FNS[c]) return [{k:'fn', v:FNS[c]}, i+1];
    return [{k:'chr', v:c}, i+1];
  }
  if(tk.t === 'chr') return [{k:'chr', v:tk.v}, i+1];
  return [null, i+1];
}

function parseUnit(ts, i){
  var a = parseAtom(ts, i);
  var node = a[0]; i = a[1];
  var sup = null, sub = null, guard = 0;
  while(i < ts.length && (ts[i].t === '^' || ts[i].t === '_') && guard++ < 4){
    var kind = ts[i].t;
    var arg = parseArg(ts, i+1);
    if(kind === '^') sup = arg[0]; else sub = arg[0];
    i = arg[1];
  }
  if(sup || sub) node = {k:'script', base:node, sup:sup, sub:sub};
  return [node, i];
}

function parse(src){ return parseSeq(tokenize(String(src)), 0, false)[0]; }

/* ── 繪製 ─────────────────────────────────────────────────────────── */
function isOpenish(node){
  if(!node) return true;
  if(node.k === 'chr') return RELS.indexOf(node.v) >= 0 || BINS.indexOf(node.v) >= 0 || node.v === '(' || node.v === '[';
  if(node.k === 'sym') return RELS.indexOf(node.v) >= 0 || BINS.indexOf(node.v) >= 0;
  return false;
}

/* 填空格由外部注入：渲染期間單執行緒使用，渲染結束即清除 */
var _slots = null;
function renderSeq(nodes, keyPrefix){
  var out = [];
  for(var i = 0; i < nodes.length; i++){
    out.push(renderNode(nodes[i], keyPrefix + '-' + i, nodes[i-1]));
  }
  return out;
}

function renderNode(node, key, prev){
  if(!node) return null;
  switch(node.k){
    case 'seq': return h('span', {key:key}, renderSeq(node.c, key));
    case 'num': return h('span', {key:key, className:'n'}, node.v);
    case 'text': return h('span', {key:key, className:'tx'}, node.v);
    case 'blank':
      return _slots ? _slots(node.n, key) : h('span', {key:key, className:'blank'}, '？');
    case 'fn': return h('span', {key:key, className:'fn'}, node.v);
    case 'sp': return h('span', {key:key}, node.v);
    case 'sym':
      if(RELS.indexOf(node.v) >= 0) return h('span', {key:key, className:'rel'}, node.v);
      if(BINS.indexOf(node.v) >= 0) return h('span', {key:key, className:'op'}, node.v);
      return h('span', {key:key}, node.v);
    case 'chr':
      var v = node.v;
      if(v === '-'){
        return isOpenish(prev)
          ? h('span', {key:key}, '−')
          : h('span', {key:key, className:'op'}, '−');
      }
      if(RELS.indexOf(v) >= 0) return h('span', {key:key, className:'rel'}, v);
      if(BINS.indexOf(v) >= 0) return h('span', {key:key, className:'op'}, v);
      if(/[a-zA-Z]/.test(v)) return h('span', {key:key, className:'v'}, v);
      return h('span', {key:key}, v);
    case 'ovl':
      return h('span', {key:key, className:'ovl'}, renderNode(node.c, key + 'o'));
    case 'frac':
      return h('span', {key:key, className:'frac' + (node.big ? ' dfrac' : '')},
        h('span', {className:'num2'}, renderNode(node.n, key + 'n')),
        h('span', {className:'den'}, renderNode(node.d, key + 'd')));
    case 'sqrt':
      return h('span', {key:key, className:'sqrt'},
        h('span', {className:'sign'}, '√'),
        h('span', {className:'cand'}, renderNode(node.c, key + 'r')));
    case 'script':
      return h('span', {key:key, className:'sc'},
        renderNode(node.base, key + 'b', prev),
        node.sub ? h('span', {className:'sub'}, renderNode(node.sub, key + 'sb')) : null,
        node.sup ? h('span', {className:'sup'}, renderNode(node.sup, key + 'sp')) : null);
    default: return null;
  }
}

/* ── 給螢幕閱讀器的口語化文字 ─────────────────────────────────────── */
function speak(nodes){
  var s = '';
  for(var i = 0; i < nodes.length; i++){
    var nd = nodes[i];
    if(!nd) continue;
    switch(nd.k){
      case 'seq': s += speak(nd.c); break;
      case 'num': s += nd.v; break;
      case 'text': s += nd.v; break;
      case 'blank': s += ' 空格 '; break;
      case 'fn': s += ' ' + nd.v + ' '; break;
      case 'sp': s += ' '; break;
      case 'sym': case 'chr':
        s += SYM_TEXT[nd.v] ? ' ' + SYM_TEXT[nd.v] + ' ' : nd.v; break;
      case 'ovl': s += '線段' + speak([nd.c]); break;
      case 'frac': s += '（' + speak([nd.d]) + ' 分之 ' + speak([nd.n]) + '）'; break;
      case 'sqrt': s += ' 根號（' + speak([nd.c]) + '）'; break;
      case 'script':
        s += speak([nd.base]);
        if(nd.sub) s += ' 下標 ' + speak([nd.sub]);
        if(nd.sup){
          var e = speak([nd.sup]).trim();
          s += (e === '2') ? ' 平方' : (e === '3') ? ' 立方' : ' 的 ' + e + ' 次方';
        }
        break;
    }
  }
  return s;
}

var _memo = {};
function parseMemo(src){
  if(!(src in _memo)) _memo[src] = parse(src);
  return _memo[src];
}

/* 行內公式 */
function M(props){
  var src = props.t == null ? '' : String(props.t);
  var nodes;
  try { nodes = parseMemo(src); }
  catch(e){ return h('span', {className:'m'}, src); }
  var cls = 'm' + (props.block ? ' blk' : '') + (props.cls ? ' ' + props.cls : '');
  if(props.slots){
    _slots = props.slots;
    var body;
    try { body = renderSeq(nodes, 'm'); } finally { _slots = null; }
    /* 含互動空格：不加 aria-hidden，讓每個空格按鈕都能被讀到 */
    return h('span', {className:cls, role:'math'}, body);
  }
  return h('span', {className:cls, role:'math'},
    h('span', {'aria-hidden':'true'}, renderSeq(nodes, 'm')),
    h('span', {className:'sr'}, speak(nodes)));
}
/* 展示型公式（置中、可橫向捲動） */
function MB(props){ return h('div', {className:'mwrap'}, M({t:props.t, block:true, cls:props.cls})); }
