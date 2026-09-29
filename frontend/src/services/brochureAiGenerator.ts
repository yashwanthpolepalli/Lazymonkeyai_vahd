import type { BrochureData, BrochureTemplateId } from '@/types/brochure';
import { BROCHURE_TEMPLATES } from '@/data/brochureTemplates';
import { optimizeBrochureLayout } from '@/utils/brochureAiAligner';

export interface GenerateBrochureParams {
  prompt: string;
  gymName?: string;
  vibe?: string;
  offer?: string;
  phone?: string;
}

export interface GeneratedBrochureResult {
  data: BrochureData;
  source: string;
}

/**
 * AI Prompt-to-Poster Designer
 * Takes the user's natural language design prompt and fields, asks the AI to
 * design the entire brochure (headline, 6-step rules, quotes, colors, template, pricing),
 * and balances the layout for zero overlaps.
 */
export async function generateBrochureWithAi(
  params: GenerateBrochureParams
): Promise<GeneratedBrochureResult> {
  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    const res = await fetch(`${apiBase}/api/v1/ai/generate-brochure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: params.prompt,
        gym_name: params.gymName,
        vibe: params.vibe,
        offer: params.offer,
        phone: params.phone,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json && json.designed_brochure) {
        const designed = json.designed_brochure;
        const matchingTemplate =
          BROCHURE_TEMPLATES.find((t) => t.id === designed.templateId) || BROCHURE_TEMPLATES[0];

        const merged: BrochureData = {
          ...matchingTemplate.defaultData,
          id: `ai-designed-${Date.now()}`,
          templateId: (designed.templateId as BrochureTemplateId) || matchingTemplate.id,
          gymName: designed.gymName || matchingTemplate.defaultData.gymName,
          gymTagline: designed.gymTagline || matchingTemplate.defaultData.gymTagline,
          headline: designed.headline || matchingTemplate.defaultData.headline,
          subheadline: designed.subheadline || matchingTemplate.defaultData.subheadline,
          badgeText: designed.badgeText || matchingTemplate.defaultData.badgeText,
          accentStampText: designed.accentStampText || matchingTemplate.defaultData.accentStampText,
          bottomBannerText: designed.bottomBannerText || matchingTemplate.defaultData.bottomBannerText,
          checklistItems: designed.checklistItems || matchingTemplate.defaultData.checklistItems,
          bulletHighlights: designed.bulletHighlights || matchingTemplate.defaultData.bulletHighlights,
          quoteBox: designed.quoteBox || matchingTemplate.defaultData.quoteBox,
          pricing: designed.pricing || matchingTemplate.defaultData.pricing,
          contact: {
            ...matchingTemplate.defaultData.contact,
            ...(designed.contact || {}),
          },
          customColors: {
            ...matchingTemplate.defaultData.customColors,
            ...(designed.customColors || {}),
          },
          fontTheme: designed.fontTheme || matchingTemplate.defaultData.fontTheme,
          logoPreset: designed.logoPreset || matchingTemplate.defaultData.logoPreset,
          logoSize: designed.logoSize || matchingTemplate.defaultData.logoSize,
        };

        return {
          data: optimizeBrochureLayout(merged),
          source: json.source || 'gemini-designer',
        };
      }
    }
  } catch (err) {
    console.warn('[BrochureAiGenerator] API failed, using client heuristic generator:', err);
  }

  // Client-Side Smart Generative Engine
  return runClientGenerativeEngine(params);
}

function runClientGenerativeEngine(params: GenerateBrochureParams): GeneratedBrochureResult {
  const p = params.prompt.toLowerCase();
  const gymName = params.gymName || (p.includes('titan') ? 'TITAN GYM' : 'POWERZONE FITNESS');

  let templateId: BrochureTemplateId = 'powerzone-split';
  let primaryColor = '#EAB308';
  let accentColor = '#F59E0B';

  if (p.includes('chalk') || p.includes('habit') || p.includes('transformation')) {
    templateId = 'chalk-motivation';
    primaryColor = '#F59E0B';
    accentColor = '#D97706';
  } else if (p.includes('spartan') || p.includes('discipline') || p.includes('beast') || p.includes('red')) {
    templateId = 'spartan-discipline';
    primaryColor = '#EAB308';
    accentColor = '#EF4444';
  } else if (p.includes('future') || p.includes('anime') || p.includes('mindset')) {
    templateId = 'future-self-anime';
    primaryColor = '#EAB308';
    accentColor = '#CA8A04';
  } else if (p.includes('focus') || p.includes('moodboard') || p.includes('grind') || p.includes('morning')) {
    templateId = 'focus-moodboard';
    primaryColor = '#EF4444';
    accentColor = '#EAB308';
  } else if (p.includes('diamond') || p.includes('50%') || p.includes('offer') || p.includes('discount')) {
    templateId = 'bodyhub-diamond';
    primaryColor = '#EAB308';
    accentColor = '#CA8A04';
  } else if (p.includes('neon') || p.includes('cyan') || p.includes('cyber')) {
    templateId = 'neon-kinetic';
    primaryColor = '#06B6D4';
    accentColor = '#10B981';
  }

  const template = BROCHURE_TEMPLATES.find((t) => t.id === templateId) || BROCHURE_TEMPLATES[0];

  const generated: BrochureData = {
    ...template.defaultData,
    id: `ai-client-${Date.now()}`,
    templateId,
    gymName: gymName.toUpperCase(),
    badgeText: params.offer ? params.offer.toUpperCase() : template.defaultData.badgeText,
    contact: {
      ...template.defaultData.contact,
      phone: params.phone || template.defaultData.contact.phone,
    },
    customColors: {
      ...template.defaultData.customColors,
      primary: primaryColor,
      accent: accentColor,
    },
  };

  return {
    data: optimizeBrochureLayout(generated),
    source: 'client-smart-engine',
  };
}
