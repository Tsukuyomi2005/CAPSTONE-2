import { auth } from "./auth";
import httpRouter from "./router";

const http = httpRouter;

auth.addHttpRoutes(http);

export default http;
