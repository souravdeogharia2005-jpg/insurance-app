import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import './RotatingText.css';

const RotatingText = ({ words = [], interval = 3000, className = '' }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const textRef = useRef(null);

    useEffect(() => {
        const timer = setInterval(() => {
            if (textRef.current) {
                gsap.to(textRef.current, {
                    y: -20, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: () => {
                        setCurrentIndex(prev => (prev + 1) % words.length);
                        gsap.set(textRef.current, { y: 20 });
                        gsap.to(textRef.current, { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' });
                    }
                });
            }
        }, interval);
        return () => clearInterval(timer);
    }, [words, interval]);

    return <span ref={textRef} className={`rotating-text ${className}`}>{words[currentIndex]}</span>;
};

export default RotatingText;
