/* ══════════════════════════════════════════════════════════════════════
   四個主要畫面與應用程式根元件
   ══════════════════════════════════════════════════════════════════════ */
var NAV = [
  {id:'home', label:'今日複習', path:'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4'},
  {id:'library', label:'公式與性質', path:'M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3z M17 7h2v13'},
  {id:'methods', label:'常用解法', path:'M4 6h12 M4 12h16 M4 18h9 M19 5l2 2-2 2'},
  {id:'stats', label:'錯題與進度', path:'M4 20V10 M10 20V4 M16 20v-7 M22 20H2'}
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
  var fresh = newList(p);
  var weak = weakest(p, 3);
  var totals = sessionTotals(p);
  var mastered = ALL_CARDS.length - pending.length;
  var planned = Math.min(12, due.length || Math.min(8, pending.length));
  var mins = Math.max(1, Math.round(planned * 25 / 60));

  return h('div', null,
    h(SectionHead, {title:'今天的複習', right:todayStr()}),
    h('div', {className:'block'},
      due.length > 0
        ? h('div', null,
            h('div', {style:{display:'flex', alignItems:'flex-end', gap:'10px'}},
              h('div', null,
                h('div', {className:'big'}, due.length),
                h('div', {className:'tiny muted'}, '張卡今天到期')),
              h('div', {style:{marginLeft:'auto', textAlign:'right'}},
                h('div', {className:'big', style:{fontSize:'22px'}}, '約 ' + mins + ' 分'),
                h('div', {className:'tiny muted'}, '這輪 ' + planned + ' 題'))),
            h('div', {className:'btnrow'},
              h('button', {className:'btn primary', onClick:function(){ props.onStart('due'); }},
                '開始 5 分鐘複習')))
        : h('div', null,
            h('div', {className:'banner teal', style:{marginBottom:'12px'}},
              h('span', {'aria-hidden':'true'}, '✓'),
              h('span', null, pending.length === 0
                ? '93 張卡全部練熟了，可以隨機抽考自己。'
                : '今天沒有到期的複習卡，可以先認識沒練過的新公式。')),
            pending.length > 0
              ? h('div', {className:'btnrow'},
                  h('button', {className:'btn primary', onClick:function(){ props.onStart('due'); }},
                    '練 ' + Math.min(12, pending.length) + ' 張沒練熟的'))
              : null),
      h('div', {className:'btnrow'},
        h('button', {className:'btn ghost', onClick:function(){ props.onStart('free'); }},
          '自由練習'))),
    props.storeNote
      ? h('div', {className:'banner', style:{marginTop:'10px'}},
          h('span', {'aria-hidden':'true'}, 'ℹ'),
          h('span', null, props.storeNote))
      : null,
    h(SectionHead, {title:'最容易忘記'}),
    weak.length
      ? h('div', null, weak.map(function(w){
          var cp = p.cards[w.card.id];
          return h('button', {key:w.card.id, className:'row',
            onClick:function(){ props.onOpenCard(w.card.id); }},
            h('div', {className:'rtop'},
              h('span', {className:'rtitle'}, w.card.title),
              h('span', {className:'tag red'}, '錯 ' + cp.lapses + ' 次')),
            h('div', {className:'rmeta'},
              h('span', null, CATEGORIES[w.card.category]),
              h('span', null, '正確率 ' + Math.round(w.acc * 100) + '%'),
              h('span', null, w.card.attachedInExam ? '題本有附' : '題本未附')));
        }))
      : h('div', {className:'block tint'},
          h('p', {className:'small muted'}, '還沒有累積錯題紀錄。先做一輪複習，這裡就會列出最需要補強的三個知識點。')),
    h(SectionHead, {title:'學習進度'}),
    h('div', {className:'block'},
      h('div', {className:'kv'}, h('span', null, '已熟練的知識點'),
        h('b', null, mastered + ' / ' + ALL_CARDS.length)),
      h('div', {className:'kv'}, h('span', null, '還沒練過的卡'),
        h('b', null, fresh.length + ' 張')),
      h('div', {className:'kv'}, h('span', null, '累計答對 / 答錯'),
        h('b', null, totals.ok + ' / ' + (totals.n - totals.ok))),
      h('div', {className:'kv'}, h('span', null, '累計正確率'),
        h('b', null, totals.pct === null ? '—' : totals.pct + '%'))));
}

