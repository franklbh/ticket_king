import { languages } from '../i18n/translations'

function LanguageSelect({ selectedLang, setSelectedLang }) {
  return (
    <div className="lang-switcher" role="group" aria-label="Language">
      {languages.map((language) => (
        <button
          key={language.code}
          className={`lang-pill ${language.code === selectedLang.code ? 'active' : ''}`}
          onClick={() => setSelectedLang(language)}
          type="button"
          aria-pressed={language.code === selectedLang.code}
          title={language.label}
        >
          {language.short}
        </button>
      ))}
    </div>
  )
}

export default LanguageSelect
