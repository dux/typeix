import {IProvider} from "./iprovider";
import {RouteRuleConfig} from "./iroute";
/**
 * @since 1.0.0
 * @interface
 * @name IModuleMetadata
 * @param {Array<RouteRuleConfig>} routes
 * @param {Array<IProvider|Function>} providers
 *
 * @description
 * Bootstrap class config metadata
 */
export interface IModuleMetadata {
  routes?: Array<RouteRuleConfig>;
  providers?: Array<IProvider|Function>;
}
