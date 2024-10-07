import mapboxgl, { Marker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import data from "./data.json";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const mapRange = (inMin: number, inMax: number, outMin: number, outMax: number) => {
  return function scale(value: number) {
    return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
  };
};

const scaleZ = mapRange(0, 90, 1000, 0);
const scaleBlur = mapRange(3000, 10000, 0, 10);
const scaleScale = mapRange(0, 10000, 1, 0.5);

const updateMarkers = (markers, map) => {
  const center = map.getCenter();

  for (const marker of markers) {
    const distance = center.distanceTo(marker.getLngLat()) / 1000;
    const blur = scaleBlur(distance);
    const scale = scaleScale(distance);

    const markerElement = marker.getElement();
    const cardElement: HTMLDivElement | null = markerElement.querySelector(".card");

    if (markerElement && cardElement) {
      markerElement.style.filter = `blur(${blur}px)`;
      cardElement.style.scale = `${scale}`;
    }
  }
};

export function initGlobe(element: HTMLDivElement | null) {
  if (!element) {
    return;
  }

  const map = new mapboxgl.Map({
    container: element,
    style: "mapbox://styles/rhome/cm1z8z3e300sg01pbeyd966ey",
    center: [-96.4, 56.43],
    zoom: 3,
    maxZoom: 4.8,
    minZoom: 2.5,
    pitch: 75,
    scrollZoom: false,
    boxZoom: false,
    doubleClickZoom: false,
    dragRotate: false,
    touchPitch: false,
  });

  const markers: Marker[] = [];

  for (const feature of data) {
    const el = document.createElement("div");
    el.className = "marker";
    el.innerHTML = `
      <div class="card">
        <img src="${import.meta.env.VITE_ASSET_ROOT}${feature.image}" alt="" />
        <div class="details">
          <span>${feature.price}</span>
          <span>${feature.type}</span>
        </div>
      </div>
      <div class="flag">
        <img src="${import.meta.env.VITE_ASSET_ROOT}/flags/${feature.country}.svg" alt="" />
      </div>`;

    const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" }).setLngLat([feature.lng, feature.lat]).addTo(map);

    const zIndex = Math.floor(scaleZ(feature.lat)).toString();
    const element = marker.getElement();
    element.style.zIndex = zIndex;

    markers.push(marker);
  }

  updateMarkers(markers, map);

  map.on("move", () => {
    updateMarkers(markers, map);
  });
}
