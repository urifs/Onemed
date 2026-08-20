(() => {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;left:-99px;top:0;width:30px;height:30px;border-radius:50%;background:rgba(201,144,138,0.35);border:2.5px solid #fff;box-shadow:0 2px 12px rgba(63,53,46,0.4);z-index:2147483647;pointer-events:none;transform:translate(-50%,-50%);transition:width .12s,height .12s';
  const add = () => document.body && document.body.appendChild(d);
  document.body ? add() : addEventListener('DOMContentLoaded', add);
  addEventListener('mousemove', e => { d.style.left = e.clientX+'px'; d.style.top = e.clientY+'px'; }, true);
  addEventListener('mousedown', () => { d.style.width='46px'; d.style.height='46px'; setTimeout(()=>{d.style.width='30px';d.style.height='30px';},200); }, true);
})();
