import { GWFVisPlugin, GWFVisPluginWithSharedStates } from "gwf-vis-host";
import Chart from "chart.js/auto";

/**
 * A valid plugin file needs to be an ES module and export a default class that extends `HTMLElement`.
 * Basically, it should be ready to be loaded as a [web component](https://developer.mozilla.org/en-US/docs/web/web_components).
 * The inner content of the HTML element would be shown as the plugin's UI.
 */
export default class GWFVisPluginPrairieWaterChart
  extends HTMLElement
  implements GWFVisPlugin, GWFVisPluginWithSharedStates
{
  // #region these would be passed in by the vis host
  notifyLoadingDelegate?: () => any;

  #sharedStates: any;
  get sharedStates() {
    return this.#sharedStates;
  }
  set sharedStates(value) {
    this.#sharedStates = value;
    this.renderUI();
  }

  updateSharedStatesDelegate: any;
  // #endregion

  /** This is a mandatory method to be implemented that returns the header of the plugin to be shown. */
  obtainHeaderCallback = () => `Chart`;

  /** This would be called when the vis host is loaded at the first time. */
  hostFirstLoadedCallback() {
    this.connectedCallback();
  }

  connectedCallback() {
    this.renderUI();
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  renderUI() {
    const scalar =
      this.sharedStates?.["gwf-prairie-water.selected-feature"]?.scalar;
    this.style.maxHeight = "500px";
    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = /* html */ `
      <div>
        <span>HYBAS_ID: </span>
        <span><b>${scalar?.HYBAS_ID ?? "N/A"}</b></span>
      </div>
      <canvas id="main-canvas"></canvas>
    `;
    }
    if (!scalar) {
      return;
    }
    const endLoadingDelegate = this.notifyLoadingDelegate?.();
    setTimeout(() => {
      const data = scalar?.data;
      const years = Object.keys(data ?? {}).sort((a, b) => +a - +b);
      const labels: string[] = [];
      const values: any[] = [];
      years.forEach((year) =>
        Object.entries(data[year] ?? {})
          .sort((a, b) => +a - +b)
          .forEach(([day, value]: any) => {
            labels.push(`${year}-${day}`);
            values.push(value.average);
          })
      );
      const canvas = this.shadowRoot?.querySelector(
        "#main-canvas"
      ) as HTMLCanvasElement;
      new Chart(canvas, {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              label: scalar?.HYBAS_ID ?? "N/A",
              data: values,
              fill: false,
              borderColor: "rgb(75, 192, 192)",
              tension: 0.1,
            },
          ],
        },
        options: {
          responsive: true,
          elements: {
            point: {
              radius: 0,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
      endLoadingDelegate?.();
    });
  }
}
