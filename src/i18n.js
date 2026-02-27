import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      analysisTopic: 'Analysis Topic',
      focusedTopic: 'Focused Topic',
      changeTopic: 'Change Topic',
      logout: 'Logout',
      analyticsCharts: 'Analytics Charts',
      newsFeed: 'News Intelligence Feed',
      aiPanel: 'Explainable AI Panel',
      login: 'Log in',
      signup: 'Sign up',
      createAccount: 'Create your intelligence access account',
    },
  },
  hi: {
    translation: {
      analysisTopic: 'विश्लेषण विषय',
      focusedTopic: 'केंद्रित विषय',
      changeTopic: 'विषय बदलें',
      logout: 'लॉग आउट',
      analyticsCharts: 'विश्लेषण चार्ट',
      newsFeed: 'समाचार इंटेलिजेंस फ़ीड',
      aiPanel: 'व्याख्येय एआई पैनल',
      login: 'लॉग इन',
      signup: 'साइन अप',
      createAccount: 'अपना इंटेलिजेंस एक्सेस अकाउंट बनाएं',
    },
  },
  te: {
    translation: {
      analysisTopic: 'విశ్లేషణ అంశం',
      focusedTopic: 'ఎంచుకున్న అంశం',
      changeTopic: 'అంశాన్ని మార్చండి',
      logout: 'లాగ్ అవుట్',
      analyticsCharts: 'విశ్లేషణ చార్టులు',
      newsFeed: 'వార్తల ఇంటెలిజెన్స్ ఫీడ్',
      aiPanel: 'ఎక్స్‌ప్లైనబుల్ AI ప్యానెల్',
      login: 'లాగిన్',
      signup: 'సైన్ అప్',
      createAccount: 'మీ ఇంటెలిజెన్స్ యాక్సెస్ ఖాతాను సృష్టించండి',
    },
  },
  ta: {
    translation: {
      analysisTopic: 'பகுப்பாய்வு தலைப்பு',
      focusedTopic: 'தேர்ந்தெடுத்த தலைப்பு',
      changeTopic: 'தலைப்பை மாற்று',
      logout: 'வெளியேறு',
      analyticsCharts: 'பகுப்பாய்வு விளக்கப்படங்கள்',
      newsFeed: 'செய்தி நுண்ணறிவு ஓடை',
      aiPanel: 'விளக்கக்கூடிய AI பலகை',
      login: 'உள்நுழை',
      signup: 'பதிவு செய்',
      createAccount: 'உங்கள் நுண்ணறிவு அணுகல் கணக்கை உருவாக்கவும்',
    },
  },
  kn: {
    translation: {
      analysisTopic: 'ವಿಶ್ಲೇಷಣಾ ವಿಷಯ',
      focusedTopic: 'ಆಯ್ಕೆ ಮಾಡಿದ ವಿಷಯ',
      changeTopic: 'ವಿಷಯ ಬದಲಿಸಿ',
      logout: 'ಲಾಗ್ ಔಟ್',
      analyticsCharts: 'ವಿಶ್ಲೇಷಣಾ ಚಾರ್ಟ್‌ಗಳು',
      newsFeed: 'ಸುದ್ದಿ ಇಂಟೆಲಿಜೆನ್ಸ್ ಫೀಡ್',
      aiPanel: 'ವಿವರಣಾತ್ಮಕ AI ಪ್ಯಾನೆಲ್',
      login: 'ಲಾಗಿನ್',
      signup: 'ಸೈನ್ ಅಪ್',
      createAccount: 'ನಿಮ್ಮ ಇಂಟೆಲಿಜೆನ್ಸ್ ಪ್ರವೇಶ ಖಾತೆಯನ್ನು ಸೃಷ್ಟಿಸಿ',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
