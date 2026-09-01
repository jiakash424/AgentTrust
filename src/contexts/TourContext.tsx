import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "./AuthContext";

export interface TourStep {
  id: string;
  stepNumber: number;
  route: string;
  badge: { en: string; hi: string };
  title: { en: string; hi: string };
  summary: { en: string; hi: string };
  actionHint: { en: string; hi: string };
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "dashboard",
    stepNumber: 1,
    route: "/app/dashboard",
    badge: {
      en: "STEP 1: EXECUTIVE DASHBOARD",
      hi: "STEP 1: एग्जीक्यूटिव डैशबोर्ड",
    },
    title: {
      en: "Live Commercial Operations & Market Signals",
      hi: "लाइव कमर्शियल ऑपरेशन्स और मंडी रेट्स",
    },
    summary: {
      en: "Track real-time total pipeline valuation, daily APMC commodity price trends, active stock inventory, and AI readiness in one unified command view.",
      hi: "यहाँ आपका Total Pipeline Value (₹), daily APMC मंडी भाव और active स्टॉक इन्वेंट्री लाइव ट्रैक होती है।",
    },
    actionHint: {
      en: "Review the top 4 KPI cards and live regional price benchmark curve.",
      hi: "टॉप 4 KPI कार्ड्स और लाइव प्राइस ट्रेंड ग्राफ को चेक करें।",
    },
  },
  {
    id: "products",
    stepNumber: 2,
    route: "/app/products",
    badge: {
      en: "STEP 2: PRODUCTS CATALOG",
      hi: "STEP 2: प्रोडक्ट्स कैटलॉग",
    },
    title: {
      en: "Inventory & Margin Guardrails",
      hi: "इन्वेंट्री और मार्जिन रूल्स",
    },
    summary: {
      en: "Define your catalog inventory with cost prices, minimum profitable margins, and target selling rates so NOVA automatically safeguards your factory profit.",
      hi: "यहाँ अपने प्रोडक्ट्स (Cost Price, Target Selling Rate, Units) ऐड करें ताकि NOVA सही मार्जिन पर बायर को पिच करे।",
    },
    actionHint: {
      en: "Set unit cost base and target rates for automated AI matching.",
      hi: "हर प्रोडक्ट का बेस कॉस्ट और मिनिमम प्रॉफिटेबल रेट सेट करें।",
    },
  },
  {
    id: "opportunities",
    stepNumber: 3,
    route: "/app/opportunities",
    badge: {
      en: "STEP 3: OPPORTUNITIES & AI RESEARCH",
      hi: "STEP 3: वेरिफाइड बायर्स और AI रिसर्च",
    },
    title: {
      en: "Verified B2B Buyers & Deep Intelligence",
      hi: "वेरिफाइड B2B बायर्स और डीप रिसर्च",
    },
    summary: {
      en: "NOVA continuously indexes verified corporate buyers, mills, and distributors. Click 'Research' on any card to run deep AI commercial analysis and view exact margin calculations.",
      hi: "NOVA इंटरनेट और मंडियों से वेरिफाइड कॉर्पोरेट बायर्स ढूंढता है। 'Research' पर क्लिक करके बायर की विश्वसनीयता और प्रॉफिट रिपोर्ट देखें।",
    },
    actionHint: {
      en: "Click 'Research' on any opportunity card for real-time buyer evaluation.",
      hi: "किसी भी कार्ड पर 'Research' बटन दबाकर लाइव एनालिसिस देखें।",
    },
  },
  {
    id: "command_center",
    stepNumber: 4,
    route: "/app",
    badge: {
      en: "STEP 4: NOVA COMMAND CENTER",
      hi: "STEP 4: नोवा कमांड सेंटर",
    },
    title: {
      en: "24/7 Autonomous Commercial Intelligence",
      hi: "24/7 AI कमर्शियल असिस्टेंट",
    },
    summary: {
      en: "Your central AI assistant. Ask strategic pricing questions, generate tailored outreach proposals, draft WhatsApp quotations, or negotiate bulk deals in seconds.",
      hi: "आपका सेंट्रल AI ब्रेन! यहाँ प्राइसिंग स्ट्रैटेजी, कोल्ड ईमेल प्रपोजल, WhatsApp मैसेज और नेगोशिएशन एडवाइस तुरंत पूछें।",
    },
    actionHint: {
      en: "Ask any pricing or pitching query in the bottom chat bar.",
      hi: "नीचे चैट बार में कोई भी सवाल पूछें, NOVA तुरंत उत्तर देगा।",
    },
  },
  {
    id: "deals",
    stepNumber: 5,
    route: "/app/deals",
    badge: {
      en: "STEP 5: DEALS PIPELINE & CRM",
      hi: "STEP 5: डील्स पाइपलाइन और CRM",
    },
    title: {
      en: "Kanban Sales Funnel & Deal Closure",
      hi: "सेल्स फनल और डील क्लोजर",
    },
    summary: {
      en: "Manage buyer progression across Kanban stages (Researching ➔ Qualified ➔ Quote Sent ➔ Won) to ensure zero drop-off in active revenue opportunities.",
      hi: "लीड्स को स्टेज-बाय-स्टेज (Researching ➔ Qualified ➔ Quote Sent ➔ Won) मैनेज करें ताकि कोई डील मिस न हो।",
    },
    actionHint: {
      en: "Drag cards or update stages to progress commercial conversations.",
      hi: "डील्स का स्टेटस अपडेट करके सेल्स प्रोग्रेस ट्रैक करें।",
    },
  },
];

