/* ══════════════════════════════════════════════════════════════════════
   間隔複習排程與本次練習統計
   全部只在記憶體中運作，不寫入任何儲存空間
   ══════════════════════════════════════════════════════════════════════ */
var ALL_CARDS = ATTACHED.concat(NUM_CARDS, FUNC_CARDS, GEOF_CARDS, GEOP_CARDS);
var CARD_BY_ID = {};
ALL_CARDS.forEach(function(c){ CARD_BY_ID[c.id] = c; });

var METHOD_BY_ID = {};
METHODS.forEach(function(m){ METHOD_BY_ID[m.id] = m; });
/* 知識卡 + 解法卡：兩者都納入間隔複習 */
var ALL_NODES = ALL_CARDS.concat(METHODS);
var NODE_BY_ID = {};
ALL_NODES.forEach(function(n){ NODE_BY_ID[n.id] = n; });

var CATEGORIES = {num:'數與代數', eq:'方程式與函數', geo:'幾何', stat:'統計與機率'};
var GRADES = {7:'七年級', 8:'八年級', 9:'九年級'};
var KINDS = {recall:'公式回想', select:'看題選公式', recognition:'題型辨識',
             application:'公式套用', method:'解法練習'};
var KIND_ORDER = ['recall', 'select', 'recognition', 'application'];
var ERROR_REASONS = [
  {id:'forgot', label:'公式忘記'}, {id:'wrongFormula', label:'選錯公式'},
  {id:'misread', label:'條件看錯'}, {id:'matching', label:'對應邊角找錯'},
  {id:'substitute', label:'代入錯誤'}, {id:'sign', label:'正負號錯誤'},
  {id:'compute', label:'計算錯誤'}, {id:'unit', label:'單位錯誤'}
];
var REASON_LABEL = {};
ERROR_REASONS.forEach(function(r){ REASON_LABEL[r.id] = r.label; });

var LADDER_UNSURE = [1, 3, 7];
var LADDER_KNOWN = [3, 7, 14, 30];
var PROGRESS_VERSION = 2;

function todayStr(d){
  var t = d || new Date();
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') +
         '-' + String(t.getDate()).padStart(2, '0');
}
function addDays(dateStr, n){
  var p = dateStr.split('-');
  var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  d.setDate(d.getDate() + n);
  return todayStr(d);
}
function daysBetween(a, b){
  var pa = a.split('-'), pb = b.split('-');
  var da = new Date(Number(pa[0]), Number(pa[1]) - 1, Number(pa[2]));
  var db = new Date(Number(pb[0]), Number(pb[1]) - 1, Number(pb[2]));
  return Math.round((db - da) / 86400000);
}

function emptyCard(){
  return {seen:0, due:null, successDays:[],
    recall:{c:0, t:0}, select:{c:0, t:0}, recognition:{c:0, t:0}, application:{c:0, t:0},
    unsureIdx:0, knownIdx:0, lapses:0, reasons:{}, lastResult:null, lastAt:null, todayN:0};
}
/* 解法卡只有一種題型，所以只留 method 這一個計數桶 */
function emptyMethod(){
  return {seen:0, due:null, successDays:[], method:{c:0, t:0},
    unsureIdx:0, knownIdx:0, lapses:0, reasons:{}, lastResult:null, lastAt:null, todayN:0};
}
var DAILY_GOAL = 20;                 /* 一天練 20 題就算達標，大約 8 分鐘 */
var COMBO_STEPS = [3, 5, 10, 20];    /* 連對到這些數字會有一次額外的獎勵 */
function emptyProgress(){
  return {version:PROGRESS_VERSION, cards:{}, methods:{}, recentWrong:[],
    streak:{days:0, lastDay:null, best:0},
    xp:{total:0, today:0, day:null},
    goal:DAILY_GOAL, sound:true,
    createdAt:todayStr(), updatedAt:todayStr()};
}

