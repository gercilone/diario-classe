import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedDatabase } from './db';
import HeaderFilters from './components/HeaderFilters';
import TabAGrades from './components/TabA_Grades';
import TabBVistos from './components/TabB_Vistos';
import TabCGamification from './components/TabC_Gamification';
import TabDAttendance from './components/TabD_Attendance';
import TabEReports from './components/TabE_Reports';
import TabFSettings from './components/TabF_Settings';
import { FileText, CheckSquare, Trophy, Calendar, FileBarChart2, Settings, Sparkles, Lock, User, Eye, EyeOff, LogOut, Key, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type TabKey = 'attendance' | 'grades' | 'vistos' | 'gamification' | 'reports' | 'settings';

export default function App() {
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | undefined>(undefined);
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>(undefined);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined);
  const [selectedBimonthly, setSelectedBimonthly] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<TabKey>('attendance');

  // TEACHER PROFILE & AUTHENTICATION STATES
  const [teacherName, setTeacherName] = useState<string>(() => localStorage.getItem('portal_teacher_name') || '');
  const [isAuthEnabled, setIsAuthEnabled] = useState<boolean>(() => localStorage.getItem('portal_auth_enabled') === 'true');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const enabled = localStorage.getItem('portal_auth_enabled') === 'true';
    if (!enabled) return true;
    return (
      sessionStorage.getItem('portal_is_authenticated') === 'true' ||
      localStorage.getItem('portal_is_authenticated_persistent') === 'true'
    );
  });

  // LOGIN FORM STATES
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  // PASSWORD RECOVERY STATES
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'menu' | 'hint' | 'question' | 'reset_confirm' | 'success'>('menu');
  const [recoveryAnswerInput, setRecoveryAnswerInput] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryError, setRecoveryError] = useState('');

  const handleSecuritySaved = () => {
    const enabled = localStorage.getItem('portal_auth_enabled') === 'true';
    setIsAuthEnabled(enabled);
    if (!enabled) {
      setIsAuthenticated(true);
    } else {
      const currentlyAuthed = (
        sessionStorage.getItem('portal_is_authenticated') === 'true' ||
        localStorage.getItem('portal_is_authenticated_persistent') === 'true'
      );
      setIsAuthenticated(currentlyAuthed);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('portal_is_authenticated');
    localStorage.removeItem('portal_is_authenticated_persistent');
    setIsAuthenticated(false);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const storedUser = localStorage.getItem('portal_username') || 'professor';
    const storedPass = localStorage.getItem('portal_password') || '123456';

    if (loginUser.trim() === storedUser && loginPass === storedPass) {
      if (rememberMe) {
        localStorage.setItem('portal_is_authenticated_persistent', 'true');
      } else {
        sessionStorage.setItem('portal_is_authenticated', 'true');
      }
      setLoginError('');
      setIsAuthenticated(true);
    } else {
      setLoginError('Usuário ou senha incorretos. Tente novamente.');
    }
  };

  const handleOpenRecovery = () => {
    setIsRecoveryOpen(true);
    setRecoveryStep('menu');
    setRecoveryAnswerInput('');
    setRecoveryMessage('');
    setRecoveryError('');
  };

  const handleCloseRecovery = () => {
    setIsRecoveryOpen(false);
  };

  const handleCheckHint = () => {
    const hint = localStorage.getItem('portal_password_hint');
    if (hint && hint.trim()) {
      setRecoveryMessage(`Sua dica de senha cadastrada é:\n"${hint.trim()}"`);
    } else {
      setRecoveryMessage(
        "Nenhuma dica de senha personalizada foi cadastrada no seu perfil. " +
        "Se você ainda não alterou as configurações padrão, tente Usuário: 'professor' e Senha: '123456'."
      );
    }
    setRecoveryStep('hint');
  };

  const handleOpenQuestion = () => {
    const question = localStorage.getItem('portal_security_question');
    const answer = localStorage.getItem('portal_security_answer');
    if (question && answer && question.trim() && answer.trim()) {
      setRecoveryStep('question');
      setRecoveryError('');
    } else {
      setRecoveryError("Você ainda não configurou uma pergunta de segurança nas configurações do seu Perfil.");
      setRecoveryStep('question');
    }
  };

  const handleVerifyQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const storedAnswer = localStorage.getItem('portal_security_answer') || '';
    const storedUser = localStorage.getItem('portal_username') || 'professor';
    const storedPass = localStorage.getItem('portal_password') || '123456';

    if (
      storedAnswer.trim() &&
      recoveryAnswerInput.trim().toLowerCase() === storedAnswer.trim().toLowerCase()
    ) {
      setRecoveryMessage(
        `Resposta correta! Suas credenciais são:\n\nUsuário: ${storedUser}\nSenha: ${storedPass}`
      );
      setRecoveryStep('success');
      setRecoveryError('');
    } else {
      setRecoveryError('Resposta de segurança incorreta. Tente novamente.');
    }
  };

  const handleConfirmEmergencyReset = () => {
    localStorage.setItem('portal_username', 'professor');
    localStorage.setItem('portal_password', '123456');
    localStorage.setItem('portal_auth_enabled', 'false');
    sessionStorage.removeItem('portal_is_authenticated');
    localStorage.removeItem('portal_is_authenticated_persistent');
    
    // Sync React states
    setIsAuthEnabled(false);
    setIsAuthenticated(true);
    setIsRecoveryOpen(false);
    setLoginError('');
  };

  // Load basic entities for automatic defaults
  const schools = useLiveQuery(() => db.schools.toArray()) || [];
  const classes = useLiveQuery(() => db.classes.toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];

  // Seed database silently on mount if empty
  useEffect(() => {
    const initDb = async () => {
      await seedDatabase();
    };
    initDb();
  }, []);

  // Proactive Selection Sync:
  // If no school is selected, pick the first one as default when loaded
  useEffect(() => {
    if (selectedSchoolId === undefined && schools.length > 0) {
      setSelectedSchoolId(schools[0].id);
    }
  }, [schools, selectedSchoolId]);

  // If school is selected but no class is selected, pick the first class for that school
  useEffect(() => {
    if (selectedSchoolId) {
      const schoolClasses = classes.filter((c) => c.schoolId === selectedSchoolId);
      if (selectedClassId === undefined && schoolClasses.length > 0) {
        setSelectedClassId(schoolClasses[0].id);
      }
    }
  }, [classes, selectedSchoolId, selectedClassId]);

  // If no subject is selected, pick the first one as default when loaded
  useEffect(() => {
    if (selectedSubjectId === undefined && subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  // Render core tab content based on key
  const renderTabContent = () => {
    switch (activeTab) {
      case 'grades':
        return (
          <TabAGrades
            schoolId={selectedSchoolId}
            classId={selectedClassId}
            subjectId={selectedSubjectId}
            bimonthly={selectedBimonthly}
          />
        );
      case 'vistos':
        return (
          <TabBVistos
            schoolId={selectedSchoolId}
            classId={selectedClassId}
            subjectId={selectedSubjectId}
            bimonthly={selectedBimonthly}
          />
        );
      case 'gamification':
        return (
          <TabCGamification
            schoolId={selectedSchoolId}
            classId={selectedClassId}
            subjectId={selectedSubjectId}
            bimonthly={selectedBimonthly}
          />
        );
      case 'attendance':
        return (
          <TabDAttendance
            schoolId={selectedSchoolId}
            classId={selectedClassId}
            subjectId={selectedSubjectId}
            bimonthly={selectedBimonthly}
            onSelectSchool={setSelectedSchoolId}
            onSelectClass={setSelectedClassId}
            onSelectSubject={setSelectedSubjectId}
          />
        );
      case 'reports':
        return (
          <TabEReports
            schoolId={selectedSchoolId}
            classId={selectedClassId}
            subjectId={selectedSubjectId}
            bimonthly={selectedBimonthly}
          />
        );
      case 'settings':
        return <TabFSettings teacherName={teacherName} setTeacherName={setTeacherName} onSecuritySaved={handleSecuritySaved} />;
      default:
        return null;
    }
  };

  const tabsInfo = [
    { key: 'attendance', label: 'Frequência & Chamada', icon: Calendar, color: 'text-emerald-400' },
    { key: 'grades', label: 'Notas', icon: FileText, color: 'text-blue-400' },
    { key: 'vistos', label: 'Vistos', icon: CheckSquare, color: 'text-teal-400' },
    { key: 'gamification', label: 'Comportamento', icon: Trophy, color: 'text-yellow-400' },
    { key: 'reports', label: 'Relatórios', icon: FileBarChart2, color: 'text-sky-400' },
    { key: 'settings', label: 'Configurações', icon: Settings, color: 'text-slate-400' },
  ];

  if (isAuthEnabled && !isAuthenticated) {
    return (
      <div id="portal-lockscreen-root" className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center font-sans antialiased relative overflow-hidden px-4">
        {/* Subtle decorative background lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[250px] h-[250px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-300">
          {/* Logo / Title Area */}
          <div className="text-center mb-8">
            <div className="inline-flex w-16 h-16 bg-blue-600 rounded-2xl items-center justify-center shadow-2xl shadow-blue-500/30 mb-4 ring-1 ring-blue-400/20">
              <Lock className="w-8 h-8 text-white animate-pulse" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Portal do Professor</h1>
            <p className="text-sm text-zinc-500 mt-1 font-medium">Insira suas credenciais para gerenciar seus diários</p>
          </div>

          {/* Conditional: Recovery Card or Login Card */}
          {isRecoveryOpen ? (
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl shadow-black/50 space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                <Key className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-white font-bold text-sm">Recuperação de Acesso</h3>
                  <p className="text-[11px] text-zinc-500">Recupere ou redefina sua senha de acesso local</p>
                </div>
              </div>

              {recoveryStep === 'menu' && (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Como o aplicativo funciona de forma 100% offline e privada neste navegador, escolha uma das opções de recuperação local abaixo:
                  </p>

                  <button
                    type="button"
                    onClick={handleCheckHint}
                    className="w-full p-3 bg-zinc-950/50 hover:bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-left rounded-xl transition flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-bold text-zinc-300 block">1. Ver Dica de Senha</span>
                      <span className="text-[10px] text-zinc-500 block">Mostrar a dica cadastrada no seu perfil</span>
                    </div>
                    <span className="text-zinc-500 group-hover:text-zinc-300 text-lg">→</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenQuestion}
                    className="w-full p-3 bg-zinc-950/50 hover:bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-left rounded-xl transition flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-bold text-zinc-300 block">2. Responder Pergunta de Segurança</span>
                      <span className="text-[10px] text-zinc-500 block">Use a pergunta configurada previamente</span>
                    </div>
                    <span className="text-zinc-500 group-hover:text-zinc-300 text-lg">→</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecoveryStep('reset_confirm')}
                    className="w-full p-3 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 text-left rounded-xl transition flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-bold text-rose-400 block">3. Redefinição de Emergência</span>
                      <span className="text-[10px] text-rose-500/80 block">Caso tenha esquecido tudo, desative a senha</span>
                    </div>
                    <span className="text-rose-500 group-hover:text-rose-400 text-lg">→</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseRecovery}
                    className="w-full py-2.5 mt-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition text-center cursor-pointer"
                  >
                    Voltar para o Login
                  </button>
                </div>
              )}

              {recoveryStep === 'hint' && (
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800 text-zinc-300 text-xs leading-relaxed space-y-2">
                    <span className="text-blue-400 font-bold block">Dica de Senha:</span>
                    <p className="whitespace-pre-line leading-relaxed">{recoveryMessage}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRecoveryStep('menu')}
                      className="flex-1 py-2.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      Outras Opções
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseRecovery}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Tentar Login
                    </button>
                  </div>
                </div>
              )}

              {recoveryStep === 'question' && (
                <div className="space-y-4">
                  {recoveryError && !localStorage.getItem('portal_security_question') ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-amber-500/5 border border-amber-500/10 text-amber-400 text-xs rounded-xl leading-relaxed">
                        {recoveryError}
                      </div>
                      <button
                        type="button"
                        onClick={() => setRecoveryStep('menu')}
                        className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        Voltar
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleVerifyQuestionSubmit} className="space-y-4">
                      <div className="p-3.5 bg-zinc-950/40 border border-zinc-850 rounded-xl">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">Pergunta de Segurança</span>
                        <span className="text-xs font-semibold text-zinc-300 block mt-1">
                          {localStorage.getItem('portal_security_question')}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-400 block">Sua Resposta</label>
                        <input
                          type="text"
                          required
                          placeholder="Digite a resposta que você configurou"
                          value={recoveryAnswerInput}
                          onChange={(e) => setRecoveryAnswerInput(e.target.value)}
                          className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2.5 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none transition"
                        />
                      </div>

                      {recoveryError && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                          {recoveryError}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setRecoveryStep('menu')}
                          className="flex-1 py-2.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Verificar Resposta
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {recoveryStep === 'success' && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs rounded-xl leading-relaxed space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0" />
                      Acesso Validado!
                    </div>
                    <p className="whitespace-pre-line text-zinc-350">{recoveryMessage}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const storedUser = localStorage.getItem('portal_username') || 'professor';
                      const storedPass = localStorage.getItem('portal_password') || '123456';
                      setLoginUser(storedUser);
                      setLoginPass(storedPass);
                      setIsRecoveryOpen(false);
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Preencher Credenciais & Ir para Login
                  </button>
                </div>
              )}

              {recoveryStep === 'reset_confirm' && (
                <div className="space-y-4">
                  <div className="p-4 bg-rose-500/5 border border-rose-500/10 text-rose-400 text-xs rounded-xl leading-relaxed space-y-3">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4" />
                      Redefinição de Emergência
                    </div>
                    <p className="text-zinc-300 text-[11px]">
                      Como seus dados são armazenados localmente com privacidade absoluta, o reset de emergência permite remover a senha sem perder suas escolas, turmas, notas ou chamadas!
                    </p>
                    <p className="text-zinc-400 font-medium text-[11px]">
                      Suas credenciais serão redefinidas para o padrão:
                      <br />• Usuário: <strong className="text-zinc-200">professor</strong>
                      <br />• Senha: <strong className="text-zinc-200">123456</strong>
                      <br />• Bloqueio por senha: <strong className="text-zinc-200">Desativado</strong>
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRecoveryStep('menu')}
                      className="flex-1 py-2.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmEmergencyReset}
                      className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Sim, Resetar Acesso
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Login Card */
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl shadow-black/50 space-y-6">
              {teacherName && (
                <div className="flex items-center gap-3 p-3.5 bg-zinc-950/40 border border-zinc-850 rounded-2xl">
                  <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-300 shrink-0">
                    <User className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">Professor</span>
                    <span className="text-sm font-semibold text-zinc-200 block truncate">{teacherName}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Username field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 block">Usuário</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      id="login-username-input"
                      type="text"
                      required
                      placeholder="Seu usuário"
                      value={loginUser}
                      onChange={(e) => setLoginUser(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl pl-10 pr-4 py-3 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder-zinc-600 transition"
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 block">Senha</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-550">
                      <Key className="w-4 h-4 text-zinc-500" />
                    </span>
                    <input
                      id="login-password-input"
                      type={showLoginPass ? 'text' : 'password'}
                      required
                      placeholder="Sua senha secreta"
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl pl-10 pr-10 py-3 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder-zinc-600 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPass(!showLoginPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-550 hover:text-zinc-300 cursor-pointer"
                    >
                      {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Error Alert */}
                {loginError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* Remember Me Toggle */}
                <div className="flex items-center gap-2 pt-1 select-none">
                  <input
                    id="remember-me-checkbox"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-blue-600 focus:ring-blue-500/30 focus:ring-offset-zinc-900 cursor-pointer"
                  />
                  <label htmlFor="remember-me-checkbox" className="text-xs text-zinc-400 cursor-pointer">
                    Manter conectado neste dispositivo
                  </label>
                </div>

                {/* Submit button */}
                <button
                  id="submit-login-btn"
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/10 cursor-pointer"
                >
                  <Lock className="w-4 h-4" /> Entrar no Sistema
                </button>

                {/* Recovery Option */}
                <div className="text-center pt-2 border-t border-zinc-800/60 mt-3">
                  <button
                    type="button"
                    onClick={handleOpenRecovery}
                    className="text-xs text-zinc-400 hover:text-blue-400 transition cursor-pointer font-medium hover:underline inline-flex items-center gap-1"
                  >
                    Esqueceu a senha? Relembrar acesso
                  </button>
                </div>
              </form>
            </div>
          )}

          <p className="text-center text-[10px] text-zinc-600 mt-6 uppercase tracking-wider">
            Portal do Professor — 100% Offline e Seguro
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="portal-app-root" className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans antialiased selection:bg-blue-600/30 selection:text-blue-200">
      
      {/* Top filter navbar */}
      <HeaderFilters
        selectedSchoolId={selectedSchoolId}
        setSelectedSchoolId={setSelectedSchoolId}
        selectedClassId={selectedClassId}
        setSelectedClassId={setSelectedClassId}
        selectedSubjectId={selectedSubjectId}
        setSelectedSubjectId={setSelectedSubjectId}
        selectedBimonthly={selectedBimonthly}
        setSelectedBimonthly={setSelectedBimonthly}
        teacherName={teacherName}
        isAuthEnabled={isAuthEnabled}
        onLogout={handleLogout}
      />

      {/* Main Tabs Navigation Bar */}
      <nav id="app-main-tabs-nav" className="bg-zinc-900/60 border-b border-zinc-800/60 sticky top-[73px] md:top-[73px] z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="grid grid-cols-3 md:flex md:flex-row md:flex-wrap md:space-x-2 py-2 gap-1 sm:gap-1.5 md:gap-0">
            {tabsInfo.map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.key;

              return (
                <button
                  id={`main-tab-${tab.key}`}
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as TabKey)}
                  className={`flex flex-col sm:flex-row items-center justify-center text-center md:text-left gap-1 sm:gap-2 px-1 py-2 sm:px-2 md:px-4 md:py-2 rounded-xl text-[10px] sm:text-xs font-bold transition duration-200 cursor-pointer select-none shrink-0 ${
                    isActive
                      ? 'bg-zinc-800 border border-zinc-700/80 text-white shadow shadow-black/20'
                      : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900/50 border border-transparent'
                  }`}
                >
                  <IconComp className={`w-4 h-4 ${tab.color} shrink-0`} />
                  <span className="text-center sm:text-left">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content Pane */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 pb-20">
        
        {/* Dynamic content with transition wrapper */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-full h-full"
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>

      </main>

      {/* Ambient Footer */}
      <footer className="bg-[#09090b] border-t border-zinc-900/60 py-4 text-center text-zinc-500 text-[10px] uppercase tracking-wider print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Portal do Professor - Offline-First IndexedDB</p>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Sparkles className="w-3 h-3 text-blue-500" />
            <span>Design Inteligente & Gamificado</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
