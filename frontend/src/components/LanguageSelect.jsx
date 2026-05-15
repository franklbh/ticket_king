import { languages } from '../i18n/translations'

function LanguageSelect({ langOpen, selectedLang, setLangOpen, setSelectedLang }) {
  return (
    <div className="lang">
      <button className="lang-toggle" onClick={() => setLangOpen((value) => !value)} aria-expanded={langOpen} type="button">
        <span className="lang-icon"><span className="lang-a">A</span><span className="lang-translate">文</span></span>
        <span className="lang-down">▾</span>
      </button>
      {langOpen && (
        <div className="lang-menu">
          {languages.map((language) => (
            <button
              className={`lang-option ${language.code === selectedLang.code ? 'active' : ''}`}
              onClick={() => { setSelectedLang(language); setLangOpen(false) }}
              key={language.code}
              type="button"
            >
              {language.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LanguageSelect
