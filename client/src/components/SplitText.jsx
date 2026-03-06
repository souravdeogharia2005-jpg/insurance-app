import { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';

const SplitText = ({ text, className = '', delay = 50, duration = 0.8, ease = 'power3.out', splitType = 'chars', from = { opacity: 0, y: 40 }, to = { opacity: 1, y: 0 }, textAlign = 'center', tag = 'p', onLetterAnimationComplete }) => {
    const containerRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } }, { threshold: 0.1 });
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible || !containerRef.current) return;
        const el = containerRef.current;
        const elements = el.querySelectorAll('.split-char');
        gsap.fromTo(elements, { ...from }, { ...to, duration, ease, stagger: delay / 1000, onComplete: () => onLetterAnimationComplete?.() });
    }, [isVisible]);

    const Tag = tag || 'p';
    const chars = text.split('').map((char, i) => (
        <span key={i} className="split-char" style={{ display: 'inline-block', opacity: 0, willChange: 'transform, opacity' }}>
            {char === ' ' ? '\u00A0' : char}
        </span>
    ));

    return <Tag ref={containerRef} className={`split-parent ${className}`} style={{ textAlign, overflow: 'hidden', display: 'inline-block', whiteSpace: 'normal', wordWrap: 'break-word' }}>{chars}</Tag>;
};

export default SplitText;
