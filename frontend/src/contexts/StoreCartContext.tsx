import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useCurrency } from "@/hooks/use-currency";

/**
 * CartProduct is a minimal, standalone type for items in the cart.
 * It decouples the cart from both MarketplaceProduct (mock) and
 * StorefrontProduct (live backend), accepting either.
 */
export interface CartProduct {
  id: string;
  name: string;
  price: number;        // selling price
  mrp?: number;         // original / crossed-out price
  image_url?: string;
  category_name?: string;
  brand?: string;
  stock?: number;
  vendorName?: string;
}

export interface CartItem {
  product: CartProduct;
  quantity: number;
}

interface StoreCartContextType {
  cartItems: CartItem[];
  addToCart: (product: CartProduct, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
  wishlistItems: CartProduct[];
  toggleWishlist: (product: CartProduct) => void;
}

const StoreCartContext = createContext<StoreCartContextType | undefined>(undefined);

export function StoreCartProvider({ children }: { children: React.ReactNode }) {
  const { currency, formatCurrency } = useCurrency();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<CartProduct[]>([]);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('store-cart');
    if (saved) {
      try {
        setCartItems(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse cart', e);
      }
    }
    const savedWish = localStorage.getItem('store-wishlist');
    if (savedWish) {
      try {
        setWishlistItems(JSON.parse(savedWish));
      } catch (e) {
        console.error('Failed to parse wishlist', e);
      }
    }
  }, []);

  // Save to local storage when changed
  useEffect(() => {
    localStorage.setItem('store-cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem('store-wishlist', JSON.stringify(wishlistItems));
  }, [wishlistItems]);

  const toggleWishlist = (product: CartProduct) => {
    setWishlistItems(prev => {
      const exists = prev.some(item => item.id === product.id);
      if (exists) {
        toast.info(`Removed from wishlist: ${product.name}`);
        return prev.filter(item => item.id !== product.id);
      } else {
        toast.success(`Saved to wishlist: ${product.name}`);
        return [...prev, product];
      }
    });
  };

  const addToCart = (product: CartProduct, quantity: number) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });

    toast.success(`Added to cart: ${product.name}`, {
      style: { background: '#2563EB', color: 'white', border: 'none' },
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);

  return (
    <StoreCartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal, wishlistItems, toggleWishlist }}>
      {children}
    </StoreCartContext.Provider>
  );
}

export function useStoreCart() {
  const context = useContext(StoreCartContext);
  if (context === undefined) {
    throw new Error('useStoreCart must be used within a StoreCartProvider');
  }
  return context;
}
