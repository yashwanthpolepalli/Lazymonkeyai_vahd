import React, { useState, useEffect } from 'react';
import { Star, Sparkles, Copy, Check, ExternalLink, RefreshCw, MessageSquarePlus, QrCode } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';

export interface AISuggestion {
  id: number;
  category: string;
  title: string;
  text: string;
  rating: number;
  tags: string[];
}

export function CustomerGoogleReviewCard() {
  const { user } = useAuth();
  const [reviewSettings, setReviewSettings] = useState<{
    google_review_url: string;
    google_place_id?: string;
    google_review_enabled: boolean;
    gym_name: string;
    qr_code_url: string;
  } | null>(null);

  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<number | 'custom'>(1);
  const [customText, setCustomText] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // 1. Fetch gym review configuration
    apiClient.get('/reviews/settings')
      .then((res: any) => {
        setReviewSettings(res);
        // 2. Automatically generate AI review suggestions
        fetchAiSuggestions(res.gym_name);
      })
      .catch((err) => {
        console.error('Failed to load review settings:', err);
      });
  }, []);

  const fetchAiSuggestions = async (gymName?: string) => {
    setLoadingAi(true);
    try {
      const res: any = await apiClient.post('/reviews/ai-generate', {
        customer_id: user?.id,
        gym_name: gymName || reviewSettings?.gym_name || 'FitClub Gym'
      });
      if (res?.suggestions && Array.isArray(res.suggestions)) {
        setSuggestions(res.suggestions);
        if (res.suggestions.length > 0) {
          setSelectedSuggestionId(res.suggestions[0].id);
        }
      }
    } catch (err) {
      console.error('AI Review generation error:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  const getActiveText = () => {
    if (selectedSuggestionId === 'custom') {
      return customText;
    }
    const found = suggestions.find((s) => s.id === selectedSuggestionId);
    return found ? found.text : '';
  };

  const handlePostToGoogle = async () => {
    const textToShare = getActiveText().trim();
    if (!textToShare) {
      alert('Please select or write a review before posting.');
      return;
    }

    // 1. Copy text to clipboard
    try {
      await navigator.clipboard.writeText(textToShare);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // ignore
    }

    // 2. Record review submission in backend
    try {
      await apiClient.post('/reviews/submit', {
        customer_id: user?.id,
        customer_name: user?.name || 'Gym Member',
        customer_phone: user?.phone,
        rating: 5,
        review_text: textToShare,
        sentiment: 'Positive',
        ai_generated: selectedSuggestionId !== 'custom',
        posted_to_google: true,
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit review:', err);
    }

    // 3. Open Google Review link in a new tab
    const url = reviewSettings?.google_review_url;
    if (url) {
      window.open(url, '_blank');
    }
  };

  if (!reviewSettings || !reviewSettings.google_review_enabled || !reviewSettings.google_review_url) {
    return null;
  }


  return (
    <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-500/10 via-card to-purple-500/10 p-6 shadow-sm space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white grid place-items-center shadow-md shrink-0">
            <Star className="size-6 fill-white" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-black tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <span>Google 5-Star Experience</span>
              <span className="bg-amber-500/20 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full font-extrabold text-[9px]">
                AI-Assisted
              </span>
            </div>
            <h3 className="text-lg font-black text-foreground mt-0.5">
              Share Your Journey at {reviewSettings.gym_name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your feedback inspires others to achieve their fitness goals. Choose an AI-crafted review or write your own!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchAiSuggestions()}
          disabled={loadingAi}
          className="px-3.5 py-1.5 rounded-xl border border-border bg-background hover:bg-muted font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className={`size-3.5 text-amber-600 ${loadingAi ? 'animate-spin' : ''}`} />
          <span>Regenerate Suggestions</span>
        </button>
      </div>

      {/* Main Grid: AI Suggestions & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: AI Suggestions List (8 Cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-4 text-amber-500" />
              <span>Tailored Suggestions for You:</span>
            </span>
            <span className="text-[11px]">Select one below</span>
          </div>

          {loadingAi ? (
            <div className="p-8 text-center border-2 border-dashed border-border rounded-2xl space-y-2">
              <RefreshCw className="size-6 text-amber-500 animate-spin mx-auto" />
              <p className="text-xs font-bold text-muted-foreground">Crafting personalized 5-star Google review suggestions...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((s) => {
                const isSelected = selectedSuggestionId === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSuggestionId(s.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 text-xs ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/5 shadow-xs ring-1 ring-amber-500/30'
                        : 'border-border bg-card hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-foreground">{s.title}</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                          {s.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="size-3.5 fill-amber-500" />
                        ))}
                      </div>
                    </div>
                    <p className="text-muted-foreground leading-relaxed font-medium">
                      "{s.text}"
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {s.tags.map((tag, idx) => (
                        <span key={idx} className="text-[10px] font-semibold text-navy-500 bg-muted px-2 py-0.5 rounded-md">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Custom Review Option */}
              <div
                onClick={() => setSelectedSuggestionId('custom')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 text-xs ${
                  selectedSuggestionId === 'custom'
                    ? 'border-indigo-500 bg-indigo-500/5 shadow-xs ring-1 ring-indigo-500/30'
                    : 'border-border bg-card hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-foreground flex items-center gap-1.5">
                    <MessageSquarePlus className="size-4 text-indigo-500" />
                    <span>Write My Own Custom Review</span>
                  </span>
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="size-3.5 fill-amber-500" />
                    ))}
                  </div>
                </div>
                {selectedSuggestionId === 'custom' && (
                  <textarea
                    rows={3}
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Share your favorite workout equipment, trainer experience, or gym vibe..."
                    className="w-full mt-2 p-3 rounded-xl border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: 1-Click Action & Live QR (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="size-5 fill-amber-500" />
              ))}
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-sm text-foreground">1-Click Google Post</h4>
              <p className="text-[11px] text-muted-foreground">
                Copies your selected review text and opens {reviewSettings.gym_name}'s official Google Review prompt.
              </p>
            </div>

            <button
              type="button"
              onClick={handlePostToGoogle}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
            >
              {copied ? <Check className="size-4 text-white" /> : <ExternalLink className="size-4" />}
              <span>{copied ? 'Copied! Opening Google...' : 'Copy & Post to Google Review'}</span>
            </button>

            {submitted && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 text-xs font-bold border border-emerald-200">
                🎉 Thank you for supporting {reviewSettings.gym_name}!
              </div>
            )}

            <div className="pt-3 border-t border-border flex flex-col items-center space-y-2">
              <div className="p-2 bg-white rounded-xl border-2 border-dashed border-amber-200 shadow-2xs">
                <img
                  src={reviewSettings.qr_code_url}
                  alt="Review QR"
                  className="size-28 object-contain"
                />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground">
                Or scan with camera on your phone
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
