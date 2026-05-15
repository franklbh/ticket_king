function VipModal({ onClose, onContinue, setVipQty, t, vipQty }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="vip-modal" onClick={(event) => event.stopPropagation()}>
        <div className="vip-card">
          <div className="vip-card-glow" />
          <div className="vip-head">
            <div className="vip-icon">♛</div>
            <div>
              <div className="vip-eyebrow">{t('vipEyebrow')}</div>
              <div className="vip-title">{t('vipTitle')}</div>
              <div className="vip-price">{t('vipPrice')}</div>
            </div>
          </div>
          <div className="vip-benefits">
            <div className="vip-benefit">
              <span className="vip-check">✓</span>
              <strong>{t('exclusiveTour')}</strong>
            </div>
            <div className="vip-benefit">
              <span className="vip-check">✓</span>
              <strong>{t('priorityEntry')}</strong>
            </div>
            <div className="vip-benefit">
              <span className="vip-check">✓</span>
              <strong>{t('souvenir')}</strong>
            </div>
          </div>
        </div>
        <div className="vip-quantity-row">
          <div className="ticket-info">
            <div className="ticket-title">{t('vipAddon')}</div>
            <div className="ticket-desc">{t('vipDesc')}</div>
          </div>
          <div className="ticket-actions">
            <div className="counter">
              <button onClick={() => setVipQty((value) => Math.max(0, value - 1))} type="button">-</button>
              <div className="counter-value">{vipQty}</div>
              <button onClick={() => setVipQty((value) => value + 1)} type="button">+</button>
            </div>
          </div>
        </div>
        <div className="actions stacked">
          <button className="secondary" onClick={onContinue} type="button">{t('skip')}</button>
          <button className="primary" onClick={onContinue} type="button">{t('confirmUpgrade')}</button>
        </div>
      </div>
    </div>
  )
}

export default VipModal
