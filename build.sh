#!/bin/sh
# 把 src/ 的片段組成單一 index.html（可直接發布為 Claude Artifact）
set -e
cd "$(dirname "$0")"
OUT=index.html
{
  cat src/00-head.html
  cat <<'HTML'
<div id="root"><div style="padding:24px;font-family:system-ui;color:#5A6A7D">載入中…</div></div>
<noscript><div style="padding:24px">這個網站需要開啟 JavaScript 才能使用。</div></noscript>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script>
(function(){
"use strict";
if(!window.React || !window.ReactDOM){
  document.getElementById('root').innerHTML =
    '<div style="padding:24px;font-family:system-ui;line-height:1.7">' +
    '<b>元件庫載入失敗</b><br>請檢查網路連線後重新整理頁面。</div>';
  return;
}
try {
HTML
  cat src/10-math.js src/20-svg.js \
      src/30-data-a.js src/31-data-b.js src/32-data-c.js src/33-data-geo.js src/34-data-methods.js \
      src/40-progress.js src/50-ui.js src/60-app.js src/70-mount.js
  cat <<'HTML'
} catch(err){
  var el = document.getElementById('root');
  if(el) el.innerHTML =
    '<div style="padding:24px;font-family:system-ui;line-height:1.7">' +
    '<b>網站啟動時發生錯誤</b><br>請重新整理頁面再試一次。</div>';
}
})();
</script>
HTML
} > $OUT
echo "built $OUT ($(wc -c < $OUT) bytes)"