/* ── 公式與性質 ───────────────────────────────────────────────────── */
var FILTER_GROUPS = [
  {key:'grade', label:'年級', opts:[{v:'7', t:'七年級'}, {v:'8', t:'八年級'}, {v:'9', t:'九年級'}]},
  {key:'category', label:'主題', opts:[{v:'num', t:'數與代數'}, {v:'eq', t:'方程式與函數'},
    {v:'geo', t:'幾何'}, {v:'stat', t:'統計與機率'}]},
  {key:'attached', label:'題本', opts:[{v:'yes', t:'題本有附'}, {v:'no', t:'題本未附'}]},
  {key:'state', label:'狀態', opts:[{v:'unmastered', t:'尚未熟練'}, {v:'weak', t:'容易忘記'}]}
];
function LibraryScreen(props){
  var p = props.progress;
  var f = props.filters, setF = props.setFilters;
  var covered = props.covered, setCovered = props.setCovered;

  function toggle(gk, v){
    var cur = f[gk] || [];
    var next = cur.indexOf(v) >= 0 ? cur.filter(function(x){ return x !== v; }) : cur.concat([v]);
    var o = {}; Object.keys(f).forEach(function(k){ o[k] = f[k]; });
    o[gk] = next; setF(o);
  }
  var list = ALL_CARDS.filter(function(c){
    var cp = p.cards[c.id];
    if(f.grade.length && f.grade.indexOf(String(c.grade)) < 0) return false;
    if(f.category.length && f.category.indexOf(c.category) < 0) return false;
    if(f.attached.length === 1){
      if(f.attached[0] === 'yes' && !c.attachedInExam) return false;
      if(f.attached[0] === 'no' && c.attachedInExam) return false;
    }
    if(f.state.indexOf('unmastered') >= 0 && isMastered(cp)) return false;
    if(f.state.indexOf('weak') >= 0 && !(cp && cp.lapses > 0)) return false;
    return true;
  });
  var anyFilter = FILTER_GROUPS.some(function(g){ return f[g.key].length > 0; });

  return h('div', null,
    h(SectionHead, {title:'公式與性質', right:list.length + ' / ' + ALL_CARDS.length}),
    h('div', {className:'block tint'},
      FILTER_GROUPS.map(function(g){
        return h('div', {key:g.key, style:{marginBottom:'8px'}},
          h('div', {className:'eyebrow', style:{marginBottom:'4px'}}, g.label),
          h('div', {className:'chips'}, g.opts.map(function(o){
            return h('button', {key:o.v, className:'chip', type:'button',
              'aria-pressed':f[g.key].indexOf(o.v) >= 0,
              onClick:function(){ toggle(g.key, o.v); }}, o.t);
          })));
      }),
      h('div', {style:{display:'flex', gap:'8px', marginTop:'10px', flexWrap:'wrap'}},
        h('button', {className:'chip', type:'button', 'aria-pressed':covered,
          onClick:function(){ setCovered(!covered); }}, covered ? '公式已蓋住' : '蓋住公式自我測驗'),
        anyFilter ? h('button', {className:'chip', type:'button',
          onClick:function(){ setF({grade:[], category:[], attached:[], state:[]}); }},
          '清除篩選') : null)),
    list.length
      ? h('div', {style:{marginTop:'10px'}},
          h('button', {className:'btn ghost', style:{marginBottom:'10px'},
            onClick:function(){ props.onPracticeList(list); }},
            '練習這 ' + Math.min(list.length, 12) + ' 張卡'),
          list.map(function(c){
            var cp = p.cards[c.id];
            return h('button', {key:c.id, className:'row',
              onClick:function(){ props.onOpenCard(c.id); }},
              h('div', {className:'rtop'},
                h('span', {className:'rtitle'}, c.title),
                c.attachedInExam ? h('span', {className:'tag amber'}, '題本有附')
                                 : h('span', {className:'tag'}, '要背')),
              h('div', {className:'rmeta'},
                h('span', null, GRADES[c.grade] + '｜' + CATEGORIES[c.category]),
                h('span', {style:{display:'inline-flex', alignItems:'center', gap:'4px'}},
                  h(MasteryDot, {level:masteryLevel(cp)})),
                c.diagramType ? h('span', null, '附圖') : null),
              covered ? null : h('div', {style:{marginTop:'6px'}},
                h(M, {t:c.formula, cls:'flow'})));
          }))
      : h('div', {className:'block'},
          h('p', {className:'small muted'}, '這組條件下沒有卡片。試著少選幾個條件。')));
}

