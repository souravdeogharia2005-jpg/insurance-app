import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import './PillNav.css';

const PillNav = ({ items, className = '', ease = 'power3.easeOut', baseColor = '#0F172A', pillColor = '#ffffff', hoveredPillTextColor = '#ffffff', pillTextColor, onMobileMenuClick, initialLoadAnimation = true }) => {
    const resolvedPillTextColor = pillTextColor ?? baseColor;
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const circleRefs = useRef([]);
    const tlRefs = useRef([]);
    const activeTweenRefs = useRef([]);
    const hamburgerRef = useRef(null);
    const mobileMenuRef = useRef(null);
    const navItemsRef = useRef(null);
    const logoRef = useRef(null);
    const location = useLocation();

    useEffect(() => {
        const layout = () => {
            circleRefs.current.forEach((circle, index) => {
                if (!circle?.parentElement) return;
                const pill = circle.parentElement;
                const rect = pill.getBoundingClientRect();
                const { width: w, height: h } = rect;
                const R = ((w * w) / 4 + h * h) / (2 * h);
                const D = Math.ceil(2 * R) + 2;
                const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
                const originY = D - delta;
                circle.style.width = `${D}px`;
                circle.style.height = `${D}px`;
                circle.style.bottom = `-${delta}px`;
                gsap.set(circle, { xPercent: -50, scale: 0, transformOrigin: `50% ${originY}px` });
                const label = pill.querySelector('.pill-label');
                const white = pill.querySelector('.pill-label-hover');
                if (label) gsap.set(label, { y: 0 });
                if (white) gsap.set(white, { y: h + 12, opacity: 0 });
                tlRefs.current[index]?.kill();
                const tl = gsap.timeline({ paused: true });
                tl.to(circle, { scale: 1.2, xPercent: -50, duration: 2, ease, overwrite: 'auto' }, 0);
                if (label) tl.to(label, { y: -(h + 8), duration: 2, ease, overwrite: 'auto' }, 0);
                if (white) { gsap.set(white, { y: Math.ceil(h + 100), opacity: 0 }); tl.to(white, { y: 0, opacity: 1, duration: 2, ease, overwrite: 'auto' }, 0); }
                tlRefs.current[index] = tl;
            });
        };
        layout();
        window.addEventListener('resize', layout);
        if (document.fonts?.ready) document.fonts.ready.then(layout).catch(() => { });
        const menu = mobileMenuRef.current;
        if (menu) gsap.set(menu, { visibility: 'hidden', opacity: 0, scaleY: 1 });
        if (initialLoadAnimation) {
            const logo = logoRef.current;
            const nav = navItemsRef.current;
            if (logo) { gsap.set(logo, { scale: 0 }); gsap.to(logo, { scale: 1, duration: 0.6, ease }); }
            if (nav) { gsap.set(nav, { width: 0, overflow: 'hidden' }); gsap.to(nav, { width: 'auto', duration: 0.6, ease }); }
        }
        return () => window.removeEventListener('resize', layout);
    }, [items, ease, initialLoadAnimation]);

    const handleEnter = i => { const tl = tlRefs.current[i]; if (!tl) return; activeTweenRefs.current[i]?.kill(); activeTweenRefs.current[i] = tl.tweenTo(tl.duration(), { duration: 0.3, ease, overwrite: 'auto' }); };
    const handleLeave = i => { const tl = tlRefs.current[i]; if (!tl) return; activeTweenRefs.current[i]?.kill(); activeTweenRefs.current[i] = tl.tweenTo(0, { duration: 0.2, ease, overwrite: 'auto' }); };

    const toggleMobileMenu = () => {
        const newState = !isMobileMenuOpen;
        setIsMobileMenuOpen(newState);
        const hamburger = hamburgerRef.current;
        const menu = mobileMenuRef.current;
        if (hamburger) {
            const lines = hamburger.querySelectorAll('.hamburger-line');
            if (newState) { gsap.to(lines[0], { rotation: 45, y: 3, duration: 0.3, ease }); gsap.to(lines[1], { rotation: -45, y: -3, duration: 0.3, ease }); }
            else { gsap.to(lines[0], { rotation: 0, y: 0, duration: 0.3, ease }); gsap.to(lines[1], { rotation: 0, y: 0, duration: 0.3, ease }); }
        }
        if (menu) {
            if (newState) { gsap.set(menu, { visibility: 'visible' }); gsap.fromTo(menu, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease, transformOrigin: 'top center' }); }
            else { gsap.to(menu, { opacity: 0, y: 10, duration: 0.2, ease, transformOrigin: 'top center', onComplete: () => gsap.set(menu, { visibility: 'hidden' }) }); }
        }
        onMobileMenuClick?.();
    };

    const cssVars = { '--base': baseColor, '--pill-bg': pillColor, '--hover-text': hoveredPillTextColor, '--pill-text': resolvedPillTextColor };

    return (
        <div className="pill-nav-container">
            <nav className={`pill-nav ${className}`} aria-label="Primary" style={cssVars}>
                <Link className="pill-logo" to="/" aria-label="Home" ref={logoRef}>
                    <span className="material-symbols-outlined" style={{ color: pillColor, fontSize: '22px' }}>shield_with_heart</span>
                </Link>
                <div className="pill-nav-items desktop-only" ref={navItemsRef}>
                    <ul className="pill-list" role="menubar">
                        {items.map((item, i) => (
                            <li key={item.href} role="none">
                                <Link role="menuitem" to={item.href} className={`pill${location.pathname === item.href ? ' is-active' : ''}`} onMouseEnter={() => handleEnter(i)} onMouseLeave={() => handleLeave(i)}>
                                    <span className="hover-circle" aria-hidden="true" ref={el => { circleRefs.current[i] = el; }} />
                                    <span className="label-stack">
                                        <span className="pill-label">{item.label}</span>
                                        <span className="pill-label-hover" aria-hidden="true">{item.label}</span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
                <button className="mobile-menu-button mobile-only" onClick={toggleMobileMenu} aria-label="Toggle menu" ref={hamburgerRef}>
                    <span className="hamburger-line" /><span className="hamburger-line" />
                </button>
            </nav>
            <div className="mobile-menu-popover mobile-only" ref={mobileMenuRef} style={cssVars}>
                <ul className="mobile-menu-list">
                    {items.map(item => (
                        <li key={item.href}>
                            <Link to={item.href} className={`mobile-menu-link${location.pathname === item.href ? ' is-active' : ''}`} onClick={() => { setIsMobileMenuOpen(false); toggleMobileMenu(); }}>
                                {item.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default PillNav;
