(function(){
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.getElementById('bg');
  if(!cv){ console.warn('Canvas not found'); return; }
  const ctx = cv.getContext('2d');

  // Set canvas size to match its container
  const rect = cv.getBoundingClientRect();
  cv.width = rect.width * window.devicePixelRatio;
  cv.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  let W = rect.width, H = rect.height;
  const css = getComputedStyle(document.documentElement);
  function v(name, fb){ const val = css.getPropertyValue(name).trim(); return val || fb; }
  const C = {
    bg: v('--bg', '#0a0a0f'),
    stroke: v('--stroke', '#2a2a40'),
    text: v('--fg', '#f0f0ff'),
    muted: v('--muted', '#a0a0c0'),
    brand: v('--brand', '#00ffff'),
    brand2: v('--brand-2', '#0080ff'),
    accent: v('--accent', '#8a2be2'),
    panel: v('--card', 'rgba(15,15,25,.92)')
  };

  // Ghost in the Shell inspired particle system
  const particles = [];
  const maxParticles = prefersReduced ? 30 : 50;

  // City lights bokeh (large soft RGB lights in the background)
  const bokehLights = [];
  const maxBokeh = prefersReduced ? 6 : 12;
  const BOKEH_COLORS = ['rgba(0,255,255,0.25)','rgba(255,0,102,0.22)','rgba(57,255,20,0.20)','rgba(0,128,255,0.22)'];

  class Bokeh {
    constructor(){ this.reset(true); }
    reset(initial=false){
      this.x = Math.random()*W;
      this.y = Math.random()*H;
      this.baseR = Math.random()*80 + 60; // base radius
      this.r = this.baseR * (initial ? 1 : (0.8 + Math.random()*0.4));
      this.color = BOKEH_COLORS[Math.floor(Math.random()*BOKEH_COLORS.length)];
      this.pulse = Math.random()*Math.PI*2;
      this.pulseSpeed = 0.005 + Math.random()*0.01;
      this.vx = (Math.random()-0.5) * 0.08;
      this.vy = (Math.random()-0.5) * 0.08;
    }
    update(){
      this.pulse += this.pulseSpeed;
      this.r = this.baseR * (1 + Math.sin(this.pulse)*0.08);
      this.x += this.vx; this.y += this.vy;
      if(this.x < -120 || this.x > W+120 || this.y < -120 || this.y > H+120) this.reset();
    }
    draw(ctx){
      ctx.save();
      const grd = ctx.createRadialGradient(this.x, this.y, this.r*0.1, this.x, this.y, this.r);
      grd.addColorStop(0, this.color);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  for(let i=0;i<maxBokeh;i++){ bokehLights.push(new Bokeh()); }

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.size = Math.random() * 3 + 1;
      this.alpha = Math.random() * 0.5 + 0.2;
      this.color = Math.random() > 0.7 ? C.accent : (Math.random() > 0.5 ? C.brand : C.brand2);
      this.life = Math.random() * 100 + 50;
      this.maxLife = this.life;
      this.glow = Math.random() * 0.8 + 0.2;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life--;

      if (this.x < 0 || this.x > W) this.vx *= -1;
      if (this.y < 0 || this.y > H) this.vy *= -1;

      if (this.life <= 0) this.reset();
    }

    draw() {
      const alpha = (this.life / this.maxLife) * this.alpha;
    ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = this.glow * 10;

      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    }
  }

  // Initialize particles
  for (let i = 0; i < maxParticles; i++) {
    particles.push(new Particle());
  }

  // Geometric shapes
  const shapes = [];
  const maxShapes = prefersReduced ? 8 : 12;

  class GeometricShape {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.rotation = 0;
      this.rotationSpeed = (Math.random() - 0.5) * 0.02;
      this.size = Math.random() * 20 + 10;
      this.type = Math.floor(Math.random() * 3); // 0: triangle, 1: square, 2: hexagon
      this.color = Math.random() > 0.5 ? C.brand : C.accent;
      this.alpha = Math.random() * 0.3 + 0.1;
      this.pulse = Math.random() * Math.PI * 2;
      this.pulseSpeed = Math.random() * 0.05 + 0.02;
    }

    update() {
      this.rotation += this.rotationSpeed;
      this.pulse += this.pulseSpeed;
      this.x += Math.sin(this.pulse * 0.5) * 0.2;
      this.y += Math.cos(this.pulse * 0.3) * 0.2;
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      const scale = 1 + Math.sin(this.pulse) * 0.2;
      ctx.scale(scale, scale);

      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 15;

    ctx.beginPath();
      if (this.type === 0) {
        // Triangle
        ctx.moveTo(0, -this.size);
        ctx.lineTo(-this.size * 0.866, this.size * 0.5);
        ctx.lineTo(this.size * 0.866, this.size * 0.5);
        ctx.closePath();
      } else if (this.type === 1) {
        // Square
        ctx.rect(-this.size, -this.size, this.size * 2, this.size * 2);
      } else {
        // Hexagon
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const x = Math.cos(angle) * this.size;
          const y = Math.sin(angle) * this.size;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      }

      ctx.stroke();
    ctx.restore();
    }
  }

  // Initialize shapes
  for (let i = 0; i < maxShapes; i++) {
    shapes.push(new GeometricShape());
  }

  // Data streams (matrix-like falling characters)
  const streams = [];
  const maxStreams = prefersReduced ? 3 : 5;

  class DataStream {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * W;
      this.y = -50;
      this.speed = Math.random() * 2 + 1;
      this.length = Math.floor(Math.random() * 15) + 5;
      this.chars = [];
      for (let i = 0; i < this.length; i++) {
        this.chars.push({
          char: String.fromCharCode(65 + Math.floor(Math.random() * 26)),
          alpha: Math.random()
        });
      }
    }

    update() {
      this.y += this.speed;
      if (this.y > H + 50) this.reset();
    }

    draw() {
      ctx.save();
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';

      this.chars.forEach((char, i) => {
        const y = this.y - i * 15;
        if (y > 0 && y < H) {
          const alpha = char.alpha * (1 - i / this.length);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = i === 0 ? C.brand : C.muted;
          ctx.shadowColor = C.brand;
          ctx.shadowBlur = i === 0 ? 10 : 0;
          ctx.fillText(char.char, this.x, y);
        }
      });

      ctx.restore();
    }
  }

  // Initialize streams
  for (let i = 0; i < maxStreams; i++) {
    streams.push(new DataStream());
  }

  // Targeted name reveal using falling letters
  const letterTargets = [];
  const nameStreams = [];

  class NameStream {
    constructor(target){
      this.target = target; // store reference to target
      this.tx = target.x; // target x (canvas local coords)
      this.ty = target.y; // target y
      this.char = target.char;
      this.x = this.tx + (Math.random() - 0.5) * 8;
      this.y = -20 - Math.random() * 60;
      this.speed = 2 + Math.random() * 1.5;
      this.length = 8 + Math.floor(Math.random() * 6);
      this.chars = Array.from({length:this.length}, () => String.fromCharCode(65 + Math.floor(Math.random()*26)));
      this.done = false;
      console.log('DEBUG: Created NameStream for:', this.char, 'at', this.tx, this.ty);
    }

    update(){
      if(this.done) return;
      this.y += this.speed;
      if(this.y >= this.ty){
        this.done = true;
      }
    }

    draw(){
      if(this.done) return;
      ctx.save();
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      for(let i=0;i<this.length;i++){
        const yy = this.y - i*14;
        if(yy < -20 || yy > H+20) continue;
        const head = i===0;
        const alpha = Math.max(0, 1 - i/this.length);
        ctx.globalAlpha = 0.8 * alpha;
        ctx.fillStyle = head ? C.brand : C.muted;
        ctx.shadowColor = head ? C.brand : 'transparent';
        ctx.shadowBlur = head ? 10 : 0;
        const glyph = head ? this.char : this.chars[i];
        ctx.fillText(glyph, this.x, yy);
      }
      ctx.restore();
    }
  }

  function prepareNameReveal(){
    try{
      if(prefersReduced) return; // respect reduced motion
      const accent = document.querySelector('.hero .accent');
      if(!accent) {
        console.log('DEBUG: No .hero .accent element found');
        return;
      }
      const original = accent.textContent || '';
      if(!original.trim()) {
        console.log('DEBUG: No text content in accent element');
        return;
      }
      console.log('DEBUG: Preparing name reveal for:', original);

      // Wrap into words, then letters (last name kept unbroken)
      const frag = document.createDocumentFragment();
      const letterSpans = [];
      const words = original.trim().split(/\s+/);
      words.forEach((word, wi) => {
        const wordWrap = document.createElement('span');
        wordWrap.style.display = 'inline-block';
        if (wi === words.length - 1) {
          // Ensure last name does not break apart
          wordWrap.style.whiteSpace = 'nowrap';
        }
        for (const ch of word){
          const span = document.createElement('span');
          span.className = 'name-letter';
          span.textContent = ch;
          span.style.opacity = '1';
          span.style.display = 'inline-block';
          span.style.transition = 'opacity .6s ease';
          span.style.color = '#ffffff';
          letterSpans.push(span);
          wordWrap.appendChild(span);
        }
        frag.appendChild(wordWrap);
        if (wi !== words.length - 1) {
          // normal breakable space between words
          frag.appendChild(document.createTextNode(' '));
        }
      });
      accent.textContent = '';
      accent.appendChild(frag);
      console.log('DEBUG: Created', letterSpans.length, 'letter spans across', words.length, 'words');

      // Compute targets relative to canvas
      const cvRect = cv.getBoundingClientRect();
      letterTargets.length = 0;
      letterSpans.forEach((span)=>{
        const r = span.getBoundingClientRect();
        const x = r.left + r.width/2 - cvRect.left;
        const y = r.top + r.height/2 - cvRect.top;
        letterTargets.push({ x, y, char: span.textContent || '', el: span, revealed:false });
      });

      // Spawn a stream per non-space letter, staggered
      let delay = 0;
      letterTargets.forEach((t)=>{
        if(t.char.trim()==='') return; // skip spaces
        setTimeout(()=>{ nameStreams.push(new NameStream(t)); }, delay);
        delay += 60 + Math.random()*60;
      });
      console.log('DEBUG: Created', nameStreams.length, 'name streams');

      // Periodically check for arrivals and reveal letters
      const revealTimer = setInterval(()=>{
        let allDone = true;
        nameStreams.forEach((ns)=>{
          if(ns.done && !ns.target.revealed){
            ns.target.revealed = true;
            ns.target.el.style.opacity = '1';
            console.log('DEBUG: Revealed letter:', ns.char);
          }
          if(!ns.done) allDone = false;
        });
        if(allDone || document.hidden){ clearInterval(revealTimer); }
      }, 80);

      // Fallback: reveal all letters after 3 seconds if animation fails
      setTimeout(() => {
        console.log('DEBUG: Fallback timer fired');
        letterTargets.forEach(target => {
          if(!target.revealed){
            console.log('DEBUG: Revealing letter via fallback:', target.char);
            target.revealed = true;
            target.el.style.opacity = '1';
          }
        });
      }, 3000);
    }catch(e){ /* no-op */ }
  }

  // Recompute targets on resize
  function recomputeLetterTargets(){
    const accent = document.querySelector('.hero .accent');
    if(!accent) return;
    const spans = Array.from(accent.querySelectorAll('.name-letter'));
    if(!spans.length) return;
    const cvRect = cv.getBoundingClientRect();
    letterTargets.length = 0;
    spans.forEach((span)=>{
      const r = span.getBoundingClientRect();
      const x = r.left + r.width/2 - cvRect.left;
      const y = r.top + r.height/2 - cvRect.top;
      const target = { x, y, char: span.textContent || '', el: span, revealed: span.style.opacity==='1' };
      letterTargets.push(target);

      // Update existing streams with new target positions
      const matchingStream = nameStreams.find(ns => ns.target.el === span);
      if(matchingStream){
        matchingStream.target = target;
        matchingStream.tx = target.x;
        matchingStream.ty = target.y;
      }
    });
  }

  // Connection lines between nearby particles
  function drawConnections() {
    ctx.save();
    ctx.strokeStyle = C.brand;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.1;

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];
        const distance = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

        if (distance < 100) {
          const alpha = (100 - distance) / 100 * 0.3;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  function render() {
    // Clear with slight trail effect
    ctx.fillStyle = C.bg;
    ctx.globalAlpha = 0.1;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    // Draw bokeh city lights in the far background
    bokehLights.forEach(b=>{ b.update(); b.draw(ctx); });

    // Draw connections first (behind everything)
    drawConnections();

    // Update and draw particles
    particles.forEach(particle => {
      particle.update();
      particle.draw();
    });

    // Update and draw shapes
    shapes.forEach(shape => {
      shape.update();
      shape.draw();
    });

    // Update and draw data streams
    streams.forEach(stream => {
      stream.update();
      stream.draw();
    });

    // Update and draw name streams
    nameStreams.forEach(ns => {
      ns.update();
      ns.draw();
    });
  }

  let t0 = null;
  function tick(ts) {
    if (!t0) t0 = ts;
    render();
    requestAnimationFrame(tick);
  }

  // Handle window resize
  window.addEventListener('resize', () => {
    const rect2 = cv.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cv.width = rect2.width * dpr;
    cv.height = rect2.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = rect2.width; H = rect2.height;
    recomputeLetterTargets();
  });

  // Wait for DOM to be ready before preparing name reveal
  console.log('DEBUG: Setting up name reveal preparation');
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => {
      console.log('DEBUG: DOMContentLoaded fired, calling prepareNameReveal');
      setTimeout(prepareNameReveal, 100); // small delay to ensure fonts are loaded
    });
  } else {
    console.log('DEBUG: DOM already loaded, calling prepareNameReveal');
    setTimeout(prepareNameReveal, 100);
  }

  render();
  requestAnimationFrame(tick);
})();