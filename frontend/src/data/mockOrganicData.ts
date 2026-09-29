export interface OrganicProduct {
  id: string;
  name: string;
  category: string;
  image: string;
  price: number;
  originalPrice: number;
  discountBadge?: string;
  rating: number;
  reviewsCount: number;
  unit: string;
  description: string;
  badge?: string;
  inStock: boolean;
  featured?: boolean;
  popular?: boolean;
  brand?: string;
  sku?: string;
  sellerName?: string;
}

export interface OrganicCategory {
  id: string;
  name: string;
  slug: string;
  image: string;
  itemCount: number;
}

export interface OrganicBlogPost {
  id: string;
  title: string;
  slug: string;
  date: string;
  category: string;
  image: string;
  excerpt: string;
  author: string;
}

export const organicCategories: OrganicCategory[] = [
  { id: "cat-1", name: "Fresh Fruits & Vegetables", slug: "fresh-fruits-vegetables", image: "/organic/images/category-thumb-1.jpg", itemCount: 142 },
  { id: "cat-2", name: "Dairy, Eggs & Bakery", slug: "dairy-eggs-bakery", image: "/organic/images/category-thumb-6.jpg", itemCount: 86 },
  { id: "cat-3", name: "Beverages & Fresh Juices", slug: "beverages-fresh-juices", image: "/organic/images/category-thumb-3.jpg", itemCount: 95 },
  { id: "cat-4", name: "Organic Grains & Staples", slug: "organic-grains-staples", image: "/organic/images/category-thumb-2.jpg", itemCount: 64 },
  { id: "cat-5", name: "Snacks & Packaged Foods", slug: "snacks-packaged-foods", image: "/organic/images/category-thumb-5.jpg", itemCount: 53 },
  { id: "cat-6", name: "Meat, Poultry & Seafood", slug: "meat-poultry-seafood", image: "/organic/images/category-thumb-4.jpg", itemCount: 78 },
  { id: "cat-7", name: "Health, Wellness & Beauty", slug: "health-wellness-beauty", image: "/organic/images/category-thumb-7.jpg", itemCount: 49 },
  { id: "cat-8", name: "Household & Eco Living", slug: "household-eco-living", image: "/organic/images/category-thumb-8.jpg", itemCount: 62 },
];

