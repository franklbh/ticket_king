import logoWhite from '../user_media/logo_white.png'

function BrandLogo({ height = 40 }) {
  return (
    <img src={logoWhite} alt="WE ARE VR" style={{ height, width: 'auto', display: 'block' }} />
  )
}

export default BrandLogo
