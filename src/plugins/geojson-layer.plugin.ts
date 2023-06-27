import {
  GWFVisPlugin,
  GWFVisPluginWithData,
  GWFVisPluginWithSharedStates,
  LayerType,
  SharedStates,
  leaflet,
} from "gwf-vis-host";
import { LitElement, html } from "lit";
import { Geometry } from "geojson";
import { state } from "lit/decorators.js";
import { CLASS_ID_AND_NAME_DICT } from "../utils/class_id_and_name_dict";
import { PrairieWaterQueryObject } from "../utils/data";

/**
 * A valid plugin file needs to be an ES module and export a default class that extends `HTMLElement`.
 * Basically, it should be ready to be loaded as a [web component](https://developer.mozilla.org/en-US/docs/web/web_components).
 * The inner content of the HTML element would be shown as the plugin's UI.
 */
export default class GWFVisPluginPrairieWaterGeoJSONLayer
  extends LitElement
  implements
    GWFVisPlugin,
    GWFVisPluginWithSharedStates,
    GWFVisPluginWithData<PrairieWaterQueryObject, any>
{
  // #region these would be passed in by the vis host
  notifyLoadingDelegate?: () => () => void;
  leaflet?: typeof leaflet;
  addMapLayerDelegate?: (
    layer: leaflet.Layer,
    name: string,
    type: LayerType,
    active?: boolean
  ) => void;
  sharedStates?: SharedStates;
  updateSharedStatesDelegate?: (sharedStates: SharedStates) => void;
  checkIfDataProviderRegisteredDelegate?: (identifier: string) => boolean;
  queryDataDelegate?: (
    dataSource: string,
    queryObject: PrairieWaterQueryObject
  ) => Promise<any>;
  // #endregion

  // #region these are the props passed from the config file
  layerName: string = "GeoJSON";
  layerType: "base-layer" | "overlay" = "overlay";
  active: boolean = false;
  urlTemplate: any;
  options: leaflet.GeoJSONOptions<any, Geometry> | undefined;
  dataSource?: string;
  shapeDataAccessKey: any;
  // #endregion

  #data?: any[];
  #mapLayer?: leaflet.GeoJSON;
  #scalar: any = {};

  #classFilter: Record<string, boolean> = {};
  @state() get classFilter() {
    return this.#classFilter;
  }
  set classFilter(value) {
    const oldValue = this.classFilter;
    this.#classFilter = value;
    this.requestUpdate("classFilter", oldValue);
    this.updateFilter();
  }

  #timeStamp = { year: 1900, day: 0 };
  get timeStamp() {
    return this.#timeStamp;
  }
  set timeStamp(value) {
    this.#timeStamp = value;
    this.updateStyle();
  }

  /** This is a mandatory method to be implemented that returns the header of the plugin to be shown. */
  obtainHeaderCallback = () => `GeoJSON Layer - ${this.layerName}`;

  /** This would be called when the vis host is loaded at the first time. */
  hostFirstLoadedCallback() {
    // this.renderUI();
    this.#mapLayer = this.leaflet?.geoJSON(undefined, {
      ...this.options,
      onEachFeature: (feature, layer) => {
        layer.on("click", () => {
          this.updateSharedStatesDelegate?.({
            ...this.sharedStates,
            ["gwf-prairie-water.selected-feature"]: feature,
          });
        });
      },
    });
    if (this.#mapLayer) {
      this.addMapLayerDelegate?.(
        this.#mapLayer,
        this.layerName,
        this.layerType,
        this.active
      );
    }
    this.updateShape();
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  render() {
    return html`
      ${this.renderInfo()}
      <hr />
      ${this.renderFilter()}
      <hr />
      ${this.renderTimeControl()}
    `;
  }

  renderInfo() {
    return html`
      <span>
        Data provider registered:
        <b>
          ${this.checkIfDataProviderRegisteredDelegate?.("prairie-water")
            ? "true"
            : "false"}
        </b>
      </span>
      <br />
      <span> Data source: <b>${this.dataSource}</b> </span>
      <br />
      <span> Shape data access key: <b>${this.shapeDataAccessKey}</b> </span>
    `;
  }

  renderFilter() {
    const result = html`
      <div id="class-filter">
        Filter classes:
        ${Object.entries(CLASS_ID_AND_NAME_DICT ?? {}).map(
          ([id, name]) => html`
            <div>
              <input
                type="checkbox"
                data-id="${id}"
                ?checked=${this.classFilter[id]}
                @change=${(event: Event) =>
                  (this.classFilter = {
                    ...this.classFilter,
                    [id]: (event.currentTarget as HTMLInputElement)?.checked,
                  })}
              />
              <label>${name}</label>
            </div>
          `
        )}
      </div>
    `;
    return result;
  }

  renderTimeControl() {
    const result = html`
      <div id="time-control">
        <div>
          Year: 1900<input
            id="year-input"
            type="range"
            min="1900"
            max="1940"
            value="${this.timeStamp?.year}"
            @input=${(event: Event) =>
              (this.timeStamp = {
                ...this.timeStamp,
                year: +(event.currentTarget as HTMLInputElement)?.value,
              })}
          />1940
        </div>
        <div>
          Day: 0<input
            id="day-input"
            type="range"
            min="0"
            max="364"
            value="${this.timeStamp?.day}"
            @input=${(event: Event) =>
              (this.timeStamp = {
                ...this.timeStamp,
                day: +(event.currentTarget as HTMLInputElement)?.value,
              })}
          />364
        </div>
      </div>
    `;
    return result;
  }

  async updateShape() {
    /**
     * The query object can be anything depending on the data provider.
     * For example, a SQL data provider might use a string of SQL query and a NoSQL data provider might use a custom object.
     */
    const queryObject = {
      type: "shape",
      key: this.shapeDataAccessKey,
    };

    const endLoadingDelegate = this.notifyLoadingDelegate?.();
    this.#data = await this.queryDataDelegate?.(
      this.dataSource ?? "",
      queryObject
    );
    this.#mapLayer?.clearLayers();
    this.#data?.forEach((d: any) => this.#mapLayer?.addData(d));
    endLoadingDelegate?.();
  }

  async updateFilter() {
    const endLoadingDelegate = this.notifyLoadingDelegate?.();
    const classIds = Object.keys(this.classFilter ?? {});
    for (const classId of classIds) {
      if (this.#scalar[classId]) {
        continue;
      }
      this.#scalar[classId] = await this.queryDataDelegate?.(
        this.dataSource ?? "",
        {
          type: "scalar",
          classId,
        }
      );
    }
    this.#mapLayer?.clearLayers();
    this.#data
      ?.filter(
        (d: { data: { data: { LCClassNum: string | number } } }) =>
          this.classFilter[d.data?.data?.LCClassNum]
      )
      ?.forEach(
        (
          d: {
            data: { data: { LCClassNum: string | number; HYBAS_ID: any } };
            scalar: any;
          } & any
        ) => {
          const scalarData = this.#scalar[d.data?.data?.LCClassNum];
          d.scalar = { ...scalarData, HYBAS_ID: d.data?.data?.HYBAS_ID };
          this.#mapLayer?.addData(d);
        }
      );
    this.updateStyle();
    endLoadingDelegate?.();
  }

  async updateStyle() {
    const endLoadingDelegate = this.notifyLoadingDelegate?.();
    this.#mapLayer?.setStyle((feature: any) => {
      const { year, day } = this.timeStamp ?? {};
      if (year != null && day != null) {
        const scalar = feature?.scalar as { data: { average: any }[][] };
        const value = scalar?.data?.[year]?.[day]?.average;
        const min = 0;
        const max = 500;
        const hue = ((value - min) / (max - min)) * (360 - 270) + 270;
        const color = `hsl(${hue}, 100%, 50%)`;
        return { fillColor: color } as any;
      }
    });
    endLoadingDelegate?.();
  }
}
