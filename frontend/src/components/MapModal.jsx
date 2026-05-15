import { useEffect, useRef } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { GOOGLE_MAPS_URL, VENUE_COORDS } from '../constants/venue'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const rustIcon = new L.DivIcon({
  html: '<div style="width:18px;height:24px;position:relative"><div style="width:18px;height:18px;background:#7d2c21;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div></div>',
  iconSize: [18, 24],
  iconAnchor: [9, 24],
  popupAnchor: [0, -26],
  className: '',
})

function MapModal({ onClose }) {
  const markerRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => markerRef.current?.openPopup(), 120)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="map-modal-overlay" onClick={onClose}>
      <div className="map-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="map-modal-close" onClick={onClose} type="button" aria-label="Close map">x</button>
        <MapContainer center={VENUE_COORDS} zoom={16} style={{ width: '100%', height: '100%' }} zoomControl={true}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          <Marker position={VENUE_COORDS} icon={rustIcon} ref={markerRef}>
            <Popup closeButton={true} autoPan={true}>
              <div className="map-popup">
                <div className="map-popup-title">WE ARE VR</div>
                <a href={GOOGLE_MAPS_URL} target="_blank" rel="noreferrer" className="map-popup-addr">
                  Unit 210<br />5300 Number 3 Rd,<br />Richmond, BC
                </a>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  )
}

export default MapModal