/* ── 連續天數：今天練過就接上，斷一天就重來 ─────────────────────── */
function touchStreak(progress){
  if(!progress.streak) progress.streak = {days:0, lastDay:null, best:0};
  var st = progress.streak, today = todayStr();
  if(st.lastDay === today) return st;
  st.days = (st.lastDay && daysBetween(st.lastDay, today) === 1) ? st.days + 1 : 1;
  st.lastDay = today;
  if(st.days > st.best) st.best = st.days;
  return st;
}
/* 今天練了沒 */
function practicedToday(progress){
  return !!(progress.streak && progress.streak.lastDay === todayStr());
}
/* 連續天數會不會在今天斷掉 */
function streakDays(progress){
  var st = progress.streak;
  if(!st || !st.lastDay) return 0;
  var d = daysBetween(st.lastDay, todayStr());
  return d <= 1 ? st.days : 0;      /* 昨天練的還算數，再久就斷了 */
}

/* ── XP：答對就加，連對愈多加愈多 ──────────────────────────────── */
function xpFor(combo){ return 10 + Math.min(combo, 5) * 2; }
function addXP(progress, n){
  if(!progress.xp) progress.xp = {total:0, today:0, day:null};
  var today = todayStr();
  if(progress.xp.day !== today){ progress.xp.day = today; progress.xp.today = 0; }
  progress.xp.today += n;
  progress.xp.total += n;
  return progress.xp.today;
}
function xpToday(progress){
  return (progress.xp && progress.xp.day === todayStr()) ? progress.xp.today : 0;
}
function goalOf(progress){ return progress.goal || DAILY_GOAL; }
/* 今天練了幾題（用 XP 反推太粗，另外數） */
function answeredToday(progress){
  var n = 0, today = todayStr();
  ALL_CARDS.forEach(function(c){
    var cp = progress.cards[c.id];
    if(cp && cp.lastAt === today) n += cp.todayN || 0;
  });
  Object.keys(progress.methods || {}).forEach(function(id){
    var mp = progress.methods[id];
    if(mp && mp.lastAt === today) n += mp.todayN || 0;
  });
  return n;
}
function getMP(progress, id){
  if(!progress.methods) progress.methods = {};
  if(!progress.methods[id]) progress.methods[id] = emptyMethod();
  var mp = progress.methods[id];
  if(!mp.method) mp.method = {c:0, t:0};
  if(!mp.successDays) mp.successDays = [];
  if(!mp.reasons) mp.reasons = {};
  return mp;
}
/* 不管是知識卡還是解法卡，都用這個取進度 */
function getNP(progress, id){
  return METHOD_BY_ID[id] ? getMP(progress, id) : getCP(progress, id);
}
function npOf(progress, id){
  return METHOD_BY_ID[id] ? (progress.methods || {})[id] : progress.cards[id];
}
function getCP(progress, id){
  if(!progress.cards[id]) progress.cards[id] = emptyCard();
  var cp = progress.cards[id];
  KIND_ORDER.forEach(function(k){
    if(!cp[k]) cp[k] = {c:0, t:0};
  });
  if(!cp.successDays) cp.successDays = [];
  if(!cp.reasons) cp.reasons = {};
  return cp;
}
/* 熟練條件：不同日期成功回想 ≥ 2、看題選公式答對 ≥ 2、辨識答對 ≥ 1、應用答對 ≥ 2
   「看題選公式」是「背起來但不會用」的那一關，所以和應用題同樣要求 2 次 */
function isMastered(cp, card){
  if(!cp) return false;
  var needSelect = !card || poolFor(card, 'select').length > 0;
  return (cp.successDays || []).length >= 2 &&
         (!needSelect || (cp.select ? cp.select.c : 0) >= 2) &&
         (cp.recognition ? cp.recognition.c : 0) >= 1 &&
         (cp.application ? cp.application.c : 0) >= 2;
}
/* 解法卡：不同日期答對 2 次才算熟練 */
function isMethodMastered(mp){
  if(!mp) return false;
  return (mp.successDays || []).length >= 2 && mp.method.c >= 2;
}
function isNodeMastered(progress, node){
  return METHOD_BY_ID[node.id]
    ? isMethodMastered((progress.methods || {})[node.id])
    : isMastered(progress.cards[node.id], node);
}
function masteryLevel(cp, card){
  if(!cp || cp.seen === 0) return 0;
  return isMastered(cp, card) ? 2 : 1;
}
var MASTERY_LABEL = ['尚未練習', '練習中', '已熟練'];

