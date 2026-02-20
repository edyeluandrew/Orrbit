import { useState, useEffect, useCallback } from 'react';
import { authApi, usersApi, setAuthToken, getAuthToken } from '../services/api';

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
 * useUserProfile - Hook to manage user profiles
 * 
 * Features:
 * - Syncs with backend database (primary)
 * - Falls back to localStorage when offline
 * - Profile is tied to wallet address
 */
function useUserProfile(walletAddress) {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dbUser, setDbUser] = useState(null);
  const [allProfiles, setAllProfiles] = useState({});

  // Load all profiles from localStorage (for offline/fallback)
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

  // Load profile for current wallet - try API first, then localStorage
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      
      if (!walletAddress) {
        setProfile(null);
        setDbUser(null);
        setIsLoading(false);
        return;
      }

      // Try to load from API first (if we have a token)
      const token = getAuthToken();
      if (token) {
        try {
          const response = await authApi.me();
          if (response.user) {
            setDbUser(response.user);
            // Convert API response to local profile format
            const apiProfile = {
              walletAddress: response.user.walletAddress,
              role: response.user.role,
              displayName: response.user.displayName || '',
              bio: response.user.bio || '',
              avatar: response.user.avatarUrl,
              createdAt: response.user.createdAt,
              updatedAt: new Date().toISOString(),
              socialLinks: {},
              creatorData: response.creator ? {
                category: response.creator.category || 'general',
                verified: response.creator.is_verified || false,
                tiers: [],
                stats: {
                  subscribers: response.creator.subscriber_count || 0,
                  totalEarnings: response.creator.total_earnings || 0,
                },
              } : createDefaultProfile(walletAddress).creatorData,
              subscriberData: createDefaultProfile(walletAddress).subscriberData,
              preferences: createDefaultProfile(walletAddress).preferences,
            };
            setProfile(apiProfile);
            // Also save to localStorage as cache
            const profiles = loadAllProfiles();
            profiles[walletAddress] = apiProfile;
            saveAllProfiles(profiles);
            setIsLoading(false);
            console.log('📋 Profile loaded from API for', walletAddress.slice(0, 8));
            return;
          }
        } catch (err) {
          console.log('API load failed, falling back to localStorage:', err.message);
        }
      }

      // Fallback to localStorage
      const profiles = loadAllProfiles();
      setAllProfiles(profiles);
      const existingProfile = profiles[walletAddress];
      if (existingProfile) {
        setProfile(existingProfile);
        console.log('📋 Profile loaded from localStorage for', walletAddress.slice(0, 8));
      } else {
        setProfile(null);
      }
      
      setIsLoading(false);
    };

    loadProfile();
  }, [walletAddress, loadAllProfiles, saveAllProfiles]);

  // Create or update profile - saves to API and localStorage
  const saveProfile = useCallback(async (updates) => {
    if (!walletAddress) return null;

    const profiles = loadAllProfiles();
    const existing = profiles[walletAddress] || profile;
    
    const updatedProfile = {
      ...(existing || createDefaultProfile(walletAddress)),
      ...updates,
      walletAddress,
      updatedAt: new Date().toISOString(),
    };
    
    // Save to localStorage
    profiles[walletAddress] = updatedProfile;
    saveAllProfiles(profiles);
    setProfile(updatedProfile);

    // Try to sync with API
    try {
      await usersApi.updateProfile({
        displayName: updatedProfile.displayName,
        bio: updatedProfile.bio,
        avatarUrl: updatedProfile.avatar,
      });
      console.log('💾 Profile synced to API for', walletAddress.slice(0, 8));
    } catch (err) {
      console.log('API sync failed (offline?):', err.message);
    }
    
    return updatedProfile;
  }, [walletAddress, profile, loadAllProfiles, saveAllProfiles]);

  // Create new profile with role - registers with backend
  const createProfile = useCallback(async (role, initialData = {}) => {
    if (!walletAddress) return null;
    
    const newProfile = {
      ...createDefaultProfile(walletAddress, role),
      ...initialData,
      role,
    };
    
    // Try to register with API
    try {
      const response = await authApi.register(
        walletAddress, 
        role || 'subscriber', 
        initialData.displayName || null,
        initialData.bio || null
      );
      if (response.token) {
        setAuthToken(response.token);
        setDbUser(response.user);
        console.log('✨ User registered in database:', response.user.id);
      }
    } catch (err) {
      if (err.status === 409) {
        console.log('User already exists in DB');
      } else {
        console.log('API register failed:', err.message);
      }
    }
    
    // Save to localStorage
    const profiles = loadAllProfiles();
    profiles[walletAddress] = newProfile;
    saveAllProfiles(profiles);
    setProfile(newProfile);
    
    console.log('✨ New profile created for', walletAddress.slice(0, 8), 'as', role);
    return newProfile;
  }, [walletAddress, loadAllProfiles, saveAllProfiles]);

  // Become a creator - updates role and creates creator record
  const becomeCreator = useCallback(async (category = 'general') => {
    if (!walletAddress || !profile) return null;

    // Update local profile first
    const updatedProfile = {
      ...profile,
      role: 'creator',
      creatorData: {
        ...profile.creatorData,
        category,
      },
      updatedAt: new Date().toISOString(),
    };
    
    const profiles = loadAllProfiles();
    profiles[walletAddress] = updatedProfile;
    saveAllProfiles(profiles);
    setProfile(updatedProfile);

    // Try API
    try {
      await usersApi.updateProfile({ role: 'creator' });
      console.log('🎨 Became creator in database');
    } catch (err) {
      console.log('API becomeCreator failed:', err.message);
    }
    
    return updatedProfile;
  }, [walletAddress, profile, loadAllProfiles, saveAllProfiles]);

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
    dbUser,
    
    // Actions
    createProfile,
    updateProfile,
    saveProfile,
    updateCreatorData,
    updateSubscriberData,
    getProfileByAddress,
    becomeCreator,
    
    // Utils
    allProfiles,
  };
}

export default useUserProfile;
export { createDefaultProfile };
