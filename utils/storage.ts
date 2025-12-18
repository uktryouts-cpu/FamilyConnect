
import { FamilyMember, UserProfile } from '../types';
import CryptoJS from 'crypto-js';

const STORAGE_KEY = 'familyconnect_vault_v4';
const USER_PROFILE_KEY = 'familyconnect_user_profile_v4';

const encrypt = (data: any, key: string): string => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
};

const decrypt = (ciphertext: string, key: string): any => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedData);
  } catch (e) {
    return null;
  }
};

export const saveFamilyData = (members: FamilyMember[], key: string) => {
  if (!key) return;
  try {
    const encrypted = encrypt(members, key);
    localStorage.setItem(STORAGE_KEY, encrypted);
  } catch (e) {
    console.error("Vault save failed", e);
  }
};

export const saveUserProfile = (profile: UserProfile) => {
  try {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error("Profile save failed", e);
  }
};

export const loadUserProfile = (): UserProfile => {
  try {
    const data = localStorage.getItem(USER_PROFILE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {}
  return {
    username: '',
    location: '',
    language: 'English',
    avatarUrl: ''
  };
};

export const loadFamilyData = (key: string): FamilyMember[] | null => {
  try {
    const encrypted = localStorage.getItem(STORAGE_KEY);
    if (!encrypted) return null;
    return decrypt(encrypted, key);
  } catch (e) {
    return null;
  }
};

export const hasVault = (): boolean => {
  return !!localStorage.getItem(STORAGE_KEY);
};
