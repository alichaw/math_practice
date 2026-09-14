/* ══════════════════════════════════════════════════════════════════════
   間隔複習排程與本次練習統計
   全部只在記憶體中運作，不寫入任何儲存空間
   ══════════════════════════════════════════════════════════════════════ */
var ALL_CARDS = ATTACHED.concat(NUM_CARDS, FUNC_CARDS, GEOF_CARDS, GEOP_CARDS);
var CARD_BY_ID = {};
ALL_CARDS.forEach(function(c){ CARD_BY_ID[c.id] = c; });

var CATEGORIES = {num:'數與代數', eq:'方程式與函數', geo:'幾何', stat:'統計與機率'};
var GRADES = {7:'七年級', 8:'八年級', 9:'九年級'};
var KINDS = {recall:'公式回想', recognition:'題型辨識', application:'公式套用'};
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
var STORAGE_KEY = 'mathCoach.progress.v1';
var DB_PATH = 'progress/main';
var PROGRESS_VERSION = 1;

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
    recall:{c:0, t:0}, recognition:{c:0, t:0}, application:{c:0, t:0},
    unsureIdx:0, knownIdx:0, lapses:0, reasons:{}, lastResult:null, lastAt:null};
}
function emptyProgress(){
  return {version:PROGRESS_VERSION, cards:{}, recentWrong:[],
    createdAt:todayStr(), updatedAt:todayStr()};
}
function getCP(progress, id){
  if(!progress.cards[id]) progress.cards[id] = emptyCard();
  var cp = progress.cards[id];
  ['recall', 'recognition', 'application'].forEach(function(k){
    if(!cp[k]) cp[k] = {c:0, t:0};
  });
  if(!cp.successDays) cp.successDays = [];
  if(!cp.reasons) cp.reasons = {};
  return cp;
}
/* 熟練條件：不同日期成功回想 ≥ 2、辨識答對 ≥ 1、應用答對 ≥ 2 */
function isMastered(cp){
  if(!cp) return false;
  return (cp.successDays || []).length >= 2 &&
         (cp.recognition ? cp.recognition.c : 0) >= 1 &&
         (cp.application ? cp.application.c : 0) >= 2;
}
function masteryLevel(cp){
  if(!cp || cp.seen === 0) return 0;
  return isMastered(cp) ? 2 : 1;
}
var MASTERY_LABEL = ['尚未練習', '練習中', '已熟練'];

