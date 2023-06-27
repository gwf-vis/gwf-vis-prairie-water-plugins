import { GWFVisDataProviderPlugin, GWFVisPlugin } from "gwf-vis-host";
import { PrairieWaterQueryObject } from "../utils/data";

/**
 * A valid plugin file needs to be an ES module and export a default class that extends `HTMLElement`.
 * Basically, it should be ready to be loaded as a [web component](https://developer.mozilla.org/en-US/docs/web/web_components).
 * The inner content of the HTML element would be shown as the plugin's UI.
 */
export default class GWFVisPluginPrairieWaterDataProvider
  extends HTMLElement
  implements GWFVisPlugin, GWFVisDataProviderPlugin<PrairieWaterQueryObject, any>
{
  // #region these would be passed in by the vis host
  notifyLoadingDelegate?: () => () => void;
  // #endregion

  /** This is a mandatory method to be implemented that returns the header of the plugin to be shown. */
  obtainHeaderCallback = () => `Prairie Water Data Provider`;

  /** For a data provider plugin, this should be implemented and return a list of data identifiers (type of data) that can be handled by this plugin. */
  obtainDataProviderIdentifiersCallback = () => ["prairie-water"];

  /**
   * For a data provider plugin, this should be implemented.
   * It would be called when another plugin tries to query data for data types that registered by this plugin.
   */
  queryDataCallback = async (
    _identifier: string,
    dataSource: string,
    queryObject: PrairieWaterQueryObject
  ) => {
    // A plugin can ask the vis host to show a loading prompt by calling `notifyLoadingDelegate`,
    // which returns a callback that can be called when the time consuming task is finished.
    const endLoadingDelegate = this.notifyLoadingDelegate?.();
    let result;
    switch (queryObject?.type) {
      case "shape":
        result = await fetch(dataSource)
          .then((response) => response.json())
          .then((data) => data[queryObject.key]);
        break;
      case "scalar":
        result = await fetch(
          `${dataSource}/scaler/map/${queryObject.classId}`
        ).then((response) => response.json());
        break;
    }
    endLoadingDelegate?.();
    return result;
  };
}