export const organicProducts: OrganicProduct[] = [
  {
    id: "org-1",
    name: "Whole Wheat Sandwich Bread",
    category: "Dairy, Eggs & Bakery",
    image: "/organic/images/product-thumb-1.png",
    price: 18.0,
    originalPrice: 24.0,
    discountBadge: "25% OFF",
    rating: 4.8,
    reviewsCount: 222,
    unit: "1 loaf (400g)",
    description: "Freshly baked 100% stoneground whole wheat sandwich bread made with unrefined organic grains. Naturally leavened and free from artificial preservatives.",
    featured: true,
    popular: true,
    inStock: true,
  },
  {
    id: "org-2",
    name: "Whole Grain Oatmeal",
    category: "Organic Grains & Staples",
    image: "/organic/images/product-thumb-2.png",
    price: 14.5,
    originalPrice: 19.0,
    discountBadge: "24% OFF",
    rating: 4.9,
    reviewsCount: 180,
    unit: "500g Pack",
    description: "Certified organic rolled oats packed with dietary fiber, iron, and slow-burning complex carbohydrates to start your morning right.",
    featured: true,
    popular: false,
    inStock: true,
  },
  {
    id: "org-3",
    name: "Sharp Cheddar Cheese Block",
    category: "Dairy, Eggs & Bakery",
    image: "/organic/images/product-thumb-3.png",
    price: 22.0,
    originalPrice: 28.0,
    discountBadge: "21% OFF",
    rating: 4.7,
    reviewsCount: 145,
    unit: "250g Block",
    description: "Naturally aged grass-fed dairy cheddar with a bold, tangy profile. Handcrafted in small farmstead batches without artificial rBST hormones.",
    featured: true,
    popular: true,
    inStock: true,
  },
  {
    id: "org-4",
    name: "Organic Baby Spinach",
    category: "Fresh Fruits & Vegetables",
    image: "/organic/images/product-thumb-4.png",
    price: 6.5,
    originalPrice: 8.5,
    discountBadge: "23% OFF",
    rating: 4.9,
    reviewsCount: 310,
    unit: "200g Clamshell",
    description: "Crisp, tender organic baby spinach leaves harvested at peak freshness. Triple-washed and ready to toss in fresh salads or morning green smoothies.",
    featured: true,
    popular: true,
    inStock: true,
  },
  {
    id: "org-5",
    name: "Organic Spinach Leaves (Fresh Produce)",
    category: "Fresh Fruits & Vegetables",
    image: "/organic/images/product-thumb-5.png",
    price: 7.0,
    originalPrice: 9.0,
    discountBadge: "22% OFF",
    rating: 4.6,
    reviewsCount: 98,
    unit: "Bunch",
    description: "Farm-fresh vibrant green spinach leaves straight from regional organic cultivators, packed with plant-based iron and vitamin K.",
    featured: true,
    popular: false,
    inStock: true,
  },
  {
    id: "org-6",
    name: "Fresh Salmon Fillet",
    category: "Meat, Poultry & Seafood",
    image: "/organic/images/product-thumb-6.png",
    price: 34.0,
    originalPrice: 42.0,
    discountBadge: "19% OFF",
    rating: 4.9,
    reviewsCount: 420,
    unit: "500g Fillet",
    description: "Sustainably sourced premium ocean salmon cut fresh daily, rich in omega-3 fatty acids and lean heart-healthy protein.",
    featured: true,
    popular: true,
    inStock: true,
  },
  {
    id: "org-7",
    name: "Imported Italian Spaghetti Pasta",
    category: "Organic Grains & Staples",
    image: "/organic/images/product-thumb-7.png",
    price: 9.5,
    originalPrice: 12.0,
    discountBadge: "20% OFF",
    rating: 4.8,
    reviewsCount: 165,
    unit: "500g Box",
    description: "Bronze-die extruded Italian organic durum wheat semolina pasta that holds sauces exquisitely and cooks to perfect al dente bite.",
    featured: true,
    popular: false,
    inStock: true,
  },
  {
    id: "org-8",
    name: "Granny Smith Apples",
    category: "Fresh Fruits & Vegetables",
    image: "/organic/images/product-thumb-8.png",
    price: 11.0,
    originalPrice: 14.5,
    discountBadge: "24% OFF",
    rating: 4.7,
    reviewsCount: 195,
    unit: "1 kg Bag",
    description: "Crisp, tart, and extraordinarily juicy orchard-grown green Granny Smith apples. Ideal for healthy snacking, baking pies, or cold juicing.",
    featured: true,
    popular: true,
    inStock: true,
  },
  {
    id: "org-9",
    name: "Organic 2% Reduced Fat Milk",
    category: "Dairy, Eggs & Bakery",
    image: "/organic/images/product-thumb-9.png",
    price: 5.5,
    originalPrice: 7.0,
    discountBadge: "21% OFF",
    rating: 4.9,
    reviewsCount: 380,
    unit: "1 Liter Bottle",
    description: "Pasteurized organic milk from pasture-raised cows with no antibiotics, artificial growth hormones, or synthetic feeds.",
    featured: true,
    popular: true,
    inStock: true,
  },
  {
    id: "org-10",
    name: "Greek Style Plain Yogurt",
    category: "Dairy, Eggs & Bakery",
    image: "/organic/images/product-thumb-10.png",
    price: 8.5,
    originalPrice: 11.0,
    discountBadge: "22% OFF",
    rating: 4.9,
    reviewsCount: 260,
    unit: "450g Tub",
    description: "Velvety smooth, authentic strained Greek yogurt teeming with live active probiotic cultures and 18g of bioavailable protein per serving.",
    featured: true,
    popular: true,
    inStock: true,
  },
  {
    id: "org-11",
    name: "Pure Squeezed No Pulp Orange Juice",
    category: "Beverages & Fresh Juices",
    image: "/organic/images/product-thumb-11.png",
    price: 9.0,
    originalPrice: 12.0,
    discountBadge: "25% OFF",
    rating: 4.8,
    reviewsCount: 215,
    unit: "1 Liter Bottle",
    description: "100% cold-pressed sunshine oranges with zero added sugars, concentrates, or preservatives. Packed with daily immunity-boosting Vitamin C.",
    featured: false,
    popular: true,
    inStock: true,
  },
  {
    id: "org-12",
    name: "Fresh Valencia Oranges",
    category: "Fresh Fruits & Vegetables",
    image: "/organic/images/product-thumb-12.png",
    price: 8.0,
    originalPrice: 10.5,
    discountBadge: "24% OFF",
    rating: 4.7,
    reviewsCount: 140,
    unit: "1 kg Net",
    description: "Sweet, thin-skinned Valencia citrus oranges bursting with aromatic nectar. Hand-picked at optimal maturity.",
    featured: false,
    popular: true,
    inStock: true,
  },
  {
    id: "org-13",
    name: "Gourmet Dark Chocolate Bars 70%",
    category: "Snacks & Packaged Foods",
    image: "/organic/images/product-thumb-13.png",
    price: 6.5,
    originalPrice: 8.5,
    discountBadge: "23% OFF",
    rating: 4.9,
    reviewsCount: 290,
    unit: "100g Bar",
    description: "Single-origin Fairtrade Ecuadorian cacao slow roasted and conched to velvety perfection with subtle notes of blackberry and vanilla.",
    featured: false,
    popular: true,
    inStock: true,
  },
  {
    id: "org-14",
    name: "Fresh Green Crisp Celery",
    category: "Fresh Fruits & Vegetables",
    image: "/organic/images/product-thumb-14.png",
    price: 4.5,
    originalPrice: 6.0,
    discountBadge: "25% OFF",
    rating: 4.6,
    reviewsCount: 88,
    unit: "1 Head",
    description: "Hydrating, crunchy stalks harvested in morning dew. A low-calorie staple brimming with natural electrolytes and dietary minerals.",
    featured: false,
    popular: true,
    inStock: true,
  },
  {
    id: "org-15",
    name: "Honeycrisp Apples",
    category: "Fresh Fruits & Vegetables",
    image: "/organic/images/product-thumb-15.png",
    price: 13.0,
    originalPrice: 16.5,
    discountBadge: "21% OFF",
    rating: 4.9,
    reviewsCount: 340,
    unit: "1 kg",
    description: "Celebrated for their honey-sweet flavor and exceptionally crisp crunch. Loved by adults and children alike.",
    featured: false,
    popular: true,
    inStock: true,
  },
  {
    id: "org-16",
    name: "Sunstar Fresh Melon Juice",
    category: "Beverages & Fresh Juices",
    image: "/organic/images/product-thumb-16.png",
    price: 7.5,
    originalPrice: 10.0,
    discountBadge: "25% OFF",
    rating: 4.8,
    reviewsCount: 175,
    unit: "750ml Bottle",
    description: "Refreshing honeydew and cantaloupe blend, lightly chilled with a splash of natural mint essence.",
    featured: false,
    popular: true,
    inStock: true,
  }
];

