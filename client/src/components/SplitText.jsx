import { useRef, useEffect, useState } from 'react';

/**
 * SplitText - Lightweight GSAP-free animated text split
 * Letters animate in one by one using CSS + framer-like approach
 * No external GSAP license required
 */
const SplitText = ({
  text = '',
  className = '',
  delay = 50,
  duration = 0.6,
  ease = 'cubic-bezier(0.16, 1, 0.3, 1)',
  from = { opacity: 0, y: 30 },
  to = { opacity: 1, y: 0 },
  splitType = 'chars',
  textAlign = 'center',
  tag = 'span',
  onLetterAnimationComplete,
}) => {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  // Intersection observer to trigger animation when in view
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Build units (chars or words)
  const units = splitType === 'words'
    ? text.split(' ').map((w, i) => ({ text: w + (i < text.split(' ').length - 1 ? '\u00A0' : ''), key: i }))
    : text.split('').map((c, i) => ({ text: c === ' ' ? '\u00A0' : c, key: i }));

  const Tag = tag;

  return (
    <Tag
      ref={ref}
      className={`split-parent ${className}`}
      style={{ textAlign, display: 'inline-block', overflow: 'visible' }}
    >
      {units.map(({ text: char, key }) => (
        <span
          key={key}
          style={{
            display: 'inline-block',
            transition: `opacity ${duration}s ${ease}, transform ${duration}s ${ease}`,
            transitionDelay: visible ? `${key * delay}ms` : '0ms',
            opacity: visible ? to.opacity ?? 1 : from.opacity ?? 0,
            transform: visible
              ? `translateY(${to.y ?? 0}px)`
              : `translateY(${from.y ?? 30}px)`,
            willChange: 'transform, opacity',
          }}
          onTransitionEnd={key === units.length - 1 && visible ? onLetterAnimationComplete : undefined}
        >
          {char}
        </span>
      ))}
    </Tag>
  );
};

export default SplitText;
