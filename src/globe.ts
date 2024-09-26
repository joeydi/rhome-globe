import mapboxgl, { Marker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import data from "./data.json";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

var mapRange = function (inMin: number, inMax: number, outMin: number, outMax: number) {
  return function scale(value: number) {
    return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
  };
};

export function initGlobe(element: HTMLDivElement | null) {
  if (!element) {
    return;
  }

  const map = new mapboxgl.Map({
    container: element,
    style: "mapbox://styles/joeydi/cm1jhfcv6002001p850dd15pk",
    center: [-96.4, 56.43],
    zoom: 3,
    maxZoom: 4.8,
    minZoom: 2.5,
    pitch: 75,
  });

  const markers: Marker[] = [];

  for (const feature of data) {
    const el = document.createElement("div");
    el.className = "marker";
    el.innerHTML = `
        <div class="card">
            <img src="${feature.image}" alt="" />
            <div class="details">
                <span>${feature.price}</span>
                <span>${feature.type}</span>
            </div>
        </div>
        <div class="flag">
            <img src="/flags/${feature.country}.svg" alt="" />
        </div>`;

    const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" }).setLngLat([feature.lng, feature.lat]).addTo(map);
    markers.push(marker);
  }

  map.on("click", (e) => {
    //   const center = map.getCenter();
    //   console.log(center);

    // const zoom = map.getZoom();
    // console.log(zoom);

    console.log(e.lngLat);
  });

  const zScale = mapRange(0, 10000, 1000, 1);
  const scaleBlur = mapRange(3000, 10000, 0, 10);
  const scaleScale = mapRange(0, 10000, 1, 0.5);

  //   console.log(scale(100));
  //   console.log(scale(1000));
  //   console.log(scale(10000));

  map.on("move", () => {
    const center = map.getCenter();

    for (const marker of markers) {
      const distance = center.distanceTo(marker.getLngLat()) / 1000;
      const zIndex = Math.floor(zScale(distance));
      const blur = scaleBlur(distance);
      const scale = scaleScale(distance);

      const markerElement = marker.getElement();
      const cardElement: HTMLDivElement | null = markerElement.querySelector(".card");

      if (markerElement && cardElement) {
        markerElement.style.zIndex = `${zIndex}`;
        markerElement.style.filter = `blur(${blur}px)`;
        cardElement.style.scale = `${scale}`;
      }
    }
  });
}
