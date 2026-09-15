/* ══════════════════════════════════════════════════════════════════════
   四個主要畫面與應用程式根元件
   ══════════════════════════════════════════════════════════════════════ */
var NAV = [
  {id:'practice', label:'練習', path:'M5 12h14 M13 6l6 6-6 6'},
  {id:'cards', label:'所有卡片', path:'M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3z M17 7h2v13'}
];
function BottomNav(props){
  return h('nav', {className:'nav', 'aria-label':'主要導覽'}, NAV.map(function(n){
    return h('button', {key:n.id, onClick:function(){ props.onTab(n.id); },
      'aria-current':props.tab === n.id ? 'page' : null},
      h('svg', {viewBox:'0 0 24 24', 'aria-hidden':'true'}, h('path', {d:n.path})),
      h('span', null, n.label));
  }));
}

/* ── 今日複習 ─────────────────────────────────────────────────────── */
function HomeScreen(props){
  var p = props.progress;
  var due = dueList(p);
  var pending = pendingList(p);
  var weak = weakest(p, 3);
  var totals = sessionTotals(p);
  var total = ALL_NODES.length;
  var mastered = total - pending.length;
  var planned = Math.min(12, due.length || Math.min(8, pending.length));
  var startedToday = totals.n > 0;

  return h('div', null,
    /* ① 連續天數 + 今日目標：一眼看到「今天還差幾題」 */
    h('div', {className:'todo'},
      h('div', {className:'goalring'},
        (function(){
          var r = 30, C = 2 * Math.PI * r;
          var doneN = answeredToday(p), goal = goalOf(p);
          var ratio = Math.min(1, goal ? doneN / goal : 0);
          return h('svg', {width:72, height:72, viewBox:'0 0 72 72', 'aria-hidden':'true'},
            h('circle', {className:'ring-bg', cx:36, cy:36, r:r}),
            h('circle', {className:cx('ring-fg', ratio >= 1 ? 'done' : ''), cx:36, cy:36, r:r,
              strokeDasharray:(C * ratio) + ' ' + C}));
        })(),
        h('div', {className:'stack-s'},
          h('div', {className:cx('streakbig', practicedToday(p) ? '' : 'cold')},
            h('span', {className:'flame', 'aria-hidden':'true'}, '🔥'),
            streakDays(p),
            h('span', {style:{fontSize:'14px', fontWeight:400, color:'var(--ink-soft)'}},
              '天連續')),
          h('div', {className:'tiny muted'},
            practicedToday(p)
              ? ('今天練了 ' + answeredToday(p) + ' / ' + goalOf(p) + ' 題' +
                 (answeredToday(p) >= goalOf(p) ? '　✓ 達標' : ''))
              : (streakDays(p) > 0 ? '今天還沒練，練一輪就能接上' : '練一輪就開始累積')))),
      h('button', {className:'btn primary', onClick:function(){ props.onStart('due'); },
        disabled:pending.length === 0 && due.length === 0},
        due.length > 0 ? ('開始複習　' + planned + ' 題')
                       : (pending.length ? ('開始練習　' + planned + ' 題') : '今天沒有待辦')),
      h('button', {className:'btn ghost', onClick:function(){ props.onStart('free'); }},
        '隨機抽考')),

    /* ② 一條線說完整體進度 */
    h('div', {className:'panel', style:{marginTop:'18px'}},
      h('div', {className:'kv', style:{border:'none', padding:0}},
        h('span', {className:'small'}, '已練熟'),
        h('b', null, mastered + ' / ' + total)),
      h('div', {className:'progressbar'},
        h('i', {style:{width:Math.round(mastered / total * 100) + '%'}})),
      h('div', {className:'tiny muted'},
        '公式與性質 ' + ALL_CARDS.length + ' 張、常用解法 ' + METHODS.length + ' 張' +
        (startedToday ? ('　·　累計答對 ' + totals.ok + ' / ' + totals.n +
          (totals.pct === null ? '' : '（' + totals.pct + '%）')) : ''))),

    /* ③ 有錯題才長出來 */
    weak.length
      ? h('div', {className:'panel'},
          h('h3', null, '最容易忘記'),
          h('div', {className:'stack-s'}, weak.map(function(w){
            var cp = p.cards[w.card.id];
            return h('button', {key:w.card.id, className:'row',
              style:{marginBottom:0},
              onClick:function(){ props.onOpenCard(w.card.id); }},
              h('div', {className:'rtop'},
                h('span', {className:'rtitle'}, w.card.title),
                h('span', {className:'tag red'}, '錯 ' + cp.lapses + ' 次')),
              h('div', {className:'rmeta'},
                h('span', null, CATEGORIES[w.card.category]),
                h('span', null, '正確率 ' + Math.round(w.acc * 100) + '%')));
          })))
      : null,

    props.storeNote
      ? h('div', {className:'banner red', style:{marginTop:'18px'}},
          h('span', {'aria-hidden':'true'}, '⚠'),
          h('span', null, h('b', null, '進度未保存　'), props.storeNote))
      : null,

    /* ④ 進度細節收在同一頁的底部，不再另開一個分頁 */
    h('details', {className:'more'},
      h('summary', null, '看詳細進度與錯題'),
      h(ProgressPanel, {progress:p, onOpenCard:props.onOpenCard,
        onOpenMethod:props.onOpenMethod, storeMode:props.storeMode,
        onReset:props.onReset})));
}

