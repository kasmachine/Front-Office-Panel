import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { CashCountData, ReceiptSubstituteData } from '../types';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId if specified in config
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

// Anonymous Auth Helper
export const initAuth = (): Promise<User | null> => {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        resolve(user);
      } else {
        try {
          const userCred = await signInAnonymously(auth);
          resolve(userCred.user);
        } catch (err) {
          console.error('Anonymous auth failed:', err);
          resolve(null);
        }
      }
    });
  });
};

// Collections
const CASH_COUNTS_COLLECTION = 'cash_counts';
const RECEIPTS_COLLECTION = 'receipt_substitutes';

/**
 * Save Cash Count Record to Firebase Firestore
 */
export async function saveCashCountToFirebase(data: CashCountData): Promise<string> {
  await initAuth();
  const docId = data.id || `cash-${Date.now()}`;
  const docRef = doc(db, CASH_COUNTS_COLLECTION, docId);
  const payload = {
    ...data,
    id: docId,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, payload, { merge: true });
  return docId;
}

/**
 * Realtime listener for Cash Count Records from Firestore
 */
export function subscribeCashCounts(callback: (items: CashCountData[]) => void) {
  const q = query(collection(db, CASH_COUNTS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: CashCountData[] = snapshot.docs.map((d) => d.data() as CashCountData);
    callback(list);
  }, (err) => {
    console.warn('Firestore subscription warning:', err);
  });
}

/**
 * Fetch all Cash Counts from Firestore
 */
export async function fetchCashCountsFromFirebase(): Promise<CashCountData[]> {
  await initAuth();
  try {
    const q = query(collection(db, CASH_COUNTS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as CashCountData);
  } catch (err) {
    console.error('Error fetching cash counts:', err);
    return [];
  }
}

/**
 * Delete Cash Count from Firestore
 */
export async function deleteCashCountFromFirebase(docId: string): Promise<void> {
  await initAuth();
  const docRef = doc(db, CASH_COUNTS_COLLECTION, docId);
  await deleteDoc(docRef);
}

/**
 * Save Receipt Substitute Record to Firebase Firestore
 */
export async function saveReceiptToFirebase(data: ReceiptSubstituteData): Promise<string> {
  await initAuth();
  const docId = data.id || `receipt-${Date.now()}`;
  const docRef = doc(db, RECEIPTS_COLLECTION, docId);
  const payload = {
    ...data,
    id: docId,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, payload, { merge: true });
  return docId;
}

/**
 * Realtime listener for Receipt Substitute Records from Firestore
 */
export function subscribeReceipts(callback: (items: ReceiptSubstituteData[]) => void) {
  const q = query(collection(db, RECEIPTS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: ReceiptSubstituteData[] = snapshot.docs.map((d) => d.data() as ReceiptSubstituteData);
    callback(list);
  }, (err) => {
    console.warn('Firestore subscription warning:', err);
  });
}

/**
 * Fetch all Receipts from Firestore
 */
export async function fetchReceiptsFromFirebase(): Promise<ReceiptSubstituteData[]> {
  await initAuth();
  try {
    const q = query(collection(db, RECEIPTS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as ReceiptSubstituteData);
  } catch (err) {
    console.error('Error fetching receipts:', err);
    return [];
  }
}

/**
 * Delete Receipt Substitute from Firestore
 */
export async function deleteReceiptFromFirebase(docId: string): Promise<void> {
  await initAuth();
  const docRef = doc(db, RECEIPTS_COLLECTION, docId);
  await deleteDoc(docRef);
}
