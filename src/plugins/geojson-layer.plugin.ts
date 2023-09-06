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
    this.updateStyle2();
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
      <div id="Layer Transparency">
       
        <div>
          Watersheds Transparency: 0<input
            id="day-input"
            type="range"
            min="0"
            max="365"
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
      //const { year, day } = this.timeStamp ?? {};
     /* if (year != null && day != null) {
        const scalar = feature?.scalar as { data: { average: any }[][] };
      

        const value = scalar?.data?.[year]?.[day]?.average;
        const min = 0;
        const max = 500;
        const hue = ((value - min) / (max - min)) * (360 - 270) + 270;*/
       
        if(feature?.data.data.LCClassNum=='1')
        return { fillColor: '#CA6216',fillOpacity: 1.00 } as any;
        if(feature?.data.data.LCClassNum=='2')
        return { fillColor: '#5CB6E7',fillOpacity: 1.00 } as any;
        if(feature?.data.data.LCClassNum=='3')
        return { fillColor: '#EEE452',fillOpacity: 1.00 } as any;
        if(feature?.data.data.LCClassNum=='4')
        return { fillColor: '#E952A3',fillOpacity: 1.00 } as any;
        if(feature?.data.data.LCClassNum=='5')
        return { fillColor: '#3770B0',fillOpacity: 1.00 } as any;
        if(feature?.data.data.LCClassNum=='6')
        return { fillColor: '#4D9A74',fillOpacity: 1.00 } as any;
        if(feature?.data.data.LCClassNum=='7')
        return { fillColor: '#DEA123',fillOpacity: 1.00 } as any;
        if(feature?.data.data.LCClassNum=='')
        return { fillColor: '' } as any;


        
      //}
    });
    endLoadingDelegate?.();
    
  }
  async updateStyle2() {
    const endLoadingDelegate = this.notifyLoadingDelegate?.();
    this.#mapLayer?.setStyle((feature: any) => {
      const { day } = this.timeStamp ?? {};
      //if (year != null && day != null) {
        /*const scalar = feature?.scalar as { data: { average: any }[][] };
      

        const value = scalar?.data?.[year]?.[day]?.average;
        const min = 0;
        const max = 500;
        const hue = ((value - min) / (max - min)) * (360 - 270) + 270;*/
       const trans=day/365;
        if(feature?.data.data.LCClassNum=='1')
        return { fillColor: '#6E32A1',fillOpacity: trans } as any;
        if(feature?.data.data.LCClassNum=='2')
        return { fillColor: '#46ABF0',fillOpacity: trans } as any;
        if(feature?.data.data.LCClassNum=='3')
        return { fillColor: '#FBE68B',fillOpacity: trans } as any;
        if(feature?.data.data.LCClassNum=='4')
        return { fillColor: '#9A3191',fillOpacity: trans } as any;
        if(feature?.data.data.LCClassNum=='5')
        return { fillColor: '#A3A6A9',fillOpacity: trans } as any;
        if(feature?.data.data.LCClassNum=='6')
        return { fillColor: '#43AF53',fillOpacity: trans } as any;
        if(feature?.data.data.LCClassNum=='7')
        return { fillColor: '#F7BF2B',fillOpacity: trans } as any;
        if(feature?.data.data.LCClassNum=='')
        return { fillColor: '' } as any;


        
     // }
    });
    endLoadingDelegate?.();
    
  }
}