/* 記錄一次作答 */
function recordAnswer(progress, id, kind, correct, reason){
  var cp = getNP(progress, id), today = todayStr();
  cp.seen++;
  cp[kind].t++;
  if(correct){
    cp[kind].c++;
    if((kind === 'recall' || kind === 'method') && cp.successDays.indexOf(today) < 0)
      cp.successDays.push(today);
  } else {
    cp.lapses++;
    if(reason) cp.reasons[reason] = (cp.reasons[reason] || 0) + 1;
    progress.recentWrong.unshift({id:id, kind:kind, reason:reason || null, date:today});
    progress.recentWrong = progress.recentWrong.slice(0, 30);
  }
  cp.todayN = (cp.lastAt === today ? (cp.todayN || 0) : 0) + 1;
  cp.lastResult = correct ? 'ok' : 'miss';
  cp.lastAt = today;
  touchStreak(progress);
  progress.updatedAt = today;
  return cp;
}
/* 依自評與對錯決定下次複習日 */
function scheduleCard(progress, id, confidence, correct){
  var cp = getNP(progress, id), today = todayStr(), gap;
  if(!correct){
    gap = 1;                       /* 答錯：隔天一定再複習 */
    cp.unsureIdx = 0; cp.knownIdx = 0;
  } else if(confidence === 'no'){
    gap = 1;
    cp.unsureIdx = 0; cp.knownIdx = 0;
  } else if(confidence === 'maybe'){
    gap = LADDER_UNSURE[Math.min(cp.unsureIdx, LADDER_UNSURE.length - 1)];
    cp.unsureIdx = Math.min(cp.unsureIdx + 1, LADDER_UNSURE.length - 1);
    cp.knownIdx = 0;
  } else {
    gap = LADDER_KNOWN[Math.min(cp.knownIdx, LADDER_KNOWN.length - 1)];
    cp.knownIdx = Math.min(cp.knownIdx + 1, LADDER_KNOWN.length - 1);
  }
  cp.due = addDays(today, gap);
  progress.updatedAt = today;
  return gap;
}
/* 下一題該考哪一種形式 */
function pickKind(cp, card){
  /* card 有給的話，題庫是空的那一種就跳過，資料補到一半也不會壞掉 */
  function has(k){ return !card || poolFor(card, k).length > 0; }
  if(!cp || cp.recall.t === 0) return 'recall';
  if(has('select') && cp.select.t === 0) return 'select';
  if(cp.recognition.t === 0) return 'recognition';
  if(cp.application.c < 2) return 'application';
  if(has('select') && cp.select.c < 2) return 'select';
  var arr = KIND_ORDER.filter(has).map(function(k){ return [k, cp[k].t]; });
  arr.sort(function(a, b){ return a[1] - b[1]; });
  return arr[0][0];
}
function dueList(progress, today){
  var t = today || todayStr();
  return ALL_NODES.filter(function(c){
    var cp = npOf(progress, c.id);
    return cp && cp.due && daysBetween(cp.due, t) >= 0;
  });
}
function newList(progress){
  return ALL_NODES.filter(function(c){
    var cp = npOf(progress, c.id);
    return !cp || cp.seen === 0;
  });
}
function shuffle(arr, seed){
  var a = arr.slice(), s = seed || 1;
  for(var i = a.length - 1; i > 0; i--){
    s = (s * 9301 + 49297) % 233280;
    var j = Math.floor(s / 233280 * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}
/* 組出本次練習的題目佇列 */
function buildQueue(progress, opts){
  opts = opts || {};
  var limit = opts.limit || 12, today = todayStr(), pool;
  if(opts.mode === 'free'){
    pool = (opts.cards && opts.cards.length ? opts.cards : ALL_NODES);
    pool = shuffle(pool, Date.now() % 233280).slice(0, limit);
  } else {
    var due = dueList(progress, today).sort(function(a, b){
      return daysBetween(npOf(progress, b.id).due, today) -
             daysBetween(npOf(progress, a.id).due, today);
    });
    pool = due.slice(0, limit);
    if(pool.length < limit){
      var fresh = newList(progress).slice(0, limit - pool.length);
      pool = pool.concat(fresh);
    }
  }
  return pool.map(function(c){
    if(METHOD_BY_ID[c.id]){
      var mp = (progress.methods || {})[c.id];
      return {cardId:c.id, kind:'method', qi:qIndex(mp, 'method'), retry:false};
    }
    var k = pickKind(progress.cards[c.id], c);
    return {cardId:c.id, kind:k, qi:qIndex(progress.cards[c.id], k), retry:false};
  });
}
/* 這張卡這個題型已經作答幾次，就輪到題庫的第幾題 */
function qIndex(cp, kind){
  if(!cp || !cp[kind]) return 0;
  return cp[kind].t;
}
/* 這一題要從卡片的題庫裡拿第幾題 */
function poolFor(card, kind){
  return kind === 'method' ? card.practiceQuestions
       : kind === 'recall' ? [card.recallPrompt]
       : kind === 'select' ? card.selectQuestions
       : kind === 'recognition' ? card.recognitionQuestions
       : card.applicationQuestions;
}
function qFor(card, kind, qi){
  var pool = poolFor(card, kind);
  if(!pool || !pool.length) pool = card.recognitionQuestions || card.practiceQuestions;
  return pool[(qi || 0) % pool.length];
}
/* 最容易忘記的知識點 */
function weakest(progress, n){
  var scored = ALL_CARDS.map(function(c){
    var cp = progress.cards[c.id];
    if(!cp || cp.seen === 0) return null;
    var tot = 0, ok = 0;
    KIND_ORDER.forEach(function(k){ if(cp[k]){ tot += cp[k].t; ok += cp[k].c; } });
    var acc = tot ? ok / tot : 1;
    var score = cp.lapses * 2 + (1 - acc) * 5 + (cp.lastResult === 'miss' ? 2 : 0);
    return score > 0 ? {card:c, score:score, acc:acc, lapses:cp.lapses} : null;
  }).filter(Boolean);
  scored.sort(function(a, b){ return b.score - a.score; });
  return scored.slice(0, n || 3);
}
function kindStats(progress, kind){
  var c = 0, t = 0;
  ALL_CARDS.forEach(function(card){
    var cp = progress.cards[card.id];
    if(cp && cp[kind]){ c += cp[kind].c; t += cp[kind].t; }
  });
  return {c:c, t:t, pct:t ? Math.round(c / t * 100) : null};
}
function categoryStats(progress){
  return Object.keys(CATEGORIES).map(function(k){
    var list = ALL_CARDS.filter(function(c){ return c.category === k; });
    var mastered = list.filter(function(c){ return isMastered(progress.cards[c.id], c); }).length;
    var started = list.filter(function(c){
      var cp = progress.cards[c.id]; return cp && cp.seen > 0;
    }).length;
    return {key:k, name:CATEGORIES[k], total:list.length, mastered:mastered, started:started,
            pct:list.length ? Math.round(mastered / list.length * 100) : 0};
  });
}
function reasonStats(progress){
  var acc = {};
  ALL_CARDS.forEach(function(card){
    var cp = progress.cards[card.id];
    if(cp && cp.reasons) Object.keys(cp.reasons).forEach(function(r){
      acc[r] = (acc[r] || 0) + cp.reasons[r];
    });
  });
  return Object.keys(acc).map(function(r){
    return {id:r, label:REASON_LABEL[r] || r, n:acc[r]};
  }).sort(function(a, b){ return b.n - a.n; });
}

/* ── 練習狀態的查詢輔助 ─────────────────────────────────────────── */
/* 還沒練熟的卡（含完全沒練過的），用來排出下一輪練習 */
function pendingList(progress){
  return ALL_NODES.filter(function(c){ return !isNodeMastered(progress, c); });
}
/* 本次已安排複習間隔的卡，依間隔長短排序（純粹展示間隔複習的安排） */
function scheduleList(progress){
  var today = todayStr();
  return ALL_NODES.filter(function(c){
    var cp = npOf(progress, c.id);
    return cp && cp.due;
  }).map(function(c){
    return {card:c, gap:daysBetween(today, npOf(progress, c.id).due)};
  }).sort(function(a, b){ return a.gap - b.gap; });
}
/* 本次練習的總計（每答一題就即時更新） */
function sessionTotals(progress){
  var n = 0, ok = 0;
  ALL_CARDS.forEach(function(c){
    var cp = progress.cards[c.id];
    if(!cp) return;
    KIND_ORDER.forEach(function(k){ if(cp[k]){ n += cp[k].t; ok += cp[k].c; } });
  });
  Object.keys(progress.methods || {}).forEach(function(id){
    var mp = progress.methods[id];
    if(mp && mp.method){ n += mp.method.t; ok += mp.method.c; }
  });
  return {n:n, ok:ok, pct:n ? Math.round(ok / n * 100) : null};
}

function recordReason(progress, id, reason){
  var cp = getNP(progress, id);
  if(!reason) return;
  cp.reasons[reason] = (cp.reasons[reason] || 0) + 1;
  if(progress.recentWrong.length && progress.recentWrong[0].id === id){
    progress.recentWrong[0].reason = reason;
  }
}

/* ══════════════════════════════════════════════════════════════════════
   進度保存：只寫入這台裝置的瀏覽器本機儲存
   不使用帳號、不連伺服器、不碰檔案；讀寫失敗時退回記憶體並顯示提示
   ══════════════════════════════════════════════════════════════════════ */
var STORAGE_KEY = 'mathCoach.progress.v2';
var STORE_NOTE = {
  local:'進度會存在這台裝置的瀏覽器裡，下次打開可以接著練。換裝置或清除瀏覽器資料就會歸零。',
  memory:'這個瀏覽器不允許保存資料（例如無痕模式），進度只保留在這個分頁。'
};

/* 讀回來的資料一律清洗過：只保留認得的欄位，壞資料不會讓網站當掉 */
function normalizeProgress(raw){
  if(!raw || typeof raw !== 'object') return null;
  var out = emptyProgress();
  out.createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : out.createdAt;
  out.updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : out.updatedAt;
  var cards = (raw.cards && typeof raw.cards === 'object') ? raw.cards : {};
  Object.keys(cards).forEach(function(id){
    if(!CARD_BY_ID[id]) return;
    var c = cards[id] || {}, o = emptyCard();
    o.seen = Math.max(0, Number(c.seen) || 0);
    o.due = (typeof c.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.due)) ? c.due : null;
    o.successDays = Array.isArray(c.successDays)
      ? c.successDays.filter(function(d){
          return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
        }).slice(0, 60)
      : [];
    KIND_ORDER.forEach(function(k){
      var s = c[k] || {};
      o[k] = {c:Math.max(0, Number(s.c) || 0), t:Math.max(0, Number(s.t) || 0)};
      if(o[k].c > o[k].t) o[k].c = o[k].t;
    });
    o.unsureIdx = Math.min(Math.max(0, Number(c.unsureIdx) || 0), LADDER_UNSURE.length - 1);
    o.knownIdx = Math.min(Math.max(0, Number(c.knownIdx) || 0), LADDER_KNOWN.length - 1);
    o.lapses = Math.max(0, Number(c.lapses) || 0);
    o.lastResult = (c.lastResult === 'ok' || c.lastResult === 'miss') ? c.lastResult : null;
    o.lastAt = typeof c.lastAt === 'string' ? c.lastAt : null;
    o.todayN = Math.max(0, Number(c.todayN) || 0);
    if(c.reasons && typeof c.reasons === 'object'){
      Object.keys(c.reasons).forEach(function(r){
        if(REASON_LABEL[r]) o.reasons[r] = Math.max(0, Number(c.reasons[r]) || 0);
      });
    }
    out.cards[id] = o;
  });
  /* 連續天數、XP、每日目標與音效設定 */
  if(raw.streak && typeof raw.streak === 'object'){
    var sd = Math.max(0, Number(raw.streak.days) || 0);
    out.streak = {
      days:Math.min(sd, 9999),
      lastDay:(typeof raw.streak.lastDay === 'string' &&
               /^\d{4}-\d{2}-\d{2}$/.test(raw.streak.lastDay)) ? raw.streak.lastDay : null,
      best:Math.min(Math.max(0, Number(raw.streak.best) || 0), 9999)
    };
    if(out.streak.best < out.streak.days) out.streak.best = out.streak.days;
    if(!out.streak.lastDay) out.streak.days = 0;
  }
  if(raw.xp && typeof raw.xp === 'object'){
    out.xp = {
      total:Math.max(0, Number(raw.xp.total) || 0),
      today:Math.max(0, Number(raw.xp.today) || 0),
      day:(typeof raw.xp.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.xp.day))
        ? raw.xp.day : null
    };
    if(!out.xp.day) out.xp.today = 0;
  }
  var g = Number(raw.goal);
  out.goal = (g >= 5 && g <= 200) ? Math.round(g) : DAILY_GOAL;
  out.sound = raw.sound !== false;

  var meths = (raw.methods && typeof raw.methods === 'object') ? raw.methods : {};
  Object.keys(meths).forEach(function(id){
    if(!METHOD_BY_ID[id]) return;
    var c = meths[id] || {}, o = emptyMethod();
    o.seen = Math.max(0, Number(c.seen) || 0);
    o.due = (typeof c.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.due)) ? c.due : null;
    o.successDays = Array.isArray(c.successDays)
      ? c.successDays.filter(function(d){
          return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
        }).slice(0, 60)
      : [];
    var mm = c.method || {};
    o.method = {c:Math.max(0, Number(mm.c) || 0), t:Math.max(0, Number(mm.t) || 0)};
    if(o.method.c > o.method.t) o.method.c = o.method.t;
    o.unsureIdx = Math.min(Math.max(0, Number(c.unsureIdx) || 0), LADDER_UNSURE.length - 1);
    o.knownIdx = Math.min(Math.max(0, Number(c.knownIdx) || 0), LADDER_KNOWN.length - 1);
    o.lapses = Math.max(0, Number(c.lapses) || 0);
    o.lastResult = (c.lastResult === 'ok' || c.lastResult === 'miss') ? c.lastResult : null;
    o.lastAt = typeof c.lastAt === 'string' ? c.lastAt : null;
    o.todayN = Math.max(0, Number(c.todayN) || 0);
    if(c.reasons && typeof c.reasons === 'object'){
      Object.keys(c.reasons).forEach(function(r){
        if(REASON_LABEL[r]) o.reasons[r] = Math.max(0, Number(c.reasons[r]) || 0);
      });
    }
    out.methods[id] = o;
  });
  if(Array.isArray(raw.recentWrong)){
    out.recentWrong = raw.recentWrong.filter(function(w){
      return w && NODE_BY_ID[w.id] && KINDS[w.kind];
    }).slice(0, 30).map(function(w){
      return {id:w.id, kind:w.kind,
        reason:REASON_LABEL[w.reason] ? w.reason : null,
        date:(typeof w.date === 'string') ? w.date : ''};
    });
  }
  return out;
}

