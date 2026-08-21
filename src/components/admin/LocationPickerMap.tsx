'use client';

import { useEffect, useRef } from 'react';
import type * as LType from 'leaflet';

interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  radius: number;
  lokasiNama: string;
  isEditing?: boolean;
  onChangeLocation: (lat: number, lng: number) => void;
}

export default function LocationPickerMap({
  latitude,
  longitude,
  radius,
  lokasiNama,
  isEditing = false,
  onChangeLocation,
}: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LType.Map | null>(null);
  const markerRef = useRef<LType.Marker | null>(null);
  const circleRef = useRef<LType.Circle | null>(null);
  const isEditingRef = useRef<boolean>(isEditing);

  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  useEffect(() => {
    if (!mapContainerRef.current || typeof window === 'undefined') return;

    let isMounted = true;

    // Dynamically import leaflet to avoid SSR window errors
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Fix default Leaflet icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Custom green marker icon
      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="
            background: #1B6B4A;
            color: white;
            width: 38px;
            height: 38px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(27, 107, 74, 0.45);
            border: 2.5px solid white;
            cursor: pointer;
          ">
            <span style="transform: rotate(45deg); font-size: 16px; font-weight: bold;">🕌</span>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -38],
      });

      if (!mapInstanceRef.current) {
        // Initialize Map
        const map = L.map(mapContainerRef.current, {
          center: [latitude, longitude],
          zoom: 16,
          zoomControl: true,
        });

        // OpenStreetMap Tile Layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        // Marker (draggable only when isEditing)
        const marker = L.marker([latitude, longitude], {
          icon: customIcon,
          draggable: isEditingRef.current,
          title: lokasiNama,
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
            <strong style="color: #1B6B4A; font-size: 13px;">${lokasiNama}</strong><br/>
            <span>📍 Pusat Titik Presensi Yayasan</span>
          </div>
        `).openPopup();

        // Drag handler
        marker.on('dragend', (e) => {
          if (!isEditingRef.current) return;
          const newPos = (e.target as LType.Marker).getLatLng();
          onChangeLocation(Number(newPos.lat.toFixed(6)), Number(newPos.lng.toFixed(6)));
        });

        // Map Click handler - only active when isEditing
        map.on('click', (e: LType.LeafletMouseEvent) => {
          if (!isEditingRef.current) return;
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          onChangeLocation(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
        });

        // Radius Circle Overlay
        const circle = L.circle([latitude, longitude], {
          radius: radius,
          color: '#1B6B4A',
          weight: 2,
          opacity: 0.85,
          fillColor: '#1B6B4A',
          fillOpacity: 0.15,
        }).addTo(map);

        mapInstanceRef.current = map;
        markerRef.current = marker;
        circleRef.current = circle;
      }
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
  }, []);

  // Update draggable state when isEditing changes
  useEffect(() => {
    if (markerRef.current) {
      if (isEditing) {
        markerRef.current.dragging?.enable();
      } else {
        markerRef.current.dragging?.disable();
      }
    }
  }, [isEditing]);

  // Update marker position & circle when latitude / longitude change
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && circleRef.current) {
      const latlng: [number, number] = [latitude, longitude];
      markerRef.current.setLatLng(latlng);
      circleRef.current.setLatLng(latlng);
    }
  }, [latitude, longitude]);

  // Update circle radius dynamically when slider changes
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius);
    }
  }, [radius]);

  // Recenter map button
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([latitude, longitude], 16, { animate: true });
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 320, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: 320, zIndex: 1 }} />
      
      {/* Mode Indicator Overlay */}
      <div style={{
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 10,
        background: isEditing ? '#FEF3C7' : 'rgba(255, 255, 255, 0.95)',
        color: isEditing ? '#92400E' : '#334155',
        border: isEditing ? '1.5px solid #F59E0B' : '1px solid #CBD5E1',
        backdropFilter: 'blur(4px)',
        padding: '6px 12px',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 'var(--font-size-xs)',
        fontWeight: 700,
      }}>
        <span>{isEditing ? '✏️ Mode Edit Titik Aktif' : '🔒 Titik Lokasi Terkunci (Lihat Saja)'}</span>
      </div>

      {/* Overlay guide button */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        zIndex: 10,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(4px)',
        padding: '6px 12px',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 'var(--font-size-xs)',
      }}>
        <button
          type="button"
          onClick={handleRecenter}
          style={{
            background: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 8px',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Pusatkan Peta
        </button>
        <span style={{ color: 'var(--color-text-secondary)' }}>
          Radius Aktif: <strong>{radius} meter</strong>
        </span>
      </div>
    </div>
  );
}
