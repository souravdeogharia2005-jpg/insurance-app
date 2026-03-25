import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { getToken } from '../utils/api';
import { Bot, User, Send, Loader, ArrowLeft, Sparkles, RefreshCw, MessageCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://aegis-backend.onrender.com';

const QUICK_QUESTIONS = [
    "Which insurance plan is best for me?",
    "How can I reduce my premium?",
    "What does my EMR score mean?",
    "Is my life cover amount enough?",
    "How does smoking affect my premium?",
    "What is a CIR (Critical Illness Rider)?",
];

const SYSTEM_CONTEXT = `You are AegisAI — a friendly, expert insurance advisor chatbot for an Indian insurance platform. You specialize in:
- Life insurance, CIR (Critical Illness Rider), accident coverage
- EMR (Extra Mortality Rating) scores and risk classes
- Premium calculation factors (BMI, habits, family history, occupation risk)
- Indian insurance market (LIC, HDFC Life, ICICI Prudential, SBI Life, Max Life)
- Giving practical, personalised advice in simple language

Rules:
- Be warm, helpful, and concise (3-5 sentences max per reply unless asked for more)
- Use ₹ for Indian Rupees
- Use emojis sparingly but naturally
- Always end with a helpful follow-up question or suggestion
- Never say you are ChatGPT or a generic AI — you are AegisAI's advisor`;

export default function AdvisorPage() {
    const navigate = useNavigate();
    const { user } = useApp();
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: 'assistant',
            content: "Hey! I'm your **AegisAI Insurance Advisor** 🛡️\n\nI can help you with:\n- Understanding your premium & risk score\n- Choosing the right coverage amount\n- Ways to reduce your insurance cost\n- Any insurance-related questions!\n\nJust type your question below or pick one from the quick options 👇",
            time: new Date(),
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    // Get user's latest proposal for context
    const proposalContext = (() => {
        const raw = sessionStorage.getItem('aegis_breakdown');
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
    })();

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function sendMessage(text) {
        const userMsg = text || input.trim();
        if (!userMsg || loading) return;
        setInput('');

        const newUserMsg = { id: Date.now(), role: 'user', content: userMsg, time: new Date() };
        setMessages(prev => [...prev, newUserMsg]);
        setLoading(true);

        try {
            // Build conversation history for Groq
            const history = messages.slice(-8).map(m => ({
                role: m.role,
                content: m.content,
            }));

            // Add proposal context if available
            const contextNote = proposalContext
                ? `\n\n[USER CONTEXT: Age ${proposalContext.user?.age}, BMI ${proposalContext.user?.bmi}, EMR ${proposalContext.calc?.emr}, Risk Class ${proposalContext.calc?.lifeClass}, Premium ₹${proposalContext.calc?.total?.toLocaleString('en-IN')}]`
                : '';

            const res = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`,
                },
                body: JSON.stringify({
                    message: userMsg + contextNote,
                    history,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Chat failed');

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'assistant',
                content: data.reply,
                time: new Date(),
            }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'assistant',
                content: '⚠️ I\'m having trouble connecting right now. Please try again in a moment.',
                time: new Date(),
            }]);
        }
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
    }

    function clearChat() {
        setMessages([{
            id: Date.now(),
            role: 'assistant',
            content: "Chat cleared! How can I help you? 🛡️",
            time: new Date(),
        }]);
    }

    // Simple markdown renderer
    function renderMarkdown(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n- /g, '\n• ')
            .replace(/\n/g, '<br/>');
    }

    return (
        <div className="w-full min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-white/10 backdrop-blur-xl" style={{ background: 'rgba(15,23,42,0.85)' }}>
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
                    <button onClick={() => navigate(-1)}
                        className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                        <ArrowLeft size={16} />
                    </button>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
                        <Bot size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <h1 className="font-black text-white text-base">AegisAI Advisor</h1>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-green-400 text-xs font-semibold">Online · Groq AI</span>
                        </div>
                    </div>
                    <button onClick={clearChat}
                        className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all" title="Clear chat">
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Context banner if proposal available */}
            {proposalContext && (
                <div className="max-w-3xl mx-auto w-full px-4 pt-3">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-blue-300 border border-blue-500/30"
                        style={{ background: 'rgba(37,99,235,0.1)' }}>
                        <Sparkles size={12} />
                        Using your proposal context (Age {proposalContext.user?.age}, EMR {proposalContext.calc?.emr}, Class {proposalContext.calc?.lifeClass}) for personalized answers
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto pb-4">
                <div className="max-w-3xl mx-auto px-4 space-y-4 py-4">

                    {/* Quick questions */}
                    {messages.length === 1 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-2 mb-4">
                            {QUICK_QUESTIONS.map((q, i) => (
                                <button key={i} onClick={() => sendMessage(q)}
                                    className="text-left text-xs font-semibold text-slate-300 p-3 rounded-xl border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all"
                                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                                    <MessageCircle size={10} className="inline mr-1.5 text-blue-400" />
                                    {q}
                                </button>
                            ))}
                        </motion.div>
                    )}

                    <AnimatePresence>
                        {messages.map(msg => (
                            <motion.div key={msg.id}
                                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                                {/* Avatar */}
                                <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${msg.role === 'assistant' ? '' : 'bg-blue-600'}`}
                                    style={msg.role === 'assistant' ? { background: 'linear-gradient(135deg, #2563EB, #7C3AED)' } : {}}>
                                    {msg.role === 'assistant'
                                        ? <Bot size={16} className="text-white" />
                                        : <User size={16} className="text-white" />}
                                </div>

                                {/* Bubble */}
                                <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'text-white rounded-tr-sm'
                                    : 'text-slate-200 rounded-tl-sm border border-white/10'}`}
                                    style={msg.role === 'user'
                                        ? { background: 'linear-gradient(135deg, #2563EB, #1d4ed8)' }
                                        : { background: 'rgba(255,255,255,0.06)' }}>
                                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                                    <div className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-blue-200 text-right' : 'text-slate-500'}`}>
                                        {msg.time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Typing indicator */}
                    {loading && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
                                <Bot size={16} className="text-white" />
                            </div>
                            <div className="px-4 py-3 rounded-2xl rounded-tl-sm border border-white/10 flex items-center gap-1"
                                style={{ background: 'rgba(255,255,255,0.06)' }}>
                                {[0, 0.2, 0.4].map((d, i) => (
                                    <motion.div key={i}
                                        animate={{ scale: [1, 1.4, 1] }}
                                        transition={{ repeat: Infinity, duration: 0.8, delay: d }}
                                        className="w-2 h-2 rounded-full bg-blue-400" />
                                ))}
                            </div>
                        </motion.div>
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>

            {/* Input Bar */}
            <div className="sticky bottom-0 border-t border-white/10 backdrop-blur-xl pb-safe"
                style={{ background: 'rgba(15,23,42,0.9)' }}>
                <div className="max-w-3xl mx-auto px-4 py-3">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1 relative">
                            <textarea
                                ref={inputRef}
                                rows={1}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                                placeholder="Ask anything about insurance..."
                                className="w-full resize-none rounded-2xl border border-white/15 text-sm text-white placeholder-slate-500 px-4 py-3 pr-12 outline-none focus:border-blue-500/50 transition-all"
                                style={{ background: 'rgba(255,255,255,0.07)', minHeight: 48, maxHeight: 120 }}
                                disabled={loading}
                            />
                        </div>
                        <button
                            onClick={() => sendMessage()}
                            disabled={loading || !input.trim()}
                            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
                            {loading ? <Loader size={18} className="text-white animate-spin" /> : <Send size={18} className="text-white" />}
                        </button>
                    </div>
                    <p className="text-center text-slate-600 text-[10px] mt-2">Powered by Groq · llama-3.3-70b · Not financial advice</p>
                </div>
            </div>
        </div>
    );
}
