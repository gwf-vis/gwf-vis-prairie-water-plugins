import type { GWFVisPlugin, GWFVisPluginWithSharedStates } from "gwf-vis-host";

import { LitElement, css, html } from "lit";
import { state } from "lit/decorators.js";
import { when } from "lit/directives/when.js";

export type LocationSelection = {
  dataSource?: string;
  locationId?: number;
};

export default class GWFVisPluginPrairieWaterAdvancedChart
  extends LitElement
  implements GWFVisPlugin, GWFVisPluginWithSharedStates
{
  static styles = css`
    :host {
      display: block;
      box-sizing: border-box;
      height: 100%;
    }

    * {
      box-sizing: border-box;
    }
  `;

  #sharedStates?: Record<string, any>;
  get sharedStates() {
    return this.#sharedStates;
  }
  set sharedStates(value: Record<string, any> | undefined) {
    this.#sharedStates = value;
    this.locationSelection =
      this.#sharedStates?.["gwf-default.locationSelection"];
  }

  @state()
  locationSelection?: LocationSelection;

  @state()
  shouldShowChart = false;

  obtainHeaderCallback = () => `Advanced Chart`;

  connectedCallback() {
    super.connectedCallback();
    this.shouldShowChart =
      this.checkIfPluginIsInTheLargePresenterDelegate?.() ?? false;
  }

  hostFirstLoadedCallback?: (() => void) | undefined;
  notifyLoadingDelegate?: (() => () => void) | undefined;
  checkIfPluginIsInTheLargePresenterDelegate?: (() => boolean) | undefined;

  render() {
    return html`
      ${when(
        this.shouldShowChart,
        () => html`
          <iframe
            src=${`http://51.79.85.49/advanced-chart.php`}
            width="100%"
            height="100%"
            frameborder="0"
          ></iframe>
        `,
        () => html`
          <h3>Selected Location:</h3>
          <br />
          <span
            >Data Source:
            <b>${this.locationSelection?.dataSource ?? "N/A"}</b></span
          >
          <br />
          <span
            >Location ID:
            <b>${this.locationSelection?.locationId ?? "N/A"}</b></span
          >
          <div style="color: red; font-size: 2em;">
            Enter large view to see the chart.
          </div>
        `
      )}
    `;
  }
}
