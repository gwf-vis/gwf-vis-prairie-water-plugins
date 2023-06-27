import { GWFVisPlugin, GWFVisPluginWithSharedStates } from "gwf-vis-host";
import { LitElement, html } from "lit";
import { state } from "lit/decorators.js";

/**
 * A valid plugin file needs to be an ES module and export a default class that extends `HTMLElement`.
 * Basically, it should be ready to be loaded as a [web component](https://developer.mozilla.org/en-US/docs/web/web_components).
 * The inner content of the HTML element would be shown as the plugin's UI.
 */
export default class GWFVisPluginPrairieWaterDataProvider
  extends LitElement
  implements GWFVisPlugin, GWFVisPluginWithSharedStates
{
  // #region these would be passed in by the vis host
  #sharedStates: any;
  get sharedStates() {
    return this.#sharedStates;
  }
  set sharedStates(value) {
    this.#sharedStates = value;
    this, this.updateMetadata();
  }

  updateSharedStatesDelegate: any;
  // #endregion

  @state() metadata?: Record<string, any>;

  /** This is a mandatory method to be implemented that returns the header of the plugin to be shown. */
  obtainHeaderCallback = () => `Metadata`;

  /** This would be called when the vis host is loaded at the first time. */
  hostFirstLoadedCallback() {
    this.updateMetadata();
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  render() {
    return this.metadata
      ? html`<table>
          ${Object.entries(this.metadata).map(
            ([key, value]) => html`
              <tr>
                <td><b>${key}</b></td>
                <td>${value}</td>
              </tr>
            `
          )}
        </table>`
      : "N/A";
  }

  private updateMetadata() {
    this.metadata =
      this.sharedStates?.["gwf-prairie-water.selected-feature"]?.data?.data;
  }
}
