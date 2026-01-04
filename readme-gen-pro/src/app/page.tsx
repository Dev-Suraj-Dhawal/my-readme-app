"use client";

import React, { useState } from 'react';
import { ArrowRight, Github, Wand2, Terminal, Loader2, CheckCircle2, Copy, Sparkles, LogOut } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!session) {
      setError('Please sign in with GitHub first');
      return;
    }

    // Debug logging - Check session data
    console.log('🔍 Session Debug:', {
      hasSession: !!session,
      user: session.user?.name,
      email: session.user?.email,
      hasAccessToken: !!(session as any).accessToken,
      sessionKeys: Object.keys(session),
      fullSession: session
    });

    if (!repoUrl) return setError('Please enter a GitHub URL');
    
    setLoading(true);
    setError('');
    setResult('');

    try {
      console.log('📤 Sending request to /api/generate');
      console.log('📦 Request payload:', { repoUrl });

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error response:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Success! Data received');
      console.log('📊 Response metadata:', data.meta);
      
      setResult(data.markdown);
    } catch (err: any) {
      console.error('💥 Generation error:', err);
      setError(err.message || 'Something went wrong. Check your API keys.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    console.log('📋 Copied to clipboard');
  };

  // Debug session changes
  React.useEffect(() => {
    console.log('🔄 Session status changed:', status);
    if (session) {
      console.log('✅ User signed in:', session.user?.name);
      console.log('🔑 Access token present:', !!(session as any).accessToken);
    }
  }, [session, status]);

  return (
    <main className="min-h-screen bg-[#030712] text-slate-200 selection:bg-blue-500/30">
      {/* Glow Effect */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[500px] bg-blue-600/10 blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span>GitDocs<span className="text-blue-500">Pro</span></span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <a href="#" className="hover:text-white transition-colors">Features</a>
          <a href="#" className="hover:text-white transition-colors">Enterprise</a>
          <a href="#" className="hover:text-white transition-colors">API docs</a>
        </div>
        
        {/* Auth Button */}
        {status === "loading" ? (
          <div className="bg-slate-800 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </div>
        ) : session ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full">
              <img 
                src={session.user?.image || ''} 
                alt="Avatar" 
                className="w-6 h-6 rounded-full"
              />
              <span className="text-sm font-medium">{session.user?.name}</span>
            </div>
            <button 
              onClick={() => {
                console.log('🚪 Signing out...');
                signOut();
              }}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        ) : (
          <button 
            onClick={() => {
              console.log('🔐 Initiating GitHub sign in...');
              signIn('github');
            }}
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2"
          >
            <Github className="w-4 h-4" />
            Sign In with GitHub
          </button>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-16 px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-8 animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          {session ? '✨ Unlimited README Generation' : 'Sign In to Get Started'}
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
          The README your <br /> code deserves.
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          {session 
            ? 'Paste a link. Get a professional, verified, and visually stunning documentation suite. 101% accurate installation steps guaranteed.'
            : 'Sign in with GitHub to generate unlimited professional READMEs using your own repositories.'
          }
        </p>

        {/* Input Area */}
        <div className="max-w-2xl mx-auto group">
          <div className={`flex flex-col md:flex-row gap-3 p-2 rounded-2xl bg-slate-900/50 border ${error ? 'border-red-500/50' : 'border-slate-800'} backdrop-blur-xl transition-all group-hover:border-slate-700 shadow-2xl`}>
            <div className="flex-1 flex items-center px-4 py-3 gap-3">
              <Github className="w-5 h-5 text-slate-500" />
              <input 
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder={session ? "https://github.com/username/repo" : "Sign in to start generating"}
                disabled={!session}
                className="bg-transparent w-full outline-none text-white placeholder:text-slate-600 disabled:opacity-50"
              />
            </div>
            <button 
              onClick={handleGenerate}
              disabled={loading || !session}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
              {loading ? 'Analyzing...' : 'Generate'}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-3 flex items-center justify-center gap-1">⚠ {error}</p>}
        </div>
      </section>

      {/* Result Section */}
      {result && (
        <section className="relative z-10 max-w-6xl mx-auto px-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <span className="text-xs font-mono text-slate-500">README.md — Generated by AI</span>
              </div>
              <button 
                onClick={copyToClipboard}
                className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-slate-800 px-3 py-1.5 rounded-lg"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Markdown
              </button>
            </div>
            <div className="p-8 md:p-12 prose prose-invert prose-blue max-w-none overflow-x-auto">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </div>
        </section>
      )}

      {/* Features Grid */}
      {!result && (
        <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Terminal className="w-6 h-6 text-blue-500" />}
            title="Command Verification"
            desc="Our agent simulates 'npm install' to ensure your documentation actually works for new users."
          />
          <FeatureCard 
            icon={<CheckCircle2 className="w-6 h-6 text-emerald-500" />}
            title="Industry Standards"
            desc="Generates badges, license info, and contribution guides used by top-tier open source projects."
          />
          <FeatureCard 
            icon={<ArrowRight className="w-6 h-6 text-purple-500" />}
            title="Visual Flowcharts"
            desc="Translates your folder structure into Mermaid.js diagrams for instant architectural clarity."
          />
        </section>
      )}
    </main>
  );
}

function FeatureCard({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="group p-8 rounded-3xl border border-slate-800 bg-slate-900/20 hover:bg-slate-900/40 hover:border-slate-700 transition-all duration-300">
      <div className="mb-6 p-3 w-fit rounded-2xl bg-slate-800 group-hover:scale-110 transition-transform">{icon}</div>
      <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
      <p className="text-slate-400 leading-relaxed text-sm">{desc}</p>
    </div>
  )
}
