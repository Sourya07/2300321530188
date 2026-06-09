import dotenv from "dotenv";
dotenv.config({ path: "../.env" }); 

import { Log } from "./logger";

async function main() {
  try {
    await Log("backend", "info", "utils", "test log from logging_middleware");
    console.log("Log sent successfully");
  } catch (err) {
    console.error("Failed to send log", err);
  }
}

main();