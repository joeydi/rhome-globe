import mapboxgl, { Map, Marker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

interface Feature {
  url?: string;
  image: string;
  country: string;
  price: string;
  type: string;
  lng: number;
  lat: number;
}

const mapRange = (inMin: number, inMax: number, outMin: number, outMax: number, clamp: boolean = false) => {
  return function scale(value: number) {
    let out = outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));

    if (clamp) {
      out = Math.min(outMax, Math.max(outMin, out));
    }

    return out;
  };
};

const scaleZ = mapRange(0, 90, 1000, 0);
const scaleBlur = mapRange(3000, 10000, 0, 10);
const scaleScale = mapRange(0, 10000, 1, 0.5);
const zoomScale = mapRange(320, 1920, 1.25, 3.5, true);

const fetchData = async (): Promise<Feature[] | null> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_ASSET_ROOT}/data.json`);

    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const json = await response.json();

    return json;
  } catch (error) {
    let message = "Unknown Error";

    if (error instanceof Error) {
      message = error.message;
    }

    console.error(message);

    return null;
  }
};

const updateMarkers = (markers: Marker[], map: Map) => {
  const center = map.getCenter();

  for (const marker of markers) {
    const distance = center.distanceTo(marker.getLngLat()) / 1000;
    const blur = scaleBlur(distance);
    const scale = scaleScale(distance);
    const lngDiff = Math.abs(center.lng - marker.getLngLat().lng);

    const markerElement = marker.getElement();
    const wrapElement: HTMLDivElement | null = markerElement.querySelector(".wrap");
    const cardElement: HTMLDivElement | null = markerElement.querySelector(".card");

    if (wrapElement) {
      wrapElement.style.filter = `blur(${blur}px)`;
      wrapElement.style.opacity = lngDiff > 60 ? "0" : "1";
    }

    if (cardElement) {
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
    projection: "globe",
    center: [-96.4, 56.43],
    zoom: zoomScale(window.innerWidth),
    maxZoom: 4.8,
    minZoom: 2.5,
    pitch: 70,
    scrollZoom: false,
    boxZoom: false,
    doubleClickZoom: false,
    dragRotate: false,
    touchPitch: false,
    attributionControl: false,
  });

  map.addControl(
    new mapboxgl.AttributionControl({
      compact: true,
    })
  );

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

  fetchData().then((data) => {
    if (!data) {
      return;
    }

    const markers: Marker[] = [];

    for (const feature of data) {
      let el;

      if (feature.url) {
        el = document.createElement("a");
        el.href = feature.url;
        el.target = "_blank";
      } else {
        el = document.createElement("div");
      }

      el.className = "marker";
      el.innerHTML = `
        <div class="wrap">
          <div class="scale">
            <div class="card">
              <img src="${import.meta.env.VITE_ASSET_ROOT}${feature.image}" alt="" />
              <div class="details">
                <span>${feature.price}</span>
                <span>${feature.type}</span>
              </div>
            </div>
          </div>
          <div class="flag">
            <img src="${import.meta.env.VITE_ASSET_ROOT}/flags/${feature.country}.svg" alt="" />
          </div>
        </div>`;

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: "bottom",
      })
        .setLngLat([feature.lng, feature.lat])
        .addTo(map);

      const zIndex = Math.floor(scaleZ(feature.lat)).toString();
      const element = marker.getElement();
      element.style.zIndex = zIndex;

      markers.push(marker);
    }

    updateMarkers(markers, map);

    map.on("move", () => {
      updateMarkers(markers, map);
    });
  });
}