/* ── 公式與性質 ───────────────────────────────────────────────────── */
var CARD_FILTERS = [
  {v:'all', t:'全部'},
  {v:'todo', t:'還沒練熟'},
  {v:'weak', t:'容易忘記'},
  {v:'attached', t:'題本有附'},
  {v:'method', t:'解法'}
];
function CardsScreen(props){
  var p = props.progress, f = props.filter;
  var list = ALL_NODES.filter(function(n){
    var isM = !!METHOD_BY_ID[n.id];
    if(f === 'method') return isM;
    if(f === 'attached') return !isM && n.attachedInExam;
    if(f === 'todo') return !isNodeMastered(p, n);
    if(f === 'weak'){
      var cp = npOf(p, n.id);
      return !!cp && cp.lapses > 0;
    }
    return true;
  });
  if(props.query){
    var qq = props.query.trim();
    if(qq) list = list.filter(function(n){ return n.title.indexOf(qq) >= 0; });
  }
  return h('div', null,
    h('div', {className:'chips', style:{marginBottom:'10px'}}, CARD_FILTERS.map(function(o){
      return h('button', {key:o.v, className:'chip', type:'button',
        'aria-pressed':f === o.v,
        onClick:function(){ props.onFilter(o.v); }}, o.t);
    })),
    h('input', {className:'search', type:'search', id:'card-search',
      placeholder:'搜尋公式或解法名稱', value:props.query,
      'aria-label':'搜尋卡片',
      onChange:function(e){ props.onQuery(e.target.value); }}),
    h('p', {className:'emptyline'},
      list.length + ' 張　·　點一張卡看內容，或直接練它'),
    list.length
      ? h('div', {className:'stack-s'}, list.map(function(n){
          var isM = !!METHOD_BY_ID[n.id];
          var cp = npOf(p, n.id);
          var lvl = !cp || cp.seen === 0 ? 0 : (isNodeMastered(p, n) ? 2 : 1);
          return h('button', {key:n.id, className:'row', style:{marginBottom:0},
            onClick:function(){ isM ? props.onOpenMethod(n.id) : props.onOpenCard(n.id); }},
            h('div', {className:'rtop'},
              h('span', {className:'rtitle'}, n.title),
              isM ? h('span', {className:'tag'}, '解法')
                  : (n.attachedInExam ? h('span', {className:'tag amber'}, '題本有附') : null)),
            h('div', {className:'rmeta'},
              h(MasteryDot, {level:lvl}),
              h('span', null, GRADES[n.grade] + '｜' + CATEGORIES[n.category]),
              cp && cp.lapses ? h('span', {className:'tag red'}, '錯 ' + cp.lapses) : null),
            isM ? null : h('div', {style:{marginTop:'6px'}}, h(M, {t:n.formula, cls:'flow'})));
        }))
      : h('p', {className:'emptyline'}, '這個條件下沒有卡片。'));
}