/* 單張卡片的完整內容 */
function CardDetail(props){
  var c = props.card, cp = props.progress.cards[c.id] || emptyCard();
  var acc = function(k){ return cp[k].t ? Math.round(cp[k].c / cp[k].t * 100) + '%' : '—'; };
  return h('div', null,
    h('div', {className:'tagrow', style:{marginBottom:'10px'}},
      h(Tag, {tone:c.attachedInExam ? 'amber' : ''},
        c.attachedInExam ? '題本有附｜仍需熟到能立即辨認與使用' : '題本未附｜要自己記'),
      h(Tag, null, GRADES[c.grade]), h(Tag, null, CATEGORIES[c.category]),
      h(Tag, {tone:isMastered(cp) ? 'teal' : ''}, MASTERY_LABEL[masteryLevel(cp)])),
    h('div', {className:'eyebrow'}, '公式／性質'),
    h(FormulaBox, {t:c.formula, hidden:props.covered}),
    props.covered ? h('div', {className:'btnrow'},
      h('button', {className:'btn ghost sm', onClick:props.onReveal}, '顯示公式')) : null,
    c.diagramType ? h('div', {style:{marginTop:'12px'}},
      h(DiagramSlot, {type:c.diagramType, data:c.diagramData, reveal:true})) : null,
    c.diagramExtra ? c.diagramExtra.map(function(d, i){
      return h('div', {key:i, style:{marginTop:'10px'}},
        h(DiagramSlot, {type:d.type, data:d.data, reveal:true}));
    }) : null,
    h('div', {className:'eyebrow', style:{marginTop:'14px'}}, '每個符號的意思'),
    h('ul', {className:'plain small'}, c.variables.map(function(v, i){
      return h('li', {key:i}, h('b', null, v.sym), '：', v.desc);
    })),
    h('div', {className:'eyebrow', style:{marginTop:'14px'}}, '什麼時候用'),
    h('p', {className:'small'}, c.usageConditions),
    h('div', {className:'tagrow'}, c.triggerWords.map(function(w, i){
      return h(Tag, {key:i, tone:'ghost'}, w);
    })),
    h('div', {className:'eyebrow', style:{marginTop:'14px'}}, '完整示範'),
    h('div', {className:'rulebox'},
      h('div', {className:'tiny muted', style:{marginBottom:'4px'}}, c.workedExample.title),
      h('ol', {className:'steps small'}, c.workedExample.steps.map(function(s, i){
        return h('li', {key:i}, h('div', {className:'tiny muted'}, s.label),
          s.math ? h(MB, {t:s.math}) : h('div', null, s.text));
      })),
      h('div', {className:'small', style:{marginTop:'6px'}}, '答案：', h(M, {t:c.workedExample.answer}))),
    h('div', {className:'eyebrow', style:{marginTop:'14px'}}, '常見錯誤'),
    h('ul', {className:'plain small'}, c.commonMistakes.map(function(m, i){
      return h('li', {key:i}, m);
    })),
    h('p', {className:'small muted', style:{marginTop:'10px'}}, c.explanation),
    h('hr', {className:'rule'}),
    h('div', {className:'eyebrow'}, '你的三項指標'),
    h('div', {className:'kv'}, h('span', null, '公式回想'),
      h('b', null, acc('recall') + '（' + cp.recall.c + '/' + cp.recall.t + '）')),
    h('div', {className:'kv'}, h('span', null, '題型辨識'),
      h('b', null, acc('recognition') + '（' + cp.recognition.c + '/' + cp.recognition.t + '）')),
    h('div', {className:'kv'}, h('span', null, '公式套用'),
      h('b', null, acc('application') + '（' + cp.application.c + '/' + cp.application.t + '）')),
    h('div', {className:'kv'}, h('span', null, '不同日期成功回想'),
      h('b', null, cp.successDays.length + ' 天')),
    h('div', {className:'kv'}, h('span', null, '下次複習'),
      h('b', null, cp.due || '尚未安排')),
    h('div', {className:'tiny muted', style:{marginTop:'8px'}}, '資料來源：' + c.sourceNote),
    h('div', {className:'btnrow'},
      h('button', {className:'btn primary', onClick:function(){ props.onPractice(c); }},
        '練習這張卡')));
}

