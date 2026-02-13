import { useState, useEffect, useCallback } from 'react';

const PROFILES_KEY = 'orbit-user-profiles';

/**
 * Default profile structure for new users
 */
const createDefaultProfile = (walletAddress, role = null) => ({
  walletAddress,
  role: role, // 'creator' | 'subscriber' | null
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  
  // Common profile fields
  displayName: '',
  bio: '',
  avatar: null,
  
  // Social links (mainly for creators but subscribers can have too)
  socialLinks: {
    twitter: '',
    youtube: '',
    discord: '',
    telegram: '',
    website: '',
  },
  
  // Creator-specific fields
  creatorData: {
    category: '',
    verified: false,
    tiers: [],
    stats: {
      subscribers: 0,
      totalEarnings: 0,
    },
  },
  
  // Subscriber-specific fields
  subscriberData: {
    favoriteCreators: [],
    totalSpent: 0,
  },
  
  // Preferences
  preferences: {
    notifications: true,
    currency: 'USD',
    theme: 'dark',
  },
});

/**
 * useUserProfile - Hook to manage user profiles keyed by wallet address
 * 
 * Features:
 * - Auto-loads profile when wallet connects
 * - Persists to localStorage
 * - Supports both creator and subscriber roles
 * - Profile is tied to wallet address, not browser
 */
function useUserProfile(walletAddress) {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allProfiles, setAllProfiles] = useState({});

  // Load all profiles from localStorage
  const loadAllProfiles = useCallback(() => {
    try {
      const saved = localStorage.getItem(PROFILES_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (err) {
      console.error('Failed to load profiles:', err);
      return {};
    }
  }, []);

  // Save all profiles to localStorage
  const saveAllProfiles = useCallback((profiles) => {
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
      setAllProfiles(profiles);
    } catch (err) {
      console.error('Failed to save profiles:', err);
    }
  }, []);

  // Load profile for current wallet
  useEffect(() => {
    setIsLoading(true);
    const profiles = loadAllProfiles();
    setAllProfiles(profiles);

    if (walletAddress) {
      const existingProfile = profiles[walletAddress];
      if (existingProfile) {
        // Profile exists - load it
        setProfile(existingProfile);
        console.log('📋 Profile loaded for', walletAddress.slice(0, 8));
      } else {
        // No profile yet - will be null until created
        setProfile(null);
      }
    } else {
      setProfile(null);
    }
    
    setIsLoading(false);
  }, [walletAddress, loadAllProfiles]);

  // Create or update profile
  const saveProfile = useCallback((updates) => {
    if (!walletAddress) return null;

    const profiles = loadAllProfiles();
    const existing = profiles[walletAddress];
    
    const updatedProfile = {
      ...(existing || createDefaultProfile(walletAddress)),
      ...updates,
      walletAddress,
      updatedAt: new Date().toISOString(),
    };
    
    profiles[walletAddress] = updatedProfile;
    saveAllProfiles(profiles);
    setProfile(updatedProfile);
    
    console.log('💾 Profile saved for', walletAddress.slice(0, 8));
    return updatedProfile;
  }, [walletAddress, loadAllProfiles, saveAllProfiles]);

  // Create new profile with role
  const createProfile = useCallback((role, initialData = {}) => {
    if (!walletAddress) return null;
    
    const newProfile = {
      ...createDefaultProfile(walletAddress, role),
      ...initialData,
      role,
    };
    
    const profiles = loadAllProfiles();
    profiles[walletAddress] = newProfile;
    saveAllProfiles(profiles);
    setProfile(newProfile);
    
    console.log('✨ New profile created for', walletAddress.slice(0, 8), 'as', role);
    return newProfile;
  }, [walletAddress, loadAllProfiles, saveAllProfiles]);

  // Update specific fields
  const updateProfile = useCallback((updates) => {
    if (!walletAddress || !profile) return null;
    return saveProfile(updates);
  }, [walletAddress, profile, saveProfile]);

  // Update creator data
  const updateCreatorData = useCallback((updates) => {
    if (!walletAddress || !profile) return null;
    return saveProfile({
      creatorData: {
        ...profile.creatorData,
        ...updates,
      },
    });
  }, [walletAddress, profile, saveProfile]);

  // Update subscriber data
  const updateSubscriberData = useCallback((updates) => {
    if (!walletAddress || !profile) return null;
    return saveProfile({
      subscriberData: {
        ...profile.subscriberData,
        ...updates,
      },
    });
  }, [walletAddress, profile, saveProfile]);

  // Get profile by wallet address (for viewing other profiles)
  const getProfileByAddress = useCallback((address) => {
    if (!address) return null;
    const profiles = loadAllProfiles();
    return profiles[address] || null;
  }, [loadAllProfiles]);

  // Check if profile exists
  const hasProfile = !!profile && !!profile.role;

  // Check if user is creator
  const isCreator = profile?.role === 'creator';

  // Check if user is subscriber
  const isSubscriber = profile?.role === 'subscriber';

  return {
    profile,
    isLoading,
    hasProfile,
    isCreator,
    isSubscriber,
    
    // Actions
    createProfile,
    updateProfile,
    saveProfile,
    updateCreatorData,
    updateSubscriberData,
    getProfileByAddress,
    
    // Utils
    allProfiles,
  };
}

export default useUserProfile;
export { createDefaultProfile };