function CardDetail(props){
  var c = props.card, cp = props.progress.cards[c.id] || emptyCard();
  var acc = function(k){ return cp[k].t ? Math.round(cp[k].c / cp[k].t * 100) + '%' : '—'; };
  var KS = [['recall', '回想'], ['select', '選公式'], ['recognition', '辨識'], ['application', '套用']];
  return h('div', null,
    /* ① 公式本身是主角 */
    h('div', {className:'stack'},
      h(FormulaBox, {t:c.formula}),
      c.diagramType
        ? h(DiagramSlot, {type:c.diagramType, data:c.diagramData, reveal:true})
        : null),

    /* ② 什麼時候用 —— 學生最需要的一句話 */
    h('div', {className:'panel'},
      h('h3', null, '什麼時候用'),
      h('p', {className:'small'}, c.usageConditions),
      h('div', {className:'tagrow'}, c.triggerWords.map(function(w, i){
        return h(Tag, {key:i, tone:'ghost'}, w);
      }))),

    /* ③ 熟練度：一列講完，不再四行 */
    h('div', {className:'panel'},
      h('div', {className:'tagrow'},
        h(Tag, {tone:c.attachedInExam ? 'amber' : ''},
          c.attachedInExam ? '題本有附' : '題本未附，要自己記'),
        h(Tag, null, GRADES[c.grade]), h(Tag, null, CATEGORIES[c.category]),
        h(Tag, {tone:isMastered(cp, c) ? 'teal' : ''}, MASTERY_LABEL[masteryLevel(cp, c)])),
      cp.seen > 0
        ? h('div', {className:'statgrid'}, KS.map(function(k){
            return h('div', {key:k[0]},
              h('span', {className:cx('n', cp[k[0]].t === 0 ? 'none' : '')}, acc(k[0])),
              h('span', {className:'l'}, k[1] + '　' + cp[k[0]].c + '/' + cp[k[0]].t));
          }))
        : null,
      cp.due ? h('p', {className:'tiny muted'}, '下次複習：' + cp.due) : null),

    /* ④ 其餘細節收起來 */
    h('details', {className:'more'},
      h('summary', null, '符號意思、完整示範、常見錯誤'),
      h('div', {className:'morebody'},
        h('div', {className:'stack-s'},
          h('div', {className:'eyebrow'}, '每個符號的意思'),
          h('ul', {className:'plain small'}, c.variables.map(function(v, i){
            return h('li', {key:i}, h('b', null, v.sym), '：', v.desc);
          }))),
        c.diagramExtra
          ? h('div', {className:'stack-s'}, c.diagramExtra.map(function(d, i){
              return h(DiagramSlot, {key:i, type:d.type, data:d.data, reveal:true});
            }))
          : null,
        h('div', {className:'stack-s'},
          h('div', {className:'eyebrow'}, '完整示範 ── ' + c.workedExample.title),
          h('div', {className:'rulebox'},
            h('ol', {className:'steps small'}, c.workedExample.steps.map(function(x, i){
              return h('li', {key:i}, h('div', {className:'tiny muted'}, x.label),
                x.math ? h(MB, {t:x.math}) : h('div', null, x.text));
            }))),
          h('div', {className:'banner teal'},
            h('span', {'aria-hidden':'true'}, '＝'),
            h('span', null, h('b', null, '答案：'), h(M, {t:c.workedExample.answer})))),
        h('div', {className:'stack-s'},
          h('div', {className:'eyebrow'}, '常見錯誤'),
          h('ul', {className:'plain small'}, c.commonMistakes.map(function(m, i){
            return h('li', {key:i}, m);
          }))),
        h('p', {className:'small muted'}, c.explanation),
        h('p', {className:'tiny muted'}, '資料來源：' + c.sourceNote))),

    h('div', {className:'actionbar'},
      h('button', {className:'btn primary', onClick:function(){ props.onPractice(c); }},
        '練習這張卡')));
}

