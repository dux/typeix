import {bootstrap} from "../src/server/bootstrap";
import {Application} from "./application";
/**
 * Module module, we do bootstrap in separate file so we can write env easier
 */
bootstrap(Application, 9000);
