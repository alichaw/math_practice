/* ══════════════════════════════════════════════════════════════════════
   介面元件
   ══════════════════════════════════════════════════════════════════════ */
var useState = React.useState, useEffect = React.useEffect,
    useMemo = React.useMemo, useRef = React.useRef;

function cx(){
  var out = [];
  for(var i = 0; i < arguments.length; i++) if(arguments[i]) out.push(arguments[i]);
  return out.join(' ');
}
function SectionHead(props){
  return h('div', {className:'secthead'},
    h('h2', null, props.title),
    h('span', {className:'line'}),
    props.right ? h('span', {className:'eyebrow'}, props.right) : null);
}
function Tag(props){
  return h('span', {className:cx('tag', props.tone)}, props.children);
}
function MasteryDot(props){
  var lv = props.level;
  return h(React.Fragment, null,
    h('span', {className:'dotmark m' + lv, 'aria-hidden':'true'}),
    h('span', null, MASTERY_LABEL[lv]));
}
function Sheet(props){
  useEffect(function(){
    function onKey(e){ if(e.key === 'Escape') props.onClose(); }
    document.addEventListener('keydown', onKey);
    var prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return function(){
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, []);
  return h('div', {className:'scrim', onClick:function(e){
      if(e.target === e.currentTarget) props.onClose();
    }, role:'dialog', 'aria-modal':'true', 'aria-label':props.title},
    h('div', {className:'sheetbox'},
      h('div', {className:'sheethead'},
        h('h3', null, props.title),
        h('button', {className:'xbtn', onClick:props.onClose, 'aria-label':'關閉'}, '✕')),
      h('div', {className:'sheetbody'}, props.children)));
}
function Modal(props){
  useEffect(function(){
    function onKey(e){ if(e.key === 'Escape') props.onClose(); }
    document.addEventListener('keydown', onKey);
    return function(){ document.removeEventListener('keydown', onKey); };
  }, []);
  return h('div', {className:'scrim center', role:'dialog', 'aria-modal':'true',
      'aria-label':props.title, onClick:function(e){
        if(e.target === e.currentTarget) props.onClose();
      }},
    h('div', {className:'modal'},
      h('h3', {style:{marginBottom:'8px'}}, props.title),
      props.children));
}
function FormulaBox(props){
  if(props.hidden){
    return h('div', {className:'formula-card hidden'}, '公式已蓋住，點「顯示公式」查看');
  }
  return h('div', {className:'formula-card'}, h(MB, {t:props.t}));
}
function DiagramSlot(props){
  if(!props.type) return null;
  return h(Diagram, {type:props.type, data:props.data,
    highlight:props.highlight, reveal:props.reveal});
}

/* ── 作答元件：公式積木填空 ────────────────────────────────────────
   空格交給數學排版器渲染，所以放在分數的分子分母、根號內或指數位置
   都能正確顯示。                                                      */
function blanksOk(q, filled){
  if(q.anyOrder){
    var a = filled.slice().sort(), b = q.blanks.slice().sort();
    return a.length === b.length && a.every(function(v, i){ return v === b[i]; });
  }
  return filled.every(function(v, i){ return v === q.blanks[i]; });
}
/* 個別空格是否正確：可互換的題目只要答案在正解集合裡就算對 */
function blankState(q, filled, i){
  if(!q.anyOrder) return filled[i] === q.blanks[i];
  var pool = q.blanks.slice();
  for(var j = 0; j < filled.length; j++){
    if(j === i) continue;
    var at = pool.indexOf(filled[j]);
    if(at >= 0) pool.splice(at, 1);
  }
  return pool.indexOf(filled[i]) >= 0;
}
function BlankAnswer(props){
  var q = props.q, filled = props.filled, locked = props.locked, active = props.active;
  var src = String(q.template).replace(/@(\d+)/g, function(_m, n){ return '\\blank{' + n + '}'; });
  function slot(n, key){
    var bi = n - 1, val = filled[bi];
    var state = locked ? (blankState(q, filled, bi) ? 'ok' : 'bad')
                       : (active === bi ? 'active' : (val ? 'filled' : ''));
    return h('button', {key:key, type:'button', className:cx('blank', state), disabled:locked,
      'aria-label':'第 ' + n + ' 個空格' + (val ? '，已填入答案' : '，尚未填入'),
      onClick:function(){ props.onBlankClick(bi); }},
      val ? h(M, {t:val}) : '？');
  }
  var usedCount = {};
  filled.forEach(function(v){ if(v) usedCount[v] = (usedCount[v] || 0) + 1; });
  return h('div', null,
    h('div', {className:'mwrap'}, h(M, {t:src, block:true, slots:slot})),
    locked ? null : h('div', null,
      h('div', {className:'eyebrow', style:{marginTop:'8px'}}, '公式積木'),
      h('div', {className:'bank'}, q.bank.map(function(tok, i){
        return h('button', {key:i, type:'button',
          className:cx('token', usedCount[tok] ? 'used' : ''),
          onClick:function(){ props.onToken(tok); }}, h(M, {t:tok}));
      }))),
    q.anyOrder && !locked
      ? h('div', {className:'tiny muted', style:{marginTop:'6px'}}, '兩個空格的順序可以互換。')
      : null);
}

/* ── 作答元件：選項 ────────────────────────────────────────────────── */
var OPT_KEYS = ['A', 'B', 'C', 'D'];
function ChoiceAnswer(props){
  var q = props.q, picked = props.picked, locked = props.locked;
  return h('div', {role:'group', 'aria-label':'選項'}, q.options.map(function(o, i){
    var state = '';
    if(locked){
      if(i === q.answer) state = 'ok';
      else if(i === picked) state = 'bad';
    }
    return h('button', {key:i, type:'button', className:cx('opt', state),
      'aria-pressed':picked === i, disabled:locked,
      onClick:function(){ props.onPick(i); }},
      h('span', {className:'key'}, OPT_KEYS[i]),
      h('span', {style:{flex:1}}, o.math ? h(M, {t:o.math}) : o.t),
      locked && i === q.answer ? h('span', {className:'mark'}, '✓ 正解') : null,
      locked && i === picked && i !== q.answer ? h('span', {className:'mark'}, '✕ 你選的') : null);
  }));
}

/* ── 作答元件：數字鍵盤 ────────────────────────────────────────────── */
var PAD = ['7', '8', '9', '⌫', '4', '5', '6', '−', '1', '2', '3', '.', '0', '清除'];
function NumericAnswer(props){
  var val = props.value, locked = props.locked;
  function press(k){
    if(locked) return;
    if(k === '⌫') props.onChange(val.slice(0, -1));
    else if(k === '清除') props.onChange('');
    else if(k === '−') props.onChange(val.indexOf('-') === 0 ? val.slice(1) : '-' + val);
    else props.onChange(val + k);
  }
  return h('div', null,
    h('div', {className:'numview'},
      h('span', {style:{fontFamily:'"IBM Plex Mono",monospace', fontSize:'20px',
        fontVariantNumeric:'tabular-nums'}},
        val ? val.replace(/-/g, '−') : '　'),
      props.unit ? h('span', {className:'muted small', style:{marginLeft:'6px'}}, props.unit) : null),
    locked ? null : h('div', {className:'keypad'}, PAD.map(function(k){
      return h('button', {key:k, type:'button', onClick:function(){ press(k); },
        'aria-label':k === '⌫' ? '刪除一個字' : k,
        style:k === '清除' ? {gridColumn:'span 3'} : null}, k);
    })));
}
function numEq(a, b){
  var na = parseFloat(String(a).replace(/−/g, '-')), nb = parseFloat(String(b).replace(/−/g, '-'));
  if(!isNaN(na) && !isNaN(nb)) return Math.abs(na - nb) < 1e-9;
  return String(a).trim() === String(b).trim();
}

function renderAnswer(q){
  if(q.type === 'numeric'){
    return h('b', null, String(q.answer).replace(/-/g, '−') + (q.unit ? ' ' + q.unit : ''));
  }
  if(q.options && q.options[q.answer]){
    var o = q.options[q.answer];
    return h('span', null,
      h('b', null, OPT_KEYS[q.answer] + '　'),
      o.math ? h(M, {t:o.math}) : h('b', null, o.t),
      q.unit ? h('span', null, ' ' + q.unit) : null);
  }
  return h('b', null, '—');
}

/* ── 練習流程 ─────────────────────────────────────────────────────── */
function SessionView(props){
  var st = props.state, item = st.queue[st.idx], card = CARD_BY_ID[item.cardId];
  var kind = item.kind;
  /* 依題庫索引取題：同一張卡重複練習時會輪到下一題 */
  var q = qFor(card, kind, item.qi);
  var locked = st.phase !== 'answer';
  var canSubmit = q.type === 'blank' ? st.filled.every(function(v){ return !!v; })
                : q.type === 'numeric' ? st.num.length > 0
                : st.picked !== null;

  function submit(){
    var correct;
    if(q.type === 'blank') correct = blanksOk(q, st.filled);
    else if(q.type === 'numeric') correct = numEq(st.num, q.answer);
    else correct = st.picked === q.answer;
    props.onSubmit(correct);
  }

  var head = h('div', null,
    h('div', {className:'progressline', role:'progressbar',
      'aria-valuenow':st.idx + 1, 'aria-valuemin':1, 'aria-valuemax':st.queue.length,
      'aria-label':'練習進度'},
      st.queue.map(function(item, i){
        var cls = i < st.idx ? (st.results[i] === false ? 'miss' : 'done') : (i === st.idx ? 'now' : '');
        return h('i', {key:i, className:cls});
      })),
    h('div', {style:{display:'flex', alignItems:'baseline', gap:'8px', marginBottom:'6px'}},
      h('span', {className:'eyebrow'}, KINDS[kind]),
      h('span', {className:'tiny muted', style:{marginLeft:'auto'}},
        (st.idx + 1) + ' / ' + st.queue.length),
      h('button', {className:'tiny muted', style:{textDecoration:'underline'},
        onClick:props.onQuit}, '結束')),
    st.queue[st.idx].retry
      ? h('div', {className:'banner', style:{marginBottom:'10px'}},
          h('span', null, '↻'), h('span', null, '這張剛才答錯了，再練一次。'))
      : null);

  /* ① 作答狀態：不顯示公式與答案 */
  if(st.phase === 'answer' || st.phase === 'reason'){
    return h('div', null, head,
      h('div', {className:'block'},
        h('h3', null, q.prompt),
        card.diagramType && kind !== 'recall'
          ? h('div', {style:{marginTop:'10px'}},
              h(DiagramSlot, {type:card.diagramType, data:card.diagramData,
                highlight:st.hint >= 2, reveal:false}))
          : (card.diagramType && st.hint >= 2
              ? h('div', {style:{marginTop:'10px'}},
                  h(DiagramSlot, {type:card.diagramType, data:card.diagramData,
                    highlight:true, reveal:false}))
              : null),
        q.given ? h('div', {style:{marginTop:'8px'}}, h(MB, {t:q.given})) : null,
        h('div', {style:{marginTop:'10px'}},
          q.type === 'blank'
            ? h(BlankAnswer, {q:q, filled:st.filled, active:st.active, locked:locked,
                onBlankClick:props.onBlankClick, onToken:props.onToken})
            : q.type === 'numeric'
              ? h(NumericAnswer, {value:st.num, unit:q.unit, locked:locked, onChange:props.onNum})
              : h(ChoiceAnswer, {q:q, picked:st.picked, locked:locked, onPick:props.onPick}))),
      st.hint >= 1 ? h('div', {className:'banner', style:{marginTop:'10px'}},
        h('span', {'aria-hidden':'true'}, '①'),
        h('span', null, h('b', null, '提示一（使用時機）：'), q.hint1 || card.usageConditions)) : null,
      st.hint >= 2 ? h('div', {className:'banner teal', style:{marginTop:'8px'}},
        h('span', {'aria-hidden':'true'}, '②'),
        h('span', null, h('b', null, '提示二：'),
          card.diagramType ? '圖上已用琥珀色粗線標出要用到的邊、角或弧。'
                           : ('關鍵符號 ── ' + card.variables.map(function(v){
                               return v.sym + '：' + v.desc; }).join('；')))) : null,
      st.phase === 'reason'
        ? h('div', {className:'block', style:{marginTop:'10px'}},
            h('div', {className:'banner red', style:{marginBottom:'10px'}},
              h('span', {'aria-hidden':'true'}, '✕'),
              h('span', null, '這題答錯了。選一個最主要的原因，之後會幫你追蹤。')),
            h('div', {className:'chips'}, ERROR_REASONS.map(function(r){
              return h('button', {key:r.id, className:'chip', type:'button',
                'aria-pressed':st.reason === r.id,
                onClick:function(){ props.onReason(r.id); }}, r.label);
            })),
            h('div', {className:'btnrow'},
              h('button', {className:'btn', disabled:!st.reason, onClick:props.onToExplain},
                '看解析')))
        : h('div', {className:'btnrow'},
            st.hint < 2
              ? h('button', {className:'btn ghost', onClick:props.onHint},
                  st.hint === 0 ? '提示' : '再一個提示')
              : null,
            h('button', {className:'btn primary', disabled:!canSubmit, onClick:submit}, '送出答案')));
  }

  /* ② 解析狀態 */
  var correct = st.results[st.idx];
  return h('div', null, head,
    h('div', {className:cx('banner', correct ? 'teal' : 'red')},
      h('span', {'aria-hidden':'true'}, correct ? '✓' : '✕'),
      h('span', null, correct ? '答對了。' : ('答錯了' + (st.reason ? '（' + REASON_LABEL[st.reason] + '）' : '') + '，看完解析再判斷熟悉度。'))),
    h('div', {className:'block', style:{marginTop:'10px'}},
      h('div', {className:'eyebrow'}, '完整公式'),
      h(FormulaBox, {t:card.formula}),
      card.diagramType ? h('div', {style:{marginTop:'10px'}},
        h(DiagramSlot, {type:card.diagramType, data:card.diagramData,
          highlight:false, reveal:true})) : null,
      h('div', {className:'eyebrow', style:{marginTop:'12px'}}, '每個符號的意思'),
      h('ul', {className:'plain small'}, card.variables.map(function(v, i){
        return h('li', {key:i}, h('b', null, v.sym), '：', v.desc);
      })),
      h('div', {className:'eyebrow', style:{marginTop:'12px'}}, '代入過程'),
      h('div', {className:'rulebox'},
        h('div', {className:'tiny muted', style:{marginBottom:'4px'}}, card.workedExample.title),
        h('ol', {className:'steps small'}, card.workedExample.steps.map(function(s, i){
          return h('li', {key:i},
            h('div', {className:'tiny muted'}, s.label),
            s.math ? h(MB, {t:s.math}) : h('div', null, s.text));
        }))),
      h('div', {className:'banner teal', style:{marginTop:'10px'}},
        h('span', {'aria-hidden':'true'}, '＝'),
        h('span', null, h('b', null, '答案：'), h(M, {t:card.workedExample.answer}))),
      kind !== 'recall'
        ? h('div', null,
            h('div', {className:'eyebrow', style:{marginTop:'12px'}}, '本題正解'),
            h('div', {className:'banner', style:{marginBottom:'8px'}},
              h('span', {'aria-hidden':'true'}, '→'),
              h('span', null, renderAnswer(q))),
            q.steps ? h('ol', {className:'steps small'}, q.steps.map(function(s, i){
              return h('li', {key:i}, s);
            })) : null,
            q.why ? h('p', {className:'small'}, q.why) : null)
        : null,
      h('div', {className:'eyebrow', style:{marginTop:'12px'}}, '常見錯法'),
      h('ul', {className:'plain small'}, card.commonMistakes.map(function(m, i){
        return h('li', {key:i}, m);
      })),
      h('p', {className:'small muted', style:{marginTop:'10px'}}, card.explanation)),
    h('div', {className:'block', style:{marginTop:'10px'}},
      h('div', {className:'eyebrow'}, '這張卡你現在的感覺'),
      h('div', {className:'gap-s', style:{marginTop:'8px'}},
        [['no', '不會', '明天再出現'], ['maybe', '還不確定', '1、3、7 天後'],
         ['yes', '會了', '3、7、14、30 天後']].map(function(o){
          return h('button', {key:o[0], className:'opt', type:'button', style:{marginBottom:0},
            onClick:function(){ props.onConfidence(o[0]); }},
            h('span', {style:{flex:1, fontWeight:600}}, o[1]),
            h('span', {className:'tiny muted'}, o[2]));
        }))));
}
