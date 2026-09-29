export type BrochureTemplateId =
  | 'powerzone-split'
  | 'chalk-motivation'
  | 'spartan-discipline'
  | 'future-self-anime'
  | 'focus-moodboard'
  | 'bodyhub-diamond'
  | 'neon-kinetic'
  | 'luxury-wellness'
  | 'bootcamp-challenge'
  | 'womens-sanctuary'
  | 'trainer-spotlight';

export type BrochureElementType =
  | 'text'
  | 'textbox'
  | 'image'
  | 'logo'
  | 'badge'
  | 'button'
  | 'checklist'
  | 'group'
  | 'qrcode'
  | 'shape';

export type SemanticRole =
  | 'headline'
  | 'subheadline'
  | 'gym_name'
  | 'tagline'
  | 'badge'
  | 'hero_image'
  | 'logo'
  | 'offer'
  | 'feature'
  | 'bullet'
  | 'quote'
  | 'cta'
  | 'contact'
  | 'phone'
  | 'email'
  | 'address'
  | 'website'
  | 'qrcode'
  | 'background'
  | 'shape';

export interface BrochureElement {
  id: string;
  type: BrochureElementType;
  semantic_role: SemanticRole;
  editable: boolean;
  position: {
    x: number;
    y: number;
    zIndex?: number;
  };
  size?: {
    width?: number | string;
    height?: number | string;
  };
  content?: {
    text?: string;
    title?: string;
    subtitle?: string;
    tag?: string;
    src?: string;
    alt?: string;
    preset?: string;
    label?: string;
    url?: string;
    phone?: string;
    email?: string;
    address?: string;
    website?: string;
    items?: Array<any>;
    [key: string]: any;
  };
  style?: {
    fontSize?: string;
    fontFamily?: string;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    background?: string;
    borderRadius?: string;
    padding?: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    letterSpacing?: string;
    textTransform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
    lineHeight?: string;
    border?: string;
    boxShadow?: string;
    textShadow?: string;
    opacity?: number;
    filter?: string;
    objectFit?: 'cover' | 'contain' | 'fill';
    [key: string]: any;
  };
}

export interface BrochureDocumentConfig {
  width: number;
  height: number;
  backgroundColor?: string;
  backgroundGradient?: string;
  aspectRatio?: string;
  primaryColor?: string;
  accentColor?: string;
  fontTheme?: string;
}

export interface BrochureDesignJson {
  document: BrochureDocumentConfig;
  elements: BrochureElement[];
}

export interface BrochureBulletHighlight {
  title: string;
  desc: string;
  icon?: string;
  badgeLabel?: string;
}

export interface BrochureStat {
  value: string;
  label: string;
  icon?: string;
}

export interface BrochureChecklistItem {
  title: string;
  subtitle: string;
  icon?: string;
}

export interface BrochureData {
  id: string;
  templateId: BrochureTemplateId;
  gymName: string;
  gymTagline: string;
  headline: string;
  subheadline: string;
  badgeText: string;
  heroImage: string;
  features: string[];
  bulletHighlights: BrochureBulletHighlight[];
  checklistItems?: BrochureChecklistItem[];
  stats: BrochureStat[];
  pricing: {
    planName: string;
    originalPrice?: string;
    offerPrice: string;
    period: string;
    highlight?: string;
  };
  secondaryOffer?: string;
  coachName?: string;
  coachTitle?: string;
  coachSpecialties?: string[];
  contact: {
    phone: string;
    email: string;
    address: string;
    website: string;
    instagram: string;
    whatsapp: string;
  };
  ctaText: string;
  qrCodeText: string;
  qrCodeLabel: string;
  customQrUrl?: string;
  customColors: {
    primary: string;
    accent: string;
    bgDark: string;
    textLight: string;
  };
  fontTheme: 'sans-bold' | 'serif-luxury' | 'cyber-futuristic' | 'clean-minimal' | 'distressed-heavy';
  logoUrl?: string;
  logoPreset?: string;
  logoSize?: number;
  logoPosition?: 'top-left' | 'top-right' | 'top-center';
  logoBgStyle?: 'transparent' | 'glass-dark' | 'glow-gold';
  leftBoxItems?: string[];
  bottomBadges?: { title: string; subtitle?: string; icon?: string }[];
  quoteBox?: {
    highlight: string;
    subtext: string;
  };
  bottomBannerText?: string;
  accentStampText?: string;
  secondaryImages?: {
    action1?: string;
    action2?: string;
    gymFloor?: string;
  };
}

export interface TemplateDefinition {
  id: BrochureTemplateId;
  name: string;
  category: string;
  description: string;
  pinterestVibe: string;
  previewThumbnail?: string;
  defaultData: BrochureData;
  designJson?: BrochureDesignJson;
}

export interface ApiBrochureTemplate {
  id: string;
  name: string;
  description?: string;
  source_type: 'system' | 'uploaded' | 'custom';
  source_asset_id?: string;
  preview_asset_id?: string;
  design_json: BrochureDesignJson;
  version: number;
  is_system_template: boolean;
  created_at?: string;
}