export const organicBlogPosts: OrganicBlogPost[] = [
  {
    id: "blog-1",
    title: "Top 10 casual look ideas to dress up your kids with organic comfort",
    slug: "casual-look-ideas-organic-comfort",
    date: "12 Aug 2026",
    category: "Health & Living",
    image: "/organic/images/post-thumbnail-1.jpg",
    author: "Elena Rostova",
    excerpt: "Discover how breathable organic cottons and sustainable natural dyes create gentle, allergy-free daily outfits for sensitive children's skin.",
  },
  {
    id: "blog-2",
    title: "Latest trends of incorporating cold-pressed juices into daily wellness",
    slug: "latest-trends-cold-pressed-juices",
    date: "18 Aug 2026",
    category: "Nutrition",
    image: "/organic/images/post-thumbnail-2.jpg",
    author: "Marcus Vance",
    excerpt: "Why unpasteurized organic raw juices retain up to 5 times more live active enzymes, helping revitalise gut microbiome and daily endurance.",
  },
  {
    id: "blog-3",
    title: "10 Different Types of comfortable farm-to-table breakfast ideas",
    slug: "farm-to-table-breakfast-ideas",
    date: "25 Aug 2026",
    category: "Recipes",
    image: "/organic/images/post-thumbnail-3.jpg",
    author: "Sophia Chen",
    excerpt: "Quick 15-minute nourishing breakfast recipes utilizing stoneground whole wheat sourdough, pasture eggs, and heirloom avocados.",
  }
];

export const organicNavigationMenu = [
  { label: "Home", href: "/store" },
  {
    label: "Pages",
    href: "/store/shop",
    dropdown: [
      { label: "About Us", href: "/store/about" },
      { label: "Shop", href: "/store/shop" },
      { label: "Single Product", href: "/store/product/org-1" },
      { label: "Cart", href: "/store/cart" },
      { label: "Checkout", href: "/store/checkout" },
      { label: "Blog", href: "/store/blog" },
      { label: "Single Post", href: "/store/blog/blog-1" },
      { label: "Styles", href: "/store/styles" },
      { label: "Contact", href: "/store/contact" },
      { label: "Thank You", href: "/store/thank-you" },
      { label: "My Account", href: "/store/account" },
      { label: "404 Error", href: "/store/404" },
    ],
  },
  { label: "Shop", href: "/store/shop" },
  { label: "Blog", href: "/store/blog" },
  { label: "Contact", href: "/store/contact" },
];
