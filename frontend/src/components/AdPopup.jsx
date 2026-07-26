import { useEffect } from 'react'
import terracottaAdImage from '../picture/terracotta/1.jpg'

function AdPopup({ languages, onBook, onClose, selectedLang, setSelectedLang, t }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="ad-popup-overlay" role="presentation" onClick={onClose}>
      <section
        className="ad-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ad-popup-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="ad-popup-close" type="button" aria-label={t('close')} onClick={onClose}>
          <i className="fa fa-times" />
        </button>

        <div className="ad-popup-media">
          <img src={terracottaAdImage} alt="" />
          <div className="ad-popup-media-shade" />
          <div className="ad-popup-brand">
            <span>{t('adBrandLine')}</span>
          </div>
          <div className="ad-popup-burst" aria-hidden="true">
            <span>{t('adDiscountShort')}</span>
          </div>
        </div>

        <div className="ad-popup-content">
          <div className="ad-popup-lang" aria-label="Language">
            {languages.map((language) => (
              <button
                key={language.code}
                className={language.code === selectedLang.code ? 'active' : ''}
                type="button"
                onClick={() => setSelectedLang(language)}
              >
                {language.short}
              </button>
            ))}
          </div>
          <div className="ad-popup-kicker">{t('adKicker')}</div>
          <h2 id="ad-popup-title">{t('adTitle')}</h2>
          <p>{t('adBody')}</p>

          <div className="ad-popup-points">
            <span><i className="fa fa-vr-cardboard" />{t('adPointVr')}</span>
            <span><i className="fa fa-users" />{t('adPointFamily')}</span>
            <span><i className="fa fa-calendar-day" />{t('adPointTuesday')}</span>
          </div>

          <div className="ad-popup-actions">
            <button className="ad-popup-primary" type="button" onClick={onBook}>
              {t('adCta')}
              <i className="fa fa-arrow-right" />
            </button>
            <button className="ad-popup-secondary" type="button" onClick={onClose}>
              {t('adLater')}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AdPopup
