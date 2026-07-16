import React, { useState, useEffect } from 'react';
import {
  GlobalSchool,
  GlobalClass,
  GlobalStudent,
  getGlobalSchools,
  saveGlobalSchool,
  deleteGlobalSchool,
  getGlobalClasses,
  saveGlobalClass,
  deleteGlobalClass,
  getGlobalStudents,
  saveGlobalStudent,
  deleteGlobalStudent
} from '../firebase';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Import, 
  School as SchoolIcon, 
  Users, 
  BookOpen, 
  Sparkles, 
  Check, 
  AlertTriangle 
} from 'lucide-react';

export default function CoordGlobalClasses() {
  // Lists from cloud
  const [schools, setSchools] = useState<GlobalSchool[]>([]);
  const [classes, setClasses] = useState<GlobalClass[]>([]);
  const [students, setStudents] = useState<GlobalStudent[]>([]);

  // Selection states
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states - School
  const [newSchoolName, setNewSchoolName] = useState('');
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [editingSchoolName, setEditingSchoolName] = useState('');

  // Form states - Class
  const [newClassName, setNewClassName] = useState('');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState('');

  // Form states - Student
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentRoll, setNewStudentRoll] = useState<number | ''>('');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingStudentName, setEditingStudentName] = useState('');
  const [editingStudentRoll, setEditingStudentRoll] = useState<number | ''>('');
  const [bulkStudentText, setBulkStudentText] = useState('');

  // Load everything on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const schs = await getGlobalSchools();
      const cls = await getGlobalClasses();
      const stds = await getGlobalStudents();
      setSchools(schs);
      setClasses(cls);
      setStudents(stds);

      // Auto-select first school if none selected
      if (schs.length > 0 && !selectedSchoolId) {
        setSelectedSchoolId(schs[0].id);
      }
    } catch (error) {
      console.error(error);
      showMsg('Erro ao carregar dados da nuvem.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  // --- SCHOOL ACTIONS ---
  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim()) return;

    setIsLoading(true);
    const newId = 'sch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const item: GlobalSchool = { id: newId, name: newSchoolName.trim() };

    try {
      await saveGlobalSchool(item);
      setSchools(prev => [...prev, item]);
      setNewSchoolName('');
      setSelectedSchoolId(newId);
      showMsg('Escola cadastrada com sucesso!', 'success');
    } catch (err) {
      showMsg('Erro ao salvar escola.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchoolId || !editingSchoolName.trim()) return;

    setIsLoading(true);
    const item: GlobalSchool = { id: editingSchoolId, name: editingSchoolName.trim() };

    try {
      await saveGlobalSchool(item);
      setSchools(prev => prev.map(s => s.id === editingSchoolId ? item : s));
      setEditingSchoolId(null);
      setEditingSchoolName('');
      showMsg('Escola atualizada com sucesso!', 'success');
    } catch (err) {
      showMsg('Erro ao atualizar escola.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSchoolClick = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza de que deseja excluir a escola "${name}"? Todas as turmas e alunos dela serão excluídos permanentemente.`)) return;

    setIsLoading(true);
    try {
      await deleteGlobalSchool(id);
      setSchools(prev => prev.filter(s => s.id !== id));
      setClasses(prev => prev.filter(c => c.schoolId !== id));
      setStudents(prev => prev.filter(st => {
        const cls = classes.find(c => c.id === st.classId);
        return cls ? cls.schoolId !== id : true;
      }));

      if (selectedSchoolId === id) {
        setSelectedSchoolId('');
        setSelectedClassId('');
      }
      showMsg('Escola excluída com sucesso!', 'success');
    } catch (err) {
      showMsg('Erro ao excluir escola.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // --- CLASS ACTIONS ---
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !selectedSchoolId) return;

    setIsLoading(true);
    const newId = 'cls_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const item: GlobalClass = { id: newId, name: newClassName.trim(), schoolId: selectedSchoolId };

    try {
      await saveGlobalClass(item);
      setClasses(prev => [...prev, item]);
      setNewClassName('');
      setSelectedClassId(newId);
      showMsg('Turma cadastrada com sucesso!', 'success');
    } catch (err) {
      showMsg('Erro ao salvar turma.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClassId || !editingClassName.trim() || !selectedSchoolId) return;

    setIsLoading(true);
    const item: GlobalClass = { id: editingClassId, name: editingClassName.trim(), schoolId: selectedSchoolId };

    try {
      await saveGlobalClass(item);
      setClasses(prev => prev.map(c => c.id === editingClassId ? item : c));
      setEditingClassId(null);
      setEditingClassName('');
      showMsg('Turma atualizada com sucesso!', 'success');
    } catch (err) {
      showMsg('Erro ao atualizar turma.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClassClick = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza de que deseja excluir a turma "${name}"? Todos os alunos dela serão excluídos permanentemente.`)) return;

    setIsLoading(true);
    try {
      await deleteGlobalClass(id);
      setClasses(prev => prev.filter(c => c.id !== id));
      setStudents(prev => prev.filter(st => st.classId !== id));

      if (selectedClassId === id) {
        setSelectedClassId('');
      }
      showMsg('Turma excluída com sucesso!', 'success');
    } catch (err) {
      showMsg('Erro ao excluir turma.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // --- STUDENT ACTIONS ---
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !selectedClassId) return;

    setIsLoading(true);
    const roll = newStudentRoll === '' ? (students.filter(st => st.classId === selectedClassId).length + 1) : Number(newStudentRoll);
    const newId = 'st_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const item: GlobalStudent = {
      id: newId,
      name: newStudentName.trim(),
      rollNumber: roll,
      classId: selectedClassId
    };

    try {
      await saveGlobalStudent(item);
      setStudents(prev => [...prev, item].sort((a, b) => a.rollNumber - b.rollNumber || a.name.localeCompare(b.name)));
      setNewStudentName('');
      setNewStudentRoll('');
      showMsg('Aluno cadastrado com sucesso!', 'success');
    } catch (err) {
      showMsg('Erro ao salvar aluno.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudentId || !editingStudentName.trim() || !selectedClassId) return;

    setIsLoading(true);
    const roll = editingStudentRoll === '' ? 1 : Number(editingStudentRoll);
    const item: GlobalStudent = {
      id: editingStudentId,
      name: editingStudentName.trim(),
      rollNumber: roll,
      classId: selectedClassId
    };

    try {
      await saveGlobalStudent(item);
      setStudents(prev => prev.map(s => s.id === editingStudentId ? item : s).sort((a, b) => a.rollNumber - b.rollNumber || a.name.localeCompare(b.name)));
      setEditingStudentId(null);
      setEditingStudentName('');
      setEditingStudentRoll('');
      showMsg('Aluno atualizado com sucesso!', 'success');
    } catch (err) {
      showMsg('Erro ao atualizar aluno.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStudentClick = async (id: string, name: string) => {
    if (!window.confirm(`Excluir aluno "${name}"?`)) return;

    setIsLoading(true);
    try {
      await deleteGlobalStudent(id);
      setStudents(prev => prev.filter(st => st.id !== id));
      showMsg('Aluno excluído com sucesso!', 'success');
    } catch (err) {
      showMsg('Erro ao excluir aluno.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // BULK IMPORT STUDENTS
  const handleBulkImportStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkStudentText.trim() || !selectedClassId) return;

    setIsLoading(true);
    const lines = bulkStudentText.split('\n');
    const newlyAdded: GlobalStudent[] = [];
    let startRoll = students.filter(st => st.classId === selectedClassId).length + 1;

    try {
      for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // Try to parse "1 - Name" or just "Name"
        let name = line;
        let roll = startRoll;

        const match = line.match(/^(\d+)\s*[-;.]?\s*(.+)$/);
        if (match) {
          roll = Number(match[1]);
          name = match[2].trim();
        } else {
          startRoll++;
        }

        const newId = 'st_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '_' + Math.random().toString(36).substring(2, 5);
        const item: GlobalStudent = {
          id: newId,
          name,
          rollNumber: roll,
          classId: selectedClassId
        };

        await saveGlobalStudent(item);
        newlyAdded.push(item);
      }

      setStudents(prev => [...prev, ...newlyAdded].sort((a, b) => a.rollNumber - b.rollNumber || a.name.localeCompare(b.name)));
      setBulkStudentText('');
      showMsg(`${newlyAdded.length} alunos importados com sucesso!`, 'success');
    } catch (err) {
      console.error(err);
      showMsg('Erro durante a importação em lote de alunos.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter lists
  const filteredClasses = classes.filter(c => c.schoolId === selectedSchoolId);
  const filteredStudents = students.filter(st => st.classId === selectedClassId);

  // Auto-select class when school changes
  useEffect(() => {
    if (filteredClasses.length > 0) {
      // Find if current selection is in filtered, if not select first
      if (!filteredClasses.some(c => c.id === selectedClassId)) {
        setSelectedClassId(filteredClasses[0].id);
      }
    } else {
      setSelectedClassId('');
    }
  }, [selectedSchoolId, classes]);

  return (
    <div className="space-y-6">
      {/* Toast Messages */}
      {message && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 border shadow-lg animate-in fade-in slide-in-from-top-4 duration-300 ${
          message.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-800 text-emerald-400' 
            : 'bg-rose-950/80 border-rose-800 text-rose-400'
        }`}>
          {message.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" /> Registro de Turmas Globais & Alunos
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
              Como coordenador, você pode registrar as escolas, turmas e a lista de alunos oficial aqui. 
              Os professores poderão anexar diretamente essas turmas prontas nos seus diários de classe, garantindo a padronização e evitando erros de cadastro ou digitação de alunos!
            </p>
          </div>
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-amber-500 font-mono bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full animate-pulse">
              <span>Sincronizando Nuvem...</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COL 1: SCHOOLS & CLASSES (LHS) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* ESCOLAS */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
            <h4 className="text-white font-bold text-xs flex items-center gap-2 uppercase tracking-wider text-zinc-300">
              <SchoolIcon className="w-4 h-4 text-amber-500" /> 1. Escolas
            </h4>

            {/* School Form */}
            {editingSchoolId ? (
              <form onSubmit={handleUpdateSchool} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={editingSchoolName}
                  onChange={(e) => setEditingSchoolName(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button type="submit" className="px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer">
                  Salvar
                </button>
                <button type="button" onClick={() => setEditingSchoolId(null)} className="p-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 rounded-xl transition cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleAddSchool} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nome da Escola..."
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button type="submit" className="p-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl transition cursor-pointer shrink-0">
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Schools List */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {schools.map((sch) => (
                <div 
                  key={sch.id} 
                  onClick={() => setSelectedSchoolId(sch.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition ${
                    selectedSchoolId === sch.id
                      ? 'bg-amber-600/10 border-amber-500 text-amber-400'
                      : 'bg-zinc-950/40 border-zinc-850 text-zinc-300 hover:bg-zinc-900/40'
                  }`}
                >
                  <span className="truncate pr-2">{sch.name}</span>
                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => {
                        setEditingSchoolId(sch.id);
                        setEditingSchoolName(sch.name);
                      }} 
                      className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => handleDeleteSchoolClick(sch.id, sch.name)} 
                      className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 rounded transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {schools.length === 0 && (
                <p className="text-zinc-500 text-xs text-center py-4">Nenhuma escola cadastrada.</p>
              )}
            </div>
          </div>

          {/* TURMAS */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
            <h4 className="text-white font-bold text-xs flex items-center gap-2 uppercase tracking-wider text-zinc-300">
              <BookOpen className="w-4 h-4 text-amber-500" /> 2. Turmas
            </h4>

            {selectedSchoolId ? (
              <>
                {/* Class Form */}
                {editingClassId ? (
                  <form onSubmit={handleUpdateClass} className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={editingClassName}
                      onChange={(e) => setEditingClassName(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button type="submit" className="px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer">
                      Salvar
                    </button>
                    <button type="button" onClick={() => setEditingClassId(null)} className="p-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 rounded-xl transition cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleAddClass} className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Ex: 1º Ano A..."
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button type="submit" className="p-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl transition cursor-pointer shrink-0">
                      <Plus className="w-4 h-4" />
                    </button>
                  </form>
                )}

                {/* Classes list */}
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {filteredClasses.map((cls) => (
                    <div 
                      key={cls.id} 
                      onClick={() => setSelectedClassId(cls.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition ${
                        selectedClassId === cls.id
                          ? 'bg-amber-600/10 border-amber-500 text-amber-400 font-bold'
                          : 'bg-zinc-950/40 border-zinc-850 text-zinc-300 hover:bg-zinc-900/40'
                      }`}
                    >
                      <span className="truncate pr-2">{cls.name}</span>
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => {
                            setEditingClassId(cls.id);
                            setEditingClassName(cls.name);
                          }} 
                          className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => handleDeleteClassClick(cls.id, cls.name)} 
                          className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredClasses.length === 0 && (
                    <p className="text-zinc-500 text-xs text-center py-4">Nenhuma turma cadastrada nesta escola.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-zinc-500 text-xs text-center py-6">Selecione ou crie uma escola primeiro.</p>
            )}
          </div>

        </div>

        {/* COL 2: STUDENTS LIST & ADDITION (RHS) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-6">
            <h4 className="text-white font-bold text-xs flex items-center gap-2 uppercase tracking-wider text-zinc-300">
              <Users className="w-4 h-4 text-amber-500" /> 3. Alunos da Turma Selecionada
            </h4>

            {selectedClassId ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Student Forms (LHS of right panel) */}
                <div className="md:col-span-5 space-y-6">
                  
                  {/* Single student add / edit */}
                  <div className="bg-zinc-950/50 border border-zinc-855 p-4 rounded-xl space-y-3">
                    <p className="text-xs font-bold text-zinc-300">
                      {editingStudentId ? 'Editar Aluno' : 'Adicionar Único Aluno'}
                    </p>

                    {editingStudentId ? (
                      <form onSubmit={handleUpdateStudent} className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase block">Nome do Aluno</label>
                          <input
                            type="text"
                            required
                            value={editingStudentName}
                            onChange={(e) => setEditingStudentName(e.target.value)}
                            className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase block">Número de Chamada (Opcional)</label>
                          <input
                            type="number"
                            placeholder="Número da chamada..."
                            value={editingStudentRoll}
                            onChange={(e) => setEditingStudentRoll(e.target.value === '' ? '' : Number(e.target.value))}
                            className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition cursor-pointer">
                            Salvar Alteração
                          </button>
                          <button type="button" onClick={() => setEditingStudentId(null)} className="py-2 px-3 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 rounded-xl transition cursor-pointer">
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={handleAddStudent} className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase block">Nome do Aluno</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: João da Silva..."
                            value={newStudentName}
                            onChange={(e) => setNewStudentName(e.target.value)}
                            className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-3 py-2.5 w-full focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase block">Nº de Chamada (Opcional)</label>
                          <input
                            type="number"
                            placeholder="Deixe vazio para auto-incremento"
                            value={newStudentRoll}
                            onChange={(e) => setNewStudentRoll(e.target.value === '' ? '' : Number(e.target.value))}
                            className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-3 py-2.5 w-full focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                        <button type="submit" className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5">
                          <Plus className="w-4 h-4" /> Cadastrar Aluno
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Bulk import form */}
                  <div className="bg-zinc-950/50 border border-zinc-855 p-4 rounded-xl space-y-3">
                    <p className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                      <Import className="w-4 h-4 text-amber-500" /> Importar em Lote (Lote de Alunos)
                    </p>
                    <p className="text-[10px] text-zinc-500 leading-normal">
                      Insira um nome por linha. Você também pode colocar o número de chamada no formato <code className="text-amber-500 font-mono">1 - Nome</code>.
                    </p>
                    <form onSubmit={handleBulkImportStudents} className="space-y-3">
                      <textarea
                        required
                        rows={6}
                        placeholder="1 - Ana Souza&#10;2 - Bruno Lima&#10;Carlos Oliveira&#10;Daniela Santos"
                        value={bulkStudentText}
                        onChange={(e) => setBulkStudentText(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-xl p-3 w-full focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                      />
                      <button type="submit" className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-300 hover:text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5">
                        <Import className="w-4 h-4" /> Importar Lista
                      </button>
                    </form>
                  </div>

                </div>

                {/* Students list of class (RHS of right panel) */}
                <div className="md:col-span-7 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Estudantes da Turma ({filteredStudents.length})</span>
                  </div>

                  <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                    {filteredStudents.map((st) => (
                      <div key={st.id} className="flex items-center justify-between bg-zinc-950/30 border border-zinc-850 rounded-xl px-3 py-2 text-xs hover:border-zinc-800 transition">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[11px] font-bold text-amber-500/70 bg-amber-500/5 border border-amber-500/10 w-6 h-6 rounded flex items-center justify-center shrink-0">
                            {st.rollNumber}
                          </span>
                          <span className="text-zinc-200 font-medium truncate">{st.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button 
                            onClick={() => {
                              setEditingStudentId(st.id);
                              setEditingStudentName(st.name);
                              setEditingStudentRoll(st.rollNumber);
                            }} 
                            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => handleDeleteStudentClick(st.id, st.name)} 
                            className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {filteredStudents.length === 0 && (
                      <div className="text-center py-12 text-zinc-500">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-xs">Nenhum aluno cadastrado nesta turma ainda.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-16 text-zinc-500 bg-zinc-950/20 border border-dashed border-zinc-800 rounded-2xl">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">Selecione uma turma para ver e gerenciar os alunos.</p>
                <p className="text-xs text-zinc-650 mt-1">Crie escolas e turmas no painel lateral esquerdo.</p>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
