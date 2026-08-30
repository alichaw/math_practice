
/* ── 掛載 ─────────────────────────────────────────────────────────── */
var Boundary = (function(){
  function B(p){ React.Component.call(this, p); this.state = {err:null}; }
  B.prototype = Object.create(React.Component.prototype);
  B.prototype.constructor = B;
  B.getDerivedStateFromError = function(err){ return {err:err}; };
  B.prototype.componentDidCatch = function(){};
  B.prototype.render = function(){
    if(this.state.err){
      return h('div', {className:'app'},
        h('header', {className:'topbar'}, h('h1', null, '會考數學公式教練')),
        h('main', {className:'main'},
          h('div', {className:'banner red'},
            h('span', {'aria-hidden':'true'}, '！'),
            h('span', null, '畫面發生錯誤，已停在安全狀態。重新整理頁面即可繼續，先前存下的進度不會消失。')),
          h('div', {className:'btnrow'},
            h('button', {className:'btn', onClick:function(){ window.location.reload(); }},
              '重新整理'))));
    }
    return this.props.children;
  };
  return B;
})();

var rootEl = document.getElementById('root');
rootEl.innerHTML = '';
ReactDOM.createRoot(rootEl).render(h(Boundary, null, h(App)));
