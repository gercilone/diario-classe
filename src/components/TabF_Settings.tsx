import { useState, FormEvent, ChangeEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedDatabase } from '../db';
import { School, Class, Subject, Student, SubjectWorkload, WeeklySchedule } from '../types';
import { Plus, Trash2, Edit2, X, Import, Download, Upload, Calendar, Clock, BookOpen, School as SchoolIcon, Users, Settings, Database, Check, AlertTriangle, Sparkles, Save, User, Lock, Shield, Eye, EyeOff } from 'lucide-react';

interface TabFSettingsProps {
  teacherName: string;
  setTeacherName: (name: string) => void;
  onSecuritySaved?: () => void;
}

export default function TabFSettings({ teacherName, setTeacherName, onSecuritySaved }: TabFSettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'perfil' | 'cadastros' | 'grade' | 'backup'>('perfil');

  // PROFILE & SECURITY STATES
  const [profileName, setProfileName] = useState(teacherName);
  const [portalUsername, setPortalUsername] = useState(() => localStorage.getItem('portal_username') || 'professor');
  const [portalPassword, setPortalPassword] = useState(() => localStorage.getItem('portal_password') || '123456');
  const [portalAuthEnabled, setPortalAuthEnabled] = useState(() => localStorage.getItem('portal_auth_enabled') === 'true');
  const [portalPasswordHint, setPortalPasswordHint] = useState(() => localStorage.getItem('portal_password_hint') || '');
  const [portalSecurityQuestion, setPortalSecurityQuestion] = useState(() => localStorage.getItem('portal_security_question') || '');
  const [portalSecurityAnswer, setPortalSecurityAnswer] = useState(() => localStorage.getItem('portal_security_answer') || '');
  const [showPassword, setShowPassword] = useState(false);

  // FORM STATES
  const [newSchoolName, setNewSchoolName] = useState('');
  const [selectedSchoolIdForClass, setSelectedSchoolIdForClass] = useState<number | undefined>(undefined);
  const [newClassName, setNewClassName] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');

  // STUDENT MANAGEMENT STATES
  const [selectedSchoolIdForStudent, setSelectedSchoolIdForStudent] = useState<number | undefined>(undefined);
  const [selectedClassIdForStudent, setSelectedClassIdForStudent] = useState<number | undefined>(undefined);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentRoll, setNewStudentRoll] = useState<number | undefined>(undefined);
  const [bulkStudentText, setBulkStudentText] = useState('');

  // GRADE / WORKLOAD STATES
  const [selectedClassIdForWorkload, setSelectedClassIdForWorkload] = useState<number | undefined>(undefined);
  const [selectedSubjectIdForWorkload, setSelectedSubjectIdForWorkload] = useState<number | undefined>(undefined);
  const [workloadLessons, setWorkloadLessons] = useState(40);

  // WEEKLY SCHEDULE FORM STATES
  const [schedDay, setSchedDay] = useState(1); // 1 = Segunda
  const [schedTime, setSchedTime] = useState('07:00 - 07:50');
  const [schedSchool, setSchedSchool] = useState<number | undefined>(undefined);
  const [schedClass, setSchedClass] = useState<number | undefined>(undefined);
  const [schedSubject, setSchedSubject] = useState<number | undefined>(undefined);

  // EDITING STATES
  const [editingSchoolId, setEditingSchoolId] = useState<number | undefined>(undefined);
  const [editingSchoolName, setEditingSchoolName] = useState('');

  const [editingClassId, setEditingClassId] = useState<number | undefined>(undefined);
  const [editingClassName, setEditingClassName] = useState('');
  const [editingClassSchoolId, setEditingClassSchoolId] = useState<number | undefined>(undefined);

  const [editingSubjectId, setEditingSubjectId] = useState<number | undefined>(undefined);
  const [editingSubjectName, setEditingSubjectName] = useState('');

  const [editingStudentId, setEditingStudentId] = useState<number | undefined>(undefined);
  const [editingStudentName, setEditingStudentName] = useState('');
  const [editingStudentRoll, setEditingStudentRoll] = useState<number | undefined>(undefined);

  const [editingWorkloadId, setEditingWorkloadId] = useState<number | undefined>(undefined);
  const [editingWorkloadLessons, setEditingWorkloadLessons] = useState<number>(40);

  // DIALOG / MODAL STATES
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  } | null>(null);

  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onClose?: () => void;
  } | null>(null);

  // DATABASE STATES FOR RENDERING
  const schools = useLiveQuery(() => db.schools.toArray()) || [];
  const classes = useLiveQuery(() => db.classes.toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];
  
  const studentsFiltered = useLiveQuery(async () => {
    if (!selectedClassIdForStudent) return [];
    return db.students.where({ classId: selectedClassIdForStudent }).sortBy('rollNumber');
  }, [selectedClassIdForStudent]) || [];

  const workloads = useLiveQuery(() => db.subjectWorkloads.toArray()) || [];
  const weeklySchedules = useLiveQuery(() => db.weeklySchedule.toArray()) || [];

  const classesBySchool = selectedSchoolIdForStudent 
    ? classes.filter(c => c.schoolId === selectedSchoolIdForStudent)
    : [];

  // ACTIONS: CRUD Schools
  const handleAddSchool = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim()) return;
    try {
      await db.schools.add({ name: newSchoolName.trim() });
      setNewSchoolName('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEditSchool = (sch: School) => {
    setEditingSchoolId(sch.id);
    setEditingSchoolName(sch.name);
  };

  const handleSaveEditSchool = async () => {
    if (!editingSchoolId || !editingSchoolName.trim()) return;
    try {
      await db.schools.update(editingSchoolId, { name: editingSchoolName.trim() });
      setEditingSchoolId(undefined);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSchool = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Excluir Escola',
      message: 'Excluir esta escola apagará permanentemente todas as suas turmas, alunos e notas associadas. Deseja realmente continuar?',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          await db.transaction('rw', [
            db.schools, db.classes, db.students, db.bimonthlyGrades,
            db.attendance, db.studentVistos, db.vistoRankingScores, db.extraGrades, db.weeklySchedule, db.subjectWorkloads
          ], async () => {
            // Delete school
            await db.schools.delete(id);
            
            // Find and delete classes
            const relatedClasses = await db.classes.where({ schoolId: id }).toArray();
            for (const c of relatedClasses) {
              await db.classes.delete(c.id!);
              
              // Find and delete students
              const relatedStudents = await db.students.where({ classId: c.id! }).toArray();
              for (const s of relatedStudents) {
                await db.students.delete(s.id!);
                await db.bimonthlyGrades.where({ studentId: s.id! }).delete();
                await db.attendance.where({ studentId: s.id! }).delete();
                await db.studentVistos.where({ studentId: s.id! }).delete();
                await db.vistoRankingScores.where({ studentId: s.id! }).delete();
                await db.extraGrades.where({ studentId: s.id! }).delete();
              }
            }
            
            // Delete schedule/workloads for school
            await db.weeklySchedule.where({ schoolId: id }).delete();
            // Also clean up workloads for the classes we just deleted
            for (const c of relatedClasses) {
              await db.subjectWorkloads.where({ classId: c.id! }).delete();
            }
          });
          setConfirmDialog(null);
        } catch (err) {
          console.error(err);
          setConfirmDialog(null);
        }
      }
    });
  };

  // ACTIONS: CRUD Classes
  const handleAddClass = async (e: FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !selectedSchoolIdForClass) return;
    try {
      await db.classes.add({ name: newClassName.trim(), schoolId: selectedSchoolIdForClass });
      setNewClassName('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEditClass = (cls: Class) => {
    setEditingClassId(cls.id);
    setEditingClassName(cls.name);
    setEditingClassSchoolId(cls.schoolId);
  };

  const handleSaveEditClass = async () => {
    if (!editingClassId || !editingClassName.trim() || !editingClassSchoolId) return;
    try {
      await db.classes.update(editingClassId, {
        name: editingClassName.trim(),
        schoolId: editingClassSchoolId
      });
      setEditingClassId(undefined);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClass = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Excluir Turma',
      message: 'Excluir esta turma removerá permanentemente todos os alunos cadastrados e os registros de notas/chamada. Deseja continuar?',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          await db.transaction('rw', [
            db.classes, db.students, db.bimonthlyGrades, db.attendance,
            db.studentVistos, db.vistoRankingScores, db.extraGrades, db.weeklySchedule, db.subjectWorkloads
          ], async () => {
            await db.classes.delete(id);
            
            const relatedStudents = await db.students.where({ classId: id }).toArray();
            for (const s of relatedStudents) {
              await db.students.delete(s.id!);
              await db.bimonthlyGrades.where({ studentId: s.id! }).delete();
              await db.attendance.where({ studentId: s.id! }).delete();
              await db.studentVistos.where({ studentId: s.id! }).delete();
              await db.vistoRankingScores.where({ studentId: s.id! }).delete();
              await db.extraGrades.where({ studentId: s.id! }).delete();
            }
            
            await db.weeklySchedule.where({ classId: id }).delete();
            await db.subjectWorkloads.where({ classId: id }).delete();
          });
          setConfirmDialog(null);
        } catch (err) {
          console.error(err);
          setConfirmDialog(null);
        }
      }
    });
  };

  // ACTIONS: CRUD Subjects
  const handleAddSubject = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    try {
      await db.subjects.add({ name: newSubjectName.trim() });
      setNewSubjectName('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEditSubject = (sub: Subject) => {
    setEditingSubjectId(sub.id);
    setEditingSubjectName(sub.name);
  };

  const handleSaveEditSubject = async () => {
    if (!editingSubjectId || !editingSubjectName.trim()) return;
    try {
      await db.subjects.update(editingSubjectId, { name: editingSubjectName.trim() });
      setEditingSubjectId(undefined);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubject = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Excluir Disciplina',
      message: 'Excluir esta disciplina apagará todas as notas, vistos e cargas horárias vinculadas a ela. Deseja continuar?',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          await db.transaction('rw', [
            db.subjects, db.bimonthlyGrades, db.attendance, db.vistoColumns, db.studentVistos, db.vistoRankingScores, db.extraGrades, db.weeklySchedule, db.subjectWorkloads
          ], async () => {
            await db.subjects.delete(id);
            await db.bimonthlyGrades.where({ subjectId: id }).delete();
            await db.attendance.where({ subjectId: id }).delete();
            
            const relatedVistoCols = await db.vistoColumns.where({ subjectId: id }).toArray();
            for (const col of relatedVistoCols) {
              await db.vistoColumns.delete(col.id!);
              await db.studentVistos.where({ vistoColumnId: col.id! }).delete();
            }
            
            await db.vistoRankingScores.where({ subjectId: id }).delete();
            await db.extraGrades.where({ subjectId: id }).delete();
            await db.weeklySchedule.where({ subjectId: id }).delete();
            await db.subjectWorkloads.where({ subjectId: id }).delete();
          });
          setConfirmDialog(null);
        } catch (err) {
          console.error(err);
          setConfirmDialog(null);
        }
      }
    });
  };

  // ACTIONS: CRUD Students
  const handleAddStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !selectedClassIdForStudent) return;
    try {
      const nextRoll = newStudentRoll || (studentsFiltered.length > 0 
        ? Math.max(...studentsFiltered.map(s => s.rollNumber)) + 1 
        : 1);

      await db.students.add({
        name: newStudentName.trim(),
        classId: selectedClassIdForStudent,
        rollNumber: nextRoll
      });

      setNewStudentName('');
      setNewStudentRoll(undefined);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEditStudent = (st: Student) => {
    setEditingStudentId(st.id);
    setEditingStudentName(st.name);
    setEditingStudentRoll(st.rollNumber);
  };

  const handleSaveEditStudent = async () => {
    if (!editingStudentId || !editingStudentName.trim() || editingStudentRoll === undefined) return;
    try {
      await db.students.update(editingStudentId, {
        name: editingStudentName.trim(),
        rollNumber: editingStudentRoll
      });
      setEditingStudentId(undefined);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkImportStudents = async () => {
    if (!bulkStudentText.trim() || !selectedClassIdForStudent) return;
    try {
      const lines = bulkStudentText.split('\n').map(l => l.trim()).filter(Boolean);
      let currentMax = studentsFiltered.length > 0 
        ? Math.max(...studentsFiltered.map(s => s.rollNumber)) 
        : 0;

      for (const name of lines) {
        currentMax++;
        await db.students.add({
          classId: selectedClassIdForStudent,
          name,
          rollNumber: currentMax
        });
      }

      setBulkStudentText('');
      setAlertDialog({
        isOpen: true,
        title: 'Sucesso',
        message: `${lines.length} alunos importados com sucesso!`
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStudent = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Excluir Aluno',
      message: 'Deseja remover este aluno? Todos os seus registros serão perdidos.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          await db.students.delete(id);
          await db.bimonthlyGrades.where({ studentId: id }).delete();
          await db.attendance.where({ studentId: id }).delete();
          await db.studentVistos.where({ studentId: id }).delete();
          await db.vistoRankingScores.where({ studentId: id }).delete();
          await db.extraGrades.where({ studentId: id }).delete();
          setConfirmDialog(null);
        } catch (err) {
          console.error(err);
          setConfirmDialog(null);
        }
      }
    });
  };

  // ACTIONS: Cargas Horárias
  const handleAddWorkload = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedClassIdForWorkload || !selectedSubjectIdForWorkload) return;
    try {
      const existing = await db.subjectWorkloads
        .where({ classId: selectedClassIdForWorkload, subjectId: selectedSubjectIdForWorkload })
        .first();

      if (existing) {
        await db.subjectWorkloads.update(existing.id!, { totalLessons: workloadLessons });
      } else {
        await db.subjectWorkloads.add({
          classId: selectedClassIdForWorkload,
          subjectId: selectedSubjectIdForWorkload,
          totalLessons: workloadLessons
        });
      }
      setAlertDialog({
        isOpen: true,
        title: 'Sucesso',
        message: 'Carga horária configurada com sucesso!'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEditWorkload = (wl: SubjectWorkload) => {
    setEditingWorkloadId(wl.id);
    setEditingWorkloadLessons(wl.totalLessons);
  };

  const handleSaveEditWorkload = async () => {
    if (!editingWorkloadId) return;
    try {
      await db.subjectWorkloads.update(editingWorkloadId, {
        totalLessons: editingWorkloadLessons
      });
      setEditingWorkloadId(undefined);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteWorkload = async (id: number) => {
    try {
      await db.subjectWorkloads.delete(id);
    } catch (err) {
      console.error(err);
    }
  };

  // ACTIONS: Horário Semanal
  const handleAddSchedule = async (e: FormEvent) => {
    e.preventDefault();
    if (!schedSchool || !schedClass || !schedSubject) return;
    try {
      await db.weeklySchedule.add({
        dayOfWeek: schedDay,
        timeSlot: schedTime,
        schoolId: schedSchool,
        classId: schedClass,
        subjectId: schedSubject
      });
      setAlertDialog({
        isOpen: true,
        title: 'Sucesso',
        message: 'Horário de aula adicionado!'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSchedule = async (id: number) => {
    try {
      await db.weeklySchedule.delete(id);
    } catch (err) {
      console.error(err);
    }
  };

  // BACKUP EXPORT
  const handleExportBackup = async () => {
    try {
      const data = {
        schools: await db.schools.toArray(),
        classes: await db.classes.toArray(),
        subjects: await db.subjects.toArray(),
        students: await db.students.toArray(),
        subjectWorkloads: await db.subjectWorkloads.toArray(),
        weeklySchedule: await db.weeklySchedule.toArray(),
        bimonthlyGrades: await db.bimonthlyGrades.toArray(),
        assignmentDescriptions: await db.assignmentDescriptions.toArray(),
        lessons: await db.lessons.toArray(),
        attendance: await db.attendance.toArray(),
        vistoColumns: await db.vistoColumns.toArray(),
        studentVistos: await db.studentVistos.toArray(),
        vistoRankingScores: await db.vistoRankingScores.toArray(),
        extraGrades: await db.extraGrades.toArray()
      };

      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_portal_professor_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Backup export failed:', err);
      setAlertDialog({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao exportar backup local.'
      });
    }
  };

  // BACKUP IMPORT
  const handleImportBackup = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setConfirmDialog({
      isOpen: true,
      title: 'AVISO DE SEGURANÇA',
      message: 'AVISO: Importar um backup substituirá TODOS os dados atuais no seu navegador de forma irreversível. Deseja continuar?',
      confirmText: 'Importar Backup',
      cancelText: 'Cancelar',
      onConfirm: () => {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const text = event.target?.result as string;
            const data = JSON.parse(text);

            // Transactional overwrite
            await db.transaction('rw', [
              db.schools, db.classes, db.subjects, db.students, db.subjectWorkloads,
              db.weeklySchedule, db.bimonthlyGrades, db.assignmentDescriptions,
              db.lessons, db.attendance, db.vistoColumns, db.studentVistos,
              db.vistoRankingScores, db.extraGrades
            ], async () => {
              await db.schools.clear();
              await db.classes.clear();
              await db.subjects.clear();
              await db.students.clear();
              await db.subjectWorkloads.clear();
              await db.weeklySchedule.clear();
              await db.bimonthlyGrades.clear();
              await db.assignmentDescriptions.clear();
              await db.lessons.clear();
              await db.attendance.clear();
              await db.vistoColumns.clear();
              await db.studentVistos.clear();
              await db.vistoRankingScores.clear();
              await db.extraGrades.clear();

              if (data.schools) await db.schools.bulkAdd(data.schools);
              if (data.classes) await db.classes.bulkAdd(data.classes);
              if (data.subjects) await db.subjects.bulkAdd(data.subjects);
              if (data.students) await db.students.bulkAdd(data.students);
              if (data.subjectWorkloads) await db.subjectWorkloads.bulkAdd(data.subjectWorkloads);
              if (data.weeklySchedule) await db.weeklySchedule.bulkAdd(data.weeklySchedule);
              if (data.bimonthlyGrades) await db.bimonthlyGrades.bulkAdd(data.bimonthlyGrades);
              if (data.assignmentDescriptions) await db.assignmentDescriptions.bulkAdd(data.assignmentDescriptions);
              if (data.lessons) await db.lessons.bulkAdd(data.lessons);
              if (data.attendance) await db.attendance.bulkAdd(data.attendance);
              if (data.vistoColumns) await db.vistoColumns.bulkAdd(data.vistoColumns);
              if (data.studentVistos) await db.studentVistos.bulkAdd(data.studentVistos);
              if (data.vistoRankingScores) await db.vistoRankingScores.bulkAdd(data.vistoRankingScores);
              if (data.extraGrades) await db.extraGrades.bulkAdd(data.extraGrades);
            });

            setConfirmDialog(null);
            setAlertDialog({
              isOpen: true,
              title: 'Sucesso',
              message: 'Backup importado e restaurado com sucesso!',
              onClose: () => {
                window.location.reload();
              }
            });
          } catch (err) {
            console.error('Import error:', err);
            setConfirmDialog(null);
            setAlertDialog({
              isOpen: true,
              title: 'Erro',
              message: 'Erro ao processar o arquivo JSON de backup. Certifique-se de que é um backup válido.'
            });
          }
        };
        reader.readAsText(file);
      }
    });

    e.target.value = '';
  };

  // Demo seed trigger
  const handleLoadDemoData = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Carregar Dados de Demonstração',
      message: 'Carregar dados de demonstração preencherá a base de dados com escolas, turmas, alunos e notas de teste. Continuar?',
      confirmText: 'Carregar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          await seedDatabase();
          setConfirmDialog(null);
          setAlertDialog({
            isOpen: true,
            title: 'Dados Carregados',
            message: 'Dados de demonstração carregados com sucesso!',
            onClose: () => {
              window.location.reload();
            }
          });
        } catch (err) {
          console.error(err);
          setConfirmDialog(null);
        }
      }
    });
  };

  const handleSaveProfile = (e: FormEvent) => {
    e.preventDefault();
    localStorage.setItem('portal_teacher_name', profileName.trim());
    setTeacherName(profileName.trim());
    setAlertDialog({
      isOpen: true,
      title: 'Sucesso',
      message: 'Nome do professor atualizado com sucesso!'
    });
  };

  const handleSaveSecurity = (e: FormEvent) => {
    e.preventDefault();
    if (!portalUsername.trim()) {
      setAlertDialog({
        isOpen: true,
        title: 'Aviso',
        message: 'O nome de usuário não pode ficar vazio.'
      });
      return;
    }
    if (portalPassword.length < 4) {
      setAlertDialog({
        isOpen: true,
        title: 'Senha muito curta',
        message: 'A senha de acesso deve ter pelo menos 4 caracteres.'
      });
      return;
    }
    localStorage.setItem('portal_username', portalUsername.trim());
    localStorage.setItem('portal_password', portalPassword);
    localStorage.setItem('portal_auth_enabled', portalAuthEnabled ? 'true' : 'false');
    localStorage.setItem('portal_password_hint', portalPasswordHint.trim());
    localStorage.setItem('portal_security_question', portalSecurityQuestion.trim());
    localStorage.setItem('portal_security_answer', portalSecurityAnswer.trim());
    
    if (onSecuritySaved) {
      onSecuritySaved();
    }
    
    setAlertDialog({
      isOpen: true,
      title: 'Configurações Salvas',
      message: portalAuthEnabled 
        ? 'Proteção por senha ATIVADA! Na próxima vez que o aplicativo for aberto, o acesso exigirá login.'
        : 'Configurações de segurança atualizadas com sucesso! A proteção por senha está DESATIVADA.'
    });
  };

  const getDayName = (dayNum: number) => {
    const days = ['', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
    return days[dayNum] || '';
  };

  return (
    <div id="settings-tab-content" className="space-y-6">
      
      {/* Sub tabs nav */}
      <div className="flex border-b border-zinc-800 overflow-x-auto scrollbar-none">
        <button
          id="subtab-perfil-btn"
          onClick={() => setActiveSubTab('perfil')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubTab === 'perfil'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:bg-white/5'
          }`}
        >
          <User className="w-4 h-4" />
          Perfil & Segurança
        </button>
        <button
          id="subtab-cadastros-btn"
          onClick={() => setActiveSubTab('cadastros')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubTab === 'cadastros'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          Gerenciamento de Cadastros
        </button>
        <button
          id="subtab-grade-btn"
          onClick={() => setActiveSubTab('grade')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'grade'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:bg-white/5'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Grade Semanal & Cargas
        </button>
        <button
          id="subtab-backup-btn"
          onClick={() => setActiveSubTab('backup')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'backup'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:bg-white/5'
          }`}
        >
          <Database className="w-4 h-4" />
          Backup & Importação
        </button>
      </div>

      {/* Perfil & Segurança Sub-Tab */}
      {activeSubTab === 'perfil' && (
        <div id="settings-perfil-section" className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-150">
          
          {/* Card 1: Perfil do Professor */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
              <User className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="text-white font-bold text-sm">Identificação do Professor</h3>
                <p className="text-[11px] text-zinc-500">Configure como seu nome aparecerá no cabeçalho do diário</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 block">Nome do(a) Professor(a)</label>
                <input
                  id="profile-teacher-name-input"
                  type="text"
                  placeholder="Ex: Prof. Dr. Carlos Silva"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2.5 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                id="save-profile-btn"
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-500/10"
              >
                <Save className="w-4 h-4" /> Salvar Nome
              </button>
            </form>
          </div>

          {/* Card 2: Segurança e Controle de Acesso */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
              <Shield className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-white font-bold text-sm">Segurança & Controle de Acesso</h3>
                <p className="text-[11px] text-zinc-500">Adicione uma camada de senha para proteger seus diários</p>
              </div>
            </div>

            <form onSubmit={handleSaveSecurity} className="space-y-4">
              
              {/* Toggle Protection */}
              <div className="flex items-center justify-between p-3 bg-zinc-950/40 rounded-xl border border-zinc-850">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-300 block">Ativar Proteção por Senha</span>
                  <span className="text-[10px] text-zinc-500">Exige login ao abrir o aplicativo</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    id="toggle-auth-enabled-checkbox"
                    type="checkbox"
                    checked={portalAuthEnabled}
                    onChange={(e) => setPortalAuthEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-800 rounded-full peer peer-focus:ring-1 peer-focus:ring-blue-500/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white peer-checked:after:border-blue-500"></div>
                </label>
              </div>

              {/* Username/Password Fields */}
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 block">Usuário de Acesso</label>
                  <input
                    id="profile-username-input"
                    type="text"
                    required
                    placeholder="Ex: professor"
                    value={portalUsername}
                    onChange={(e) => setPortalUsername(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2.5 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 block">Senha de Acesso</label>
                  <div className="relative">
                    <input
                      id="profile-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Sua senha secreta"
                      value={portalPassword}
                      onChange={(e) => setPortalPassword(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl pl-3 pr-10 py-2.5 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Hint */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-zinc-400 block">Dica de Senha (Opcional)</label>
                  <input
                    id="profile-password-hint-input"
                    type="text"
                    placeholder="Ex: Nome do meu primeiro pet ou Ano de formatura"
                    value={portalPasswordHint}
                    onChange={(e) => setPortalPasswordHint(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2.5 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder-zinc-700"
                  />
                </div>

                {/* Security Question */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-zinc-400 block">Pergunta de Segurança para Recuperação</label>
                  <select
                    id="profile-security-question-select"
                    value={portalSecurityQuestion}
                    onChange={(e) => setPortalSecurityQuestion(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2.5 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Selecione uma pergunta de segurança --</option>
                    <option value="Qual o nome da sua primeira escola?">Qual o nome da sua primeira escola?</option>
                    <option value="Qual o nome da cidade onde você nasceu?">Qual o nome da cidade onde você nasceu?</option>
                    <option value="Qual o nome do seu primeiro animal de estimação?">Qual o nome do seu primeiro animal de estimação?</option>
                    <option value="Qual o nome do seu livro ou filme favorito?">Qual o nome do seu livro ou filme favorito?</option>
                    <option value="Qual era o seu apelido de infância?">Qual era o seu apelido de infância?</option>
                  </select>
                </div>

                {/* Security Answer */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-zinc-400 block">Resposta de Segurança</label>
                  <input
                    id="profile-security-answer-input"
                    type="text"
                    placeholder="Ex: Dom Bosco (não diferencia maiúsculas de minúsculas)"
                    value={portalSecurityAnswer}
                    onChange={(e) => setPortalSecurityAnswer(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2.5 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder-zinc-700"
                  />
                </div>
              </div>

              {/* Security Warning */}
              <div className="flex gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-400/85">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[10px] leading-relaxed">
                  <strong>Importante:</strong> Esta proteção é executada localmente no seu navegador para manter a privacidade dos seus dados. Lembre-se da senha escolhida, pois não há recuperação de e-mail por ser uma aplicação offline.
                </p>
              </div>

              <button
                id="save-security-btn"
                type="submit"
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 hover:text-white border border-zinc-700/80 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4 text-amber-400" /> Salvar Configurações de Segurança
              </button>
            </form>
          </div>

        </div>
      )}

      {/* 1. GERENCIAMENTO DE CADASTROS */}
      {activeSubTab === 'cadastros' && (
        <div id="settings-cadastros-section" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Box left: Schools & Subjects & Classes */}
          <div className="space-y-6">
            
            {/* School Form */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <SchoolIcon className="w-4 h-4 text-blue-400" /> Cadastrar Escola
              </h3>
              
              <form onSubmit={handleAddSchool} className="flex gap-2">
                <input
                  id="add-school-input"
                  type="text"
                  required
                  placeholder="Nome da Escola (Ex: E.E. Cora Coralina)"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  id="submit-school-btn"
                  type="submit"
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Cadastrar
                </button>
              </form>

              {/* Schools List */}
              <div className="max-h-48 overflow-y-auto divide-y divide-zinc-800/60 bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-800">
                {schools.length === 0 ? (
                  <p className="text-[11px] text-zinc-500 text-center py-2">Nenhuma escola cadastrada.</p>
                ) : (
                  schools.map((sch) => (
                    <div key={sch.id} className="flex items-center justify-between py-1.5 text-xs text-zinc-300 gap-2">
                      {editingSchoolId === sch.id ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <input
                            type="text"
                            value={editingSchoolName}
                            onChange={(e) => setEditingSchoolName(e.target.value)}
                            className="bg-zinc-900 border border-zinc-750 text-zinc-200 text-[11px] rounded px-2 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={handleSaveEditSchool}
                            className="text-emerald-400 hover:text-emerald-300 p-1 cursor-pointer shrink-0"
                            title="Salvar"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSchoolId(undefined)}
                            className="text-zinc-400 hover:text-zinc-300 p-1 cursor-pointer shrink-0"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="truncate font-medium">{sch.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditSchool(sch)}
                              className="text-zinc-500 hover:text-blue-400 p-1 cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`delete-school-btn-${sch.id}`}
                              type="button"
                              onClick={() => handleDeleteSchool(sch.id!)}
                              className="text-zinc-500 hover:text-rose-400 p-1 cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Classes Form */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" /> Cadastrar Turma
              </h3>
              
              <form onSubmit={handleAddClass} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    id="add-class-school-select"
                    required
                    value={selectedSchoolIdForClass || ''}
                    onChange={(e) => setSelectedSchoolIdForClass(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-2.5 py-2 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="" className="bg-zinc-950">Escola Associada</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id} className="bg-zinc-950">{s.name}</option>
                    ))}
                  </select>

                  <input
                    id="add-class-name-input"
                    type="text"
                    required
                    placeholder="Nome (Ex: 1º Ano A)"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-2.5 py-2 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  id="submit-class-btn"
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Cadastrar Turma
                </button>
              </form>

              {/* Classes List */}
              <div className="max-h-48 overflow-y-auto divide-y divide-zinc-800/60 bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-800">
                {classes.length === 0 ? (
                  <p className="text-[11px] text-zinc-500 text-center py-2">Nenhuma turma cadastrada.</p>
                ) : (
                  classes.map((cls) => {
                    const sch = schools.find((s) => s.id === cls.schoolId);
                    return (
                      <div key={cls.id} className="flex items-center justify-between py-1.5 text-xs text-zinc-300 gap-2">
                        {editingClassId === cls.id ? (
                          <div className="flex flex-col gap-1 w-full p-1 bg-zinc-900/50 rounded-lg">
                            <input
                              type="text"
                              value={editingClassName}
                              onChange={(e) => setEditingClassName(e.target.value)}
                              className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-[11px] rounded px-2 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Nome da Turma"
                            />
                            <div className="flex items-center gap-1.5">
                              <select
                                value={editingClassSchoolId || ''}
                                onChange={(e) => setEditingClassSchoolId(e.target.value ? parseInt(e.target.value) : undefined)}
                                className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-[10px] rounded px-1.5 py-0.5 w-full focus:outline-none cursor-pointer"
                              >
                                <option value="">Escola Associada</option>
                                {schools.map((s) => (
                                  <option key={s.id} value={s.id} className="bg-zinc-950">{s.name}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={handleSaveEditClass}
                                className="text-emerald-400 hover:text-emerald-300 p-1 cursor-pointer shrink-0"
                                title="Salvar"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingClassId(undefined)}
                                className="text-zinc-400 hover:text-zinc-300 p-1 cursor-pointer shrink-0"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div>
                              <span className="font-medium">{cls.name}</span>
                              <span className="text-[10px] text-zinc-500 block">Escola: {sch?.name || '-'}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditClass(cls)}
                                className="text-zinc-500 hover:text-blue-400 p-1 cursor-pointer"
                                title="Editar"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id={`delete-class-btn-${cls.id}`}
                                type="button"
                                onClick={() => handleDeleteClass(cls.id!)}
                                className="text-zinc-500 hover:text-rose-400 p-1 cursor-pointer"
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Subjects Form */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" /> Cadastrar Disciplina
              </h3>
              
              <form onSubmit={handleAddSubject} className="flex gap-2">
                <input
                  id="add-subject-input"
                  type="text"
                  required
                  placeholder="Nome da Disciplina (Ex: Biologia)"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  id="submit-subject-btn"
                  type="submit"
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Cadastrar
                </button>
              </form>

              {/* Subjects List */}
              <div className="max-h-48 overflow-y-auto divide-y divide-zinc-800/60 bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-800">
                {subjects.length === 0 ? (
                  <p className="text-[11px] text-zinc-500 text-center py-2">Nenhuma disciplina cadastrada.</p>
                ) : (
                  subjects.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between py-1.5 text-xs text-zinc-300 gap-2">
                      {editingSubjectId === sub.id ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <input
                            type="text"
                            value={editingSubjectName}
                            onChange={(e) => setEditingSubjectName(e.target.value)}
                            className="bg-zinc-900 border border-zinc-750 text-zinc-200 text-[11px] rounded px-2 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={handleSaveEditSubject}
                            className="text-emerald-400 hover:text-emerald-300 p-1 cursor-pointer shrink-0"
                            title="Salvar"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSubjectId(undefined)}
                            className="text-zinc-400 hover:text-zinc-300 p-1 cursor-pointer shrink-0"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="truncate font-medium">{sub.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditSubject(sub)}
                              className="text-zinc-500 hover:text-blue-400 p-1 cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`delete-subject-btn-${sub.id}`}
                              type="button"
                              onClick={() => handleDeleteSubject(sub.id!)}
                              className="text-zinc-500 hover:text-rose-400 p-1 cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Box right: Students & Bulk Import (Filtered by school/class selection) */}
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" /> Cadastrar Alunos
              </h3>

              {/* Class Filters to add students */}
              <div className="grid grid-cols-2 gap-2 bg-zinc-950/50 p-2 rounded-xl border border-zinc-800/80">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase block">Escola</label>
                  <select
                    id="add-student-school-filter"
                    value={selectedSchoolIdForStudent || ''}
                    onChange={(e) => {
                      setSelectedSchoolIdForStudent(e.target.value ? parseInt(e.target.value) : undefined);
                      setSelectedClassIdForStudent(undefined);
                    }}
                    className="bg-transparent text-zinc-300 text-xs focus:outline-none w-full cursor-pointer"
                  >
                    <option value="" className="bg-zinc-950">Selecione</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id} className="bg-zinc-950">{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase block">Turma Destino</label>
                  <select
                    id="add-student-class-filter"
                    disabled={!selectedSchoolIdForStudent}
                    value={selectedClassIdForStudent || ''}
                    onChange={(e) => setSelectedClassIdForStudent(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="bg-transparent text-zinc-300 text-xs focus:outline-none w-full cursor-pointer disabled:opacity-40"
                  >
                    <option value="" className="bg-zinc-950">Selecione</option>
                    {classesBySchool.map((c) => (
                      <option key={c.id} value={c.id} className="bg-zinc-950">{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedClassIdForStudent ? (
                <div className="space-y-5 animate-in fade-in duration-150">
                  
                  {/* Single Student Form */}
                  <form onSubmit={handleAddStudent} className="space-y-3 p-3 bg-zinc-950/30 rounded-xl border border-zinc-800">
                    <p className="text-[11px] font-bold text-zinc-400">Adicionar Único Aluno</p>
                    <div className="flex gap-2">
                      <input
                        id="add-student-roll-input"
                        type="number"
                        placeholder="Nº"
                        value={newStudentRoll || ''}
                        onChange={(e) => setNewStudentRoll(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-2 py-2 w-16 text-center focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                      <input
                        id="add-student-name-input"
                        type="text"
                        required
                        placeholder="Nome Completo do Aluno"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                      <button
                        id="submit-student-btn"
                        type="submit"
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Inserir
                      </button>
                    </div>
                  </form>

                  {/* Bulk Student Textarea Import */}
                  <div className="space-y-2.5 p-3 bg-zinc-950/30 rounded-xl border border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Import className="w-4 h-4 text-emerald-400" />
                      <p className="text-[11px] font-bold text-zinc-400">Importar Lista Completa em Lote</p>
                    </div>
                    <p className="text-[10px] text-zinc-500">Escreva ou cole um nome de aluno por linha. A ordem de chamada consecutiva (1, 2, 3...) será gerada automaticamente:</p>
                    <textarea
                      id="bulk-students-textarea"
                      rows={4}
                      placeholder="Ana Beatriz Souza&#10;Bruno Henrique Lima&#10;Carlos Eduardo de Oliveira"
                      value={bulkStudentText}
                      onChange={(e) => setBulkStudentText(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl p-3.5 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                    />
                    <button
                      id="submit-bulk-students-btn"
                      type="button"
                      onClick={handleBulkImportStudents}
                      disabled={!bulkStudentText.trim()}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Import className="w-4 h-4" /> Carregar Alunos em Lote
                    </button>
                  </div>

                  {/* Students list */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Lista de Chamada ({studentsFiltered.length} alunos)</p>
                    <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800/60 bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-800">
                      {studentsFiltered.length === 0 ? (
                        <p className="text-xs text-zinc-500 text-center py-4">Nenhum aluno nesta sala.</p>
                      ) : (
                        studentsFiltered.map((st) => (
                          <div key={st.id} className="flex items-center justify-between py-2 text-xs text-zinc-300 gap-2">
                            {editingStudentId === st.id ? (
                              <div className="flex items-center gap-1.5 w-full">
                                <input
                                  type="number"
                                  value={editingStudentRoll || ''}
                                  onChange={(e) => setEditingStudentRoll(e.target.value ? parseInt(e.target.value) : undefined)}
                                  className="bg-zinc-900 border border-zinc-750 text-zinc-200 text-xs text-center rounded px-1.5 py-0.5 w-12 focus:outline-none"
                                  placeholder="Nº"
                                />
                                <input
                                  type="text"
                                  value={editingStudentName}
                                  onChange={(e) => setEditingStudentName(e.target.value)}
                                  className="bg-zinc-900 border border-zinc-750 text-zinc-200 text-xs rounded px-2 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="Nome"
                                />
                                <button
                                  type="button"
                                  onClick={handleSaveEditStudent}
                                  className="text-emerald-400 hover:text-emerald-300 p-1 cursor-pointer shrink-0"
                                  title="Salvar"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingStudentId(undefined)}
                                  className="text-zinc-400 hover:text-zinc-300 p-1 cursor-pointer shrink-0"
                                  title="Cancelar"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="font-mono text-zinc-500 w-8 shrink-0">#{st.rollNumber}</span>
                                <span className="font-semibold w-full truncate">{st.name}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditStudent(st)}
                                    className="text-zinc-500 hover:text-blue-400 p-1 cursor-pointer"
                                    title="Editar"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    id={`delete-student-btn-${st.id}`}
                                    type="button"
                                    onClick={() => handleDeleteStudent(st.id!)}
                                    className="text-zinc-500 hover:text-rose-400 p-1 cursor-pointer"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-xl">
                  Selecione uma Escola e Turma acima para cadastrar alunos.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* 2. HORÁRIO SEMANAL & CARGAS */}
      {activeSubTab === 'grade' && (
        <div id="settings-grade-section" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Carga Horaria Form */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-400" /> Configurar Cargas Horárias de Matérias
            </h3>
            <p className="text-xs text-zinc-400">Determine o total de aulas planejadas para uma disciplina em uma determinada turma:</p>

            <form onSubmit={handleAddWorkload} className="space-y-3 bg-zinc-950/20 p-3 rounded-xl border border-zinc-800">
              <div className="grid grid-cols-2 gap-2">
                <select
                  id="add-workload-class-select"
                  required
                  value={selectedClassIdForWorkload || ''}
                  onChange={(e) => setSelectedClassIdForWorkload(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-2.5 py-2 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-zinc-950">Turma</option>
                  {classes.map((c) => {
                    const sch = schools.find((s) => s.id === c.schoolId);
                    return <option key={c.id} value={c.id} className="bg-zinc-950">{c.name} ({sch?.name.substring(0, 10)})</option>;
                  })}
                </select>

                <select
                  id="add-workload-subject-select"
                  required
                  value={selectedSubjectIdForWorkload || ''}
                  onChange={(e) => setSelectedSubjectIdForWorkload(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-2.5 py-2 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-zinc-950">Disciplina</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id} className="bg-zinc-950">{sub.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-medium">Total de Aulas Planejadas no Ano (Carga Horária)</label>
                <input
                  id="add-workload-lessons-input"
                  type="number"
                  required
                  value={workloadLessons}
                  onChange={(e) => setWorkloadLessons(parseInt(e.target.value) || 0)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                id="submit-workload-btn"
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Salvar Carga Horária
              </button>
            </form>

            {/* List current workloads */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Cargas Cadastradas</p>
              <div className="max-h-52 overflow-y-auto divide-y divide-zinc-800/60 bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-800">
                {workloads.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-2">Nenhuma carga cadastrada.</p>
                ) : (
                  workloads.map((wl) => {
                    const c = classes.find((cl) => cl.id === wl.classId);
                    const sub = subjects.find((s) => s.id === wl.subjectId);
                    return (
                      <div key={wl.id} className="flex items-center justify-between py-2 text-xs text-zinc-300 gap-2">
                        {editingWorkloadId === wl.id ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <div className="text-left w-full truncate">
                              <span className="font-semibold text-zinc-200 block truncate">{sub?.name || '-'}</span>
                              <span className="text-[10px] text-zinc-500 block truncate">Turma: {c?.name || '-'}</span>
                            </div>
                            <input
                              type="number"
                              value={editingWorkloadLessons}
                              onChange={(e) => setEditingWorkloadLessons(parseInt(e.target.value) || 0)}
                              className="bg-zinc-900 border border-zinc-750 text-zinc-200 text-xs rounded px-1.5 py-0.5 w-16 text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="h/aula"
                            />
                            <button
                              type="button"
                              onClick={handleSaveEditWorkload}
                              className="text-emerald-400 hover:text-emerald-300 p-1 cursor-pointer shrink-0"
                              title="Salvar"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingWorkloadId(undefined)}
                              className="text-zinc-400 hover:text-zinc-300 p-1 cursor-pointer shrink-0"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div>
                              <span className="font-semibold text-zinc-200">{sub?.name || '-'}</span>
                              <span className="text-[10px] text-zinc-550 block">Turma: {c?.name || '-'}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono font-bold bg-zinc-900 px-2 py-1 rounded text-blue-400 text-[10px]">
                                {wl.totalLessons} h/aula
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStartEditWorkload(wl)}
                                className="text-zinc-500 hover:text-blue-400 p-1 cursor-pointer"
                                title="Editar"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id={`delete-workload-btn-${wl.id}`}
                                type="button"
                                onClick={() => handleDeleteWorkload(wl.id!)}
                                className="text-zinc-500 hover:text-rose-400 cursor-pointer p-1"
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Horario de Aulas Weekly Schedule */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" /> Grade Horária Semanal
            </h3>

            <form onSubmit={handleAddSchedule} className="space-y-3 bg-zinc-950/20 p-3 rounded-xl border border-zinc-800">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 uppercase font-bold">Dia da Semana</label>
                  <select
                    id="add-sched-day-select"
                    required
                    value={schedDay}
                    onChange={(e) => setSchedDay(parseInt(e.target.value))}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-2.5 py-2 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value={1} className="bg-zinc-950">Segunda-feira</option>
                    <option value={2} className="bg-zinc-950">Terça-feira</option>
                    <option value={3} className="bg-zinc-950">Quarta-feira</option>
                    <option value={4} className="bg-zinc-950">Quinta-feira</option>
                    <option value={5} className="bg-zinc-950">Sexta-feira</option>
                    <option value={6} className="bg-zinc-950">Sábado</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 uppercase font-bold">Faixa de Horário</label>
                  <input
                    id="add-sched-time-input"
                    type="text"
                    required
                    placeholder="Ex: 07:00 - 07:50"
                    value={schedTime}
                    onChange={(e) => setSchedTime(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-2.5 py-2 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <select
                    id="add-sched-school-select"
                    required
                    value={schedSchool || ''}
                    onChange={(e) => {
                      setSchedSchool(e.target.value ? parseInt(e.target.value) : undefined);
                      setSchedClass(undefined);
                    }}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-2.5 py-2 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="" className="bg-zinc-950">Escola</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id} className="bg-zinc-950">{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    id="add-sched-class-select"
                    required
                    disabled={!schedSchool}
                    value={schedClass || ''}
                    onChange={(e) => setSchedClass(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-2.5 py-2 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-40 cursor-pointer"
                  >
                    <option value="" className="bg-zinc-950">Turma</option>
                    {classes.filter(c => c.schoolId === schedSchool).map((c) => (
                      <option key={c.id} value={c.id} className="bg-zinc-950">{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    id="add-sched-subject-select"
                    required
                    value={schedSubject || ''}
                    onChange={(e) => setSchedSubject(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-2.5 py-2 w-full focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="" className="bg-zinc-950">Componente</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id} className="bg-zinc-950">{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                id="submit-sched-btn"
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Adicionar Aula à Grade
              </button>
            </form>

            {/* List scheds */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Aulas Agendadas</p>
              <div className="max-h-52 overflow-y-auto divide-y divide-zinc-800/60 bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-800">
                {weeklySchedules.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-2">Nenhum agendamento na grade semanal.</p>
                ) : (
                  weeklySchedules.map((ws) => {
                    const sch = schools.find((s) => s.id === ws.schoolId);
                    const cl = classes.find((c) => c.id === ws.classId);
                    const sub = subjects.find((s) => s.id === ws.subjectId);
                    return (
                      <div key={ws.id} className="flex items-center justify-between py-2 text-xs text-zinc-300">
                        <div>
                          <span className="font-semibold text-zinc-200">{getDayName(ws.dayOfWeek)} às {ws.timeSlot}</span>
                          <span className="text-[10px] text-zinc-500 block">
                            {cl?.name} - {sub?.name} ({sch?.name.substring(0, 10)})
                          </span>
                        </div>
                        <button
                          id={`delete-sched-btn-${ws.id}`}
                          type="button"
                          onClick={() => handleDeleteSchedule(ws.id!)}
                          className="text-zinc-500 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 3. BACKUP & RESTAURAR */}
      {activeSubTab === 'backup' && (
        <div id="settings-backup-section" className="max-w-3xl space-y-6">
          
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-400" /> Ferramenta de Backup Local Unificado (JSON)
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              O Portal do Professor armazena todos os diários escolares e notas diretamente no seu navegador utilizando IndexedDB de alta performance. Para garantir a segurança dos seus lançamentos contra limpezas involuntárias de cache do navegador ou para migrar seus dados para outro celular ou computador, faça backups regulares!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-zinc-800/80">
              
              {/* EXPORT PANEL */}
              <div className="p-4 bg-zinc-950/40 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex items-center gap-2 text-blue-400">
                  <Download className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Exportar Banco</h4>
                </div>
                <p className="text-[11px] text-zinc-500">Gera um arquivo unificado contendo todas as escolas, turmas, alunos, notas, diário de presença, e histórico de vistos.</p>
                <button
                  id="export-backup-btn"
                  type="button"
                  onClick={handleExportBackup}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Baixar Backup (.json)
                </button>
              </div>

              {/* IMPORT PANEL */}
              <div className="p-4 bg-zinc-950/40 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex items-center gap-2 text-amber-500">
                  <Upload className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Restaurar Backup</h4>
                </div>
                <p className="text-[11px] text-zinc-500">Sobrescreve e restaura com segurança todos os seus diários. Esta ação é imediata e irreversível.</p>
                
                <label className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer text-center">
                  <Upload className="w-4 h-4" />
                  <span>Selecionar Arquivo JSON</span>
                  <input
                    id="import-backup-file-input"
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>

            </div>
          </div>

          {/* Demonstration / Seeds Utilities */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" /> Diários de Demonstração
            </h3>
            <p className="text-xs text-zinc-400">
              Caso esteja testando o aplicativo pela primeira vez ou queira restaurar as turmas de exemplo do professor, clique no botão abaixo para semear dados de teste completos:
            </p>
            <button
              id="load-demo-data-btn"
              type="button"
              onClick={handleLoadDemoData}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-yellow-400 border border-yellow-500/20 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4" /> Carregar Dados de Demonstração
            </button>
          </div>

        </div>
      )}

      {/* Diálogo de Confirmação Customizado */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-amber-500">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-white font-bold text-base">{confirmDialog.title}</h3>
            </div>
            <p className="text-zinc-300 text-xs leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                {confirmDialog.cancelText || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-lg shadow-rose-900/20"
              >
                {confirmDialog.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de Alerta Customizado */}
      {alertDialog && alertDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-emerald-400">
              <Check className="w-5 h-5 shrink-0 bg-emerald-500/10 p-1 rounded-full" />
              <h3 className="text-white font-bold text-base">{alertDialog.title}</h3>
            </div>
            <p className="text-zinc-300 text-xs leading-relaxed">
              {alertDialog.message}
            </p>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  if (alertDialog.onClose) {
                    alertDialog.onClose();
                  }
                  setAlertDialog(null);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-lg shadow-blue-900/20"
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
