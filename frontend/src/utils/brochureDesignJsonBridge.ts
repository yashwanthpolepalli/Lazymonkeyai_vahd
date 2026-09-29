import type { BrochureData, BrochureDesignJson, BrochureElement, BrochureTemplateId } from '@/types/brochure';

/**
 * Converts BrochureData into dynamic BrochureDesignJson elements.
 */
export function brochureDataToDesignJson(data: BrochureData): BrochureDesignJson {
  const elements: BrochureElement[] = [
    // 1. Background image / layer
    {
      id: 'el_bg_image',
      type: 'image',
      semantic_role: 'background',
      editable: true,
      position: { x: 0, y: 0, zIndex: 0 },
      size: { width: 640, height: 880 },
      content: { src: data.heroImage },
      style: { opacity: 0.28, objectFit: 'cover', filter: 'contrast(125%) brightness(85%)' },
    },
    // 2. Brand logo
    {
      id: 'el_brand_logo',
      type: 'logo',
      semantic_role: 'logo',
      editable: true,
      position: { x: 28, y: 28, zIndex: 10 },
      size: { width: data.logoSize || 52, height: data.logoSize || 52 },
      content: {
        preset: data.logoPreset || 'kettlebell-bolt',
        src: data.logoUrl,
        label: data.gymName,
      },
      style: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: '14px',
        border: `1px solid ${data.customColors?.primary || '#EAB308'}40`,
      },
    },
    // 3. Gym Name
    {
      id: 'el_gym_name',
      type: 'text',
      semantic_role: 'gym_name',
      editable: true,
      position: { x: 92, y: 28, zIndex: 10 },
      size: { width: 320, height: 30 },
      content: { text: data.gymName },
      style: {
        fontSize: '22px',
        fontFamily: 'Impact, Anton, sans-serif',
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      },
    },
    // 4. Gym Tagline
    {
      id: 'el_gym_tagline',
      type: 'text',
      semantic_role: 'tagline',
      editable: true,
      position: { x: 92, y: 56, zIndex: 10 },
      size: { width: 340, height: 18 },
      content: { text: data.gymTagline },
      style: {
        fontSize: '9px',
        fontWeight: '700',
        color: data.customColors?.primary || '#EAB308',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
      },
    },
    // 5. Badge
    {
      id: 'el_top_badge',
      type: 'badge',
      semantic_role: 'badge',
      editable: true,
      position: { x: 420, y: 28, zIndex: 10 },
      size: { width: 192, height: 36 },
      content: { text: data.badgeText || '⚡ STRONGER BODY' },
      style: {
        fontSize: '9px',
        fontWeight: '800',
        color: '#000000',
        backgroundColor: data.customColors?.primary || '#EAB308',
        borderRadius: '9999px',
        padding: '8px 12px',
        textTransform: 'uppercase',
      },
    },
    // 6. Main Headline
    {
      id: 'el_headline',
      type: 'text',
      semantic_role: 'headline',
      editable: true,
      position: { x: 28, y: 105, zIndex: 10 },
      size: { width: 584, height: 55 },
      content: { text: data.headline },
      style: {
        fontSize: '40px',
        fontFamily: 'Impact, Anton, sans-serif',
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        lineHeight: '1.0',
      },
    },
    // 7. Subheadline
    {
      id: 'el_subheadline',
      type: 'text',
      semantic_role: 'subheadline',
      editable: true,
      position: { x: 28, y: 156, zIndex: 10 },
      size: { width: 584, height: 26 },
      content: { text: data.subheadline },
      style: {
        fontSize: '12px',
        fontWeight: '800',
        color: data.customColors?.primary || '#EAB308',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
      },
    },
    // 8. Offer Card
    {
      id: 'el_offer_badge',
      type: 'badge',
      semantic_role: 'offer',
      editable: true,
      position: { x: 372, y: 190, zIndex: 12 },
      size: { width: 240, height: 110 },
      content: {
        title: data.pricing?.planName || 'SPECIAL DEAL',
        text: data.pricing?.offerPrice || '50% OFF',
        subtitle: data.pricing?.highlight || data.pricing?.period || '',
        tag: 'LIMITED TIME OFFER',
      },
      style: {
        backgroundColor: 'rgba(18, 18, 18, 0.92)',
        borderRadius: '18px',
        border: `2px solid ${data.customColors?.primary || '#EAB308'}`,
        padding: '14px',
        color: '#FFFFFF',
      },
    },
    // 9. CTA Button
    {
      id: 'el_cta_button',
      type: 'button',
      semantic_role: 'cta',
      editable: true,
      position: { x: 28, y: 580, zIndex: 12 },
      size: { width: 584, height: 48 },
      content: { text: data.ctaText || 'CLAIM MEMBERSHIP DEAL NOW' },
      style: {
        fontSize: '13px',
        fontWeight: '900',
        color: '#000000',
        background: `linear-gradient(135deg, ${data.customColors?.primary || '#EAB308'}, ${data.customColors?.accent || '#F59E0B'})`,
        borderRadius: '14px',
        textAlign: 'center',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      },
    },
    // 10. Contact Group
    {
      id: 'el_contact_card',
      type: 'group',
      semantic_role: 'contact',
      editable: true,
      position: { x: 28, y: 642, zIndex: 10 },
      size: { width: 430, height: 80 },
      content: {
        phone: data.contact?.phone,
        email: data.contact?.email,
        address: data.contact?.address,
        website: data.contact?.website,
      },
      style: { fontSize: '9.5px', color: '#CBD5E1', lineHeight: '1.5' },
    },
    // 11. QR Code
    {
      id: 'el_qrcode',
      type: 'qrcode',
      semantic_role: 'qrcode',
      editable: true,
      position: { x: 480, y: 642, zIndex: 10 },
      size: { width: 132, height: 80 },
      content: { url: data.qrCodeText || 'https://fitclub.ai', label: data.qrCodeLabel || 'SCAN TO JOIN' },
      style: { backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '6px', color: '#000000' },
    },
  ];

  return {
    document: {
      width: 640,
      height: 880,
      backgroundColor: data.customColors?.bgDark || '#0A0A0A',
      backgroundGradient: `linear-gradient(180deg, ${data.customColors?.bgDark || '#0A0A0A'} 0%, #050505 100%)`,
      primaryColor: data.customColors?.primary || '#EAB308',
      accentColor: data.customColors?.accent || '#F59E0B',
      fontTheme: data.fontTheme || 'distressed-heavy',
    },
    elements,
  };
}
