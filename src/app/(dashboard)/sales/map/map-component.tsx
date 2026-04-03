"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type L from "leaflet";

export type MapContact = {
  id: string;
  firstName: string;
  lastName?: string | null;
  company?: string | null;
  phone?: string | null;
  latitude: number | null;
  longitude: number | null;
};

type Props = {
  contacts: MapContact[];
  selectedId?: string | null;
  routeLines?: { lat: number; lng: number }[];
  onMarkerClick?: (id: string) => void;
  className?: string;
};

// Default center on India
const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;

export function MapComponent({
  contacts,
  selectedId,
  routeLines,
  onMarkerClick,
  className,
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    async function initMap() {
      const leaflet = await import("leaflet");

      if (cancelled || !containerRef.current) return;

      // Fix default marker icon paths for webpack/next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = leaflet.map(containerRef.current!, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
      });

      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        })
        .addTo(map);

      mapRef.current = map;

      // Trigger a resize after mount to fix tile loading
      setTimeout(() => map.invalidateSize(), 100);
    }

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when contacts change
  useEffect(() => {
    if (!mapRef.current) return;

    async function updateMarkers() {
      const leaflet = await import("leaflet");
      const map = mapRef.current!;

      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const locatedContacts = contacts.filter(
        (c) => c.latitude != null && c.longitude != null
      );

      locatedContacts.forEach((contact) => {
        const name = [contact.firstName, contact.lastName]
          .filter(Boolean)
          .join(" ");

        const popupContent = `
          <div style="min-width: 160px;">
            <strong>${name}</strong>
            ${contact.company ? `<br/><span style="color: #666;">${contact.company}</span>` : ""}
            ${contact.phone ? `<br/>Phone: ${contact.phone}` : ""}
          </div>
        `;

        const marker = leaflet
          .marker([contact.latitude!, contact.longitude!])
          .addTo(map)
          .bindPopup(popupContent);

        if (onMarkerClick) {
          marker.on("click", () => onMarkerClick(contact.id));
        }

        markersRef.current.push(marker);
      });

      // Fit bounds if there are markers
      if (locatedContacts.length > 1) {
        const bounds = leaflet.latLngBounds(
          locatedContacts.map((c) => [c.latitude!, c.longitude!] as [number, number])
        );
        map.fitBounds(bounds, { padding: [40, 40] });
      } else if (locatedContacts.length === 1) {
        map.setView(
          [locatedContacts[0].latitude!, locatedContacts[0].longitude!],
          13
        );
      }
    }

    updateMarkers();
  }, [contacts, onMarkerClick]);

  // Pan to selected contact
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;

    const contact = contacts.find((c) => c.id === selectedId);
    if (contact?.latitude != null && contact?.longitude != null) {
      mapRef.current.setView([contact.latitude, contact.longitude], 14, {
        animate: true,
      });

      // Open popup for the selected marker
      const idx = contacts
        .filter((c) => c.latitude != null && c.longitude != null)
        .findIndex((c) => c.id === selectedId);
      if (idx >= 0 && markersRef.current[idx]) {
        markersRef.current[idx].openPopup();
      }
    }
  }, [selectedId, contacts]);

  // Draw route lines
  useEffect(() => {
    if (!mapRef.current) return;

    async function drawLines() {
      const leaflet = await import("leaflet");
      const map = mapRef.current!;

      // Remove existing polyline
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }

      if (routeLines && routeLines.length > 1) {
        const latlngs = routeLines.map(
          (p) => [p.lat, p.lng] as [number, number]
        );
        polylineRef.current = leaflet
          .polyline(latlngs, {
            color: "#3b82f6",
            weight: 3,
            opacity: 0.7,
            dashArray: "8, 8",
          })
          .addTo(map);
      }
    }

    drawLines();
  }, [routeLines]);

  return (
    <div
      ref={containerRef}
      className={className ?? "h-full w-full min-h-[400px]"}
      style={{ zIndex: 0 }}
    />
  );
}
