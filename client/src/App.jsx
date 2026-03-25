import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ProposalPage from './pages/ProposalPage';
import DashboardPage from './pages/DashboardPage';
import ScanPage from './pages/ScanPage';
import AdminPage from './pages/AdminPage';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './App.css';

gsap.registerPlugin(ScrollTrigger);

// ── WebGL Particle Background ─────────────────────────────────────────────────
function WebGLBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const vert = `attribute vec2 a_pos;attribute float a_size;void main(){gl_Position=vec4(a_pos,0.0,1.0);gl_PointSize=a_size;}`;
    const frag = `precision mediump float;uniform vec4 u_color;void main(){float d=distance(gl_PointCoord,vec2(0.5));if(d>0.5)discard;gl_FragColor=u_color*(1.0-d*2.0);}`;

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s); return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog); gl.useProgram(prog);

    const N = 55;
    const particles = Array.from({ length: N }, () => ({
      x: Math.random() * 2 - 1, y: Math.random() * 2 - 1,
      vx: (Math.random() - 0.5) * 0.0007, vy: (Math.random() - 0.5) * 0.0007,
      s: Math.random() * 4 + 2,
    }));

    const posLoc  = gl.getAttribLocation(prog, 'a_pos');
    const sizeLoc = gl.getAttribLocation(prog, 'a_size');
    const colLoc  = gl.getUniformLocation(prog, 'u_color');
    const posBuf  = gl.createBuffer();
    const sizeBuf = gl.createBuffer();

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let raf;
    const draw = () => {
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x > 1 || p.x < -1) p.vx *= -1;
        if (p.y > 1 || p.y < -1) p.vy *= -1;
      });
      const pos   = new Float32Array(particles.flatMap(p => [p.x, p.y]));
      const sizes = new Float32Array(particles.map(p => p.s));

      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuf);
      gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(sizeLoc);
      gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 0, 0);

      gl.uniform4f(colLoc, 0.145, 0.388, 0.922, 0.1);
      gl.drawArrays(gl.POINTS, 0, N);
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} id="webgl-bg" aria-hidden="true" />;
}

// ── GSAP ScrollTrigger — reveals .reveal elements sitewide ───────────────────
function GSAPScrollReveal() {
  const location = useLocation();
  useEffect(() => {
    const timer = setTimeout(() => {
      document.querySelectorAll('.reveal').forEach(el => {
        ScrollTrigger.create({
          trigger: el, start: 'top 88%',
          onEnter: () => el.classList.add('is-visible'),
          once: true,
        });
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [location.pathname]);
  return null;
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex flex-col items-center justify-center py-20"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex flex-col items-center justify-center py-20"><div className="spinner" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, filter: 'blur(2px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.98, filter: 'blur(2px)' }}
      transition={{ duration: 0.3, ease: 'easeOut' }}>
      {children}
    </motion.div>
  );
}

function AppLayout() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <>
      <WebGLBackground />
      {!isLoginPage && <Navbar />}
      <GSAPScrollReveal />
      <main className={isLoginPage ? '' : 'main-content'} style={{ position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/"          element={<PageTransition><HomePage /></PageTransition>} />
            <Route path="/login"     element={<AuthGuard><PageTransition><LoginPage /></PageTransition></AuthGuard>} />
            <Route path="/dashboard" element={<ProtectedRoute><PageTransition><DashboardPage /></PageTransition></ProtectedRoute>} />
            <Route path="/proposal"  element={<ProtectedRoute><PageTransition><ProposalPage /></PageTransition></ProtectedRoute>} />
            <Route path="/scan"      element={<ProtectedRoute><PageTransition><ScanPage /></PageTransition></ProtectedRoute>} />
            <Route path="/admin"     element={<ProtectedRoute><PageTransition><AdminPage /></PageTransition></ProtectedRoute>} />
            <Route path="*"          element={<Navigate to="/" />} />
          </Routes>
        </AnimatePresence>
      </main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <AppLayout />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
