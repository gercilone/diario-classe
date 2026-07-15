import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Helper to remove any 'undefined' fields recursively so Firestore never crashes
export function cleanDataForFirestore(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanDataForFirestore(item));
  }
  if (typeof obj === 'object') {
    if (obj instanceof Date) {
      return obj;
    }
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = cleanDataForFirestore(val);
      }
    }
    return cleaned;
  }
  return obj;
}

// Lazy safe Firestore initialization
let firestoreInstance: any = null;

export function getFirestoreInstance() {
  if (firestoreInstance) return firestoreInstance;
  try {
    if (!firebaseConfig || !firebaseConfig.apiKey) {
      console.warn('Firebase configuration is missing or invalid. Offline mode active.');
      return null;
    }
    const app = initializeApp(firebaseConfig);
    firestoreInstance = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId || '(default)');
    return firestoreInstance;
  } catch (error) {
    console.error('Failed to initialize Firebase / Firestore:', error);
    return null;
  }
}

// Interface for Professor account matching App.tsx
export interface ProfessorAccount {
  username: string;
  password:  string;
  teacherName: string;
  dbName: string;
  passwordHint?: string;
  securityQuestion?: string;
  securityAnswer?: string;
  authEnabled: boolean;
}

// 1. PROFESSORS PROFILES SYNC (Cloud Database Shared Registry)
export async function syncProfessorsListInCloud() {
  const dbInstance = getFirestoreInstance();
  if (!dbInstance) {
    const localStr = localStorage.getItem('portal_professors_list');
    return localStr ? JSON.parse(localStr) : [];
  }

  try {
    // A. Pull latest professors list from cloud
    const professorsCol = collection(dbInstance, 'professors');
    const snapshot = await getDocs(professorsCol);
    const cloudList: ProfessorAccount[] = [];
    
    snapshot.forEach((doc) => {
      cloudList.push(doc.data() as ProfessorAccount);
    });

    // B. Merge with local professors list
    const localStr = localStorage.getItem('portal_professors_list');
    let localList: ProfessorAccount[] = [];
    if (localStr) {
      try {
        localList = JSON.parse(localStr);
      } catch (e) {
        console.error('Error parsing local professors list:', e);
      }
    }

    const mergedMap = new Map<string, ProfessorAccount>();
    localList.forEach(p => mergedMap.set(p.username.toLowerCase(), p));
    cloudList.forEach(p => mergedMap.set(p.username.toLowerCase(), p));

    const mergedList = Array.from(mergedMap.values());
    localStorage.setItem('portal_professors_list', JSON.stringify(mergedList));

    // C. Upload any local profiles that aren't in the cloud yet
    for (const localProf of localList) {
      const usernameLower = localProf.username.toLowerCase();
      const existsInCloud = cloudList.some(p => p.username.toLowerCase() === usernameLower);
      if (!existsInCloud) {
        const cleanedProf = cleanDataForFirestore(localProf);
        await setDoc(doc(dbInstance, 'professors', usernameLower), cleanedProf);
      }
    }

    return mergedList;
  } catch (error) {
    console.error('Error syncing professors list with cloud:', error);
    const localStr = localStorage.getItem('portal_professors_list');
    return localStr ? JSON.parse(localStr) : [];
  }
}

// Save a single professor account to the cloud
export async function saveProfessorToCloud(prof: ProfessorAccount) {
  const dbInstance = getFirestoreInstance();
  if (!dbInstance) return;

  try {
    const usernameLower = prof.username.toLowerCase();
    const cleanedProf = cleanDataForFirestore(prof);
    await setDoc(doc(dbInstance, 'professors', usernameLower), cleanedProf);
  } catch (error) {
    console.error('Error saving professor to cloud:', error);
  }
}

// 2. DIARY DATA SYNCHRONIZATION
const TABLES_TO_SYNC = [
  'schools',
  'classes',
  'subjects',
  'students',
  'subjectWorkloads',
  'weeklySchedule',
  'bimonthlyGrades',
  'assignmentDescriptions',
  'lessons',
  'attendance',
  'vistoColumns',
  'studentVistos',
  'vistoRankingScores',
  'extraGrades'
];

// Pull all diary data from cloud for a specific professor and save to Dexie
export async function pullTeacherDataFromCloud(username: string, dexieDb: any): Promise<boolean> {
  if (!username) return false;
  const dbInstance = getFirestoreInstance();
  if (!dbInstance) return false;

  // Disable sync hooks globally so we don't trigger deletion / set actions on Dexie writes
  (window as any).isCloudSyncDisabled = true;
  try {
    const userLower = username.toLowerCase();
    
    for (const tableName of TABLES_TO_SYNC) {
      const colRef = collection(dbInstance, `diaries/${userLower}/${tableName}`);
      const snapshot = await getDocs(colRef);
      
      const records: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const id = isNaN(Number(doc.id)) ? doc.id : Number(doc.id);
        records.push({ ...data, id });
      });

      // Clear local table and write cloud records
      if (dexieDb[tableName]) {
        await dexieDb[tableName].clear();
        if (records.length > 0) {
          await dexieDb[tableName].bulkAdd(records);
        }
      }
    }
    return true;
  } catch (error) {
    console.error(`Error pulling diary data for ${username}:`, error);
    return false;
  } finally {
    (window as any).isCloudSyncDisabled = false;
  }
}