/* ── 常用解法 ─────────────────────────────────────────────────────── */
function MethodDetail(props){
  var m = props.m;
  var mp = (props.progress.methods || {})[m.id] || emptyMethod();
  var st = useState(null), picked = st[0], setPicked = st[1];
  return h('div', null,
    h('div', {className:'tagrow', style:{marginBottom:'10px'}},
      h(Tag, null, GRADES[m.grade]), h(Tag, null, CATEGORIES[m.category]),
      h(Tag, {tone:isMethodMastered(mp) ? 'teal' : ''},
        MASTERY_LABEL[mp.seen === 0 ? 0 : (isMethodMastered(mp) ? 2 : 1)])),
    h('div', {className:'eyebrow'}, '① 題目會出現的線索'),
    h('ul', {className:'plain small'}, m.clues.map(function(c, i){
      return h('li', {key:i}, c);
    })),
    h('div', {className:'eyebrow', style:{marginTop:'14px'}}, '② 要建立的數學關係'),
    h('p', {className:'small'}, m.relation),
    h('div', {className:'eyebrow', style:{marginTop:'14px'}}, '③ 解題步驟'),
    h('ol', {className:'steps small'}, m.steps.map(function(s, i){
      return h('li', {key:i}, s);
    })),
    m.diagramType ? h('div', {style:{marginTop:'12px'}},
      h(DiagramSlot, {type:m.diagramType, data:m.diagramData, reveal:true})) : null,
    m.diagramExtra ? m.diagramExtra.map(function(d, i){
      return h('div', {key:i, style:{marginTop:'10px'}},
        h(DiagramSlot, {type:d.type, data:d.data, reveal:true}));
    }) : null,
    h('div', {className:'eyebrow', style:{marginTop:'14px'}}, '④ 完整示範'),
    h('div', {className:'rulebox'},
      h('div', {className:'tiny muted', style:{marginBottom:'4px'}}, m.demo.title),
      m.demo.given ? h(MB, {t:m.demo.given}) : null,
      h('ol', {className:'steps small'}, m.demo.steps.map(function(s, i){
        return h('li', {key:i}, h('div', {className:'tiny muted'}, s.label),
          s.math ? h(MB, {t:s.math}) : h('div', null, s.text));
      })),
      h('div', {className:'small', style:{marginTop:'6px'}}, '答案：', h(M, {t:m.demo.answer}))),
    h('div', {className:'eyebrow', style:{marginTop:'14px'}}, '⑤ 常見錯誤'),
    h('ul', {className:'plain small'}, m.mistakes.map(function(x, i){
      return h('li', {key:i}, x);
    })),
    h('div', {className:'eyebrow', style:{marginTop:'14px'}}, '⑥ 檢查答案的方法'),
    h('ul', {className:'plain small'}, m.check.map(function(x, i){
      return h('li', {key:i}, x);
    })),
    h('hr', {className:'rule'}),
    h('div', {className:'eyebrow'}, '⑦ 立即練習'),
    h('p', {className:'small', style:{marginTop:'4px'}}, m.practice.prompt),
    h(ChoiceAnswer, {q:m.practice, picked:picked, locked:picked !== null,
      onPick:function(i){ setPicked(i); }}),
    picked !== null
      ? h('div', {className:cx('banner', picked === m.practice.answer ? 'teal' : 'red'),
          style:{marginTop:'10px'}},
          h('span', {'aria-hidden':'true'}, picked === m.practice.answer ? '✓' : '✕'),
          h('span', null, m.practice.why))
      : null,
    picked !== null
      ? h('div', {className:'btnrow'},
          h('button', {className:'btn ghost', onClick:function(){ setPicked(null); }}, '再做一次'))
      : null,
    h('hr', {className:'rule'}),
    h('div', {className:'eyebrow'}, '你的練習狀況'),
    h('div', {className:'kv'}, h('span', null, '解法練習'),
      h('b', null, (mp.method.t ? Math.round(mp.method.c / mp.method.t * 100) + '%' : '—') +
        '（' + mp.method.c + '/' + mp.method.t + '）')),
    h('div', {className:'kv'}, h('span', null, '不同日期答對'),
      h('b', null, mp.successDays.length + ' 天')),
    h('div', {className:'kv'}, h('span', null, '下次複習'),
      h('b', null, mp.due || '尚未安排')),
    h('div', {className:'btnrow'},
      h('button', {className:'btn primary', onClick:function(){ props.onPractice(m); }},
        '排進複習並練一題')));
}
function Bar(props){
  var pct = props.pct;
  /* 錯誤原因用琥珀色，正確率／熟練度才用「愈綠愈好」的語意色 */
  var cls = props.tone === 'warn' ? 'low' : pct === null ? 'zero' : pct >= 70 ? '' : 'low';
  return h('div', {className:'bar'}, h('i', {className:cls, style:{width:(pct || 0) + '%'}}));
}
function KindMetric(props){
  var s = props.stat;
  return h('div', {className:'metric'},
    h('span', {className:'name'}, props.label),
    h('span', {className:'val'}, s.pct === null ? '—' : s.pct + '%'),
    h('span', {className:'sub'}, s.t === 0 ? '尚未作答' : (s.c + ' / ' + s.t + ' 題答對')),
    h(Bar, {pct:s.pct}));
}
function ProgressPanel(props){
  var p = props.progress;
  var KINDS_SHOWN = [['recall', '公式回想'], ['select', '看題選公式'],
                     ['recognition', '題型辨識'], ['application', '公式套用']];
  var stats = KINDS_SHOWN.map(function(k){ return [k[1], kindStats(p, k[0])]; });
  var sel = kindStats(p, 'select');
  var cats = categoryStats(p), reasons = reasonStats(p);
  var plan = scheduleList(p);
  var totals = sessionTotals(p);
  var maxReason = reasons.length ? reasons[0].n : 1;

  if(totals.n === 0){
    return h('div', {className:'morebody'},
      h('p', {className:'small muted'},
        '練過一輪之後，這裡會長出四項熟練指標、各章節進度、最常卡住的原因，' +
        '以及每張卡的下次複習時間。'),
      h('p', {className:'small muted'}, STORE_NOTE[props.storeMode] +
        '進度只留在這台裝置，不會上傳，也沒有人能從別的裝置看到。'),
      h('button', {className:'btn danger', onClick:props.onReset}, '重設全部進度'));
  }

  return h('div', {className:'morebody'},
    h('div', {className:'eyebrow'}, '四項熟練指標　·　累計 ' + totals.n + ' 題'),
    h('div', {className:'statgrid'}, stats.map(function(x){
      var st = x[1];
      return h('div', {key:x[0]},
        h('span', {className:cx('n', st.pct === null ? 'none' : (st.pct < 60 ? 'weak' : ''))},
          st.pct === null ? '—' : st.pct + '%'),
        h('span', {className:'l'}, x[0] + (st.t ? '　' + st.c + '/' + st.t : '')));
    })),
    sel.t >= 5 && sel.pct !== null && sel.pct < 60
      ? h('div', {className:'banner', style:{marginTop:'10px'}},
          h('span', {'aria-hidden':'true'}, '🔑'),
          h('span', null, '「看題選公式」偏低代表公式背得起來、但看到題目想不到要用哪一條。' +
            '先把這一項練上來，應用題會跟著變順。'))
      : null,

    h('div', {className:'eyebrow', style:{marginTop:'6px'}}, '各章節熟練度'),
    h('div', {className:'stack-s'}, cats.map(function(c){
      return h('div', {key:c.key, className:'catrow'},
        h('span', {className:'catname'}, c.name),
        h('span', {className:'catnum'}, c.mastered + ' / ' + c.total),
        h('span', {className:'progressbar'}, h('i', {style:{width:c.pct + '%'}})));
    })),

    /* ③ 以下都只在有資料時才出現 */
    reasons.length
      ? h('div', {className:'panel', style:{marginTop:'20px'}},
          h('h3', null, '最常卡住的地方'),
          h('div', {className:'stack-s'}, reasons.slice(0, 5).map(function(r){
            return h('div', {key:r.id, className:'catrow'},
              h('span', {className:'catname'}, r.label),
              h('span', {className:'catnum'}, r.n + ' 次'),
              h('span', {className:'progressbar'},
                h('i', {className:'warn',
                  style:{width:Math.round(r.n / maxReason * 100) + '%'}})));
          })))
      : null,

    p.recentWrong.length
      ? h('div', {className:'panel'},
          h('h3', null, '最近錯題'),
          h('div', {className:'stack-s'}, p.recentWrong.slice(0, 6).map(function(w, i){
            var c = NODE_BY_ID[w.id];
            return h('button', {key:i, className:'row', style:{marginBottom:0},
              onClick:function(){ METHOD_BY_ID[w.id] ? props.onOpenMethod(w.id)
                                                     : props.onOpenCard(w.id); }},
              h('div', {className:'rtop'},
                h('span', {className:'rtitle'}, c.title),
                h('span', {className:'tag'}, KINDS[w.kind])),
              w.reason
                ? h('div', {className:'rmeta'}, h('span', {className:'tag red'}, REASON_LABEL[w.reason]))
                : null);
          })))
      : null,

    plan.length
      ? h('div', {className:'panel'},
          h('h3', null, '接下來的複習'),
          h('p', {className:'tiny muted'}, '到期當天首頁就會提醒你。'),
          h('div', {className:'stack-s'}, plan.slice(0, 8).map(function(it){
            return h('button', {key:it.card.id, className:'row', style:{marginBottom:0},
              onClick:function(){ METHOD_BY_ID[it.card.id] ? props.onOpenMethod(it.card.id)
                                                           : props.onOpenCard(it.card.id); }},
              h('div', {className:'rtop'},
                h('span', {className:'rtitle'}, it.card.title),
                h('span', {className:'tag ' + (it.gap <= 1 ? 'red' : it.gap <= 7 ? 'amber' : 'teal')},
                  it.gap <= 0 ? '今天' : it.gap + ' 天後')));
          })),
          plan.length > 8
            ? h('p', {className:'emptyline'}, '還有 ' + (plan.length - 8) + ' 張未列出。')
            : null)
      : null,

    h('div', {className:'stack-s', style:{marginTop:'6px'}},
          h('div', {className:'kv'}, h('span', null, '累計已練題數'), h('b', null, totals.n)),
          h('div', {className:'kv'}, h('span', null, '答對 / 答錯'),
            h('b', null, totals.ok + ' / ' + (totals.n - totals.ok))),
          h('div', {className:'kv'}, h('span', null, '正確率'),
            h('b', null, totals.pct === null ? '—' : totals.pct + '%')),
      h('div', {className:'kv'}, h('span', null, '最後更新'), h('b', null, p.updatedAt))),
    h('p', {className:'small muted'}, STORE_NOTE[props.storeMode] +
      '進度只留在這台裝置，不會上傳，也沒有人能從別的裝置看到。'),
    h('button', {className:'btn danger', onClick:props.onReset}, '重設全部進度'));
}

