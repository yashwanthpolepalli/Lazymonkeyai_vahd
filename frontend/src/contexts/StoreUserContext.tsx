import React, { createContext, useContext, useState, useEffect } from "react";

export interface StoreUser {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zipCode?: string;
  walletBalance: number;
  osaiCoins: number;
  membershipTier: string;
  avatar?: string;
}

interface StoreUserContextType {
  user: StoreUser | null;
  isLoggedIn: boolean;
  login: (email: string, name?: string) => void;
  register: (userData: Partial<StoreUser>) => void;
  logout: () => void;
  updateProfile: (data: Partial<StoreUser>) => void;
  addCoins: (amount: number) => void;
  addWallet: (amount: number) => void;
  deductWallet: (amount: number) => boolean;
}

const STORAGE_KEY = "lazymonkey_store_user";

const DEFAULT_USER: StoreUser = {
  id: "CUST-LM-8924",
  name: "David Chen",
  firstName: "David",
  lastName: "Chen",
  email: "david.chen@example.com",
  phone: "+971 50 123 4567",
  address: "Villa 14, Al Wasl Road",
  city: "Dubai",
  zipCode: "00000",
  walletBalance: 1250.50,
  osaiCoins: 5200,
  membershipTier: "Platinum Member",
  avatar: "/organic/images/avatar-default.png",
};

const StoreUserContext = createContext<StoreUserContextType | undefined>(undefined);

export function StoreUserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StoreUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_USER; // Start with friendly default demo user
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = (email: string, name?: string) => {
    const defaultName = name || email.split("@")[0].replace(/[._]/g, " ");
    const parts = defaultName.split(" ");
    const newUser: StoreUser = {
      id: `CUST-LM-${Math.floor(1000 + Math.random() * 9000)}`,
      name: defaultName,
      firstName: parts[0] || "Customer",
      lastName: parts.slice(1).join(" ") || "User",
      email: email,
      phone: "+971 50 882 1920",
      address: "Downtown Dubai Boulevard, Suite 402",
      city: "Dubai",
      zipCode: "00000",
      walletBalance: 850.00,
      osaiCoins: 2400,
      membershipTier: "Gold Member",
    };
    setUser(newUser);
  };

  const register = (userData: Partial<StoreUser>) => {
    const fName = userData.firstName || "New";
    const lName = userData.lastName || "Customer";
    const newUser: StoreUser = {
      id: `CUST-LM-${Math.floor(1000 + Math.random() * 9000)}`,
      name: `${fName} ${lName}`.trim(),
      firstName: fName,
      lastName: lName,
      email: userData.email || "customer@lazymonkey.com",
      phone: userData.phone || "+971 50 123 4567",
      address: userData.address || "Marina Walk, Tower 2",
      city: userData.city || "Dubai",
      zipCode: userData.zipCode || "00000",
      walletBalance: 500.00, // Welcome gift
      osaiCoins: 1000, // Sign-up bonus coins
      membershipTier: "Silver Member",
    };
    setUser(newUser);
  };

  const logout = () => {
    setUser(null);
  };

  const updateProfile = (data: Partial<StoreUser>) => {
    if (!user) return;
    setUser({ ...user, ...data });
  };

  const addCoins = (amount: number) => {
    if (!user) return;
    setUser({ ...user, osaiCoins: user.osaiCoins + amount });
  };

  const addWallet = (amount: number) => {
    if (!user) return;
    setUser({ ...user, walletBalance: user.walletBalance + amount });
  };

  const deductWallet = (amount: number): boolean => {
    if (!user || user.walletBalance < amount) return false;
    setUser({ ...user, walletBalance: user.walletBalance - amount });
    return true;
  };

  return (
    <StoreUserContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        login,
        register,
        logout,
        updateProfile,
        addCoins,
        addWallet,
        deductWallet,
      }}
    >
      {children}
    </StoreUserContext.Provider>
  );
}

export function useStoreUser() {
  const context = useContext(StoreUserContext);
  if (!context) {
    throw new Error("useStoreUser must be used within a StoreUserProvider");
  }
  return context;
}