// Push all local diary data to cloud (Full Backup/Override)
export async function pushTeacherDataToCloud(username: string, dexieDb: any): Promise<boolean> {
  if (!username) return false;
  const dbInstance = getFirestoreInstance();
  if (!dbInstance) return false;

  try {
    const userLower = username.toLowerCase();

    for (const tableName of TABLES_TO_SYNC) {
      if (!dexieDb[tableName]) continue;
      
      const localRecords = await dexieDb[tableName].toArray();
      const colPath = `diaries/${userLower}/${tableName}`;

      let batch = writeBatch(dbInstance);
      let opCount = 0;

      for (const record of localRecords) {
        if (!record.id) continue;
        const docRef = doc(dbInstance, colPath, String(record.id));
        const cleanedRecord = cleanDataForFirestore(record);
        batch.set(docRef, cleanedRecord);
        opCount++;

        if (opCount === 400) {
          await batch.commit();
          batch = writeBatch(dbInstance);
          opCount = 0;
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }
    }
    return true;
  } catch (error) {
    console.error(`Error pushing diary data for ${username}:`, error);
    return false;
  }
}

// Push a single record change (used by the Dexie auto-sync hook)
export async function syncSingleRecord(
  username: string,
  tableName: string,
  recordId: string | number,
  recordData: any,
  action: 'set' | 'delete'
) {
  if (!username || !tableName || !recordId) return;
  const dbInstance = getFirestoreInstance();
  if (!dbInstance) return;

  try {
    const userLower = username.toLowerCase();
    const docRef = doc(dbInstance, `diaries/${userLower}/${tableName}`, String(recordId));
    
    if (action === 'delete') {
      await deleteDoc(docRef);
    } else {
      const cleanedData = cleanDataForFirestore(recordData);
      await setDoc(docRef, cleanedData);
    }
  } catch (error) {
    console.error(`Error syncing single record on ${tableName}:`, error);
  }
}

// 3. COORDINATORS SYNC & MANAGEMENT
export interface CoordinatorAccount {
  username: string;
  password:  string;
  name: string;
}

export async function syncCoordinatorsListInCloud(): Promise<CoordinatorAccount[]> {
  const dbInstance = getFirestoreInstance();
  const defaultCoordsList = [
    { username: 'coordenador', password: '123', name: 'Coordenador Geral' },
    { username: 'admin', password: 'admin', name: 'Administrador Geral' },
    { username: 'administrador', password: 'administrador', name: 'Administrador Geral' }
  ];

  if (!dbInstance) {
    const localStr = localStorage.getItem('portal_coordinators_list');
    if (localStr) return JSON.parse(localStr);
    return defaultCoordsList;
  }

  try {
    const coordsCol = collection(dbInstance, 'coordinators');
    const snapshot = await getDocs(coordsCol);
    const cloudList: CoordinatorAccount[] = [];
    
    snapshot.forEach((doc) => {
      cloudList.push(doc.data() as CoordinatorAccount);
    });

    if (cloudList.length === 0) {
      for (const dCoord of defaultCoordsList) {
        await saveCoordinatorToCloud(dCoord);
        cloudList.push(dCoord);
      }
    }

    localStorage.setItem('portal_coordinators_list', JSON.stringify(cloudList));
    return cloudList;
  } catch (error) {
    console.error('Error syncing coordinators list with cloud:', error);
    const localStr = localStorage.getItem('portal_coordinators_list');
    if (localStr) {
      return JSON.parse(localStr);
    }
    return defaultCoordsList;
  }
}

export async function saveCoordinatorToCloud(coord: CoordinatorAccount) {
  const dbInstance = getFirestoreInstance();
  if (!dbInstance) return;

  try {
    const usernameLower = coord.username.toLowerCase();
    const cleanedCoord = cleanDataForFirestore(coord);
    await setDoc(doc(dbInstance, 'coordinators', usernameLower), cleanedCoord);
  } catch (error) {
    console.error('Error saving coordinator to cloud:', error);
  }
}

export async function deleteCoordinatorFromCloud(username: string) {
  const dbInstance = getFirestoreInstance();
  if (!dbInstance) return;

  try {
    const usernameLower = username.toLowerCase();
    await deleteDoc(doc(dbInstance, 'coordinators', usernameLower));
  } catch (error) {
    console.error('Error deleting coordinator from cloud:', error);
  }
}

export async function deleteProfessorFromCloud(username: string) {
  const dbInstance = getFirestoreInstance();
  if (!dbInstance) return;

  try {
    const usernameLower = username.toLowerCase();
    await deleteDoc(doc(dbInstance, 'professors', usernameLower));
  } catch (error) {
    console.error('Error deleting professor from cloud:', error);
  }
}