/* ── 應用程式根元件 ───────────────────────────────────────────────── */
function makeSlot(queue, idx, results, carry){
  var item = queue[idx], q = qFor(NODE_BY_ID[item.cardId], item.kind, item.qi);
  carry = carry || {};
  return {queue:queue, idx:idx, phase:'answer', hint:0,
    filled:q.type === 'blank' ? q.blanks.map(function(){ return null; }) : [],
    active:0, picked:null, num:'', reason:null, results:results || [],
    combo:carry.combo || 0, bestCombo:carry.bestCombo || 0,
    gained:carry.gained || 0, fx:null, fxXp:0};
}

function App(){
  /* 進度存在這台裝置的瀏覽器本機儲存，不經過帳號或伺服器 */
  var boot = useRef(null);
  if(!boot.current) boot.current = Store.load();
  var pState = useState(boot.current), progress = pState[0], setProgress = pState[1];
  var progressRef = useRef(progress);
  var smState = useState(Store.mode), storeMode = smState[0], setStoreMode = smState[1];
  var snState = useState(Store.note), storeNote = snState[0], setStoreNote = snState[1];
  var tState = useState('practice'), tab = tState[0], setTab = tState[1];
  var cfState = useState('todo'), cardFilter = cfState[0], setCardFilter = cfState[1];
  var qState = useState(''), query = qState[0], setQuery = qState[1];
  var sState = useState(null), session = sState[0], setSession = sState[1];
  var sndState = useState(boot.current.sound !== false),
      soundOn = sndState[0], setSoundOn = sndState[1];
  Sfx.on = soundOn;
  var cState = useState(null), openCard = cState[0], setOpenCard = cState[1];
  var oState = useState(null), openMethod = oState[0], setOpenMethod = oState[1];
  var dState = useState(null), dialog = dState[0], setDialog = dState[1];
  var toastState = useState(null), toast = toastState[0], setToast = toastState[1];

  useEffect(function(){
    if(!toast) return;
    var t = setTimeout(function(){ setToast(null); }, 3200);
    return function(){ clearTimeout(t); };
  }, [toast]);
  useEffect(function(){ window.scrollTo(0, 0); }, [tab, session ? session.idx : -1]);

  function onStoreStatus(mode, note){ setStoreMode(mode); setStoreNote(note); }
  function update(mutator){
    var next = JSON.parse(JSON.stringify(progressRef.current));
    mutator(next);
    progressRef.current = next;
    setProgress(next);
    Store.save(next, onStoreStatus);
  }
  function replaceProgress(next){
    progressRef.current = next;
    setProgress(next);
    Store.save(next, onStoreStatus);
  }
  function startSession(mode, cards){
    var queue = buildQueue(progressRef.current, {mode:mode, cards:cards, limit:12});
    if(!queue.length){ setToast('目前沒有可以練習的卡片。'); return; }
    setOpenCard(null); setOpenMethod(null);
    setSession(makeSlot(queue, 0, []));
  }
  function practiceOne(node){
    setOpenCard(null); setOpenMethod(null);
    if(METHOD_BY_ID[node.id]){
      var mp = (progressRef.current.methods || {})[node.id];
      setSession(makeSlot([{cardId:node.id, kind:'method',
        qi:qIndex(mp, 'method'), retry:false}], 0, []));
      return;
    }
    var k = pickKind(progressRef.current.cards[node.id], node);
    setSession(makeSlot([{cardId:node.id, kind:k,
      qi:qIndex(progressRef.current.cards[node.id], k), retry:false}], 0, []));
  }

  var cur = session && session.phase !== 'done' ? session.queue[session.idx] : null;

  function onSubmit(correct){
    var combo = correct ? (session.combo || 0) + 1 : 0;
    var gain = correct ? xpFor(combo - 1) : 0;
    var hitStep = correct && COMBO_STEPS.indexOf(combo) >= 0;
    update(function(p){
      recordAnswer(p, cur.cardId, cur.kind, correct, null);
      if(gain) addXP(p, gain);
    });
    if(correct){ hitStep ? Sfx.combo() : Sfx.ok(combo - 1); } else { Sfx.bad(); }
    setSession(function(s){
      var r = s.results.slice(); r[s.idx] = correct;
      return Object.assign({}, s, {results:r, phase:correct ? 'explain' : 'reason',
        combo:combo, bestCombo:Math.max(s.bestCombo || 0, combo),
        gained:(s.gained || 0) + gain, fx:correct ? 'ok' : 'bad', fxXp:gain});
    });
  }
  function onToExplain(){
    var reason = session.reason;
    update(function(p){ recordReason(p, cur.cardId, reason); });
    setSession(function(s){ return Object.assign({}, s, {phase:'explain'}); });
  }
  function onConfidence(conf){
    var s = session, correct = s.results[s.idx];
    var queue = s.queue.slice();
    if(correct === false && !queue[s.idx].retry){
      queue.splice(Math.min(s.idx + 3, queue.length), 0,
        {cardId:queue[s.idx].cardId, kind:queue[s.idx].kind, qi:queue[s.idx].qi, retry:true});
    }
    var nextIdx = s.idx + 1, fin = nextIdx >= queue.length;
    update(function(p){ scheduleCard(p, s.queue[s.idx].cardId, conf, correct); });
    if(fin){ Sfx.done(); confetti({count:110}); }
    var carry = {combo:s.combo, bestCombo:s.bestCombo, gained:s.gained};
    setSession(fin ? Object.assign({}, s, {queue:queue, phase:'done', fx:null})
                   : makeSlot(queue, nextIdx, s.results, carry));
  }
  function onBlankClick(bi){
    setSession(function(s){
      var f = s.filled.slice();
      if(f[bi]){ f[bi] = null; return Object.assign({}, s, {filled:f, active:bi}); }
      return Object.assign({}, s, {active:bi});
    });
  }
  function onToken(tok){
    setSession(function(s){
      var f = s.filled.slice();
      var i = f[s.active] ? f.indexOf(null) : s.active;
      if(i < 0) i = s.active;
      f[i] = tok;
      var nextEmpty = f.indexOf(null);
      return Object.assign({}, s, {filled:f, active:nextEmpty < 0 ? i : nextEmpty});
    });
  }

  var pendingCount = pendingList(progress).length;
  var sessionSummary = null;
  if(session && session.phase === 'done'){
    var n = session.results.length;
    var ok = session.results.filter(function(x){ return x === true; }).length;
    sessionSummary = {n:n, ok:ok, miss:n - ok};
  }

  var body;
  if(session && session.phase === 'done'){
    var sm = sessionSummary;
    var rate = sm.n ? Math.round(sm.ok / sm.n * 100) : 0;
    var perfect = sm.n > 0 && sm.miss === 0;
    var goalHit = xpToday(progress) > 0 && answeredToday(progress) >= goalOf(progress);
    body = h('div', null,
      h('div', {className:'result'},
        h('div', {className:'crown', 'aria-hidden':'true'},
          perfect ? '🏆' : (rate >= 70 ? '🎉' : '💪')),
        h('h2', null, perfect ? '全對！' : (rate >= 70 ? '這一輪不錯' : '練完了')),
        h('div', {className:'sub'},
          goalHit ? '今天的目標也達成了' : ('離今天的目標還差 ' +
            Math.max(0, goalOf(progress) - answeredToday(progress)) + ' 題')),
        h('div', {className:'scoreboard'},
          h('div', null,
            h('span', {className:'n win'}, sm.ok + '/' + sm.n),
            h('span', {className:'l'}, '答對')),
          h('div', null,
            h('span', {className:'n grape'}, '+' + (session.gained || 0)),
            h('span', {className:'l'}, '這輪 XP')),
          h('div', null,
            h('span', {className:'n gold'}, session.bestCombo || 0),
            h('span', {className:'l'}, '最高連對')))),
      h('div', {className:'panel', style:{marginTop:'16px'}},
        h('div', {className:'streakbig'},
          h('span', {className:'flame', 'aria-hidden':'true'}, '🔥'),
          streakDays(progress),
          h('span', {style:{fontSize:'14px', fontWeight:400, color:'var(--ink-soft)'}}, '天連續')),
        h('p', {className:'tiny muted'},
          sm.miss
            ? ('答錯的 ' + sm.miss + ' 題已經排進明天，明天回來就會先看到它們。')
            : '明天回來才不會斷掉連續天數。')),
      h('div', {className:'actionbar'},
        h('button', {className:'btn ghost', onClick:function(){
          setSession(null); setTab('practice');
        }}, '先休息'),
        h('button', {className:'btn primary', onClick:function(){
          setSession(null); startSession('due');
        }}, '再來一輪')));
  } else if(session){
    body = h(SessionView, {state:session, streak:streakDays(progress),
      onSubmit:onSubmit, onToExplain:onToExplain, onConfidence:onConfidence,
      onBlankClick:onBlankClick, onToken:onToken,
      onPick:function(i){ setSession(function(s){ return Object.assign({}, s, {picked:i}); }); },
      onNum:function(v){ setSession(function(s){ return Object.assign({}, s, {num:v}); }); },
      onHint:function(){ setSession(function(s){ return Object.assign({}, s, {hint:Math.min(2, s.hint + 1)}); }); },
      onReason:function(r){ setSession(function(s){ return Object.assign({}, s, {reason:r}); }); },
      onQuit:function(){ setSession(null); }});
  } else if(tab === 'cards'){
    body = h(CardsScreen, {progress:progress, filter:cardFilter, onFilter:setCardFilter,
      query:query, onQuery:setQuery,
      onOpenCard:setOpenCard, onOpenMethod:setOpenMethod});
  } else {
    body = h(HomeScreen, {progress:progress, onStart:startSession,
      onOpenCard:setOpenCard, onOpenMethod:setOpenMethod, storeNote:storeNote,
      storeMode:storeMode, onReset:function(){ setDialog('reset1'); }});
  }

  var cardObj = openCard ? CARD_BY_ID[openCard] : null;
  var methodObj = openMethod ? METHOD_BY_ID[openMethod] : null;

  return h('div', {className:'app'},
    h('header', {className:'topbar'},
      h('h1', null, '會考數學公式教練'),
      h('button', {className:'sub', title:'音效開關',
        'aria-label':soundOn ? '關閉音效' : '開啟音效',
        onClick:function(){
          var next = !soundOn;
          setSoundOn(next); Sfx.on = next;
          if(next) Sfx.ok(0);
          update(function(pp){ pp.sound = next; });
        }}, soundOn ? '🔊' : '🔇')),
    h('main', {className:'main'}, body),
    session ? null : h(BottomNav, {tab:tab, onTab:setTab}),
    toast ? h('div', {style:{position:'fixed', left:0, right:0, bottom:'70px', zIndex:50,
        display:'flex', justifyContent:'center', pointerEvents:'none'}},
        h('div', {className:'banner teal', style:{maxWidth:'400px'}},
          h('span', {'aria-hidden':'true'}, 'ⓘ'), h('span', null, toast))) : null,
    cardObj ? h(Sheet, {title:cardObj.title, onClose:function(){ setOpenCard(null); }},
      h(CardDetail, {card:cardObj, progress:progress, onPractice:practiceOne})) : null,
    methodObj ? h(Sheet, {title:methodObj.title, onClose:function(){ setOpenMethod(null); }},
      h(MethodDetail, {m:methodObj, progress:progress, onPractice:practiceOne})) : null,
    dialog === 'reset1' ? h(Modal, {title:'要重設全部進度嗎？', onClose:function(){ setDialog(null); }},
      h('p', {className:'small'}, '這會清除這台裝置上所有的作答紀錄、熟練度與複習排程，而且無法復原。'),
      h('div', {className:'btnrow'},
        h('button', {className:'btn ghost', onClick:function(){ setDialog(null); }}, '取消'),
        h('button', {className:'btn danger', onClick:function(){ setDialog('reset2'); }}, '繼續'))) : null,
    dialog === 'reset2' ? h(Modal, {title:'最後確認', onClose:function(){ setDialog(null); }},
      h('div', {className:'banner red', style:{marginBottom:'10px'}},
        h('span', {'aria-hidden':'true'}, '！'),
        h('span', null, '按下「確定重設」後，' + Object.keys(progress.cards).length +
          ' 張卡的紀錄會全部歸零，而且無法復原。')),
      h('div', {className:'btnrow'},
        h('button', {className:'btn ghost', onClick:function(){ setDialog(null); }}, '不要重設'),
        h('button', {className:'btn danger', onClick:function(){
          Store.clear();
          replaceProgress(emptyProgress()); setDialog(null); setSession(null);
          setToast('進度已全部重設。');
        }}, '確定重設'))) : null);
}
