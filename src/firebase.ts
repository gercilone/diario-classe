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

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with Custom Database ID
export const firestore = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId || '(default)');

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
// This ensures any teacher registered on any device shows up on all devices in the selector.
export async function syncProfessorsListInCloud() {
  try {
    // A. Pull latest professors list from cloud
    const professorsCol = collection(firestore, 'professors');
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

    // Use a map to merge. Cloud profiles take precedence unless local has newer info (but for simplicity, we merge by username)
    const mergedMap = new Map<string, ProfessorAccount>();
    
    // Add local ones first
    localList.forEach(p => mergedMap.set(p.username.toLowerCase(), p));
    
    // Override/add cloud ones
    cloudList.forEach(p => mergedMap.set(p.username.toLowerCase(), p));

    const mergedList = Array.from(mergedMap.values());
    localStorage.setItem('portal_professors_list', JSON.stringify(mergedList));

    // C. Upload any local profiles that aren't in the cloud yet
    for (const localProf of localList) {
      const usernameLower = localProf.username.toLowerCase();
      const existsInCloud = cloudList.some(p => p.username.toLowerCase() === usernameLower);
      if (!existsInCloud) {
        await setDoc(doc(firestore, 'professors', usernameLower), localProf);
      }
    }

    return mergedList;
  } catch (error) {
    console.error('Error syncing professors list with cloud:', error);
    // Return local list as fallback
    const localStr = localStorage.getItem('portal_professors_list');
    return localStr ? JSON.parse(localStr) : [];
  }
}

// Save a single professor account to the cloud
export async function saveProfessorToCloud(prof: ProfessorAccount) {
  try {
    const usernameLower = prof.username.toLowerCase();
    await setDoc(doc(firestore, 'professors', usernameLower), prof);
  } catch (error) {
    console.error('Error saving professor to cloud:', error);
  }
}


// 2. DIARY DATA SYNCHRONIZATION
// We sync all Dexie tables to diaries/{username}/{tableName}/{docId}

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
  try {
    const userLower = username.toLowerCase();
    
    for (const tableName of TABLES_TO_SYNC) {
      const colRef = collection(firestore, `diaries/${userLower}/${tableName}`);
      const snapshot = await getDocs(colRef);
      
      const records: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Convert document ID back to number if it's numeric
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
  }
}

// Push all local diary data to cloud (Full Backup/Override)
export async function pushTeacherDataToCloud(username: string, dexieDb: any): Promise<boolean> {
  if (!username) return false;
  try {
    const userLower = username.toLowerCase();

    for (const tableName of TABLES_TO_SYNC) {
      if (!dexieDb[tableName]) continue;
      
      const localRecords = await dexieDb[tableName].toArray();
      const colPath = `diaries/${userLower}/${tableName}`;

      // We can use batch writes to make this efficient
      // Firestore batch supports up to 500 operations
      let batch = writeBatch(firestore);
      let opCount = 0;

      for (const record of localRecords) {
        if (!record.id) continue;
        const docRef = doc(firestore, colPath, String(record.id));
        batch.set(docRef, record);
        opCount++;

        if (opCount === 400) {
          await batch.commit();
          batch = writeBatch(firestore);
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
  try {
    const userLower = username.toLowerCase();
    const docRef = doc(firestore, `diaries/${userLower}/${tableName}`, String(recordId));
    
    if (action === 'delete') {
      await deleteDoc(docRef);
    } else {
      await setDoc(docRef, recordData);
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
  try {
    const coordsCol = collection(firestore, 'coordinators');
    const snapshot = await getDocs(coordsCol);
    const cloudList: CoordinatorAccount[] = [];
    
    snapshot.forEach((doc) => {
      cloudList.push(doc.data() as CoordinatorAccount);
    });

    // Ensure both default coordinator AND master admin are present in the cloud list
    const hasCoordenador = cloudList.some(c => c.username.toLowerCase() === 'coordenador');
    const hasAdmin = cloudList.some(c => c.username.toLowerCase() === 'admin');

    if (!hasCoordenador) {
      const defaultCoord: CoordinatorAccount = {
        username: 'coordenador',
        password: '123',
        name: 'Coordenador Geral'
      };
      await saveCoordinatorToCloud(defaultCoord);
      cloudList.push(defaultCoord);
    }

    if (!hasAdmin) {
      const adminCoord: CoordinatorAccount = {
        username: 'admin',
        password: 'admin',
        name: 'Administrador Geral'
      };
      await saveCoordinatorToCloud(adminCoord);
      cloudList.push(adminCoord);
    }

    localStorage.setItem('portal_coordinators_list', JSON.stringify(cloudList));
    return cloudList;
  } catch (error) {
    console.error('Error syncing coordinators list with cloud:', error);
    const localStr = localStorage.getItem('portal_coordinators_list');
    if (localStr) {
      return JSON.parse(localStr);
    }
    // Final fallback
    return [
      { username: 'coordenador', password: '123', name: 'Coordenador Geral' },
      { username: 'admin', password: 'admin', name: 'Administrador Geral' }
    ];
  }
}

export async function saveCoordinatorToCloud(coord: CoordinatorAccount) {
  try {
    const usernameLower = coord.username.toLowerCase();
    await setDoc(doc(firestore, 'coordinators', usernameLower), coord);
  } catch (error) {
    console.error('Error saving coordinator to cloud:', error);
  }
}

export async function deleteCoordinatorFromCloud(username: string) {
  try {
    const usernameLower = username.toLowerCase();
    await deleteDoc(doc(firestore, 'coordinators', usernameLower));
  } catch (error) {
    console.error('Error deleting coordinator from cloud:', error);
  }
}

export async function deleteProfessorFromCloud(username: string) {
  try {
    const usernameLower = username.toLowerCase();
    await deleteDoc(doc(firestore, 'professors', usernameLower));
  } catch (error) {
    console.error('Error deleting professor from cloud:', error);
  }
}

