/* ══════════════════════════════════════════════════════════════════════
   即時回饋：音效與彩帶
   音效用 Web Audio 當場合成，不載入任何外部音檔
   AudioContext 只在第一次點擊（使用者操作）時才建立，不會自動播放
   ══════════════════════════════════════════════════════════════════════ */
var Sfx = {
  ctx:null, on:true, failed:false,

  ready:function(){
    if(this.failed || !this.on) return null;
    if(!this.ctx){
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if(!AC){ this.failed = true; return null; }
        this.ctx = new AC();
      } catch(e){ this.failed = true; return null; }
    }
    if(this.ctx.state === 'suspended'){ try { this.ctx.resume(); } catch(e){} }
    return this.ctx;
  },

  /* 一個音：頻率、長度、波形、音量 */
  tone:function(freq, start, dur, type, vol){
    var ctx = this.ready();
    if(!ctx) return;
    try {
      var t0 = ctx.currentTime + start;
      var osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = type || 'triangle';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol == null ? 0.16 : vol, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t0); osc.stop(t0 + dur + 0.02);
    } catch(e){}
  },

  /* 答對：連對愈多音階愈高，做出「愈來愈爽」的感覺 */
  ok:function(combo){
    var step = Math.min(combo || 0, 8);
    var base = 523.25 * Math.pow(2, step / 12);      /* 從 Do 往上爬半音 */
    this.tone(base, 0, 0.14, 'triangle', 0.16);
    this.tone(base * 1.5, 0.06, 0.16, 'triangle', 0.12);
  },
  /* 答錯：短促的低音，不刺耳也不羞辱 */
  bad:function(){
    this.tone(196, 0, 0.13, 'sine', 0.13);
    this.tone(146.83, 0.07, 0.17, 'sine', 0.11);
  },
  /* 連對達標：一串上行音 */
  combo:function(){
    var n = [659.25, 783.99, 1046.5];
    for(var i = 0; i < n.length; i++) this.tone(n[i], i * 0.055, 0.16, 'triangle', 0.13);
  },
  /* 一輪結束 */
  done:function(){
    var n = [523.25, 659.25, 783.99, 1046.5];
    for(var i = 0; i < n.length; i++) this.tone(n[i], i * 0.085, 0.3, 'triangle', 0.15);
  },
  /* 連續天數 +1 */
  streak:function(){
    this.tone(880, 0, 0.12, 'square', 0.09);
    this.tone(1174.66, 0.08, 0.14, 'square', 0.09);
    this.tone(1567.98, 0.16, 0.26, 'triangle', 0.12);
  }
};

/* ── 彩帶：一次性的 canvas 動畫，播完就把節點移除 ─────────────── */
function confetti(opts){
  opts = opts || {};
  if(typeof document === 'undefined') return;
  try {
    if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  } catch(e){}
  var cv = document.createElement('canvas');
  cv.className = 'confetti';
  cv.setAttribute('aria-hidden', 'true');
  var w = window.innerWidth, hgt = window.innerHeight;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = w * dpr; cv.height = hgt * dpr;
  cv.style.width = w + 'px'; cv.style.height = hgt + 'px';
  document.body.appendChild(cv);
  var ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);

  var COLORS = ['#FFD23F', '#FF4D6D', '#31D0AA', '#4CA5FF', '#B265FF'];
  var n = opts.count || 90, parts = [], i;
  for(i = 0; i < n; i++){
    parts.push({
      x:w * (0.15 + Math.random() * 0.7),
      y:hgt * 0.32 + Math.random() * 40,
      vx:(Math.random() - 0.5) * 9,
      vy:-(7 + Math.random() * 9),
      g:0.26 + Math.random() * 0.12,
      rot:Math.random() * Math.PI,
      vr:(Math.random() - 0.5) * 0.3,
      w:5 + Math.random() * 6,
      h:8 + Math.random() * 8,
      c:COLORS[(Math.random() * COLORS.length) | 0]
    });
  }
  var t0 = performance.now(), LIFE = 1900;
  function frame(now){
    var age = now - t0;
    ctx.clearRect(0, 0, w, hgt);
    var alive = 0;
    for(i = 0; i < parts.length; i++){
      var p = parts[i];
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      p.vx *= 0.995;
      if(p.y < hgt + 40) alive++;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - age / LIFE);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if(age < LIFE && alive > 0) requestAnimationFrame(frame);
    else if(cv.parentNode) cv.parentNode.removeChild(cv);
  }
  requestAnimationFrame(frame);
}