var Store = {
  mode:'memory', note:null, timer:null,
  load:function(){
    var raw = null;
    try { raw = window.localStorage.getItem(STORAGE_KEY); }
    catch(e){ this.mode = 'memory'; this.note = STORE_NOTE.memory; return emptyProgress(); }
    this.mode = 'local'; this.note = null;
    if(!raw) return emptyProgress();
    var parsed = null;
    try { parsed = JSON.parse(raw); } catch(e){ parsed = null; }
    var clean = normalizeProgress(parsed);
    if(!clean){
      this.note = '上次的進度讀不回來（資料毀損），已從頭開始。';
      return emptyProgress();
    }
    return clean;
  },
  save:function(data, onStatus){
    var self = this;
    if(self.timer) clearTimeout(self.timer);
    self.timer = setTimeout(function(){
      var before = self.mode;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        self.mode = 'local'; self.note = null;
      } catch(e){
        self.mode = 'memory';
        self.note = (e && e.name === 'QuotaExceededError')
          ? '瀏覽器儲存空間已滿，進度只保留在這個分頁。'
          : STORE_NOTE.memory;
      }
      if(before !== self.mode && onStatus) onStatus(self.mode, self.note);
    }, 400);
  },
  clear:function(){
    try { window.localStorage.removeItem(STORAGE_KEY); } catch(e){}
  }
};
