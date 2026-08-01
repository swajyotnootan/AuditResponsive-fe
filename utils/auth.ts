// // utils/auth.ts
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const AUTH_TOKEN_KEY = 'authToken';
// const USER_EMAIL_KEY = 'userEmail';
// const USER_NAME_KEY = 'userName';

// // Store user data after login
// export const storeUserData = async (token: string, email: string, name: string = '') => {
//   try {
//     await AsyncStorage.multiSet([
//       [AUTH_TOKEN_KEY, token],
//       [USER_EMAIL_KEY, email],
//       [USER_NAME_KEY, name],
//     ]);
//     return true;
//   } catch (error) {
//     console.error('Error storing user data:', error);
//     return false;
//   }
// };

// // Get auth token
// export const getAuthToken = async (): Promise<string | null> => {
//   try {
//     return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
//   } catch (error) {
//     console.error('Error getting auth token:', error);
//     return null;
//   }
// };

// // Get user email
// export const getUserEmail = async (): Promise<string | null> => {
//   try {
//     return await AsyncStorage.getItem(USER_EMAIL_KEY);
//   } catch (error) {
//     console.error('Error getting user email:', error);
//     return null;
//   }
// };

// // Get user name
// export const getUserName = async (): Promise<string | null> => {
//   try {
//     return await AsyncStorage.getItem(USER_NAME_KEY);
//   } catch (error) {
//     console.error('Error getting user name:', error);
//     return null;
//   }
// };

// // Check if user is authenticated
// export const isAuthenticated = async (): Promise<boolean> => {
//   try {
//     const token = await getAuthToken();
//     return !!token;
//   } catch (error) {
//     return false;
//   }
// };

// // Clear user data (logout)
// export const clearUserData = async (): Promise<boolean> => {
//   try {
//     await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_EMAIL_KEY, USER_NAME_KEY]);
//     return true;
//   } catch (error) {
//     console.error('Error clearing user data:', error);
//     return false;
//   }
// };

// // Get all user data
// export const getUserData = async () => {
//   try {
//     const [token, email, name] = await AsyncStorage.multiGet([
//       AUTH_TOKEN_KEY,
//       USER_EMAIL_KEY,
//       USER_NAME_KEY,
//     ]);
//     return {
//       token: token[1],
//       email: email[1],
//       name: name[1],
//     };
//   } catch (error) {
//     console.error('Error getting user data:', error);
//     return null;
//   }
// };