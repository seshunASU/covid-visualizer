<script lang="ts">
  import { onMount } from "svelte";
  import { geoPath, geoMercator } from "d3-geo";
  import { select } from "d3-selection";
  import { zoom } from "d3-zoom";
  import { scaleLog } from "d3-scale";
  import { quantile } from "d3-array";
  import { feature } from "topojson-client";
  import type { Topology } from "topojson-specification";
  import type { FeatureCollection, Geometry, GeoJsonProperties, Feature } from "geojson";
  import RangeSlider from "svelte-range-slider-pips";

  // TODO: fix antartica?? whatever"s at the bottom
  
  // Configuration
  const width = 960;
  const height = 500;
  const minDate = new Date(Date.UTC(2020, 0, 1));
  const maxDate = new Date(Date.UTC(2022, 8, 15));
  const modeToColor: Record<string, string> = {
    confirmed: "green",
    deceased: "#dc2626",
    recovered: "#08519c"
  }
  const modeToLabel: Record<string, string> = {
    confirmed: "Confirmed Cases",
    deceased: "Deaths",
    recovered: "Recoveries"
  }

  // Variables
  let mode = "confirmed";
  let svgElement: SVGSVGElement;
  let mapData: Array<Feature<Geometry, GeoJsonProperties>> = [];
  let error: string | null = null;
  let covidData: Record<string, Record<string, number>> = {};
  let loading = true;
  let colorScale = scaleLog<string>()
    .domain([1, 10000000])
    .range(["#eee", modeToColor.confirmed])
    .clamp(true)
  ;

  // Tooltip variables
  let tooltip: HTMLDivElement;
  let tooltipVisible = false;
  let tooltipContent = { countryName: "", value: 0 };
  let tooltipPosition = { x: 0, y: 0 };
  let countryNameMap: Record<string, string> = {};

  // Create map svg
  const projection = geoMercator()
    .scale(150)
    .translate([width / 2, height / 2]);

  const path = geoPath().projection(projection);

  // Load map data
  async function loadMapData() {
    try {
      loading = true;
      const response = await fetch("/countries-110m.json");
      if (!response.ok) throw new Error("Failed to load map data");
      
      const topology: Topology = await response.json();
      mapData = (feature(topology, topology.objects.countries) as any as FeatureCollection<Geometry, GeoJsonProperties>).features;

      mapData.forEach(feature => {
        if (feature.id && feature.properties && feature.properties.name) {
          countryNameMap[feature.id.toString()] = feature.properties.name;
        }
      });

      loading = false;
    } catch (err) {
      error = `Failed to load map data: ${err}`;
      loading = false;
    }
  }

  // Load covid data
  let queryAbortController: AbortController | null = null;
  async function loadCovidData() {
    try {
      if (queryAbortController) queryAbortController.abort();
      queryAbortController = new AbortController();

      const response = await fetch(`/api/covid-data?start=${startDate.toISOString()}&end=${endDate.toISOString()}`, {signal: queryAbortController.signal});
      if (!response.ok) throw new Error("Failed to load COVID data");
      
      covidData = await response.json();
      updateMapColors();
      refreshTooltip();
    } catch (err: any) {
      if (err.name != "AbortError") {
        error = `Failed to load COVID data: ${err}`;
      }
    }
  }

  // Update map colors based on COVID data
  function updateMapColors() {
    if (!svgElement) return;
    recalculateColorScale();
    
    svgElement.classList.remove("confirmed", "deceased", "recovered");
    svgElement.classList.add(mode);

    const svg = select(svgElement);
    
    svg.selectAll("path")
      .data(mapData)
      .attr("fill", feature => {
        const featureId = feature.id?.toString();
        if (featureId && covidData[mode][featureId]) {
          const value = covidData[mode][featureId] || 0;
          return colorScale(value);
        }
        return "#eee";
      });
  }

  function recalculateColorScale() {
    let dataValues = covidData[mode] ? Object.values(covidData[mode]) : [];
    let transformedData = dataValues.map(value => value + 1); // +1 since 0 would be bad for logorithm
    let lowerPercentile = Math.max(1, quantile(transformedData, 0.02) ?? 1);
    let maxPercentile = Math.max(...dataValues, 2);

    let mainColor = modeToColor[mode] ?? "blue"
    
    colorScale = scaleLog<string>()
      .domain([lowerPercentile, maxPercentile])
      .range(["#eee", mainColor])
      .clamp(true)
    ;
  }

  // Date stuff
  function formatDateLabel(value: number): string {
    const date = new Date(minDate.getTime() + (value * 24 * 60 * 60 * 1000));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    return `${year}-Q${Math.floor(month / 3) + 1}`;
  }

  function formatDateUTC(date: Date): string {
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  }

  const totalDays = Math.floor((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
  let sliderRange = [0, totalDays]; // [startValue, endValue]
  
  let startDate = new Date(minDate.getTime() + (sliderRange[0] * 24 * 60 * 60 * 1000));
  let endDate = new Date(minDate.getTime() + (sliderRange[1] * 24 * 60 * 60 * 1000));
  $: formattedStartDate = formatDateUTC(startDate);
  $: formattedEndDate = formatDateUTC(endDate);

    // Define quarter pip positions
  const pipValues = [];
  let currentDate = new Date(minDate);
  while (currentDate <= maxDate) {
    const daysSinceStart = Math.floor((currentDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    pipValues.push(daysSinceStart);
    
    const year = currentDate.getUTCFullYear();
    const month = currentDate.getUTCMonth();
    
    const nextQuarterMonth = Math.floor(month / 3) * 3 + 3;
    if (nextQuarterMonth > 11) {
      currentDate = new Date(Date.UTC(year + 1, nextQuarterMonth - 12, 1));
    } else {
      currentDate = new Date(Date.UTC(year, nextQuarterMonth, 1));
    }
  }

  // Tooltip stuff
  let lastTooltipEvent: [MouseEvent, Feature<Geometry, GeoJsonProperties>] | null = null;
  function showTooltip(event: MouseEvent, feature: Feature<Geometry, GeoJsonProperties>) {
    const featureId = feature.id?.toString();
    if (!featureId) return;
    
    const countryName = countryNameMap[featureId] || "Unknown";
    const value = covidData[mode] ? (covidData[mode][featureId] || 0) : 0;
    tooltipContent = { countryName, value };
    
    tooltipPosition = {
      x: event.pageX + 10,
      y: event.pageY + 10
    };
    
    tooltipVisible = true;
    lastTooltipEvent = [event, feature];
  }

  function refreshTooltip() {
    if (tooltipVisible) {
      showTooltip(...lastTooltipEvent!)
    }
  }

  function hideTooltip() {
    tooltipVisible = false;
  }

  function formatNumber(num: number): string {
    return new Intl.NumberFormat().format(num);
  }

  function setupTooltips() {
    const svg = select(svgElement);
    
    svg.selectAll("path")
      .data(mapData)
      .on("mousemove", (event, feature) => {
        showTooltip(event, feature);
      })
      .on("mouseout", () => {
        hideTooltip();
      });
  }

  // Handlers
  function setMode(newMode: string) {
    mode = newMode;
    updateMapColors();
  }

  let currentTimeout: number | undefined = undefined;
  function queueDataUpdate() {
    clearTimeout(currentTimeout);
    currentTimeout = setTimeout(() => {
      loadCovidData();
    }, 300)
  }

  function handleDateRangeChange(event: CustomEvent) {
    sliderRange = event.detail.values;
    startDate = new Date(minDate.getTime() + (sliderRange[0] * 24 * 60 * 60 * 1000));
    endDate = new Date(minDate.getTime() + (sliderRange[1] * 24 * 60 * 60 * 1000));
    
    queueDataUpdate();
  }

  // Map init
  function initZoom() {
    const svg = select(svgElement);
    const mapGroup = svg.select(".map-group");
    
    const zoomBehavior = zoom()
      .scaleExtent([1, 8]) // Min/max zoom level
      .on("zoom", (event) => {
        mapGroup.attr("transform", event.transform);
      });
    
    svg.call(zoomBehavior as any);
  }

  onMount(async () => {
    await loadMapData();
    if (!error) {
      initZoom();
      await loadCovidData();
      setupTooltips();
    }
  });
</script>

<div class="map-container">
  <h1 class="text-2xl font-bold mb-4">World Map</h1>

  {#if error}
    <div class="error-message p-4 bg-red-100 text-red-700 rounded">
      {error}
    </div>
  {:else if loading}
    <div class="loading p-4 text-center">
      Loading map data...
    </div>
  {:else}
    <div class="flex">
      <!-- Map content -->
      <div class="flex-1">
        <div class="border rounded shadow-lg relative bg-white overflow-hidden">
          <svg bind:this={svgElement} {width} {height} class="w-full">
            <g class="map-group">
              {#each mapData as feature}
                <path
                  d={path(feature)}
                  fill="#ccc"
                  stroke="#fff"
                  stroke-width="0.5"
                />
              {/each}
            </g>
          </svg>
          
          <div class="absolute bottom-2 right-2 text-sm text-gray-500">
            Zoom: Scroll or pinch | Pan: Click and drag
          </div>
        </div>

        <div class="mt-4 date-slider-container p-4 border rounded bg-white">
          <div class="flex justify-between items-center mb-4">
            <div class="text-center">
              <div class="text-sm text-gray-500">Start Date</div>
              <div class="font-medium">{formattedStartDate}</div>
            </div>
            <div class="mx-2 text-gray-400">to</div>
            <div class="text-center">
              <div class="text-sm text-gray-500">End Date</div>
              <div class="font-medium">{formattedEndDate}</div>
            </div>
          </div>
          
          <div class="slider-wrapper mt-6">
            <RangeSlider
              min={0}
              max={totalDays}
              values={sliderRange}
              float
              range
              pips
              pipstep={Math.ceil(totalDays / 16)}
              pushy
              springValues={{ stiffness: 0.5, damping: 0.9 }}
              on:change={handleDateRangeChange}
              first="label"
              last="label"
              formatter={formatDateLabel}
            />
          </div>
        </div>
      </div>

      <!-- Mode selection -->
      <div class="mode-controls ml-4 flex flex-col space-y-2">
        <button 
          class="px-4 py-2 rounded {mode === "confirmed" ? "bg-green-600 text-white" : "bg-gray-200 hover:bg-gray-300"}"
          on:click={() => setMode("confirmed")}>
          Confirmed
        </button>
        <button 
          class="px-4 py-2 rounded {mode === "deceased" ? "bg-red-600 text-white" : "bg-gray-200 hover:bg-gray-300"}"
          on:click={() => setMode("deceased")}>
          Deceased
        </button>
        <button 
          class="px-4 py-2 rounded {mode === "recovered" ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"}"
          on:click={() => setMode("recovered")}>
          Recovered
        </button>
      </div>
    </div>
  {/if}

  <!-- Tooltip -->
  {#if tooltipVisible}
    <div 
      class="tooltip absolute bg-white shadow-lg p-2 rounded border pointer-events-none z-50"
      style="left: {tooltipPosition.x}px; top: {tooltipPosition.y}px;"
      bind:this={tooltip}
    >
      <div class="font-medium">{tooltipContent.countryName}</div>
      <div class="text-sm">{modeToLabel[mode]}: {formatNumber(tooltipContent.value)}</div>
    </div>
  {/if}
</div>