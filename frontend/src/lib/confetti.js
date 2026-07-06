// Simple canvas-based confetti particle physics system
export function triggerConfetti() {
  let canvas = document.getElementById('confetti-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);
  }

  const ctx = canvas.getContext('2d');
  let animationFrameId;

  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#3B82F6'];
  const particles = [];
  const particleCount = 120;

  // Initialize particles bursting up from bottom-center
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 100,
      y: canvas.height + 20,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 18 - 12, // Shoot upwards
      r: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      opacity: 1
    });
  }

  function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let activeParticles = 0;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.45; // Gravity acceleration
      p.vx *= 0.98;  // Side friction
      p.rotation += p.rotationSpeed;

      if (p.vy > 0) {
        p.opacity -= 0.015; // Fade out as falling
      }

      if (p.opacity > 0 && p.y < canvas.height + 20 && p.x > -20 && p.x < canvas.width + 20) {
        activeParticles++;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        
        // Draw confetti rectangular shape
        ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        ctx.restore();
      }
    });

    if (activeParticles > 0) {
      animationFrameId = requestAnimationFrame(update);
    } else {
      window.removeEventListener('resize', resizeCanvas);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  }

  update();
}
