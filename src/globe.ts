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
    pitch: 60,
  });

  const markers: Marker[] = [];

  for (const feature of data) {
    const el = document.createElement("div");
    el.className = "marker";
    el.innerHTML = `<div class="card"><img src="${feature.image}" alt="" /><div class="details"><span>${feature.price}</span><span>${feature.type}</span></div></div>`;

    const marker = new mapboxgl.Marker(el).setLngLat([feature.lng, feature.lat]).addTo(map);
    markers.push(marker);
  }

  //   map.on("click", (e) => {
  //     const center = map.getCenter();
  //     console.log(center);

  //     const zoom = map.getZoom();
  //     console.log(zoom);

  //     console.log(e.lngLat);
  //   });
  const scaleBlur = mapRange(3000, 10000, 0, 10);
  const scaleScale = mapRange(0, 10000, 1, 0.5);

  //   console.log(scale(100));
  //   console.log(scale(1000));
  //   console.log(scale(10000));

  map.on("drag", () => {
    const center = map.getCenter();

    for (const marker of markers) {
      const distance = center.distanceTo(marker.getLngLat()) / 1000;
      const blur = scaleBlur(distance);
      const scale = scaleScale(distance);

      const card: HTMLDivElement | null = marker.getElement().querySelector(".card");

      if (card) {
        card.style.filter = `blur(${blur}px)`;
        card.style.scale = `${scale}`;
      }
    }
  });
}