/* 記錄一次作答 */
function recordAnswer(progress, id, kind, correct, reason){
  var cp = getCP(progress, id), today = todayStr();
  cp.seen++;
  cp[kind].t++;
  if(correct){
    cp[kind].c++;
    if(kind === 'recall' && cp.successDays.indexOf(today) < 0) cp.successDays.push(today);
  } else {
    cp.lapses++;
    if(reason) cp.reasons[reason] = (cp.reasons[reason] || 0) + 1;
    progress.recentWrong.unshift({id:id, kind:kind, reason:reason || null, date:today});
    progress.recentWrong = progress.recentWrong.slice(0, 30);
  }
  cp.lastResult = correct ? 'ok' : 'miss';
  cp.lastAt = today;
  progress.updatedAt = today;
  return cp;
}
/* 依自評與對錯決定下次複習日 */
function scheduleCard(progress, id, confidence, correct){
  var cp = getCP(progress, id), today = todayStr(), gap;
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
function pickKind(cp){
  if(!cp || cp.recall.t === 0) return 'recall';
  if(cp.recognition.t === 0) return 'recognition';
  if(cp.application.c < 2) return 'application';
  var arr = [['recall', cp.recall.t], ['recognition', cp.recognition.t],
             ['application', cp.application.t]];
  arr.sort(function(a, b){ return a[1] - b[1]; });
  return arr[0][0];
}
function dueList(progress, today){
  var t = today || todayStr();
  return ALL_CARDS.filter(function(c){
    var cp = progress.cards[c.id];
    return cp && cp.due && daysBetween(cp.due, t) >= 0;
  });
}
function newList(progress){
  return ALL_CARDS.filter(function(c){
    var cp = progress.cards[c.id];
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
    pool = (opts.cards && opts.cards.length ? opts.cards : ALL_CARDS);
    pool = shuffle(pool, Date.now() % 233280).slice(0, limit);
  } else {
    var due = dueList(progress, today).sort(function(a, b){
      return daysBetween(progress.cards[b.id].due, today) -
             daysBetween(progress.cards[a.id].due, today);
    });
    pool = due.slice(0, limit);
    if(pool.length < limit){
      var fresh = newList(progress).slice(0, limit - pool.length);
      pool = pool.concat(fresh);
    }
  }
  return pool.map(function(c){
    var k = pickKind(progress.cards[c.id]);
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
  return kind === 'recall' ? [card.recallPrompt]
       : kind === 'recognition' ? card.recognitionQuestions
       : card.applicationQuestions;
}
function qFor(card, kind, qi){
  var pool = poolFor(card, kind);
  return pool[(qi || 0) % pool.length];
}
/* 最容易忘記的知識點 */
function weakest(progress, n){
  var scored = ALL_CARDS.map(function(c){
    var cp = progress.cards[c.id];
    if(!cp || cp.seen === 0) return null;
    var tot = cp.recall.t + cp.recognition.t + cp.application.t;
    var ok = cp.recall.c + cp.recognition.c + cp.application.c;
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
    var mastered = list.filter(function(c){ return isMastered(progress.cards[c.id]); }).length;
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
  return ALL_CARDS.filter(function(c){
    return !isMastered(progress.cards[c.id]);
  });
}
/* 本次已安排複習間隔的卡，依間隔長短排序（純粹展示間隔複習的安排） */
function scheduleList(progress){
  var today = todayStr();
  return ALL_CARDS.filter(function(c){
    var cp = progress.cards[c.id];
    return cp && cp.due;
  }).map(function(c){
    return {card:c, gap:daysBetween(today, progress.cards[c.id].due)};
  }).sort(function(a, b){ return a.gap - b.gap; });
}
/* 本次練習的總計（每答一題就即時更新） */
function sessionTotals(progress){
  var n = 0, ok = 0;
  ALL_CARDS.forEach(function(c){
    var cp = progress.cards[c.id];
    if(!cp) return;
    ['recall', 'recognition', 'application'].forEach(function(k){
      n += cp[k].t; ok += cp[k].c;
    });
  });
  return {n:n, ok:ok, pct:n ? Math.round(ok / n * 100) : null};
}

function recordReason(progress, id, reason){
  var cp = getCP(progress, id);
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
    ['recall', 'recognition', 'application'].forEach(function(k){
      var s = c[k] || {};
      o[k] = {c:Math.max(0, Number(s.c) || 0), t:Math.max(0, Number(s.t) || 0)};
      if(o[k].c > o[k].t) o[k].c = o[k].t;
    });
    o.unsureIdx = Math.min(Math.max(0, Number(c.unsureIdx) || 0), LADDER_UNSURE.length - 1);
    o.knownIdx = Math.min(Math.max(0, Number(c.knownIdx) || 0), LADDER_KNOWN.length - 1);
    o.lapses = Math.max(0, Number(c.lapses) || 0);
    o.lastResult = (c.lastResult === 'ok' || c.lastResult === 'miss') ? c.lastResult : null;
    o.lastAt = typeof c.lastAt === 'string' ? c.lastAt : null;
    if(c.reasons && typeof c.reasons === 'object'){
      Object.keys(c.reasons).forEach(function(r){
        if(REASON_LABEL[r]) o.reasons[r] = Math.max(0, Number(c.reasons[r]) || 0);
      });
    }
    out.cards[id] = o;
  });
  if(Array.isArray(raw.recentWrong)){
    out.recentWrong = raw.recentWrong.filter(function(w){
      return w && CARD_BY_ID[w.id] && KINDS[w.kind];
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
