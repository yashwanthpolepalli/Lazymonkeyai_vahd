"""
Master Seed Definitions for the 6 Authentic System Brochure Templates.
Loaded once into PostgreSQL upon database initialization.
"""
from typing import List, Dict, Any

MASTER_SYSTEM_TEMPLATES: List[Dict[str, Any]] = [
    {
        "id": "template_powerzone_gold",
        "name": "PowerZone Kinetic Gold (Image 1)",
        "description": "High-impact black & gold angled layout with 3 circular focus badges, equipment checklist, and promotional banner.",
        "source_type": "system",
        "source_asset_id": "/assets/brochures/powerzone_bg.jpg",
        "preview_asset_id": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=600&q=80",
        "is_system_template": True,
        "version": 1,
        "design_json": {
            "document": {
                "width": 640,
                "height": 880,
                "backgroundColor": "#0A0A0A",
                "backgroundGradient": "linear-gradient(180deg, #121212 0%, #050505 100%)",
                "aspectRatio": "4:5.5",
                "primaryColor": "#EAB308",
                "accentColor": "#F59E0B",
                "fontTheme": "distressed-heavy"
            },
            "elements": [
                {
                    "id": "el_bg_image",
                    "type": "image",
                    "semantic_role": "background",
                    "editable": True,
                    "position": {"x": 0, "y": 0, "zIndex": 0},
                    "size": {"width": 640, "height": 880},
                    "content": {"src": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80"},
                    "style": {"opacity": 0.25, "filter": "contrast(125%) brightness(80%)", "objectFit": "cover"}
                },
                {
                    "id": "el_brand_logo",
                    "type": "logo",
                    "semantic_role": "logo",
                    "editable": True,
                    "position": {"x": 28, "y": 28, "zIndex": 10},
                    "size": {"width": 52, "height": 52},
                    "content": {"preset": "kettlebell-bolt", "label": "POWERZONE"},
                    "style": {"backgroundColor": "rgba(255,255,255,0.08)", "borderRadius": "14px", "border": "1px solid rgba(234, 179, 8, 0.4)"}
                },
                {
                    "id": "el_gym_name",
                    "type": "text",
                    "semantic_role": "gym_name",
                    "editable": True,
                    "position": {"x": 92, "y": 28, "zIndex": 10},
                    "size": {"width": 320, "height": 30},
                    "content": {"text": "POWERZONE"},
                    "style": {"fontSize": "22px", "fontFamily": "Impact, sans-serif", "fontWeight": "900", "color": "#FFFFFF", "letterSpacing": "0.1em"}
                },
                {
                    "id": "el_gym_tagline",
                    "type": "text",
                    "semantic_role": "tagline",
                    "editable": True,
                    "position": {"x": 92, "y": 56, "zIndex": 10},
                    "size": {"width": 340, "height": 18},
                    "content": {"text": "FITNESS CLUB • YOUR BEST BEGINS HERE"},
                    "style": {"fontSize": "9px", "fontWeight": "700", "color": "#EAB308", "letterSpacing": "0.15em"}
                },
                {
                    "id": "el_top_badge",
                    "type": "badge",
                    "semantic_role": "badge",
                    "editable": True,
                    "position": {"x": 420, "y": 28, "zIndex": 10},
                    "size": {"width": 192, "height": 36},
                    "content": {"text": "⚡ STRONGER BODY. STRONGER YOU."},
                    "style": {"fontSize": "9px", "fontWeight": "800", "color": "#000000", "backgroundColor": "#EAB308", "borderRadius": "9999px"}
                },
                {
                    "id": "el_headline",
                    "type": "text",
                    "semantic_role": "headline",
                    "editable": True,
                    "position": {"x": 28, "y": 105, "zIndex": 10},
                    "size": {"width": 584, "height": 60},
                    "content": {"text": "FITNESS CLUB"},
                    "style": {"fontSize": "44px", "fontFamily": "Impact, sans-serif", "fontWeight": "900", "color": "#FFFFFF", "letterSpacing": "0.08em"}
                },
                {
                    "id": "el_subheadline",
                    "type": "text",
                    "semantic_role": "subheadline",
                    "editable": True,
                    "position": {"x": 28, "y": 156, "zIndex": 10},
                    "size": {"width": 584, "height": 26},
                    "content": {"text": "FOCUS • TRAIN • TRANSFORM"},
                    "style": {"fontSize": "13px", "fontWeight": "800", "color": "#EAB308", "letterSpacing": "0.25em"}
                },
                {
                    "id": "el_hero_image",
                    "type": "image",
                    "semantic_role": "hero_image",
                    "editable": True,
                    "position": {"x": 28, "y": 190, "zIndex": 8},
                    "size": {"width": 330, "height": 240},
                    "content": {"src": "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=800&q=80"},
                    "style": {"borderRadius": "18px", "border": "2px solid rgba(234, 179, 8, 0.4)", "objectFit": "cover"}
                },
                {
                    "id": "el_offer_badge",
                    "type": "badge",
                    "semantic_role": "offer",
                    "editable": True,
                    "position": {"x": 372, "y": 190, "zIndex": 12},
                    "size": {"width": 240, "height": 110},
                    "content": {"title": "ALL-ACCESS DEAL", "text": "50% OFF", "subtitle": "₹12,999 / year (Was ₹24,000)"},
                    "style": {"backgroundColor": "rgba(18, 18, 18, 0.92)", "borderRadius": "18px", "border": "2px solid #EAB308", "color": "#FFFFFF"}
                },
                {
                    "id": "el_cta_button",
                    "type": "button",
                    "semantic_role": "cta",
                    "editable": True,
                    "position": {"x": 28, "y": 580, "zIndex": 12},
                    "size": {"width": 584, "height": 48},
                    "content": {"text": "🔥 CLAIM EXCLUSIVE MEMBERSHIP DEAL NOW"},
                    "style": {"fontSize": "13px", "fontWeight": "900", "color": "#000000", "background": "#EAB308", "borderRadius": "14px"}
                },
                {
                    "id": "el_contact_card",
                    "type": "group",
                    "semantic_role": "contact",
                    "editable": True,
                    "position": {"x": 28, "y": 642, "zIndex": 10},
                    "size": {"width": 430, "height": 80},
                    "content": {"phone": "+91 98765 43210", "email": "info@powerzonegym.com", "address": "Plot 42, Jubilee Hills Road No. 36, Hyderabad"},
                    "style": {"fontSize": "9.5px", "color": "#CBD5E1"}
                },
                {
                    "id": "el_qrcode",
                    "type": "qrcode",
                    "semantic_role": "qrcode",
                    "editable": True,
                    "position": {"x": 480, "y": 642, "zIndex": 10},
                    "size": {"width": 132, "height": 80},
                    "content": {"url": "https://powerzonegym.com/join", "label": "SCAN TO JOIN"},
                    "style": {"backgroundColor": "#FFFFFF", "borderRadius": "12px", "color": "#000000"}
                }
            ]
        }
    },
    {
        "id": "template_chalk_warrior",
        "name": "Fit Chalk Warrior (Image 2)",
        "description": "Atmospheric chalk dust athlete, distressed bold dual-tone typography, and 6-step habit motivation.",
        "source_type": "system",
        "source_asset_id": "/assets/brochures/chalk_motivation_bg.png",
        "preview_asset_id": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=600&q=80",
        "is_system_template": True,
        "version": 1,
        "design_json": {
            "document": {
                "width": 640,
                "height": 880,
                "backgroundColor": "#080808",
                "primaryColor": "#EAB308",
                "accentColor": "#CA8A04"
            },
            "elements": [
                {
                    "id": "el_bg_chalk",
                    "type": "image",
                    "semantic_role": "background",
                    "editable": True,
                    "position": {"x": 0, "y": 0, "zIndex": 0},
                    "size": {"width": 640, "height": 880},
                    "content": {"src": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1200&q=80"},
                    "style": {"opacity": 0.35, "objectFit": "cover"}
                },
                {
                    "id": "el_headline_2",
                    "type": "text",
                    "semantic_role": "headline",
                    "editable": True,
                    "position": {"x": 28, "y": 100, "zIndex": 10},
                    "size": {"width": 584, "height": 64},
                    "content": {"text": "DISCIPLINE OVER EXCUSES"},
                    "style": {"fontSize": "40px", "fontWeight": "900", "color": "#FBBF24"}
                },
                {
                    "id": "el_cta_2",
                    "type": "button",
                    "semantic_role": "cta",
                    "editable": True,
                    "position": {"x": 28, "y": 580, "zIndex": 12},
                    "size": {"width": 584, "height": 48},
                    "content": {"text": "⚡ ENROLL IN 90-DAY BOOTCAMP"},
                    "style": {"background": "#EAB308", "color": "#000000", "borderRadius": "14px"}
                }
            ]
        }
    },
    {
        "id": "template_spartan_discipline",
        "name": "Spartan Discipline (Image 3)",
        "description": "Bold warrior aesthetic with high-contrast crimson and gold elements.",
        "source_type": "system",
        "source_asset_id": "/assets/brochures/spartan_discipline_bg.jpg",
        "preview_asset_id": "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80",
        "is_system_template": True,
        "version": 1,
        "design_json": {
            "document": {
                "width": 640,
                "height": 880,
                "backgroundColor": "#0A0505",
                "primaryColor": "#EF4444",
                "accentColor": "#F59E0B"
            },
            "elements": [
                {
                    "id": "el_spartan_head",
                    "type": "text",
                    "semantic_role": "headline",
                    "editable": True,
                    "position": {"x": 28, "y": 100, "zIndex": 10},
                    "size": {"width": 584, "height": 60},
                    "content": {"text": "DISCIPLINE BEATS MOTIVATION"},
                    "style": {"fontSize": "38px", "fontWeight": "900", "color": "#EF4444"}
                },
                {
                    "id": "el_spartan_cta",
                    "type": "button",
                    "semantic_role": "cta",
                    "editable": True,
                    "position": {"x": 28, "y": 580, "zIndex": 12},
                    "size": {"width": 584, "height": 48},
                    "content": {"text": "⚔️ JOIN THE WARRIOR BROTHERHOOD"},
                    "style": {"background": "#EF4444", "color": "#FFFFFF", "borderRadius": "14px"}
                }
            ]
        }
    },
    {
        "id": "template_future_self_anime",
        "name": "Future Self Anime (Image 4)",
        "description": "Cyberpunk anime energy with neon accents, dynamic character silhouette, and intense typography.",
        "source_type": "system",
        "source_asset_id": "/assets/brochures/future_self_bg.jpg",
        "preview_asset_id": "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=600&q=80",
        "is_system_template": True,
        "version": 1,
        "design_json": {
            "document": {
                "width": 640,
                "height": 880,
                "backgroundColor": "#050B14",
                "primaryColor": "#06B6D4",
                "accentColor": "#A855F7"
            },
            "elements": [
                {
                    "id": "el_anime_head",
                    "type": "text",
                    "semantic_role": "headline",
                    "editable": True,
                    "position": {"x": 28, "y": 100, "zIndex": 10},
                    "size": {"width": 584, "height": 60},
                    "content": {"text": "TRAIN FOR YOUR FUTURE SELF"},
                    "style": {"fontSize": "38px", "fontWeight": "900", "color": "#06B6D4"}
                },
                {
                    "id": "el_anime_cta",
                    "type": "button",
                    "semantic_role": "cta",
                    "editable": True,
                    "position": {"x": 28, "y": 580, "zIndex": 12},
                    "size": {"width": 584, "height": 48},
                    "content": {"text": "🚀 UNLOCK YOUR LEVEL 99 PHYSIQUE"},
                    "style": {"background": "linear-gradient(135deg, #06B6D4, #A855F7)", "color": "#FFFFFF", "borderRadius": "14px"}
                }
            ]
        }
    },
    {
        "id": "template_focus_moodboard",
        "name": "Focus Moodboard Collage (Image 5)",
        "description": "Moody luxury collage with distressed quotes, workout vignettes, and understated gold elegance.",
        "source_type": "system",
        "source_asset_id": "/assets/brochures/focus_moodboard_bg.png",
        "preview_asset_id": "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80",
        "is_system_template": True,
        "version": 1,
        "design_json": {
            "document": {
                "width": 640,
                "height": 880,
                "backgroundColor": "#070707",
                "primaryColor": "#D97706",
                "accentColor": "#F59E0B"
            },
            "elements": [
                {
                    "id": "el_mood_head",
                    "type": "text",
                    "semantic_role": "headline",
                    "editable": True,
                    "position": {"x": 28, "y": 100, "zIndex": 10},
                    "size": {"width": 584, "height": 60},
                    "content": {"text": "SILENT GRIND • LOUD RESULTS"},
                    "style": {"fontSize": "36px", "fontWeight": "900", "color": "#F59E0B"}
                },
                {
                    "id": "el_mood_cta",
                    "type": "button",
                    "semantic_role": "cta",
                    "editable": True,
                    "position": {"x": 28, "y": 580, "zIndex": 12},
                    "size": {"width": 584, "height": 48},
                    "content": {"text": "👑 JOIN PRIVATE ATHLETE SUITE"},
                    "style": {"background": "#D97706", "color": "#FFFFFF", "borderRadius": "14px"}
                }
            ]
        }
    },
    {
        "id": "template_bodyhub_diamond",
        "name": "BodyHub 50% Off Diamond (Image 6)",
        "description": "High-converting promo flyer with diamond price badge, bold headline, and quick scan QR.",
        "source_type": "system",
        "source_asset_id": "/assets/brochures/bodyhub_diamond_bg.jpg",
        "preview_asset_id": "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=600&q=80",
        "is_system_template": True,
        "version": 1,
        "design_json": {
            "document": {
                "width": 640,
                "height": 880,
                "backgroundColor": "#09090C",
                "primaryColor": "#EAB308",
                "accentColor": "#10B981"
            },
            "elements": [
                {
                    "id": "el_bodyhub_head",
                    "type": "text",
                    "semantic_role": "headline",
                    "editable": True,
                    "position": {"x": 28, "y": 100, "zIndex": 10},
                    "size": {"width": 584, "height": 60},
                    "content": {"text": "SUMMER TRANSFORMATION SALE"},
                    "style": {"fontSize": "40px", "fontWeight": "900", "color": "#FFFFFF"}
                },
                {
                    "id": "el_bodyhub_offer",
                    "type": "badge",
                    "semantic_role": "offer",
                    "editable": True,
                    "position": {"x": 28, "y": 180, "zIndex": 10},
                    "size": {"width": 584, "height": 80},
                    "content": {"title": "SPECIAL PROMOTION", "text": "FLAT 50% OFF ANNUAL PASS"},
                    "style": {"background": "#EAB308", "color": "#000000", "borderRadius": "16px"}
                },
                {
                    "id": "el_bodyhub_cta",
                    "type": "button",
                    "semantic_role": "cta",
                    "editable": True,
                    "position": {"x": 28, "y": 580, "zIndex": 12},
                    "size": {"width": 584, "height": 48},
                    "content": {"text": "💎 CLAIM 50% OFF TODAY"},
                    "style": {"background": "#10B981", "color": "#000000", "borderRadius": "14px"}
                }
            ]
        }
    }
]
