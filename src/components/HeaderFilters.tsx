import { ChangeEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { School, Class, Subject, sortClasses } from '../types';
import { School as SchoolIcon, Layers, BookOpen, CalendarDays, LogOut } from 'lucide-react';

interface HeaderFiltersProps {
  selectedSchoolId: number | undefined;
  setSelectedSchoolId: (id: number | undefined) => void;
  selectedClassId: number | undefined;
  setSelectedClassId: (id: number | undefined) => void;
  selectedSubjectId: number | undefined;
  setSelectedSubjectId: (id: number | undefined) => void;
  selectedBimonthly: number;
  setSelectedBimonthly: (bim: number) => void;
  teacherName: string;
  isAuthEnabled: boolean;
  onLogout: () => void;
}

export default function HeaderFilters({
  selectedSchoolId,
  setSelectedSchoolId,
  selectedClassId,
  setSelectedClassId,
  selectedSubjectId,
  setSelectedSubjectId,
  selectedBimonthly,
  setSelectedBimonthly,
  teacherName,
  isAuthEnabled,
  onLogout,
}: HeaderFiltersProps) {
  const schools = useLiveQuery(() => db.schools.toArray()) || [];
  const classes = useLiveQuery(async () => {
    let list;
    if (selectedSchoolId) {
      list = await db.classes.where({ schoolId: selectedSchoolId }).toArray();
    } else {
      list = await db.classes.toArray();
    }
    return list.sort(sortClasses);
  }, [selectedSchoolId]) || [];
  
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];

  // Update selected IDs if list loads and nothing is selected
  const handleSchoolChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? parseInt(e.target.value) : undefined;
    setSelectedSchoolId(val);
    setSelectedClassId(undefined); // Reset class selection
  };

  return (
    <div id="header-filters-container" className="bg-[#09090b] border-b border-zinc-800 p-4 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Logo/Title */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg tracking-tight truncate max-w-[200px] sm:max-w-xs">
                {teacherName ? `Prof. ${teacherName}` : 'Portal do Professor'}
              </h1>
              <p className="text-xs text-zinc-500 truncate max-w-[200px] sm:max-w-xs">
                {teacherName ? 'Portal do Professor — Diário de Classe' : 'Gerenciador de Turmas & Diário de Classe'}
              </p>
            </div>
          </div>

          {onLogout && (
            <button
              id="header-logout-btn"
              onClick={onLogout}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-zinc-400 hover:text-rose-400 rounded-xl text-xs font-semibold transition cursor-pointer select-none"
              title="Sair do aplicativo"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          )}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 md:flex md:items-center gap-3 bg-zinc-950/60 p-2 rounded-2xl border border-zinc-800">
          {/* School */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900/60 rounded-xl border border-zinc-800/40 col-span-2 md:col-span-1">
            <SchoolIcon className="w-4 h-4 text-zinc-400 shrink-0" />
            <select
              id="filter-school-select"
              value={selectedSchoolId || ''}
              onChange={handleSchoolChange}
              className="bg-transparent text-zinc-200 text-sm focus:outline-none w-full min-w-[140px] cursor-pointer"
            >
              <option value="" className="bg-zinc-950 text-zinc-300">Selecione a Escola</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id} className="bg-zinc-950 text-zinc-300">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900/60 rounded-xl border border-zinc-800/40">
            <Layers className="w-4 h-4 text-zinc-400 shrink-0" />
            <select
              id="filter-class-select"
              value={selectedClassId || ''}
              onChange={(e) => setSelectedClassId(e.target.value ? parseInt(e.target.value) : undefined)}
              className="bg-transparent text-zinc-200 text-sm focus:outline-none w-full min-w-[120px] cursor-pointer"
            >
              <option value="" className="bg-zinc-950 text-zinc-300">Selecione a Turma</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id} className="bg-zinc-950 text-zinc-300">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900/60 rounded-xl border border-zinc-800/40">
            <BookOpen className="w-4 h-4 text-zinc-400 shrink-0" />
            <select
              id="filter-subject-select"
              value={selectedSubjectId || ''}
              onChange={(e) => setSelectedSubjectId(e.target.value ? parseInt(e.target.value) : undefined)}
              className="bg-transparent text-zinc-200 text-sm focus:outline-none w-full min-w-[120px] cursor-pointer"
            >
              <option value="" className="bg-zinc-950 text-zinc-300">Selecione a Disciplina</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id} className="bg-zinc-950 text-zinc-300">
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Bimonthly */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900/60 rounded-xl border border-zinc-800/40 col-span-2 md:col-span-1">
            <CalendarDays className="w-4 h-4 text-zinc-400 shrink-0" />
            <select
              id="filter-bimonthly-select"
              value={selectedBimonthly}
              onChange={(e) => setSelectedBimonthly(parseInt(e.target.value))}
              className="bg-transparent text-zinc-200 font-medium text-sm focus:outline-none w-full cursor-pointer text-blue-400"
            >
              <option value={1} className="bg-zinc-950 text-zinc-300">1º Bimestre</option>
              <option value={2} className="bg-zinc-950 text-zinc-300">2º Bimestre</option>
              <option value={3} className="bg-zinc-950 text-zinc-300">3º Bimestre</option>
              <option value={4} className="bg-zinc-950 text-zinc-300">4º Bimestre</option>
            </select>
          </div>
        </div>

        {onLogout && (
          <button
            id="header-logout-btn-desktop"
            onClick={onLogout}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-rose-400 rounded-xl text-xs font-semibold transition cursor-pointer select-none shrink-0"
            title="Sair do aplicativo"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        )}
      </div>
    </div>
  );
}
