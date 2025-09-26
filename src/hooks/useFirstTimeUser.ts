import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_TIME_USER_KEY = 'hasSeenWelcome';

export const useFirstTimeUser = () => {
  const [isFirstTime, setIsFirstTime] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkFirstTime = async () => {
      try {
        const hasSeenWelcome = await AsyncStorage.getItem(FIRST_TIME_USER_KEY);
        if (hasSeenWelcome === 'true') {
          setIsFirstTime(false);
        }
      } catch (error) {
        console.log('Error checking first time user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkFirstTime();
  }, []);

  const markWelcomeComplete = async () => {
    try {
      console.log('markWelcomeComplete called - saving to AsyncStorage and going to main app');
      await AsyncStorage.setItem(FIRST_TIME_USER_KEY, 'true');
      setIsFirstTime(false);
      console.log('Welcome marked complete, isFirstTime set to false');
    } catch (error) {
      console.log('Error marking welcome complete:', error);
    }
  };

  const resetFirstTimeUser = async () => {
    try {
      await AsyncStorage.removeItem(FIRST_TIME_USER_KEY);
      setIsFirstTime(true);
    } catch (error) {
      console.log('Error resetting first time user:', error);
    }
  };

  return {
    isFirstTime,
    isLoading,
    markWelcomeComplete,
    resetFirstTimeUser
  };
};