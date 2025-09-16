// Abstract generative background: executive nocturne mesh + graph
(function(){
  const c = document.getElementById('bg');
  if (!c) return;
  const ctx = c.getContext('2d');
  let W = 0, H = 0, DPR = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
  let nodes = [], edges = [], ripples = [];

  function sizeCanvas(){
    const hero = document.querySelector('.hero');
    const rect = hero ? hero.getBoundingClientRect() : {width: window.innerWidth, height: window.innerHeight*0.7};
    W = Math.max(1, Math.floor(rect.width));
    H = Math.max(1, Math.floor(rect.height));
    c.style.width = W + "px";
    c.style.height = H + "px";
    c.width = Math.floor(W * DPR);
    c.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function brainPoint(t, w, h){
    const ang = t * Math.PI * 2;
    const lobe = Math.cos(ang) >= 0 ? 1 : -1;
    const rx = w * 0.36;
    const ry = h * 0.26;
    const cx = (lobe * w * 0.12) + (0.06 * w * Math.sin(2*ang));
    const cy = 0.02 * h * Math.sin(3*ang);
    return { x: w*0.5 + cx + rx * Math.cos(ang), y: h*0.5 + cy + ry * Math.sin(ang) };
  }

  const symbols = ["Gs","e","γ","φ","c′","OCR","Su","Dr","ν","E","k","Cu","Cv","σ′v","σ′h","N60","q_c","C_c","C_r","IP"];

  function initGraph(){
    sizeCanvas();
    nodes = []; edges = [];
    const N = Math.min(160, Math.max(90, Math.floor(W/10)));
    for (let i=0;i<N;i++){
      const t = i / N;
      const p = brainPoint(t, W, H);
      const r = (Math.random()**1.8) * Math.min(W,H) * 0.10;
      const th = Math.random()*Math.PI*2;
      const x = p.x + r * Math.cos(th);
      const y = p.y + r * Math.sin(th);
      nodes.push({ x, y, ox:x, oy:y, vx:(Math.random()-.5)*0.2, vy:(Math.random()-.5)*0.2, label: (Math.random()<0.18)?symbols[Math.floor(Math.random()*symbols.length)]:null });
    }
    const k = 3;
    for (let i=0;i<nodes.length;i++){
      const dists = [];
      for (let j=0;j<nodes.length;j++){
        if (i===j) continue;
        const dx=nodes[i].x-nodes[j].x, dy=nodes[i].y-nodes[j].y;
        dists.push({j, d: dx*dx+dy*dy});
      }
      dists.sort((a,b)=>a.d-b.d);
      for (let n=0;n<k;n++){ const j=dists[n].j; if (j>i) edges.push([i,j]); }
    }
  }

  function drawNocturneMesh(t){
    // softly animated mesh in imperial gold tones
    const cx = W*0.52 + Math.sin(t*0.0005)*W*0.06;
    const cy = H*0.42 + Math.cos(t*0.0006)*H*0.05;
    const r = Math.max(W,H)*0.75;
    const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g1.addColorStop(0, 'rgba(255,214,110,0.10)');
    g1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g1; ctx.fillRect(0,0,W,H);
    const g2 = ctx.createRadialGradient(W*0.18, H*0.18, 0, W*0.18, H*0.18, r*0.8);
    g2.addColorStop(0, 'rgba(255,174,52,0.08)');
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2; ctx.fillRect(0,0,W,H);
  }

  function addRipple(x,y){ ripples.push({x,y,t:0}); }

  function drawRipples(dt){
    const speed = 240; const maxR = Math.max(W,H)*0.5;
    for (let i=ripples.length-1;i>=0;i--){
      const rp = ripples[i]; rp.t += dt*speed; const r = rp.t;
      const alpha = Math.max(0, 1 - r/maxR) * 0.25;
      if (alpha<=0){ ripples.splice(i,1); continue; }
      ctx.beginPath(); ctx.arc(rp.x, rp.y, r, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(137,180,255,${alpha})`; ctx.lineWidth = 1.2; ctx.stroke();
    }
  }

  function step(){
    ctx.clearRect(0,0,W,H);
    const now = performance.now();
    drawNocturneMesh(now);

    for (const n of nodes){
      const k = 0.008, dx=n.ox-n.x, dy=n.oy-n.y;
      n.vx += k*dx + 0.02*Math.sin((n.ox*0.02 + now*0.0008));
      n.vy += k*dy + 0.02*Math.cos((n.oy*0.02 + now*0.0007));
      n.vx *= 0.98; n.vy *= 0.98; n.x += n.vx; n.y += n.vy;
    }

    ctx.lineWidth = 1;
    for (const [i,j] of edges){
      const a=nodes[i], b=nodes[j], dx=a.x-b.x, dy=a.y-b.y, d=Math.hypot(dx,dy);
      const alpha = Math.max(0, 1 - d/160);
      if (alpha>0.05){ ctx.globalAlpha = alpha*0.9; ctx.strokeStyle='#3a2a14'; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); }
    }

    ctx.globalAlpha = 1;
    for (const n of nodes){
      ctx.beginPath(); ctx.arc(n.x,n.y,1.8,0,Math.PI*2); ctx.fillStyle='#ffd66e'; ctx.fill();
      if (n.label){ ctx.font='12px Inter, system-ui, -apple-system, Segoe UI, Roboto'; ctx.fillStyle='rgba(239,232,218,0.9)'; ctx.fillText(n.label, n.x+4, n.y-4); }
    }
    drawRipples(1/60);
    requestAnimationFrame(step);
  }

  function handleResize(){
    const prevW=W, prevH=H; sizeCanvas();
    if (Math.abs(prevW-W)>2 || Math.abs(prevH-H)>2){ initGraph(); }
  }

  initGraph(); requestAnimationFrame(step);
  window.addEventListener('resize', handleResize);
  const hero = document.querySelector('.hero');
  if (window.ResizeObserver && hero){ new ResizeObserver(()=>handleResize()).observe(hero); }
  c.addEventListener('pointermove', (e)=>{
    const rect = c.getBoundingClientRect(); addRipple(e.clientX-rect.left, e.clientY-rect.top);
  }, {passive:true});

  // Scroll reveal (reusable)
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(en=>{
      if (en.isIntersecting){
        en.target.classList.add('is-visible');
        if (!prefersReduced) observer.unobserve(en.target);
      }
    });
  }, {threshold: 0.14});
  document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
})();