/* ── 常用解法 ─────────────────────────────────────────────────────── */
function MethodDetail(props){
  var m = props.m;
  var st = useState(null), picked = st[0], setPicked = st[1];
  return h('div', null,
    h('div', {className:'tagrow', style:{marginBottom:'10px'}},
      h(Tag, null, GRADES[m.grade]), h(Tag, null, CATEGORIES[m.category])),
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
      : null);
}
function MethodsScreen(props){
  return h('div', null,
    h(SectionHead, {title:'常用解法', right:METHODS.length + ' 張'}),
    h('p', {className:'small muted'},
      '每張解法卡都是固定七段：線索 → 數學關係 → 步驟 → 示範 → 常見錯誤 → 檢查方法 → 立即練習。'),
    h('div', {style:{marginTop:'10px'}}, METHODS.map(function(m, i){
      return h('button', {key:m.id, className:'row',
        onClick:function(){ props.onOpen(m.id); }},
        h('div', {className:'rtop'},
          h('span', {className:'eyebrow', style:{minWidth:'22px'}}, String(i + 1).padStart(2, '0')),
          h('span', {className:'rtitle'}, m.title)),
        h('div', {className:'rmeta'},
          h('span', null, GRADES[m.grade] + '｜' + CATEGORIES[m.category]),
          m.diagramType ? h('span', null, '附圖') : null));
    })));
}

/* ── 錯題與進度 ───────────────────────────────────────────────────── */
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
function StatsScreen(props){
  var p = props.progress;
  var recall = kindStats(p, 'recall'), recog = kindStats(p, 'recognition'),
      apply = kindStats(p, 'application');
  var cats = categoryStats(p), reasons = reasonStats(p);
  var plan = scheduleList(p);
  var totals = sessionTotals(p);
  var maxReason = reasons.length ? reasons[0].n : 1;

  return h('div', null,
    h(SectionHead, {title:'四項熟練指標'}),
    h('div', {className:'block'},
      h(KindMetric, {label:'公式回想正確率', stat:recall}),
      h(KindMetric, {label:'題型辨識正確率', stat:recog}),
      h(KindMetric, {label:'公式套用正確率', stat:apply})),
    h(SectionHead, {title:'各章節熟練度'}),
    h('div', {className:'block'}, cats.map(function(c){
      return h('div', {key:c.key, className:'metric'},
        h('span', {className:'name'}, c.name),
        h('span', {className:'val'}, c.pct + '%'),
        h('span', {className:'sub'},
          '已熟練 ' + c.mastered + ' / ' + c.total + '　已練過 ' + c.started),
        h(Bar, {pct:c.pct}));
    })),
    h(SectionHead, {title:'最常出現的錯誤原因'}),
    reasons.length
      ? h('div', {className:'block'}, reasons.map(function(r){
          return h('div', {key:r.id, className:'metric'},
            h('span', {className:'name'}, r.label),
            h('span', {className:'val'}, r.n + ' 次'),
            h(Bar, {pct:Math.round(r.n / maxReason * 100), tone:'warn'}));
        }))
      : h('div', {className:'block tint'},
          h('p', {className:'small muted'}, '還沒有錯題紀錄。答錯時選擇原因，這裡就會統計出你最常卡住的地方。')),
    h(SectionHead, {title:'複習間隔安排', right:plan.length + ' 張'}),
    plan.length
      ? h('div', null,
          h('p', {className:'tiny muted', style:{marginBottom:'8px'}},
            '依你的自評排出的下次複習時間，到期當天首頁就會提醒你。'),
          plan.slice(0, 10).map(function(it){
            return h('button', {key:it.card.id, className:'row',
              onClick:function(){ props.onOpenCard(it.card.id); }},
              h('div', {className:'rtop'},
                h('span', {className:'rtitle'}, it.card.title),
                h('span', {className:'tag ' + (it.gap <= 1 ? 'red' : it.gap <= 7 ? 'amber' : 'teal')},
                  it.gap <= 0 ? '今天' : it.gap + ' 天後')),
              h('div', {className:'rmeta'}, h('span', null, CATEGORIES[it.card.category])));
          }), plan.length > 10
            ? h('p', {className:'tiny muted'}, '還有 ' + (plan.length - 10) + ' 張未列出。') : null)
      : h('div', {className:'block tint'},
          h('p', {className:'small muted'}, '練完一張卡並自評之後，這裡會排出它的下次複習時間。')),
    h(SectionHead, {title:'最近錯題', right:p.recentWrong.length + ' 筆'}),
    p.recentWrong.length
      ? h('div', null, p.recentWrong.slice(0, 8).map(function(w, i){
          var c = CARD_BY_ID[w.id];
          return h('button', {key:i, className:'row',
            onClick:function(){ props.onOpenCard(w.id); }},
            h('div', {className:'rtop'},
              h('span', {className:'rtitle'}, c.title),
              h('span', {className:'tag'}, KINDS[w.kind])),
            h('div', {className:'rmeta'},
              w.reason ? h('span', {className:'tag red'}, REASON_LABEL[w.reason]) : null));
        }))
      : h('div', {className:'block tint'},
          h('p', {className:'small muted'}, '還沒有錯題。答錯的卡會在本輪稍後再出現一次。')),
    h(SectionHead, {title:'練習總計'}),
    h('div', {className:'block'},
      h('div', {className:'kv'}, h('span', null, '累計已練題數'), h('b', null, totals.n)),
      h('div', {className:'kv'}, h('span', null, '答對 / 答錯'),
        h('b', null, totals.ok + ' / ' + (totals.n - totals.ok))),
      h('div', {className:'kv'}, h('span', null, '正確率'),
        h('b', null, totals.pct === null ? '—' : totals.pct + '%')),
      h('div', {className:'kv'}, h('span', null, '最後更新'), h('b', null, p.updatedAt)),
      h('div', {className:cx('banner', props.storeMode === 'local' ? 'teal' : '')},
        h('span', {'aria-hidden':'true'}, 'ℹ'),
        h('span', null, STORE_NOTE[props.storeMode] +
          '進度只留在這台裝置，不會上傳，也沒有人能從別的裝置看到。')),
      h('div', {className:'btnrow'},
        h('button', {className:'btn danger', onClick:props.onReset}, '重設全部進度'))));
}