interface TourContextType {
  isTourActive: boolean;
  currentStepIndex: number;
  currentStep: TourStep;
  totalSteps: number;
  language: "en" | "hi";
  setLanguage: (lang: "en" | "hi") => void;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
  goToStep: (index: number) => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [language, setLanguageState] = useState<"en" | "hi">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("agenttrust_tour_lang") as "en" | "hi") || "en";
    }
    return "en";
  });

  const setLanguage = (lang: "en" | "hi") => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("agenttrust_tour_lang", lang);
    }
  };

  const storageKey = `agenttrust_guided_tour_completed_${user?.id || user?.email || "new_user"}`;

  // Auto-start guided tour for brand new users
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasSeen = localStorage.getItem(storageKey);
      if (!hasSeen) {
        const timer = setTimeout(() => {
          setIsTourActive(true);
          setCurrentStepIndex(0);
          navigate(TOUR_STEPS[0].route);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [user?.id, user?.email]);

  // Listen to manual start events
  useEffect(() => {
    const handleStart = () => {
      setIsTourActive(true);
      setCurrentStepIndex(0);
      navigate(TOUR_STEPS[0].route);
    };
    window.addEventListener("openOnboardingTour", handleStart);
    return () => window.removeEventListener("openOnboardingTour", handleStart);
  }, []);

  const goToStep = (index: number) => {
    if (index >= 0 && index < TOUR_STEPS.length) {
      setCurrentStepIndex(index);
      navigate(TOUR_STEPS[index].route);
    }
  };

  const nextStep = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      navigate(TOUR_STEPS[nextIdx].route);
    } else {
      endTour();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      navigate(TOUR_STEPS[prevIdx].route);
    }
  };

  const endTour = () => {
    setIsTourActive(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, "true");
    }
  };

  const startTour = () => {
    setIsTourActive(true);
    setCurrentStepIndex(0);
    navigate(TOUR_STEPS[0].route);
  };

  const currentStep = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];

  return (
    <TourContext.Provider
      value={{
        isTourActive,
        currentStepIndex,
        currentStep,
        totalSteps: TOUR_STEPS.length,
        language,
        setLanguage,
        startTour,
        nextStep,
        prevStep,
        endTour,
        goToStep,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
}
