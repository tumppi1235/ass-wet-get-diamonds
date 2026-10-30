import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRandomBytesAsync } from 'expo-crypto';
import { LocalAccounts } from './local-accounts';
export const accounts = new LocalAccounts(AsyncStorage, getRandomBytesAsync);
