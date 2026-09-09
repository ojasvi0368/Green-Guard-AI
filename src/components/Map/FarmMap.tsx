'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './FarmMap.module.css';

interface PolygonCoord {
    lat: number;
    lng: number;
}

interface FarmMapProps {
    onPolygonCreated?: (coordinates: PolygonCoord[], areaHectares?: number) => void;
    existingPolygons?: { id: string; name: string; coordinates: PolygonCoord[] }[];
    center?: [number, number];
    zoom?: number;
    editable?: boolean;
    height?: string;
}

export default function FarmMap({
    onPolygonCreated,
    existingPolygons = [],
    center = [20.5937, 78.9629], // India center
    zoom = 5,
    editable = true,
    height = '400px',
}: FarmMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const drawnItemsRef = useRef<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Store callback in a ref so the draw handler always sees the latest
    // without re-creating the map when the parent re-renders.
    const onPolygonCreatedRef = useRef(onPolygonCreated);
    onPolygonCreatedRef.current = onPolygonCreated;

    useEffect(() => {
        // Abort flag — set to true when this effect cleans up.
        // Prevents the async init from completing if React unmounts
        // the component mid-import (StrictMode double-mount).
        let cancelled = false;
        const container = mapRef.current;

        async function initMap() {
            if (!container) return;

            // Dynamic imports for SSR safety
            const L = (await import('leaflet')).default;
            if (cancelled) return; // component unmounted during import

            await import('leaflet/dist/leaflet.css');
            await import('leaflet-draw');
            await import('leaflet-draw/dist/leaflet.draw.css');
            if (cancelled) return; // component unmounted during import

            // Fix Leaflet default marker icons
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            });

            // Final guard: if another map was already attached to this
            // container (shouldn't happen with the cancelled flag, but
            // belt-and-suspenders), bail out.
            if (mapInstanceRef.current) return;

            const map = L.map(container).setView(center, zoom);

            // Tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 19,
            }).addTo(map);

            const drawnItems = new L.FeatureGroup();
            map.addLayer(drawnItems);
            drawnItemsRef.current = drawnItems;

            // Add existing polygons
            existingPolygons.forEach((poly) => {
                if (poly.coordinates && poly.coordinates.length > 0) {
                    const latlngs = poly.coordinates.map((c) => [c.lat, c.lng] as [number, number]);
                    const polygon = L.polygon(latlngs, {
                        color: '#10B981',
                        fillColor: '#10B981',
                        fillOpacity: 0.2,
                        weight: 2,
                    });
                    polygon.bindPopup(`<b>${poly.name}</b>`);
                    drawnItems.addLayer(polygon);
                }
            });

            // Fit bounds to existing polygons if any
            if (existingPolygons.length > 0 && drawnItems.getLayers().length > 0) {
                map.fitBounds(drawnItems.getBounds(), { padding: [50, 50] });
            }

            if (editable) {
                const drawControl = new (L.Control as any).Draw({
                    position: 'topright',
                    draw: {
                        polygon: {
                            allowIntersection: false,
                            drawError: {
                                color: '#e1e100',
                                message: '<strong>Polygon edges cannot cross!</strong>',
                            },
                            shapeOptions: {
                                color: '#10B981',
                                fillColor: '#10B981',
                                fillOpacity: 0.2,
                            },
                        },
                        polyline: false,
                        rectangle: {
                            shapeOptions: {
                                color: '#10B981',
                                fillColor: '#10B981',
                                fillOpacity: 0.2,
                            },
                        },
                        circle: false,
                        circlemarker: false,
                        marker: false,
                    },
                    edit: {
                        featureGroup: drawnItems,
                        remove: true,
                    },
                });

                map.addControl(drawControl);

                map.on((L as any).Draw.Event.CREATED, (e: any) => {
                    const layer = e.layer;
                    const latlngs = layer.getLatLngs()[0];

                    // Calculate geodesic area in square meters
                    const areaM2 = (L as any).GeometryUtil.geodesicArea(latlngs);
                    const areaHectares = Math.round((areaM2 / 10000) * 100) / 100;

                    // Debug log
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log('📐 Polygon Area:', areaHectares, 'hectares');
                    console.log('📐 Polygon Area:', areaM2.toFixed(0), 'm²');
                    console.log('📍 Polygon Coordinates:', latlngs.map((ll: any) => `[${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}]`).join(', '));
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━');

                    // Validate area: AgroMonitoring requires 1–3000 hectares
                    if (areaHectares > 3000) {
                        alert(`⚠️ Farm size too large!\n\nDrawn area: ${areaHectares} hectares\nMaximum allowed: 3,000 hectares\n\nPlease draw a smaller area.`);
                        return;
                    }

                    if (areaHectares < 1) {
                        alert(`⚠️ Farm size too small!\n\nDrawn area: ${areaHectares} hectares\nMinimum required: 1 hectare\n\nPlease draw a larger area.`);
                        return;
                    }

                    // Area is valid — add to map and notify parent
                    drawnItems.addLayer(layer);

                    const coordinates: PolygonCoord[] = latlngs.map((ll: any) => ({
                        lat: ll.lat,
                        lng: ll.lng,
                    }));

                    // Use ref to get the latest callback (avoids stale closure)
                    onPolygonCreatedRef.current?.(coordinates, areaHectares);
                });
            }

            mapInstanceRef.current = map;
            setIsLoaded(true);

            // Fix map rendering in dynamic container
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }

        initMap();

        return () => {
            cancelled = true;
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
            drawnItemsRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className={styles.mapWrapper}>
            {!isLoaded && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.spinner}></div>
                    <p>Loading map...</p>
                </div>
            )}
            <div
                ref={mapRef}
                className={styles.mapContainer}
                style={{ height }}
            />
        </div>
    );
}
