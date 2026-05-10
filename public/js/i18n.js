const translations = {};

async function loadTranslations(lang) {
    if (translations[lang]) return translations[lang];
    
    try {
        const response = await fetch(`/locales/${lang}.json`);
        const data = await response.json();
        translations[lang] = data;
        return data;
    } catch (error) {
        console.error(`Could not load translation for ${lang}:`, error);
        return null;
    }
}

function applyTranslations(data, lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (data[key]) {
            if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.placeholder) {
                el.placeholder = data[key];
            } else {
                el.innerHTML = data[key];
            }
        }
    });

    // Handle RTL for Arabic
    if (lang === 'ar') {
        document.documentElement.dir = 'rtl';
        document.body.classList.add('lang-ar');
    } else {
        document.documentElement.dir = 'ltr';
        document.body.classList.remove('lang-ar');
    }
}

async function setLanguage(lang) {
    const data = await loadTranslations(lang);
    if (data) {
        applyTranslations(data, lang);
        localStorage.setItem('preferred_lang', lang);
        document.getElementById('current-lang-text').innerText = lang.toUpperCase();
    }
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('preferred_lang') || 'tr';
    setLanguage(savedLang);

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        const switcher = document.querySelector('.lang-switcher');
        const dropdown = document.getElementById('lang-dropdown');
        if (switcher && !switcher.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
});
