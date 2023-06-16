import { GWFVisHost } from "gwf-vis-host";
import { GWFVisHostConfig } from "gwf-vis-host/types/utils/gwf-vis-host-config";
import { html, css, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { ref } from "lit/directives/ref.js";
import { when } from "lit/directives/when.js";

@customElement("gwf-vis-app")
export class GWFVisApp extends LitElement {
  static styles = css`
    :host {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
    }

    #main-iframe {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      border: none;
    }
  `;

  @state()
  config?: GWFVisHostConfig;

  async firstUpdated() {
    this.config = await fetch("./src/assets/config.json").then((response) =>
      response.json()
    );
  }

  render() {
    return when(
      this.config,
      () =>
        html`<gwf-vis-host
          ${ref(
            (el) =>
              el && this.config && ((el as GWFVisHost).config = this.config)
          )}
        ></gwf-vis-host>`
    );
  }
}
