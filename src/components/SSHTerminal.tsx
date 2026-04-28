'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  Send,
  Power,
  Server,
  User,
  Lock,
  X,
  Loader2,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';

interface CommandEntry {
  command: string;
  stdout: string;
  stderr: string;
  code: number | null;
  timestamp: string;
}

export default function SSHTerminal() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [host, setHost] = useState('178.238.231.138');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<CommandEntry[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const handleConnect = async () => {
    if (!host || !username || !password) {
      toast.error('Preencha host, usuário e senha');
      return;
    }

    setIsConnecting(true);
    try {
      const { data: { session } } = await import('@/lib/supabase/client').then(m => {
        const client = m.createClient();
        return client.auth.getSession();
      });
      if (!session?.access_token) throw new Error('Sessão expirada');

      // Test connection with a simple command
      const res = await fetch('/api/ssh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          host,
          port: parseInt(port) || 22,
          username,
          password,
          command: 'echo "Conexão estabelecida com sucesso!"',
        }),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      setIsConnected(true);
      toast.success('Conectado ao VPS!');
      setHistory(prev => [
        ...prev,
        {
          command: '# Conexão estabelecida',
          stdout: data.stdout || 'Conexão OK',
          stderr: '',
          code: 0,
          timestamp: new Date().toLocaleTimeString('pt-BR'),
        },
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao conectar');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleExecute = async () => {
    if (!command.trim()) return;
    if (!isConnected) {
      toast.error('Conecte-se primeiro ao VPS');
      return;
    }

    const cmd = command.trim();
    setCommand('');

    try {
      const { data: { session } } = await import('@/lib/supabase/client').then(m => {
        const client = m.createClient();
        return client.auth.getSession();
      });
      if (!session?.access_token) throw new Error('Sessão expirada');

      const res = await fetch('/api/ssh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          host,
          port: parseInt(port) || 22,
          username,
          password,
          command: cmd,
        }),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      setHistory(prev => [
        ...prev,
        {
          command: cmd,
          stdout: data.stdout || '',
          stderr: data.stderr || '',
          code: data.code,
          timestamp: new Date().toLocaleTimeString('pt-BR'),
        },
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao executar comando');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (!isConnected) {
        handleConnect();
      } else {
        handleExecute();
      }
    }
  };

  const handleCopyOutput = (entry: CommandEntry) => {
    const text = `$ ${entry.command}\n${entry.stdout}${entry.stderr ? `\n[stderr]: ${entry.stderr}` : ''}`;
    navigator.clipboard.writeText(text);
    toast.success('Output copiado!');
  };

  const handleClear = () => {
    setHistory([]);
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 md:p-8 border-b-2 border-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Terminal size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">
                Terminal SSH
              </h2>
              <p className="text-slate-500 font-bold">
                Acesse o VPS remotamente pelo navegador.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
          >
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-6 md:p-8 space-y-6">
          {/* Connection Form */}
          {!isConnected && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Host
                </label>
                <div className="relative group">
                  <Server className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    type="text"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-blue-600 transition-colors"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="IP ou hostname"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Porta
                </label>
                <div className="relative group">
                  <Server className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    type="number"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-blue-600 transition-colors"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="22"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Usuário
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    type="text"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-blue-600 transition-colors"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="root"
                    onKeyDown={handleKeyDown}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Senha
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    type="password"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-blue-600 transition-colors"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    onKeyDown={handleKeyDown}
                  />
                </div>
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="w-full py-3.5 bg-blue-600 text-white font-black rounded-xl shadow-lg hover:bg-blue-700 hover:scale-[1.01] active:scale-[0.98] transition-all text-sm uppercase tracking-widest disabled:opacity-70 flex justify-center items-center gap-3"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <Power size={18} />
                      Conectar ao VPS
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Terminal Output */}
          {isConnected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-black text-green-600">
                    Conectado a {host}:{port}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClear}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-xs hover:bg-slate-200 transition-all"
                  >
                    <Trash2 size={14} />
                    Limpar
                  </button>
                  <button
                    onClick={() => {
                      setIsConnected(false);
                      setHistory([]);
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-xl font-black text-xs hover:bg-red-100 transition-all"
                  >
                    <X size={14} />
                    Desconectar
                  </button>
                </div>
              </div>

              <div
                ref={terminalRef}
                className="bg-slate-900 rounded-2xl p-4 md:p-6 font-mono text-sm h-80 overflow-y-auto custom-scrollbar"
              >
                {history.length === 0 ? (
                  <div className="text-slate-500 italic">
                    Terminal pronto. Digite um comando abaixo...
                  </div>
                ) : (
                  history.map((entry, i) => (
                    <div key={i} className="mb-4 last:mb-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-green-400">{entry.timestamp}</span>
                          <span className="text-blue-400">$</span>
                          <span className="text-white">{entry.command}</span>
                        </div>
                        <button
                          onClick={() => handleCopyOutput(entry)}
                          className="text-slate-500 hover:text-white transition-colors"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                      {entry.stdout && (
                        <pre className="text-slate-300 whitespace-pre-wrap pl-6">{entry.stdout}</pre>
                      )}
                      {entry.stderr && (
                        <pre className="text-red-400 whitespace-pre-wrap pl-6">{entry.stderr}</pre>
                      )}
                      {entry.code !== 0 && entry.code !== null && (
                        <div className="text-red-500 pl-6 text-xs">
                          Exit code: {entry.code}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Command Input */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-900 rounded-xl flex-1">
                  <span className="text-green-400 font-mono text-sm">$</span>
                  <input
                    ref={inputRef}
                    type="text"
                    className="flex-1 bg-transparent text-white font-mono text-sm outline-none placeholder-slate-500"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite um comando..."
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleExecute}
                  disabled={!command.trim()}
                  className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
