import { qrPlaceholder } from '../data/showData'

function PaymentQrModal({ alphapayQrImage, onCancel, showQr, t }) {
  return (
    <div className="overlay qr-overlay">
      <div className="qr-modal" onClick={(event) => event.stopPropagation()}>
        <h4>{t('paymentQrTitle')}</h4>
        <p className="qr-subtitle">{t('qrScan', { method: showQr === 'wechat' ? 'WeChat' : 'Alipay' })}</p>
        <div className="qr-warning">{t('qrWarning')}</div>
        <div className="qr-code-frame">
          <img src={alphapayQrImage || qrPlaceholder} alt={`${showQr === 'wechat' ? 'WeChat Pay' : 'Alipay'} QR code`} />
        </div>
        <button className="qr-cancel-btn" onClick={onCancel} type="button">{t('cancelPayment')}</button>
      </div>
    </div>
  )
}

export default PaymentQrModal
