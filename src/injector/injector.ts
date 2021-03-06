import {isFunction, toString, isPresent, uuid, isArray} from "../core";
import {Metadata} from "./metadata";
import {IProvider} from "../interfaces/iprovider";
import {IInjectKey} from "../interfaces/idecorators";

/**
 * @since 1.0.0
 * @function
 * @name Injector
 *
 * @param {Injector} parent injector
 *
 * @description
 * Dependency injection for class injection
 *
 */
export class Injector {
  // injector indentifier
  private _uid: string = uuid();
  private _providers: Map<any, any> = new Map();
  private _children: Array<Injector> = [];

  /**
   * @since 1.0.0
   * @static
   * @function
   * @name Injector#createAndResolveChild
   * @param {Injector} parent
   * @param {Function} Class
   * @param {Array<IProvider|Function>} providers
   * @return {Injector} instance
   *
   * @description
   * Static method which creates child injector on current injector and creates instance of Injectable class
   *
   * @example
   * \@Injectable()
   * class MyInjectableClass{
   *    \@Inject("config")
   *    private config: Object;
   * }
   *
   * let parent = new Injector();
   * let injector = Injector.createAndResolveChild(
   *    parent,
   *    MyInjectableClass,
   *    [
   *      {provide: "config", useValue: {id: 1, message: "This is custom provider for injector"}}
   *    ]
   * );
   * let myInstance = injector.get(MyInjectableClass);
   */
  static createAndResolveChild(parent: Injector, Class: Function, providers: Array<IProvider|Function>): Injector {
    let child = new Injector(parent);
    child.createAndResolve(Metadata.verifyProvider(Class), Metadata.verifyProviders(providers));
    parent.setChild(child);
    return child;
  }

  /**
   * @since 1.0.0
   * @static
   * @function
   * @name Injector#createAndResolve
   * @param {Function} Class
   * @param {Array<IProvider|Function>} providers
   * @return {Injector} instance
   *
   * @description
   * Static method which creates injector and instance of Injectable class
   *
   * @example
   * \@Injectable()
   * class MyInjectableClass{
   *    \@Inject("config")
   *    private config: Object;
   * }
   *
   * let injector = Injector.createAndResolve(
   *    MyInjectableClass,
   *    [
   *      {provide: "config", useValue: {id: 1, message: "This is custom provider for injector"}}
   *    ]
   * );
   * let myInstance = injector.get(MyInjectableClass);
   */
  static createAndResolve(Class: Function, providers: Array<IProvider|Function>): Injector {
    let injector = new Injector();
    injector.createAndResolve(Metadata.verifyProvider(Class), Metadata.verifyProviders(providers));
    return injector;
  }

  /**
   * @since 1.0.0
   * @constructor
   * @function
   * @name Injector#constructor
   * @param {Injector} parent
   *
   * @description
   * Injector constructor
   */
  constructor(private parent?: Injector) {
  }

  /**
   * @since 1.0.0
   * @function
   * @name Injector#createAndResolve
   * @param {IProvider} provider
   * @param {Array<IProvider>} providers
   *
   * @description
   * Creates instance of verified provider and creates instances of current providers and assign it to current injector instance
   * This method is used internally in most cases you should use static method Injector.createAndResolve or Injector.createAndResolveChild
   */
  createAndResolve(provider: IProvider, providers: Array<IProvider>): any {
    // merge _providers
    providers = Metadata.mergeProviders(Metadata.getConstructorProviders(provider.provide), providers);
    // create _providers first
    providers.forEach(item => this.createAndResolve(item, Metadata.getConstructorProviders(item.provide)));
    // if provider.useValue is present return value
    if (isPresent(provider.useValue)) {
      this.set(provider.provide, provider.useValue);
      return this.get(provider.provide);
    }

    let keys = Metadata.getConstructorInjectKeys(provider.provide);
    let args = keys.map(arg => this.get(arg, provider));
    let instance = Reflect.construct(provider.useClass, args);
    let protoKeys = Metadata.getConstructorPrototypeKeys(provider.useClass);
    if (isArray(protoKeys)) {
      protoKeys.forEach((item: IInjectKey) => {
        let value = this.get(item.value);
        Reflect.defineProperty(instance, item.key, {
          value: value,
          writable: item.isMutable
        });
      });
    }
    this.set(provider.provide, instance);
    if (provider.useClass.prototype.hasOwnProperty("afterConstruct") && isFunction(instance.afterConstruct)) {
      instance.afterConstruct();
    }
    this.set(Injector, this); // set local injector
    return instance;
  }


  /**
   * @since 1.0.0
   * @function
   * @name Injector#destroy
   *
   * @description
   * Do cleanup on current injector and all children so we are ready for gc this is used internally by framework
   */
  destroy() {
    if (this.parent instanceof Injector) {
      this.parent.removeChild(this);
    }
    this._children.forEach(injector => injector.destroy());
    this._children = [];
    this.parent = undefined;
    this._providers.clear();
  }


  /**
   * @since 1.0.0
   * @function
   * @name Injector#has
   * @param {any} key
   *
   * @description
   * Check if Injectable class has instance on current injector
   */
  has(key: any): boolean {
    return this._providers.has(key);
  }

  /**
   * @since 1.0.0
   * @function
   * @name Injector#get
   * @param {any} provider
   * @param {IProvider} Class
   *
   * @description
   * Gets current Injectable instance throws exception if Injectable class is not created
   */
  get(provider: any, Class?: IProvider): any {
    if (!this.has(provider) && this.parent instanceof Injector) {
      return this.parent.get(provider, Class);
    } else if (this.has(provider)) {
      return this._providers.get(provider);
    }
    if (isPresent(Class)) {
      throw new Error(`No provider for ${
        isFunction(provider) ? provider.name : toString(provider)
        } on class ${isFunction(Class.provide) ? Class.provide.name : Class.provide} , injector: ${this._uid}`);
    }
    throw new Error(`No provider for ${isFunction(provider) ? provider.name : toString(provider)}, injector: ${this._uid}`);
  }

  /**
   * @since 1.0.0
   * @function
   * @name Injector#set
   * @param {any} key
   * @param {Object} value
   *
   * @description
   * Sets Injectable instance to current injector instance
   */
  set(key: any, value: Object): void {
    this._providers.set(key, value);
  }

  /**
   * @since 1.0.0
   * @function
   * @name Injector#setChild
   * @param {Injector} injector
   * @private
   *
   * @description
   * Append child Injector
   */
  private setChild(injector: Injector): void {
    this._children.push(injector);
  }

  /**
   * @since 1.0.0
   * @function
   * @name Injector#setChild
   * @param {Injector} injector
   * @private
   *
   * @description
   * Remove child injector
   */
  private removeChild(injector: Injector): void {
    this._children.splice(this._children.indexOf(injector), 1);
  }
}

