const flightMap = document.getElementById("flight-map");
if (flightMap) {
  const cities = {
    madrid: { title: "ESCP Business School", detail: "Assistant Professor · Madrid · 2026–present", link: "/career/#escp" },
    bergamo: { title: "University of Bergamo & Bocconi", detail: "Research & teaching · Bergamo / Milan", link: "/career/#bergamo" },
    jerusalem: { title: "The Hebrew University of Jerusalem", detail: "Postdoctoral Researcher · 2023–2024", link: "/career/#jerusalem" },
  };
  document.querySelectorAll("[data-city]").forEach((button) => {
    button.addEventListener("click", () => {
      const city = button.dataset.city;
      document.querySelectorAll("[data-city]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      const caption = document.getElementById("map-location");
      caption.querySelector("strong").textContent = cities[city].title;
      caption.querySelector("p").textContent = cities[city].detail;
      document.getElementById("map-career-link").href = cities[city].link;
      flightMap.querySelectorAll(".route:not(.secondary)").forEach((route) => route.classList.toggle("is-muted", !route.dataset.connects.split(" ").includes(city)));
      flightMap.querySelectorAll("[data-map-node]").forEach((node) => {
        node.querySelector(".city-ring").setAttribute("r", node.dataset.mapNode === city ? "16" : "9");
      });
    });
  });

  const planes = [...flightMap.querySelectorAll("[data-flight]")].map((element) => {
    const route = document.getElementById(`route-${element.dataset.flight}`);
    return { element, route, length: route.getTotalLength(), duration: Number(element.dataset.duration), progress: Number(element.dataset.offset), scale: element.classList.contains("secondary") ? .65 : .8 };
  });
  function positionPlanes() {
    for (const plane of planes) {
      const distance = plane.progress * plane.length;
      const point = plane.route.getPointAtLength(distance);
      const before = plane.route.getPointAtLength(Math.max(0, distance - .5));
      const after = plane.route.getPointAtLength(Math.min(plane.length, distance + .5));
      const angle = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI;
      plane.element.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${angle}) scale(${plane.scale})`);
    }
  }
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const pauseButton = document.getElementById("map-pause");
  let paused = reducedMotion.matches;
  let visible = true;
  let frame = null;
  let lastTime = null;
  function animate(time) {
    const seconds = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, .1);
    lastTime = time;
    for (const plane of planes) plane.progress = (plane.progress + seconds / plane.duration) % 1;
    positionPlanes();
    frame = requestAnimationFrame(animate);
  }
  function updateAnimation() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    lastTime = null;
    if (!paused && visible && !document.hidden) frame = requestAnimationFrame(animate);
    pauseButton.setAttribute("aria-pressed", String(paused));
    pauseButton.setAttribute("aria-label", paused ? "Play aircraft animation" : "Pause aircraft animation");
    pauseButton.querySelector("span").textContent = paused ? "Play" : "Pause";
    pauseButton.querySelector("path").setAttribute("d", paused ? "M3 2 10 6 3 10Z" : "M4 2v8M8 2v8");
  }
  pauseButton.addEventListener("click", () => { paused = !paused; updateAnimation(); });
  reducedMotion.addEventListener("change", () => { paused = reducedMotion.matches; updateAnimation(); });
  document.addEventListener("visibilitychange", updateAnimation);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; updateAnimation(); }, { threshold: 0 }).observe(flightMap);
  }
  positionPlanes();
  updateAnimation();
}
