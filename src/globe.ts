import mapboxgl, { Map, Marker } from "mapbox-gl";
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
const zoomScale = mapRange(320, 1600, 1.25, 3.25);

const updateMarkers = (markers: Marker[], map: Map) => {
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
    zoom: zoomScale(window.innerWidth),
    maxZoom: 4.8,
    minZoom: 2.5,
    pitch: 60,
    scrollZoom: false,
    boxZoom: false,
    doubleClickZoom: false,
    dragRotate: false,
    touchPitch: false,
  });

  window.addEventListener("resize", () => {
    map.setZoom(zoomScale(window.innerWidth));
  });

  const secondsPerRevolution = 120;
  let userInteracting = false;
  let timeoutDuration = 3000;
  let interactionTimeout: ReturnType<typeof setTimeout>;

  function spinGlobe() {
    if (!userInteracting) {
      let distancePerSecond = 360 / secondsPerRevolution;

      const center = map.getCenter();

      center.lng += distancePerSecond;

      map.easeTo({ center, duration: 1000, easing: (n) => n });
    }
  }

  spinGlobe();

  // Pause spinning on interaction
  map.on("mousedown", () => {
    userInteracting = true;
    clearTimeout(interactionTimeout);
  });

  map.on("touchstart", () => {
    userInteracting = true;
    clearTimeout(interactionTimeout);
  });

  // Restart spinning the globe when interaction is complete
  map.on("mouseup", () => {
    clearTimeout(interactionTimeout);
    interactionTimeout = setTimeout(() => {
      userInteracting = false;
      spinGlobe();
    }, timeoutDuration);
  });

  map.on("dragend", () => {
    clearTimeout(interactionTimeout);
    interactionTimeout = setTimeout(() => {
      userInteracting = false;
      spinGlobe();
    }, timeoutDuration);
  });

  // When animation is complete, start spinning again
  map.on("moveend", () => {
    if (!userInteracting) {
      spinGlobe();
    }
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
