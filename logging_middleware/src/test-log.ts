import dotenv from "dotenv";
dotenv.config({ path: "../.env" }); 

import { Log } from "./logger";

function main() {
  Log("backend", "info", "utils", "test log from logging_middleware");
}

main();