/* ── 應用程式根元件 ───────────────────────────────────────────────── */
function qFor(card, kind){
  return kind === 'recall' ? card.recallPrompt
       : kind === 'recognition' ? card.recognitionQuestion
       : card.applicationQuestion;
}
function makeSlot(queue, idx, results){
  var item = queue[idx], q = qFor(CARD_BY_ID[item.cardId], item.kind);
  return {queue:queue, idx:idx, phase:'answer', hint:0,
    filled:q.type === 'blank' ? q.blanks.map(function(){ return null; }) : [],
    active:0, picked:null, num:'', reason:null, results:results || []};
}

function App(){
  /* 進度存在這台裝置的瀏覽器本機儲存，不經過帳號或伺服器 */
  var boot = useRef(null);
  if(!boot.current) boot.current = Store.load();
  var pState = useState(boot.current), progress = pState[0], setProgress = pState[1];
  var progressRef = useRef(progress);
  var smState = useState(Store.mode), storeMode = smState[0], setStoreMode = smState[1];
  var snState = useState(Store.note), storeNote = snState[0], setStoreNote = snState[1];
  var tState = useState('home'), tab = tState[0], setTab = tState[1];
  var sState = useState(null), session = sState[0], setSession = sState[1];
  var cState = useState(null), openCard = cState[0], setOpenCard = cState[1];
  var oState = useState(null), openMethod = oState[0], setOpenMethod = oState[1];
  var dState = useState(null), dialog = dState[0], setDialog = dState[1];
  var toastState = useState(null), toast = toastState[0], setToast = toastState[1];
  var fState = useState({grade:[], category:[], attached:[], state:[]}),
      filters = fState[0], setFilters = fState[1];
  var covState = useState(false), covered = covState[0], setCovered = covState[1];

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
  function practiceOne(card){
    setOpenCard(null);
    setSession(makeSlot([{cardId:card.id, kind:pickKind(progressRef.current.cards[card.id]),
      retry:false}], 0, []));
  }

  var cur = session && session.phase !== 'done' ? session.queue[session.idx] : null;

  function onSubmit(correct){
    update(function(p){ recordAnswer(p, cur.cardId, cur.kind, correct, null); });
    setSession(function(s){
      var r = s.results.slice(); r[s.idx] = correct;
      return Object.assign({}, s, {results:r, phase:correct ? 'explain' : 'reason'});
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
        {cardId:queue[s.idx].cardId, kind:queue[s.idx].kind, retry:true});
    }
    var nextIdx = s.idx + 1, done = nextIdx >= queue.length;
    update(function(p){ scheduleCard(p, s.queue[s.idx].cardId, conf, correct); });
    setSession(done ? Object.assign({}, s, {queue:queue, phase:'done'})
                    : makeSlot(queue, nextIdx, s.results));
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
    body = h('div', null,
      h(SectionHead, {title:'這一輪結束'}),
      h('div', {className:'block'},
        h('div', {style:{display:'flex', gap:'16px', alignItems:'flex-end'}},
          h('div', null, h('div', {className:'big'}, sessionSummary.ok + '/' + sessionSummary.n),
            h('div', {className:'tiny muted'}, '答對題數')),
          h('div', {style:{marginLeft:'auto', textAlign:'right'}},
            h('div', {className:'big', style:{fontSize:'22px'}}, sessionSummary.miss),
            h('div', {className:'tiny muted'}, '答錯（已排到明天）'))),
        h('p', {className:'small muted', style:{marginTop:'12px'}},
          '答錯的卡已經自動排進明天的複習清單；自評「還不確定」的卡會在 1、3、7 天後再出現。'),
        h('div', {className:'btnrow'},
          h('button', {className:'btn primary', onClick:function(){
            setSession(null); setTab('home');
          }}, '回到今日複習')),
        h('div', {className:'btnrow'},
          h('button', {className:'btn ghost', onClick:function(){
            setSession(null); startSession('due');
          }}, '再練一輪'))));
  } else if(session){
    body = h(SessionView, {state:session,
      onSubmit:onSubmit, onToExplain:onToExplain, onConfidence:onConfidence,
      onBlankClick:onBlankClick, onToken:onToken,
      onPick:function(i){ setSession(function(s){ return Object.assign({}, s, {picked:i}); }); },
      onNum:function(v){ setSession(function(s){ return Object.assign({}, s, {num:v}); }); },
      onHint:function(){ setSession(function(s){ return Object.assign({}, s, {hint:Math.min(2, s.hint + 1)}); }); },
      onReason:function(r){ setSession(function(s){ return Object.assign({}, s, {reason:r}); }); },
      onQuit:function(){ setSession(null); }});
  } else if(tab === 'home'){
    body = h(HomeScreen, {progress:progress, onStart:startSession, onOpenCard:setOpenCard,
      storeNote:storeNote});
  } else if(tab === 'library'){
    body = h(LibraryScreen, {progress:progress, filters:filters, setFilters:setFilters,
      covered:covered, setCovered:setCovered, onOpenCard:setOpenCard,
      onPracticeList:function(list){ startSession('free', list); }});
  } else if(tab === 'methods'){
    body = h(MethodsScreen, {onOpen:setOpenMethod});
  } else {
    body = h(StatsScreen, {progress:progress, onOpenCard:setOpenCard, storeMode:storeMode,
      onReset:function(){ setDialog('reset1'); }});
  }

  var cardObj = openCard ? CARD_BY_ID[openCard] : null;
  var methodObj = openMethod ? METHODS.filter(function(m){ return m.id === openMethod; })[0] : null;

  return h('div', {className:'app'},
    h('header', {className:'topbar'},
      h('h1', null, '會考數學公式教練'),
      h('span', {className:'sub'}, session ? 'PRACTICE'
        : (storeMode === 'local' ? '進度已保存' : '未保存'))),
    h('main', {className:'main'}, body),
    session ? null : h(BottomNav, {tab:tab, onTab:setTab}),
    toast ? h('div', {style:{position:'fixed', left:0, right:0, bottom:'70px', zIndex:50,
        display:'flex', justifyContent:'center', pointerEvents:'none'}},
        h('div', {className:'banner teal', style:{maxWidth:'400px'}},
          h('span', {'aria-hidden':'true'}, 'ⓘ'), h('span', null, toast))) : null,
    cardObj ? h(Sheet, {title:cardObj.title, onClose:function(){ setOpenCard(null); }},
      h(CardDetail, {card:cardObj, progress:progress, covered:covered,
        onReveal:function(){ setCovered(false); }, onPractice:practiceOne})) : null,
    methodObj ? h(Sheet, {title:methodObj.title, onClose:function(){ setOpenMethod(null); }},
      h(MethodDetail, {m:methodObj})) : null,
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
